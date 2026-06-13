import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, CheckCircle2, Circle, FileText, Plus, Radio } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageBlock } from '@/components/page-block';
import { PageHeader } from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function statusBadge(status: string) {
  const colors: Record<string, 'secondary' | 'info' | 'warning' | 'success' | 'destructive'> = {
    created: 'secondary',
    invited: 'info',
    in_progress: 'warning',
    completed: 'success',
    report_ready: 'success',
    failed: 'destructive',
  };
  return colors[status?.toLowerCase()] || 'secondary';
}

const STATUS_OPTIONS = [
  'ALL',
  'CREATED',
  'INVITED',
  'IN_PROGRESS',
  'COMPLETED',
  'REPORT_GENERATING',
  'REPORT_READY',
  'FAILED',
] as const;

export default function InterviewsList() {
  const [status, setStatus] = useState<string>('ALL');
  const { data, isLoading } = useQuery({
    queryKey: ['interviews', { status }],
    queryFn: () =>
      api
        .get('/interviews', { params: status !== 'ALL' ? { status } : {} })
        .then(r => r.data),
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 xl:p-8">
      <PageHeader
        title="Interviews"
        description="Create sessions, monitor progress, and jump into completed reports."
        actions={
          <Link to="/hr/interviews/new" className={buttonVariants({ size: 'lg', className: 'h-10 rounded-lg px-4 shadow-sm shadow-primary/15' })}>
            <Plus data-icon="inline-start" /> New interview
          </Link>
        }
      />

      <div className="flex">
        <Select value={status} onValueChange={(v) => setStatus(v ?? 'ALL')}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'ALL' ? 'All statuses' : s.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PageBlock>
        <CardHeader className="flex flex-col gap-2 border-b border-border/80 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>Interview sessions</CardTitle>
            <p className="text-sm text-muted-foreground">Track invitations, recordings, and report readiness.</p>
          </div>
          <Badge variant="secondary">{data?.length ?? 0} sessions</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="lg:hidden">
            {isLoading ? (
              <div className="divide-y divide-border/80">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-4">
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : data?.length ? (
              <div className="divide-y divide-border/80">
                {data.map((i: any) => (
                  <Link key={i.id} to={`/hr/interviews/${i.id}`} className="group block p-4 transition hover:bg-muted/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{i.candidate?.fullName}</p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{i.job?.title}</p>
                      </div>
                      <Badge variant={statusBadge(i.status)}>{formatStatus(i.status)}</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <StatusLine active={Boolean(i.recordingUrl)} icon={Radio} label="Recording" />
                      <StatusLine active={i.status?.toUpperCase() === 'REPORT_READY'} icon={FileText} label="Report" />
                      <span className="col-span-2 inline-flex items-center gap-2">
                        <CalendarClock />
                        {formatDistanceToNow(new Date(i.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs font-medium text-muted-foreground">
                      View details
                      <ArrowRight />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">No interviews yet</p>
            )}
          </div>

          <div className="hidden lg:block">
            <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {['Candidate', 'Job', 'Status', 'Recording', 'Report', 'Created', ''].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full max-w-28" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.map((i: any) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.candidate?.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{i.job?.title}</TableCell>
                <TableCell><Badge variant={statusBadge(i.status)}>{formatStatus(i.status)}</Badge></TableCell>
                <TableCell><StatusLine active={Boolean(i.recordingUrl)} icon={Radio} label={i.recordingUrl ? 'Ready' : 'Missing'} /></TableCell>
                <TableCell><StatusLine active={i.status?.toUpperCase() === 'REPORT_READY'} icon={FileText} label={i.status?.toUpperCase() === 'REPORT_READY' ? 'Ready' : 'Pending'} /></TableCell>
                <TableCell className="text-muted-foreground">{formatDistanceToNow(new Date(i.createdAt), { addSuffix: true })}</TableCell>
                <TableCell>
                  <Link to={`/hr/interviews/${i.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'rounded-lg' })}>
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && !data?.length && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No interviews yet</TableCell>
              </TableRow>
            )}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </PageBlock>
    </div>
  );
}

function StatusLine({ active, icon: Icon, label }: { active: boolean; icon: typeof Radio; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      {active ? <CheckCircle2 className="text-emerald-600" /> : <Circle />}
      <Icon />
      {label}
    </span>
  );
}

function formatStatus(status: string) {
  return status?.replace(/_/g, ' ') ?? 'unknown';
}
