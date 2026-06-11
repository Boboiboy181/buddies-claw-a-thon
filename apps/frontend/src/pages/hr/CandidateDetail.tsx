import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: candidate } = useQuery({ queryKey: ['candidate', id], queryFn: () => api.get(`/candidates/${id}`).then(r => r.data) });
  const { data: interviews } = useQuery({ queryKey: ['candidate-interviews', id], queryFn: () => api.get(`/interviews?candidateId=${id}`).then(r => r.data) });

  return (
    <div className="space-y-6 p-8">
      <Button onClick={() => navigate(-1)} variant="ghost" className="w-fit rounded-full pl-2 text-muted-foreground">
        <ArrowLeft className="size-4" /> Back
      </Button>
      <div className="flex items-center gap-4 rounded-[2rem] border bg-white/80 p-8 shadow-sm backdrop-blur">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/12 text-2xl font-bold text-primary">{candidate?.fullName?.[0]}</div>
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{candidate?.fullName}</h1>
          <p className="text-muted-foreground">{candidate?.email} {candidate?.phone && `· ${candidate.phone}`}</p>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {candidate?.cvParsedText && (
            <Card className="border-0 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle>CV Content</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-foreground/85">{candidate.cvParsedText}</pre>
              </CardContent>
            </Card>
          )}
        </div>
        <div>
          <Card className="border-0 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Interviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {interviews?.map((i: any) => (
                <Link key={i.id} to={`/hr/interviews/${i.id}`} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-muted">
                  <span>{i.job?.title}</span>
                  <Badge variant={candidateInterviewStatusVariant(i.status)}>{i.status}</Badge>
                </Link>
              )) || <p className="text-sm text-muted-foreground">No interviews</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function candidateInterviewStatusVariant(status: string) {
  const map: Record<string, 'secondary' | 'warning' | 'success'> = {
    created: 'secondary',
    invited: 'secondary',
    in_progress: 'warning',
    completed: 'success',
    report_ready: 'success',
  };

  return map[status] || 'secondary';
}
