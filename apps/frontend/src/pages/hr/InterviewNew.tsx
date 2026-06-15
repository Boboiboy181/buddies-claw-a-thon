import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Copy, FileText, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageBlock } from '@/components/page-block';
import { PageHeader } from '@/components/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type CandidateRow = {
  fullName: string;
  email: string;
  phone: string;
  cvText: string;
  cvFileUrl: string;
};

type FormValues = {
  jobId: string;
  questionSetId: string;
  candidates: CandidateRow[];
};

type BulkResult = {
  candidateName: string;
  candidateEmail: string;
  success: boolean;
  link: string | null;
  inviteEmailSent: boolean;
  error: string | null;
};

const EMPTY_CANDIDATE: CandidateRow = { fullName: '', email: '', phone: '', cvText: '', cvFileUrl: '' };

export default function InterviewNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);

  // Per-candidate CV state (indexed by row index)
  const [cvState, setCvState] = useState<Record<number, { fileName: string | null; previewUrl: string | null; isPdf: boolean; parsing: boolean }>>({});

  const { register, handleSubmit, watch, control, setValue } = useForm<FormValues>({
    defaultValues: { jobId: params.get('jobId') || '', questionSetId: '', candidates: [{ ...EMPTY_CANDIDATE }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'candidates' });
  const jobId = watch('jobId');

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(cvState).forEach(s => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl); });
    };
  }, [cvState]);

  const setCvRow = (idx: number, patch: Partial<typeof cvState[0]>) =>
    setCvState(prev => ({ ...prev, [idx]: { ...{ fileName: null, previewUrl: null, isPdf: false, parsing: false }, ...prev[idx], ...patch } }));

  const handleCvUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCvRow(idx, { parsing: true });
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/candidates/parse-cv', form);
      setValue(`candidates.${idx}.cvText`, data.cvText, { shouldDirty: true });
      setValue(`candidates.${idx}.cvFileUrl`, data.cvFileUrl || '', { shouldDirty: true });
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const previewUrl = isPdf ? URL.createObjectURL(file) : null;
      setCvRow(idx, { fileName: data.filename || file.name, isPdf, previewUrl, parsing: false });
      toast.success('CV imported.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not read this CV.');
      setCvRow(idx, { parsing: false });
    }
  };

  const clearCv = (idx: number) => {
    setValue(`candidates.${idx}.cvText`, '', { shouldDirty: true });
    setValue(`candidates.${idx}.cvFileUrl`, '', { shouldDirty: true });
    setCvState(prev => {
      if (prev[idx]?.previewUrl) URL.revokeObjectURL(prev[idx].previewUrl!);
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const { data: jobs } = useQuery({ queryKey: ['jobs', 'ACTIVE'], queryFn: () => api.get('/jobs?status=ACTIVE').then(r => r.data) });
  const { data: qSets } = useQuery({ queryKey: ['question-sets', jobId], queryFn: () => api.get(`/jobs/${jobId}/question-sets`).then(r => r.data), enabled: !!jobId });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      api.post('/interviews/bulk', {
        jobId: data.jobId,
        questionSetId: data.questionSetId || undefined,
        candidates: data.candidates.map(c => ({
          fullName: c.fullName,
          email: c.email,
          phone: c.phone || undefined,
          cvText: c.cvText || undefined,
          cvFileUrl: c.cvFileUrl || undefined,
        })),
      }).then(r => r.data),
    onSuccess: (res: BulkResult[]) => {
      setBulkResults(res);
      const ok = res.filter(r => r.success).length;
      const fail = res.length - ok;
      if (fail === 0) toast.success(`${ok} interview${ok > 1 ? 's' : ''} created!`);
      else toast(`${ok} created, ${fail} failed.`, { icon: '⚠️' });
    },
    onError: () => toast.error('Failed to create interviews'),
  });

  // ── Success screen ──────────────────────────────────────────────────────
  if (bulkResults) {
    const succeeded = bulkResults.filter(r => r.success);
    const failed = bulkResults.filter(r => !r.success);
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6 xl:p-8">
        <PageBlock>
          <CardHeader className="items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-lg bg-emerald-100 text-3xl text-emerald-700">✓</div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-2xl">
                {succeeded.length} Interview{succeeded.length > 1 ? 's' : ''} Created
              </CardTitle>
              <CardDescription>
                {succeeded.some(r => r.inviteEmailSent)
                  ? 'Invitation emails have been sent to the candidates below.'
                  : 'Email delivery is not configured — share these links manually.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {succeeded.map((r, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{r.candidateName}</p>
                    <p className="text-xs text-muted-foreground">{r.candidateEmail}</p>
                  </div>
                  {r.inviteEmailSent && <Badge variant="success" className="text-xs">Email sent</Badge>}
                </div>
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                  <span className="flex-1 truncate text-xs text-muted-foreground">{r.link}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 rounded-md"
                    onClick={() => { navigator.clipboard.writeText(r.link!); toast.success('Copied!'); }}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {failed.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="mb-2 text-sm font-medium text-destructive">Failed ({failed.length})</p>
                {failed.map((r, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{r.candidateName} ({r.candidateEmail}) — {r.error}</p>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <Button onClick={() => navigate('/hr/interviews')} variant="outline" size="lg" className="h-11 flex-1 rounded-lg">
                View Interviews
              </Button>
              <Button onClick={() => { setBulkResults(null); setCvState({}); }} size="lg" className="h-11 flex-1 rounded-lg">
                Create Another
              </Button>
            </div>
          </CardContent>
        </PageBlock>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6 xl:p-8">
      <Button onClick={() => navigate(-1)} variant="ghost" className="w-fit rounded-lg pl-2 text-muted-foreground">
        <ArrowLeft data-icon="inline-start" /> Back
      </Button>
      <PageHeader
        variant="plain"
        title="Create Interview Session"
        description="Select a job and add one or more candidates to invite."
      />
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="flex flex-col gap-6">
        {/* ── Job & Question Set ── */}
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
                  <Select value={field.value || ''} onValueChange={v => field.onChange(v ?? '')}>
                    <SelectTrigger id="jobId">
                      <SelectValue placeholder="Select job">
                        {jobs?.find((j: any) => j.id === field.value)?.title}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {jobs?.length ? jobs.map((j: any) => (
                        <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                      )) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No active jobs</div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {qSets?.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="questionSetId">Question Set (optional)</Label>
                <Controller
                  control={control}
                  name="questionSetId"
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={v => field.onChange(v ?? '')}>
                      <SelectTrigger id="questionSetId">
                        <SelectValue placeholder="Use active question set">
                          {field.value ? qSets?.find((s: any) => s.id === field.value)?.name : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Use active question set</SelectItem>
                        {qSets?.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name} (v{s.version})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </CardContent>
        </PageBlock>

        {/* ── Candidates ── */}
        <PageBlock>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Candidates</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => append({ ...EMPTY_CANDIDATE })}
            >
              <Plus data-icon="inline-start" /> Add candidate
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {fields.map((field, idx) => {
              const cv = cvState[idx];
              const cvText = watch(`candidates.${idx}.cvText`);
              return (
                <div key={field.id} className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-muted-foreground">Candidate {idx + 1}</p>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-md text-muted-foreground hover:text-destructive"
                        onClick={() => { clearCv(idx); remove(idx); }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>Full Name *</Label>
                      <Input {...register(`candidates.${idx}.fullName`, { required: true })} className="h-11" placeholder="Jane Smith" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Email *</Label>
                      <Input type="email" {...register(`candidates.${idx}.email`, { required: true })} className="h-11" placeholder="jane@example.com" />
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <Label>Phone</Label>
                      <Input {...register(`candidates.${idx}.phone`)} className="h-11" placeholder="+84 ..." />
                    </div>
                  </div>

                  {/* CV upload */}
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label>CV (optional)</Label>
                      <div className="flex items-center gap-2">
                        <input
                          id={`cv-file-${idx}`}
                          type="file"
                          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                          className="hidden"
                          onChange={e => handleCvUpload(idx, e)}
                          disabled={cv?.parsing}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={cv?.parsing}
                          onClick={() => document.getElementById(`cv-file-${idx}`)?.click()}
                        >
                          {cv?.parsing ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Upload data-icon="inline-start" />}
                          {cv?.parsing ? 'Reading...' : cv?.fileName ? 'Replace' : 'Upload CV'}
                        </Button>
                      </div>
                    </div>

                    <input type="hidden" {...register(`candidates.${idx}.cvFileUrl`)} />
                    {(!cv?.fileName || cv?.isPdf) && <Textarea {...register(`candidates.${idx}.cvText`)} className="hidden" />}

                    {cv?.parsing ? (
                      <div className="flex h-24 items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> Reading CV...
                      </div>
                    ) : cv?.fileName ? (
                      <div className="flex flex-col rounded-lg border bg-muted/20">
                        <div className="flex items-center gap-2 border-b px-3 py-2">
                          <FileText className="size-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate text-sm font-medium">{cv.fileName}</span>
                          <Button type="button" variant="ghost" size="icon-sm" className="rounded-md text-muted-foreground" onClick={() => clearCv(idx)}>
                            <X />
                          </Button>
                        </div>
                        {cv.isPdf && cv.previewUrl ? (
                          <iframe src={cv.previewUrl} title="CV preview" className="h-64 w-full rounded-b-lg" />
                        ) : (
                          <p className="px-3 py-2 text-xs text-muted-foreground">
                            Extracted {cvText?.length ?? 0} characters.
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={cv?.parsing}
                        onClick={() => document.getElementById(`cv-file-${idx}`)?.click()}
                        className="flex h-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/20 text-xs text-muted-foreground transition-colors hover:bg-muted/40"
                      >
                        <Upload className="size-4" />
                        PDF, DOCX or TXT
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </PageBlock>

        <Button type="submit" disabled={mutation.isPending} size="lg" className="h-11 w-full rounded-lg shadow-sm shadow-primary/15">
          {mutation.isPending
            ? 'Creating...'
            : fields.length > 1
              ? `Create ${fields.length} Interviews & Send Invites`
              : 'Create Interview & Generate Link'}
        </Button>
      </form>
    </div>
  );
}
