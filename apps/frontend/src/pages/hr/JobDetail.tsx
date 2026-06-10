import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Plus, Wand2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: job, isLoading } = useQuery({ queryKey: ['job', jobId], queryFn: () => api.get(`/jobs/${jobId}`).then(r => r.data) });
  const { data: questionSets } = useQuery({ queryKey: ['question-sets', jobId], queryFn: () => api.get(`/jobs/${jobId}/question-sets`).then(r => r.data) });
  const { data: interviews } = useQuery({ queryKey: ['job-interviews', jobId], queryFn: () => api.get(`/interviews?jobId=${jobId}`).then(r => r.data) });

  const generateQuestions = async () => {
    setGenerating(true);
    try {
      await api.post(`/jobs/${jobId}/question-sets/generate`, {
        questionCount: 10, categories: ['screening', 'motivation', 'experience', 'behavioral', 'technical'],
        language: 'vi', difficulty: job?.level?.toLowerCase() || 'middle',
        includeSalaryQuestion: true, includeMotivationQuestion: true,
      });
      toast.success('Question set generated!');
      qc.invalidateQueries({ queryKey: ['question-sets', jobId] });
    } catch { toast.error('Failed to generate questions'); }
    setGenerating(false);
  };

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="p-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{job?.title}</h1>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${job?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{job?.status}</span>
          </div>
          <p className="text-gray-500">{[job?.department, job?.level, job?.location].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateQuestions} disabled={generating} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50">
            <Wand2 className="w-4 h-4" /> {generating ? 'Generating...' : 'Generate Questions'}
          </button>
          <Link to={`/hr/interviews/new?jobId=${jobId}`} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> New Interview
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Job Description</h2>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{job?.jdRawText}</pre>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Question Sets</h2>
              {questionSets?.length > 0 && <Link to={`/hr/jobs/${jobId}/questions`} className="text-sm text-primary-600 hover:underline flex items-center gap-1">Manage <ExternalLink className="w-3 h-3" /></Link>}
            </div>
            {questionSets?.length ? questionSets.map((qs: any) => (
              <div key={qs.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                <div><p className="text-sm font-medium">{qs.name}</p><p className="text-xs text-gray-500">v{qs.version} · {qs.status}</p></div>
                <span className={`text-xs px-2 py-1 rounded-full ${qs.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{qs.status}</span>
              </div>
            )) : <p className="text-sm text-gray-400">No question sets yet. Click "Generate Questions" to create one.</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Recent Interviews</h2>
            {interviews?.length ? interviews.slice(0,5).map((i: any) => (
              <Link key={i.id} to={`/hr/interviews/${i.id}`} className="block p-2 hover:bg-gray-50 rounded text-sm text-gray-700">{i.candidate?.fullName} <span className="text-gray-400">· {i.status}</span></Link>
            )) : <p className="text-sm text-gray-400">No interviews yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
