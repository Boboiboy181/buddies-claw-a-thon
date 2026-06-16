import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import axios from 'axios';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const DEFAULT_AGENTBASE_BASE_URL = 'https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1';
const DEFAULT_GEMINI_VOICE = 'Zephyr';
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io';
const DEFAULT_ELEVENLABS_VOICE = '21m00Tcm4TlvDq8ikWAM'; // Rachel — override via ELEVENLABS_VOICE_ID
const DEFAULT_ELEVENLABS_TTS_MODEL = 'eleven_v3';
const DEFAULT_ELEVENLABS_OUTPUT_FORMAT = 'mp3_44100_128';
const DEFAULT_EDGE_TTS_VOICE = 'vi-VN-HoaiMyNeural';

// gpt-4o-mini-tts / gpt-4o-tts add coral, sage, river, ash, ballad, verse
export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  | 'coral' | 'sage' | 'river' | 'ash' | 'ballad' | 'verse';

export interface TtsAudioFormat {
  extension: 'mp3' | 'wav';
  contentType: string;
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly provider: 'elevenlabs' | 'agentbase' | 'openai' | 'edgetts';
  private readonly model: string;
  private readonly baseUrl?: string;
  private readonly apiKey?: string;
  private readonly geminiVoice: string;
  private readonly elevenVoiceId?: string;
  private readonly edgeTtsVoice: string;
  private readonly openaiVoice: TtsVoice;
  private readonly openaiInstructions?: string;
  private elevenlabs?: ElevenLabsClient;
  private openai?: OpenAI;

  /** Output format differs by provider: AgentBase returns raw PCM (wrapped to WAV), others return MP3. */
  readonly audioFormat: TtsAudioFormat;

  constructor(private config: ConfigService) {
    const elevenLabsApiKey = this.readOptional('ELEVENLABS_API_KEY');
    const agentbaseApiKey = this.readOptional('LLM_API_KEY');
    const agentbaseModel = this.readOptional('TTS_MODEL');
    const openAiApiKey = this.readOptional('OPENAI_API_KEY');
    const edgeTtsUrl = this.readOptional('EDGE_TTS_URL');

    const forced = this.readOptional('TTS_PROVIDER')?.toLowerCase();

    if (forced === 'edgetts') {
      if (!edgeTtsUrl) throw new Error('TTS_PROVIDER=edgetts but EDGE_TTS_URL is not set');
      this.provider = 'edgetts';
      this.baseUrl = edgeTtsUrl.replace(/\/+$/, '');
      this.edgeTtsVoice = this.config.get('EDGE_TTS_VOICE', DEFAULT_EDGE_TTS_VOICE);
      this.model = 'edge-tts';
      this.geminiVoice = DEFAULT_GEMINI_VOICE;
      this.audioFormat = { extension: 'mp3', contentType: 'audio/mpeg' };
      this.logger.log(`Using edge-tts sidecar at ${this.baseUrl} voice="${this.edgeTtsVoice}"`);
      return;
    }

    if (forced === 'openai') {
      if (!openAiApiKey) throw new Error('TTS_PROVIDER=openai but OPENAI_API_KEY is not set');
      this.provider = 'openai';
      this.openai = new OpenAI({ apiKey: openAiApiKey, timeout: 30_000 });
      this.model = this.config.get('OPENAI_TTS_MODEL', 'tts-1');
      this.openaiVoice = this.config.get('OPENAI_TTS_VOICE', 'coral') as TtsVoice;
      this.openaiInstructions = this.readOptional('OPENAI_TTS_INSTRUCTIONS');
      this.geminiVoice = DEFAULT_GEMINI_VOICE;
      this.edgeTtsVoice = DEFAULT_EDGE_TTS_VOICE;
      this.audioFormat = { extension: 'mp3', contentType: 'audio/mpeg' };
      this.logger.log(`Using direct OpenAI TTS model="${this.model}" voice="${this.openaiVoice}" (forced via TTS_PROVIDER)`);
      return;
    }
    if (forced === 'elevenlabs' && !elevenLabsApiKey) {
      throw new Error('TTS_PROVIDER=elevenlabs but ELEVENLABS_API_KEY is not set');
    }
    if (forced === 'agentbase' && !(agentbaseApiKey && agentbaseModel)) {
      throw new Error('TTS_PROVIDER=agentbase but LLM_API_KEY + TTS_MODEL are not set');
    }

    // Priority: ElevenLabs > edge-tts > AgentBase > OpenAI
    // ElevenLabs first — best multilingual quality (handles Vietnamese+English code-switching).
    if (elevenLabsApiKey && forced !== 'agentbase') {
      this.provider = 'elevenlabs';
      this.apiKey = elevenLabsApiKey;
      this.baseUrl = this.elevenLabsSdkBaseUrl();
      this.model = this.readOptional('ELEVENLABS_TTS_MODEL') ?? this.config.get('ELEVENLABS_MODEL', DEFAULT_ELEVENLABS_TTS_MODEL);
      this.elevenVoiceId = this.config.get('ELEVENLABS_VOICE_ID', DEFAULT_ELEVENLABS_VOICE);
      this.elevenlabs = new ElevenLabsClient({
        apiKey: this.apiKey,
        baseUrl: this.baseUrl,
        maxRetries: 3,
      });
      this.geminiVoice = DEFAULT_GEMINI_VOICE;
      this.edgeTtsVoice = DEFAULT_EDGE_TTS_VOICE;
      this.audioFormat = { extension: 'mp3', contentType: 'audio/mpeg' };
      this.logger.log(`Using ElevenLabs TTS with model "${this.model}", voice "${this.elevenVoiceId}"`);
      return;
    }

    if (agentbaseApiKey && agentbaseModel) {
      console.warn('Using AgentBase TTS — consider switching to ElevenLabs for higher-quality voices');
      this.provider = 'agentbase';
      this.apiKey = agentbaseApiKey;
      this.baseUrl = this.config.get('LLM_BASE_URL', DEFAULT_AGENTBASE_BASE_URL).replace(/\/+$/, '');
      this.model = agentbaseModel;
      this.geminiVoice = this.config.get('TTS_VOICE', DEFAULT_GEMINI_VOICE);
      this.edgeTtsVoice = DEFAULT_EDGE_TTS_VOICE;
      this.audioFormat = { extension: 'wav', contentType: 'audio/wav' };
      this.logger.log(`Using AgentBase TTS (/speech/tts) with model "${this.model}", voice "${this.geminiVoice}"`);
      return;
    }

    if (!openAiApiKey) {
      throw new Error('Missing LLM_API_KEY + TTS_MODEL for AgentBase, OPENAI_API_KEY for OpenAI, or EDGE_TTS_URL for edge-tts sidecar');
    }

    this.provider = 'openai';
    this.openai = new OpenAI({ apiKey: openAiApiKey, timeout: 30_000 });
    this.model = this.config.get('OPENAI_TTS_MODEL', 'tts-1');
    this.openaiVoice = this.config.get('OPENAI_TTS_VOICE', 'coral') as TtsVoice;
    this.openaiInstructions = this.readOptional('OPENAI_TTS_INSTRUCTIONS');
    this.geminiVoice = DEFAULT_GEMINI_VOICE;
    this.edgeTtsVoice = DEFAULT_EDGE_TTS_VOICE;
    this.audioFormat = { extension: 'mp3', contentType: 'audio/mpeg' };
    this.logger.log(`Using direct OpenAI TTS model="${this.model}" voice="${this.openaiVoice}"`);
  }

