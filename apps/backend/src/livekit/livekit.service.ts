import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  EgressClient,
  EgressStatus,
  EncodedFileOutput,
  EncodedFileType,
  RoomServiceClient,
  S3Upload,
} from 'livekit-server-sdk';
import { PrismaService } from '../prisma/prisma.service';

/**
 * LiveKit Cloud video rooms. Configured via LIVEKIT_URL + LIVEKIT_API_KEY +
 * LIVEKIT_API_SECRET. Rooms are created on demand; recording uses room
 * composite egress writing to S3-compatible storage (LIVEKIT_EGRESS_S3_*).
 *
 * Note: with LiveKit *Cloud*, egress runs on their infra, so the S3 endpoint
 * must be publicly reachable — local MinIO won't work for recordings.
 */
@Injectable()
export class LivekitService {
  private readonly logger = new Logger(LivekitService.name);
  private readonly url: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private roomClient?: RoomServiceClient;
  private egressClient?: EgressClient;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.url = config.get('LIVEKIT_URL', '');
    this.apiKey = config.get('LIVEKIT_API_KEY', '');
    this.apiSecret = config.get('LIVEKIT_API_SECRET', '');
    if (this.isConfigured) {
      const httpUrl = this.url.replace(/^wss?/, 'https');
      this.roomClient = new RoomServiceClient(httpUrl, this.apiKey, this.apiSecret);
      this.egressClient = new EgressClient(httpUrl, this.apiKey, this.apiSecret);
      this.logger.log(`LiveKit configured: ${this.url}`);
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.url && this.apiKey && this.apiSecret);
  }

  roomName(interviewId: string): string {
    return `interview-${interviewId}`;
  }

  async ensureRoom(interviewId: string): Promise<{ name: string; url: string }> {
    const name = this.roomName(interviewId);
    await this.roomClient!.createRoom({
      name,
      emptyTimeout: 60 * 60 * 4,
      maxParticipants: 4,
    });
    return { name, url: this.url };
  }

  async getAccessToken(roomName: string, identity: string, isHost = false): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      ttl: 60 * 60 * 4,
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      roomAdmin: isHost,
    });
    return at.toJwt();
  }

  /** Starts room composite recording to S3. Saves the egressId to interview.recordingId
   *  so we can stop it later even after a backend restart. No-op unless LIVEKIT_EGRESS_S3_BUCKET is set. */
  async startRecording(roomName: string): Promise<void> {
    const bucket = this.config.get<string>('LIVEKIT_EGRESS_S3_BUCKET');
    if (!bucket) {
      this.logger.warn('LIVEKIT_EGRESS_S3_BUCKET not set — skipping recording');
      return;
    }
    const output = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: `recordings/${roomName}-{time}.mp4`,
      output: {
        case: 's3',
        value: new S3Upload({
          bucket,
          region: this.config.get('LIVEKIT_EGRESS_S3_REGION', 'us-east-1'),
          accessKey: this.config.get('LIVEKIT_EGRESS_S3_ACCESS_KEY', ''),
          secret: this.config.get('LIVEKIT_EGRESS_S3_SECRET', ''),
          endpoint: this.config.get('LIVEKIT_EGRESS_S3_ENDPOINT', ''),
          forcePathStyle: true,
        }),
      },
    });
    const info = await this.egressClient!.startRoomCompositeEgress(roomName, { file: output }, { layout: 'speaker' });
    if (!info.egressId) return;

    // Derive the interviewId from the room name (format: "interview-<uuid>")
    const interviewId = roomName.replace(/^interview-/, '');
    await this.prisma.interview.update({
      where: { id: interviewId },
      data: { recordingId: info.egressId },
    }).catch((err) => this.logger.warn(`Could not save egressId for ${roomName}: ${err.message}`));

    this.logger.log(`Egress recording started for ${roomName}: ${info.egressId}`);
  }

  /** Stops the egress and then polls LiveKit until the file is finalized,
   *  then saves the recording URL to interview.recordingUrl. */
  async stopRecording(roomName: string): Promise<void> {
    // Look up the egressId from DB (survives backend restarts, unlike an in-memory Map)
    const interviewId = roomName.replace(/^interview-/, '');
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      select: { recordingId: true },
    }).catch(() => null);

    const egressId = interview?.recordingId;
    if (!egressId) {
      this.logger.warn(`No egressId found for ${roomName} — recording may not have started`);
      return;
    }

    await this.egressClient!.stopEgress(egressId);
    this.logger.log(`Egress recording stopped for ${roomName} (egressId=${egressId})`);

    // Poll in the background — the file isn't immediately available after stopEgress
    this.pollRecordingUrl(interviewId, egressId).catch((err) =>
      this.logger.warn(`pollRecordingUrl failed for ${interviewId}: ${err.message}`),
    );
  }

  /** Polls LiveKit until the egress reaches COMPLETE, then saves the S3 file location. */
  private async pollRecordingUrl(interviewId: string, egressId: string, maxWaitMs = 120_000): Promise<void> {
    const interval = 5_000;
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, interval));

      const [info] = await this.egressClient!.listEgress({ egressId }).catch(() => []);
      if (!info) continue;

      if (info.status === EgressStatus.EGRESS_COMPLETE) {
        const location = (info.fileResults?.[0] as any)?.location as string | undefined;
        if (location) {
          await this.prisma.interview.update({
            where: { id: interviewId },
            data: { recordingUrl: location },
          });
          this.logger.log(`Recording URL saved for ${interviewId}: ${location}`);
        } else {
          this.logger.warn(`Egress complete for ${interviewId} but no file location in response`);
        }
        return;
      }

      if (info.status === EgressStatus.EGRESS_FAILED || info.status === EgressStatus.EGRESS_ABORTED) {
        this.logger.warn(`Egress ${egressId} ended with status ${info.status} — no recording URL`);
        return;
      }

      this.logger.log(`Egress ${egressId} still ${info.status}, waiting…`);
    }

    this.logger.warn(`Timed out waiting for egress ${egressId} to complete`);
  }
}
