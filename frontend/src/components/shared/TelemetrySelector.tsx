import { type FC } from 'react';
import {
  Activity,
  FileText,
  GitBranch,
  Cpu,
  Globe,
  MonitorSmartphone,
  LayoutDashboard,
  Database,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export type TelemetrySignal =
  | 'metrics'
  | 'logs'
  | 'traces'
  | 'profiles'
  | 'rum'
  | 'faro'
  | 'grafanaDashboards'
  | 'dbPlugins';

interface SignalOption {
  value: TelemetrySignal;
  label: string;
  description: string;
  icon: FC<{ className?: string }>;
}

const SIGNAL_OPTIONS: SignalOption[] = [
  { value: 'metrics', label: 'Metrics', description: 'Prometheus metrics via Mimir', icon: Activity },
  { value: 'logs', label: 'Logs', description: 'Log ingestion via Loki', icon: FileText },
  { value: 'traces', label: 'Traces', description: 'Distributed tracing via Tempo', icon: GitBranch },
  { value: 'profiles', label: 'Profiles', description: 'Continuous profiling via Pyroscope', icon: Cpu },
  { value: 'rum', label: 'RUM', description: 'Real User Monitoring', icon: Globe },
  { value: 'faro', label: 'Faro', description: 'Grafana Faro frontend observability', icon: MonitorSmartphone },
  { value: 'grafanaDashboards', label: 'Dashboards', description: 'Grafana dashboard provisioning', icon: LayoutDashboard },
  { value: 'dbPlugins', label: 'DB Plugins', description: 'Database monitoring plugins', icon: Database },
];

interface TelemetrySelectorProps {
  selected: TelemetrySignal[];
  onChange: (signals: TelemetrySignal[]) => void;
  error?: string;
}

export const TelemetrySelector: FC<TelemetrySelectorProps> = ({ selected, onChange, error }) => {
  const toggle = (signal: TelemetrySignal) => {
    if (selected.includes(signal)) {
      onChange(selected.filter((s) => s !== signal));
    } else {
      onChange([...selected, signal]);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SIGNAL_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.value);
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all',
                'hover:border-blue-400 hover:bg-blue-50',
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600',
              )}
              aria-pressed={isSelected}
            >
              <Icon className={cn('h-6 w-6', isSelected ? 'text-blue-600' : 'text-gray-400')} />
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-xs text-gray-500">{option.description}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-gray-500">
        {selected.length} signal{selected.length !== 1 ? 's' : ''} selected (minimum 1 required)
      </p>
    </div>
  );
};
