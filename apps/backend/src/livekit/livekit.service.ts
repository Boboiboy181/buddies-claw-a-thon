import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  RoomServiceClient,
  S3Upload,
} from 'livekit-server-sdk';

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
  /** roomName → egressId, so we can stop the recording we started */
  private readonly activeEgress = new Map<string, string>();

  constructor(private config: ConfigService) {
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

  /** Starts room composite recording to S3. No-op unless LIVEKIT_EGRESS_S3_BUCKET is set. */
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
    if (info.egressId) this.activeEgress.set(roomName, info.egressId);
    this.logger.log(`Egress recording started for ${roomName}: ${info.egressId}`);
  }

  async stopRecording(roomName: string): Promise<void> {
    const egressId = this.activeEgress.get(roomName);
    if (!egressId) return;
    await this.egressClient!.stopEgress(egressId);
    this.activeEgress.delete(roomName);
    this.logger.log(`Egress recording stopped for ${roomName}`);
  }
}
