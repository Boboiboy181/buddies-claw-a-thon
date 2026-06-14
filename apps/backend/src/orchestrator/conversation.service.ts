import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmService } from '../llm/llm.service';

export interface TurnContext {
  jobTitle: string;
  jdRawText: string;
  questionText: string;
  /** Full transcript for the current question so far (initial answer + any follow-up turns). */
  answerSoFar: string;
  followUpsAsked: number;
  maxFollowUps: number;
  language: string;
}

export interface TurnDecision {
  /** 'follow_up' → ask `say` and keep listening; 'next' → move to the next planned question. */
  action: 'follow_up' | 'next';
  say?: string;
}

/**
 * Decides the interviewer agent's next move after a candidate answer: ask one
 * concise follow-up to probe/clarify, or move on. Grounded to the current
 * planned question so required coverage and fairness are preserved.
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly llm: LlmService,
    private readonly config: ConfigService,
  ) {}

  async nextTurn(ctx: TurnContext): Promise<TurnDecision> {
    // Hard cap regardless of the model's opinion.
    if (ctx.followUpsAsked >= ctx.maxFollowUps) return { action: 'next' };

    const langName = ctx.language === 'en' ? 'English' : 'Vietnamese';
    const systemPrompt = `You are a professional, warm HR interviewer conducting a screening interview by voice.
Your job for THIS turn: decide whether to ask ONE short follow-up to the candidate's latest answer, or move on to the next planned question.
Rules:
- Ask a follow-up only when it adds real signal: the answer is vague, incomplete, or invites a worthwhile probe. Otherwise move on.
- A follow-up must be ONE concise spoken question (max ~2 sentences), in ${langName}, natural and conversational. You may briefly acknowledge before asking.
- Stay strictly on the topic of the current planned question — do not introduce unrelated topics or the next question.
- Never reveal scoring, evaluation criteria, or whether the answer was good/bad.
- Never ask about protected attributes (age, gender, marital status, religion, ethnicity, health, etc.).
- At most ${ctx.maxFollowUps} follow-ups per question; ${ctx.followUpsAsked} already asked.
Return JSON only: {"action": "follow_up" | "next", "say": "the follow-up question text (omit or empty when action is next)"}.`;

    const userPrompt = `Job: ${ctx.jobTitle}

Job description (context):
${ctx.jdRawText.slice(0, 1500)}

Current planned question:
${ctx.questionText}

Candidate's answer so far (may include earlier follow-ups):
${ctx.answerSoFar || '[No answer recorded]'}

Decide: ask one more follow-up, or move on?`;

    try {
      const decision = await this.llm.generateJson<TurnDecision>({
        systemPrompt,
        userPrompt,
        temperature: 0.5,
      });
      if (decision.action === 'follow_up' && decision.say?.trim()) {
        return { action: 'follow_up', say: decision.say.trim() };
      }
      return { action: 'next' };
    } catch (err: any) {
      // On any LLM failure, fail safe by moving on — never block the interview.
      this.logger.warn(`Conversation turn decision failed, moving on: ${err.message}`);
      return { action: 'next' };
    }
  }
}
