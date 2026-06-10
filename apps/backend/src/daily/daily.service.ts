import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface DailyRoom {
  id: string;
  name: string;
  url: string;
  created_at: string;
  config: Record<string, any>;
}

@Injectable()
export class DailyService {
  private readonly logger = new Logger(DailyService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('DAILY_API_URL', 'https://api.daily.co/v1');
    this.apiKey = config.get('DAILY_API_KEY', '');
  }

  private get headers() {
    return { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' };
  }

  async createRoom(interviewId: string): Promise<DailyRoom> {
    if (!this.apiKey) {
      this.logger.warn('DAILY_API_KEY not set, returning mock room');
      const name = `interview-${interviewId}`;
      return { id: name, name, url: `https://demo.daily.co/${name}`, created_at: new Date().toISOString(), config: {} };
    }
    const { data } = await axios.post(`${this.baseUrl}/rooms`, {
      name: `interview-${interviewId}`,
      properties: {
        enable_recording: 'cloud',
        autojoin: true,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4,
      },
    }, { headers: this.headers });
    return data;
  }

  async deleteRoom(roomName: string): Promise<void> {
    if (!this.apiKey) return;
    await axios.delete(`${this.baseUrl}/rooms/${roomName}`, { headers: this.headers });
  }

  async startRecording(roomName: string): Promise<void> {
    if (!this.apiKey) return;
    await axios.post(`${this.baseUrl}/rooms/${roomName}/recordings`, {}, { headers: this.headers });
  }

  async stopRecording(roomName: string): Promise<void> {
    if (!this.apiKey) return;
    await axios.post(`${this.baseUrl}/rooms/${roomName}/recordings/stop`, {}, { headers: this.headers });
  }

  async getMeetingToken(roomName: string, userId: string, isOwner = false): Promise<string> {
    if (!this.apiKey) return 'mock-token';
    const { data } = await axios.post(`${this.baseUrl}/meeting-tokens`, {
      properties: {
        room_name: roomName,
        user_id: userId,
        is_owner: isOwner,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4,
      },
    }, { headers: this.headers });
    return data.token;
  }
}
