import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { htmlToText } from '../common/html.util';

/** Fixed 5-slot interview structure. Every generated set produces exactly these
 *  five questions, in order, tailored to the specific job from its JD. */
export const FIXED_QUESTION_SLOTS = [
  {
    order: 1,
    category: 'technical',
    focus: 'Technical Competency & Ownership',
    criteria: ['Technical Competency', 'Ownership', 'Real contribution level'],
    intent:
      "Ask the candidate to walk through their most recent relevant project — the main tech stack and the part they personally owned. Tailor the tech keywords to this job's stack from the JD.",
  },
  {
    order: 2,
    category: 'experience',
    focus: 'Job Fit & Learning Agility',
    criteria: ['Job Fit', 'Learning Agility', 'Ability to meet JD requirements'],
    intent:
      'Probe fit against a specific tool/technology or responsibility named in the JD that the candidate may not have used yet — ask whether they have experience with it or are willing to learn it.',
  },
  {
    order: 3,
    category: 'motivation',
    focus: 'Motivation & Cultural Fit',
    criteria: ['Motivation', 'Cultural Fit', 'Interest in the product and company'],
    intent: 'Ask why they are interested in this specific position and company/product.',
  },
  {
    order: 4,
    category: 'behavioral',
    focus: 'Career Motivation & Stability',
    criteria: ['Career Motivation', 'Stability Risk', 'Career direction'],
    intent:
      'Ask their reason for leaving the current role or seeking a new opportunity, and where they want their career to go.',
  },
  {
    order: 5,
    category: 'salary',
    focus: 'Compensation Fit',
    criteria: ['Compensation Fit', 'Alignment with hiring budget'],
    intent: 'Ask their salary expectation for this position.',
  },
] as const;

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
    const language = params.language === 'vi' ? 'Vietnamese' : 'English';
    const jdText = htmlToText(params.jdRawText);

    const systemPrompt = `You are an expert technical recruiter and interview designer. You design a FIXED 5-question screening interview that is the same in structure for every role but tailored in wording to the specific job. The questions must be clear, natural, and suitable for an AI interviewer to read aloud. Avoid discriminatory or protected-attribute questions (age, gender, marital status, religion, ethnicity, health, political views, family plans). Return structured JSON only.`;

    const slotSpec = FIXED_QUESTION_SLOTS.map(
      (s) =>
        `Question ${s.order} — ${s.focus} (category: "${s.category}")\n` +
        `  Intent: ${s.intent}\n` +
        `  evaluationCriteria MUST be: [${s.criteria.map((c) => `"${c}"`).join(', ')}]`,
    ).join('\n\n');

    const userPrompt = `Generate EXACTLY 5 interview questions for this role, following the fixed structure below. Do not add, remove, reorder, or merge slots — produce exactly one question per slot, in order 1 to 5.

Role: ${params.roleTitle}
Level: ${params.level || 'Not specified'}
Language: write every question and all text in ${language}.

Tailor each question to THIS job using its job description — especially questions 1 and 2, which must reference the actual tech stack / tools / responsibilities named in the JD. Keep questions 3, 4, and 5 close to their standard wording.

Fixed structure (one question each, in this exact order):

${slotSpec}

Job Description:
${jdText}

Return JSON matching this schema (the "questions" array MUST have exactly 5 items, order 1..5 matching the slots above):
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
      "text": "string (natural spoken ${language}, suitable for AI to read aloud)",
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
