import { type FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { listOnboardings } from '@/api/onboarding';
import type { OnboardingResponse } from '@/types/onboarding';

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  draft: 'neutral',
  in_progress: 'info',
  capacity_check: 'info',
  similarity_search: 'info',
  governance_review: 'warning',
  artifacts_generated: 'info',
  submitted: 'info',
  approved: 'success',
  provisioning: 'info',
  completed: 'success',
  rejected: 'error',
  cancelled: 'error',
};

interface OnboardingListProps {
  statusFilter?: string;
}

export const OnboardingList: FC<OnboardingListProps> = ({ statusFilter }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<OnboardingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await listOnboardings({ status: statusFilter, limit: 20, skip: 0 });
        setItems(res.items);
        setTotal(res.pagination.total);
      } catch {
        /* empty */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [statusFilter]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
        No onboarding requests found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">App Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">App Code</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Tech Stack</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Platform</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Created</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {items.map((item) => (
            <tr
              key={item.id}
              className="cursor-pointer transition-colors hover:bg-gray-50"
              onClick={() => navigate(`/onboarding/${item.id}`)}
            >
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                {item.app_name}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 font-mono">
                {item.app_code}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge variant={statusVariant[item.status] || 'neutral'}>
                  {item.status}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {item.tech_stack}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {item.hosting_platform}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {new Date(item.created_at).toLocaleDateString()}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button
                  className="mr-2 inline-flex items-center rounded p-1 text-gray-400 hover:text-blue-600"
                  aria-label="View"
                  onClick={(e) => { e.stopPropagation(); navigate(`/onboarding/${item.id}`); }}
                >
                  <Eye className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500">
        Showing {items.length} of {total} onboardings
      </div>
    </div>
  );
};
