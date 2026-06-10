import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

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
    <div className="p-8 max-w-lg">
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">✓</span></div>
        <h2 className="text-xl font-bold mb-2">Interview Created!</h2>
        <p className="text-gray-500 mb-6">Share this link with the candidate:</p>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
          <span className="flex-1 text-sm text-gray-700 truncate">{createdLink}</span>
          <button onClick={() => { navigator.clipboard.writeText(createdLink); toast.success('Copied!'); }} className="text-primary-600"><Copy className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/hr/interviews')} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">View Interviews</button>
          <button onClick={() => setCreatedLink(null)} className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">Create Another</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Create Interview Session</h1>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold">Candidate Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label><input {...register('candidate.fullName', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" {...register('candidate.email', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input {...register('candidate.phone')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">CV Text (optional)</label><textarea rows={4} {...register('candidate.cvText')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="Paste CV content..." /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold">Job & Question Set</h2>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Job *</label>
            <select {...register('jobId', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select job</option>
              {jobs?.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          {qSets?.length > 0 && <div><label className="block text-sm font-medium text-gray-700 mb-1">Question Set (optional, uses active set by default)</label>
            <select {...register('questionSetId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Use active question set</option>
              {qSets?.map((s: any) => <option key={s.id} value={s.id}>{s.name} (v{s.version})</option>)}
            </select>
          </div>}
        </div>
        <button type="submit" disabled={mutation.isPending} className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50">
          {mutation.isPending ? 'Creating...' : 'Create Interview & Generate Link'}
        </button>
      </form>
    </div>
  );
}
