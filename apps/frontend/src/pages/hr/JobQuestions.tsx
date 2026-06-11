import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Trash2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CATEGORY_LABELS: Record<string, string> = {
  screening: 'Screening', motivation: 'Motivation', experience: 'Experience',
  behavioral: 'Behavioral', technical: 'Technical', culture_fit: 'Culture Fit', salary: 'Salary', custom: 'Custom',
};

export default function JobQuestions() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: questionSets } = useQuery({ queryKey: ['question-sets', jobId], queryFn: () => api.get(`/jobs/${jobId}/question-sets`).then(r => r.data) });
  const activeSet = questionSets?.find((s: any) => s.status === 'active') || questionSets?.[0];

  const { data: questions } = useQuery({
    queryKey: ['questions', activeSet?.id],
    queryFn: () => api.get(`/question-sets/${activeSet?.id}`).then(r => r.data.questions),
    enabled: !!activeSet?.id,
  });

  const deleteQ = useMutation({
    mutationFn: (qId: string) => api.delete(`/question-sets/${activeSet?.id}/questions/${qId}`),
    onSuccess: () => { toast.success('Question deleted'); qc.invalidateQueries({ queryKey: ['questions', activeSet?.id] }); },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <Button onClick={() => navigate(-1)} variant="ghost" className="w-fit rounded-full pl-2 text-muted-foreground">
        <ArrowLeft className="size-4" /> Back
      </Button>
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Question Set</h1>
        <p className="text-muted-foreground">Review the active interview prompts and curate the generated stack.</p>
      </div>

      {questions?.length ? (
        <div className="space-y-3">
          {questions.map((q: any, idx: number) => (
            <Card key={q.id} className="border-0 bg-white/90 shadow-sm">
              <CardContent className="flex items-start gap-3 p-4">
                <GripVertical className="mt-1 size-4 flex-shrink-0 text-muted-foreground/40" />
                <div className="flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Q{idx + 1}</span>
                    <Badge variant="info">{CATEGORY_LABELS[q.category] || q.category}</Badge>
                    {q.isRequired && <Badge variant="destructive">Required</Badge>}
                  </div>
                  <p className="text-sm leading-6 text-foreground">{q.text}</p>
                  {q.expectedSignals?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {q.expectedSignals.map((s: string, i: number) => <Badge key={i} variant="secondary">{s}</Badge>)}
                    </div>
                  )}
                </div>
                <Button onClick={() => deleteQ.mutate(q.id)} variant="ghost" size="icon-sm" className="rounded-full text-muted-foreground hover:text-red-600">
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No questions yet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Go back to the job detail page and generate a question set first.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
