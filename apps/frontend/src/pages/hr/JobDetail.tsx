import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Plus, Wand2, ExternalLink, Pencil, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageBlock } from '@/components/page-block';
import { RichTextEditor, isRichTextEmpty } from '@/components/ui/rich-text-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const JOB_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [editingJd, setEditingJd] = useState(false);
  const [jdDraft, setJdDraft] = useState('');

  const { data: job, isLoading } = useQuery({ queryKey: ['job', jobId], queryFn: () => api.get(`/jobs/${jobId}`).then(r => r.data) });

  const saveJd = useMutation({
    mutationFn: (jdRawText: string) => api.patch(`/jobs/${jobId}`, { jdRawText }).then(r => r.data),
    onSuccess: () => {
      toast.success('Job description updated');
      qc.invalidateQueries({ queryKey: ['job', jobId] });
      setEditingJd(false);
    },
    onError: () => toast.error('Failed to save job description'),
  });

  const startEditJd = () => {
    setJdDraft(job?.jdRawText || '');
    setEditingJd(true);
  };

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/jobs/${jobId}`, { status }).then(r => r.data),
    onSuccess: () => {
      toast.success('Job status updated');
      qc.invalidateQueries({ queryKey: ['job', jobId] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: () => toast.error('Failed to update status'),
  });
  const { data: questionSets } = useQuery({ queryKey: ['question-sets', jobId], queryFn: () => api.get(`/jobs/${jobId}/question-sets`).then(r => r.data) });
  const { data: interviews } = useQuery({ queryKey: ['job-interviews', jobId], queryFn: () => api.get(`/interviews?jobId=${jobId}`).then(r => r.data) });

  const generateQuestions = async () => {
    setGenerating(true);
    try {
      await api.post(`/jobs/${jobId}/question-sets/generate`, {
        questionCount: 5, categories: ['technical', 'experience', 'motivation', 'behavioral', 'salary'],
        language: 'vi', difficulty: job?.level?.toLowerCase() || 'middle',
        includeSalaryQuestion: true, includeMotivationQuestion: true,
      });
      toast.success('Question set generated!');
      qc.invalidateQueries({ queryKey: ['question-sets', jobId] });
    } catch { toast.error('Failed to generate questions'); }
    setGenerating(false);
  };

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 xl:p-8">
      <Button onClick={() => navigate(-1)} variant="ghost" className="w-fit rounded-lg pl-2 text-muted-foreground">
        <ArrowLeft data-icon="inline-start" /> Back
      </Button>

      <div className="flex flex-col gap-4 rounded-lg border border-border/80 bg-card p-5 shadow-sm shadow-slate-950/5 md:p-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">{job?.title}</h1>
            <Select value={job?.status} onValueChange={(v) => updateStatus.mutate(v)} disabled={updateStatus.isPending}>
              <SelectTrigger className="h-8 w-auto gap-2 rounded-full border-none bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:opacity-60" aria-label="Job status">
                <Badge variant={job?.status?.toUpperCase() === 'ACTIVE' ? 'success' : 'warning'}>{job?.status}</Badge>
              </SelectTrigger>
              <SelectContent>
                {JOB_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-muted-foreground">{[job?.department, job?.level, job?.location].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={generateQuestions} disabled={generating} variant="secondary" size="lg" className="h-10 rounded-lg">
            <Wand2 data-icon="inline-start" /> {generating ? 'Generating...' : 'Generate Questions'}
          </Button>
          {job?.status?.toUpperCase() === 'ACTIVE' ? (
            <Link to={`/hr/interviews/new?jobId=${jobId}`} className={buttonVariants({ size: 'lg', className: 'h-10 rounded-lg px-4 shadow-sm shadow-primary/15' })}>
              <Plus data-icon="inline-start" /> New Interview
            </Link>
          ) : (
            <Button size="lg" disabled className="h-10 rounded-lg px-4" title="Only active jobs can be interviewed">
              <Plus data-icon="inline-start" /> New Interview
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <PageBlock>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Job Description</CardTitle>
              {!editingJd && (
                <Button variant="ghost" size="sm" className="rounded-lg" onClick={startEditJd}>
                  <Pencil data-icon="inline-start" /> Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingJd ? (
                <div className="flex flex-col gap-3">
                  <RichTextEditor value={jdDraft} onChange={setJdDraft} placeholder="Write the job description..." />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setEditingJd(false)}
                      disabled={saveJd.isPending}
                    >
                      <X data-icon="inline-start" /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-lg"
                      onClick={() => saveJd.mutate(jdDraft)}
                      disabled={saveJd.isPending || isRichTextEmpty(jdDraft)}
                    >
                      <Check data-icon="inline-start" /> {saveJd.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="whitespace-pre-wrap text-sm leading-7 text-foreground/85 [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_strong]:font-semibold [&_em]:italic"
                  dangerouslySetInnerHTML={{ __html: job?.jdRawText || '<p class="text-muted-foreground">No description yet.</p>' }}
                />
              )}
            </CardContent>
          </PageBlock>

          <PageBlock>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Question Sets</CardTitle>
              {questionSets?.length > 0 && (
                <Link to={`/hr/jobs/${jobId}/questions`} className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'rounded-lg' })}>
                  Manage <ExternalLink data-icon="inline-end" />
                </Link>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {questionSets?.length ? questionSets.map((qs: any) => (
                <div key={qs.id} className="flex items-center justify-between rounded-lg bg-muted/35 p-4">
                  <div>
                    <p className="text-sm font-medium">{qs.name}</p>
                    <p className="text-muted-foreground text-xs">v{qs.version} · {qs.status}</p>
                  </div>
                  <Badge variant={qs.status?.toUpperCase() === 'ACTIVE' ? 'success' : 'secondary'}>{qs.status}</Badge>
                </div>
              )) : <p className="text-sm text-muted-foreground">No question sets yet. Click "Generate Questions" to create one.</p>}
            </CardContent>
          </PageBlock>
        </div>

        <div className="flex flex-col gap-4">
          <PageBlock>
            <CardHeader>
              <CardTitle>Recent Interviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {interviews?.length ? interviews.slice(0, 5).map((i: any) => (
                <Link key={i.id} to={`/hr/interviews/${i.id}`} className="block rounded-xl px-3 py-2 text-sm transition hover:bg-muted">
                  {i.candidate?.fullName} <span className="text-muted-foreground">· {i.status}</span>
                </Link>
              )) : <p className="text-sm text-muted-foreground">No interviews yet</p>}
            </CardContent>
          </PageBlock>
        </div>
      </div>
    </div>
  );
}
