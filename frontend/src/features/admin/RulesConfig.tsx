import { type FC, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { getGovernanceRules } from '@/api/governance';

interface GovernanceRule {
  rule_id: string;
  description: string;
  severity: string;
}

export const RulesConfig: FC = () => {
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getGovernanceRules();
        setRules(data);
      } catch {
        /* empty */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-10 rounded bg-gray-100" />)}</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Rule ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Severity</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {rules.map((rule) => (
            <tr key={rule.rule_id}>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900">{rule.rule_id}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{rule.description}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge variant={rule.severity === 'HARD' ? 'error' : 'warning'}>
                  {rule.severity}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge variant="success">Enabled</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
