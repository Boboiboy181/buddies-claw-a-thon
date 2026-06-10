import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface GeneratedQuestion {
  order: number;
  text: string;
  category: string;
  expectedSignals: string[];
  evaluationCriteria: string[];
  maxDurationSeconds: number;
  isRequired: boolean;
}

export interface GeneratedQuestionSet {
  roleSummary: string;
  extractedSkills: { required: string[]; niceToHave: string[]; softSkills: string[] };
  suggestedRubric: { criterion: string; description: string; weight: number }[];
  questions: GeneratedQuestion[];
}

@Injectable()
export class QuestionGenerationService {
  private readonly logger = new Logger(QuestionGenerationService.name);
  private openai: OpenAI;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
  }

  async generateFromJd(params: {
    jdRawText: string;
    roleTitle: string;
    level?: string;
    questionCount: number;
    categories: string[];
    language: 'vi' | 'en';
    includeSalaryQuestion: boolean;
    includeMotivationQuestion: boolean;
  }): Promise<GeneratedQuestionSet> {
    const systemPrompt = `You are an expert technical recruiter and interview designer. Generate structured interview questions based only on the provided job description, role requirements, seniority level, and requested categories. The questions must be clear, job-relevant, and suitable for an AI interviewer to read aloud. Avoid discriminatory or protected-attribute questions. Do not ask about age, gender, marital status, religion, ethnicity, health, political views, or family plans. Return structured JSON only.`;

    const userPrompt = `Generate ${params.questionCount} interview questions for this role.

Role: ${params.roleTitle}
Level: ${params.level || 'Not specified'}
Language: ${params.language === 'vi' ? 'Vietnamese' : 'English'}
Categories to include: ${params.categories.join(', ')}
${params.includeSalaryQuestion ? '- Include 1 salary expectation question' : ''}
${params.includeMotivationQuestion ? '- Include 1 motivation question' : ''}

Job Description:
${params.jdRawText}

Return JSON matching this schema:
{
  "roleSummary": "string",
  "extractedSkills": {
    "required": ["string"],
    "niceToHave": ["string"],
    "softSkills": ["string"]
  },
  "suggestedRubric": [
    { "criterion": "string", "description": "string", "weight": number }
  ],
  "questions": [
    {
      "order": number,
      "text": "string (natural spoken language, suitable for AI to read aloud)",
      "category": "screening|motivation|experience|behavioral|technical|culture_fit|salary|custom",
      "expectedSignals": ["string"],
      "evaluationCriteria": ["string"],
      "maxDurationSeconds": number,
      "isRequired": boolean
    }
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.get('OPENAI_MODEL', 'gpt-4o'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content) as GeneratedQuestionSet;
    } catch (error) {
      this.logger.error('Failed to generate questions', error);
      throw error;
    }
  }
}
