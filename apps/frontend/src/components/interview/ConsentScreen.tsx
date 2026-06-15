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
        <CardTitle className="text-2xl">AI Interview — {interview.job.title}</CardTitle>
        <CardDescription>
          Hi {interview.candidate.fullName}, you've been invited to an automated interview with our AI assistant.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <ul className="grid gap-3 text-sm leading-relaxed text-foreground">
          <li className="flex items-start gap-3 rounded-lg border bg-muted/35 p-3">
            <Mic className="mt-0.5 shrink-0 text-primary" />
            <span>The AI assistant will read out {interview.questions.length} questions one by one. Answer by voice after each question.</span>
          </li>
          <li className="flex items-start gap-3 rounded-lg border bg-muted/35 p-3">
            <Video className="mt-0.5 shrink-0 text-primary" />
            <span>The session is recorded (audio and video) for evaluation, and your answers are automatically transcribed.</span>
          </li>
          <li className="flex items-start gap-3 rounded-lg border bg-muted/35 p-3">
            <Clock className="mt-0.5 shrink-0 text-primary" />
            <span>The interview takes about {estimatedMinutes} minutes. Please find a quiet spot with a stable internet connection.</span>
          </li>
        </ul>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-4 text-sm leading-relaxed text-muted-foreground">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>I agree to take part in this interview and consent to the audio and video recording and processing of my answers for recruitment purposes.</span>
        </label>

        <Button className="h-11 w-full rounded-lg" disabled={!agreed || submitting} onClick={onAccept}>
          {submitting ? 'Confirming...' : 'Agree and continue'}
        </Button>
      </CardContent>
    </Card>
  );
}
