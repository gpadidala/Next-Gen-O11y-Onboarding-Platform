import { type FC } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CapacityGauge } from '@/components/shared/CapacityGauge';
import type { SignalCapacity } from '@/types/capacity';

interface CapacityBreakdownProps {
  signals: Record<string, SignalCapacity>;
}

const signalLabels: Record<string, string> = {
  metrics: 'Mimir (Metrics)',
  logs: 'Loki (Logs)',
  traces: 'Tempo (Traces)',
  profiles: 'Pyroscope (Profiles)',
};

export const CapacityBreakdown: FC<CapacityBreakdownProps> = ({ signals }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Object.entries(signals).map(([signal, data]) => (
        <Card key={signal}>
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                {signalLabels[signal] || signal}
              </h3>
              <Badge
                variant={
                  data.status === 'GREEN' ? 'success' : data.status === 'AMBER' ? 'warning' : 'error'
                }
              >
                {data.status}
              </Badge>
            </div>
            <CapacityGauge
              value={data.currentUtilization}
              status={data.status as 'GREEN' | 'AMBER' | 'RED'}
              label={`Current: ${data.currentUtilization.toFixed(1)}%`}
            />
            <div className="mt-3 space-y-1 text-xs text-gray-500">
              <p>Projected: {data.projectedUtilization.toFixed(1)}%</p>
              {data.message && <p>{data.message}</p>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
