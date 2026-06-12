import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageBlock } from '@/components/page-block';
import { PageHeader } from '@/components/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function InterviewNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const { register, handleSubmit, watch, control } = useForm<Record<string, any>>({ defaultValues: { jobId: params.get('jobId') || '' } });
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
    <div className="mx-auto max-w-xl p-4 md:p-6 xl:p-8">
      <PageBlock className="text-center">
        <CardHeader className="items-center">
          <div className="flex size-14 items-center justify-center rounded-lg bg-emerald-100 text-3xl text-emerald-700">✓</div>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl">Interview Created!</CardTitle>
            <CardDescription>Share this link with the candidate to begin the session.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-3">
            <span className="flex-1 truncate text-sm text-muted-foreground">{createdLink}</span>
            <Button
              type="button"
              onClick={() => { navigator.clipboard.writeText(createdLink); toast.success('Copied!'); }}
              variant="ghost"
              size="icon-sm"
              className="rounded-md"
            >
              <Copy />
            </Button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => navigate('/hr/interviews')} variant="outline" size="lg" className="h-11 flex-1 rounded-lg">
              View Interviews
            </Button>
            <Button onClick={() => setCreatedLink(null)} size="lg" className="h-11 flex-1 rounded-lg">
              Create Another
            </Button>
          </div>
        </CardContent>
      </PageBlock>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6 xl:p-8">
      <Button onClick={() => navigate(-1)} variant="ghost" className="w-fit rounded-lg pl-2 text-muted-foreground">
        <ArrowLeft data-icon="inline-start" /> Back
      </Button>
      <PageHeader
        variant="plain"
        title="Create Interview Session"
        description="Pair a candidate with a job and optionally lock the session to a specific question set."
      />
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-6">
        <PageBlock>
          <CardHeader>
            <CardTitle>Candidate Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="candidate-full-name">Full Name *</Label>
              <Input id="candidate-full-name" {...register('candidate.fullName', { required: true })} className="h-11" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="candidate-email">Email *</Label>
              <Input id="candidate-email" type="email" {...register('candidate.email', { required: true })} className="h-11" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="candidate-phone">Phone</Label>
              <Input id="candidate-phone" {...register('candidate.phone')} className="h-11" />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="candidate-cv">CV Text (optional)</Label>
              <Textarea id="candidate-cv" rows={5} {...register('candidate.cvText')} placeholder="Paste CV content..." />
            </div>
          </CardContent>
        </PageBlock>
        <PageBlock>
          <CardHeader>
            <CardTitle>Job & Question Set</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="jobId">Job *</Label>
              <Controller
                control={control}
                name="jobId"
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value || null} onValueChange={(value) => field.onChange(value ?? '')}>
                    <SelectTrigger id="jobId">
                      <SelectValue placeholder="Select job" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs?.map((j: any) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {qSets?.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="questionSetId">Question Set (optional, uses active set by default)</Label>
                <Controller
                  control={control}
                  name="questionSetId"
                  render={({ field }) => (
                    <Select value={field.value || null} onValueChange={(value) => field.onChange(value ?? '')}>
                    <SelectTrigger id="questionSetId">
                      <SelectValue placeholder="Use active question set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Use active question set</SelectItem>
                      {qSets?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} (v{s.version})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </CardContent>
        </PageBlock>
        <Button type="submit" disabled={mutation.isPending} size="lg" className="h-11 w-full rounded-lg shadow-sm shadow-primary/15">
          {mutation.isPending ? 'Creating...' : 'Create Interview & Generate Link'}
        </Button>
      </form>
    </div>
  );
}
