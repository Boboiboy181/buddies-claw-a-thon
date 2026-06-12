import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, CalendarClock, Mail, Phone } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageBlock } from '@/components/page-block';
import { PageHeader } from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CandidatesList() {
  const { data, isLoading } = useQuery({ queryKey: ['candidates'], queryFn: () => api.get('/candidates').then(r => r.data) });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 xl:p-8">
      <PageHeader
        title="Candidates"
        description="Browse all profiles and jump into each candidate's interview history."
      />
      <PageBlock>
        <CardHeader className="flex flex-col gap-2 border-b border-border/80 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>Candidate directory</CardTitle>
            <p className="text-sm text-muted-foreground">Contact details and recently added profiles.</p>
          </div>
          <span className="text-sm text-muted-foreground">{data?.length ?? 0} profiles</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="lg:hidden">
            {isLoading ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">Loading...</p>
            ) : data?.length ? (
              <div className="divide-y divide-border/80">
                {data.map((c: any) => (
                  <Link key={c.id} to={`/hr/candidates/${c.id}`} className="group block p-4 transition hover:bg-muted/40">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                        {c.fullName?.[0]?.toUpperCase() ?? 'C'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="truncate font-medium">{c.fullName}</p>
                          <ArrowRight className="text-muted-foreground transition group-hover:text-primary" />
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <Mail />
                            <span className="truncate">{c.email}</span>
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Phone />
                            {c.phone || 'No phone'}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <CalendarClock />
                            Added {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">No candidates yet</p>
            )}
          </div>

          <div className="hidden lg:block">
            <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {['Name', 'Email', 'Phone', 'Created', ''].map((h) => <TableHead key={h}>{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>
              : data?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                        {c.fullName?.[0]?.toUpperCase() ?? 'C'}
                      </span>
                      {c.fullName}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</TableCell>
                  <TableCell><Link to={`/hr/candidates/${c.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'rounded-lg' })}>View</Link></TableCell>
                </TableRow>
              ))}
              {!isLoading && !data?.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No candidates yet</TableCell></TableRow>}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </PageBlock>
    </div>
  );
}
