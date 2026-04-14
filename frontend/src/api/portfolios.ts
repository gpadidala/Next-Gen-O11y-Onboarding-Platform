/* -------------------------------------------------------------------------- */
/*  Portfolios API — CMDB-backed Retail Portfolios view                      */
/* -------------------------------------------------------------------------- */

import apiClient from './client';
import type { Portfolio } from '@/features/portfolios/data';

export async function listPortfolios(): Promise<Portfolio[]> {
  const r = await apiClient.get<Portfolio[]>('/portfolios/');
  return r.data;
}

export async function getPortfolio(id: string): Promise<Portfolio> {
  const r = await apiClient.get<Portfolio>(`/portfolios/${id}`);
  return r.data;
}
