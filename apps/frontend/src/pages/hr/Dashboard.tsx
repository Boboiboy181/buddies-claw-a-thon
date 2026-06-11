import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Briefcase, Users, CalendarDays, FileText, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <Card className="border-0 bg-white/85 shadow-sm">
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{value ?? 0}</p>
        </div>
        <div className={cn('flex size-12 items-center justify-center rounded-2xl', color)}>
          <Icon className="size-6" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/hr/dashboard/summary').then(r => r.data) });
  const s = data || {};

  return (
    <div className="space-y-8 p-8">
      <div className="rounded-[2rem] border bg-white/80 p-8 shadow-sm backdrop-blur">
        <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
          Recruiting Overview
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-base">
          Monitor active jobs, recent interviews, and candidate flow from a single hiring snapshot.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Jobs" value={s.totalJobs} icon={Briefcase} color="bg-sky-100 text-sky-700" />
        <StatCard label="Candidates" value={s.totalCandidates} icon={Users} color="bg-violet-100 text-violet-700" />
        <StatCard label="Interviews" value={s.totalInterviews} icon={CalendarDays} color="bg-emerald-100 text-emerald-700" />
        <StatCard label="In Progress" value={s.pendingInterviews} icon={Clock} color="bg-amber-100 text-amber-700" />
        <StatCard label="Completed" value={s.completedInterviews} icon={CheckCircle} color="bg-lime-100 text-lime-700" />
        <StatCard label="Reports Ready" value={s.readyReports} icon={FileText} color="bg-indigo-100 text-indigo-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-0 bg-white/85 shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent Interviews</CardTitle>
              <CardDescription>Latest candidate sessions across your active jobs.</CardDescription>
            </div>
            <Link to="/hr/interviews" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'rounded-full' })}>
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
          {s.recentInterviews?.length ? (
            s.recentInterviews.map((i: any) => (
              <Link
                key={i.id}
                to={`/hr/interviews/${i.id}`}
                className="flex items-center justify-between rounded-2xl border border-transparent bg-muted/35 p-4 transition hover:border-border hover:bg-background"
              >
                <div>
                  <p className="text-sm font-medium">{i.candidate?.fullName}</p>
                  <p className="text-muted-foreground text-xs">{i.job?.title}</p>
                </div>
                <Badge variant={statusVariant(i.status)}>{statusLabel(i.status)}</Badge>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-10 text-center">
              <p className="text-muted-foreground text-sm">No interviews yet</p>
            </div>
          )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/85 shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent Candidates</CardTitle>
              <CardDescription>Fresh profiles that recently entered the pipeline.</CardDescription>
            </div>
            <Link to="/hr/candidates" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'rounded-full' })}>
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.recentCandidates?.length ? (
              s.recentCandidates.map((c: any) => (
                <Link
                  key={c.id}
                  to={`/hr/candidates/${c.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-transparent bg-muted/35 p-4 transition hover:border-border hover:bg-background"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                    {c.fullName?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.fullName}</p>
                    <p className="text-muted-foreground text-xs">{c.email}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-10 text-center">
                <p className="text-muted-foreground text-sm">No candidates yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function statusVariant(status: string) {
  const map: Record<string, 'secondary' | 'info' | 'success' | 'warning' | 'destructive'> = {
    created: 'secondary',
    invited: 'info',
    in_progress: 'warning',
    completed: 'success',
    report_ready: 'success',
    failed: 'destructive',
  };
  return map[status] || 'secondary';
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}
