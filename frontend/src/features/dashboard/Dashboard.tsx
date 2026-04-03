/**
 * Dashboard - main landing page showing onboarding overview,
 * active requests, platform health, and demo data reference panel.
 */
import { useEffect, useState } from 'react';
import { FlaskConical, PlusCircle, RefreshCw } from 'lucide-react';
import { OnboardingList } from './OnboardingList';
import { listOnboardings } from '@/api/onboarding';

interface Stats {
  total: number;
  active: number;
  completed: number;
  pendingApproval: number;
}

export default function Dashboard() {
  const [showDemo, setShowDemo] = useState(false);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, completed: 0, pendingApproval: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const [all, completed, pending] = await Promise.all([
          listOnboardings({ limit: 1, skip: 0 }),
          listOnboardings({ limit: 1, skip: 0, status: 'completed' }),
          listOnboardings({ limit: 1, skip: 0, status: 'governance_review' }),
        ]);
        const inProgress = await listOnboardings({ limit: 1, skip: 0, status: 'in_progress' });
        setStats({
          total: all.pagination.total,
          active: inProgress.pagination.total,
          completed: completed.pagination.total,
          pendingApproval: pending.pagination.total,
        });
      } catch {
        /* ignore */
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [refreshKey]);

  const statCard = (label: string, value: number | string, color?: string) => (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color ?? 'text-slate-800'}`}>
        {loadingStats ? '—' : value}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Onboarding Dashboard</h1>
          <p className="page-subtitle">
            Manage observability onboarding requests for the LGTM stack
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Demo Data Toggle */}
          <button
            onClick={() => setShowDemo((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              showDemo
                ? 'border-violet-300 bg-violet-50 text-violet-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600'
            }`}
            title="Toggle demo data reference panel"
          >
            <FlaskConical className="h-4 w-4" />
            Demo Data
            <span
              className={`ml-1 inline-block h-4 w-7 rounded-full transition-colors ${
                showDemo ? 'bg-violet-500' : 'bg-gray-300'
              } relative`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
                  showDemo ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <a
            href="/onboarding/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" />
            New Onboarding
          </a>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCard('Total Onboardings', stats.total)}
        {statCard('Active (In Progress)', stats.active, 'text-blue-600')}
        {statCard('Completed', stats.completed, 'text-green-600')}
        {statCard('Pending Approval', stats.pendingApproval, 'text-amber-600')}
      </div>

      {/* Demo Data Reference Panel */}
      {showDemo && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-violet-600" />
            <h2 className="text-sm font-semibold text-violet-800">
              Demo Reference Data — 10 Real-World Onboarding Use Cases
            </h2>
          </div>
          <p className="mb-4 text-xs text-violet-600">
            These are pre-seeded reference onboardings covering every combination of tech stack,
            platform, and status. Use them as a guide when creating your first onboarding.
          </p>
          <div className="overflow-x-auto rounded-lg border border-violet-200 bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-violet-100">
                <tr>
                  {['Code', 'App Name', 'Stack', 'Platform', 'Status', 'Use Case'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-violet-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100">
                {DEMO_SCENARIOS.map((s) => (
                  <tr key={s.code} className="hover:bg-violet-50">
                    <td className="px-3 py-2 font-mono text-violet-700">{s.code}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{s.name}</td>
                    <td className="px-3 py-2 text-gray-500">{s.stack}</td>
                    <td className="px-3 py-2 text-gray-500">{s.platform}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${s.statusClass}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{s.useCase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main onboarding list */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-800">All Onboarding Requests</h2>
        <OnboardingList key={refreshKey} />
      </div>
    </div>
  );
}

const DEMO_SCENARIOS = [
  { code: 'APP-1001', name: 'payment-gateway-api', stack: 'Java Spring Boot', platform: 'AKS',
    status: 'completed', statusClass: 'bg-green-100 text-green-700',
    useCase: 'Full LGTM + JMX/OTEL, 10% trace sampling' },
  { code: 'APP-1002', name: 'identity-auth-service', stack: '.NET', platform: 'VM (on-prem)',
    status: 'in_progress', statusClass: 'bg-blue-100 text-blue-700',
    useCase: 'Windows log paths, AMBER Loki capacity (63.5%)' },
  { code: 'APP-1003', name: 'product-catalogue-api', stack: 'Node.js', platform: 'AKS',
    status: 'governance_review', statusClass: 'bg-amber-100 text-amber-700',
    useCase: 'GraphQL + RUM, 5% sampling, pending governance' },
  { code: 'APP-1004', name: 'recommendation-engine', stack: 'Python', platform: 'AKS',
    status: 'approved', statusClass: 'bg-teal-100 text-teal-700',
    useCase: 'ML custom metrics, Pyroscope profiling' },
  { code: 'APP-1005', name: 'api-gateway-core', stack: 'Go', platform: 'AKS',
    status: 'completed', statusClass: 'bg-green-100 text-green-700',
    useCase: '1% trace sampling, all envs ready' },
  { code: 'APP-1006', name: 'inventory-management-service', stack: 'Java Spring Boot', platform: 'AKS',
    status: 'completed', statusClass: 'bg-green-100 text-green-700',
    useCase: 'PostgreSQL DB plugin + postgres-exporter' },
  { code: 'APP-1007', name: 'invoice-pdf-generator', stack: '.NET', platform: 'Azure Functions',
    status: 'in_progress', statusClass: 'bg-blue-100 text-blue-700',
    useCase: 'Serverless cold start alerts, azure-monitor-exporter' },
  { code: 'APP-1008', name: 'customer-data-etl-pipeline', stack: 'Python', platform: 'GKE',
    status: 'draft', statusClass: 'bg-gray-100 text-gray-600',
    useCase: 'GCP Cloud Run, stackdriver-exporter, not yet submitted' },
  { code: 'APP-1009', name: 'customer-portal-bff', stack: 'Node.js', platform: 'AKS',
    status: 'completed', statusClass: 'bg-green-100 text-green-700',
    useCase: 'Full Faro + RUM, Core Web Vitals (LCP/CLS/FID)' },
  { code: 'APP-1010', name: 'partner-integration-api', stack: '.NET', platform: 'APIM',
    status: 'cancelled', statusClass: 'bg-red-100 text-red-600',
    useCase: 'RED capacity (Mimir 78.4%), 50-label cardinality violation' },
];
