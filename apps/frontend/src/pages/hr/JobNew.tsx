import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

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
  const { register, handleSubmit, formState: { errors } } = useForm<JobFormData>();

  const mutation = useMutation({
    mutationFn: (data: JobFormData) => api.post('/jobs', data).then(r => r.data),
    onSuccess: (job) => {
      toast.success('Job created successfully');
      navigate(`/hr/jobs/${job.id}`);
    },
    onError: () => toast.error('Failed to create job'),
  });

  return (
    <div className="p-8 max-w-3xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Create New Job</h1>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Job Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
              <input {...register('title', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. Senior Frontend Engineer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input {...register('department')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Engineering" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select {...register('level')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Select level</option>
                <option>Junior</option><option>Middle</option><option>Senior</option><option>Lead</option><option>Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input {...register('location')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ho Chi Minh City" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
              <select {...register('employmentType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Select type</option>
                <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Freelance</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Job Description *</h2>
          <textarea
            {...register('jdRawText', { required: true })}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono"
            placeholder="Paste full job description here..."
          />
        </div>

        <button type="submit" disabled={mutation.isPending} className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
          {mutation.isPending ? 'Creating...' : 'Create Job & Generate Questions'}
        </button>
      </form>
    </div>
  );
}
