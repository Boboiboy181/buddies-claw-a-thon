import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class SttService {
  private readonly logger = new Logger(SttService.name);
  private openai: OpenAI;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
  }

  async transcribe(audioBuffer: Buffer, filename = 'audio.mp3', language = 'vi'): Promise<string> {
    const ab = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer;
    const file = new File([ab], filename, { type: 'audio/mpeg' });
    const response = await this.openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
    });
    return response.text;
  }
}
