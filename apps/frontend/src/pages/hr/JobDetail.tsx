import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Plus, Wand2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageBlock } from '@/components/page-block';

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: job, isLoading } = useQuery({ queryKey: ['job', jobId], queryFn: () => api.get(`/jobs/${jobId}`).then(r => r.data) });
  const { data: questionSets } = useQuery({ queryKey: ['question-sets', jobId], queryFn: () => api.get(`/jobs/${jobId}/question-sets`).then(r => r.data) });
  const { data: interviews } = useQuery({ queryKey: ['job-interviews', jobId], queryFn: () => api.get(`/interviews?jobId=${jobId}`).then(r => r.data) });

  const generateQuestions = async () => {
    setGenerating(true);
    try {
      await api.post(`/jobs/${jobId}/question-sets/generate`, {
        questionCount: 10, categories: ['screening', 'motivation', 'experience', 'behavioral', 'technical'],
        language: 'vi', difficulty: job?.level?.toLowerCase() || 'middle',
        includeSalaryQuestion: true, includeMotivationQuestion: true,
      });
      toast.success('Question set generated!');
      qc.invalidateQueries({ queryKey: ['question-sets', jobId] });
    } catch { toast.error('Failed to generate questions'); }
    setGenerating(false);
  };

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6 p-8">
      <Button onClick={() => navigate(-1)} variant="ghost" className="w-fit rounded-full pl-2 text-muted-foreground">
        <ArrowLeft className="size-4" /> Back
      </Button>

      <div className="flex flex-col gap-4 rounded-[2rem] border bg-white/80 p-8 backdrop-blur xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">{job?.title}</h1>
            <Badge variant={job?.status === 'active' ? 'success' : 'warning'}>{job?.status}</Badge>
          </div>
          <p className="text-muted-foreground">{[job?.department, job?.level, job?.location].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={generateQuestions} disabled={generating} variant="secondary" size="lg" className="h-11 rounded-xl">
            <Wand2 className="size-4" /> {generating ? 'Generating...' : 'Generate Questions'}
          </Button>
          <Link to={`/hr/interviews/new?jobId=${jobId}`} className={buttonVariants({ size: 'lg', className: 'h-11 rounded-xl px-5' })}>
            <Plus className="size-4" /> New Interview
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <PageBlock>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-foreground/85">{job?.jdRawText}</pre>
            </CardContent>
          </PageBlock>

          <PageBlock>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Question Sets</CardTitle>
              {questionSets?.length > 0 && (
                <Link to={`/hr/jobs/${jobId}/questions`} className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'rounded-full' })}>
                  Manage <ExternalLink className="size-3" />
                </Link>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {questionSets?.length ? questionSets.map((qs: any) => (
                <div key={qs.id} className="flex items-center justify-between rounded-2xl bg-muted/35 p-4">
                  <div>
                    <p className="text-sm font-medium">{qs.name}</p>
                    <p className="text-muted-foreground text-xs">v{qs.version} · {qs.status}</p>
                  </div>
                  <Badge variant={qs.status === 'active' ? 'success' : 'secondary'}>{qs.status}</Badge>
                </div>
              )) : <p className="text-sm text-muted-foreground">No question sets yet. Click "Generate Questions" to create one.</p>}
            </CardContent>
          </PageBlock>
        </div>

        <div className="space-y-4">
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
