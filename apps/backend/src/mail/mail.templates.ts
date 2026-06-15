import type { MailMessage } from './mail.service';

const wrap = (title: string, body: string) => `
<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
  <h2 style="color:#3c3489">${title}</h2>
  ${body}
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
  <p style="font-size:12px;color:#888">AI HR Interview Platform</p>
</div>`;

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { dateStyle: 'long' });

/** Invitation sent to the candidate with the interview link and deadline. */
export function interviewInvite(params: {
  candidateName: string;
  jobTitle: string;
  link: string;
  expiresAt?: Date | null;
}): Omit<MailMessage, 'to'> {
  const deadline = params.expiresAt
    ? ` before <strong>${fmtDate(params.expiresAt)}</strong>`
    : '';
  const body = `
    <p>Dear ${params.candidateName},</p>
    <p>We&rsquo;re really pleased to let you know you&rsquo;ve been shortlisted for our <strong>${params.jobTitle}</strong> role. Our talent team have already reviewed your application in detail and we&rsquo;d love to keep things moving. Your next step is a short interview with our AI Recruitment Agent.</p>
    <p>We know it&rsquo;s not a conventional first conversation. We use it because we get a high volume of applications and it means every shortlisted candidate gets a proper shot, on their own schedule.</p>
    <p>Please record your responses whenever suits you${deadline}. No diary wrangling, no fixed time slots. Our TA team reviews everything personally on our end.</p>
    <p>When you&rsquo;re ready:</p>
    <p style="margin:24px 0">
      <a href="${params.link}" style="background:#534ab7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Start your interview</a>
    </p>
    <p style="font-size:13px;color:#666">Or open the link: <a href="${params.link}">${params.link}</a></p>
    <p>And of course, if you have any questions or if you need any adjustments to complete this, please just hit reply and we&rsquo;ll be happy to help.</p>
    <p>Best of luck,<br/>VNG&rsquo;s Talent Acquisition team.</p>`;
  return {
    subject: `You've been shortlisted — ${params.jobTitle}`,
    html: wrap('You&rsquo;ve been shortlisted', body),
    text: `Dear ${params.candidateName}, we're really pleased to let you know you've been shortlisted for our ${params.jobTitle} role. Your next step is a short interview with our AI Recruitment Agent. Please record your responses whenever suits you${params.expiresAt ? ` before ${fmtDate(params.expiresAt)}` : ''}. When you're ready, start your interview: ${params.link}. If you have any questions or need any adjustments, just hit reply. Best of luck, VNG's Talent Acquisition team.`,
  };
}

/** Notification to the recruiter that an interview report is ready to review. */
export function reportReady(params: {
  candidateName: string;
  jobTitle: string;
  link: string;
}): Omit<MailMessage, 'to'> {
  const body = `
    <p>Báo cáo phỏng vấn đã sẵn sàng.</p>
    <p>Ứng viên: <strong>${params.candidateName}</strong><br/>Vị trí: <strong>${params.jobTitle}</strong></p>
    <p style="margin:24px 0">
      <a href="${params.link}" style="background:#534ab7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Xem báo cáo</a>
    </p>`;
  return {
    subject: `Báo cáo phỏng vấn sẵn sàng — ${params.candidateName} (${params.jobTitle})`,
    html: wrap('Báo cáo đã sẵn sàng', body),
    text: `Báo cáo phỏng vấn cho ${params.candidateName} — ${params.jobTitle} đã sẵn sàng. Xem: ${params.link}`,
  };
}
