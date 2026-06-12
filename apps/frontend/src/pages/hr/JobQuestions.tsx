import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '@/lib/api';
import { ArrowLeft, Check, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { PageBlock } from '@/components/page-block';
import { PageHeader } from '@/components/page-header';

const CATEGORY_LABELS: Record<string, string> = {
  screening: 'Screening', motivation: 'Motivation', experience: 'Experience',
  behavioral: 'Behavioral', technical: 'Technical', culture_fit: 'Culture Fit', salary: 'Salary', custom: 'Custom',
};

interface Question {
  id: string;
  order: number;
  text: string;
  category?: string;
  isRequired?: boolean;
  expectedSignals?: string[];
}

function SortableQuestion({
  question,
  index,
  onDelete,
  onSave,
}: {
  question: Question;
  index: number;
  onDelete: () => void;
  onSave: (text: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(question.text);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'z-10 opacity-80' : ''}
    >
      <PageBlock>
        <CardContent className="flex items-start gap-3 p-4">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-4" />
          </button>
          <div className="flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Q{index + 1}</span>
              {question.category && <Badge variant="info">{CATEGORY_LABELS[question.category] || question.category}</Badge>}
              {question.isRequired && <Badge variant="destructive">Required</Badge>}
            </div>
            {editing ? (
              <div className="flex flex-col gap-2">
                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!draft.trim()) return;
                      onSave(draft.trim());
                      setEditing(false);
                    }}
                  >
                    <Check data-icon="inline-start" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setDraft(question.text); setEditing(false); }}>
                    <X data-icon="inline-start" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm leading-6 text-foreground">{question.text}</p>
                {(question.expectedSignals?.length ?? 0) > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {question.expectedSignals!.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex gap-1">
            <Button onClick={() => setEditing(true)} variant="ghost" size="icon-sm" className="rounded-md text-muted-foreground">
              <Pencil />
            </Button>
            <Button onClick={onDelete} variant="ghost" size="icon-sm" className="rounded-md text-muted-foreground hover:text-red-600">
              <Trash2 />
            </Button>
          </div>
        </CardContent>
      </PageBlock>
    </div>
  );
}

export default function JobQuestions() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newText, setNewText] = useState('');
  const [adding, setAdding] = useState(false);

  const { data: questionSets } = useQuery({
    queryKey: ['question-sets', jobId],
    queryFn: () => api.get(`/jobs/${jobId}/question-sets`).then(r => r.data),
  });
  const activeSet =
    questionSets?.find((s: any) => String(s.status).toUpperCase() === 'ACTIVE') || questionSets?.[0];
  const setId = activeSet?.id;
  const isActive = String(activeSet?.status ?? '').toUpperCase() === 'ACTIVE';

  const { data: questions } = useQuery<Question[]>({
    queryKey: ['questions', setId],
    queryFn: () => api.get(`/question-sets/${setId}`).then(r => r.data.questions),
    enabled: !!setId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['questions', setId] });

  const deleteQ = useMutation({
    mutationFn: (qId: string) => api.delete(`/question-sets/${setId}/questions/${qId}`),
    onSuccess: () => { toast.success('Question deleted'); invalidate(); },
    onError: () => toast.error('Failed to delete question'),
  });

  const updateQ = useMutation({
    mutationFn: ({ qId, text }: { qId: string; text: string }) =>
      api.patch(`/question-sets/${setId}/questions/${qId}`, { text }),
    onSuccess: () => { toast.success('Question updated'); invalidate(); },
    onError: () => toast.error('Failed to update question'),
  });

  const addQ = useMutation({
    mutationFn: (text: string) =>
      api.post(`/question-sets/${setId}/questions`, {
        text,
        order: (questions?.length ?? 0) + 1,
        category: 'custom',
      }),
    onSuccess: () => {
      toast.success('Question added');
      setNewText('');
      setAdding(false);
      invalidate();
    },
    onError: () => toast.error('Failed to add question'),
  });

  const reorder = useMutation({
    mutationFn: (items: { id: string; order: number }[]) =>
      api.patch(`/question-sets/${setId}/reorder`, { questions: items }),
    onSuccess: invalidate,
    onError: () => { toast.error('Failed to reorder'); invalidate(); },
  });

  const activate = useMutation({
    mutationFn: () => api.post(`/question-sets/${setId}/activate`),
    onSuccess: () => {
      toast.success('Question set activated');
      qc.invalidateQueries({ queryKey: ['question-sets', jobId] });
    },
    onError: () => toast.error('Failed to activate'),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !questions) return;
    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    const next = arrayMove(questions, oldIndex, newIndex);
    qc.setQueryData(['questions', setId], next);
    reorder.mutate(next.map((q, i) => ({ id: q.id, order: i + 1 })));
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-6 xl:p-8">
      <Button onClick={() => navigate(-1)} variant="ghost" className="w-fit rounded-lg pl-2 text-muted-foreground">
        <ArrowLeft data-icon="inline-start" /> Back
      </Button>
      <PageHeader
        variant="plain"
        title="Question Set"
        description="Review the active interview prompts and curate the generated stack."
        actions={
          activeSet && (
            <div className="flex items-center gap-3">
              {isActive ? (
                <Badge variant="info">Active</Badge>
              ) : (
                <Button size="sm" onClick={() => activate.mutate()} disabled={activate.isPending}>
                  {activate.isPending ? 'Activating...' : 'Activate this set'}
                </Button>
              )}
            </div>
          )
        }
      />

      {questions?.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {questions.map((q, idx) => (
                <SortableQuestion
                  key={q.id}
                  question={q}
                  index={idx}
                  onDelete={() => deleteQ.mutate(q.id)}
                  onSave={(text) => updateQ.mutate({ qId: q.id, text })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <PageBlock variant="dashed">
          <CardHeader>
            <CardTitle>No questions yet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Go back to the job detail page and generate a question set first.
          </CardContent>
        </PageBlock>
      )}

      {setId && (
        adding ? (
          <PageBlock>
            <CardContent className="flex flex-col gap-3 p-4">
              <Textarea
                autoFocus
                placeholder="Type the new question..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!newText.trim() || addQ.isPending}
                  onClick={() => addQ.mutate(newText.trim())}
                >
                  <Check data-icon="inline-start" /> {addQ.isPending ? 'Adding...' : 'Add question'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewText(''); }}>
                  <X data-icon="inline-start" /> Cancel
                </Button>
              </div>
            </CardContent>
          </PageBlock>
        ) : (
          <Button variant="outline" className="h-10 w-full rounded-lg border-dashed" onClick={() => setAdding(true)}>
            <Plus data-icon="inline-start" /> Add question
          </Button>
        )
      )}
    </div>
  );
}
