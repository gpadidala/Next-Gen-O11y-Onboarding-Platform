import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import AppShell from '@/components/layout/AppShell';

/* -------------------------------------------------------------------------- */
/*  Lazy-loaded route components                                              */
/* -------------------------------------------------------------------------- */

const Dashboard = lazy(() => import('@/features/dashboard/Dashboard'));
const OnboardingWizard = lazy(
  () => import('@/features/onboarding/OnboardingWizard')
);
const CapacityDashboard = lazy(
  () => import('@/features/capacity/CapacityDashboard')
);
const AdminPanel = lazy(() => import('@/features/admin/AdminPanel'));

/* -------------------------------------------------------------------------- */
/*  Loading fallback                                                          */
/* -------------------------------------------------------------------------- */

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        <span className="text-sm text-slate-500">Loading...</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  App                                                                       */
/* -------------------------------------------------------------------------- */

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={<Dashboard />} />

          {/* Onboarding wizard - new and edit */}
          <Route path="/onboarding/new" element={<OnboardingWizard />} />
          <Route path="/onboarding/:id" element={<OnboardingWizard />} />

          {/* Capacity planning */}
          <Route path="/capacity" element={<CapacityDashboard />} />

          {/* Admin panel */}
          <Route path="/admin" element={<AdminPanel />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
