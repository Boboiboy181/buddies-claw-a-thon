import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const MIME_BY_EXT: Record<string, string> = {
  wav: 'audio/wav',
  webm: 'audio/webm',
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
};

@Injectable()
export class SttService {
  private readonly logger = new Logger(SttService.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private config: ConfigService) {
    const agentbaseApiKey = this.readOptional('LLM_API_KEY');
    const agentbaseModel = this.readOptional('STT_MODEL');
    // Per-account transcription base URL, e.g.
    // https://maas-llm-aiplatform-hcm.api.vngcloud.vn/maas/user-XXXXXX/openai/whisper-large-v3/v1
    const agentbaseSttBaseUrl = this.readOptional('STT_BASE_URL');
    const openAiApiKey = this.readOptional('OPENAI_API_KEY');

    if (agentbaseApiKey && agentbaseModel && agentbaseSttBaseUrl) {
      this.client = new OpenAI({
        apiKey: agentbaseApiKey,
        baseURL: agentbaseSttBaseUrl.replace(/\/+$/, ''),
      });
      this.model = agentbaseModel;
      this.logger.log(`Using AgentBase STT endpoint with model "${this.model}"`);
      return;
    }

    if (!openAiApiKey) {
      throw new Error(
        'Missing LLM_API_KEY + STT_MODEL + STT_BASE_URL for AgentBase or OPENAI_API_KEY for direct OpenAI usage',
      );
    }

    this.client = new OpenAI({ apiKey: openAiApiKey });
    this.model = this.config.get('OPENAI_STT_MODEL', 'whisper-1');
    this.logger.log(`Using direct OpenAI STT with model "${this.model}"`);
  }

  async transcribe(audioBuffer: Buffer, filename = 'audio.mp3', language = 'vi'): Promise<string> {
    const ab = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer;
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'mp3';
    const file = new File([ab], filename, { type: MIME_BY_EXT[ext] ?? 'audio/mpeg' });
    const response = await this.client.audio.transcriptions.create({
      file,
      model: this.model,
      language,
    });
    return response.text;
  }

  private readOptional(key: string): string | undefined {
    const value = this.config.get<string>(key)?.trim();
    return value ? value : undefined;
  }
}
