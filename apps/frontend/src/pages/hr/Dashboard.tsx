import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Briefcase, Users, CalendarDays, FileText, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? 0}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/hr/dashboard/summary').then(r => r.data) });
  const s = data || {};

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your interview pipeline</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Jobs" value={s.totalJobs} icon={Briefcase} color="bg-blue-50 text-blue-600" />
        <StatCard label="Candidates" value={s.totalCandidates} icon={Users} color="bg-purple-50 text-purple-600" />
        <StatCard label="Interviews" value={s.totalInterviews} icon={CalendarDays} color="bg-green-50 text-green-600" />
        <StatCard label="In Progress" value={s.pendingInterviews} icon={Clock} color="bg-yellow-50 text-yellow-600" />
        <StatCard label="Completed" value={s.completedInterviews} icon={CheckCircle} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Reports Ready" value={s.readyReports} icon={FileText} color="bg-indigo-50 text-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Interviews</h2>
            <Link to="/hr/interviews" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          {s.recentInterviews?.length ? (
            <div className="space-y-3">
              {s.recentInterviews.map((i: any) => (
                <Link key={i.id} to={`/hr/interviews/${i.id}`} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{i.candidate?.fullName}</p>
                    <p className="text-xs text-gray-500">{i.job?.title}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColor(i.status)}`}>{i.status}</span>
                </Link>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-4">No interviews yet</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Candidates</h2>
            <Link to="/hr/candidates" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          {s.recentCandidates?.length ? (
            <div className="space-y-3">
              {s.recentCandidates.map((c: any) => (
                <Link key={c.id} to={`/hr/candidates/${c.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                    {c.fullName?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.fullName}</p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-4">No candidates yet</p>}
        </div>
      </div>
    </div>
  );
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    created: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    report_ready: 'bg-purple-100 text-purple-700',
    failed: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
}
