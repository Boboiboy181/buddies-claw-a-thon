import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Copy, Send, Video, DoorOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageBlock } from '@/components/page-block';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PageBlock>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </PageBlock>
  );
}

// Statuses where the interview is still moving — poll for updates
const POLLING_STATUSES = [
  'IN_PROGRESS',
  'COMPLETED',
  'RECORDING_PROCESSING',
  'TRANSCRIPT_PROCESSING',
  'REPORT_GENERATING',
];

export default function InterviewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: interview } = useQuery({
    queryKey: ['interview', id],
    queryFn: () => api.get(`/interviews/${id}`).then(r => r.data),
    refetchInterval: (query) => {
      const status = String(query.state.data?.status ?? '').toUpperCase();
      return POLLING_STATUSES.includes(status) ? 5000 : false;
    },
  });
  const status = String(interview?.status ?? '').toUpperCase();
  const { data: report } = useQuery({
    queryKey: ['report', id],
    queryFn: () => api.get(`/interviews/${id}/report`).then(r => r.data),
    enabled: status === 'REPORT_READY',
  });

  const setupRoom = useMutation({
    mutationFn: () => api.post(`/orchestrator/interviews/${id}/setup-room`),
    onSuccess: () => {
      toast.success('Daily room ready — TTS prewarming in background');
      qc.invalidateQueries({ queryKey: ['interview', id] });
    },
    onError: () => toast.error('Failed to set up room'),
  });

  const sendInvite = useMutation({
    mutationFn: () => api.post(`/orchestrator/interviews/${id}/invite`),
    onSuccess: () => {
      toast.success('Interview marked as invited');
      qc.invalidateQueries({ queryKey: ['interview', id] });
    },
    onError: () => toast.error('Failed to send invite'),
  });

  const viewRecording = useMutation({
    mutationFn: () => api.get(`/interviews/${id}/recording`).then(r => r.data),
    onSuccess: (data) => {
      if (data?.recordingUrl) window.open(data.recordingUrl, '_blank');
      else toast('Recording is not available yet', { icon: '⏳' });
    },
    onError: () => toast.error('Recording is not available yet'),
  });

  const link = interview ? `${window.location.origin}/interview/${interview.accessToken}` : '';

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 xl:p-8">
      <Button onClick={() => navigate(-1)} variant="ghost" className="w-fit rounded-lg pl-2 text-muted-foreground">
        <ArrowLeft data-icon="inline-start" /> Back
      </Button>

      {interview && (
        <>
          <div className="flex flex-col gap-4 rounded-lg border border-border/80 bg-card p-5 shadow-sm shadow-slate-950/5 md:p-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h1 className="font-heading mb-1 text-3xl font-semibold tracking-tight">{interview.candidate?.fullName}</h1>
              <p className="text-muted-foreground">{interview.job?.title}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                <span className="max-w-56 truncate text-xs text-muted-foreground">{link}</span>
                <Button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(link); toast.success('Copied!'); }}
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-md"
                >
                  <Copy />
                </Button>
              </div>
              <Badge variant={statusVariant(status)} className="px-3 py-1 text-sm">
                {status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {['CREATED', 'INVITED'].includes(status) && (
              <>
                <Button onClick={() => setupRoom.mutate()} disabled={setupRoom.isPending} variant="outline" className="rounded-lg">
                  <DoorOpen data-icon="inline-start" />
                  {setupRoom.isPending ? 'Setting up...' : interview.dailyRoomUrl ? 'Re-setup Room' : 'Setup Room'}
                </Button>
                {status === 'CREATED' && (
                  <Button onClick={() => sendInvite.mutate()} disabled={sendInvite.isPending} className="rounded-lg">
                    <Send data-icon="inline-start" />
                    {sendInvite.isPending ? 'Sending...' : 'Send Invite'}
                  </Button>
                )}
              </>
            )}
            {(interview.recordingUrl || ['COMPLETED', 'REPORT_GENERATING', 'REPORT_READY'].includes(status)) && (
              <Button onClick={() => viewRecording.mutate()} disabled={viewRecording.isPending} variant="outline" className="rounded-lg">
                <Video data-icon="inline-start" />
                View Recording
              </Button>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="flex flex-col gap-4 xl:col-span-2">
              {report ? (
                <>
                  <Section title="Summary">
                    <p className="text-sm leading-7 text-foreground/85">{report.summary}</p>
                  </Section>

                  {report.recommendation && (
                    <Section title="Recommendation">
                      <Badge variant={recommendationVariant(report.recommendation.decision)} className="mb-3 px-3 py-1 text-sm font-semibold">
                        {report.recommendation.decision?.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <p className="text-sm leading-7 text-foreground/85">{report.recommendation.reason}</p>
                      {report.recommendation.followUpQuestions?.length > 0 && (
                        <div className="mt-4">
                          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.18em]">FOLLOW-UP QUESTIONS</p>
                          <ul className="flex list-disc flex-col gap-1 pl-5">
                            {report.recommendation.followUpQuestions.map((q: string, i: number) => <li key={i} className="text-sm text-foreground/80">{q}</li>)}
                          </ul>
                        </div>
                      )}
                    </Section>
                  )}

                  {report.qaAnalysisJson?.map((qa: any, idx: number) => (
                    <Section key={idx} title={`Q${idx+1}: ${qa.question}`}>
                      <div className="mb-4 rounded-lg bg-muted/40 p-4">
                        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-[0.18em]">ANSWER</p>
                        <p className="text-sm leading-7 text-foreground/85">{qa.answerTranscript}</p>
                      </div>
                      <div className="mb-3 grid gap-3 md:grid-cols-2">
                        {qa.strengths?.length > 0 && <div><p className="mb-1 text-xs font-semibold tracking-[0.18em] text-emerald-700">STRENGTHS</p><ul className="flex list-disc flex-col gap-1 pl-5">{qa.strengths.map((s: string, i: number) => <li key={i} className="text-xs text-foreground/80">{s}</li>)}</ul></div>}
                        {qa.concerns?.length > 0 && <div><p className="mb-1 text-xs font-semibold tracking-[0.18em] text-red-600">CONCERNS</p><ul className="flex list-disc flex-col gap-1 pl-5">{qa.concerns.map((c: string, i: number) => <li key={i} className="text-xs text-foreground/80">{c}</li>)}</ul></div>}
                      </div>
                      {qa.score && <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Score:</span><span className="text-lg font-semibold">{qa.score}/10</span></div>}
                    </Section>
                  ))}
                </>
              ) : (
                <Section title="Interview Status">
                  <p className="text-muted-foreground">
                    {['COMPLETED', 'REPORT_GENERATING'].includes(status)
                      ? 'Report is being generated... This page refreshes automatically.'
                      : status === 'IN_PROGRESS'
                        ? 'Interview is in progress. This page refreshes automatically.'
                        : 'Interview not yet completed.'}
                  </p>
                </Section>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <PageBlock>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="flex flex-col gap-3 text-sm">
                    <div><dt className="text-muted-foreground">State</dt><dd className="font-medium">{interview.state}</dd></div>
                    <div><dt className="text-muted-foreground">Questions</dt><dd className="font-medium">{interview.questionSetSnapshotJson?.length || 0}</dd></div>
                    {interview.startedAt && <div><dt className="text-muted-foreground">Started</dt><dd className="font-medium">{new Date(interview.startedAt).toLocaleString()}</dd></div>}
                    {interview.endedAt && <div><dt className="text-muted-foreground">Ended</dt><dd className="font-medium">{new Date(interview.endedAt).toLocaleString()}</dd></div>}
                  </dl>
                </CardContent>
              </PageBlock>

              {report?.rubricScoresJson && (
                <PageBlock>
                  <CardHeader>
                    <CardTitle>Rubric Scores</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {report.rubricScoresJson.map((r: any, i: number) => (
                      <div key={i}>
                        <div className="mb-1 flex justify-between text-sm"><span className="text-foreground/85">{r.criterion}</span><span className="font-semibold">{r.score}/10</span></div>
                        <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(r.score / 10) * 100}%` }} /></div>
                      </div>
                    ))}
                  </CardContent>
                </PageBlock>
              )}

              {report?.audioReviewSignals && (
                <PageBlock>
                  <CardHeader>
                    <CardTitle>Non-verbal & Audio Review Signals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-3 text-xs italic">These are observational signals for HR reference only. They do not determine hiring decisions.</p>
                    <dl className="flex flex-col gap-2 text-sm">
                      <div><dt className="text-muted-foreground">Speaking Pace</dt><dd className="font-medium capitalize">{report.audioReviewSignals.speakingPace}</dd></div>
                      <div><dt className="text-muted-foreground">Total Duration</dt><dd className="font-medium">{report.audioReviewSignals.speakingDurationSeconds}s</dd></div>
                    </dl>
                  </CardContent>
                </PageBlock>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function statusVariant(status: string) {
  const map: Record<string, 'secondary' | 'warning' | 'success' | 'destructive'> = {
    CREATED: 'secondary',
    INVITED: 'secondary',
    CONSENT_ACCEPTED: 'secondary',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    RECORDING_PROCESSING: 'warning',
    TRANSCRIPT_PROCESSING: 'warning',
    REPORT_GENERATING: 'warning',
    REPORT_READY: 'success',
    FAILED: 'destructive',
  };

  return map[status.toUpperCase()] || 'secondary';
}

function recommendationVariant(decision: string) {
  const map: Record<string, 'success' | 'warning' | 'destructive'> = {
    strong_yes: 'success',
    yes: 'success',
    maybe: 'warning',
    no: 'destructive',
  };

  return map[decision] || 'warning';
}
