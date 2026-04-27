import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import api from '../../services/api';
import { getStoredUser } from '../../utils/auth';

type SpiffConfig = {
  minRedeemPoints: number;
  pointsPerDollar: number;
  conversionDisplay: string;
  giftCardOptions: string[];
  giftbitConfigured: boolean;
  autoFulfill: boolean;
};

type SpiffTier = {
  code: string;
  label: string;
  badge: string;
  minPoints: number;
  maxPoints: number | null;
  nextTierAt: number | null;
};

type SpiffSummary = {
  wallet: {
    totalEarnedPoints: number;
    unlockedPoints: number;
    lockedPoints: number;
    committedPoints: number;
    availablePoints: number;
    fulfilledClaimedPoints: number;
  };
  tier: SpiffTier;
  stats: {
    totalClaims: number;
    pendingClaims: number;
    fulfilledClaims: number;
    lastClaimAt: string | null;
  };
  config: SpiffConfig;
};

type LeaderboardEntry = {
  rank: number;
  entityId: string;
  name: string;
  subtitle?: string | null;
  points: number;
  totalOrders?: number;
  totalGmv?: number;
  topRepName?: string | null;
  topRepPoints?: number;
};

type GlobalRepEntry = {
  rank: number;
  userId: string;
  name: string;
  companyName: string | null;
  role: string | null;
  points: number;
};

type LeaderboardResponse = {
  scope: 'MY_BRANCH' | 'MY_COMPANY' | 'GLOBAL';
  period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ALL_TIME';
  entries: LeaderboardEntry[];
  globalRepEntries?: GlobalRepEntry[];
  myRank?: {
    rank: number;
    points: number;
  } | null;
};

type ClaimRow = {
  id: string;
  claimNumber: string;
  status: string;
  giftCardType: string;
  requestedPoints: number;
  requestedAmount: number;
  requestorName?: string | null;
  companyName?: string | null;
  branchName?: string | null;
  reviewReason?: string | null;
  giftbitLinkUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING_REVIEW: 'bg-amber-100 text-amber-800 border border-amber-200',
  HOLD: 'bg-orange-100 text-orange-800 border border-orange-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  FULFILLED: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  REJECTED: 'bg-rose-100 text-rose-800 border border-rose-200',
};

const formatNumber = (value: number | null | undefined) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US').format(Number.isFinite(amount) ? amount : 0);
};

const formatMoney = (value: number | null | undefined) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

const getDefaultScopeForRole = (
  role: string | null | undefined,
): 'MY_BRANCH' | 'MY_COMPANY' | 'GLOBAL' => {
  if (role === 'SUPER_ADMIN') return 'GLOBAL';
  if (role === 'COMPANY_ADMIN') return 'MY_COMPANY';
  return 'MY_BRANCH';
};

const getScopeOptionsForRole = (
  role: string | null | undefined,
): Array<{ value: 'MY_BRANCH' | 'MY_COMPANY' | 'GLOBAL'; label: string }> => {
  if (role === 'SUPER_ADMIN') {
    return [{ value: 'GLOBAL', label: 'Global' }];
  }
  if (role === 'COMPANY_ADMIN') {
    return [
      { value: 'MY_COMPANY', label: 'My Company' },
      { value: 'GLOBAL', label: 'Global' },
    ];
  }
  if (role === 'BRANCH_MANAGER') {
    return [
      { value: 'MY_BRANCH', label: 'My Branch' },
      { value: 'MY_COMPANY', label: 'My Company' },
    ];
  }
  return [{ value: 'MY_BRANCH', label: 'My Branch' }];
};

