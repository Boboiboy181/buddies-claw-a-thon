import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import axios from 'axios';

const DEFAULT_AGENTBASE_BASE_URL = 'https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1';
const DEFAULT_GEMINI_VOICE = 'Zephyr';
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_ELEVENLABS_VOICE = '21m00Tcm4TlvDq8ikWAM'; // Rachel — override via ELEVENLABS_VOICE_ID
const DEFAULT_ELEVENLABS_MODEL = 'eleven_multilingual_v2'; // supports Vietnamese

export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface TtsAudioFormat {
  extension: 'mp3' | 'wav';
  contentType: string;
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly provider: 'elevenlabs' | 'agentbase' | 'openai';
  private readonly model: string;
  private readonly baseUrl?: string;
  private readonly apiKey?: string;
  private readonly geminiVoice: string;
  private readonly elevenVoiceId?: string;
  private openai?: OpenAI;

  /** Output format differs by provider: AgentBase returns raw PCM (wrapped to WAV), OpenAI returns MP3. */
  readonly audioFormat: TtsAudioFormat;

  constructor(private config: ConfigService) {
    const elevenLabsApiKey = this.readOptional('ELEVENLABS_API_KEY');
    const agentbaseApiKey = this.readOptional('LLM_API_KEY');
    const agentbaseModel = this.readOptional('TTS_MODEL');
    const openAiApiKey = this.readOptional('OPENAI_API_KEY');

    // ElevenLabs takes priority when configured — highest-fidelity voice.
    if (elevenLabsApiKey) {
      this.provider = 'elevenlabs';
      this.apiKey = elevenLabsApiKey;
      this.baseUrl = this.config.get('ELEVENLABS_BASE_URL', ELEVENLABS_BASE_URL).replace(/\/+$/, '');
      this.model = this.config.get('ELEVENLABS_MODEL', DEFAULT_ELEVENLABS_MODEL);
      this.elevenVoiceId = this.config.get('ELEVENLABS_VOICE_ID', DEFAULT_ELEVENLABS_VOICE);
      this.geminiVoice = DEFAULT_GEMINI_VOICE;
      this.audioFormat = { extension: 'mp3', contentType: 'audio/mpeg' };
      this.logger.log(`Using ElevenLabs TTS with model "${this.model}", voice "${this.elevenVoiceId}"`);
      return;
    }

    if (agentbaseApiKey && agentbaseModel) {
      this.provider = 'agentbase';
      this.apiKey = agentbaseApiKey;
      this.baseUrl = this.config.get('LLM_BASE_URL', DEFAULT_AGENTBASE_BASE_URL).replace(/\/+$/, '');
      this.model = agentbaseModel;
      this.geminiVoice = this.config.get('TTS_VOICE', DEFAULT_GEMINI_VOICE);
      this.audioFormat = { extension: 'wav', contentType: 'audio/wav' };
      this.logger.log(`Using AgentBase TTS (/speech/tts) with model "${this.model}", voice "${this.geminiVoice}"`);
      return;
    }

    if (!openAiApiKey) {
      throw new Error('Missing LLM_API_KEY + TTS_MODEL for AgentBase or OPENAI_API_KEY for direct OpenAI usage');
    }

    this.provider = 'openai';
    this.openai = new OpenAI({ apiKey: openAiApiKey });
    this.model = this.config.get('OPENAI_TTS_MODEL', 'tts-1');
    this.geminiVoice = DEFAULT_GEMINI_VOICE;
    this.audioFormat = { extension: 'mp3', contentType: 'audio/mpeg' };
    this.logger.log(`Using direct OpenAI TTS with model "${this.model}"`);
  }

  async synthesize(text: string, voice: TtsVoice = 'nova'): Promise<Buffer> {
    if (this.provider === 'elevenlabs') {
      return this.synthesizeElevenLabs(text);
    }
    if (this.provider === 'agentbase') {
      return this.synthesizeAgentbase(text);
    }

    const response = await this.openai!.audio.speech.create({
      model: this.model,
      voice,
      input: text,
      response_format: 'mp3',
    });
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /** ElevenLabs TTS: returns MP3 audio. Retries on 429/5xx (and transient
   *  network errors) since a failed synth would block the current question. */
  private async synthesizeElevenLabs(text: string): Promise<Buffer> {
    const url = `${this.baseUrl}/text-to-speech/${this.elevenVoiceId}`;
    const MAX_RETRIES = 3;
    for (let attempt = 0; ; attempt++) {
      try {
        const { data } = await axios.post(
          url,
          {
            text,
            model_id: this.model,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          },
          {
            headers: {
              'xi-api-key': this.apiKey,
              'Content-Type': 'application/json',
              Accept: 'audio/mpeg',
            },
            params: { output_format: 'mp3_44100_128' },
            responseType: 'arraybuffer',
          },
        );
        return Buffer.from(data);
      } catch (err: any) {
        const status = err?.response?.status;
        const retryable = status === 429 || status === undefined || status >= 500;
        if (!retryable || attempt >= MAX_RETRIES) throw err;
        const waitMs = 1000 * 2 ** attempt;
        this.logger.warn(`ElevenLabs TTS error (${status ?? 'network'}), retry ${attempt + 1}/${MAX_RETRIES} in ${waitMs}ms`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }

  /** Gemini-native TTS route: returns base64 PCM (s16le mono), wrapped into a WAV container.
   *  Retries on 429 — the MaaS gateway rate-limits TTS bursts. */
  private async synthesizeAgentbase(text: string): Promise<Buffer> {
    const MAX_RETRIES = 4;
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.synthesizeAgentbaseOnce(text);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status !== 429 || attempt >= MAX_RETRIES) throw err;
        const resetHeader = parseInt(err.response?.headers?.['ratelimit-reset'] ?? '', 10);
        const waitMs = Number.isFinite(resetHeader) ? (resetHeader + 1) * 1000 : 2000 * 2 ** attempt;
        this.logger.warn(`TTS rate-limited (429), retry ${attempt + 1}/${MAX_RETRIES} in ${waitMs}ms`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }

  private async synthesizeAgentbaseOnce(text: string): Promise<Buffer> {
    const { data } = await axios.post(
      `${this.baseUrl}/speech/tts`,
      {
        model: this.model,
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: {
          temperature: 1,
          responseModalities: ['audio'],
          speech_config: {
            voice_config: { prebuilt_voice_config: { voice_name: this.geminiVoice } },
          },
        },
      },
      { headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' } },
    );

    const part = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!part?.data) {
      throw new Error(`AgentBase TTS returned no audio: ${JSON.stringify(data).slice(0, 300)}`);
    }

    const pcm = Buffer.from(part.data, 'base64');
    // mimeType example: "audio/L16;codec=pcm;rate=24000"
    const sampleRate = parseInt(/rate=(\d+)/.exec(part.mimeType ?? '')?.[1] ?? '24000', 10);
    return this.pcmToWav(pcm, sampleRate);
  }

  private pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bitsPerSample = 16): Buffer {
    const byteRate = (sampleRate * channels * bitsPerSample) / 8;
    const blockAlign = (channels * bitsPerSample) / 8;
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([header, pcm]);
  }

  private readOptional(key: string): string | undefined {
    const value = this.config.get<string>(key)?.trim();
    return value ? value : undefined;
  }
}
