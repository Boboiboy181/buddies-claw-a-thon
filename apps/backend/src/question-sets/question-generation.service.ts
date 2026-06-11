import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';

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

  constructor(private readonly llm: LlmService) {}

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
      return await this.llm.generateJson<GeneratedQuestionSet>({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
      });
    } catch (error) {
      this.logger.error('Failed to generate questions', error);
      throw error;
    }
  }
}
