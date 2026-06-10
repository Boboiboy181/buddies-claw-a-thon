import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function CandidatesList() {
  const { data, isLoading } = useQuery({ queryKey: ['candidates'], queryFn: () => api.get('/candidates').then(r => r.data) });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Candidates</h1>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Name', 'Email', 'Phone', 'Created', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? <tr><td colSpan={5} className="py-8 text-center text-gray-400">Loading...</td></tr>
            : data?.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{c.fullName}</td>
                <td className="px-4 py-3 text-gray-600">{c.email}</td>
                <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-400">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</td>
                <td className="px-4 py-3"><Link to={`/hr/candidates/${c.id}`} className="text-primary-600 hover:underline text-xs">View</Link></td>
              </tr>
            ))}
            {!isLoading && !data?.length && <tr><td colSpan={5} className="py-8 text-center text-gray-400">No candidates yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
