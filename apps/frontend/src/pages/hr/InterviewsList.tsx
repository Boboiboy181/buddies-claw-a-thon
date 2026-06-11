import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  return colors[status] || 'secondary';
}

export default function InterviewsList() {
  const { data, isLoading } = useQuery({ queryKey: ['interviews'], queryFn: () => api.get('/interviews').then(r => r.data) });

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 rounded-[2rem] border bg-white/80 p-8 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Interviews</h1>
          <p className="text-muted-foreground mt-2">Create sessions, monitor progress, and jump into completed reports.</p>
        </div>
        <Link to="/hr/interviews/new" className={buttonVariants({ size: 'lg', className: 'h-11 rounded-xl px-5' })}>
          <Plus className="size-4" /> New Interview
        </Link>
      </div>

      <Card className="border-0 bg-white/90 shadow-sm">
        <CardHeader>
          <CardTitle>Interview Sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : data?.map((i: any) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.candidate?.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{i.job?.title}</TableCell>
                <TableCell><Badge variant={statusBadge(i.status)}>{i.status.replace(/_/g, ' ')}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{i.recordingUrl ? '✓' : '—'}</TableCell>
                <TableCell className="text-muted-foreground">{i.status === 'report_ready' ? '✓' : '—'}</TableCell>
                <TableCell className="text-muted-foreground">{formatDistanceToNow(new Date(i.createdAt), { addSuffix: true })}</TableCell>
                <TableCell>
                  <Link to={`/hr/interviews/${i.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'rounded-full' })}>
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
        </CardContent>
      </Card>
    </div>
  );
}
