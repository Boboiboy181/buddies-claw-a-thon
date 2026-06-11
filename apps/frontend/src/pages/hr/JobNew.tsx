import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
  const { register, handleSubmit } = useForm<JobFormData>();

  const mutation = useMutation({
    mutationFn: (data: JobFormData) => api.post('/jobs', data).then(r => r.data),
    onSuccess: (job) => {
      toast.success('Job created successfully');
      navigate(`/hr/jobs/${job.id}`);
    },
    onError: () => toast.error('Failed to create job'),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <Button onClick={() => navigate(-1)} variant="ghost" className="w-fit rounded-full pl-2 text-muted-foreground">
        <ArrowLeft className="size-4" /> Back
      </Button>

      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Create New Job</h1>
        <p className="text-muted-foreground">
          Capture the hiring brief, then generate structured questions for the AI interview flow.
        </p>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <Card className="border-0 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                {...register('title', { required: true })}
                placeholder="e.g. Senior Frontend Engineer"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" {...register('department')} placeholder="Engineering" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Select id="level" {...register('level')}>
                <option value="">Select level</option>
                <option>Junior</option>
                <option>Middle</option>
                <option>Senior</option>
                <option>Lead</option>
                <option>Manager</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register('location')} placeholder="Ho Chi Minh City" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentType">Employment Type</Label>
              <Select id="employmentType" {...register('employmentType')}>
                <option value="">Select type</option>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Freelance</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle>Job Description *</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register('jdRawText', { required: true })}
              rows={14}
              className="font-mono text-sm"
              placeholder="Paste full job description here..."
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={mutation.isPending} size="lg" className="h-12 w-full rounded-xl">
          {mutation.isPending ? 'Creating...' : 'Create Job & Generate Questions'}
        </Button>
      </form>
    </div>
  );
}
