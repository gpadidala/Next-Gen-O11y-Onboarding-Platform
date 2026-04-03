import { type FC, useState } from 'react';
import { Clock, User, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface AuditEntry {
  id: string;
  timestamp: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  changes: Record<string, unknown>;
}

export const AuditLog: FC = () => {
  const [entries] = useState<AuditEntry[]>([
    {
      id: '1',
      timestamp: new Date().toISOString(),
      entity_type: 'onboarding',
      entity_id: 'APP-4521',
      action: 'CREATED',
      actor: 'john.doe@company.com',
      changes: { status: 'DRAFT' },
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      entity_type: 'onboarding',
      entity_id: 'APP-3045',
      action: 'SUBMITTED',
      actor: 'jane.smith@company.com',
      changes: { status: ['DRAFT', 'IN_PROGRESS'] },
    },
  ]);

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <div className="flex items-start gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <FileText className="h-5 w-5 text-gray-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{entry.action}</span>
                <span className="text-sm text-gray-500">on {entry.entity_type}</span>
                <span className="font-mono text-sm text-blue-600">{entry.entity_id}</span>
              </div>
              <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {entry.actor}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