export default function SpiffPage() {
  const user = useMemo(() => getStoredUser(), []);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [loading, setLoading] = useState(true);
  const [savingClaim, setSavingClaim] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<SpiffConfig | null>(null);
  const [summary, setSummary] = useState<SpiffSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [claims, setClaims] = useState<ClaimRow[]>([]);

  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ALL_TIME'>('MONTHLY');
  const [scope, setScope] = useState<'MY_BRANCH' | 'MY_COMPANY' | 'GLOBAL'>(() =>
    getDefaultScopeForRole(user?.role),
  );
  const [includeGlobalReps, setIncludeGlobalReps] = useState(false);

  const [claimPoints, setClaimPoints] = useState('');
  const [giftCardType, setGiftCardType] = useState('');
  const [claimNote, setClaimNote] = useState('');

  const canManageClaims =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'COMPANY_ADMIN' ||
    user?.role === 'BRANCH_MANAGER';

  const canCreateClaim = user?.role === 'SALES_REP';
  const scopeOptions = useMemo(() => getScopeOptionsForRole(user?.role), [user?.role]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [configRes, summaryRes, leaderboardRes, claimsRes] = await Promise.all([
        api.get('/spiff/config'),
        api.get('/spiff/summary'),
        api.get('/spiff/leaderboard', {
          params: {
            period,
            scope,
            limit: 10,
            includeGlobalReps: scope === 'GLOBAL' ? includeGlobalReps : undefined,
            repLimit: scope === 'GLOBAL' ? 20 : undefined,
          },
        }),
        api.get('/spiff/claims', {
          params: { page: 1, limit: 50 },
        }),
      ]);

      const nextConfig = configRes.data as SpiffConfig;
      setConfig(nextConfig);
      setSummary(summaryRes.data as SpiffSummary);
      setLeaderboard(leaderboardRes.data as LeaderboardResponse);
      setClaims((claimsRes.data?.data || []) as ClaimRow[]);

      setGiftCardType((current) => {
        if (current) return current;
        return nextConfig.giftCardOptions?.[0] || 'Amazon';
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load SPIFF data');
    } finally {
      setLoading(false);
    }
  }, [period, scope, includeGlobalReps]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const submitClaim = async () => {
    const requestedPoints = Math.floor(Number(claimPoints || 0));
    if (!Number.isFinite(requestedPoints) || requestedPoints <= 0) {
      window.alert('Enter valid points to redeem.');
      return;
    }

    if (!giftCardType.trim()) {
      window.alert('Please select a gift card type.');
      return;
    }

    setSavingClaim(true);
    try {
      await api.post('/spiff/claims', {
        requestedPoints,
        giftCardType,
        note: claimNote.trim() || undefined,
      });
      setClaimPoints('');
      setClaimNote('');
      await loadData();
    } catch (err: any) {
      window.alert(err?.response?.data?.message || 'Failed to create redemption claim');
    } finally {
      setSavingClaim(false);
    }
  };

  const reviewClaim = async (claimId: string, action: 'APPROVE' | 'REJECT' | 'HOLD') => {
    const reason = window.prompt(`Optional reason for ${action.toLowerCase()}:`) || undefined;
    try {
      await api.patch(`/spiff/claims/${claimId}/review`, {
        action,
        reason,
      });
      await loadData();
    } catch (err: any) {
      window.alert(err?.response?.data?.message || `Failed to ${action.toLowerCase()} claim`);
    }
  };

  const fulfillClaim = async (claimId: string) => {
    const rewardLink = window.prompt('Paste reward link/code shared with rep:');
    if (!rewardLink?.trim()) {
      return;
    }

    const note = window.prompt('Optional fulfillment note:') || undefined;
    try {
      await api.patch(`/spiff/claims/${claimId}/fulfill`, {
        rewardLink: rewardLink.trim(),
        note,
      });
      await loadData();
    } catch (err: any) {
      window.alert(err?.response?.data?.message || 'Failed to mark claim fulfilled');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">SPIFF Rewards</h1>
          <p className="text-sm text-slate-600">
            {isSuperAdmin
              ? 'Global platform leaderboard and redemption control center.'
              : 'Redemption, leaderboard, and reward workflow in one place.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value as 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ALL_TIME')
            }
          >
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ALL_TIME">All Time</option>
          </select>

          <select
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            value={scope}
            onChange={(event) =>
              setScope(event.target.value as 'MY_BRANCH' | 'MY_COMPANY' | 'GLOBAL')
            }
            disabled={scopeOptions.length === 1}
          >
            {scopeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Button type="button" variant="secondary" onClick={() => void loadData()}>
            Refresh
          </Button>
        </div>
      </div>

      {scope === 'GLOBAL' && (user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN') ? (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Global Rep Ranking</p>
            <p className="text-xs text-slate-500">Opt-in ranking for individual reps across companies.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={includeGlobalReps}
              onChange={(event) => setIncludeGlobalReps(event.target.checked)}
            />
            Show reps
          </label>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {isSuperAdmin ? (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-4 text-sm text-indigo-900">
          Super Admin View: global rankings are shown by default, and claim queue includes all companies.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Available</p>
            <p className="text-3xl font-bold text-slate-900">{loading ? '--' : formatNumber(summary?.wallet.availablePoints)}</p>
            <p className="text-xs text-slate-500">Ready to redeem</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Locked</p>
            <p className="text-3xl font-bold text-slate-900">{loading ? '--' : formatNumber(summary?.wallet.lockedPoints)}</p>
            <p className="text-xs text-slate-500">Unlocks when orders ship</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Lifetime Earned</p>
            <p className="text-3xl font-bold text-slate-900">{loading ? '--' : formatNumber(summary?.wallet.totalEarnedPoints)}</p>
            <p className="text-xs text-slate-500">SPIFF points earned</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Current Tier</p>
            <p className="text-2xl font-bold text-slate-900">
              {summary?.tier.badge || '-'} {summary?.tier.label || '--'}
            </p>
            <p className="text-xs text-slate-500">
              {summary?.tier.nextTierAt
                ? `${formatNumber(summary.tier.nextTierAt - (summary.wallet.totalEarnedPoints || 0))} pts to next tier`
                : 'Top tier unlocked'}
            </p>
          </div>
        </Card>
      </div>

      {canCreateClaim ? (
        <Card title="Redeem Points">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1.4fr_auto] lg:items-end">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Points to Redeem</label>
              <input
                type="number"
                min={config?.minRedeemPoints || 1}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder={String(config?.minRedeemPoints || 500)}
                value={claimPoints}
                onChange={(event) => setClaimPoints(event.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Minimum {formatNumber(config?.minRedeemPoints)} points
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Gift Card</label>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={giftCardType}
                onChange={(event) => setGiftCardType(event.target.value)}
              >
                {(config?.giftCardOptions || ['Amazon']).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Any redemption note"
                value={claimNote}
                onChange={(event) => setClaimNote(event.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Conversion: {config?.conversionDisplay || '100 points = $1'}
              </p>
            </div>

            <Button type="button" onClick={submitClaim} disabled={savingClaim || loading}>
              {savingClaim ? 'Submitting...' : 'Submit Claim'}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Leaderboard">
          <div className="space-y-3">
            {leaderboard?.entries?.length ? (
              leaderboard.entries.map((entry) => (
                <div key={entry.entityId} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        #{entry.rank} {entry.name}
                      </p>
                      <p className="text-xs text-slate-500">{entry.subtitle || '-'}</p>
                    </div>
                    <p className="text-lg font-bold text-slate-900">{formatNumber(entry.points)} pts</p>
                  </div>

                  {scope === 'GLOBAL' ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                      <p>
                        Orders: <strong>{formatNumber(entry.totalOrders)}</strong>
                      </p>
                      <p>
                        GMV: <strong>{formatMoney(entry.totalGmv)}</strong>
                      </p>
                      <p className="col-span-2">
                        Top rep: <strong>{entry.topRepName || '-'}</strong>{' '}
                        <span className="text-slate-500">
                          ({formatNumber(entry.topRepPoints)} pts)
                        </span>
                      </p>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No leaderboard data yet.</p>
            )}

            {leaderboard?.myRank ? (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                Your rank: #{leaderboard.myRank.rank} ({formatNumber(leaderboard.myRank.points)} pts)
              </div>
            ) : null}

            {scope === 'GLOBAL' && includeGlobalReps ? (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="mb-2 text-sm font-semibold text-slate-900">Global Rep Ranking</p>
                <div className="space-y-2">
                  {(leaderboard?.globalRepEntries || []).length ? (
                    (leaderboard?.globalRepEntries || []).map((rep) => (
                      <div
                        key={rep.userId}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            #{rep.rank} {rep.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {rep.companyName || '-'} {rep.role ? `• ${rep.role}` : ''}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{formatNumber(rep.points)} pts</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No global rep ranking data yet.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <Card title={canManageClaims ? 'Claim Queue' : 'My Claims'}>
          <div className="space-y-3">
            {claims.length ? (
              claims.map((claim) => {
                const statusStyle = STATUS_STYLES[claim.status] || 'bg-slate-100 text-slate-700 border border-slate-200';
                const actionable = canManageClaims && ['PENDING_REVIEW', 'HOLD', 'APPROVED'].includes(claim.status);

                return (
                  <div key={claim.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {claim.claimNumber} - {claim.requestorName || 'Rep'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {claim.companyName || '-'} - {claim.branchName || '-'}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle}`}>
                        {claim.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-700">
                      <p>Points: <strong>{formatNumber(claim.requestedPoints)}</strong></p>
                      <p>Amount: <strong>{formatMoney(claim.requestedAmount)}</strong></p>
                      <p>Gift card: <strong>{claim.giftCardType}</strong></p>
                      <p>Created: <strong>{formatDate(claim.createdAt)}</strong></p>
                    </div>

                    {claim.reviewReason ? (
                      <p className="mt-2 rounded bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        Note: {claim.reviewReason}
                      </p>
                    ) : null}

                    {claim.giftbitLinkUrl ? (
                      <a
                        href={claim.giftbitLinkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-xs font-semibold text-indigo-700 underline"
                      >
                        Open reward link
                      </a>
                    ) : null}

                    {actionable ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {claim.status !== 'APPROVED' ? (
                          <Button size="sm" onClick={() => void reviewClaim(claim.id, 'APPROVE')}>
                            Approve
                          </Button>
                        ) : null}
                        <Button size="sm" variant="secondary" onClick={() => void reviewClaim(claim.id, 'HOLD')}>
                          Hold
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void reviewClaim(claim.id, 'REJECT')}>
                          Reject
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => void fulfillClaim(claim.id)}>
                          Mark Fulfilled
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No claims found yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
