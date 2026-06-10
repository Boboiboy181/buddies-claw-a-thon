import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4"><h2 className="font-semibold text-gray-900 mb-4">{title}</h2>{children}</div>;
}

export default function InterviewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: interview } = useQuery({ queryKey: ['interview', id], queryFn: () => api.get(`/interviews/${id}`).then(r => r.data) });
  const { data: report } = useQuery({ queryKey: ['report', id], queryFn: () => api.get(`/interviews/${id}/report`).then(r => r.data), enabled: interview?.status === 'report_ready' });

  const link = interview ? `${window.location.origin}/interview/${interview.accessToken}` : '';

  return (
    <div className="p-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>

      {interview && (
        <>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{interview.candidate?.fullName}</h1>
              <p className="text-gray-500">{interview.job?.title}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-600 truncate max-w-48">{link}</span>
                <button onClick={() => { navigator.clipboard.writeText(link); toast.success('Copied!'); }}><Copy className="w-4 h-4 text-gray-400 hover:text-primary-600" /></button>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                interview.status === 'report_ready' ? 'bg-purple-100 text-purple-700' :
                interview.status === 'completed' ? 'bg-green-100 text-green-700' :
                interview.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
              }`}>{interview.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              {report ? (
                <>
                  <Section title="Summary">
                    <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
                  </Section>

                  {report.recommendation && (
                    <Section title="Recommendation">
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-3 ${
                        report.recommendation.decision === 'strong_yes' ? 'bg-green-100 text-green-700' :
                        report.recommendation.decision === 'yes' ? 'bg-emerald-100 text-emerald-700' :
                        report.recommendation.decision === 'maybe' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>{report.recommendation.decision?.replace('_', ' ').toUpperCase()}</div>
                      <p className="text-sm text-gray-700">{report.recommendation.reason}</p>
                      {report.recommendation.followUpQuestions?.length > 0 && (
                        <div className="mt-3"><p className="text-xs font-semibold text-gray-500 mb-2">FOLLOW-UP QUESTIONS:</p>
                          <ul className="list-disc list-inside space-y-1">{report.recommendation.followUpQuestions.map((q: string, i: number) => <li key={i} className="text-sm text-gray-600">{q}</li>)}</ul>
                        </div>
                      )}
                    </Section>
                  )}

                  {report.qaAnalysisJson?.map((qa: any, idx: number) => (
                    <Section key={idx} title={`Q${idx+1}: ${qa.question}`}>
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg"><p className="text-xs font-semibold text-gray-500 mb-1">ANSWER</p><p className="text-sm text-gray-700">{qa.answerTranscript}</p></div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {qa.strengths?.length > 0 && <div><p className="text-xs font-semibold text-green-600 mb-1">STRENGTHS</p><ul className="list-disc list-inside space-y-1">{qa.strengths.map((s: string, i: number) => <li key={i} className="text-xs text-gray-700">{s}</li>)}</ul></div>}
                        {qa.concerns?.length > 0 && <div><p className="text-xs font-semibold text-red-500 mb-1">CONCERNS</p><ul className="list-disc list-inside space-y-1">{qa.concerns.map((c: string, i: number) => <li key={i} className="text-xs text-gray-700">{c}</li>)}</ul></div>}
                      </div>
                      {qa.score && <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Score:</span><span className="font-semibold text-lg">{qa.score}/10</span></div>}
                    </Section>
                  ))}
                </>
              ) : (
                <Section title="Interview Status">
                  <p className="text-gray-500">
                    {interview.status === 'completed' || interview.status === 'report_generating' ? 'Report is being generated...' : 'Interview not yet completed.'}
                  </p>
                </Section>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Details</h2>
                <dl className="space-y-3 text-sm">
                  <div><dt className="text-gray-500">State</dt><dd className="font-medium">{interview.state}</dd></div>
                  <div><dt className="text-gray-500">Questions</dt><dd className="font-medium">{interview.questionSetSnapshotJson?.length || 0}</dd></div>
                  {interview.startedAt && <div><dt className="text-gray-500">Started</dt><dd className="font-medium">{new Date(interview.startedAt).toLocaleString()}</dd></div>}
                  {interview.endedAt && <div><dt className="text-gray-500">Ended</dt><dd className="font-medium">{new Date(interview.endedAt).toLocaleString()}</dd></div>}
                </dl>
              </div>

              {report?.rubricScoresJson && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Rubric Scores</h2>
                  <div className="space-y-3">
                    {report.rubricScoresJson.map((r: any, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1"><span className="text-gray-700">{r.criterion}</span><span className="font-semibold">{r.score}/10</span></div>
                        <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-primary-500 rounded-full" style={{ width: `${(r.score / 10) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report?.audioReviewSignals && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-semibold text-gray-900 mb-3">Non-verbal & Audio Review Signals</h2>
                  <p className="text-xs text-gray-500 mb-3 italic">These are observational signals for HR reference only. They do not determine hiring decisions.</p>
                  <dl className="space-y-2 text-sm">
                    <div><dt className="text-gray-500">Speaking Pace</dt><dd className="font-medium capitalize">{report.audioReviewSignals.speakingPace}</dd></div>
                    <div><dt className="text-gray-500">Total Duration</dt><dd className="font-medium">{report.audioReviewSignals.speakingDurationSeconds}s</dd></div>
                  </dl>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