  async synthesize(text: string): Promise<Buffer> {
    const label = text.length > 60 ? `${text.slice(0, 57)}…` : text;
    this.logger.log(`TTS call [${this.provider}] chars=${text.length} preview="${label}"`);
    const t0 = Date.now();

    let buffer: Buffer;
    if (this.provider === 'edgetts') {
      buffer = await this.synthesizeEdgeTts(text);
    } else if (this.provider === 'elevenlabs') {
      buffer = await this.synthesizeElevenLabs(text);
    } else if (this.provider === 'agentbase') {
      buffer = await this.synthesizeAgentbase(text);
    } else {
      const response = await this.openai!.audio.speech.create({
        model: this.model,
        voice: this.openaiVoice,
        input: text,
        response_format: 'mp3',
        ...(this.openaiInstructions ? { instructions: this.openaiInstructions } : {}),
      } as any);
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    this.logger.log(`TTS done  [${this.provider}] chars=${text.length} bytes=${buffer.length} ms=${Date.now() - t0}`);
    return buffer;
  }

  /** edge-tts sidecar: POST /v1/audio/speech, returns MP3.
   *  Retries on 5xx — the upstream Microsoft TTS service occasionally drops requests. */
  private async synthesizeEdgeTts(text: string): Promise<Buffer> {
    const form = new URLSearchParams();
    form.append('input', text);
    form.append('voice', this.edgeTtsVoice);
    const body = form.toString();

    const MAX_RETRIES = 2;
    for (let attempt = 0; ; attempt++) {
      try {
        const { data } = await axios.post(`${this.baseUrl}/v1/audio/speech`, body, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          responseType: 'arraybuffer',
          timeout: 30_000,
        });
        return Buffer.from(data);
      } catch (err: any) {
        const status: number | undefined = err?.response?.status;
        if (!status || status < 500 || attempt >= MAX_RETRIES) throw err;
        const waitMs = (attempt + 1) * 2_000;
        this.logger.warn(`edge-tts sidecar ${status}, retry ${attempt + 1}/${MAX_RETRIES} in ${waitMs}ms`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }

  /** ElevenLabs TTS: returns MP3 audio. Retries on 429/5xx (and transient
   *  network errors) since a failed synth would block the current question. */
  private async synthesizeElevenLabs(text: string): Promise<Buffer> {
    const audio = await this.elevenlabs!.textToSpeech.convert(this.elevenVoiceId!, {
      text,
      modelId: this.model,
      outputFormat: this.config.get('ELEVENLABS_OUTPUT_FORMAT', DEFAULT_ELEVENLABS_OUTPUT_FORMAT) as any,
      voiceSettings: { stability: 0.5, similarityBoost: 0.75 },
    });
    return this.streamToBuffer(audio);
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

  private elevenLabsSdkBaseUrl(): string {
    return this.config
      .get('ELEVENLABS_BASE_URL', ELEVENLABS_BASE_URL)
      .replace(/\/+$/, '')
      .replace(/\/v1$/i, '');
  }

  private async streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  }
}
