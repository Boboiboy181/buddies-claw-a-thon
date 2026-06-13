import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Thin SMTP wrapper. When SMTP_HOST is unset (local dev, CI), e-mails are not
 * sent — the rendered message is logged instead so flows still work end-to-end
 * without an SMTP server. Sending is always best-effort: callers should not let
 * a mail failure break the interview lifecycle.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    this.from = this.config.get<string>('SMTP_FROM', 'HR Interview <no-reply@hr-interview.local>');

    if (!host) {
      this.logger.warn('SMTP_HOST not set — e-mails will be logged, not delivered');
      return;
    }

    const port = parseInt(this.config.get<string>('SMTP_PORT', '587'), 10);
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
    this.logger.log(`SMTP configured: ${host}:${port}`);
  }

  get isConfigured(): boolean {
    return Boolean(this.transporter);
  }

  /** Sends a message; never throws — returns false on failure. */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(
        `[mail:dry-run] to=${message.to} subject="${message.subject}"\n${message.text ?? message.html}`,
      );
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      this.logger.log(`Sent "${message.subject}" to ${message.to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send "${message.subject}" to ${message.to}: ${err.message}`);
      return false;
    }
  }
}
