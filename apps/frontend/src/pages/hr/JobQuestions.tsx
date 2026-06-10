import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Trash2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';

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
    <div className="p-8 max-w-3xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Question Set</h1>

      {questions?.length ? (
        <div className="space-y-3">
          {questions.map((q: any, idx: number) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <GripVertical className="w-4 h-4 text-gray-300 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-400">Q{idx + 1}</span>
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{CATEGORY_LABELS[q.category] || q.category}</span>
                    {q.isRequired && <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full">Required</span>}
                  </div>
                  <p className="text-sm text-gray-900">{q.text}</p>
                  {q.expectedSignals?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {q.expectedSignals.map((s: string, i: number) => <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{s}</span>)}
                    </div>
                  )}
                </div>
                <button onClick={() => deleteQ.mutate(q.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="text-gray-400 text-center py-8">No questions yet. Go to job detail and generate a question set.</p>}
    </div>
  );
}
