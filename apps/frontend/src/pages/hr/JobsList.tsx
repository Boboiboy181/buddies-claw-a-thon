import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Plus, Briefcase } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function JobsList() {
  const { data, isLoading } = useQuery({ queryKey: ['jobs'], queryFn: () => api.get('/jobs').then(r => r.data) });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 mt-1">Manage job descriptions and question sets</p>
        </div>
        <Link to="/hr/jobs/new" className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> New Job
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {data?.map((job: any) => (
            <Link key={job.id} to={`/hr/jobs/${job.id}`} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-primary-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {[job.department, job.level, job.location].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  job.status === 'active' ? 'bg-green-100 text-green-700' :
                  job.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {job.status}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-3">
                Created {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
              </p>
            </Link>
          ))}
          {!data?.length && (
            <div className="text-center py-12 text-gray-400">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No jobs yet. Create your first job.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
