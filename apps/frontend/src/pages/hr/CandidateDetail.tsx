import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: candidate } = useQuery({ queryKey: ['candidate', id], queryFn: () => api.get(`/candidates/${id}`).then(r => r.data) });
  const { data: interviews } = useQuery({ queryKey: ['candidate-interviews', id], queryFn: () => api.get(`/interviews?candidateId=${id}`).then(r => r.data) });

  return (
    <div className="p-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700">{candidate?.fullName?.[0]}</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{candidate?.fullName}</h1>
          <p className="text-gray-500">{candidate?.email} {candidate?.phone && `· ${candidate.phone}`}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {candidate?.cvParsedText && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="font-semibold mb-4">CV Content</h2>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{candidate.cvParsedText}</pre>
            </div>
          )}
        </div>
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold mb-4">Interviews</h2>
            {interviews?.map((i: any) => (
              <Link key={i.id} to={`/hr/interviews/${i.id}`} className="block p-2 hover:bg-gray-50 rounded text-sm">{i.job?.title} <span className="text-gray-400">· {i.status}</span></Link>
            )) || <p className="text-sm text-gray-400">No interviews</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
