import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useAppDialog } from '../../components/common/useAppDialog';
import api from '../../services/api';
import { getStoredUser, hasActionPermission, hasAnyActionPermission } from '../../utils/auth';

type SpiffConfig = {
  minRedeemPoints: number;
  pointsPerDollar: number;
  conversionDisplay: string;
  giftCardOptions: string[];
  giftbitConfigured: boolean;
  giftogramConfigured?: boolean;
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

type ClaimsResponse = {
  data: ClaimRow[];
  total: number;
  page: number;
  totalPages: number;
};

type ClaimStatusFilter = 'ALL' | 'PENDING_REVIEW' | 'HOLD' | 'APPROVED' | 'FULFILLED' | 'REJECTED';
type LeaderboardEntityFilter = 'COMPANIES' | 'REPS';
type SpiffPointAction = 'ADD' | 'REMOVE' | 'REDEEM';

type SalesRepOption = {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  userHandle?: string | null;
  email?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  company?: {
    id?: string | null;
    companyName?: string | null;
  } | null;
  branchId?: string | null;
  branchName?: string | null;
  branch?: {
    id?: string | null;
    name?: string | null;
  } | null;
};

type SpiffWalletSummary = SpiffSummary['wallet'];

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

const getSalesRepName = (rep: SalesRepOption) => {
  return rep.name?.trim() || rep.firstName?.trim() || rep.email?.trim() || 'Sales Rep';
};

const getSalesRepPersonName = (rep: SalesRepOption) => {
  const fullName = [rep.firstName, rep.lastName].filter(Boolean).join(' ').trim();
  return fullName || rep.email?.trim() || 'Sales Rep';
};

const getSalesRepHandle = (rep: SalesRepOption) => {
  return String(rep.userHandle || '').trim();
};

const getSalesRepCompanyId = (rep: SalesRepOption) =>
  String(rep.company?.id || rep.companyId || '').trim();

const getSalesRepCompanyName = (rep: SalesRepOption) =>
  String(rep.company?.companyName || rep.companyName || '').trim();

const getSalesRepBranchId = (rep: SalesRepOption) =>
  String(rep.branch?.id || rep.branchId || '').trim();

const getSalesRepBranchName = (rep: SalesRepOption) =>
  String(rep.branch?.name || rep.branchName || '').trim();

const getApiErrorMessage = (err: any, fallback: string) => {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) {
    return message.filter(Boolean).join(', ') || fallback;
  }
  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }
  return fallback;
};

