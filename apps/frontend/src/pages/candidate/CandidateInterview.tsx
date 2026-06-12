import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConsentScreen } from '@/components/interview/ConsentScreen';
import { DeviceCheck } from '@/components/interview/DeviceCheck';
import { InterviewRoom } from '@/components/interview/InterviewRoom';
import type { CandidateInterviewPayload } from '@/types/api';

type Step = 'loading' | 'consent' | 'device_check' | 'room' | 'done' | 'error';

const IN_PROGRESS_STATES = [
  'AGENT_GREETING',
  'ASKING_QUESTION',
  'LISTENING_ANSWER',
  'PROCESSING_ANSWER',
  'AGENT_RESPONSE',
  'NEXT_QUESTION',
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_30%),linear-gradient(180deg,_#0f172a_0%,_#111827_100%)] p-4 sm:p-6">
      <div className="flex w-full flex-col items-center gap-6">{children}</div>
    </div>
  );
}

export default function CandidateInterview() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>('loading');
  const [interview, setInterview] = useState<CandidateInterviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consentSubmitting, setConsentSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .get<CandidateInterviewPayload>(`/candidate/interviews/${token}`)
      .then((res) => {
        const data = res.data;
        setInterview(data);
        if (
          ['COMPLETED', 'REPORT_GENERATING', 'REPORT_READY'].includes(data.status) ||
          data.state === 'COMPLETED' ||
          data.state === 'REPORT_GENERATING' ||
          data.state === 'REPORT_READY'
        ) {
          setStep('done');
        } else if (IN_PROGRESS_STATES.includes(data.state)) {
          // Rejoining mid-interview — skip consent, recheck devices
          setStep('device_check');
        } else if (data.state === 'READY_CHECK' || data.consentAcceptedAt) {
          setStep('device_check');
        } else {
          setStep('consent');
        }
      })
      .catch(() => {
        setError('Link phỏng vấn không hợp lệ hoặc đã hết hạn.');
        setStep('error');
      });
  }, [token]);

  const acceptConsent = async () => {
    if (!interview) return;
    setConsentSubmitting(true);
    try {
      await api.post(`/orchestrator/interviews/${interview.id}/consent`);
      setInterview({ ...interview, state: 'READY_CHECK', status: 'CONSENT_ACCEPTED' });
      setStep('device_check');
    } catch {
      toast.error('Không xác nhận được. Vui lòng thử lại.');
    } finally {
      setConsentSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-slate-300">Đang tải thông tin phỏng vấn...</p>
        </div>
      </Shell>
    );
  }

  if (step === 'error') {
    return (
      <Shell>
        <Card className="w-full max-w-md border-white/10 bg-white/95 text-center">
          <CardHeader className="items-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-700">✗</div>
            <div className="space-y-1">
              <CardTitle className="text-xl">Không tìm thấy link</CardTitle>
              <CardDescription>{error}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </Shell>
    );
  }

  if (step === 'done') {
    return (
      <Shell>
        <Card className="w-full max-w-md border-white/10 bg-white/95 text-center">
          <CardHeader className="items-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-8" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl">Phỏng vấn hoàn tất</CardTitle>
              <CardDescription>
                Cảm ơn bạn đã hoàn thành buổi phỏng vấn. Kết quả sẽ được đội ngũ HR xem xét và phản hồi
                trong vòng 2-3 ngày làm việc.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200 backdrop-blur">
          <ShieldCheck className="size-4 text-amber-300" />
          Phòng phỏng vấn bảo mật
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          AI Interview{interview?.job?.title ? ` — ${interview.job.title}` : ''}
        </h1>
      </div>

      {step === 'consent' && interview && (
        <ConsentScreen interview={interview} onAccept={acceptConsent} submitting={consentSubmitting} />
      )}
      {step === 'device_check' && <DeviceCheck onReady={() => setStep('room')} />}
      {step === 'room' && interview && (
        <InterviewRoom interview={interview} onCompleted={() => setStep('done')} />
      )}
    </Shell>
  );
}
