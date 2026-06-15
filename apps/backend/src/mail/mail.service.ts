import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Thin Resend wrapper. When RESEND_API_KEY is unset (local dev, CI), e-mails are
 * not sent — the rendered message is logged instead so flows still work
 * end-to-end without a mail provider. Sending is always best-effort: callers
 * should not let a mail failure break the interview lifecycle.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend?: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    this.from = this.config.get<string>('MAIL_FROM', 'HR Interview <noreply@haidg.io.vn>');

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set — e-mails will be logged, not delivered');
      return;
    }

    this.resend = new Resend(apiKey);
    this.logger.log('Resend mail provider configured');
  }

  get isConfigured(): boolean {
    return Boolean(this.resend);
  }

  /** Sends a message; never throws — returns false on failure. */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.resend) {
      this.logger.log(
        `[mail:dry-run] to=${message.to} subject="${message.subject}"\n${message.text ?? message.html}`,
      );
      return false;
    }
    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
      });
      if (error) {
        this.logger.error(`Failed to send "${message.subject}" to ${message.to}: ${error.message}`);
        return false;
      }
      this.logger.log(`Sent "${message.subject}" to ${message.to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send "${message.subject}" to ${message.to}: ${err.message}`);
      return false;
    }
  }
}
