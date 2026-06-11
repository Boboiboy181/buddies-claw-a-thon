import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageBlock } from '@/components/page-block';
import { PageHeader } from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CandidatesList() {
  const { data, isLoading } = useQuery({ queryKey: ['candidates'], queryFn: () => api.get('/candidates').then(r => r.data) });

  return (
    <div className="space-y-8 p-8">
      <PageHeader
        title="Candidates"
        description="Browse all profiles and jump into each candidate's interview history."
      />
      <PageBlock>
        <CardHeader>
          <CardTitle>Candidate Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
                  <TableCell className="font-medium">{c.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</TableCell>
                  <TableCell><Link to={`/hr/candidates/${c.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'rounded-full' })}>View</Link></TableCell>
                </TableRow>
              ))}
              {!isLoading && !data?.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No candidates yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </PageBlock>
    </div>
  );
}
