import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Mic, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type InterviewState = 'loading' | 'waiting' | 'active' | 'completed' | 'error';

export default function CandidateInterview() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<InterviewState>('loading');
  const [interview, setInterview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get(`/interviews/access/${token}`)
      .then(res => {
        setInterview(res.data);
        if (res.data.status === 'completed' || res.data.status === 'report_ready') {
          setState('completed');
        } else {
          setState('waiting');
        }
      })
      .catch(() => {
        setError('Interview link is invalid or has expired.');
        setState('error');
      });
  }, [token]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_30%),linear-gradient(180deg,_#0f172a_0%,_#111827_100%)]">
        <div className="text-center">
          <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-slate-300">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_30%),linear-gradient(180deg,_#0f172a_0%,_#111827_100%)] px-4">
        <Card className="w-full max-w-md border-white/10 bg-white/95 text-center">
          <CardHeader className="items-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-700">✗</div>
            <div className="space-y-1">
              <CardTitle className="text-xl">Link Not Found</CardTitle>
              <CardDescription>{error}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (state === 'completed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_30%),linear-gradient(180deg,_#0f172a_0%,_#111827_100%)] px-4">
        <Card className="w-full max-w-md border-white/10 bg-white/95 text-center">
          <CardHeader className="items-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
            <div className="space-y-1">
              <CardTitle className="text-xl">Interview Completed</CardTitle>
              <CardDescription>
                Thank you for completing your interview. The HR team will review your responses and be in touch.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_30%),linear-gradient(180deg,_#0f172a_0%,_#111827_100%)] p-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col justify-center gap-6">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200 backdrop-blur">
            <ShieldCheck className="size-4 text-amber-300" />
            Secure interview room
          </div>
          <h1 className="font-heading mb-2 text-3xl font-semibold tracking-tight text-white">AI Interview</h1>
          {interview?.job?.title && <p className="text-slate-300">Position: {interview.job.title}</p>}
        </div>

        <Card className="border-white/10 bg-white/8 text-center text-white backdrop-blur">
          <CardHeader className="items-center">
            <div className="mb-2 flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Mic className="size-10" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl text-white">Ready to Start?</CardTitle>
              <CardDescription className="max-w-md text-sm leading-7 text-slate-300">
                This is an AI-powered voice interview. Please ensure you are in a quiet environment with a working microphone. The interview will take approximately 20 to 30 minutes.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={() => setState('active')}
                className="h-12 rounded-xl px-8 text-sm"
              >
                Start Interview
              </Button>
            </div>
          </CardContent>
        </Card>

        {state === 'active' && (
          <Card className="border-white/10 bg-white/8 text-center text-white backdrop-blur">
            <CardContent className="p-8">
              <div className="mx-auto mb-4 flex size-16 animate-pulse items-center justify-center rounded-full bg-emerald-500">
              <span className="text-2xl">🔴</span>
              </div>
              <p className="mb-2 font-semibold text-white">Interview In Progress</p>
              <p className="text-sm text-slate-300">The AI interviewer is now connected. Please speak clearly and naturally.</p>
              <p className="mt-4 text-xs text-slate-400">Video/audio integration via Daily.co will be initialized here once the backend Daily room URL is provided.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
