import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, BarChart3, ScrollText, GitBranch, Flame, Monitor, Layers, Database, Network, Shield, Cpu, Zap, Globe, Activity, X } from 'lucide-react';

/* ============================================================================
   TYPES
   ============================================================================ */

type Signal = 'M' | 'L' | 'T' | 'P' | 'R' | 'E';
type Status = 'GA' | 'Beta' | 'Coming Soon';
type CategoryKey =
  | 'app'
  | 'infra-azure'
  | 'infra-gcp'
  | 'infra-k8s'
  | 'database'
  | 'network'
  | 'platform'
  | 'security'
  | 'cicd'
  | 'stack'
  | 'aiops';

interface ServiceCard {
  key: string;
  name: string;
  description: string;
  signals: Signal[];
  status: Status;
  icon: string;
  dashboardId?: string;        // Grafana dashboard ID for reference
  grafanaPlugin?: boolean;     // has a native Grafana plugin
}

interface CatalogSection {
  id: CategoryKey;
  label: string;
  shortLabel: string;
  accent: string;              // hex for border/heading
  iconComponent: React.ReactNode;
  services: ServiceCard[];
}

/* ============================================================================
   SIGNAL & STATUS METADATA
   ============================================================================ */

const SIGNAL_META: Record<Signal, { label: string; bg: string; text: string; title: string }> = {
  M: { label: 'Metrics',  bg: 'bg-blue-100',   text: 'text-blue-700',   title: 'Mimir / Prometheus' },
  L: { label: 'Logs',     bg: 'bg-green-100',  text: 'text-green-700',  title: 'Loki' },
  T: { label: 'Traces',   bg: 'bg-purple-100', text: 'text-purple-700', title: 'Tempo / OTLP' },
  P: { label: 'Profiles', bg: 'bg-orange-100', text: 'text-orange-700', title: 'Pyroscope' },
  R: { label: 'RUM',      bg: 'bg-pink-100',   text: 'text-pink-700',   title: 'Faro / RUM' },
  E: { label: 'Events',   bg: 'bg-yellow-100', text: 'text-yellow-700', title: 'Audit / Events' },
};

