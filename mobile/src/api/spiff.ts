import { apiRequest } from './client';

export type SpiffConfig = {
  minRedeemPoints: number;
  pointsPerDollar: number;
  conversionDisplay: string;
  giftCardOptions: string[];
  giftbitConfigured: boolean;
  autoFulfill: boolean;
};

export type SpiffSummary = {
  wallet: {
    totalEarnedPoints: number;
    unlockedPoints: number;
    lockedPoints: number;
    committedPoints: number;
    availablePoints: number;
    fulfilledClaimedPoints: number;
  };
  tier: {
    code: string;
    label: string;
    badge: string;
    minPoints: number;
    maxPoints: number | null;
    nextTierAt: number | null;
  };
  stats: {
    totalClaims: number;
    pendingClaims: number;
    fulfilledClaims: number;
    lastClaimAt: string | null;
  };
  config: SpiffConfig;
};

export type SpiffClaim = {
  id: string;
  claimNumber: string;
  status: string;
  giftCardType: string;
  requestedPoints: number;
  requestedAmount: number;
  reviewReason?: string | null;
  giftbitLinkUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const fetchSpiffConfig = (token: string) =>
  apiRequest<SpiffConfig>('/spiff/config', { method: 'GET' }, token);

export const fetchSpiffSummary = (token: string) =>
  apiRequest<SpiffSummary>('/spiff/summary', { method: 'GET' }, token);

export const fetchSpiffLeaderboard = (
  token: string,
  params: { scope?: 'MY_BRANCH' | 'MY_COMPANY' | 'GLOBAL'; period?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ALL_TIME'; limit?: number },
) => {
  const query = new URLSearchParams();
  if (params.scope) query.set('scope', params.scope);
  if (params.period) query.set('period', params.period);
  if (params.limit) query.set('limit', String(params.limit));

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<{
    scope: string;
    period: string;
    entries: Array<{ rank: number; entityId: string; name: string; subtitle?: string | null; points: number }>;
    myRank?: { rank: number; points: number } | null;
  }>(`/spiff/leaderboard${suffix}`, { method: 'GET' }, token);
};

export const fetchSpiffClaims = (token: string, page = 1, limit = 20) =>
  apiRequest<{
    data: SpiffClaim[];
    total: number;
    page: number;
    totalPages: number;
  }>(`/spiff/claims?page=${page}&limit=${limit}`, { method: 'GET' }, token);

export const createSpiffClaim = (
  token: string,
  payload: { requestedPoints: number; giftCardType: string; note?: string },
) =>
  apiRequest<{ claim: SpiffClaim }>('/spiff/claims', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
