import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type InterviewState = 'loading' | 'waiting' | 'active' | 'completed' | 'error';

export default function CandidateInterview() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<InterviewState>('loading');
  const [interview, setInterview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get(`/interviews/access/${token}`)
      .then(res => {
        setInterview(res.data);
        if (res.data.status === 'completed' || res.data.status === 'report_ready') {
          setState('completed');
        } else {
          setState('waiting');
        }
      })
      .catch(() => {
        setError('Interview link is invalid or has expired.');
        setState('error');
      });
  }, [token]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✗</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link Not Found</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (state === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Interview Completed</h2>
          <p className="text-gray-500">Thank you for completing your interview. The HR team will review your responses and be in touch.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">AI Interview</h1>
          {interview?.job?.title && <p className="text-gray-400">Position: {interview.job.title}</p>}
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎤</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">Ready to Start?</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            This is an AI-powered voice interview. Please ensure you are in a quiet environment with a working microphone. The interview will take approximately 20–30 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setState('active')}
              className="px-8 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
            >
              Start Interview
            </button>
          </div>
        </div>

        {state === 'active' && (
          <div className="mt-6 bg-gray-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-2xl">🔴</span>
            </div>
            <p className="text-white font-semibold mb-2">Interview In Progress</p>
            <p className="text-gray-400 text-sm">The AI interviewer is now connected. Please speak clearly and naturally.</p>
            <p className="text-gray-500 text-xs mt-4">Video/audio integration via Daily.co will be initialized here once the backend Daily room URL is provided.</p>
          </div>
        )}
      </div>
    </div>
  );
}
