/* -------------------------------------------------------------------------- */
/*  Grafana Usage (RBAC activity)                                             */
/* -------------------------------------------------------------------------- */

import { useEffect, useState } from 'react';
import { Users, AlertTriangle } from 'lucide-react';
import {
  getGrafanaAdoptionCoverage,
  getGrafanaUsageSummary,
  listGrafanaTeams,
} from '@/api/coverage';
import type {
  GrafanaTeamUsage,
  GrafanaUsageCoverageResponse,
  GrafanaUsageSummary,
} from '@/types/coverage';

export default function GrafanaUsagePage() {
  const [summary, setSummary] = useState<GrafanaUsageSummary | null>(null);
  const [adoption, setAdoption] =
    useState<GrafanaUsageCoverageResponse | null>(null);
  const [teams, setTeams] = useState<GrafanaTeamUsage[]>([]);
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, a, t] = await Promise.all([
        getGrafanaUsageSummary(),
        getGrafanaAdoptionCoverage(),
        listGrafanaTeams({ page_size: 200, active_only: activeOnly }),
      ]);
      setSummary(s);
      setAdoption(a);
      setTeams(t.items);
    } catch (err) {
      const msg =
        typeof err === 'object' && err && 'detail' in err
          ? (err as { detail: string }).detail
          : 'Failed to load Grafana usage.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Users className="h-6 w-6 text-brand-600" />
          Grafana Usage
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          RBAC activity — active teams, active users, dashboard adoption per org.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div>{error}</div>
        </div>
      )}

      {/* Stat cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <SmallStat label="Orgs" value={summary.total_orgs} />
          <SmallStat label="Teams" value={summary.total_teams} />
          <SmallStat
            label="Active teams (30d)"
            value={summary.active_teams_30d}
          />
          <SmallStat label="Users" value={summary.total_users} />
          <SmallStat
            label="Active users (30d)"
            value={summary.active_users_30d}
          />
          <SmallStat
            label="Team adoption"
            value={`${summary.team_adoption_pct.toFixed(0)}%`}
          />
        </div>
      )}

      {/* Adoption coverage */}
      {adoption && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Grafana adoption by CMDB app
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>
                  {adoption.apps_with_mapped_team} / {adoption.total_cmdb_apps}{' '}
                  apps have a mapped Grafana team
                </span>
                <span>{adoption.team_coverage_pct.toFixed(1)}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-brand-600"
                  style={{ width: `${Math.min(100, adoption.team_coverage_pct)}%` }}
                />
              </div>
            </div>
          </div>
          {adoption.unmapped_app_codes.length > 0 && (
            <div className="mt-3 text-xs text-slate-500">
              {adoption.unmapped_app_codes.length} apps without a mapped team —
              e.g. {adoption.unmapped_app_codes.slice(0, 8).join(', ')}
              {adoption.unmapped_app_codes.length > 8 && '…'}
            </div>
          )}
        </div>
      )}

      {/* Team list */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Teams ({teams.length})
          </h2>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-slate-300"
            />
            Active in last 30d only
          </label>
        </div>

        {loading && teams.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
        ) : teams.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No teams.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">App</th>
                <th className="px-4 py-3">Portfolio</th>
                <th className="px-4 py-3 text-right">Members</th>
                <th className="px-4 py-3 text-right">Active 30d</th>
                <th className="px-4 py-3 text-right">Dashboards</th>
                <th className="px-4 py-3 text-right">Views 30d</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {t.team_name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {t.mapped_app_code ?? (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {t.mapped_portfolio ?? (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {t.member_count}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {t.active_users_30d}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {t.dashboard_count}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {t.dashboard_views_30d.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SmallStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
