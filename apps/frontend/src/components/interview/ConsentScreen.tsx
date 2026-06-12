import { useState } from 'react';
import { Clock, Mic, ShieldCheck, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CandidateInterviewPayload } from '@/types/api';

interface Props {
  interview: CandidateInterviewPayload;
  onAccept: () => void;
  submitting: boolean;
}

export function ConsentScreen({ interview, onAccept, submitting }: Props) {
  const [agreed, setAgreed] = useState(false);
  const estimatedMinutes = Math.max(10, interview.questions.length * 4);

  return (
    <Card className="w-full max-w-xl border-border/80 shadow-lg shadow-slate-950/5">
      <CardHeader>
        <div className="mb-2 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck />
        </div>
        <CardTitle className="text-2xl">Phỏng vấn AI — {interview.job.title}</CardTitle>
        <CardDescription>
          Xin chào {interview.candidate.fullName}, bạn được mời tham gia buổi phỏng vấn tự động với trợ lý AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <ul className="grid gap-3 text-sm text-foreground">
          <li className="flex items-start gap-3 rounded-lg border bg-muted/35 p-3">
            <Mic className="mt-0.5 shrink-0 text-primary" />
            Trợ lý AI sẽ đọc lần lượt {interview.questions.length} câu hỏi. Bạn trả lời bằng giọng nói sau khi nghe xong mỗi câu.
          </li>
          <li className="flex items-start gap-3 rounded-lg border bg-muted/35 p-3">
            <Video className="mt-0.5 shrink-0 text-primary" />
            Buổi phỏng vấn sẽ được <strong>ghi âm và ghi hình</strong> để phục vụ việc đánh giá. Câu trả lời được chuyển thành văn bản tự động.
          </li>
          <li className="flex items-start gap-3 rounded-lg border bg-muted/35 p-3">
            <Clock className="mt-0.5 shrink-0 text-primary" />
            Thời lượng dự kiến khoảng {estimatedMinutes} phút. Hãy chuẩn bị môi trường yên tĩnh và kết nối mạng ổn định.
          </li>
        </ul>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-4 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-4 accent-primary"
          />
          Tôi đồng ý tham gia phỏng vấn và cho phép ghi âm, ghi hình, xử lý dữ liệu câu trả lời của tôi cho mục đích tuyển dụng.
        </label>

        <Button className="h-11 w-full rounded-lg" disabled={!agreed || submitting} onClick={onAccept}>
          {submitting ? 'Đang xác nhận...' : 'Đồng ý và tiếp tục'}
        </Button>
      </CardContent>
    </Card>
  );
}
