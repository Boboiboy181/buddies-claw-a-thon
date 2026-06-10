import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    created: 'bg-gray-100 text-gray-600', invited: 'bg-blue-50 text-blue-600',
    in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-green-100 text-green-700',
    report_ready: 'bg-purple-100 text-purple-700', failed: 'bg-red-100 text-red-600',
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
}

export default function InterviewsList() {
  const { data, isLoading } = useQuery({ queryKey: ['interviews'], queryFn: () => api.get('/interviews').then(r => r.data) });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-2xl font-bold text-gray-900">Interviews</h1><p className="text-gray-500 mt-1">Manage interview sessions</p></div>
        <Link to="/hr/interviews/new" className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> New Interview
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Candidate', 'Job', 'Status', 'Recording', 'Report', 'Created', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading...</td></tr>
            ) : data?.map((i: any) => (
              <tr key={i.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{i.candidate?.fullName}</td>
                <td className="px-4 py-3 text-gray-600">{i.job?.title}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(i.status)}`}>{i.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{i.recordingUrl ? '✓' : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{i.status === 'report_ready' ? '✓' : '—'}</td>
                <td className="px-4 py-3 text-gray-400">{formatDistanceToNow(new Date(i.createdAt), { addSuffix: true })}</td>
                <td className="px-4 py-3"><Link to={`/hr/interviews/${i.id}`} className="text-primary-600 hover:underline text-xs">View</Link></td>
              </tr>
            ))}
            {!isLoading && !data?.length && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">No interviews yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
