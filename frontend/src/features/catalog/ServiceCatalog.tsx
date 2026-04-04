import { useState } from 'react';
import { Link } from 'react-router-dom';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type Signal = 'M' | 'L' | 'T' | 'P' | 'R';
type Status = 'GA' | 'Beta' | 'Coming Soon';
type CategoryKey = 'azure' | 'gcp' | 'shared' | 'grafana' | 'aiops';

interface ServiceCard {
  key: string;
  name: string;
  description: string;
  signals: Signal[];
  status: Status;
  icon: string;
}

interface CatalogSection {
  id: CategoryKey;
  label: string;
  color: string;
  headerBg: string;
  services: ServiceCard[];
}

/* -------------------------------------------------------------------------- */
/*  Static catalog data                                                        */
/* -------------------------------------------------------------------------- */

const CATALOG: CatalogSection[] = [
  {
    id: 'azure',
    label: 'Azure Cloud',
    color: '#0078D4',
    headerBg: 'bg-blue-50 border-blue-200',
    services: [
      {
        key: 'azure-monitor-exporter',
        name: 'Azure Monitor Exporter',
        description: 'Scrapes Azure resource metrics (CPU, memory, disk, network) into Mimir via OTEL collector.',
        signals: ['M'],
        status: 'GA',
        icon: '📊',
      },
      {
        key: 'azure-eventhub-streaming',
        name: 'Azure EventHub Streaming',
        description: 'Real-time log streaming from Azure EventHub into Loki via Logstash pipeline.',
        signals: ['L'],
        status: 'GA',
        icon: '📡',
      },
      {
        key: 'azure-application-insights',
        name: 'Azure Application Insights',
        description: 'Distributed traces from App Insights SDK exported to Tempo via OTLP.',
        signals: ['T'],
        status: 'GA',
        icon: '🔍',
      },
      {
        key: 'faro-web-sdk',
        name: 'Faro Web SDK (RUM)',
        description: 'Browser Real User Monitoring — LCP, CLS, FID, JS errors, sessions into Grafana Faro.',
        signals: ['R'],
        status: 'GA',
        icon: '🌐',
      },
      {
        key: 'azure-aks-telemetry',
        name: 'Azure AKS Cluster Telemetry',
        description: 'Full OTEL collector DaemonSet + Prometheus Operator on AKS.',
        signals: ['M', 'L', 'T'],
        status: 'GA',
        icon: '☸️',
      },
      {
        key: 'azure-blob-storage-logs',
        name: 'Azure Blob Storage Logs',
        description: 'Diagnostic logs from Azure Blob/ADLS streamed via EventHub to Loki.',
        signals: ['L'],
        status: 'Beta',
        icon: '🗄️',
      },
      {
        key: 'azure-service-bus-exporter',
        name: 'Azure Service Bus Exporter',
        description: 'Queue depth, dead-letter count, throughput from Service Bus.',
        signals: ['M'],
        status: 'Beta',
        icon: '📨',
      },
    ],
  },
  {
    id: 'gcp',
    label: 'GCP Cloud',
    color: '#34A853',
    headerBg: 'bg-green-50 border-green-200',
    services: [
      {
        key: 'gcp-pubsub-log-bridge',
        name: 'GCP Pub/Sub Log Bridge',
        description: 'Cloud Logging → Pub/Sub → Logstash → Loki pipeline.',
        signals: ['L'],
        status: 'GA',
        icon: '🔗',
      },
      {
        key: 'gcp-cloud-monitoring-exporter',
        name: 'GCP Cloud Monitoring Exporter',
        description: 'Stackdriver metrics (GCE, GCS, CloudSQL) exported to Mimir.',
        signals: ['M'],
        status: 'GA',
        icon: '📈',
      },
      {
        key: 'gke-cluster-telemetry',
        name: 'GKE Cluster Telemetry',
        description: 'Workload metrics, pod logs, distributed traces from GKE via OTEL.',
        signals: ['M', 'L', 'T'],
        status: 'GA',
        icon: '🌿',
      },
      {
        key: 'gcp-custom-metrics-pubsub',
        name: 'GCP Custom Metrics Pub/Sub',
        description: 'Custom business metrics from Cloud Run/Functions via Pub/Sub.',
        signals: ['M'],
        status: 'Beta',
        icon: '⚙️',
      },
      {
        key: 'gcp-cloud-trace',
        name: 'GCP Cloud Trace',
        description: 'Cloud Trace API → OTLP bridge → Tempo.',
        signals: ['T'],
        status: 'Beta',
        icon: '🔎',
      },
    ],
  },
  {
    id: 'shared',
    label: 'Shared Platform Services',
    color: '#7C3AED',
    headerBg: 'bg-purple-50 border-purple-200',
    services: [
      {
        key: 'apache-kafka-exporter',
        name: 'Apache Kafka Exporter',
        description: 'JMX metrics (throughput, lag, partition health, consumer offsets) into Mimir.',
        signals: ['M'],
        status: 'GA',
        icon: '📬',
      },
      {
        key: 'ibm-datastage-exporter',
        name: 'IBM Datastage Exporter',
        description: 'Pipeline job metrics, stage duration, error rates from Datastage.',
        signals: ['M'],
        status: 'GA',
        icon: '🏭',
      },
      {
        key: 'databricks-exporter',
        name: 'Databricks Exporter',
        description: 'Cluster utilisation, job run metrics, query performance from Databricks.',
        signals: ['M'],
        status: 'Beta',
        icon: '⚡',
      },
      {
        key: 'stonebranch-exporter',
        name: 'Stonebranch Exporter',
        description: 'Job scheduler metrics (execution time, SLA breach, failure rate) from Stonebranch UAC.',
        signals: ['M'],
        status: 'Beta',
        icon: '🕐',
      },
      {
        key: 'confluent-platform-exporter',
        name: 'Confluent Platform Exporter',
        description: 'Schema Registry + Connect metrics extending Kafka observability.',
        signals: ['M'],
        status: 'Coming Soon',
        icon: '🔄',
      },
      {
        key: 'apache-spark-exporter',
        name: 'Apache Spark Exporter',
        description: 'Spark job stage metrics, executor metrics, shuffle I/O.',
        signals: ['M'],
        status: 'Coming Soon',
        icon: '🔥',
      },
    ],
  },
  {
    id: 'grafana',
    label: 'Grafana Plugins & Datasources',
    color: '#FF6B35',
    headerBg: 'bg-orange-50 border-orange-200',
    services: [
      {
        key: 'mimir-datasource',
        name: 'Mimir Datasource',
        description: 'Native Prometheus-compatible datasource for Mimir remote_write.',
        signals: ['M'],
        status: 'GA',
        icon: '📉',
      },
      {
        key: 'loki-datasource',
        name: 'Loki Datasource',
        description: 'LogQL datasource with label explorer and live tail.',
        signals: ['L'],
        status: 'GA',
        icon: '📋',
      },
      {
        key: 'tempo-datasource',
        name: 'Tempo Datasource',
        description: 'Distributed trace explorer with service map and span drill-down.',
        signals: ['T'],
        status: 'GA',
        icon: '🔀',
      },
      {
        key: 'pyroscope-datasource',
        name: 'Pyroscope Datasource',
        description: 'Continuous profiling datasource with flame graphs.',
        signals: ['P'],
        status: 'GA',
        icon: '🔥',
      },
      {
        key: 'faro-datasource',
        name: 'Faro Datasource',
        description: 'Real User Monitoring datasource for web vitals and error tracking.',
        signals: ['R'],
        status: 'GA',
        icon: '🌐',
      },
      {
        key: 'azure-monitor-datasource',
        name: 'Azure Monitor Datasource',
        description: 'Native Grafana plugin for Azure Monitor metrics.',
        signals: ['M'],
        status: 'GA',
        icon: '☁️',
      },
      {
        key: 'infinity-datasource',
        name: 'Infinity Datasource',
        description: 'Query any JSON/CSV/XML/GraphQL API as a Grafana datasource.',
        signals: ['M'],
        status: 'Beta',
        icon: '∞',
      },
      {
        key: 'business-intelligence-plugin',
        name: 'Business Intelligence Plugin',
        description: 'Executive-level KPI dashboards and PDF reporting.',
        signals: ['M'],
        status: 'Beta',
        icon: '📊',
      },
    ],
  },
  {
    id: 'aiops',
    label: 'AIOps & Intelligence',
    color: '#4F46E5',
    headerBg: 'bg-indigo-50 border-indigo-200',
    services: [
      {
        key: 'aiops-anomaly-detection',
        name: 'AIOps Anomaly Detection',
        description: 'ML-driven anomaly detection on metrics using Prophet + isolation forest.',
        signals: ['M'],
        status: 'Beta',
        icon: '🤖',
      },
      {
        key: 'log-correlation-engine',
        name: 'Log Correlation Engine',
        description: 'Automatic correlation of logs to traces using trace_id injection.',
        signals: ['L', 'T'],
        status: 'Beta',
        icon: '🔗',
      },
      {
        key: 'slo-alerting-engine',
        name: 'SLO Alerting Engine',
        description: 'Automated SLO/SLA calculation and burn-rate alerting in Grafana.',
        signals: ['M'],
        status: 'GA',
        icon: '🎯',
      },
      {
        key: 'predictive-capacity',
        name: 'Predictive Capacity',
        description: 'ML forecasting for Mimir/Loki/Tempo capacity using historical growth.',
        signals: ['M'],
        status: 'Beta',
        icon: '📐',
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Signal badge config                                                        */
/* -------------------------------------------------------------------------- */

const SIGNAL_STYLES: Record<Signal, string> = {
  M: 'bg-blue-100 text-blue-700',
  L: 'bg-green-100 text-green-700',
  T: 'bg-purple-100 text-purple-700',
  P: 'bg-orange-100 text-orange-700',
  R: 'bg-pink-100 text-pink-700',
};

const SIGNAL_LABELS: Record<Signal, string> = {
  M: 'Metrics',
  L: 'Logs',
  T: 'Traces',
  P: 'Profiles',
  R: 'RUM',
};

const STATUS_STYLES: Record<Status, string> = {
  GA: 'bg-green-100 text-green-700',
  Beta: 'bg-yellow-100 text-yellow-700',
  'Coming Soon': 'bg-gray-100 text-gray-500',
};

/* -------------------------------------------------------------------------- */
/*  Category filter buttons                                                    */
/* -------------------------------------------------------------------------- */

type FilterKey = 'all' | CategoryKey;

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'azure', label: 'Azure' },
  { key: 'gcp', label: 'GCP' },
  { key: 'shared', label: 'Shared Platform' },
  { key: 'grafana', label: 'Grafana Plugins' },
  { key: 'aiops', label: 'AIOps' },
];

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function SignalBadge({ signal }: { signal: Signal }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SIGNAL_STYLES[signal]}`}
      title={SIGNAL_LABELS[signal]}
    >
      {signal}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function ServiceCardItem({ service }: { service: ServiceCard }) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      {/* Icon + Name row */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none" role="img" aria-hidden="true">
            {service.icon}
          </span>
          <h3 className="text-sm font-semibold text-gray-900">{service.name}</h3>
        </div>
        <StatusBadge status={service.status} />
      </div>

      {/* Description */}
      <p className="mb-4 flex-1 text-xs leading-relaxed text-gray-500">
        {service.description}
      </p>

      {/* Footer: signals + CTA */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {service.signals.map((s) => (
            <SignalBadge key={s} signal={s} />
          ))}
        </div>

        <Link
          to={`/onboarding/new?template=${service.key}`}
          className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          Start Onboarding →
        </Link>
      </div>
    </div>
  );
}

function SectionHeader({
  label,
  color,
  count,
}: {
  label: string;
  color: string;
  count: number;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div
        className="h-6 w-1 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <h2 className="text-lg font-bold text-gray-900">{label}</h2>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
        {count} integration{count !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function ServiceCatalog() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const normalizedSearch = search.toLowerCase().trim();

  const filteredSections = CATALOG.map((section) => {
    // Apply category filter
    if (activeFilter !== 'all' && section.id !== activeFilter) {
      return { ...section, services: [] };
    }

    // Apply search filter
    const matchingServices = normalizedSearch
      ? section.services.filter(
          (svc) =>
            svc.name.toLowerCase().includes(normalizedSearch) ||
            svc.description.toLowerCase().includes(normalizedSearch),
        )
      : section.services;

    return { ...section, services: matchingServices };
  }).filter((section) => section.services.length > 0);

  const totalVisible = filteredSections.reduce(
    (acc, s) => acc + s.services.length,
    0,
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ------------------------------------------------------------------ */}
      {/* Hero banner                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            Enterprise Observability Platform
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Observability Integration Catalog
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-300">
            15+ years of enterprise onboarding patterns — pick your integration
            and get started in minutes
          </p>

          {/* Stats row */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: '47', label: 'Integrations' },
              { value: '5', label: 'Signal Types' },
              { value: '15+', label: 'Years Experience' },
              { value: '100%', label: 'Self-Service' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-center"
              >
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="mt-0.5 text-xs text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Controls: search + category filter                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative max-w-md flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search integrations..."
                className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setActiveFilter(opt.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeFilter === opt.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Catalog sections                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {filteredSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl" role="img" aria-label="No results">
              🔍
            </span>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No integrations found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActiveFilter('all');
              }}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Results count (when filtering) */}
            {(search || activeFilter !== 'all') && (
              <p className="text-sm text-gray-500">
                Showing{' '}
                <span className="font-semibold text-gray-900">
                  {totalVisible}
                </span>{' '}
                integration{totalVisible !== 1 ? 's' : ''}
                {search && (
                  <>
                    {' '}
                    matching{' '}
                    <span className="font-semibold text-gray-900">
                      &ldquo;{search}&rdquo;
                    </span>
                  </>
                )}
              </p>
            )}

            {filteredSections.map((section) => (
              <div key={section.id}>
                {/* Section header with colored accent */}
                <div
                  className={`mb-5 rounded-xl border p-4 ${section.headerBg}`}
                >
                  <SectionHeader
                    label={section.label}
                    color={section.color}
                    count={section.services.length}
                  />

                  {/* Signal legend for this section */}
                  <div className="flex flex-wrap gap-2">
                    {(
                      Array.from(
                        new Set(section.services.flatMap((s) => s.signals)),
                      ) as Signal[]
                    ).map((sig) => (
                      <span
                        key={sig}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${SIGNAL_STYLES[sig]}`}
                      >
                        <span className="font-bold">{sig}</span>
                        <span className="opacity-80">= {SIGNAL_LABELS[sig]}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Service cards grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                  {section.services.map((svc) => (
                    <ServiceCardItem key={svc.key} service={svc} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Footer CTA                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-4 border-t border-gray-200 bg-white px-6 py-10">
        <div className="mx-auto max-w-6xl text-center">
          <h3 className="text-lg font-bold text-gray-900">
            Don&apos;t see your integration?
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Our platform engineering team can build custom integrations. Raise a
            request and we&apos;ll add it to the roadmap.
          </p>
          <Link
            to="/onboarding/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Request Custom Integration →
          </Link>
        </div>
      </div>
    </div>
  );
}
