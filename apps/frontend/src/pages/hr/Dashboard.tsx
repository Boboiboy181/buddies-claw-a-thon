import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Briefcase,
  Users,
  CalendarDays,
  FileText,
  Clock,
  CheckCircle,
  ArrowUpRight,
  Activity,
  Sparkles,
  CircleDashed,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  note,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  note: string;
}) {
  return (
    <Card className="overflow-hidden border-white/60 bg-white/88 shadow-sm backdrop-blur">
      <CardContent className="flex items-center justify-between p-6">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{value ?? 0}</p>
          <p className="text-muted-foreground text-xs">{note}</p>
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
  const totalInterviews = s.totalInterviews ?? 0;
  const pendingInterviews = s.pendingInterviews ?? 0;
  const completedInterviews = s.completedInterviews ?? 0;
  const readyReports = s.readyReports ?? 0;
  const completionRate = totalInterviews ? Math.round((completedInterviews / totalInterviews) * 100) : 0;
  const reportCoverage = completedInterviews ? Math.round((readyReports / completedInterviews) * 100) : 0;

  const stats = [
    {
      label: 'Total Jobs',
      value: s.totalJobs ?? 0,
      icon: Briefcase,
      color: 'bg-sky-100 text-sky-700',
      note: 'Roles currently tracked in the workspace',
    },
    {
      label: 'Candidates',
      value: s.totalCandidates ?? 0,
      icon: Users,
      color: 'bg-violet-100 text-violet-700',
      note: 'Profiles available for screening and review',
    },
    {
      label: 'Interviews',
      value: totalInterviews,
      icon: CalendarDays,
      color: 'bg-emerald-100 text-emerald-700',
      note: 'All scheduled and completed sessions',
    },
    {
      label: 'In Progress',
      value: pendingInterviews,
      icon: Clock,
      color: 'bg-amber-100 text-amber-700',
      note: 'Sessions still moving through the flow',
    },
    {
      label: 'Completed',
      value: completedInterviews,
      icon: CheckCircle,
      color: 'bg-lime-100 text-lime-700',
      note: `${completionRate}% of all interviews have wrapped`,
    },
    {
      label: 'Reports Ready',
      value: readyReports,
      icon: FileText,
      color: 'bg-indigo-100 text-indigo-700',
      note: `${reportCoverage}% of completed sessions have reports`,
    },
  ];

  const pipeline = [
    {
      label: 'Running interviews',
      value: pendingInterviews,
      total: Math.max(totalInterviews, 1),
      tone: 'bg-amber-500',
    },
    {
      label: 'Completed interviews',
      value: completedInterviews,
      total: Math.max(totalInterviews, 1),
      tone: 'bg-emerald-500',
    },
    {
      label: 'Reports generated',
      value: readyReports,
      total: Math.max(completedInterviews || totalInterviews, 1),
      tone: 'bg-indigo-500',
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6 xl:p-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(255,247,237,0.92)_54%,_rgba(239,246,255,0.92)_100%)] shadow-sm">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] lg:px-8 lg:py-8">
          <div>
            <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
              Recruiting Overview
            </Badge>
            <h1 className="font-heading max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
              Keep every interview lane visible from one focused command center.
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl text-base leading-7">
              This dashboard pulls live totals, session progress, and reporting readiness into one sidebar-driven workspace inspired by the `dashboard-01` app shell.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/hr/interviews/new" className={buttonVariants({ size: 'lg', className: 'h-11 rounded-xl px-5' })}>
                Launch interview
                <ArrowUpRight className="size-4" />
              </Link>
              <Link to="/hr/jobs" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11 rounded-xl px-5 bg-white/80' })}>
                Review open jobs
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.5rem] border bg-white/85 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                <Activity className="size-4" />
                Pipeline Pulse
              </div>
              <p className="text-3xl font-semibold tracking-tight">{completionRate}%</p>
              <p className="text-muted-foreground mt-1 text-sm">Interview completion across the full pipeline.</p>
            </div>
            <div className="rounded-[1.5rem] border bg-white/85 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
                <Sparkles className="size-4" />
                Reports Ready
              </div>
              <p className="text-3xl font-semibold tracking-tight">{readyReports}</p>
              <p className="text-muted-foreground mt-1 text-sm">AI evaluations prepared for handoff and review.</p>
            </div>
            <div className="rounded-[1.5rem] border bg-white/85 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                <CircleDashed className="size-4" />
                Active Queue
              </div>
              <p className="text-3xl font-semibold tracking-tight">{pendingInterviews}</p>
              <p className="text-muted-foreground mt-1 text-sm">Sessions currently recording, processing, or awaiting completion.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <Card className="border-white/60 bg-white/88 shadow-sm">
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

        <div className="grid gap-6">
          <Card className="border-white/60 bg-white/88 shadow-sm">
            <CardHeader>
              <CardTitle>Pipeline Snapshot</CardTitle>
              <CardDescription>A quick read on how interviews are moving through the system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {pipeline.map((item) => {
                const percentage = Math.round((item.value / item.total) * 100);

                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.value} of {item.total}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">{percentage}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className={cn('h-2 rounded-full transition-all', item.tone)} style={{ width: `${Math.min(percentage, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-white/60 bg-white/88 shadow-sm">
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
