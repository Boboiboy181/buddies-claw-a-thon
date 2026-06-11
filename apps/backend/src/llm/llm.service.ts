import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const DEFAULT_AGENTBASE_BASE_URL = 'https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly client: OpenAI;
  private readonly defaultModel: string;

  constructor(private readonly config: ConfigService) {
    const agentbaseApiKey = this.readOptional('LLM_API_KEY');
    const openAiApiKey = this.readOptional('OPENAI_API_KEY');

    if (agentbaseApiKey) {
      const agentbaseModel = this.readOptional('LLM_MODEL');

      if (!agentbaseModel) {
        throw new Error('LLM_MODEL is required when using AgentBase LLM');
      }

      this.client = new OpenAI({
        apiKey: agentbaseApiKey,
        baseURL: this.config.get('LLM_BASE_URL', DEFAULT_AGENTBASE_BASE_URL),
      });
      this.defaultModel = agentbaseModel;
      this.logger.log(`Using AgentBase LLM endpoint with model "${this.defaultModel}"`);
      return;
    }

    if (!openAiApiKey) {
      throw new Error('Missing LLM_API_KEY for AgentBase or OPENAI_API_KEY for direct OpenAI usage');
    }

    this.client = new OpenAI({ apiKey: openAiApiKey });
    this.defaultModel = this.config.get('OPENAI_MODEL', 'gpt-4o');
    this.logger.log(`Using direct OpenAI LLM with model "${this.defaultModel}"`);
  }

  async generateJson<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    model?: string;
  }): Promise<T> {
    const response = await this.client.chat.completions.create({
      model: params.model || this.defaultModel,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: params.temperature ?? 0.7,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('LLM returned an empty response');
    }

    return JSON.parse(content) as T;
  }

  private readOptional(key: string): string | undefined {
    const value = this.config.get<string>(key)?.trim();
    return value ? value : undefined;
  }
}
