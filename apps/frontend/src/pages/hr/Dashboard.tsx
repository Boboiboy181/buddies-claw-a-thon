import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Briefcase,
  Users,
  CalendarDays,
  FileText,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 xl:p-8">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  note,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  note: string;
}) {
  return (
    <Card className="overflow-hidden border-border/80 bg-card shadow-sm shadow-slate-950/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10">
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="font-heading text-3xl font-semibold tracking-tight">{value ?? 0}</p>
          <p className="text-muted-foreground text-xs">{note}</p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricChip({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/45 px-4 py-3">
      <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const percentage = Math.round((value / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-muted-foreground text-xs">
            {value} of {total}
          </p>
        </div>
        <span className="text-sm font-semibold">{percentage}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className={cn('h-2 rounded-full transition-all', tone)} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/hr/dashboard/summary').then(r => r.data) });
  if (isLoading) return <DashboardSkeleton />;
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
      note: 'Open roles and archived briefs in this workspace',
    },
    {
      label: 'Candidates',
      value: s.totalCandidates ?? 0,
      icon: Users,
      note: 'Profiles currently available for review',
    },
    {
      label: 'Interviews',
      value: totalInterviews,
      icon: CalendarDays,
      note: 'Scheduled, active, and completed sessions',
    },
    {
      label: 'Reports Ready',
      value: readyReports,
      icon: FileText,
      note: `${reportCoverage}% of completed interviews are ready to review`,
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
      tone: 'bg-primary',
    },
  ];

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 xl:p-8">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
        <Card className="border-border/80 bg-card shadow-sm shadow-slate-950/5">
          <CardHeader className="gap-3 pb-0">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                Workspace summary
              </Badge>
              <span className="text-muted-foreground text-sm">A cleaner read on hiring activity and reporting.</span>
            </div>
            <div className="max-w-3xl">
              <CardTitle className="font-heading text-3xl tracking-tight md:text-[2rem]">
                Focus on the queue, recent interviews, and what is ready for review.
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl text-base leading-7">
                The dashboard keeps the live workflow visible without surfacing every detail at once.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricChip label="Jobs" value={s.totalJobs ?? 0} />
              <MetricChip label="Candidates" value={s.totalCandidates ?? 0} />
              <MetricChip label="Interviews" value={totalInterviews} />
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/hr/interviews/new" className={buttonVariants({ size: 'lg', className: 'h-10 rounded-lg px-4 shadow-sm shadow-primary/15' })}>
                Launch interview
                <ArrowUpRight data-icon="inline-end" />
              </Link>
              <Link to="/hr/jobs" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-10 rounded-lg bg-card px-4' })}>
                Open jobs
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm shadow-slate-950/5">
          <CardHeader>
            <CardTitle>Pipeline status</CardTitle>
            <CardDescription>The three signals that matter most during the day.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {pipeline.map((item) => (
              <ProgressRow key={item.label} {...item} />
            ))}

            <div className="grid gap-3 pt-1 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-lg border border-border/80 bg-muted/45 px-4 py-3">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Completion rate</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{completionRate}%</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/45 px-4 py-3">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Active queue</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{pendingInterviews}</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/45 px-4 py-3">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Completed</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{completedInterviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="border-border/80 bg-card shadow-sm shadow-slate-950/5">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Recent Interviews</CardTitle>
              <CardDescription>Latest sessions across active roles and candidates.</CardDescription>
            </div>
            <Link to="/hr/interviews" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'rounded-lg' })}>
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.recentInterviews?.length ? (
              s.recentInterviews.map((i: any) => (
                <Link
                  key={i.id}
                  to={`/hr/interviews/${i.id}`}
                  className="flex items-center justify-between rounded-lg border border-transparent bg-muted/35 p-4 transition hover:border-border hover:bg-background"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{i.candidate?.fullName}</p>
                    <p className="text-muted-foreground text-xs">{i.job?.title}</p>
                  </div>
                  <Badge variant={statusVariant(i.status)}>{statusLabel(i.status)}</Badge>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-10 text-center">
                <p className="text-muted-foreground text-sm">No interviews yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border-border/80 bg-card shadow-sm shadow-slate-950/5">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="space-y-1.5">
                <CardTitle>Recent Candidates</CardTitle>
                <CardDescription>New profiles that may need review or interview scheduling.</CardDescription>
              </div>
              <Link to="/hr/candidates" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'rounded-lg' })}>
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {s.recentCandidates?.length ? (
                s.recentCandidates.map((c: any) => (
                  <Link
                    key={c.id}
                    to={`/hr/candidates/${c.id}`}
                    className="flex items-center gap-3 rounded-lg border border-transparent bg-muted/35 p-4 transition hover:border-border hover:bg-background"
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
                <div className="rounded-lg border border-dashed px-4 py-10 text-center">
                  <p className="text-muted-foreground text-sm">No candidates yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card shadow-sm shadow-slate-950/5">
            <CardHeader>
              <CardTitle>Queue focus</CardTitle>
              <CardDescription>A quick handoff summary for what still needs attention.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <MetricChip label="In progress" value={pendingInterviews} />
              <MetricChip label="Completed" value={completedInterviews} />
              <MetricChip label="Report coverage" value={`${reportCoverage}%`} />
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
  return map[status?.toLowerCase()] || 'secondary';
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}
