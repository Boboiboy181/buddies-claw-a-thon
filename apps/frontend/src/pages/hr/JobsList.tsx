import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Archive, ArrowRight, BriefcaseBusiness, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageBlock } from '@/components/page-block';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/shared/EmptyState';

const STATUS_OPTIONS = ['ALL', 'DRAFT', 'ACTIVE', 'ARCHIVED'] as const;

export default function JobsList() {
  const qc = useQueryClient();
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

  const archiveJob = useMutation({
    mutationFn: (id: string) => api.delete(`/jobs/${id}`).then(r => r.data),
    onSuccess: () => {
      toast.success('Job archived');
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: () => toast.error('Failed to archive job'),
  });

  const deleteJob = useMutation({
    mutationFn: (id: string) => api.delete(`/jobs/${id}/force`).then(r => r.data),
    onSuccess: () => {
      toast.success('Job deleted');
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete job'),
  });

  const handleArchiveJob = (job: any) => {
    if (job.status?.toUpperCase() === 'ARCHIVED') return;
    const ok = window.confirm(`Archive "${job.title}"? It will no longer be available for new interviews.`);
    if (ok) archiveJob.mutate(job.id);
  };

  const handleDeleteJob = (job: any) => {
    const ok = window.confirm(`Permanently delete "${job.title}"? This cannot be undone.`);
    if (ok) deleteJob.mutate(job.id);
  };

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
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <PageBlock key={i}>
              <CardContent className="flex items-center gap-4 p-4 md:p-5">
                <Skeleton className="size-11 shrink-0 rounded-lg" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="size-9 rounded-md" />
              </CardContent>
            </PageBlock>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {data?.map((job: any) => (
            <PageBlock key={job.id} className="transition-all hover:border-primary/30 hover:shadow-md hover:shadow-slate-950/5">
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <Link to={`/hr/jobs/${job.id}`} className="group min-w-0 flex-1">
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
                  </Link>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        disabled={archiveJob.isPending || job.status?.toUpperCase() === 'ARCHIVED'}
                        onClick={() => handleArchiveJob(job)}
                      >
                        <Archive data-icon="inline-start" />
                        Archive
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="rounded-lg"
                        disabled={deleteJob.isPending}
                        onClick={() => handleDeleteJob(job)}
                      >
                        <Trash2 data-icon="inline-start" />
                        Delete
                      </Button>
                      <Link to={`/hr/jobs/${job.id}`} className="group inline-flex items-center gap-3">
                        <span className="text-xs font-medium text-muted-foreground">Open brief</span>
                        <div className="flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground transition group-hover:border-primary/30 group-hover:text-primary">
                          <ArrowRight />
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </PageBlock>
          ))}
          {!data?.length &&
            (debouncedKeyword || status !== 'ALL' ? (
              <EmptyState
                icon={BriefcaseBusiness}
                title="No jobs match your filters"
                description="Try a different keyword or status."
              />
            ) : (
              <EmptyState
                icon={BriefcaseBusiness}
                title="No jobs yet"
                description="Create your first job brief to start building interview flows."
                action={{ label: 'New job', to: '/hr/jobs/new', icon: Plus }}
              />
            ))}
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