const getDefaultScopeForRole = (
  role: string | null | undefined,
): 'MY_BRANCH' | 'MY_COMPANY' | 'GLOBAL' => {
  if (role === 'SUPER_ADMIN') return 'GLOBAL';
  if (role === 'INTERNAL_REP') return 'MY_COMPANY';
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
  if (role === 'INTERNAL_REP') {
    return [{ value: 'MY_COMPANY', label: 'My Companies' }];
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
  const [searchParams] = useSearchParams();
  const { showAlert: showAppAlert, confirm: confirmAppDialog, prompt: promptAppDialog, dialogNode } = useAppDialog();
  const claimCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const salesRepSearchRef = useRef<HTMLInputElement | null>(null);
  const salesRepDropdownRef = useRef<HTMLDivElement | null>(null);
  const adjustmentNoteRef = useRef<HTMLInputElement | null>(null);
  const user = useMemo(() => getStoredUser(), []);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCompanyAdmin = user?.role === 'COMPANY_ADMIN';
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<SpiffConfig | null>(null);
  const [summary, setSummary] = useState<SpiffSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [claimsTotal, setClaimsTotal] = useState(0);
  const [claimsTotalPages, setClaimsTotalPages] = useState(1);

  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ALL_TIME'>('MONTHLY');
  const [scope, setScope] = useState<'MY_BRANCH' | 'MY_COMPANY' | 'GLOBAL'>(() =>
    getDefaultScopeForRole(user?.role),
  );
  const [leaderboardEntity, setLeaderboardEntity] = useState<LeaderboardEntityFilter>('COMPANIES');
  const [leaderboardLimit, setLeaderboardLimit] = useState(10);
  const [globalRepLimit, setGlobalRepLimit] = useState(20);

  const [claimStatus, setClaimStatus] = useState<ClaimStatusFilter>('ALL');
  const [claimSearchInput, setClaimSearchInput] = useState('');
  const [claimSearch, setClaimSearch] = useState('');
  const [claimPage, setClaimPage] = useState(1);
  const [claimLimit, setClaimLimit] = useState(20);

  const [pointsPerDollarInput, setPointsPerDollarInput] = useState('');
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
  const [loadingSalesReps, setLoadingSalesReps] = useState(false);
  const [showRepFilters, setShowRepFilters] = useState(false);
  const [repCompanyFilters, setRepCompanyFilters] = useState<string[]>([]);
  const [repBranchFilters, setRepBranchFilters] = useState<string[]>([]);
  const [selectedSalesRepId, setSelectedSalesRepId] = useState('');
  const [salesRepDropdownOpen, setSalesRepDropdownOpen] = useState(false);
  const [salesRepSearch, setSalesRepSearch] = useState('');
  const [pointAction, setPointAction] = useState<SpiffPointAction>('ADD');
  const [adjustmentPoints, setAdjustmentPoints] = useState('');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [adjustmentErrors, setAdjustmentErrors] = useState<Record<string, string>>({});
  const [selectedRepWallet, setSelectedRepWallet] = useState<SpiffWalletSummary | null>(null);
  const [loadingSelectedRepWallet, setLoadingSelectedRepWallet] = useState(false);

  const canReviewClaim = user ? hasActionPermission(user, 'spiff.claim.review') : false;
  const canFulfillClaim = user ? hasActionPermission(user, 'spiff.claim.fulfill') : false;
  const canEditConfig = user ? hasActionPermission(user, 'spiff.config.edit') : false;
  const canViewLeaderboard = user ? hasAnyActionPermission(user, ['spiff.view', 'mobile.spiff.leaderboard.view']) : false;
  const canManageClaims = canReviewClaim || canFulfillClaim;
  const deepLinkedClaimId = searchParams.get('claimId');
  const deepLinkedClaimNumber = searchParams.get('claimNumber');
  const scopeOptions = useMemo(() => getScopeOptionsForRole(user?.role), [user?.role]);
  const canViewGlobalRepLeaderboard =
    scope === 'GLOBAL' && (isSuperAdmin || isCompanyAdmin);
  const showGlobalRepEntries = canViewGlobalRepLeaderboard && leaderboardEntity === 'REPS';

  const parsedPointsPerDollarInput = Math.max(1, Math.floor(Number(pointsPerDollarInput || 0)));
  const conversionPreviewPoints = Math.max(
    0,
    Number(summary?.wallet?.availablePoints || summary?.wallet?.totalEarnedPoints || 0),
  );
  const conversionPreviewAmount =
    Number.isFinite(parsedPointsPerDollarInput) && parsedPointsPerDollarInput > 0
      ? conversionPreviewPoints / parsedPointsPerDollarInput
      : 0;
  const repCompanyOptions = useMemo(() => {
    const optionMap = new Map<string, string>();
    salesReps.forEach((rep) => {
      const companyId = getSalesRepCompanyId(rep);
      if (companyId) {
        optionMap.set(companyId, getSalesRepCompanyName(rep) || 'Unnamed company');
      }
    });
    return Array.from(optionMap, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [salesReps]);
  const repBranchOptions = useMemo(() => {
    const optionMap = new Map<string, { id: string; name: string; companyId: string }>();
    salesReps.forEach((rep) => {
      const companyId = getSalesRepCompanyId(rep);
      const branchId = getSalesRepBranchId(rep);
      if (branchId) {
        optionMap.set(branchId, {
          id: branchId,
          name: getSalesRepBranchName(rep) || 'Unnamed branch',
          companyId,
        });
      }
    });
    return Array.from(optionMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [salesReps]);
  const filteredSalesReps = useMemo(
    () =>
      salesReps.filter((rep) => {
        const companyId = getSalesRepCompanyId(rep);
        const branchId = getSalesRepBranchId(rep);
        if (repCompanyFilters.length > 0 && (!companyId || !repCompanyFilters.includes(companyId))) return false;
        if (repBranchFilters.length > 0 && (!branchId || !repBranchFilters.includes(branchId))) return false;
        return true;
      }),
    [repBranchFilters, repCompanyFilters, salesReps],
  );
  const searchedSalesReps = useMemo(() => {
    const search = salesRepSearch.trim().toLowerCase();
    if (!search) return filteredSalesReps;
    return filteredSalesReps.filter((rep) => {
      const haystack = [
        getSalesRepName(rep),
        getSalesRepHandle(rep),
        rep.email,
        getSalesRepCompanyName(rep),
        getSalesRepBranchName(rep),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [filteredSalesReps, salesRepSearch]);
  const selectedSalesRep = useMemo(
    () => salesReps.find((rep) => rep.id === selectedSalesRepId) || null,
    [salesReps, selectedSalesRepId],
  );
  const adjustmentPointValue = Math.max(0, Math.floor(Number(adjustmentPoints || 0)));
  const currentAvailablePoints = Number(selectedRepWallet?.availablePoints || 0);
  const projectedAvailablePoints = selectedSalesRepId
    ? Math.max(
        0,
        currentAvailablePoints +
          (pointAction === 'ADD' ? adjustmentPointValue : -adjustmentPointValue),
      )
    : 0;
  const pointActionLabel = pointAction === 'ADD' ? 'add' : pointAction === 'REDEEM' ? 'redeem' : 'remove';
  const selectedFilterCount = repCompanyFilters.length + repBranchFilters.length;

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
            limit: leaderboardLimit,
            includeGlobalReps: showGlobalRepEntries ? true : undefined,
            repLimit: showGlobalRepEntries ? globalRepLimit : undefined,
          },
        }),
        api.get('/spiff/claims', {
          params: {
            page: claimPage,
            limit: claimLimit,
            status: claimStatus === 'ALL' ? undefined : claimStatus,
            q: claimSearch || undefined,
          },
        }),
      ]);

      const nextConfig = configRes.data as SpiffConfig;
      setConfig(nextConfig);
      setPointsPerDollarInput(String(nextConfig.pointsPerDollar || 100));
      setSummary(summaryRes.data as SpiffSummary);
      setLeaderboard(leaderboardRes.data as LeaderboardResponse);
      const claimsPayload = claimsRes.data as ClaimsResponse;
      setClaims((claimsPayload?.data || []) as ClaimRow[]);
      setClaimsTotal(Number(claimsPayload?.total || 0));
      setClaimsTotalPages(Math.max(1, Number(claimsPayload?.totalPages || 1)));

    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load SPIFF data');
    } finally {
      setLoading(false);
    }
  }, [
    claimLimit,
    claimPage,
    claimSearch,
    claimStatus,
    globalRepLimit,
    leaderboardLimit,
    period,
    scope,
    showGlobalRepEntries,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!canReviewClaim) {
      setSalesReps([]);
      return;
    }

    let isActive = true;
    const loadSalesReps = async () => {
      setLoadingSalesReps(true);
      try {
        const response = await api.get('/users/lookup', {
          params: { role: 'SALES_REP', status: 'ACTIVE' },
        });
        if (isActive) {
          setSalesReps((response.data || []) as SalesRepOption[]);
        }
      } catch {
        if (isActive) {
          setSalesReps([]);
        }
      } finally {
        if (isActive) {
          setLoadingSalesReps(false);
        }
      }
    };

    void loadSalesReps();
    return () => {
      isActive = false;
    };
  }, [canReviewClaim]);

  useEffect(() => {
    if (!deepLinkedClaimId && !deepLinkedClaimNumber) {
      return;
    }

    setClaimStatus('ALL');
    setClaimPage(1);

    const nextSearch = String(deepLinkedClaimNumber || '').trim();
    setClaimSearchInput(nextSearch);
    setClaimSearch(nextSearch);
  }, [deepLinkedClaimId, deepLinkedClaimNumber]);

  useEffect(() => {
    if (!canViewGlobalRepLeaderboard && leaderboardEntity === 'REPS') {
      setLeaderboardEntity('COMPANIES');
    }
  }, [canViewGlobalRepLeaderboard, leaderboardEntity]);

  useEffect(() => {
    if (!selectedSalesRepId || !canReviewClaim) {
      setSelectedRepWallet(null);
      setLoadingSelectedRepWallet(false);
      return;
    }

    let isActive = true;
    const loadSelectedRepWallet = async () => {
      setLoadingSelectedRepWallet(true);
      try {
        const response = await api.get(`/spiff/users/${selectedSalesRepId}/wallet`);
        if (isActive) {
          setSelectedRepWallet(response.data as SpiffWalletSummary);
        }
      } catch {
        if (isActive) {
          setSelectedRepWallet(null);
        }
      } finally {
        if (isActive) {
          setLoadingSelectedRepWallet(false);
        }
      }
    };

    void loadSelectedRepWallet();
    return () => {
      isActive = false;
    };
  }, [canReviewClaim, selectedSalesRepId]);

  useEffect(() => {
    if (claimPage > claimsTotalPages) {
      setClaimPage(claimsTotalPages);
    }
  }, [claimPage, claimsTotalPages]);

  useEffect(() => {
    const validBranchIds = new Set(repBranchOptions.map((branch) => branch.id));
    const nextBranchFilters = repBranchFilters.filter((branchId) => validBranchIds.has(branchId));
    if (nextBranchFilters.length !== repBranchFilters.length) {
      setRepBranchFilters(nextBranchFilters);
    }
  }, [repBranchFilters, repBranchOptions]);

  useEffect(() => {
    if (
      selectedSalesRepId &&
      !filteredSalesReps.some((rep) => rep.id === selectedSalesRepId)
    ) {
      setSelectedSalesRepId('');
    }
  }, [filteredSalesReps, selectedSalesRepId]);

  useEffect(() => {
    if (!salesRepDropdownOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && salesRepDropdownRef.current?.contains(target)) return;
      setSalesRepDropdownOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSalesRepDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [salesRepDropdownOpen]);

  const toggleCompanyFilter = (companyId: string) => {
    setRepCompanyFilters((current) =>
      current.includes(companyId)
        ? current.filter((id) => id !== companyId)
        : [...current, companyId],
    );
  };

  const toggleBranchFilter = (branchId: string) => {
    const branch = repBranchOptions.find((option) => option.id === branchId);
    setRepBranchFilters((current) =>
      current.includes(branchId)
        ? current.filter((id) => id !== branchId)
        : [...current, branchId],
    );
    if (branch?.companyId) {
      setRepCompanyFilters((current) =>
        current.includes(branch.companyId) ? current : [...current, branch.companyId],
      );
    }
  };

  const clearRepFilters = () => {
    setRepCompanyFilters([]);
    setRepBranchFilters([]);
  };

  const resetSalesRepFilter = () => {
    setSelectedSalesRepId('');
    setSalesRepSearch('');
    setSalesRepDropdownOpen(false);
    clearRepFilters();
    setAdjustmentErrors((current) => {
      const { salesRep: _salesRep, ...rest } = current;
      return rest;
    });
  };

  const applyRepFilters = () => {
    setShowRepFilters(false);
    setSalesRepDropdownOpen(true);
    window.requestAnimationFrame(() => salesRepSearchRef.current?.focus());
  };

  useEffect(() => {
    if (!claims.length || (!deepLinkedClaimId && !deepLinkedClaimNumber)) {
      return;
    }

    const matchedClaim = claims.find((claim) =>
      (deepLinkedClaimId && claim.id === deepLinkedClaimId) ||
      (deepLinkedClaimNumber && claim.claimNumber === deepLinkedClaimNumber),
    );

    if (!matchedClaim) return;

    window.requestAnimationFrame(() => {
      claimCardRefs.current[matchedClaim.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [claims, deepLinkedClaimId, deepLinkedClaimNumber]);

  const submitPointAdjustment = async () => {
    if (!canReviewClaim) return;

    const points = Math.floor(Number(adjustmentPoints || 0));
    const nextErrors: Record<string, string> = {};
    if (!selectedSalesRepId) {
      nextErrors.salesRep = 'Select a sales rep.';
    }
    if (!Number.isFinite(points) || points <= 0) {
      nextErrors.points = `Enter valid points to ${pointActionLabel}.`;
    }
    if (!adjustmentNote.trim()) {
      nextErrors.note = 'Enter notes for point update.';
    }
    setAdjustmentErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.note) {
        adjustmentNoteRef.current?.focus();
      }
      return;
    }

    const repLabel = selectedSalesRep
      ? getSalesRepHandle(selectedSalesRep) || getSalesRepName(selectedSalesRep)
      : 'selected sales rep';
    const confirmed = await confirmAppDialog(
      `Confirm ${pointAction} ${formatNumber(points)} points for ${repLabel}?\n\nAvailable: ${formatNumber(currentAvailablePoints)}\nNext: ${formatNumber(projectedAvailablePoints)}\n\nNotes: ${adjustmentNote.trim()}`,
      {
        title: 'Confirm Point Update',
        variant: pointAction === 'ADD' ? 'info' : 'warning',
        confirmLabel: 'Update Points',
        cancelLabel: 'Cancel',
      },
    );
    if (!confirmed) {
      return;
    }

    setSavingAdjustment(true);
    try {
      const response = await api.post('/spiff/claims', {
        userId: selectedSalesRepId,
        action: pointAction,
        requestedPoints: points,
        note: adjustmentNote.trim(),
      });
      if (response.data?.wallet) {
        setSelectedRepWallet(response.data.wallet as SpiffWalletSummary);
      }
      setAdjustmentPoints('');
      setAdjustmentNote('');
      setAdjustmentErrors({});
      setSelectedSalesRepId('');
      setSelectedRepWallet(null);
      setSalesRepSearch('');
      setSalesRepDropdownOpen(false);
      showAppAlert(`Points ${pointAction === 'ADD' ? 'added' : pointAction === 'REDEEM' ? 'redeemed' : 'removed'} successfully.`, {
        variant: 'success',
      });
      await loadData();
    } catch (err: any) {
      showAppAlert(getApiErrorMessage(err, 'Failed to update points'), { variant: 'error' });
    } finally {
      setSavingAdjustment(false);
    }
  };

  const savePointsPerDollar = async () => {
    if (!canEditConfig) return;
    const nextValue = Math.floor(Number(pointsPerDollarInput || 0));
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      showAppAlert('Enter a valid positive integer for points per $1.', { variant: 'warning' });
      return;
    }

    setSavingConfig(true);
    try {
      const response = await api.patch('/spiff/config', {
        pointsPerDollar: nextValue,
      });
      const nextConfig = response.data as SpiffConfig;
      setConfig(nextConfig);
      setPointsPerDollarInput(String(nextConfig.pointsPerDollar || nextValue));
      showAppAlert('SPIFF conversion rate updated successfully.', { variant: 'success' });
      await loadData();
    } catch (err: any) {
      showAppAlert(err?.response?.data?.message || 'Failed to update conversion rate', { variant: 'error' });
    } finally {
      setSavingConfig(false);
    }
  };

  const reviewClaim = async (claimId: string, action: 'APPROVE' | 'REJECT' | 'HOLD') => {
    if (!canReviewClaim) return;
    const reason =
      (await promptAppDialog(`Optional reason for ${action.toLowerCase()}:`, {
        title: 'Review claim',
        inputLabel: 'Reason',
        confirmLabel: action,
      })) || undefined;
    try {
      await api.patch(`/spiff/claims/${claimId}/review`, {
        action,
        reason,
      });
      await loadData();
    } catch (err: any) {
      showAppAlert(getApiErrorMessage(err, `Failed to ${action.toLowerCase()} claim`), { variant: 'error' });
    }
  };

  const fulfillClaim = async (claimId: string) => {
    if (!canFulfillClaim) return;
    const rewardLink = await promptAppDialog('Paste reward link/code shared with rep:', {
      title: 'Fulfill claim',
      inputLabel: 'Reward link or code',
      confirmLabel: 'Continue',
    });
    if (!rewardLink?.trim()) {
      return;
    }

    const note =
      (await promptAppDialog('Optional fulfillment note:', {
        title: 'Fulfillment note',
        inputLabel: 'Note',
        confirmLabel: 'Fulfill',
      })) || undefined;
    try {
      await api.patch(`/spiff/claims/${claimId}/fulfill`, {
        rewardLink: rewardLink.trim(),
        note,
      });
      await loadData();
    } catch (err: any) {
      showAppAlert(getApiErrorMessage(err, 'Failed to mark claim fulfilled'), { variant: 'error' });
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
            onChange={(event) => {
              setPeriod(event.target.value as 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ALL_TIME');
              setClaimPage(1);
            }}
          >
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ALL_TIME">All Time</option>
          </select>

          <select
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            value={scope}
            onChange={(event) => {
              const nextScope = event.target.value as 'MY_BRANCH' | 'MY_COMPANY' | 'GLOBAL';
              setScope(nextScope);
              setClaimPage(1);
              if (nextScope !== 'GLOBAL') {
                setLeaderboardEntity('COMPANIES');
              }
            }}
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

      {canEditConfig ? (
        <Card title="SPIFF Conversion Settings">
          <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/30 px-4 py-4">
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Points Per $1.00
            </label>

            <div className="flex max-w-[620px] flex-nowrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900"
                  value={pointsPerDollarInput}
                  onChange={(event) => setPointsPerDollarInput(event.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Current conversion: {config?.conversionDisplay || '100 points = $1'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Giftogram: {(config?.giftogramConfigured ?? config?.giftbitConfigured) ? 'Connected' : 'Not connected'} · Auto-fulfill:{' '}
                  {config?.autoFulfill ? 'On' : 'Off'}
                </p>
              </div>

              <button
                type="button"
                onClick={savePointsPerDollar}
                disabled={savingConfig || loading}
                className="inline-flex h-11 min-w-[132px] shrink-0 items-center justify-center rounded-xl bg-[#1F1A16] px-4 text-sm font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingConfig ? 'Saving...' : 'Update Rate'}
              </button>
            </div>

            <div className="mt-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              Preview: {formatNumber(conversionPreviewPoints)} pts ≈ {formatMoney(conversionPreviewAmount)}
            </div>
          </div>
        </Card>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {!isSuperAdmin ? (
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
      ) : null}

      {canReviewClaim ? (
        <Card
          title={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-[#251d17]">Update Points</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  Available:{' '}
                  {selectedSalesRepId
                    ? loadingSelectedRepWallet
                      ? '--'
                      : formatNumber(currentAvailablePoints)
                    : '--'}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800">
                  Next:{' '}
                  {selectedSalesRepId
                    ? loadingSelectedRepWallet
                      ? '--'
                      : formatNumber(projectedAvailablePoints)
                    : '--'}
                </span>
              </div>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.15fr_1.3fr_1.25fr_auto] xl:items-end">
              <div className="flex min-h-[68px] flex-col">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Sales Rep *
                </label>
                <div className="relative flex gap-2">
                  <div ref={salesRepDropdownRef} className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 text-left text-sm text-slate-900"
                      onClick={() => setSalesRepDropdownOpen((value) => !value)}
                      disabled={loadingSalesReps}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {loadingSalesReps
                          ? 'Loading sales reps...'
                          : selectedSalesRep
                          ? getSalesRepHandle(selectedSalesRep) || getSalesRepName(selectedSalesRep)
                          : 'Select sales rep'}
                      </span>
                      <span className="text-xs text-slate-500">{salesRepDropdownOpen ? '▲' : '▼'}</span>
                    </button>

                    {salesRepDropdownOpen ? (
                      <div className="absolute left-0 top-[46px] z-40 w-[calc(100%-48px)] rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="border-b border-slate-100 p-2">
                          <input
                            ref={salesRepSearchRef}
                            type="text"
                            className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#1F1A16]"
                            placeholder="Search sales rep"
                            value={salesRepSearch}
                            onChange={(event) => setSalesRepSearch(event.target.value)}
                          />
                        </div>
                        <div className="max-h-64 overflow-y-auto py-1">
                          {searchedSalesReps.length ? searchedSalesReps.map((rep) => {
                            const selected = rep.id === selectedSalesRepId;
                            const meta = [getSalesRepCompanyName(rep), getSalesRepBranchName(rep)].filter(Boolean).join(' / ');
                            const handle = getSalesRepHandle(rep);
                            return (
                              <button
                                key={rep.id}
                                type="button"
                                className={`block w-full px-3 py-2 text-left text-sm transition ${
                                  selected ? 'bg-slate-900 text-white' : 'text-slate-800 hover:bg-slate-50'
                                }`}
                                onClick={() => {
                                  setSelectedSalesRepId(rep.id);
                                  setSalesRepDropdownOpen(false);
                                  setSalesRepSearch('');
                                  setAdjustmentErrors((current) => {
                                    const { salesRep: _salesRep, ...rest } = current;
                                    return rest;
                                  });
                                }}
                              >
                                <span className="flex min-w-0 items-center justify-between gap-3">
                                  <span className="min-w-0 truncate font-semibold">{getSalesRepPersonName(rep)}</span>
                                  <span className={`shrink-0 text-xs font-bold ${selected ? 'text-slate-100' : 'text-[#9A6A2F]'}`}>
                                    {handle || rep.firstName || 'Sales Rep'}
                                  </span>
                                </span>
                                <span className={`block truncate text-xs ${selected ? 'text-slate-200' : 'text-slate-500'}`}>
                                  {meta || rep.email || '-'}
                                </span>
                              </button>
                            );
                          }) : (
                            <p className="px-3 py-4 text-center text-sm text-slate-500">
                              No sales reps found.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    title="Advanced filter"
                    aria-label="Advanced filter"
                    onClick={() => setShowRepFilters(true)}
                    className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                  >
                    <span className="block h-0 w-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-slate-700" />
                    <span className="absolute top-[22px] h-[7px] w-[3px] rounded-full bg-slate-700" />
                    {selectedFilterCount ? (
                      <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1F1A16] px-1 text-[10px] font-bold text-white">
                        {selectedFilterCount}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    title="Reset sales rep filter"
                    aria-label="Reset sales rep filter"
                    onClick={resetSalesRepFilter}
                    disabled={!selectedSalesRepId && selectedFilterCount === 0 && !salesRepSearch}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 11a8.1 8.1 0 0 0-15.5-2L3 11" />
                      <path d="M3 4v7h7" />
                      <path d="M4 13a8.1 8.1 0 0 0 15.5 2L21 13" />
                      <path d="M21 20v-7h-7" />
                    </svg>
                  </button>
                </div>
                <p className="mt-1 min-h-[16px] text-xs font-semibold text-rose-600">
                  {adjustmentErrors.salesRep || ''}
                </p>
              </div>

              <div className="flex min-h-[68px] flex-col">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Point to {pointActionLabel} *
                </label>
                <div className="flex h-10 overflow-hidden rounded-xl border border-slate-300 bg-white">
                  <select
                    className="w-[116px] shrink-0 border-r border-slate-300 bg-slate-50 px-3 text-xs font-bold uppercase text-slate-700 outline-none"
                    value={pointAction}
                    onChange={(event) => setPointAction(event.target.value as SpiffPointAction)}
                  >
                    {(['ADD', 'REMOVE', 'REDEEM'] as SpiffPointAction[]).map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="min-w-0 flex-1 px-3 text-sm outline-none"
                    placeholder="Points"
                    value={adjustmentPoints}
                    onChange={(event) => {
                      setAdjustmentPoints(event.target.value);
                      setAdjustmentErrors((current) => {
                        const { points: _points, ...rest } = current;
                        return rest;
                      });
                    }}
                  />
                </div>
                <p className="mt-1 min-h-[16px] text-xs font-semibold text-rose-600">
                  {adjustmentErrors.points || ''}
                </p>
              </div>

              <div className="flex min-h-[68px] flex-col">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes *
                </label>
                <input
                  ref={adjustmentNoteRef}
                  type="text"
                  className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
                  placeholder="Reason for point update"
                  value={adjustmentNote}
                  onChange={(event) => {
                    setAdjustmentNote(event.target.value);
                    setAdjustmentErrors((current) => {
                      const { note: _note, ...rest } = current;
                      return rest;
                    });
                  }}
                  required
                />
                <p className="mt-1 min-h-[16px] text-xs font-semibold text-rose-600">
                  {adjustmentErrors.note || ''}
                </p>
              </div>

              <Button
                type="button"
                onClick={submitPointAdjustment}
                disabled={savingAdjustment || loadingSalesReps || loading}
                className="mb-[17px]"
              >
                {savingAdjustment ? 'Updating...' : 'Update Points'}
              </Button>
            </div>

            {showRepFilters ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
                <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Advanced Filter</h2>
                      <p className="text-xs text-slate-500">Filter sales reps by one or more companies and branches.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRepFilters(false)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg leading-none text-slate-600 hover:bg-slate-50"
                    >
                      x
                    </button>
                  </div>

                  <div className="grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto px-5 py-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-700">Companies</p>
                      <div className="space-y-2">
                        {repCompanyOptions.length ? repCompanyOptions.map((company) => (
                          <label
                            key={company.id}
                            className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={repCompanyFilters.includes(company.id)}
                              onChange={() => toggleCompanyFilter(company.id)}
                            />
                            <span className="min-w-0 flex-1 truncate">{company.name}</span>
                          </label>
                        )) : (
                          <p className="rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-500">
                            No companies found.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-700">Branches</p>
                      <div className="space-y-2">
                        {repBranchOptions.length ? repBranchOptions.map((branch) => (
                          <label
                            key={branch.id}
                            className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={repBranchFilters.includes(branch.id)}
                              onChange={() => toggleBranchFilter(branch.id)}
                            />
                            <span className="min-w-0 flex-1 truncate">{branch.name}</span>
                          </label>
                        )) : (
                          <p className="rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-500">
                            No branches found.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
                    <p className="text-xs font-medium text-slate-500">
                      {selectedFilterCount ? `${selectedFilterCount} filters selected` : 'No filters selected'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={clearRepFilters}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={applyRepFilters}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-[#1F1A16] px-4 text-sm font-bold text-white hover:opacity-95"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {canViewLeaderboard ? (
        <Card title="Leaderboard">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">View</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
                value={canViewGlobalRepLeaderboard ? leaderboardEntity : 'COMPANIES'}
                onChange={(event) => {
                  setLeaderboardEntity(event.target.value as LeaderboardEntityFilter);
                }}
                disabled={!canViewGlobalRepLeaderboard}
              >
                <option value="COMPANIES">{scope === 'GLOBAL' ? 'Companies' : 'Sales Reps'}</option>
                {canViewGlobalRepLeaderboard ? <option value="REPS">Sales Reps</option> : null}
              </select>

              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
                value={showGlobalRepEntries ? globalRepLimit : leaderboardLimit}
                onChange={(event) => {
                  const nextLimit = Number(event.target.value);
                  if (showGlobalRepEntries) {
                    setGlobalRepLimit(nextLimit);
                  } else {
                    setLeaderboardLimit(nextLimit);
                  }
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {showGlobalRepEntries ? (
              (leaderboard?.globalRepEntries || []).length ? (
                (leaderboard?.globalRepEntries || []).map((rep) => (
                  <div key={rep.userId} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          #{rep.rank} {rep.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {rep.companyName || '-'} {rep.role ? `• ${rep.role}` : ''}
                        </p>
                      </div>
                      <p className="text-base font-bold text-slate-900">{formatNumber(rep.points)} pts</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No sales rep ranking data yet.</p>
              )
            ) : (leaderboard?.entries || []).length ? (
              (leaderboard?.entries || []).map((entry) => (
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
          </div>
        </Card>
        ) : null}

        <Card title={canManageClaims ? 'Claim Queue' : 'My Claims'}>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[auto_1fr_auto_auto] md:items-center">
                <select
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
                  value={claimStatus}
                  onChange={(event) => {
                    setClaimStatus(event.target.value as ClaimStatusFilter);
                    setClaimPage(1);
                  }}
                >
                  <option value="ALL">All statuses</option>
                  <option value="PENDING_REVIEW">Pending review</option>
                  <option value="HOLD">On hold</option>
                  <option value="APPROVED">Approved</option>
                  <option value="FULFILLED">Fulfilled</option>
                  <option value="REJECTED">Rejected</option>
                </select>

                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  placeholder="Search claim #, rep, company, branch..."
                  value={claimSearchInput}
                  onChange={(event) => setClaimSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      setClaimPage(1);
                      setClaimSearch(claimSearchInput.trim());
                    }
                  }}
                />

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setClaimPage(1);
                    setClaimSearch(claimSearchInput.trim());
                  }}
                >
                  Search
                </Button>

                <select
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
                  value={claimLimit}
                  onChange={(event) => {
                    setClaimLimit(Number(event.target.value));
                    setClaimPage(1);
                  }}
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>

            {claims.length ? (
              claims.map((claim) => {
                const statusStyle = STATUS_STYLES[claim.status] || 'bg-slate-100 text-slate-700 border border-slate-200';
                const actionable =
                  (canReviewClaim && ['PENDING_REVIEW', 'HOLD', 'APPROVED'].includes(claim.status)) ||
                  (canFulfillClaim && claim.status === 'APPROVED');
                const canRetryGiftbit = claim.status === 'APPROVED' && !claim.giftbitLinkUrl;
                const isDeepLinkedClaim =
                  (deepLinkedClaimId && claim.id === deepLinkedClaimId) ||
                  (deepLinkedClaimNumber && claim.claimNumber === deepLinkedClaimNumber);

                return (
                  <div
                    key={claim.id}
                    ref={(node) => {
                      claimCardRefs.current[claim.id] = node;
                    }}
                    className={`rounded-xl border bg-white px-4 py-3 shadow-sm transition ${
                      isDeepLinkedClaim
                        ? 'border-[#c89d5a] ring-2 ring-[#ead7b5]'
                        : 'border-slate-200'
                    }`}
                  >
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
                        {canReviewClaim && claim.status !== 'APPROVED' ? (
                          <Button size="sm" onClick={() => void reviewClaim(claim.id, 'APPROVE')}>
                            Approve
                          </Button>
                        ) : canReviewClaim && canRetryGiftbit ? (
                          <Button size="sm" onClick={() => void reviewClaim(claim.id, 'APPROVE')}>
                            Retry Auto Fulfill
                          </Button>
                        ) : null}
                        {canReviewClaim && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => void reviewClaim(claim.id, 'HOLD')}>
                              Hold
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => void reviewClaim(claim.id, 'REJECT')}>
                              Reject
                            </Button>
                          </>
                        )}
                        {canFulfillClaim && claim.status === 'APPROVED' ? (
                          <Button size="sm" variant="secondary" onClick={() => void fulfillClaim(claim.id)}>
                            Mark Fulfilled
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No claims found yet.</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p>
                Showing {claims.length} of {formatNumber(claimsTotal)} claims
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setClaimPage((prev) => Math.max(prev - 1, 1))}
                  disabled={claimPage <= 1 || loading}
                >
                  Prev
                </Button>
                <span className="min-w-[92px] text-center font-semibold text-slate-700">
                  Page {claimPage} / {claimsTotalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setClaimPage((prev) => Math.min(prev + 1, claimsTotalPages))}
                  disabled={claimPage >= claimsTotalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
      {dialogNode}
    </div>
  );
}
