import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import HRLayout from '@/layouts/HRLayout';
import Dashboard from '@/pages/hr/Dashboard';
import JobsList from '@/pages/hr/JobsList';
import JobNew from '@/pages/hr/JobNew';
import JobDetail from '@/pages/hr/JobDetail';
import JobQuestions from '@/pages/hr/JobQuestions';
import InterviewsList from '@/pages/hr/InterviewsList';
import InterviewDetail from '@/pages/hr/InterviewDetail';
import InterviewNew from '@/pages/hr/InterviewNew';
import CandidatesList from '@/pages/hr/CandidatesList';
import CandidateDetail from '@/pages/hr/CandidateDetail';
import CandidateInterview from '@/pages/candidate/CandidateInterview';
import Login from '@/pages/auth/Login';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/interview/:token" element={<CandidateInterview />} />
      <Route
        path="/hr"
        element={<PrivateRoute><HRLayout /></PrivateRoute>}
      >
        <Route index element={<Navigate to="/hr/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="jobs" element={<JobsList />} />
        <Route path="jobs/new" element={<JobNew />} />
        <Route path="jobs/:jobId" element={<JobDetail />} />
        <Route path="jobs/:jobId/questions" element={<JobQuestions />} />
        <Route path="interviews" element={<InterviewsList />} />
        <Route path="interviews/new" element={<InterviewNew />} />
        <Route path="interviews/:id" element={<InterviewDetail />} />
        <Route path="candidates" element={<CandidatesList />} />
        <Route path="candidates/:id" element={<CandidateDetail />} />
      </Route>
      <Route path="/" element={<Navigate to="/hr/dashboard" />} />
    </Routes>
  );
}
