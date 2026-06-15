import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Copy, FileText, Loader2, Upload, X } from 'lucide-react';
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
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const { register, handleSubmit, watch, control, setValue } = useForm<Record<string, any>>({ defaultValues: { jobId: params.get('jobId') || '' } });
  const jobId = watch('jobId');
  const [parsingCv, setParsingCv] = useState(false);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [cvPreviewUrl, setCvPreviewUrl] = useState<string | null>(null);
  const [cvIsPdf, setCvIsPdf] = useState(false);
  const [showExtractedText, setShowExtractedText] = useState(false);

  // Revoke the object URL when it changes or on unmount to avoid memory leaks.
  useEffect(() => {
    return () => { if (cvPreviewUrl) URL.revokeObjectURL(cvPreviewUrl); };
  }, [cvPreviewUrl]);

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setParsingCv(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/candidates/parse-cv', form);
      setValue('candidate.cvText', data.cvText, { shouldDirty: true });
      setValue('candidate.cvFileUrl', data.cvFileUrl || '', { shouldDirty: true });
      setCvFileName(data.filename || file.name);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      setCvIsPdf(isPdf);
      setShowExtractedText(false);
      setCvPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return isPdf ? URL.createObjectURL(file) : null;
      });
      toast.success('CV imported successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not read this CV file.');
    } finally {
      setParsingCv(false);
    }
  };

  const clearCv = () => {
    setValue('candidate.cvText', '', { shouldDirty: true });
    setValue('candidate.cvFileUrl', '', { shouldDirty: true });
    setCvFileName(null);
    setCvIsPdf(false);
    setShowExtractedText(false);
    setCvPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
  };

  const cvText = watch('candidate.cvText');

  const { data: jobs } = useQuery({ queryKey: ['jobs', 'ACTIVE'], queryFn: () => api.get('/jobs?status=ACTIVE').then(r => r.data) });
  const { data: qSets } = useQuery({ queryKey: ['question-sets', jobId], queryFn: () => api.get(`/jobs/${jobId}/question-sets`).then(r => r.data), enabled: !!jobId });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/interviews', data).then(r => r.data),
    onSuccess: (res) => {
      const link = `${window.location.origin}/interview/${res.accessToken}`;
      setCreatedLink(link);
      setInviteEmailSent(Boolean(res.inviteEmailSent));
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
            <CardDescription>
              {inviteEmailSent
                ? 'An invitation email with this link has been sent to the candidate.'
                : 'Email delivery is not configured — share this link with the candidate manually.'}
            </CardDescription>
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="candidate-cv">CV (optional)</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="candidate-cv-file"
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    className="hidden"
                    onChange={handleCvUpload}
                    disabled={parsingCv}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={parsingCv}
                    onClick={() => document.getElementById('candidate-cv-file')?.click()}
                  >
                    {parsingCv ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Upload data-icon="inline-start" />}
                    {parsingCv ? 'Reading CV...' : cvFileName ? 'Replace file' : 'Upload CV file'}
                  </Button>
                </div>
              </div>

              {/* Hidden registration keeps the parsed text in the form (sent to the
                  backend) even while a PDF is shown as a preview instead of raw text. */}
              <input type="hidden" {...register('candidate.cvFileUrl')} />
              {(!cvFileName || cvIsPdf) && (
                <Textarea id="candidate-cv" {...register('candidate.cvText')} className="hidden" />
              )}

              {parsingCv ? (
                <div className="flex h-40 items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Reading CV...
                </div>
              ) : cvFileName ? (
                <div className="flex flex-col rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-2 border-b px-3 py-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm font-medium">{cvFileName}</span>
                    {!cvIsPdf && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowExtractedText((s) => !s)}>
                        {showExtractedText ? 'Hide text' : 'View text'}
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="icon-sm" className="rounded-md text-muted-foreground" onClick={clearCv} title="Remove CV">
                      <X />
                    </Button>
                  </div>
                  {cvIsPdf && cvPreviewUrl ? (
                    <iframe src={cvPreviewUrl} title="CV preview" className="h-96 w-full rounded-b-lg" />
                  ) : showExtractedText ? (
                    <div className="p-2">
                      <Textarea id="candidate-cv" {...register('candidate.cvText')} className="min-h-40 border-0 bg-transparent shadow-none focus-visible:ring-0" />
                    </div>
                  ) : (
                    <p className="px-3 py-3 text-sm text-muted-foreground">
                      Extracted {cvText?.length ?? 0} characters. Click “View text” to review or edit.
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={parsingCv}
                  onClick={() => document.getElementById('candidate-cv-file')?.click()}
                  className="flex h-32 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground transition-colors hover:bg-muted/40"
                >
                  <Upload className="size-5" />
                  <span>Upload the candidate's CV</span>
                  <span className="text-xs">PDF, DOCX or TXT — we'll read it automatically</span>
                </button>
              )}
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
                      <SelectValue placeholder="Select job">
                        {jobs?.find((j: any) => j.id === field.value)?.title}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {jobs?.length ? jobs.map((j: any) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.title}
                        </SelectItem>
                      )) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No active jobs available</div>
                      )}
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
                      <SelectValue placeholder="Use active question set">
                        {field.value ? qSets?.find((s: any) => s.id === field.value)?.name : undefined}
                      </SelectValue>
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