const STATUS_META: Record<Status, { bg: string; text: string }> = {
  'GA':           { bg: 'bg-green-100',  text: 'text-green-700' },
  'Beta':         { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'Coming Soon':  { bg: 'bg-gray-100',   text: 'text-gray-500' },
};

/* ============================================================================
   CATALOG DATA  —  87 integrations across 11 categories
   ============================================================================ */

const CATALOG: CatalogSection[] = [

  /* ── 1. APPLICATION OBSERVABILITY ─────────────────────────────────────── */
  {
    id: 'app',
    label: 'Application Observability',
    shortLabel: 'Application',
    accent: '#6366f1',
    iconComponent: <Activity className="h-5 w-5" />,
    services: [
      {
        key: 'app-java-spring',
        name: 'Java Spring Boot',
        description: 'Full LGTM coverage via OTEL Java agent + JMX Exporter + Actuator metrics. JVM heap, GC, thread pools, HTTP latency, DB pool.',
        signals: ['M', 'L', 'T', 'P'],
        status: 'GA', icon: '☕',
        dashboardId: '12900',
      },
      {
        key: 'app-java-quarkus',
        name: 'Java Quarkus / Micronaut',
        description: 'Native GraalVM + JVM OTEL instrumentation. Quarkus Micrometer bridge, startup time profiling, reactive pipeline traces.',
        signals: ['M', 'L', 'T'],
        status: 'GA', icon: '🚀',
      },
      {
        key: 'app-dotnet',
        name: '.NET / ASP.NET Core',
        description: 'OTEL .NET SDK, runtime counters (GC, ThreadPool, exceptions), IIS / Kestrel HTTP metrics, structured Serilog→Loki.',
        signals: ['M', 'L', 'T', 'P'],
        status: 'GA', icon: '🔷',
        dashboardId: '10915',
      },
      {
        key: 'app-nodejs',
        name: 'Node.js / NestJS',
        description: 'prom-client + OTEL Node SDK. Event loop lag, heap usage, V8 GC, HTTP throughput. Structured Winston/Pino→Loki.',
        signals: ['M', 'L', 'T', 'P'],
        status: 'GA', icon: '🟩',
        dashboardId: '11159',
      },
      {
        key: 'app-python',
        name: 'Python / FastAPI / Django',
        description: 'prometheus-fastapi-instrumentator + OTEL Python SDK. Request latency p50/p95/p99, error rates, Celery task queue metrics.',
        signals: ['M', 'L', 'T', 'P'],
        status: 'GA', icon: '🐍',
        dashboardId: '16110',
      },
      {
        key: 'app-go',
        name: 'Go / Gin / Echo',
        description: 'prometheus/client_golang + OTEL Go SDK. Goroutine count, GC pause duration, HTTP handler latency. Ultra-low overhead.',
        signals: ['M', 'L', 'T', 'P'],
        status: 'GA', icon: '🐹',
        dashboardId: '13240',
      },
      {
        key: 'app-rust',
        name: 'Rust / Axum / Actix',
        description: 'metrics-rs + OTEL Rust SDK. Memory-safe instrumentation, near-zero performance overhead, tokio async runtime metrics.',
        signals: ['M', 'L', 'T'],
        status: 'Beta', icon: '🦀',
      },
      {
        key: 'app-faro-rum',
        name: 'Grafana Faro — Browser RUM',
        description: 'Real User Monitoring: Core Web Vitals (LCP, CLS, FID, TTFB), JS errors, user sessions, navigation timing. Correlates to backend traces.',
        signals: ['R', 'L', 'T'],
        status: 'GA', icon: '🌐',
        grafanaPlugin: true,
        dashboardId: '18491',
      },
      {
        key: 'app-mobile',
        name: 'Mobile App Observability',
        description: 'Faro SDK for iOS & Android. Crash reporting, ANR detection, network request timing, session replay hooks.',
        signals: ['R', 'L'],
        status: 'Beta', icon: '📱',
      },
      {
        key: 'app-otel-collector',
        name: 'OTEL Collector Pipeline',
        description: 'Central OTEL Collector DaemonSet/Deployment for signal fan-out. Receiver → Processor → Exporter to Mimir + Loki + Tempo simultaneously.',
        signals: ['M', 'L', 'T'],
        status: 'GA', icon: '⚙️',
        dashboardId: '15983',
      },
      {
        key: 'app-graphql',
        name: 'GraphQL API Observability',
        description: 'Operation-level metrics (query, mutation, subscription), resolver latency breakdown, field-level error rate via OTEL.',
        signals: ['M', 'L', 'T'],
        status: 'Beta', icon: '◈',
      },
      {
        key: 'app-grpc',
        name: 'gRPC Service Observability',
        description: 'Unary + streaming RPC latency, error codes, channel pool health. Native OTEL gRPC interceptors for all languages.',
        signals: ['M', 'L', 'T'],
        status: 'GA', icon: '🔗',
      },
    ],
  },

  /* ── 2. INFRASTRUCTURE — AZURE ────────────────────────────────────────── */
  {
    id: 'infra-azure',
    label: 'Azure Infrastructure',
    shortLabel: 'Azure',
    accent: '#0078D4',
    iconComponent: <Layers className="h-5 w-5" />,
    services: [
      {
        key: 'azure-aks-telemetry',
        name: 'AKS Cluster Telemetry',
        description: 'Full OTEL Collector DaemonSet + Prometheus Operator on AKS. Node, pod, namespace metrics. Container logs via promtail. Distributed traces via OTLP.',
        signals: ['M', 'L', 'T'],
        status: 'GA', icon: '☸️',
        dashboardId: '15760',
      },
      {
        key: 'azure-monitor-exporter',
        name: 'Azure Monitor Exporter',
        description: 'VM, App Service, Storage Account, CosmosDB metrics via Azure Monitor OTEL exporter → Mimir. CPU, memory, disk, network throughput.',
        signals: ['M'],
        status: 'GA', icon: '📊',
        grafanaPlugin: true,
      },
      {
        key: 'azure-eventhub',
        name: 'Azure EventHub Log Streaming',
        description: 'Real-time log pipeline: Azure Diagnostic Logs → EventHub → Logstash/Vector → Loki. Supports all Azure service diagnostics, audit logs, activity logs.',
        signals: ['L', 'E'],
        status: 'GA', icon: '⚡',
      },
      {
        key: 'azure-app-insights',
        name: 'Azure Application Insights Bridge',
        description: 'Export App Insights traces via OTLP bridge to Tempo. Retain existing SDK investment while centralising traces in Grafana.',
        signals: ['T', 'M'],
        status: 'GA', icon: '🔍',
      },
      {
        key: 'azure-functions',
        name: 'Azure Functions (Serverless)',
        description: 'Cold start duration, execution time, concurrency, failure rate. azure-monitor-exporter + OTEL HTTP trigger instrumentation.',
        signals: ['M', 'L', 'T'],
        status: 'GA', icon: '⚡',
      },
      {
        key: 'azure-service-bus',
        name: 'Azure Service Bus',
        description: 'Queue depth, dead-letter count, message throughput, session metrics. Alert on DLQ backlog and processing lag.',
        signals: ['M'],
        status: 'Beta', icon: '📨',
      },
      {
        key: 'azure-blob-adls',
        name: 'Azure Blob / ADLS Gen2',
        description: 'Storage diagnostics: read/write latency, throttling errors, capacity usage streamed via EventHub to Loki.',
        signals: ['M', 'L'],
        status: 'Beta', icon: '🗄️',
      },
      {
        key: 'azure-apim',
        name: 'Azure API Management',
        description: 'API gateway metrics: request rate, backend latency, 4xx/5xx, subscription usage. Gateway logs to Loki via EventHub.',
        signals: ['M', 'L', 'T'],
        status: 'GA', icon: '🔀',
      },
      {
        key: 'azure-vm-linux',
        name: 'Azure Linux VM / VMSS',
        description: 'Node Exporter on Azure VMs. CPU, memory, disk I/O, network. Promtail for system logs. Works with VMSS scale-out events.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🖥️',
        dashboardId: '1860',
      },
      {
        key: 'azure-vm-windows',
        name: 'Azure Windows VM',
        description: 'windows_exporter for WMI metrics. IIS, .NET CLR, Windows Events via OTEL filelog receiver → Loki.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🪟',
        dashboardId: '14694',
      },
    ],
  },

  /* ── 3. INFRASTRUCTURE — GCP ──────────────────────────────────────────── */
  {
    id: 'infra-gcp',
    label: 'GCP Infrastructure',
    shortLabel: 'GCP',
    accent: '#34A853',
    iconComponent: <Globe className="h-5 w-5" />,
    services: [
      {
        key: 'gcp-gke-telemetry',
        name: 'GKE Cluster Telemetry',
        description: 'OTEL Collector DaemonSet on GKE. Workload metrics, pod logs → Loki, distributed traces → Tempo. kube-state-metrics + cadvisor.',
        signals: ['M', 'L', 'T'],
        status: 'GA', icon: '☸️',
      },
      {
        key: 'gcp-pubsub-logs',
        name: 'GCP Pub/Sub Log Bridge',
        description: 'Cloud Logging sink → Pub/Sub → Dataflow / Logstash → Loki pipeline. All GCP service logs, audit logs, VPC flow logs centralised.',
        signals: ['L', 'E'],
        status: 'GA', icon: '📡',
      },
      {
        key: 'gcp-cloud-monitoring',
        name: 'GCP Cloud Monitoring Exporter',
        description: 'stackdriver-exporter scrapes GCE, GCS, CloudSQL, Spanner, BigQuery metrics into Mimir. Supports custom GCP metrics.',
        signals: ['M'],
        status: 'GA', icon: '📈',
        grafanaPlugin: true,
      },
      {
        key: 'gcp-cloud-run',
        name: 'GCP Cloud Run / Functions',
        description: 'Serverless telemetry via Pub/Sub custom metrics. Cold start, instance count, request latency, container CPU/memory.',
        signals: ['M', 'L'],
        status: 'GA', icon: '☁️',
      },
      {
        key: 'gcp-cloud-trace',
        name: 'GCP Cloud Trace Bridge',
        description: 'Cloud Trace API → OTLP exporter → Tempo. Keep existing Cloud Trace SDK while unifying traces in Grafana.',
        signals: ['T'],
        status: 'Beta', icon: '🔎',
      },
      {
        key: 'gcp-pubsub-custom',
        name: 'GCP Custom Metrics via Pub/Sub',
        description: 'Business KPIs and custom application metrics published to Pub/Sub, consumed by OTEL Collector, written to Mimir.',
        signals: ['M', 'E'],
        status: 'Beta', icon: '📊',
      },
      {
        key: 'gcp-bigquery',
        name: 'GCP BigQuery Observability',
        description: 'Query execution time, slot usage, bytes processed, job failure rate via Cloud Monitoring exporter.',
        signals: ['M', 'L'],
        status: 'Beta', icon: '🔢',
      },
    ],
  },

  /* ── 4. KUBERNETES & CONTAINERS ───────────────────────────────────────── */
  {
    id: 'infra-k8s',
    label: 'Kubernetes & Containers',
    shortLabel: 'K8s',
    accent: '#326CE5',
    iconComponent: <Cpu className="h-5 w-5" />,
    services: [
      {
        key: 'k8s-cluster-full',
        name: 'Kubernetes Cluster (Full Stack)',
        description: 'kube-state-metrics + cadvisor + OTEL Collector. Namespace, node, pod, container metrics. Works on any K8s: AKS, GKE, EKS, on-prem.',
        signals: ['M', 'L', 'T'],
        status: 'GA', icon: '☸️',
        dashboardId: '315',
      },
      {
        key: 'k8s-node-exporter',
        name: 'Node Exporter (Linux Hosts)',
        description: 'Gold-standard Linux host metrics: CPU modes, memory pressure, disk I/O, network saturation, load average, filesystem.',
        signals: ['M'],
        status: 'GA', icon: '🖥️',
        dashboardId: '1860',
      },
      {
        key: 'k8s-gpu',
        name: 'GPU Workload (DCGM Exporter)',
        description: 'NVIDIA DCGM Exporter for GPU utilisation, memory, temperature, power draw, NVLINK bandwidth. ML/AI workloads on GPU nodes.',
        signals: ['M'],
        status: 'Beta', icon: '🖥️',
        dashboardId: '12239',
      },
      {
        key: 'k8s-hpa-keda',
        name: 'HPA / KEDA Autoscaler',
        description: 'Replica count, scale-up/down events, custom metric lag (KEDA), HPA current vs desired. Alerts on scaling storms.',
        signals: ['M', 'E'],
        status: 'GA', icon: '📐',
      },
      {
        key: 'k8s-service-mesh-istio',
        name: 'Istio / Linkerd Service Mesh',
        description: 'mTLS, request rate, error rate, latency by service pair. Envoy sidecar metrics → Mimir. Mesh topology traces → Tempo.',
        signals: ['M', 'T'],
        status: 'GA', icon: '🕸️',
        dashboardId: '7645',
      },
      {
        key: 'k8s-certmanager',
        name: 'cert-manager / TLS Expiry',
        description: 'Certificate expiry days remaining, renewal events, ACME challenge metrics. Alert on certs expiring within 30/7 days.',
        signals: ['M', 'E'],
        status: 'GA', icon: '🔐',
      },
      {
        key: 'k8s-argocd',
        name: 'ArgoCD GitOps',
        description: 'App sync status, health, reconcile duration, repository latency. Drift detection alerts and deployment event logs → Loki.',
        signals: ['M', 'L', 'E'],
        status: 'GA', icon: '🔄',
        dashboardId: '14584',
      },
      {
        key: 'docker-containers',
        name: 'Docker / Container Runtime',
        description: 'Container CPU, memory, network I/O, OOM kills via cAdvisor. Container logs → Loki via Docker logging driver.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🐳',
        dashboardId: '893',
      },
    ],
  },

  /* ── 5. DATABASE OBSERVABILITY ────────────────────────────────────────── */
  {
    id: 'database',
    label: 'Database Observability',
    shortLabel: 'Databases',
    accent: '#059669',
    iconComponent: <Database className="h-5 w-5" />,
    services: [
      {
        key: 'db-postgresql',
        name: 'PostgreSQL',
        description: 'postgres_exporter: connections, query duration p50/p95, buffer cache hit ratio, replication lag, vacuum, dead tuples, table bloat.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🐘',
        dashboardId: '9628',
      },
      {
        key: 'db-mysql',
        name: 'MySQL / MariaDB',
        description: 'mysqld_exporter: QPS, slow queries, InnoDB buffer pool, replication seconds-behind, connection pool, deadlocks.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🐬',
        dashboardId: '14031',
      },
      {
        key: 'db-sqlserver',
        name: 'Microsoft SQL Server',
        description: 'sql_exporter / OpenTelemetry MSSQL receiver: batch requests/sec, waits, blocking chains, AG replica lag, TempDB usage.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🗃️',
        dashboardId: '13919',
      },
      {
        key: 'db-oracle',
        name: 'Oracle Database',
        description: 'oracledb_exporter: tablespace, session wait events, ASH, AWR metrics, RAC interconnect. Slow query logs → Loki.',
        signals: ['M', 'L'],
        status: 'Beta', icon: '🔴',
      },
      {
        key: 'db-mongodb',
        name: 'MongoDB',
        description: 'mongodb_exporter: opcounters, wiredTiger cache, replication oplog, index usage, slow operations. Supports Atlas and self-hosted.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🍃',
        dashboardId: '2583',
      },
      {
        key: 'db-redis',
        name: 'Redis / Redis Cluster',
        description: 'redis_exporter: memory usage, keyspace hits/misses, evictions, replication offset, cluster slot distribution, command latency.',
        signals: ['M', 'L'],
        status: 'GA', icon: '⚡',
        dashboardId: '763',
      },
      {
        key: 'db-elasticsearch',
        name: 'Elasticsearch / OpenSearch',
        description: 'elasticsearch_exporter: cluster health, indexing rate, search latency, JVM heap, shard allocation, GC pause time.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🔍',
        dashboardId: '6483',
      },
      {
        key: 'db-cassandra',
        name: 'Apache Cassandra',
        description: 'JMX → prometheus_jmx_exporter: read/write latency, compaction, tombstones, hints, dropped messages, repair progress.',
        signals: ['M', 'L'],
        status: 'Beta', icon: '🔶',
        dashboardId: '5408',
      },
      {
        key: 'db-databricks',
        name: 'Databricks',
        description: 'Cluster utilisation, job run duration, task failures, notebook query performance via Databricks REST API exporter.',
        signals: ['M', 'L'],
        status: 'Beta', icon: '⚡',
      },
      {
        key: 'db-snowflake',
        name: 'Snowflake',
        description: 'Query execution time, credit consumption, warehouse utilisation, storage growth, failed logins via Snowflake information schema queries.',
        signals: ['M', 'L'],
        status: 'Beta', icon: '❄️',
      },
      {
        key: 'db-cosmosdb',
        name: 'Azure CosmosDB',
        description: 'RU/s consumption, throttle rate, latency per operation, partition key hot-spots via Azure Monitor exporter.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🌌',
      },
      {
        key: 'db-bigtable',
        name: 'GCP Bigtable / Spanner',
        description: 'Row mutations/sec, read latency, CPU utilisation, storage per table via GCP Cloud Monitoring exporter.',
        signals: ['M'],
        status: 'Beta', icon: '🔢',
      },
    ],
  },

  /* ── 6. NETWORK & API ─────────────────────────────────────────────────── */
  {
    id: 'network',
    label: 'Network & API Gateway',
    shortLabel: 'Network',
    accent: '#0EA5E9',
    iconComponent: <Network className="h-5 w-5" />,
    services: [
      {
        key: 'net-nginx',
        name: 'NGINX / NGINX Plus',
        description: 'nginx-prometheus-exporter: active connections, requests/sec, upstream response time, error codes. Access logs → Loki with LogQL parsing.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🟩',
        dashboardId: '12708',
      },
      {
        key: 'net-haproxy',
        name: 'HAProxy Load Balancer',
        description: 'haproxy_exporter: frontend/backend session rate, queue length, health check states, bytes in/out, error rates.',
        signals: ['M', 'L'],
        status: 'GA', icon: '⚖️',
        dashboardId: '12693',
      },
      {
        key: 'net-envoy',
        name: 'Envoy Proxy',
        description: 'Native Prometheus stats endpoint: downstream/upstream RQ/s, connection pool, retry rate, circuit breaker trips.',
        signals: ['M', 'T'],
        status: 'GA', icon: '🔀',
        dashboardId: '6693',
      },
      {
        key: 'net-kong',
        name: 'Kong API Gateway',
        description: 'kong-prometheus-plugin: per-route latency, bandwidth, request count, upstream health, rate limit hits, plugin execution time.',
        signals: ['M', 'L', 'T'],
        status: 'GA', icon: '🦍',
        dashboardId: '7424',
      },
      {
        key: 'net-traefik',
        name: 'Traefik / Traefik Mesh',
        description: 'Built-in Prometheus metrics: entrypoint RPS, backend latency, open connections, TLS handshake duration.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🚦',
        dashboardId: '17346',
      },
      {
        key: 'net-blackbox',
        name: 'Blackbox Exporter (Synthetic)',
        description: 'HTTP/S, TCP, ICMP, DNS synthetic probes. SSL expiry, TTFB, DNS resolution time. External and internal endpoint health checks.',
        signals: ['M'],
        status: 'GA', icon: '🎯',
        dashboardId: '7587',
      },
      {
        key: 'net-dns',
        name: 'DNS / CoreDNS',
        description: 'CoreDNS plugin metrics: query rate, cache hit ratio, DNSSEC failures, forward errors. External DNS resolution latency via blackbox.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🌐',
        dashboardId: '15762',
      },
      {
        key: 'net-ssl-tls',
        name: 'SSL / TLS Certificate Health',
        description: 'ssl_exporter: days-to-expiry per domain, chain validation, OCSP status, cipher suite audit. Alert 30/14/7 days before expiry.',
        signals: ['M', 'E'],
        status: 'GA', icon: '🔒',
      },
      {
        key: 'net-ping-latency',
        name: 'Network Latency & Ping',
        description: 'ICMP/ping exporter for site-to-site, DC-to-DC, and client-to-service latency monitoring. RTT p50/p95, packet loss alerts.',
        signals: ['M'],
        status: 'GA', icon: '📡',
        dashboardId: '11563',
      },
    ],
  },

  /* ── 7. SHARED PLATFORM SERVICES ──────────────────────────────────────── */
  {
    id: 'platform',
    label: 'Shared Platform Services',
    shortLabel: 'Platform',
    accent: '#7C3AED',
    iconComponent: <Layers className="h-5 w-5" />,
    services: [
      {
        key: 'plat-kafka',
        name: 'Apache Kafka',
        description: 'JMX → prometheus_jmx_exporter + Kafka Exporter: consumer lag per group, partition offset, ISR, under-replicated, broker throughput.',
        signals: ['M', 'L'],
        status: 'GA', icon: '📨',
        dashboardId: '7589',
      },
      {
        key: 'plat-confluent',
        name: 'Confluent Platform',
        description: 'Schema Registry validation errors, Kafka Connect worker restarts, connector status, KSQL processing metrics.',
        signals: ['M', 'L'],
        status: 'Beta', icon: '🌊',
      },
      {
        key: 'plat-rabbitmq',
        name: 'RabbitMQ',
        description: 'rabbitmq_exporter: queue depth, consumer count, message rates, DLQ backlog, channel/connection health, cluster partition alerts.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🐰',
        dashboardId: '10991',
      },
      {
        key: 'plat-datastage',
        name: 'IBM DataStage',
        description: 'Pipeline job metrics via DataStage REST API: stage execution duration, row rates, error counts, job completion SLA tracking.',
        signals: ['M', 'L'],
        status: 'Beta', icon: '🔄',
      },
      {
        key: 'plat-stonebranch',
        name: 'Stonebranch (UAC)',
        description: 'Job scheduler metrics via UAC REST API: execution time, SLA breach count, failure rate, queue depth, agent heartbeat.',
        signals: ['M', 'L', 'E'],
        status: 'Beta', icon: '🗓️',
      },
      {
        key: 'plat-airflow',
        name: 'Apache Airflow',
        description: 'StatsD → Prometheus: DAG run duration, task success/failure, scheduler heartbeat, pool slot utilisation, zombie tasks.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🌬️',
        dashboardId: '11891',
      },
      {
        key: 'plat-spark',
        name: 'Apache Spark',
        description: 'Spark metrics → Prometheus via PrometheusServlet sink. Job/stage/task duration, shuffle bytes, executor GC, streaming micro-batch lag.',
        signals: ['M', 'L'],
        status: 'Beta', icon: '⚡',
        dashboardId: '7890',
      },
      {
        key: 'plat-flink',
        name: 'Apache Flink',
        description: 'Flink metrics reporter → Prometheus: checkpoint size/duration, backpressure ratio, records in/out, latency per operator.',
        signals: ['M', 'L'],
        status: 'Beta', icon: '🐿️',
      },
      {
        key: 'plat-dbt',
        name: 'dbt / dbt Cloud',
        description: 'Model run duration, test failure count, freshness SLA, schema drift events via dbt artifacts → custom Prometheus gauge.',
        signals: ['M', 'L', 'E'],
        status: 'Coming Soon', icon: '📦',
      },
      {
        key: 'plat-nifi',
        name: 'Apache NiFi',
        description: 'NiFi metrics API → Prometheus: FlowFile throughput, back-pressure triggers, processor run duration, bulletin errors.',
        signals: ['M', 'L'],
        status: 'Beta', icon: '🌀',
      },
    ],
  },

  /* ── 8. SECURITY & COMPLIANCE ─────────────────────────────────────────── */
  {
    id: 'security',
    label: 'Security & Compliance',
    shortLabel: 'Security',
    accent: '#DC2626',
    iconComponent: <Shield className="h-5 w-5" />,
    services: [
      {
        key: 'sec-falco',
        name: 'Falco — Runtime Security',
        description: 'Falco rule violations → Loki as structured security events + Prometheus alert counters. Pod exec, privilege escalation, file system writes.',
        signals: ['M', 'L', 'E'],
        status: 'GA', icon: '🦅',
        dashboardId: '11914',
      },
      {
        key: 'sec-trivy',
        name: 'Trivy — Vulnerability Scanning',
        description: 'Container image + IaC vulnerability scan results → Prometheus metrics. CVE severity counts, SBOM drift, compliance status per namespace.',
        signals: ['M', 'E'],
        status: 'GA', icon: '🔍',
        dashboardId: '14608',
      },
      {
        key: 'sec-kubebench',
        name: 'kube-bench CIS Compliance',
        description: 'CIS Kubernetes Benchmark results → Prometheus: pass/fail/warn counts per control, node-level compliance score trending.',
        signals: ['M', 'E'],
        status: 'GA', icon: '📋',
      },
      {
        key: 'sec-audit-logs',
        name: 'Kubernetes Audit Logs',
        description: 'K8s API server audit log → Loki via OTEL filelog receiver. RBAC violations, secret access, privilege escalation detection via LogQL alerts.',
        signals: ['L', 'E'],
        status: 'GA', icon: '📝',
      },
      {
        key: 'sec-oauth-oidc',
        name: 'Auth / OAuth2 / OIDC Events',
        description: 'Login failures, token issuance rate, session duration, MFA challenge events from identity providers → Loki. Brute-force detection.',
        signals: ['L', 'E'],
        status: 'GA', icon: '🔑',
      },
      {
        key: 'sec-waf',
        name: 'WAF / OWASP Events',
        description: 'Azure WAF / ModSecurity rule triggers streamed via EventHub → Loki. SQL injection, XSS, DDoS detection events with alert thresholds.',
        signals: ['L', 'E'],
        status: 'Beta', icon: '🛡️',
      },
      {
        key: 'sec-network-policy',
        name: 'Network Policy Violations',
        description: 'Cilium / Calico network policy drops → Prometheus + Loki. Unexpected east-west traffic, egress policy violations.',
        signals: ['M', 'L', 'E'],
        status: 'Beta', icon: '🚫',
      },
    ],
  },

  /* ── 9. CI/CD & DEVOPS ────────────────────────────────────────────────── */
  {
    id: 'cicd',
    label: 'CI/CD & DevOps',
    shortLabel: 'CI/CD',
    accent: '#D97706',
    iconComponent: <GitBranch className="h-5 w-5" />,
    services: [
      {
        key: 'cicd-jenkins',
        name: 'Jenkins',
        description: 'prometheus-plugin: build duration, queue depth, failure rate, executor utilisation. Build logs → Loki. DORA metrics (lead time, deploy freq).',
        signals: ['M', 'L', 'E'],
        status: 'GA', icon: '🏗️',
        dashboardId: '10557',
      },
      {
        key: 'cicd-gitlab',
        name: 'GitLab CI / GitLab Runner',
        description: 'GitLab built-in Prometheus metrics: pipeline duration, job failure rate, runner queue wait time. Deployment events → Loki.',
        signals: ['M', 'L', 'E'],
        status: 'GA', icon: '🦊',
        dashboardId: '12430',
      },
      {
        key: 'cicd-github-actions',
        name: 'GitHub Actions',
        description: 'GH Actions workflow duration, job failure rate, runner pool utilisation via gh-actions-exporter or OTEL webhook integration.',
        signals: ['M', 'E'],
        status: 'Beta', icon: '🐙',
      },
      {
        key: 'cicd-tekton',
        name: 'Tekton Pipelines',
        description: 'Tekton Prometheus metrics: PipelineRun duration, TaskRun failures, resource allocation per namespace.',
        signals: ['M', 'E'],
        status: 'Beta', icon: '🔧',
      },
      {
        key: 'cicd-sonarqube',
        name: 'SonarQube Code Quality',
        description: 'sonarqube_exporter: code coverage %, technical debt minutes, new bugs, vulnerabilities, code smells per project over time.',
        signals: ['M', 'E'],
        status: 'Beta', icon: '📊',
      },
      {
        key: 'cicd-dora',
        name: 'DORA Metrics Dashboard',
        description: 'Four DORA KPIs: Deployment Frequency, Lead Time for Changes, Change Failure Rate, MTTR — aggregated from CI/CD event streams.',
        signals: ['M', 'E'],
        status: 'GA', icon: '📈',
      },
    ],
  },

  /* ── 10. GRAFANA STACK — O11Y OF O11Y ─────────────────────────────────── */
  {
    id: 'stack',
    label: 'Grafana Stack Health',
    shortLabel: 'LGTM Stack',
    accent: '#FF6B35',
    iconComponent: <BarChart3 className="h-5 w-5" />,
    services: [
      {
        key: 'stack-mimir',
        name: 'Mimir Meta-Monitoring',
        description: '26 pre-built dashboards: write path (distributor, ingester), read path (querier, store-gateway), compactor, ruler, alerts for overloaded components.',
        signals: ['M', 'L'],
        status: 'GA', icon: '📊',
        grafanaPlugin: true,
        dashboardId: 'mimir-overview',
      },
      {
        key: 'stack-loki',
        name: 'Loki Meta-Monitoring',
        description: 'Loki distributor/ingester/querier metrics, ingestion rate, query latency, chunk cache hit ratio, Promtail scrape lag.',
        signals: ['M', 'L'],
        status: 'GA', icon: '📋',
        grafanaPlugin: true,
        dashboardId: '14055',
      },
      {
        key: 'stack-tempo',
        name: 'Tempo Meta-Monitoring',
        description: 'Distributor spans received, ingester flush duration, compactor block size, query throughput, TraceQL engine latency.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🔍',
        grafanaPlugin: true,
      },
      {
        key: 'stack-pyroscope',
        name: 'Pyroscope Meta-Monitoring',
        description: 'Profiling ingestion rate, storage utilisation, query duration, GC profiling of the Pyroscope server itself.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🔥',
      },
      {
        key: 'stack-grafana',
        name: 'Grafana Server Monitoring',
        description: 'Active dashboards, active users, datasource query duration, alert evaluation latency, renderer queue depth.',
        signals: ['M', 'L'],
        status: 'GA', icon: '📡',
        dashboardId: '3590',
      },
      {
        key: 'stack-alertmanager',
        name: 'Alertmanager',
        description: 'Alert notification latency, inhibition rules hit count, silences active, notification errors to PagerDuty/Slack/OpsGenie.',
        signals: ['M', 'L'],
        status: 'GA', icon: '🔔',
        dashboardId: '9578',
      },
      {
        key: 'stack-prometheus',
        name: 'Prometheus / Agent',
        description: 'Scrape duration, sample ingestion rate, remote_write queue depth, rule evaluation latency, TSDB compaction.',
        signals: ['M'],
        status: 'GA', icon: '🔥',
        dashboardId: '3662',
      },
      {
        key: 'stack-otel-collector',
        name: 'OTEL Collector Health',
        description: 'Exporter queue depth, dropped spans, accepted/refused datapoints, memory utilisation, receiver error rates.',
        signals: ['M', 'L'],
        status: 'GA', icon: '⚙️',
        dashboardId: '15983',
      },
    ],
  },

  /* ── 11. AIOPS & INTELLIGENCE ─────────────────────────────────────────── */
  {
    id: 'aiops',
    label: 'AIOps & Intelligence',
    shortLabel: 'AIOps',
    accent: '#4F46E5',
    iconComponent: <Zap className="h-5 w-5" />,
    services: [
      {
        key: 'aiops-anomaly',
        name: 'Anomaly Detection Engine',
        description: 'ML-based anomaly detection on Mimir metrics using Prophet + isolation forest. Auto-baselines seasonal patterns, fires adaptive alerts.',
        signals: ['M'],
        status: 'Beta', icon: '🤖',
      },
      {
        key: 'aiops-log-intelligence',
        name: 'Log Pattern Intelligence',
        description: 'Auto-cluster Loki logs into recurring patterns, surface new/rare log lines, correlate log anomalies to metric deviations.',
        signals: ['L'],
        status: 'Beta', icon: '🧠',
      },
      {
        key: 'aiops-slo-engine',
        name: 'SLO / Error Budget Engine',
        description: 'SLOTH-compatible SLO definitions, burn-rate alerting (fast/slow burn), error budget remaining dashboards. Multi-window, multi-burn alerts.',
        signals: ['M', 'E'],
        status: 'GA', icon: '🎯',
        dashboardId: '14348',
      },
      {
        key: 'aiops-trace-correlation',
        name: 'Log ↔ Trace Correlation',
        description: 'Auto-inject trace_id + span_id into structured logs. Grafana Explore: click a log line, jump to the matching Tempo trace instantly.',
        signals: ['L', 'T'],
        status: 'GA', icon: '🔗',
      },
      {
        key: 'aiops-capacity-forecast',
        name: 'Predictive Capacity Forecasting',
        description: 'Time-series forecasting for Mimir/Loki/Tempo cluster growth using historical ingestion trends. Alerts before hitting capacity thresholds.',
        signals: ['M'],
        status: 'Beta', icon: '📈',
      },
      {
        key: 'aiops-rootcause',
        name: 'Root Cause Suggestion',
        description: 'Correlates alert firing time across metrics, logs, and traces to surface probable root cause candidates ranked by confidence score.',
        signals: ['M', 'L', 'T'],
        status: 'Coming Soon', icon: '🔬',
      },
      {
        key: 'aiops-cost',
        name: 'Observability Cost Attribution',
        description: 'Per-team, per-service DPM (data points per minute), log GB/day, trace spans/sec. Chargeback reports and cost optimisation recommendations.',
        signals: ['M', 'E'],
        status: 'Beta', icon: '💰',
      },
    ],
  },
];

/* ============================================================================
   STAT CARD
   ============================================================================ */

function StatCard({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border px-5 py-3.5"
      style={{ background: 'rgb(var(--surface-primary))', borderColor: 'rgb(var(--border-color))' }}>
      <span style={{ color: 'rgb(var(--brand-500))' }}>{icon}</span>
      <div>
        <p className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>{value}</p>
        <p className="text-xs" style={{ color: 'rgb(var(--text-tertiary))' }}>{label}</p>
      </div>
    </div>
  );
}

/* ============================================================================
   SERVICE CARD
   ============================================================================ */

function ServiceCardItem({ service }: { service: ServiceCard }) {
  return (
    <div
      className="group flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200"
      style={{
        background: 'rgb(var(--surface-primary))',
        borderColor: 'rgb(var(--border-color))',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">{service.icon}</span>
          <div>
            <p className="text-sm font-semibold leading-tight" style={{ color: 'rgb(var(--text-primary))' }}>
              {service.name}
            </p>
            {service.dashboardId && (
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                Dashboard #{service.dashboardId}
              </p>
            )}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_META[service.status].bg} ${STATUS_META[service.status].text}`}>
          {service.status}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'rgb(var(--text-tertiary))' }}>
        {service.description}
      </p>

      {/* Footer: signals + CTA */}
      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {service.signals.map(sig => (
            <span
              key={sig}
              title={SIGNAL_META[sig].title}
              className={`rounded px-1.5 py-0.5 text-xs font-bold ${SIGNAL_META[sig].bg} ${SIGNAL_META[sig].text}`}
            >
              {sig}
            </span>
          ))}
          {service.grafanaPlugin && (
            <span className="rounded px-1.5 py-0.5 text-xs font-bold bg-orange-50 text-orange-600">Plugin</span>
          )}
        </div>
        <Link
          to={`/onboarding/new?template=${service.key}`}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-white transition-all duration-150"
          style={{ background: 'var(--brand-accent)' }}
          onClick={e => e.stopPropagation()}
        >
          Start <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */

const ALL_FILTERS: Array<{ id: CategoryKey | 'all'; label: string }> = [
  { id: 'all',        label: 'All' },
  { id: 'app',        label: 'Application' },
  { id: 'infra-azure', label: 'Azure' },
  { id: 'infra-gcp',  label: 'GCP' },
  { id: 'infra-k8s',  label: 'K8s & Containers' },
  { id: 'database',   label: 'Databases' },
  { id: 'network',    label: 'Network' },
  { id: 'platform',   label: 'Platform' },
  { id: 'security',   label: 'Security' },
  { id: 'cicd',       label: 'CI/CD' },
  { id: 'stack',      label: 'LGTM Stack' },
  { id: 'aiops',      label: 'AIOps' },
];

const SIGNAL_LEGEND: Signal[] = ['M', 'L', 'T', 'P', 'R', 'E'];

export default function ServiceCatalog() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<CategoryKey | 'all'>('all');

  const totalServices = CATALOG.reduce((sum, s) => sum + s.services.length, 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CATALOG
      .filter(section => activeFilter === 'all' || section.id === activeFilter)
      .map(section => ({
        ...section,
        services: section.services.filter(svc =>
          !q ||
          svc.name.toLowerCase().includes(q) ||
          svc.description.toLowerCase().includes(q) ||
          svc.signals.join('').toLowerCase().includes(q)
        ),
      }))
      .filter(section => section.services.length > 0);
  }, [search, activeFilter]);

  const totalFiltered = filtered.reduce((sum, s) => sum + s.services.length, 0);

  return (
    <div className="space-y-6">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl p-8"
        style={{ background: 'linear-gradient(135deg, rgb(var(--nav-bg)) 0%, rgb(var(--brand-900)) 60%, rgb(var(--brand-700)) 100%)' }}>
        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-10"
          style={{ background: 'var(--brand-accent)' }} />
        <div className="pointer-events-none absolute -bottom-12 left-32 h-40 w-40 rounded-full opacity-5"
          style={{ background: 'var(--brand-accent)' }} />
        <div className="relative z-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
            <Activity className="h-3.5 w-3.5" />
            Grafana LGTM Stack · Mimir · Loki · Tempo · Pyroscope · Faro
          </div>
          <h1 className="text-3xl font-bold text-white">
            O11y Integration Catalog
          </h1>
          <p className="mt-2 max-w-2xl text-base text-white/70">
            15+ years of enterprise observability patterns. Every integration pre-configured for your LGTM stack.
            Pick an integration and onboard in minutes — not weeks.
          </p>
          {/* Stats */}
          <div className="mt-6 flex flex-wrap gap-6 text-sm">
            {[
              { n: `${totalServices}`, l: 'Integrations' },
              { n: '6',  l: 'Signal Types' },
              { n: '11', l: 'Categories' },
              { n: '15+', l: 'Years of Patterns' },
            ].map(s => (
              <div key={s.l}>
                <span className="text-2xl font-bold text-white">{s.n}</span>
                <span className="ml-2 text-white/60">{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SIGNAL LEGEND ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium" style={{ color: 'rgb(var(--text-tertiary))' }}>Signal types:</span>
        {SIGNAL_LEGEND.map(sig => (
          <span key={sig} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${SIGNAL_META[sig].bg} ${SIGNAL_META[sig].text}`}>
            <span className="font-bold">{sig}</span>
            <span className="font-normal opacity-80">= {SIGNAL_META[sig].label} ({SIGNAL_META[sig].title})</span>
          </span>
        ))}
      </div>

      {/* ── SEARCH + FILTER ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'rgb(var(--text-muted))' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search integrations — e.g. kafka, postgres, nginx, aks..."
            className="w-full rounded-xl border py-2.5 pl-9 pr-10 text-sm focus:outline-none focus:ring-2"
            style={{
              background: 'rgb(var(--surface-primary))',
              borderColor: 'rgb(var(--border-color))',
              color: 'rgb(var(--text-primary))',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgb(var(--text-muted))' }}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {search && (
          <p className="shrink-0 text-sm" style={{ color: 'rgb(var(--text-tertiary))' }}>
            {totalFiltered} result{totalFiltered !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {ALL_FILTERS.map(f => {
          const section = CATALOG.find(s => s.id === f.id);
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                borderColor: isActive ? (section?.accent ?? 'var(--brand-accent)') : 'rgb(var(--border-color))',
                background: isActive ? `${section?.accent ?? 'var(--brand-accent)'}18` : 'transparent',
                color: isActive ? (section?.accent ?? 'var(--brand-accent)') : 'rgb(var(--text-secondary))',
              }}
            >
              {section && <span className="opacity-70">{section.iconComponent}</span>}
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── SECTIONS ──────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-16 text-center"
          style={{ borderColor: 'rgb(var(--border-color))' }}>
          <Search className="h-10 w-10 opacity-20" style={{ color: 'rgb(var(--text-tertiary))' }} />
          <p className="text-lg font-medium" style={{ color: 'rgb(var(--text-primary))' }}>No integrations found</p>
          <p className="text-sm" style={{ color: 'rgb(var(--text-tertiary))' }}>Try a different search term or clear the filter</p>
          <button onClick={() => { setSearch(''); setActiveFilter('all'); }}
            className="mt-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--brand-accent)' }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {filtered.map(section => (
            <div key={section.id}>
              {/* Section header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ background: section.accent }}
                  >
                    {section.iconComponent}
                  </span>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
                      {section.label}
                    </h2>
                    <p className="text-xs" style={{ color: 'rgb(var(--text-tertiary))' }}>
                      {section.services.length} integration{section.services.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {/* Accent line */}
                <div className="hidden flex-1 mx-4 h-px sm:block" style={{ background: `${section.accent}30` }} />
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {section.services.map(svc => (
                  <ServiceCardItem key={svc.key} service={svc} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FOOTER CTA ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-2xl border p-6"
        style={{ background: 'rgb(var(--surface-tertiary))', borderColor: 'rgb(var(--border-color))' }}>
        <div>
          <p className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
            Don't see your integration?
          </p>
          <p className="text-sm" style={{ color: 'rgb(var(--text-tertiary))' }}>
            Start a custom onboarding — our wizard adapts to any tech stack and platform.
          </p>
        </div>
        <Link
          to="/onboarding/new"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'var(--brand-accent)' }}
        >
          Start Custom Onboarding <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

    </div>
  );
}
