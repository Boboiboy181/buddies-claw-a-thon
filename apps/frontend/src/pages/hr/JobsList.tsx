import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, MapPin, Plus, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageBlock } from '@/components/page-block';
import { PageHeader } from '@/components/page-header';

const STATUS_OPTIONS = ['ALL', 'DRAFT', 'ACTIVE', 'ARCHIVED'] as const;

export default function JobsList() {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [status, setStatus] = useState<string>('ALL');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', { keyword: debouncedKeyword, status }],
    queryFn: () =>
      api
        .get('/jobs', {
          params: {
            ...(debouncedKeyword && { keyword: debouncedKeyword }),
            ...(status !== 'ALL' && { status }),
          },
        })
        .then(r => r.data),
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 xl:p-8">
      <PageHeader
        title="Jobs"
        description="Manage job descriptions, hiring briefs, and reusable question sets."
        actions={
          <Link to="/hr/jobs/new" className={buttonVariants({ size: 'lg', className: 'h-10 rounded-lg px-4 shadow-sm shadow-primary/15' })}>
            <Plus data-icon="inline-start" /> New job
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or keyword..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v ?? 'ALL')}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'ALL' ? 'All statuses' : s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <PageBlock variant="dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading jobs...</CardContent>
        </PageBlock>
      ) : (
        <div className="grid gap-3">
          {data?.map((job: any) => (
            <Link key={job.id} to={`/hr/jobs/${job.id}`} className="group">
              <PageBlock className="transition-all hover:border-primary/30 hover:shadow-md hover:shadow-slate-950/5">
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BriefcaseBusiness />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold">{job.title}</h3>
                          <Badge variant={jobStatusVariant(job.status)}>{job.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {[job.department, job.level].filter(Boolean).join(' · ') || 'No department assigned'}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {job.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin />
                              {job.location}
                            </span>
                          ) : null}
                          <span>Created {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <span className="text-xs font-medium text-muted-foreground">Open brief</span>
                      <div className="flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground transition group-hover:border-primary/30 group-hover:text-primary">
                        <ArrowRight />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </PageBlock>
            </Link>
          ))}
          {!data?.length && (
            <PageBlock variant="transparent">
              <CardHeader className="items-center gap-3 py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <BriefcaseBusiness />
                </div>
                <div className="flex flex-col gap-1">
                  <CardTitle>{debouncedKeyword || status !== 'ALL' ? 'No jobs match your filters' : 'No jobs yet'}</CardTitle>
                  <CardDescription>
                    {debouncedKeyword || status !== 'ALL'
                      ? 'Try a different keyword or status.'
                      : 'Create your first job brief to start building interview flows.'}
                  </CardDescription>
                </div>
                <Link to="/hr/jobs/new" className={buttonVariants({ className: 'mt-2 h-9 rounded-lg px-3' })}>
                  <Plus data-icon="inline-start" />
                  New job
                </Link>
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

  return map[status?.toLowerCase()] || 'secondary';
}
