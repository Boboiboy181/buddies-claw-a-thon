import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Plus, Briefcase } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function JobsList() {
  const { data, isLoading } = useQuery({ queryKey: ['jobs'], queryFn: () => api.get('/jobs').then(r => r.data) });

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 rounded-[2rem] border bg-white/80 p-8 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground mt-2">Manage job descriptions, hiring briefs, and reusable question sets.</p>
        </div>
        <Link to="/hr/jobs/new" className={buttonVariants({ size: 'lg', className: 'h-11 rounded-xl px-5' })}>
          <Plus className="size-4" /> New Job
        </Link>
      </div>

      {isLoading ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading jobs...</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data?.map((job: any) => (
            <Link key={job.id} to={`/hr/jobs/${job.id}`}>
              <Card className="border-0 bg-white/85 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <Briefcase className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{job.title}</h3>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {[job.department, job.level, job.location].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={jobStatusVariant(job.status)}>{job.status}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-4 text-sm">
                    Created {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {!data?.length && (
            <Card className="border-dashed bg-transparent shadow-none">
              <CardHeader className="items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                  <Briefcase className="size-6 text-muted-foreground" />
                </div>
                <CardTitle>No jobs yet</CardTitle>
                <CardDescription>Create your first job brief to start building interview flows.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function jobStatusVariant(status: string) {
  const map: Record<string, 'success' | 'warning' | 'secondary'> = {
    active: 'success',
    draft: 'warning',
    archived: 'secondary',
  };

  return map[status] || 'secondary';
}
