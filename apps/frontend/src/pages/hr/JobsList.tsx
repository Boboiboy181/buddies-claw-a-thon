import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Plus, Briefcase } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageBlock } from '@/components/page-block';
import { PageHeader } from '@/components/page-header';

export default function JobsList() {
  const { data, isLoading } = useQuery({ queryKey: ['jobs'], queryFn: () => api.get('/jobs').then(r => r.data) });

  return (
    <div className="space-y-8 p-8">
      <PageHeader
        title="Jobs"
        description="Manage job descriptions, hiring briefs, and reusable question sets."
        actions={
          <Link to="/hr/jobs/new" className={buttonVariants({ size: 'lg', className: 'h-11 rounded-lg px-5' })}>
            <Plus className="size-4" /> New Job
          </Link>
        }
      />

      {isLoading ? (
        <PageBlock variant="dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading jobs...</CardContent>
        </PageBlock>
      ) : (
        <div className="grid gap-4">
          {data?.map((job: any) => (
            <Link key={job.id} to={`/hr/jobs/${job.id}`}>
              <PageBlock className="bg-white/90 transition-all hover:-translate-y-0.5">
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
              </PageBlock>
            </Link>
          ))}
          {!data?.length && (
            <PageBlock variant="transparent">
              <CardHeader className="items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                  <Briefcase className="size-6 text-muted-foreground" />
                </div>
                <CardTitle>No jobs yet</CardTitle>
                <CardDescription>Create your first job brief to start building interview flows.</CardDescription>
              </CardHeader>
            </PageBlock>
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
