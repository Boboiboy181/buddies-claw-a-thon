import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function InterviewNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const { register, handleSubmit, watch } = useForm<Record<string, any>>({ defaultValues: { jobId: params.get('jobId') || '' } });
  const jobId = watch('jobId');

  const { data: jobs } = useQuery({ queryKey: ['jobs'], queryFn: () => api.get('/jobs').then(r => r.data) });
  const { data: qSets } = useQuery({ queryKey: ['question-sets', jobId], queryFn: () => api.get(`/jobs/${jobId}/question-sets`).then(r => r.data), enabled: !!jobId });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/interviews', data).then(r => r.data),
    onSuccess: (res) => {
      const link = `${window.location.origin}/interview/${res.accessToken}`;
      setCreatedLink(link);
      toast.success('Interview created!');
    },
    onError: () => toast.error('Failed to create interview'),
  });

  if (createdLink) return (
    <div className="mx-auto max-w-xl p-8">
      <Card className="border-0 bg-white/90 text-center shadow-sm">
        <CardHeader className="items-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
          <div className="space-y-1">
            <CardTitle className="text-2xl">Interview Created!</CardTitle>
            <CardDescription>Share this link with the candidate to begin the session.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-2xl border bg-muted/40 px-3 py-3">
            <span className="flex-1 truncate text-sm text-muted-foreground">{createdLink}</span>
            <Button
              type="button"
              onClick={() => { navigator.clipboard.writeText(createdLink); toast.success('Copied!'); }}
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => navigate('/hr/interviews')} variant="outline" size="lg" className="h-11 flex-1 rounded-xl">
              View Interviews
            </Button>
            <Button onClick={() => setCreatedLink(null)} size="lg" className="h-11 flex-1 rounded-xl">
              Create Another
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <Button onClick={() => navigate(-1)} variant="ghost" className="w-fit rounded-full pl-2 text-muted-foreground">
        <ArrowLeft className="size-4" /> Back
      </Button>
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Create Interview Session</h1>
        <p className="text-muted-foreground">
          Pair a candidate with a job and optionally lock the session to a specific question set.
        </p>
      </div>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <Card className="border-0 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle>Candidate Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="candidate-full-name">Full Name *</Label>
              <Input id="candidate-full-name" {...register('candidate.fullName', { required: true })} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidate-email">Email *</Label>
              <Input id="candidate-email" type="email" {...register('candidate.email', { required: true })} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidate-phone">Phone</Label>
              <Input id="candidate-phone" {...register('candidate.phone')} className="h-11" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="candidate-cv">CV Text (optional)</Label>
              <Textarea id="candidate-cv" rows={5} {...register('candidate.cvText')} placeholder="Paste CV content..." />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle>Job & Question Set</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobId">Job *</Label>
              <Select id="jobId" {...register('jobId', { required: true })}>
              <option value="">Select job</option>
              {jobs?.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </Select>
            </div>
            {qSets?.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="questionSetId">Question Set (optional, uses active set by default)</Label>
                <Select id="questionSetId" {...register('questionSetId')}>
                  <option value="">Use active question set</option>
                  {qSets?.map((s: any) => <option key={s.id} value={s.id}>{s.name} (v{s.version})</option>)}
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
        <Button type="submit" disabled={mutation.isPending} size="lg" className="h-12 w-full rounded-xl">
          {mutation.isPending ? 'Creating...' : 'Create Interview & Generate Link'}
        </Button>
      </form>
    </div>
  );
}
