import type { MailMessage } from './mail.service';

const wrap = (title: string, body: string) => `
<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
  <h2 style="color:#3c3489">${title}</h2>
  ${body}
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
  <p style="font-size:12px;color:#888">AI HR Interview Platform</p>
</div>`;

const fmtDate = (d: Date) =>
  d.toLocaleString('vi-VN', { dateStyle: 'long', timeStyle: 'short' });

/** Invitation sent to the candidate with the interview link and deadline. */
export function interviewInvite(params: {
  candidateName: string;
  jobTitle: string;
  link: string;
  expiresAt?: Date | null;
}): Omit<MailMessage, 'to'> {
  const deadline = params.expiresAt
    ? `<p>Vui lòng hoàn thành trước <strong>${fmtDate(params.expiresAt)}</strong>.</p>`
    : '';
  const body = `
    <p>Xin chào ${params.candidateName},</p>
    <p>Bạn được mời tham gia buổi phỏng vấn cho vị trí <strong>${params.jobTitle}</strong>.</p>
    <p>Buổi phỏng vấn do trợ lý AI thực hiện: AI đọc câu hỏi, bạn trả lời bằng giọng nói. Bạn có thể thực hiện bất cứ lúc nào qua đường dẫn dưới đây.</p>
    ${deadline}
    <p style="margin:24px 0">
      <a href="${params.link}" style="background:#534ab7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Bắt đầu phỏng vấn</a>
    </p>
    <p style="font-size:13px;color:#666">Hoặc mở liên kết: <a href="${params.link}">${params.link}</a></p>`;
  return {
    subject: `Lời mời phỏng vấn — ${params.jobTitle}`,
    html: wrap('Lời mời phỏng vấn', body),
    text: `Xin chào ${params.candidateName}, bạn được mời phỏng vấn vị trí ${params.jobTitle}. Mở liên kết: ${params.link}${params.expiresAt ? ` (hạn: ${fmtDate(params.expiresAt)})` : ''}`,
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
