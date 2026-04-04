/* ============================================================================
   RETAIL PORTFOLIO DATA
   10 portfolios · 56 applications · 6 O11y pillars each
   ============================================================================ */

export type Pillar = 'M' | 'L' | 'T' | 'P' | 'R' | 'E';
export type PillarCoverage = Record<Pillar, number>;

export interface App {
  id: string;
  name: string;
  team: string;
  tech: string;
  tier: 1 | 2 | 3;
  pillars: PillarCoverage;
}

export interface Portfolio {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  accent: string;
  owner: string;
  apps: App[];
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

export const PILLARS: Array<{
  key: Pillar;
  label: string;
  fullLabel: string;
  bg: string;
  text: string;
}> = [
  { key: 'M', label: 'Metrics',  fullLabel: 'Metrics / Mimir',       bg: 'bg-blue-500',   text: 'text-blue-600' },
  { key: 'L', label: 'Logs',     fullLabel: 'Logs / Loki',           bg: 'bg-green-500',  text: 'text-green-600' },
  { key: 'T', label: 'Traces',   fullLabel: 'Traces / Tempo',        bg: 'bg-purple-500', text: 'text-purple-600' },
  { key: 'P', label: 'Profiles', fullLabel: 'Profiles / Pyroscope',  bg: 'bg-orange-500', text: 'text-orange-600' },
  { key: 'R', label: 'RUM',      fullLabel: 'RUM / Faro',            bg: 'bg-pink-500',   text: 'text-pink-600' },
  { key: 'E', label: 'Events',   fullLabel: 'Events / Audit',        bg: 'bg-yellow-500', text: 'text-yellow-600' },
];

export function overallPct(p: PillarCoverage): number {
  return Math.round((p.M + p.L + p.T + p.P + p.R + p.E) / 6);
}

export function portfolioPillarAvg(apps: App[]): PillarCoverage {
  if (apps.length === 0) return { M: 0, L: 0, T: 0, P: 0, R: 0, E: 0 };
  const sum = apps.reduce(
    (acc, a) => ({
      M: acc.M + a.pillars.M,
      L: acc.L + a.pillars.L,
      T: acc.T + a.pillars.T,
      P: acc.P + a.pillars.P,
      R: acc.R + a.pillars.R,
      E: acc.E + a.pillars.E,
    }),
    { M: 0, L: 0, T: 0, P: 0, R: 0, E: 0 },
  );
  const n = apps.length;
  return {
    M: Math.round(sum.M / n),
    L: Math.round(sum.L / n),
    T: Math.round(sum.T / n),
    P: Math.round(sum.P / n),
    R: Math.round(sum.R / n),
    E: Math.round(sum.E / n),
  };
}

export function appStatus(p: PillarCoverage): 'complete' | 'in_progress' | 'not_started' {
  if (p.M >= 90 && p.L >= 80 && p.T >= 70) return 'complete';
  if (overallPct(p) > 0) return 'in_progress';
  return 'not_started';
}

/* ============================================================================
   PORTFOLIO DATA
   ============================================================================ */

export const RETAIL_PORTFOLIOS: Portfolio[] = [

  /* ── 1. E-COMMERCE & DIGITAL ───────────────────────────────────────────── */
  {
    id: 'ecommerce-digital',
    name: 'E-Commerce & Digital',
    shortName: 'E-Commerce',
    description: 'Customer-facing storefront, product discovery, search, personalisation, and media services',
    icon: '🛍️',
    accent: '#6366f1',
    owner: 'Digital Platform Team',
    apps: [
      { id: 'storefront-web',        name: 'storefront-web',        team: 'Frontend Platform',  tech: 'React / Next.js',          tier: 1, pillars: { M: 100, L: 100, T: 90, P:  0, R: 100, E:  40 } },
      { id: 'product-search',        name: 'product-search',        team: 'Search Engineering', tech: 'Java / Elasticsearch',     tier: 1, pillars: { M: 100, L:  90, T: 80, P: 60, R:   0, E:  30 } },
      { id: 'product-catalog',       name: 'product-catalog',       team: 'Catalog Team',       tech: 'Python / FastAPI',         tier: 1, pillars: { M: 100, L: 100, T: 85, P: 70, R:   0, E:  35 } },
      { id: 'shopping-cart',         name: 'shopping-cart',         team: 'Commerce Core',      tech: 'Go / Redis',               tier: 1, pillars: { M: 100, L:  95, T: 90, P: 50, R:   0, E:  50 } },
      { id: 'recommendation-engine', name: 'recommendation-engine', team: 'ML Platform',        tech: 'Python / TensorFlow',      tier: 2, pillars: { M:  90, L:  80, T: 60, P: 75, R:   0, E:  20 } },
      { id: 'product-images-cdn',    name: 'product-images-cdn',    team: 'Media Services',     tech: 'Go / Nginx',               tier: 2, pillars: { M:  85, L:  70, T: 40, P:  0, R:   0, E:  15 } },
      { id: 'wishlist-service',      name: 'wishlist-service',      team: 'Commerce Core',      tech: 'Node.js / PostgreSQL',     tier: 2, pillars: { M:  80, L:  75, T: 50, P: 30, R:   0, E:  20 } },
      { id: 'homepage-personalizer', name: 'homepage-personalizer', team: 'Personalisation',    tech: 'Python / Kafka',           tier: 2, pillars: { M:  75, L:  70, T: 45, P: 60, R:   0, E:  15 } },
    ],
  },

  /* ── 2. CHECKOUT & PAYMENTS ────────────────────────────────────────────── */
  {
    id: 'checkout-payments',
    name: 'Checkout & Payments',
    shortName: 'Payments',
    description: 'End-to-end checkout flow, payment processing, fraud detection, and PCI-scoped services',
    icon: '💳',
    accent: '#059669',
    owner: 'Payments Engineering',
    apps: [
      { id: 'checkout-orchestrator', name: 'checkout-orchestrator', team: 'Checkout Team',    tech: 'Java Spring Boot',       tier: 1, pillars: { M: 100, L: 100, T: 95, P: 70, R: 100, E:  90 } },
      { id: 'payment-gateway',       name: 'payment-gateway',       team: 'Payments Core',   tech: 'Java / gRPC',            tier: 1, pillars: { M: 100, L: 100, T: 100,P: 80, R:   0, E: 100 } },
      { id: 'fraud-detection',       name: 'fraud-detection',       team: 'Risk Engineering',tech: 'Python / XGBoost',       tier: 1, pillars: { M: 100, L:  95, T: 85, P: 80, R:   0, E:  80 } },
      { id: 'payment-processor',     name: 'payment-processor',     team: 'Payments Core',   tech: 'Java / Kafka',           tier: 1, pillars: { M: 100, L: 100, T: 90, P: 60, R:   0, E: 100 } },
      { id: 'gift-card-service',     name: 'gift-card-service',     team: 'Commerce Core',   tech: 'Node.js / PostgreSQL',   tier: 2, pillars: { M:  80, L:  80, T: 55, P: 30, R:   0, E:  70 } },
      { id: 'coupon-engine',         name: 'coupon-engine',         team: 'Promotions Team', tech: 'Python / Redis',         tier: 2, pillars: { M:  85, L:  75, T: 50, P: 40, R:   0, E:  60 } },
      { id: 'tax-calculation',       name: 'tax-calculation',       team: 'Finance Eng',     tech: 'Java Spring Boot',       tier: 2, pillars: { M:  90, L:  85, T: 65, P: 40, R:   0, E:  80 } },
    ],
  },

  /* ── 3. ORDER MANAGEMENT ───────────────────────────────────────────────── */
  {
    id: 'order-management',
    name: 'Order Management',
    shortName: 'Orders',
    description: 'Order lifecycle from submission through fulfilment, shipping, and returns',
    icon: '📦',
    accent: '#D97706',
    owner: 'Order Platform Team',
    apps: [
      { id: 'order-service',       name: 'order-service',       team: 'Orders Core',    tech: 'Java Spring Boot',     tier: 1, pillars: { M: 100, L: 100, T: 90, P: 70, R:  0, E:  80 } },
      { id: 'order-fulfillment',   name: 'order-fulfillment',   team: 'Fulfilment Eng', tech: 'Java / Kafka',         tier: 1, pillars: { M:  95, L:  95, T: 80, P: 60, R:  0, E:  70 } },
      { id: 'returns-service',     name: 'returns-service',     team: 'Post-Purchase',  tech: 'Python / FastAPI',     tier: 2, pillars: { M:  85, L:  85, T: 65, P: 40, R:  0, E:  75 } },
      { id: 'order-notifications', name: 'order-notifications', team: 'Comms Platform', tech: 'Node.js / SES',        tier: 2, pillars: { M:  80, L:  80, T: 50, P:  0, R:  0, E:  60 } },
      { id: 'shipping-labels',     name: 'shipping-labels',     team: 'Logistics Eng',  tech: 'Python / Docker',      tier: 3, pillars: { M:  60, L:  65, T: 30, P:  0, R:  0, E:  40 } },
      { id: 'order-history',       name: 'order-history',       team: 'Orders Core',    tech: 'Go / PostgreSQL',      tier: 2, pillars: { M:  90, L:  85, T: 70, P: 35, R:  0, E:  55 } },
    ],
  },

  /* ── 4. INVENTORY & WAREHOUSE ──────────────────────────────────────────── */
  {
    id: 'inventory-warehouse',
    name: 'Inventory & Warehouse',
    shortName: 'Inventory',
    description: 'Real-time stock management, warehouse operations, allocation, and replenishment',
    icon: '🏭',
    accent: '#0EA5E9',
    owner: 'Supply & Fulfilment',
    apps: [
      { id: 'inventory-service',        name: 'inventory-service',        team: 'Inventory Core', tech: 'Java Spring Boot',  tier: 1, pillars: { M: 100, L: 100, T: 85, P: 60, R:  0, E:  70 } },
      { id: 'warehouse-mgmt-system',    name: 'warehouse-mgmt-system',    team: 'WMS Team',       tech: 'Java / Oracle DB',  tier: 1, pillars: { M:  95, L:  90, T: 75, P: 50, R:  0, E:  65 } },
      { id: 'stock-allocation',         name: 'stock-allocation',         team: 'Inventory Core', tech: 'Python / Redis',    tier: 2, pillars: { M:  85, L:  80, T: 55, P: 35, R:  0, E:  50 } },
      { id: 'replenishment-engine',     name: 'replenishment-engine',     team: 'ML Platform',    tech: 'Python / Spark',    tier: 2, pillars: { M:  75, L:  70, T: 40, P: 45, R:  0, E:  40 } },
      { id: 'goods-receipt',            name: 'goods-receipt',            team: 'WMS Team',       tech: 'Java / PostgreSQL', tier: 3, pillars: { M:  55, L:  60, T: 20, P:  0, R:  0, E:  35 } },
    ],
  },

  /* ── 5. CUSTOMER & LOYALTY ─────────────────────────────────────────────── */
  {
    id: 'customer-loyalty',
    name: 'Customer & Loyalty',
    shortName: 'Loyalty',
    description: 'Customer identity, loyalty programme, rewards, personalisation, and GDPR consent',
    icon: '⭐',
    accent: '#EC4899',
    owner: 'CRM Platform Team',
    apps: [
      { id: 'customer-profile',       name: 'customer-profile',       team: 'Identity Eng',   tech: 'Java Spring Boot',    tier: 1, pillars: { M: 100, L: 100, T: 85, P: 65, R:   0, E:  90 } },
      { id: 'loyalty-engine',         name: 'loyalty-engine',         team: 'Loyalty Team',   tech: 'Java / PostgreSQL',   tier: 1, pillars: { M: 100, L:  95, T: 80, P: 70, R:   0, E:  85 } },
      { id: 'loyalty-portal',         name: 'loyalty-portal',         team: 'Loyalty Team',   tech: 'React / Node.js',     tier: 1, pillars: { M:  90, L:  85, T: 70, P:  0, R:  85, E:  70 } },
      { id: 'identity-auth',          name: 'identity-auth',          team: 'Identity Eng',   tech: 'Go / Keycloak',       tier: 1, pillars: { M: 100, L: 100, T: 90, P: 50, R:   0, E: 100 } },
      { id: 'customer-notifications', name: 'customer-notifications', team: 'Comms Platform', tech: 'Node.js / Kafka',     tier: 2, pillars: { M:  80, L:  80, T: 55, P:  0, R:   0, E:  65 } },
      { id: 'gdpr-consent',           name: 'gdpr-consent',           team: 'Privacy Eng',    tech: 'Python / PostgreSQL', tier: 3, pillars: { M:  55, L:  60, T: 30, P:  0, R:  40, E:  80 } },
    ],
  },

  /* ── 6. SUPPLY CHAIN & LOGISTICS ───────────────────────────────────────── */
  {
    id: 'supply-chain',
    name: 'Supply Chain & Logistics',
    shortName: 'Supply Chain',
    description: 'Vendor collaboration, procurement, carrier integrations, and last-mile delivery tracking',
    icon: '🚚',
    accent: '#7C3AED',
    owner: 'Logistics Engineering',
    apps: [
      { id: 'delivery-tracking',    name: 'delivery-tracking',    team: 'Last Mile',        tech: 'Go / Kafka',        tier: 1, pillars: { M: 100, L:  95, T: 85, P: 45, R:   0, E:  60 } },
      { id: 'carrier-integration',  name: 'carrier-integration',  team: 'Carrier Team',     tech: 'Java / REST',       tier: 2, pillars: { M:  85, L:  85, T: 65, P: 30, R:   0, E:  55 } },
      { id: 'vendor-portal',        name: 'vendor-portal',        team: 'Supplier Ops',     tech: 'React / Node.js',   tier: 2, pillars: { M:  75, L:  70, T: 50, P:  0, R:  65, E:  55 } },
      { id: 'procurement-service',  name: 'procurement-service',  team: 'Procurement Eng',  tech: 'Java / SAP',        tier: 2, pillars: { M:  80, L:  80, T: 55, P: 40, R:   0, E:  70 } },
      { id: 'route-optimizer',      name: 'route-optimizer',      team: 'Last Mile',        tech: 'Python / OR-Tools', tier: 2, pillars: { M:  80, L:  75, T: 50, P: 65, R:   0, E:  35 } },
    ],
  },

  /* ── 7. STORE OPERATIONS ───────────────────────────────────────────────── */
  {
    id: 'store-operations',
    name: 'Store Operations',
    shortName: 'Stores',
    description: 'Point-of-sale, self-checkout, in-store inventory, queue management, and digital signage',
    icon: '🏪',
    accent: '#DC2626',
    owner: 'Store Technology Team',
    apps: [
      { id: 'pos-system',       name: 'pos-system',       team: 'POS Engineering',  tech: 'Java / Oracle',         tier: 1, pillars: { M: 100, L:  95, T: 80, P: 60, R:  0, E:  90 } },
      { id: 'self-checkout',    name: 'self-checkout',    team: 'POS Engineering',  tech: 'Java / Embedded Linux', tier: 1, pillars: { M:  95, L:  90, T: 70, P: 50, R:  0, E:  80 } },
      { id: 'store-inventory',  name: 'store-inventory',  tech: 'Java / SQLite',    team: 'In-Store Tech',         tier: 2, pillars: { M:  85, L:  80, T: 55, P: 40, R:  0, E:  55 } },
      { id: 'queue-management', name: 'queue-management', team: 'In-Store Tech',    tech: 'Go / Redis',            tier: 2, pillars: { M:  80, L:  75, T: 50, P:  0, R:  0, E:  35 } },
      { id: 'digital-signage',  name: 'digital-signage',  team: 'In-Store Tech',    tech: 'Node.js / Electron',    tier: 3, pillars: { M:  45, L:  50, T: 15, P:  0, R:  0, E:  20 } },
    ],
  },

  /* ── 8. MARKETING & PROMOTIONS ─────────────────────────────────────────── */
  {
    id: 'marketing-promotions',
    name: 'Marketing & Promotions',
    shortName: 'Marketing',
    description: 'Campaign orchestration, promotions engine, email/push delivery, and A/B experimentation',
    icon: '📣',
    accent: '#F59E0B',
    owner: 'Marketing Technology',
    apps: [
      { id: 'promotion-engine',    name: 'promotion-engine',    team: 'Promotions Eng',   tech: 'Java / Redis',       tier: 1, pillars: { M:  95, L:  90, T: 75, P: 60, R:  0, E:  70 } },
      { id: 'campaign-manager',    name: 'campaign-manager',    team: 'MarTech',           tech: 'Python / PostgreSQL',tier: 2, pillars: { M:  80, L:  80, T: 55, P: 55, R:  0, E:  65 } },
      { id: 'email-service',       name: 'email-service',       team: 'Comms Platform',   tech: 'Node.js / SES',      tier: 2, pillars: { M:  85, L:  85, T: 50, P:  0, R:  0, E:  60 } },
      { id: 'push-notifications',  name: 'push-notifications',  team: 'Comms Platform',   tech: 'Go / FCM',           tier: 2, pillars: { M:  80, L:  80, T: 45, P:  0, R:  0, E:  55 } },
      { id: 'ab-testing',          name: 'ab-testing',          team: 'Experimentation',  tech: 'Python / Kafka',     tier: 2, pillars: { M:  85, L:  75, T: 55, P: 50, R:  0, E:  40 } },
    ],
  },

  /* ── 9. DATA & ANALYTICS ───────────────────────────────────────────────── */
  {
    id: 'data-analytics',
    name: 'Data & Analytics',
    shortName: 'Data',
    description: 'Data pipelines, event streaming, BI reporting, customer 360, and ML feature store',
    icon: '📊',
    accent: '#14B8A6',
    owner: 'Data Platform Team',
    apps: [
      { id: 'event-streaming',  name: 'event-streaming',  team: 'Data Infra',   tech: 'Kafka / Flink',          tier: 1, pillars: { M: 100, L:  95, T: 80, P: 55, R:  0, E:  70 } },
      { id: 'data-pipeline',    name: 'data-pipeline',    team: 'Data Eng',     tech: 'Python / Databricks',    tier: 1, pillars: { M:  90, L:  90, T: 65, P: 70, R:  0, E:  55 } },
      { id: 'customer-360',     name: 'customer-360',     team: 'CDP Team',     tech: 'Python / Spark',         tier: 2, pillars: { M:  80, L:  80, T: 55, P: 50, R:  0, E:  50 } },
      { id: 'pricing-analytics',name: 'pricing-analytics',team: 'Pricing Eng',  tech: 'Python / MLflow',        tier: 2, pillars: { M:  75, L:  70, T: 45, P: 65, R:  0, E:  40 } },
      { id: 'bi-reporting',     name: 'bi-reporting',     team: 'BI Team',      tech: 'Python / dbt / Grafana', tier: 2, pillars: { M:  75, L:  70, T: 40, P: 40, R:  0, E:  45 } },
    ],
  },

  /* ── 10. FINANCE & ERP ─────────────────────────────────────────────────── */
  {
    id: 'finance-erp',
    name: 'Finance & ERP',
    shortName: 'Finance',
    description: 'Billing, reconciliation, tax, accounts payable, and general ledger services',
    icon: '💰',
    accent: '#0078D4',
    owner: 'Finance Engineering',
    apps: [
      { id: 'billing-service',        name: 'billing-service',        team: 'Billing Eng',   tech: 'Java Spring Boot',    tier: 1, pillars: { M: 100, L: 100, T: 85, P: 60, R:  0, E: 100 } },
      { id: 'ledger-service',         name: 'ledger-service',         team: 'Finance Core',  tech: 'Java / Oracle',       tier: 1, pillars: { M: 100, L: 100, T: 80, P: 60, R:  0, E: 100 } },
      { id: 'reconciliation-engine',  name: 'reconciliation-engine',  team: 'Finance Core',  tech: 'Python / PostgreSQL', tier: 1, pillars: { M:  95, L: 100, T: 80, P: 55, R:  0, E: 100 } },
      { id: 'tax-service',            name: 'tax-service',            team: 'Finance Core',  tech: 'Java Spring Boot',    tier: 2, pillars: { M:  85, L:  90, T: 65, P: 40, R:  0, E:  90 } },
      { id: 'accounts-payable',       name: 'accounts-payable',       team: 'Finance Eng',   tech: 'Java / SAP',          tier: 2, pillars: { M:  80, L:  85, T: 55, P: 35, R:  0, E:  85 } },
    ],
  },
];
