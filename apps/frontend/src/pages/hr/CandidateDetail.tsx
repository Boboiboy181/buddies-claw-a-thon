import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageBlock } from '@/components/page-block';

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showExtractedText, setShowExtractedText] = useState(false);
  const { data: candidate } = useQuery({ queryKey: ['candidate', id], queryFn: () => api.get(`/candidates/${id}`).then(r => r.data) });
  const { data: interviews } = useQuery({ queryKey: ['candidate-interviews', id], queryFn: () => api.get(`/interviews?candidateId=${id}`).then(r => r.data) });
  const cvUrl = candidate?.cvFileUrl;
  const cvText = candidate?.cvParsedText;
  const hasCv = Boolean(cvUrl || cvText);
  const cvIsPdf = Boolean(cvUrl && /\.pdf(?:$|[?#])/i.test(cvUrl));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 xl:p-8">
      <Button onClick={() => navigate(-1)} variant="ghost" className="w-fit rounded-lg pl-2 text-muted-foreground">
        <ArrowLeft data-icon="inline-start" /> Back
      </Button>
      <div className="flex items-center gap-4 rounded-lg border border-border/80 bg-card p-5 shadow-sm shadow-slate-950/5 md:p-6">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-2xl font-bold text-primary">
          {candidate?.fullName?.[0]}
        </div>
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{candidate?.fullName}</h1>
          <p className="text-muted-foreground">{candidate?.email} {candidate?.phone && `· ${candidate.phone}`}</p>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {hasCv && (
            <PageBlock>
              <CardHeader>
                <CardTitle>CV Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col overflow-hidden rounded-lg border bg-muted/20">
                  <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {cvUrl ? 'Candidate CV' : 'Extracted CV text'}
                    </span>
                    {cvText && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowExtractedText((s) => !s)}>
                        {showExtractedText ? 'Hide text' : 'View text'}
                      </Button>
                    )}
                    {cvUrl && (
                      <a href={cvUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                        <ExternalLink data-icon="inline-start" />
                        Open
                      </a>
                    )}
                  </div>

                  {cvUrl && cvIsPdf ? (
                    <iframe src={cvUrl} title="CV preview" className="h-[720px] w-full bg-background" />
                  ) : (
                    <p className="px-3 py-3 text-sm text-muted-foreground">
                      {cvUrl
                        ? 'Preview is available for PDF files. Open the original file or click "View text" to review the extracted content.'
                        : `Extracted ${cvText?.length ?? 0} characters. Click "View text" to review.`}
                    </p>
                  )}

                  {showExtractedText && cvText && (
                    <div className="border-t bg-background p-4">
                      <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-sans text-sm leading-7 text-foreground/85">
                        {cvText}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </PageBlock>
          )}
        </div>
        <div>
          <PageBlock>
            <CardHeader>
              <CardTitle>Interviews</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {interviews?.map((i: any) => (
                <Link key={i.id} to={`/hr/interviews/${i.id}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-muted">
                  <span>{i.job?.title}</span>
                  <Badge variant={candidateInterviewStatusVariant(i.status)}>{i.status}</Badge>
                </Link>
              )) || <p className="text-sm text-muted-foreground">No interviews</p>}
            </CardContent>
          </PageBlock>
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

  return map[status?.toLowerCase()] || 'secondary';
}
