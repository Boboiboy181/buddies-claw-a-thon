import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, Link, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageBlock } from '@/components/page-block';
import { PageHeader } from '@/components/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor, isRichTextEmpty } from '@/components/ui/rich-text-editor';

interface JobFormData {
  title: string;
  department: string;
  level: string;
  location: string;
  employmentType: string;
  jdRawText: string;
}

export default function JobNew() {
  const navigate = useNavigate();
  const { register, handleSubmit, control, setValue } = useForm<JobFormData>();

  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [jdParsing, setJdParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFromUrl = async () => {
    if (!urlInput.trim()) return;
    setJdParsing(true);
    try {
      const { data } = await api.post('/jobs/parse-jd', { url: urlInput.trim() });
      setValue('jdRawText', data.jdRawText, { shouldDirty: true });
      setShowUrlInput(false);
      setUrlInput('');
      toast.success('JD imported from URL.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to import from URL.');
    } finally {
      setJdParsing(false);
    }
  };

  const parseFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setJdParsing(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/jobs/parse-jd', form);
      setValue('jdRawText', data.jdRawText, { shouldDirty: true });
      toast.success('JD extracted from file.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to read file.');
    } finally {
      setJdParsing(false);
    }
  };

  const mutation = useMutation({
    mutationFn: (data: JobFormData) => api.post('/jobs', data).then(r => r.data),
    onSuccess: (job) => {
      toast.success('Job created successfully');
      navigate(`/hr/jobs/${job.id}`);
    },
    onError: () => toast.error('Failed to create job'),
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-6 xl:p-8">
      <Button onClick={() => navigate(-1)} variant="ghost" className="w-fit rounded-lg pl-2 text-muted-foreground">
        <ArrowLeft data-icon="inline-start" /> Back
      </Button>

      <PageHeader
        variant="plain"
        title="Create New Job"
        description="Capture the hiring brief, then generate structured questions for the AI interview flow."
      />

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-6">
        <PageBlock>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                {...register('title', { required: true })}
                placeholder="e.g. Senior Frontend Engineer"
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" {...register('department')} placeholder="Engineering" className="h-11" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="level">Level</Label>
              <Controller
                control={control}
                name="level"
                render={({ field }) => (
                  <Select value={field.value || null} onValueChange={(value) => field.onChange(value ?? '')}>
                    <SelectTrigger id="level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not specified</SelectItem>
                      <SelectItem value="Junior">Junior</SelectItem>
                      <SelectItem value="Middle">Middle</SelectItem>
                      <SelectItem value="Senior">Senior</SelectItem>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register('location')} placeholder="Ho Chi Minh City" className="h-11" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="employmentType">Employment Type</Label>
              <Controller
                control={control}
                name="employmentType"
                render={({ field }) => (
                  <Select value={field.value || null} onValueChange={(value) => field.onChange(value ?? '')}>
                    <SelectTrigger id="employmentType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not specified</SelectItem>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Freelance">Freelance</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </PageBlock>

        <PageBlock>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Job Description *</CardTitle>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
                onChange={parseFromFile}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={jdParsing}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText data-icon="inline-start" />
                Upload JD
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={jdParsing}
                onClick={() => setShowUrlInput(v => !v)}
              >
                <Link data-icon="inline-start" />
                Import URL
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {showUrlInput && (
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/careers/senior-engineer"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), parseFromUrl())}
                  className="h-10"
                  disabled={jdParsing}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-10 shrink-0 rounded-lg px-4"
                  disabled={jdParsing || !urlInput.trim()}
                  onClick={parseFromUrl}
                >
                  {jdParsing ? <Loader2 className="size-4 animate-spin" /> : 'Import'}
                </Button>
              </div>
            )}
            {jdParsing && !showUrlInput && (
              <div className="flex h-16 items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Extracting job description…
              </div>
            )}
            <Controller
              control={control}
              name="jdRawText"
              rules={{ validate: (v) => !isRichTextEmpty(v) || 'Job description is required' }}
              render={({ field, fieldState }) => (
                <>
                  <RichTextEditor
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Paste or write the full job description here, or import via URL / file above."
                  />
                  {fieldState.error && (
                    <p className="mt-2 text-sm text-destructive">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </CardContent>
        </PageBlock>

        <Button type="submit" disabled={mutation.isPending} size="lg" className="h-11 w-full rounded-lg shadow-sm shadow-primary/15">
          {mutation.isPending ? 'Creating...' : 'Create Job & Generate Questions'}
        </Button>
      </form>
    </div>
  );
}
