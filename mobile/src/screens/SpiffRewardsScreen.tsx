import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  findNodeHandle,
  KeyboardAvoidingView,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  createSpiffPointAdjustment,
  createSpiffClaim,
  fetchSpiffActivity,
  fulfillSpiffClaim,
  fetchSpiffClaims,
  fetchSpiffConfig,
  fetchSpiffLeaderboard,
  fetchSpiffSummary,
  reviewSpiffClaim,
  type SpiffActivityItem,
  type SpiffClaim,
  type SpiffPointAdjustmentAction,
} from '../api/spiff';
import { fetchUserLookup, type LookupUser } from '../api/users';
import type { DashboardStackParamList } from '../navigation/RootNavigator';
import { hasActionPermission, hasAnyActionPermission } from '../utils/permissions';

const formatPoints = (value: number | null | undefined) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
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

const STATUS_BG: Record<string, string> = {
  PENDING_REVIEW: '#FFF4DF',
  HOLD: '#FFF0E6',
  APPROVED: '#E8F5EB',
  FULFILLED: '#EAF0FF',
  REJECTED: '#FDECEC',
};

const STATUS_TEXT: Record<string, string> = {
  PENDING_REVIEW: '#A7772D',
  HOLD: '#B36835',
  APPROVED: '#2D7A43',
  FULFILLED: '#2F4D8A',
  REJECTED: '#B23A3A',
};

const TIER_RATES = [
  { code: 'CLOSER', label: 'Starter', min: 0, max: 499, rate: 1.0 },
  { code: 'SHARP', label: 'Pro', min: 500, max: 1499, rate: 1.25 },
  { code: 'ELITE', label: 'Elite', min: 1500, max: 3999, rate: 1.5 },
  { code: 'LEGEND', label: 'Legend', min: 4000, max: null as number | null, rate: 2.0 },
] as const;

const getTierLabel = (code?: string | null, fallback?: string | null) =>
  TIER_RATES.find((tier) => tier.code === String(code || '').toUpperCase())?.label || fallback || 'Starter';

const SPIFF_PAGE_LIMIT = 15;
const SCROLL_LOAD_OFFSET = 260;

type SalesRepPanel = 'COMPANY_BOARD' | 'GLOBAL_BOARD' | 'REDEEM' | 'ACTIVITY';
type BranchManagerPanel = 'BRANCH_BOARD' | 'COMPANY_BOARD';
type CompanyAdminClaimFilter = 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'FULFILLED';
type RepFilterOption = { id: string; label: string };

const POINT_ACTION_OPTIONS: Array<{ key: SpiffPointAdjustmentAction; label: string }> = [
  { key: 'ADD', label: 'Add' },
  { key: 'REMOVE', label: 'Remove' },
];

const COMPANY_FILTER_STATUS: Record<CompanyAdminClaimFilter, string[] | null> = {
  ALL: null,
  PENDING_REVIEW: ['PENDING_REVIEW', 'HOLD'],
  APPROVED: ['APPROVED'],
  FULFILLED: ['FULFILLED'],
};

const formatClaimStatusLabel = (status: string) => {
  if (status === 'PENDING_REVIEW') return 'Pending';
  if (status === 'HOLD') return 'Hold';
  if (status === 'APPROVED') return 'Approved';
  if (status === 'FULFILLED') return 'Fulfilled';
  if (status === 'REJECTED') return 'Rejected';
  return status.replace(/_/g, ' ');
};

const formatClaimAge = (value: string | null | undefined) => {
  if (!value) return 'Just now';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return 'Just now';
  const diffMs = Date.now() - dt.getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isNearScrollBottom = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
  const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - SCROLL_LOAD_OFFSET;
};

const SpiffRewardsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<DashboardStackParamList, 'SpiffRewards'>>();
  const { token, user, refresh } = useAuth();
  const isSalesRep = user?.role === 'SALES_REP';
  const isBranchManager = user?.role === 'BRANCH_MANAGER';
  const isCompanyAdmin = user?.role === 'COMPANY_ADMIN';
  const canViewSpiff = hasAnyActionPermission(user, ['mobile.spiff.view', 'spiff.view']);
  const canCreateClaim = hasAnyActionPermission(user, ['mobile.spiff.claim.create', 'spiff.claim.create']);
  const canReviewClaim = hasAnyActionPermission(user, ['mobile.spiff.claim.review', 'spiff.claim.review']);
  const canFulfillClaim = hasActionPermission(user, 'spiff.claim.fulfill');
  const canViewLeaderboard = hasAnyActionPermission(user, ['mobile.spiff.leaderboard.view', 'spiff.view']);
  const canAdjustPoints = canReviewClaim;

  const salesRepScrollRef = useRef<ScrollView>(null);
  const companyAdminScrollRef = useRef<ScrollView>(null);
  const defaultScrollRef = useRef<ScrollView>(null);
  const salesRepPointsInputRef = useRef<TextInput>(null);
  const salesRepNoteInputRef = useRef<TextInput>(null);
  const companyAdminPointsInputRef = useRef<TextInput>(null);
  const companyAdminNoteInputRef = useRef<TextInput>(null);
  const defaultPointsInputRef = useRef<TextInput>(null);
  const defaultNoteInputRef = useRef<TextInput>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [summary, setSummary] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any>(null);
  const [claims, setClaims] = useState<SpiffClaim[]>([]);
  const [activity, setActivity] = useState<SpiffActivityItem[]>([]);
  const [claimsPage, setClaimsPage] = useState(1);
  const [claimsTotalPages, setClaimsTotalPages] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [loadingMoreClaims, setLoadingMoreClaims] = useState(false);
  const [loadingMoreActivity, setLoadingMoreActivity] = useState(false);
  const claimsLoadingRef = useRef(false);
  const activityLoadingRef = useRef(false);

  const [salesReps, setSalesReps] = useState<LookupUser[]>([]);
  const [selectedSalesRepId, setSelectedSalesRepId] = useState('');
  const [selectedPointAction, setSelectedPointAction] = useState<SpiffPointAdjustmentAction>('ADD');
  const [selectedRepCompanyId, setSelectedRepCompanyId] = useState('ALL');
  const [selectedRepBranchId, setSelectedRepBranchId] = useState('ALL');
  const [repDropdownOpen, setRepDropdownOpen] = useState(false);
  const [advancedRepFiltersOpen, setAdvancedRepFiltersOpen] = useState(false);
  const [requestedPoints, setRequestedPoints] = useState('');
  const [note, setNote] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccessVisible, setClaimSuccessVisible] = useState(false);
  const claimSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [salesRepPanel, setSalesRepPanel] = useState<SalesRepPanel>('REDEEM');
  const [branchManagerPanel, setBranchManagerPanel] = useState<BranchManagerPanel>('BRANCH_BOARD');
  const [companyFilter, setCompanyFilter] = useState<CompanyAdminClaimFilter>('ALL');
  const [claimActionId, setClaimActionId] = useState<string | null>(null);
  const deepLinkedClaimId = route.params?.claimId;
  const deepLinkedClaimNumber = route.params?.claimNumber;
  const initialPanel = route.params?.initialPanel;
  const minRedeemPoints = Number(config?.minRedeemPoints || 500);

  const handleRequestedPointsChange = useCallback((value: string) => {
    setRequestedPoints(value);
    setClaimError(null);
  }, []);

  const isDeepLinkedClaim = useCallback(
    (claim: Pick<SpiffClaim, 'id' | 'claimNumber'>) =>
      (deepLinkedClaimId && claim.id === deepLinkedClaimId) ||
      (deepLinkedClaimNumber && claim.claimNumber === deepLinkedClaimNumber),
    [deepLinkedClaimId, deepLinkedClaimNumber],
  );

  const load = useCallback(async (silent = false) => {
    if (!token || !canViewSpiff) return;
    if (!silent) setLoading(true);
    claimsLoadingRef.current = false;
    activityLoadingRef.current = false;
    setLoadingMoreClaims(false);
    setLoadingMoreActivity(false);

    try {
      const [configRes, summaryRes, leaderboardRes, claimsRes, activityRes, salesRepsRes] = await Promise.all([
        fetchSpiffConfig(token),
        fetchSpiffSummary(token),
        canViewLeaderboard
          ? fetchSpiffLeaderboard(token, {
              scope:
                user?.role === 'SUPER_ADMIN'
                  ? 'GLOBAL'
                  : user?.role === 'COMPANY_ADMIN'
                    ? 'MY_COMPANY'
                    : user?.role === 'SALES_REP'
                      ? 'MY_COMPANY'
                      : 'MY_BRANCH',
              period: user?.role === 'SALES_REP' ? 'ALL_TIME' : 'MONTHLY',
              limit: 10,
            })
          : Promise.resolve(null),
        fetchSpiffClaims(token, 1, SPIFF_PAGE_LIMIT),
        fetchSpiffActivity(token, 1, SPIFF_PAGE_LIMIT),
        canAdjustPoints
          ? fetchUserLookup(token, { role: 'SALES_REP', status: 'ACTIVE' }).catch(() => [])
          : Promise.resolve([]),
      ]);
      let secondaryBoardRes: any = null;
      if (canViewLeaderboard && user?.role === 'SALES_REP') {
        try {
          secondaryBoardRes = await fetchSpiffLeaderboard(token, {
            scope: 'GLOBAL',
            period: 'ALL_TIME',
            limit: 10,
          });
        } catch {
          secondaryBoardRes = null;
        }
      } else if (canViewLeaderboard && user?.role === 'BRANCH_MANAGER') {
        try {
          secondaryBoardRes = await fetchSpiffLeaderboard(token, {
            scope: 'MY_COMPANY',
            period: 'MONTHLY',
            limit: 10,
          });
        } catch {
          secondaryBoardRes = null;
        }
      }

      setConfig(configRes);
      setSummary(summaryRes);
      setLeaderboard(leaderboardRes);
      setGlobalLeaderboard(secondaryBoardRes);
      setClaims(claimsRes.data || []);
      setClaimsPage(Number(claimsRes.page || 1));
      setClaimsTotalPages(Math.max(1, Number(claimsRes.totalPages || 1)));
      setActivity(activityRes.data || []);
      setActivityPage(Number(activityRes.page || 1));
      setActivityTotalPages(Math.max(1, Number(activityRes.totalPages || 1)));
      setSalesReps(salesRepsRes || []);
    } catch (error: any) {
      Alert.alert('SPIFF', error?.message || 'Unable to load SPIFF data right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, canViewSpiff, canViewLeaderboard, canAdjustPoints, user?.role]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch {
      // Keep the refresh gesture usable if the profile call is temporarily unavailable.
    }
    load(true);
  }, [load, refresh]);

  const refreshSpiff = useCallback(() => {
    if (refreshing || loading) return;
    onRefresh();
  }, [loading, onRefresh, refreshing]);

  const focusSpiffInput = useCallback((target: 'salesRep' | 'companyAdmin' | 'default', inputRef: React.RefObject<TextInput | null>) => {
    const scrollRef = target === 'salesRep' ? salesRepScrollRef : target === 'companyAdmin' ? companyAdminScrollRef : defaultScrollRef;
    const inputHandle = findNodeHandle(inputRef.current);
    if (!inputHandle) return;

    setTimeout(() => {
      scrollRef.current
        ?.getScrollResponder()
        ?.scrollResponderScrollNativeHandleToKeyboard(inputHandle, 18, true);
    }, Platform.OS === 'android' ? 280 : 80);
  }, []);
  const loadMoreClaims = useCallback(async () => {
    if (!token || claimsLoadingRef.current || claimsPage >= claimsTotalPages) return;
    claimsLoadingRef.current = true;
    setLoadingMoreClaims(true);
    try {
      const nextPage = claimsPage + 1;
      const response = await fetchSpiffClaims(token, nextPage, SPIFF_PAGE_LIMIT);
      setClaims((current) => {
        const seen = new Set(current.map((claim) => claim.id));
        return current.concat((response.data || []).filter((claim) => !seen.has(claim.id)));
      });
      setClaimsPage(Number(response.page || nextPage));
      setClaimsTotalPages(Math.max(1, Number(response.totalPages || claimsTotalPages)));
    } catch (error: any) {
      Alert.alert('SPIFF', error?.message || 'Unable to load more claims right now.');
    } finally {
      claimsLoadingRef.current = false;
      setLoadingMoreClaims(false);
    }
  }, [token, claimsPage, claimsTotalPages]);

  const loadMoreActivity = useCallback(async () => {
    if (!token || activityLoadingRef.current || activityPage >= activityTotalPages) return;
    activityLoadingRef.current = true;
    setLoadingMoreActivity(true);
    try {
      const nextPage = activityPage + 1;
      const response = await fetchSpiffActivity(token, nextPage, SPIFF_PAGE_LIMIT);
      setActivity((current) => {
        const seen = new Set(current.map((item) => item.id));
        return current.concat((response.data || []).filter((item) => !seen.has(item.id)));
      });
      setActivityPage(Number(response.page || nextPage));
      setActivityTotalPages(Math.max(1, Number(response.totalPages || activityTotalPages)));
    } catch (error: any) {
      Alert.alert('SPIFF', error?.message || 'Unable to load more history right now.');
    } finally {
      activityLoadingRef.current = false;
      setLoadingMoreActivity(false);
    }
  }, [token, activityPage, activityTotalPages]);

  const handleSalesRepScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isNearScrollBottom(event)) return;
    if (salesRepPanel === 'ACTIVITY') {
      loadMoreActivity();
    } else if (salesRepPanel === 'REDEEM') {
      loadMoreClaims();
    }
  }, [salesRepPanel, loadMoreActivity, loadMoreClaims]);

  const handleClaimsScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isNearScrollBottom(event)) {
      loadMoreClaims();
    }
  }, [loadMoreClaims]);

  React.useEffect(() => {
    if (initialPanel) {
      if (isSalesRep && ['COMPANY_BOARD', 'GLOBAL_BOARD', 'REDEEM', 'ACTIVITY'].includes(initialPanel)) {
        setSalesRepPanel(initialPanel as SalesRepPanel);
      }
    } else if (deepLinkedClaimId || deepLinkedClaimNumber) {
      if (isSalesRep) {
        setSalesRepPanel('ACTIVITY');
      }
      if (isCompanyAdmin) {
        setCompanyFilter('ALL');
      }
    }
  }, [initialPanel, deepLinkedClaimId, deepLinkedClaimNumber, isCompanyAdmin, isSalesRep]);

  React.useEffect(() => {
    if (!isSalesRep) return;
    if (salesRepPanel === 'REDEEM' && !canCreateClaim) {
      setSalesRepPanel('ACTIVITY');
    }
    if ((salesRepPanel === 'COMPANY_BOARD' || salesRepPanel === 'GLOBAL_BOARD') && !canViewLeaderboard) {
      setSalesRepPanel(canCreateClaim ? 'REDEEM' : 'ACTIVITY');
    }
  }, [isSalesRep, salesRepPanel, canCreateClaim, canViewLeaderboard]);

  const submitClaim = useCallback(async () => {
    if (!token || !canCreateClaim) return;

    const points = Math.round(Number(requestedPoints || 0) * 100) / 100;
    if (!Number.isFinite(points) || points <= 0) {
      const message = 'Enter valid points to redeem.';
      setClaimError(message);
      Alert.alert('Unable to submit claim', message);
      return;
    }
    if (points < minRedeemPoints) {
      const message = `You must redeem a minimum of ${formatPoints(minRedeemPoints)} points.`;
      setClaimError(message);
      Alert.alert('Minimum redemption required', message);
      return;
    }

    setClaimError(null);
    setSubmitting(true);
    try {
      await createSpiffClaim(token, {
        requestedPoints: points,
        note: note.trim() || undefined,
      });
      setRequestedPoints('');
      setNote('');
      setClaimError(null);
      await load(true);
      setClaimSuccessVisible(true);
      if (claimSuccessTimerRef.current) clearTimeout(claimSuccessTimerRef.current);
      claimSuccessTimerRef.current = setTimeout(() => {
        setClaimSuccessVisible(false);
        claimSuccessTimerRef.current = null;
      }, 2800);
    } catch (error: any) {
      const message = error?.message || 'Unable to submit claim right now.';
      setClaimError(message);
      Alert.alert('SPIFF', message);
    } finally {
      setSubmitting(false);
    }
  }, [token, canCreateClaim, requestedPoints, minRedeemPoints, note, load]);

  useEffect(() => () => {
    if (claimSuccessTimerRef.current) clearTimeout(claimSuccessTimerRef.current);
  }, []);

  const submitPointAdjustment = useCallback(async () => {
    if (!token || !canAdjustPoints) return;
    if (!selectedSalesRepId) {
      const message = 'Select a sales rep.';
      setClaimError(message);
      Alert.alert('Unable to update points', message);
      return;
    }

    const points = Math.round(Number(requestedPoints || 0) * 100) / 100;
    if (!Number.isFinite(points) || points <= 0) {
      const message = 'Enter valid points.';
      setClaimError(message);
      Alert.alert('Unable to update points', message);
      return;
    }

    const selectedRepForConfirm = salesReps.find((rep) => rep.id === selectedSalesRepId);
    const repName =
      String(selectedRepForConfirm?.userHandle || '').trim() ||
      (selectedRepForConfirm?.id ? `User #${selectedRepForConfirm.id}` : 'User handle not set');
    Alert.alert(
      'Confirm update',
      `Confirm ${selectedPointAction} ${formatPoints(points)} points for ${repName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update Points',
          onPress: async () => {
            setClaimError(null);
            setSubmitting(true);
            try {
              await createSpiffPointAdjustment(token, {
                userId: selectedSalesRepId,
                action: selectedPointAction,
                points,
                note: note.trim() || undefined,
              });
              setRequestedPoints('');
              setNote('');
              setClaimError(null);
              await load(true);
              Alert.alert('Points updated', `${selectedPointAction === 'REMOVE' ? 'Removed' : selectedPointAction === 'REDEEM' ? 'Redeemed' : 'Added'} ${formatPoints(points)} points.`);
            } catch (error: any) {
              const message = error?.message || 'Unable to update points right now.';
              setClaimError(message);
              Alert.alert('SPIFF', message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }, [token, canAdjustPoints, selectedSalesRepId, requestedPoints, selectedPointAction, note, load, salesReps]);

  const nextTierHint = useMemo(() => {
    const nextTierAt = Number(summary?.tier?.nextTierAt || 0);
    const totalEarned = Number(summary?.wallet?.totalEarnedPoints || 0);
    if (!nextTierAt || nextTierAt <= totalEarned) {
      return 'Top tier unlocked';
    }
    return `${formatPoints(nextTierAt - totalEarned)} pts to next tier`;
  }, [summary?.tier?.nextTierAt, summary?.wallet?.totalEarnedPoints]);

  const spiffDisplayName = useMemo(() => {
    return String(summary?.userHandle || user?.userHandle || '').trim()
      || (user?.id ? `User #${user.id}` : 'User handle not set');
  }, [summary?.userHandle, user?.id, user?.userHandle]);

  const initials = useMemo(() => {
    return spiffDisplayName.slice(0, 2).toUpperCase();
  }, [spiffDisplayName]);

  const totalPoints = Number(summary?.wallet?.totalEarnedPoints || 0);
  const lockedPoints = Number(summary?.wallet?.lockedPoints || 0);
  const redeemablePoints = Number(summary?.wallet?.availablePoints || 0);
  const redeemedPoints = Number(summary?.wallet?.fulfilledClaimedPoints || 0);
  const pointsPerDollar = Number(config?.pointsPerDollar || 100);
  const redeemableAmount = pointsPerDollar > 0 ? redeemablePoints / pointsPerDollar : 0;
  const currentRank = Number(leaderboard?.myRank?.rank || 0);
  const nextTierAt = Number(summary?.tier?.nextTierAt || 0);
  const progressGoal = nextTierAt > 0 ? nextTierAt : Math.max(totalPoints, 1);
  const progressRatio = Math.max(0, Math.min(totalPoints / progressGoal, 1));
  const pointsToNext = Math.max(0, nextTierAt - totalPoints);
  const tierCode = String(summary?.tier?.code || '').toUpperCase();
  const tierLabel = getTierLabel(tierCode, summary?.tier?.label);
  const tierBadge = summary?.tier?.badge || '🥉';
  const hasGlobalBoardRows = (globalLeaderboard?.entries || []).length > 0;
  const globalBoardScope = String(globalLeaderboard?.scope || '').toUpperCase();
  const filteredCompanyClaims = useMemo(() => {
    const allowed = COMPANY_FILTER_STATUS[companyFilter];
    if (!allowed) return claims;
    return claims.filter((claim) => allowed.includes(String(claim.status || '').toUpperCase()));
  }, [claims, companyFilter]);
  const companyPendingClaims = useMemo(
    () => claims.filter((claim) => ['PENDING_REVIEW', 'HOLD'].includes(String(claim.status || '').toUpperCase())),
    [claims],
  );
  const companyApprovedClaims = useMemo(
    () => claims.filter((claim) => String(claim.status || '').toUpperCase() === 'APPROVED'),
    [claims],
  );
  const companyApprovedThisMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return claims.filter((claim) => {
      const status = String(claim.status || '').toUpperCase();
      if (!['APPROVED', 'FULFILLED'].includes(status)) return false;
      const dt = new Date(claim.updatedAt || claim.createdAt);
      return !Number.isNaN(dt.getTime()) && dt.getFullYear() === y && dt.getMonth() === m;
    }).length;
  }, [claims]);
  const companyPendingValue = useMemo(
    () => companyPendingClaims.reduce((sum, claim) => sum + Number(claim.requestedAmount || 0), 0),
    [companyPendingClaims],
  );
  const repPointsByUserId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of leaderboard?.entries || []) {
      const key = String(row?.entityId || '').trim();
      if (!key) continue;
      map.set(key, Number(row?.points || 0));
    }
    return map;
  }, [leaderboard?.entries]);
  const repCompanyOptions = useMemo<RepFilterOption[]>(() => {
    const map = new Map<string, string>();
    salesReps.forEach((rep) => {
      const id = String(rep.company?.id || rep.companyId || '').trim();
      const label = String(rep.company?.companyName || rep.companyName || '').trim();
      if (id && label) map.set(id, label);
    });
    return [{ id: 'ALL', label: 'All Companies' }, ...Array.from(map, ([id, label]) => ({ id, label }))];
  }, [salesReps]);
  const repBranchOptions = useMemo<RepFilterOption[]>(() => {
    const map = new Map<string, string>();
    salesReps.forEach((rep) => {
      const companyId = String(rep.company?.id || rep.companyId || '').trim();
      if (selectedRepCompanyId !== 'ALL' && companyId !== selectedRepCompanyId) return;
      const id = String(rep.branch?.id || rep.branchId || '').trim();
      const label = String(rep.branch?.name || rep.branchName || '').trim();
      if (id && label) map.set(id, label);
    });
    return [{ id: 'ALL', label: 'All Branches' }, ...Array.from(map, ([id, label]) => ({ id, label }))];
  }, [salesReps, selectedRepCompanyId]);
  const filteredSalesReps = useMemo(() => {
    return salesReps.filter((rep) => {
      const companyId = String(rep.company?.id || rep.companyId || '').trim();
      const branchId = String(rep.branch?.id || rep.branchId || '').trim();
      if (selectedRepCompanyId !== 'ALL' && companyId !== selectedRepCompanyId) return false;
      if (selectedRepBranchId !== 'ALL' && branchId !== selectedRepBranchId) return false;
      return true;
    });
  }, [salesReps, selectedRepBranchId, selectedRepCompanyId]);
  const selectedSalesRep = useMemo(
    () => salesReps.find((rep) => rep.id === selectedSalesRepId) || null,
    [salesReps, selectedSalesRepId],
  );
  const getRepHandle = useCallback((rep: any) => String(rep?.userHandle || '').trim(), []);
  const getRepPersonName = useCallback((rep: any) => {
    return getRepHandle(rep) || (rep?.id ? `User #${rep.id}` : 'User handle not set');
  }, [getRepHandle]);
  const getRepSpiffName = useCallback((rep: any) => {
    return getRepHandle(rep) || (rep?.id ? `User #${rep.id}` : 'User handle not set');
  }, [getRepHandle]);

  React.useEffect(() => {
    if (selectedRepBranchId === 'ALL') return;
    if (!repBranchOptions.some((option) => option.id === selectedRepBranchId)) {
      setSelectedRepBranchId('ALL');
    }
  }, [repBranchOptions, selectedRepBranchId]);

  React.useEffect(() => {
    if (!selectedSalesRepId) return;
    if (!filteredSalesReps.some((rep) => rep.id === selectedSalesRepId)) {
      setSelectedSalesRepId('');
    }
  }, [filteredSalesReps, selectedSalesRepId]);

  const renderPointAdjustmentForm = () => {
    if (!canAdjustPoints) return null;
    const repLabel = selectedSalesRep
      ? getRepSpiffName(selectedSalesRep)
      : 'Select Sales Rep';
    const repMeta = selectedSalesRep
      ? [selectedSalesRep.company?.companyName || selectedSalesRep.companyName, selectedSalesRep.branch?.name || selectedSalesRep.branchName]
          .filter(Boolean)
          .join(' - ')
      : '';

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Update Points</Text>
        <Text style={styles.sectionSub}>Select a sales rep, action, and point amount</Text>

        <TouchableOpacity
          style={styles.advancedToggle}
          activeOpacity={0.85}
          onPress={() => setAdvancedRepFiltersOpen((value) => !value)}
        >
          <Text style={styles.advancedToggleText}>Advanced Filter</Text>
          <Ionicons name={advancedRepFiltersOpen ? 'chevron-up' : 'chevron-down'} size={15} color="#6E6258" />
        </TouchableOpacity>

        {advancedRepFiltersOpen ? (
          <>
            <Text style={styles.fieldLabel}>Company</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adjustmentChipRow}>
              {repCompanyOptions.map((option) => {
                const selected = selectedRepCompanyId === option.id;
                return (
                  <TouchableOpacity
                    key={`rep-company-${option.id}`}
                    style={[styles.adjustmentChip, selected ? styles.adjustmentChipActive : null]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedRepCompanyId(option.id);
                      setSelectedRepBranchId('ALL');
                    }}
                  >
                    <Text style={[styles.adjustmentChipText, selected ? styles.adjustmentChipTextActive : null]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Branch</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adjustmentChipRow}>
              {repBranchOptions.map((option) => {
                const selected = selectedRepBranchId === option.id;
                return (
                  <TouchableOpacity
                    key={`rep-branch-${option.id}`}
                    style={[styles.adjustmentChip, selected ? styles.adjustmentChipActive : null]}
                    activeOpacity={0.85}
                    onPress={() => setSelectedRepBranchId(option.id)}
                  >
                    <Text style={[styles.adjustmentChipText, selected ? styles.adjustmentChipTextActive : null]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <Text style={styles.fieldLabel}>Sales Rep</Text>
        <TouchableOpacity
          style={[styles.dropdownButton, !selectedSalesRepId && claimError ? styles.inputError : null]}
          activeOpacity={0.85}
          onPress={() => setRepDropdownOpen((value) => !value)}
        >
          <View style={styles.dropdownTextWrap}>
            <Text style={styles.dropdownValue} numberOfLines={1}>{repLabel}</Text>
            {repMeta ? <Text style={styles.dropdownMeta} numberOfLines={1}>{repMeta}</Text> : null}
          </View>
          <Ionicons name={repDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#6E6258" />
        </TouchableOpacity>

        {repDropdownOpen ? (
          <View style={styles.dropdownList}>
            {filteredSalesReps.length ? (
              filteredSalesReps.map((rep) => {
                const selected = rep.id === selectedSalesRepId;
                const name = getRepPersonName(rep);
                const handle = getRepHandle(rep) || 'User handle not set';
                const meta = [rep.company?.companyName || rep.companyName, rep.branch?.name || rep.branchName].filter(Boolean).join(' - ');
                return (
                  <TouchableOpacity
                    key={rep.id}
                    style={[styles.dropdownOption, selected ? styles.dropdownOptionActive : null]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedSalesRepId(rep.id);
                      setRepDropdownOpen(false);
                      setClaimError(null);
                    }}
                  >
                    <View style={styles.dropdownTextWrap}>
                      <View style={styles.dropdownOptionNameRow}>
                        <Text style={[styles.dropdownOptionText, selected ? styles.dropdownOptionTextActive : null]} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={[styles.dropdownOptionHandle, selected ? styles.dropdownOptionTextActive : null]} numberOfLines={1}>
                          {handle}
                        </Text>
                      </View>
                      {meta ? <Text style={styles.dropdownMeta} numberOfLines={1}>{meta}</Text> : null}
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={16} color="#9C7127" /> : null}
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.emptyText}>No sales reps found for this filter.</Text>
            )}
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>Action</Text>
        <View style={styles.actionSegment}>
          {POINT_ACTION_OPTIONS.map((option) => {
            const selected = selectedPointAction === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.actionSegmentBtn, selected ? styles.actionSegmentBtnActive : null]}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedPointAction(option.key);
                  setClaimError(null);
                }}
              >
                <Text style={[styles.actionSegmentText, selected ? styles.actionSegmentTextActive : null]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Point to {selectedPointAction.toLowerCase()}</Text>
        <View style={styles.pointsActionRow}>
          <TouchableOpacity style={styles.pointsActionPrefix} activeOpacity={0.85}>
            <Text style={styles.pointsActionPrefixText}>{selectedPointAction}</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.pointsInput, claimError && styles.inputError]}
            keyboardType="decimal-pad"
            placeholder="Points"
            placeholderTextColor="#9F978F"
            value={requestedPoints}
            onChangeText={handleRequestedPointsChange}
          />
        </View>
        {claimError ? <Text style={styles.claimErrorText}>{claimError}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Notes (optional)"
          placeholderTextColor="#9F978F"
          value={note}
          onChangeText={setNote}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, submitting ? styles.primaryBtnDisabled : null]}
          onPress={submitPointAdjustment}
          disabled={submitting}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryBtnText}>{submitting ? 'Updating...' : 'Update Points'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const runClaimReviewAction = useCallback(async (claimId: string, action: 'APPROVE' | 'HOLD' | 'REJECT') => {
    if (!token || !canReviewClaim) return;
    try {
      setClaimActionId(claimId);
      await reviewSpiffClaim(token, claimId, { action });
      await load(true);
    } catch (error: any) {
      Alert.alert('SPIFF', error?.message || 'Unable to update claim right now.');
    } finally {
      setClaimActionId(null);
    }
  }, [token, canReviewClaim, load]);

  const runClaimFulfillAction = useCallback(async (claim: SpiffClaim) => {
    if (!token || !canFulfillClaim) return;
    try {
      setClaimActionId(claim.id);
      await fulfillSpiffClaim(token, claim.id, {
        rewardLink: claim.giftbitLinkUrl || undefined,
      });
      await load(true);
    } catch (error: any) {
      Alert.alert('SPIFF', error?.message || 'Unable to mark claim as fulfilled right now.');
    } finally {
      setClaimActionId(null);
    }
  }, [token, canFulfillClaim, load]);

  const renderActivityCard = useCallback((item: SpiffActivityItem) => {
    const earned = item.type === 'EARNED';
    const status = String(item.claimStatus || '').toUpperCase();
    const badgeBg = earned ? '#E8F5EB' : STATUS_BG[status] || '#F4F4F4';
    const badgeText = earned ? '#2D7A43' : STATUS_TEXT[status] || '#666';
    const pointsLabel = `${earned ? '+' : '-'}${formatPoints(Math.abs(Number(item.points || 0)))} pts`;
    const amount = earned ? Number(item.orderAmount || 0) : Number(item.requestedAmount || 0);

    return (
      <View key={item.id} style={styles.claimCard}>
        <View style={styles.claimTopRow}>
          <Text style={styles.claimNumber}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.statusBadgeText, { color: badgeText }]}>{earned ? 'EARNED' : String(item.claimStatus || 'CLAIM').replace(/_/g, ' ')}</Text>
          </View>
        </View>

        <Text style={styles.claimMeta}>
          {pointsLabel} - {formatMoney(amount)} - {formatClaimAge(item.createdAt)}
        </Text>
        {item.subtitle ? <Text style={styles.claimNote}>{item.subtitle}</Text> : null}
        {earned && item.orderNumber ? (
          <Text style={styles.claimNote}>
            Order No. {item.orderNumber}{item.orderStatus ? ` - ${String(item.orderStatus).replace(/_/g, ' ')}` : ''}
          </Text>
        ) : null}
        {!earned && item.reviewReason ? <Text style={styles.claimNote}>Note: {item.reviewReason}</Text> : null}
        {!earned && item.giftbitLinkUrl ? (
          <TouchableOpacity onPress={() => Linking.openURL(item.giftbitLinkUrl as string)} style={styles.linkBtn}>
            <Text style={styles.linkBtnText}>Open reward link</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, []);

  if (!canViewSpiff) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>SPIFF Rewards</Text>
            <Text style={styles.emptyText}>You do not have permission to view SPIFF rewards.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (isSalesRep) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.srHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.srBackBtn} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={18} color="#8D8276" />
            </TouchableOpacity>
            <Text allowFontScaling={false} style={styles.srHeaderTitle}>Spiff Dashboard</Text>
            <View style={styles.srHeaderActions}>
              <TouchableOpacity style={styles.srRefreshBtn} onPress={refreshSpiff} disabled={refreshing || loading} activeOpacity={0.85}>
                <Ionicons name="refresh-outline" size={17} color={refreshing || loading ? '#BBAFA4' : '#8D8276'} />
              </TouchableOpacity>
              <View style={styles.srAvatarChip}>
                <Text allowFontScaling={false} style={styles.srAvatarChipText}>{initials}</Text>
              </View>
            </View>
          </View>

          <KeyboardAvoidingView
            style={styles.keyboardAvoider}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              ref={salesRepScrollRef}
              style={styles.scroll}
              contentContainerStyle={styles.srContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
              onScroll={handleSalesRepScroll}
              scrollEventThrottle={16}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A67F3F" />}
            >
            <View style={styles.srHeroCard}>
              <Text allowFontScaling={false} style={styles.srHeroEyebrow}>YOUR SPIFF PROFILE</Text>
              <View style={styles.srHeroTitleRow}>
                <Text allowFontScaling={false} style={styles.srHeroBadge}>{tierBadge}</Text>
                <Text allowFontScaling={false} numberOfLines={1} style={styles.srHeroTitle}>{tierLabel}</Text>
              </View>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.srHeroName}>{`${spiffDisplayName} · ${user?.branchName || user?.companyName || '-'}`}</Text>

              <View style={styles.srHeroStatsRow}>
                <View style={styles.srHeroStatBox}>
                  <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={styles.srHeroStatValue}>{formatPoints(totalPoints)}</Text>
                  <Text allowFontScaling={false} style={styles.srHeroStatLabel}>Total Pts</Text>
                </View>
                <View style={styles.srHeroStatBox}>
                  <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={styles.srHeroStatValue}>{formatPoints(lockedPoints)}</Text>
                  <Text allowFontScaling={false} style={styles.srHeroStatLabel}>Locked Pts</Text>
                </View>
                <View style={styles.srHeroStatBox}>
                  <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={styles.srHeroStatValue}>{formatMoney(redeemableAmount)}</Text>
                  <Text allowFontScaling={false} style={styles.srHeroStatLabel}>Redeemable</Text>
                </View>
              </View>

              <Text allowFontScaling={false} numberOfLines={1} style={styles.srHeroHint}>
                ⚡ {tierLabel} award rate: {TIER_RATES.find((row) => row.code === tierCode)?.rate.toFixed(2) || '1.00'}x
                {' · '}Redeemable {formatPoints(redeemablePoints)} pts
                {' ≈ '}
                {formatMoney(redeemableAmount)}
              </Text>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.srHeroHint}>
                Redeemed so far: {formatPoints(redeemedPoints)} pts
              </Text>
            </View>

            <View>
              <Text style={styles.srSectionTitle}>Tier rates</Text>
              <View style={styles.srTierTable}>
                <View style={styles.srTierHeaderRow}>
                  <Text style={[styles.srTierHeaderCell, styles.srTierHeaderTierCell]}>TIER</Text>
                  <Text style={[styles.srTierHeaderCell, styles.srTierHeaderRangeCell]}>POINTS RANGE</Text>
                  <Text style={[styles.srTierHeaderCell, styles.srTierHeaderRateCell]}>AWARD RATE</Text>
                </View>
                {TIER_RATES.map((row) => {
                  const isActiveTier = row.code === tierCode;
                  return (
                    <View key={row.code} style={[styles.srTierDataRow, isActiveTier ? styles.srTierDataRowActive : null]}>
                      <View style={styles.srTierCellTier}>
                        <Text style={[styles.srTierChip, isActiveTier ? styles.srTierChipActive : null]}>{row.label}</Text>
                      </View>
                      <Text style={styles.srTierCellRange}>
                        {formatPoints(row.min)} - {row.max === null ? `${formatPoints(row.min)}+` : formatPoints(row.max)} pts
                      </Text>
                      <View style={styles.srTierCellRateWrap}>
                        {isActiveTier ? <Text style={styles.srTierYouTag}>YOU</Text> : null}
                        <Text style={styles.srTierCellRate}>{row.rate.toFixed(2)}x</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={styles.srSectionTitle}>Your progress</Text>
              <View style={styles.srProgressCard}>
                <View style={styles.srProgressTopRow}>
                  <Text style={styles.srProgressTierText}>
                    {tierLabel} → {nextTierAt > 0 ? 'Next Tier' : 'Legend'}
                  </Text>
                  <Text style={styles.srProgressCountText}>
                    {formatPoints(totalPoints)} / {formatPoints(progressGoal)}
                  </Text>
                </View>
                <View style={styles.srProgressTrack}>
                  <View style={[styles.srProgressFill, { width: `${Math.max(6, progressRatio * 100)}%` }]} />
                </View>
                <Text style={styles.srProgressHint}>
                  {pointsToNext > 0
                    ? `${formatPoints(pointsToNext)} pts to next tier · unlock higher rewards`
                    : 'Top tier unlocked'}
                </Text>
              </View>
            </View>

            <View>
              <Text style={styles.srSectionTitle}>Quick actions</Text>
              <View style={styles.srQuickGrid}>
                {canViewLeaderboard ? (
                <TouchableOpacity
                  style={[styles.srQuickCard, salesRepPanel === 'COMPANY_BOARD' ? styles.srQuickCardActive : null]}
                  activeOpacity={0.9}
                  onPress={() => setSalesRepPanel('COMPANY_BOARD')}
                >
                  <Ionicons name="business-outline" size={18} color={salesRepPanel === 'COMPANY_BOARD' ? '#FFFFFF' : '#3A7DCE'} />
                  <Text style={[styles.srQuickTitle, salesRepPanel === 'COMPANY_BOARD' ? styles.srQuickTitleActive : null]}>Company Board</Text>
                  <Text style={[styles.srQuickSub, salesRepPanel === 'COMPANY_BOARD' ? styles.srQuickSubActive : null]}>
                    {currentRank > 0 ? `You're ranked #${currentRank}` : 'View your leaderboard'}
                  </Text>
                </TouchableOpacity>
                ) : null}

                {canViewLeaderboard ? (
                <TouchableOpacity
                  style={[styles.srQuickCard, salesRepPanel === 'GLOBAL_BOARD' ? styles.srQuickCardActive : null]}
                  activeOpacity={0.9}
                  onPress={() => setSalesRepPanel('GLOBAL_BOARD')}
                >
                  <Ionicons name="globe-outline" size={18} color={salesRepPanel === 'GLOBAL_BOARD' ? '#FFFFFF' : '#3A9DDA'} />
                  <Text style={[styles.srQuickTitle, salesRepPanel === 'GLOBAL_BOARD' ? styles.srQuickTitleActive : null]}>Global Board</Text>
                  <Text style={[styles.srQuickSub, salesRepPanel === 'GLOBAL_BOARD' ? styles.srQuickSubActive : null]}>
                    {`Anonymous · ${tierLabel}`}
                  </Text>
                </TouchableOpacity>
                ) : null}

                {canCreateClaim ? (
                <TouchableOpacity
                  style={[
                    styles.srQuickCard,
                    salesRepPanel === 'REDEEM' ? styles.srQuickCardDark : null,
                    salesRepPanel === 'REDEEM' ? styles.srQuickCardDarkActive : null,
                  ]}
                  activeOpacity={0.9}
                  onPress={() => setSalesRepPanel('REDEEM')}
                >
                  <Ionicons
                    name="card-outline"
                    size={18}
                    color={salesRepPanel === 'REDEEM' ? '#D3A84D' : '#5E8CC8'}
                  />
                  <Text
                    style={[
                      styles.srQuickTitle,
                      salesRepPanel === 'REDEEM' ? styles.srQuickTitleGold : null,
                    ]}
                  >
                    Redeem Points
                  </Text>
                  <Text style={salesRepPanel === 'REDEEM' ? styles.srQuickSubDark : styles.srQuickSub}>
                    {`${formatMoney(redeemableAmount)} available`}
                  </Text>
                </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.srQuickCard, salesRepPanel === 'ACTIVITY' ? styles.srQuickCardActive : null]}
                  activeOpacity={0.9}
                  onPress={() => setSalesRepPanel('ACTIVITY')}
                >
                  <Ionicons name="stats-chart-outline" size={18} color={salesRepPanel === 'ACTIVITY' ? '#FFFFFF' : '#5E8CC8'} />
                  <Text style={[styles.srQuickTitle, salesRepPanel === 'ACTIVITY' ? styles.srQuickTitleActive : null]}>My Activity</Text>
                  <Text style={[styles.srQuickSub, salesRepPanel === 'ACTIVITY' ? styles.srQuickSubActive : null]}>
                    {`${formatPoints(summary?.stats?.totalClaims || 0)} claims total`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                {salesRepPanel === 'REDEEM'
                  ? 'Redeem Points'
                  : salesRepPanel === 'COMPANY_BOARD'
                    ? 'Company Board'
                    : salesRepPanel === 'GLOBAL_BOARD'
                      ? 'Global Board'
                      : 'My Activity'}
              </Text>
              {salesRepPanel === 'REDEEM' && canCreateClaim ? (
                <>
                  <Text style={styles.sectionSub}>Minimum {formatPoints(minRedeemPoints)} points</Text>
                  <TextInput
                    style={[styles.input, claimError && styles.inputError]}
                    keyboardType="decimal-pad"
                    placeholder="Points to redeem"
                    placeholderTextColor="#9F978F"
                    ref={salesRepPointsInputRef}
                    value={requestedPoints}
                    onFocus={() => focusSpiffInput('salesRep', salesRepPointsInputRef)}
                    onChangeText={handleRequestedPointsChange}
                  />
                  {claimError ? <Text style={styles.claimErrorText}>{claimError}</Text> : null}
                  <TextInput
                    style={styles.input}
                    placeholder="Notes (optional)"
                    placeholderTextColor="#9F978F"
                    ref={salesRepNoteInputRef}
                    value={note}
                    onFocus={() => focusSpiffInput('salesRep', salesRepNoteInputRef)}
                    onChangeText={setNote}
                  />
                  <Text style={styles.conversionText}>{config?.conversionDisplay || '100 points = $1'}</Text>
                  <TouchableOpacity
                    style={[styles.primaryBtn, submitting ? styles.primaryBtnDisabled : null]}
                    onPress={submitClaim}
                    disabled={submitting}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.primaryBtnText}>{submitting ? 'Submitting...' : 'Submit Claim'}</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              {salesRepPanel === 'COMPANY_BOARD' && canViewLeaderboard ? (
                (leaderboard?.entries || []).length ? (
                  (leaderboard.entries || []).map((entry: any) => (
                    <View key={entry.entityId} style={styles.boardRow}>
                      <View>
                        <Text style={styles.boardName}>#{entry.rank} {entry.name}</Text>
                        <Text style={styles.boardMeta}>{entry.subtitle || '-'}</Text>
                      </View>
                      <Text style={styles.boardPoints}>{formatPoints(entry.points)} pts</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No company board data yet.</Text>
                )
              ) : null}

              {salesRepPanel === 'GLOBAL_BOARD' && canViewLeaderboard ? (
                hasGlobalBoardRows ? (
                  <>
                    {(globalLeaderboard.entries || []).map((entry: any) => (
                      <View key={`global-${entry.entityId}`} style={styles.boardRow}>
                        <View>
                          <Text style={styles.boardName}>#{entry.rank} {entry.name}</Text>
                          <Text style={styles.boardMeta}>{entry.subtitle || '-'}</Text>
                        </View>
                        <Text style={styles.boardPoints}>{formatPoints(entry.points)} pts</Text>
                      </View>
                    ))}
                    {globalBoardScope !== 'GLOBAL' ? (
                      <Text style={styles.emptyText}>
                        Global scope is restricted for this role. Showing your allowed board scope.
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.emptyText}>No global board data available right now.</Text>
                )
              ) : null}

              {salesRepPanel === 'ACTIVITY' ? (
                activity.length ? (
                  <>
                    {activity.map(renderActivityCard)}
                    {loadingMoreActivity ? <Text style={styles.loadMoreText}>Loading more history...</Text> : null}
                    {!loadingMoreActivity && activityPage >= activityTotalPages ? (
                      <Text style={styles.loadMoreText}>All history loaded.</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.emptyText}>No activity yet.</Text>
                )
              ) : null}
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
          {claimSuccessVisible ? (
            <View style={styles.claimSuccessToast} accessibilityRole="alert">
              <Ionicons name="checkmark-circle" size={22} color="#2F7D57" />
              <View style={styles.claimSuccessCopy}>
                <Text style={styles.claimSuccessTitle}>Claim submitted</Text>
                <Text style={styles.claimSuccessMessage}>Your redemption claim is now in the review queue.</Text>
              </View>
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    );
  }

  if (isBranchManager) {
    const selectedTitle = branchManagerPanel === 'BRANCH_BOARD' ? 'Branch Leaderboard' : 'Company Leaderboard';
    const selectedEntries =
      branchManagerPanel === 'BRANCH_BOARD'
        ? (leaderboard?.entries || [])
        : (globalLeaderboard?.entries || []);

    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.srHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.srBackBtn} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={18} color="#8D8276" />
            </TouchableOpacity>
            <Text allowFontScaling={false} style={styles.srHeaderTitle}>Spiff Dashboard</Text>
            <View style={styles.srHeaderActions}>
              <TouchableOpacity style={styles.srRefreshBtn} onPress={refreshSpiff} disabled={refreshing || loading} activeOpacity={0.85}>
                <Ionicons name="refresh-outline" size={17} color={refreshing || loading ? '#BBAFA4' : '#8D8276'} />
              </TouchableOpacity>
              <View style={styles.srAvatarChip}>
                <Text allowFontScaling={false} style={styles.srAvatarChipText}>{initials}</Text>
              </View>
            </View>
          </View>

            <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A67F3F" />}
          >
            <View>
              <Text style={styles.srSectionTitle}>Quick actions</Text>
              <View style={styles.srQuickGrid}>
                <TouchableOpacity
                  style={[styles.srQuickCard, branchManagerPanel === 'BRANCH_BOARD' ? styles.srQuickCardActive : null]}
                  activeOpacity={0.9}
                  onPress={() => setBranchManagerPanel('BRANCH_BOARD')}
                >
                  <Ionicons name="git-branch-outline" size={18} color={branchManagerPanel === 'BRANCH_BOARD' ? '#FFFFFF' : '#3A7DCE'} />
                  <Text style={[styles.srQuickTitle, branchManagerPanel === 'BRANCH_BOARD' ? styles.srQuickTitleActive : null]}>Branch Board</Text>
                  <Text style={[styles.srQuickSub, branchManagerPanel === 'BRANCH_BOARD' ? styles.srQuickSubActive : null]}>
                    Your branch reps ranking
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.srQuickCard, branchManagerPanel === 'COMPANY_BOARD' ? styles.srQuickCardActive : null]}
                  activeOpacity={0.9}
                  onPress={() => setBranchManagerPanel('COMPANY_BOARD')}
                >
                  <Ionicons name="business-outline" size={18} color={branchManagerPanel === 'COMPANY_BOARD' ? '#FFFFFF' : '#3A9DDA'} />
                  <Text style={[styles.srQuickTitle, branchManagerPanel === 'COMPANY_BOARD' ? styles.srQuickTitleActive : null]}>Company Board</Text>
                  <Text style={[styles.srQuickSub, branchManagerPanel === 'COMPANY_BOARD' ? styles.srQuickSubActive : null]}>
                    Company-wide ranking
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{selectedTitle}</Text>
              {selectedEntries.length ? (
                selectedEntries.map((entry: any) => (
                  <View key={`${branchManagerPanel}-${entry.entityId}`} style={styles.boardRow}>
                    <View>
                      <Text style={styles.boardName}>#{entry.rank} {entry.name}</Text>
                      <Text style={styles.boardMeta}>{entry.subtitle || '-'}</Text>
                    </View>
                    <Text style={styles.boardPoints}>{formatPoints(entry.points)} pts</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  {branchManagerPanel === 'BRANCH_BOARD'
                    ? 'No branch leaderboard data yet.'
                    : 'No company leaderboard data yet.'}
                </Text>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (isCompanyAdmin) {
    return (
      <View style={styles.caScreen}>
        <SafeAreaView style={styles.caSafe} edges={['top']}>
          <ScrollView
            ref={companyAdminScrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.caContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onScroll={handleClaimsScroll}
            scrollEventThrottle={16}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B58A3E" />}
          >
            <View style={styles.caHero}>
              <TouchableOpacity style={styles.caRefreshBtn} onPress={refreshSpiff} disabled={refreshing || loading} activeOpacity={0.85}>
                <Ionicons name="refresh-outline" size={18} color={refreshing || loading ? '#D9C9B0' : '#FFF7EC'} />
              </TouchableOpacity>
              <Text allowFontScaling={false} style={styles.caHeroEyebrow}>SPIFF REDEMPTIONS</Text>
              <Text allowFontScaling={false} style={styles.caHeroTitle}>Approval Queue</Text>
              <Text allowFontScaling={false} style={styles.caHeroSub}>
                {user?.companyName || 'Company'} · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>

              <View style={styles.caHeroStatsRow}>
                <View style={styles.caHeroStatCard}>
                  <Text allowFontScaling={false} style={styles.caHeroStatValue}>{formatPoints(companyPendingClaims.length)}</Text>
                  <Text allowFontScaling={false} style={styles.caHeroStatLabel}>Pending</Text>
                </View>
                <View style={styles.caHeroStatCard}>
                  <Text allowFontScaling={false} style={styles.caHeroStatValue}>{formatMoney(companyPendingValue)}</Text>
                  <Text allowFontScaling={false} style={styles.caHeroStatLabel}>Total Value</Text>
                </View>
                <View style={styles.caHeroStatCard}>
                  <Text allowFontScaling={false} style={styles.caHeroStatValue}>{formatPoints(companyApprovedThisMonth)}</Text>
                  <Text allowFontScaling={false} style={styles.caHeroStatLabel}>Approved Mo.</Text>
                </View>
              </View>
            </View>

            {renderPointAdjustmentForm()}

            <View style={styles.caFilterRow}>
              {([
                ['ALL', 'All'],
                ['PENDING_REVIEW', 'Pending'],
                ['APPROVED', 'Approved'],
                ['FULFILLED', 'Fulfilled'],
              ] as Array<[CompanyAdminClaimFilter, string]>).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.88}
                  onPress={() => setCompanyFilter(key)}
                  style={[styles.caFilterChip, companyFilter === key ? styles.caFilterChipActive : null]}
                >
                  <Text allowFontScaling={false} style={[styles.caFilterChipText, companyFilter === key ? styles.caFilterChipTextActive : null]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filteredCompanyClaims.length ? (
              filteredCompanyClaims.map((claim) => {
                const status = String(claim.status || '').toUpperCase();
                const claimBusy = claimActionId === claim.id;
                const canReview = canReviewClaim && ['PENDING_REVIEW', 'HOLD'].includes(status);
                const canFulfill = canFulfillClaim && status === 'APPROVED';
                const repPoints = repPointsByUserId.get(String(claim.userId || '').trim()) || claim.requestedPoints || 0;

                return (
                  <View key={claim.id} style={[styles.caClaimCard, canReview ? styles.caClaimCardPending : null, isDeepLinkedClaim(claim) ? styles.caClaimCardHighlighted : null]}>
                    <View style={styles.caClaimTopRow}>
                      <View style={styles.caClaimAvatar}>
                        <Text allowFontScaling={false} style={styles.caClaimAvatarText}>
                          {String(claim.requestorName || 'U')
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((v) => v[0])
                            .join('')
                            .toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <View style={styles.caClaimTitleWrap}>
                        <Text allowFontScaling={false} numberOfLines={1} style={styles.caClaimName}>
                          {claim.requestorName || claim.claimNumber}
                        </Text>
                        <Text allowFontScaling={false} numberOfLines={1} style={styles.caClaimMeta}>
                          {claim.branchName || user?.branchName || '-'} · {formatClaimAge(claim.createdAt)}
                        </Text>
                        <View style={styles.caGiftTag}>
                          <Text allowFontScaling={false} style={styles.caGiftTagText}>{claim.giftCardType || 'Gift Card'}</Text>
                        </View>
                      </View>
                      <View style={[styles.caStatusBadge, { backgroundColor: STATUS_BG[status] || '#F2F2F2' }]}>
                        <Text allowFontScaling={false} style={[styles.caStatusBadgeText, { color: STATUS_TEXT[status] || '#6F6F6F' }]}>
                          {formatClaimStatusLabel(status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.caMetricsRow}>
                      <View style={styles.caMetricCard}>
                        <Text allowFontScaling={false} style={styles.caMetricValueGold}>{formatMoney(claim.requestedAmount)}</Text>
                        <Text allowFontScaling={false} style={styles.caMetricLabel}>Value</Text>
                      </View>
                      <View style={styles.caMetricCard}>
                        <Text allowFontScaling={false} style={styles.caMetricValue}>{formatPoints(claim.requestedPoints)}</Text>
                        <Text allowFontScaling={false} style={styles.caMetricLabel}>Points</Text>
                      </View>
                      <View style={styles.caMetricCard}>
                        <Text allowFontScaling={false} style={styles.caMetricValue}>{formatPoints(repPoints)}</Text>
                        <Text allowFontScaling={false} style={styles.caMetricLabel}>Total Pts</Text>
                      </View>
                    </View>

                    {canReview ? (
                      <View style={styles.caActionsRow}>
                        <TouchableOpacity
                          style={[styles.caBtn, styles.caApproveBtn, claimBusy ? styles.caBtnDisabled : null]}
                          activeOpacity={0.9}
                          disabled={claimBusy}
                          onPress={() => runClaimReviewAction(claim.id, 'APPROVE')}
                        >
                          <Text allowFontScaling={false} style={styles.caApproveBtnText}>{claimBusy ? 'Updating...' : 'Approve'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.caBtn, styles.caSecondaryBtn, claimBusy ? styles.caBtnDisabled : null]}
                          activeOpacity={0.9}
                          disabled={claimBusy}
                          onPress={() => runClaimReviewAction(claim.id, 'HOLD')}
                        >
                          <Text allowFontScaling={false} style={styles.caSecondaryBtnText}>Hold</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.caBtn, styles.caSecondaryBtn, claimBusy ? styles.caBtnDisabled : null]}
                          activeOpacity={0.9}
                          disabled={claimBusy}
                          onPress={() => runClaimReviewAction(claim.id, 'REJECT')}
                        >
                          <Text allowFontScaling={false} style={[styles.caSecondaryBtnText, styles.caRejectText]}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}

                    {canFulfill ? (
                      <TouchableOpacity
                        style={[styles.caFulfillBtn, claimBusy ? styles.caBtnDisabled : null]}
                        activeOpacity={0.9}
                        disabled={claimBusy}
                        onPress={() => runClaimFulfillAction(claim)}
                      >
                        <Text allowFontScaling={false} style={styles.caFulfillBtnText}>
                          {claimBusy ? 'Updating...' : 'Mark as Fulfilled'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {status === 'FULFILLED' && claim.giftbitLinkUrl ? (
                      <TouchableOpacity
                        style={styles.caRewardLinkWrap}
                        onPress={() => Linking.openURL(claim.giftbitLinkUrl as string)}
                        activeOpacity={0.85}
                      >
                        <Text allowFontScaling={false} style={styles.caRewardLinkText}>Open reward link</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <View style={styles.caEmptyCard}>
                <Text allowFontScaling={false} style={styles.caEmptyText}>No claims found for this filter.</Text>
              </View>
            )}

            {companyApprovedClaims.length > 0 ? <View style={styles.caBottomSpace} /> : null}
            {loadingMoreClaims ? <Text style={styles.loadMoreText}>Loading more claims...</Text> : null}
            {!loadingMoreClaims && claimsPage >= claimsTotalPages && claims.length > 0 ? (
              <Text style={styles.loadMoreText}>All claims loaded.</Text>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#2A241D" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>SPIFF REWARDS</Text>
            <Text style={styles.headerSubtitle}>Claim points into gift cards</Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={refreshSpiff} disabled={refreshing || loading}>
            <Ionicons name="refresh" size={17} color={refreshing || loading ? '#BBAFA4' : '#7A6E61'} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={defaultScrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={handleClaimsScroll}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A67F3F" />}
        >
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Available</Text>
              <Text style={styles.statValue}>{loading ? '--' : formatPoints(summary?.wallet?.availablePoints)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Locked</Text>
              <Text style={styles.statValue}>{loading ? '--' : formatPoints(summary?.wallet?.lockedPoints)}</Text>
            </View>
            <View style={styles.statCardWide}>
              <Text style={styles.statLabel}>Tier</Text>
              <Text style={styles.tierText}>
                {summary?.tier?.badge || '🥉'} {getTierLabel(summary?.tier?.code, summary?.tier?.label)}
              </Text>
              <Text style={styles.tierHint}>{nextTierHint}</Text>
            </View>
          </View>

          {canAdjustPoints ? (
            renderPointAdjustmentForm()
          ) : canCreateClaim ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Redeem Points</Text>
            <Text style={styles.sectionSub}>Minimum {formatPoints(minRedeemPoints)} points</Text>

            <TextInput
              style={[styles.input, claimError && styles.inputError]}
              keyboardType="decimal-pad"
              placeholder="Points to redeem"
              placeholderTextColor="#9F978F"
              ref={defaultPointsInputRef}
              value={requestedPoints}
              onFocus={() => focusSpiffInput('default', defaultPointsInputRef)}
              onChangeText={handleRequestedPointsChange}
            />
            {claimError ? <Text style={styles.claimErrorText}>{claimError}</Text> : null}

            <TextInput
              style={styles.input}
              placeholder="Notes (optional)"
              placeholderTextColor="#9F978F"
              ref={defaultNoteInputRef}
              value={note}
              onFocus={() => focusSpiffInput('default', defaultNoteInputRef)}
              onChangeText={setNote}
            />

            <Text style={styles.conversionText}>{config?.conversionDisplay || '100 points = $1'}</Text>

            <TouchableOpacity
              style={[styles.primaryBtn, submitting ? styles.primaryBtnDisabled : null]}
              onPress={submitClaim}
              disabled={submitting}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryBtnText}>{submitting ? 'Submitting...' : 'Submit Claim'}</Text>
            </TouchableOpacity>
          </View>
          ) : null}

          {canViewLeaderboard ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Leaderboard</Text>
            {(leaderboard?.entries || []).length ? (
              (leaderboard.entries || []).map((entry: any) => (
                <View key={entry.entityId} style={styles.boardRow}>
                  <View>
                    <Text style={styles.boardName}>#{entry.rank} {entry.name}</Text>
                    <Text style={styles.boardMeta}>{entry.subtitle || '-'}</Text>
                  </View>
                  <Text style={styles.boardPoints}>{formatPoints(entry.points)} pts</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No leaderboard data yet.</Text>
            )}
          </View>
          ) : null}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>My Claims</Text>
            {claims.length ? (
              claims.map((claim) => (
                <View key={claim.id} style={[styles.claimCard, isDeepLinkedClaim(claim) ? styles.claimCardHighlighted : null]}>
                  <View style={styles.claimTopRow}>
                    <Text style={styles.claimNumber}>{claim.claimNumber}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: STATUS_BG[claim.status] || '#F4F4F4' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: STATUS_TEXT[claim.status] || '#666' },
                        ]}
                      >
                        {String(claim.status || '').replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.claimMeta}>
                    {formatPoints(claim.requestedPoints)} pts - {formatMoney(claim.requestedAmount)} - {claim.giftCardType}
                  </Text>

                  {claim.reviewReason ? <Text style={styles.claimNote}>Note: {claim.reviewReason}</Text> : null}

                  {claim.giftbitLinkUrl ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(claim.giftbitLinkUrl as string)}
                      style={styles.linkBtn}
                    >
                      <Text style={styles.linkBtnText}>Open reward link</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No claims yet.</Text>
            )}
            {loadingMoreClaims ? <Text style={styles.loadMoreText}>Loading more claims...</Text> : null}
            {!loadingMoreClaims && claimsPage >= claimsTotalPages && claims.length > 0 ? (
              <Text style={styles.loadMoreText}>All claims loaded.</Text>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  caScreen: {
    flex: 1,
    backgroundColor: '#F1ECE2',
  },
  caSafe: {
    flex: 1,
    backgroundColor: '#F1ECE2',
  },
  caContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 10,
  },
  caHero: {
    backgroundColor: '#171311',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E251E',
    paddingHorizontal: 14,
    paddingVertical: 14,
    position: 'relative',
  },
  caRefreshBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 247, 236, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  caHeroEyebrow: {
    marginTop: 14,
    color: '#B48A40',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  caHeroTitle: {
    marginTop: 2,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  caHeroSub: {
    marginTop: 2,
    color: '#AEA394',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  caHeroStatsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  caHeroStatCard: {
    flex: 1,
    backgroundColor: '#2B2622',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  caHeroStatValue: {
    color: '#D8AA4B',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  caHeroStatLabel: {
    marginTop: 2,
    color: '#A99A89',
    fontSize: 10,
    fontWeight: '600',
  },
  caFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  caFilterChip: {
    backgroundColor: '#F8F5EF',
    borderWidth: 1,
    borderColor: '#DCCFBF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caFilterChipActive: {
    backgroundColor: '#1D1917',
    borderColor: '#1D1917',
  },
  caFilterChipText: {
    color: '#7D7266',
    fontSize: 11,
    fontWeight: '700',
  },
  caFilterChipTextActive: {
    color: '#FFFFFF',
  },
  caClaimCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9DED0',
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  caClaimCardHighlighted: {
    borderColor: '#C89D5A',
    borderWidth: 2,
  },
  caClaimCardPending: {
    borderLeftColor: '#BE9446',
    borderLeftWidth: 2,
    paddingLeft: 10,
  },
  caClaimTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  caClaimAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E4EFEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caClaimAvatarText: {
    color: '#4F7C6A',
    fontWeight: '800',
    fontSize: 13,
  },
  caClaimTitleWrap: {
    flex: 1,
    marginLeft: 9,
    marginRight: 7,
  },
  caClaimName: {
    color: '#1E1A16',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  caClaimMeta: {
    marginTop: 1,
    color: '#8D8174',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
  },
  caGiftTag: {
    alignSelf: 'flex-start',
    marginTop: 5,
    borderRadius: 10,
    backgroundColor: '#F7ECD5',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  caGiftTagText: {
    color: '#A57C2E',
    fontSize: 10,
    fontWeight: '700',
  },
  caStatusBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 2,
  },
  caStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  caMetricsRow: {
    marginTop: 9,
    flexDirection: 'row',
    gap: 6,
  },
  caMetricCard: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#F6F4F1',
    borderWidth: 1,
    borderColor: '#ECE5DA',
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  caMetricValue: {
    color: '#151310',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  caMetricValueGold: {
    color: '#B68433',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  caMetricLabel: {
    marginTop: 2,
    color: '#9A8D7D',
    fontSize: 10,
    fontWeight: '600',
  },
  caActionsRow: {
    marginTop: 9,
    flexDirection: 'row',
    gap: 7,
  },
  caBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caApproveBtn: {
    backgroundColor: '#BF9446',
  },
  caApproveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  caSecondaryBtn: {
    backgroundColor: '#F7F5F2',
    borderWidth: 1,
    borderColor: '#D8CDC0',
  },
  caSecondaryBtnText: {
    color: '#3A322B',
    fontSize: 13,
    fontWeight: '700',
  },
  caRejectText: {
    color: '#6A5142',
  },
  caFulfillBtn: {
    marginTop: 9,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E4F1EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caFulfillBtnText: {
    color: '#2F7B55',
    fontSize: 13,
    fontWeight: '800',
  },
  caBtnDisabled: {
    opacity: 0.6,
  },
  caRewardLinkWrap: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  caRewardLinkText: {
    color: '#3C5F9D',
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  caEmptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DACB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  caEmptyText: {
    color: '#8B7D6D',
    fontSize: 12,
    fontWeight: '600',
  },
  caBottomSpace: {
    height: 6,
  },
  srHeader: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE7DD',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  srBackBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  srHeaderTitle: {
    flex: 1,
    fontSize: 19,
    lineHeight: 24,
    color: '#2A231C',
    fontWeight: '700',
  },
  srHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  srRefreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#EEE7DD',
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  srAvatarChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#B9903A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  srAvatarChipText: {
    color: '#241A10',
    fontSize: 13,
    fontWeight: '800',
  },
  srContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 26,
    gap: 12,
  },
  srHeroCard: {
    borderRadius: 18,
    backgroundColor: '#191613',
    borderWidth: 1,
    borderColor: '#27211B',
    paddingHorizontal: 14,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  srHeroEyebrow: {
    fontSize: 11,
    letterSpacing: 1.1,
    color: '#B29361',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  srHeroTitleRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
  },
  srHeroBadge: {
    fontSize: 22,
    lineHeight: 28,
  },
  srHeroTitle: {
    fontSize: 24,
    lineHeight: 28,
    color: '#F2F1EF',
    fontWeight: '900',
  },
  srHeroName: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    color: '#918376',
    fontWeight: '600',
  },
  srHeroStatsRow: {
    marginTop: 11,
    flexDirection: 'row',
    gap: 8,
  },
  srHeroStatBox: {
    flex: 1,
    backgroundColor: '#2A2622',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#312C27',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  srHeroStatValue: {
    fontSize: 18,
    lineHeight: 22,
    color: '#EFE9E1',
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  srHeroStatLabel: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 12,
    color: '#978A7D',
    fontWeight: '600',
  },
  srHeroHint: {
    marginTop: 11,
    fontSize: 10,
    lineHeight: 13,
    color: '#C39D57',
    fontWeight: '700',
  },
  srSectionTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: '#2A231C',
    fontWeight: '700',
    marginBottom: 8,
  },
  srTierTable: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  srTierHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1B1816',
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  srTierHeaderCell: {
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#E5DED2',
    fontWeight: '800',
  },
  srTierHeaderTierCell: {
    width: '26%',
  },
  srTierHeaderRangeCell: {
    width: '44%',
  },
  srTierHeaderRateCell: {
    width: '30%',
    textAlign: 'right',
  },
  srTierDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: '#EEE7DD',
    backgroundColor: '#FFFFFF',
  },
  srTierDataRowActive: {
    backgroundColor: '#FCF8EF',
  },
  srTierCellTier: {
    width: '26%',
  },
  srTierCellRange: {
    width: '44%',
    fontSize: 12,
    color: '#716457',
    fontWeight: '600',
  },
  srTierCellRateWrap: {
    width: '30%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 5,
  },
  srTierCellRate: {
    fontSize: 14,
    lineHeight: 17,
    color: '#A77B2B',
    fontWeight: '800',
  },
  srTierChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#EFEEEB',
    color: '#6C655D',
    fontSize: 10,
    fontWeight: '700',
  },
  srTierChipActive: {
    backgroundColor: '#DFE9FF',
    color: '#3A64A7',
  },
  srTierYouTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B48B43',
    backgroundColor: '#F4E6C8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  srProgressCard: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E7DFD4',
    backgroundColor: '#FCFAF7',
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  srProgressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  srProgressTierText: {
    fontSize: 14,
    color: '#8B8176',
    fontWeight: '700',
  },
  srProgressCountText: {
    fontSize: 17,
    color: '#A77C33',
    fontWeight: '800',
  },
  srProgressTrack: {
    marginTop: 8,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#E6DED4',
    overflow: 'hidden',
  },
  srProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#A97F3B',
  },
  srProgressHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#8A7D70',
    fontWeight: '600',
  },
  srQuickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  srQuickCard: {
    width: '48.6%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7DED4',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 98,
    justifyContent: 'space-between',
  },
  srQuickCardActive: {
    backgroundColor: '#202020',
    borderColor: '#202020',
  },
  srQuickCardDark: {
    backgroundColor: '#171514',
    borderColor: '#171514',
  },
  srQuickCardDarkActive: {
    backgroundColor: '#11100F',
  },
  srQuickTitle: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 18,
    color: '#2A231C',
    fontWeight: '700',
  },
  srQuickTitleActive: {
    color: '#FFFFFF',
  },
  srQuickTitleGold: {
    color: '#C59A49',
  },
  srQuickSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#8B8177',
    fontWeight: '500',
  },
  srQuickSubActive: {
    color: '#D7D2CA',
  },
  srQuickSubDark: {
    marginTop: 2,
    fontSize: 12,
    color: '#8E8173',
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE6DC',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E6DED3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F5',
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    letterSpacing: 1.8,
    color: '#1F1A16',
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: '#8A7E72',
    fontWeight: '600',
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E6DED3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F5',
  },
  scroll: {
    flex: 1,
  },
  keyboardAvoider: {
    flex: 1,
  },
  claimSuccessToast: {
    position: 'absolute',
    top: 66,
    left: 14,
    right: 14,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CFE7DA',
    backgroundColor: '#F2FBF6',
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: '#1E3A2D',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  claimSuccessCopy: {
    flex: 1,
  },
  claimSuccessTitle: {
    color: '#205D40',
    fontSize: 14,
    fontWeight: '800',
  },
  claimSuccessMessage: {
    marginTop: 2,
    color: '#527060',
    fontSize: 12,
    lineHeight: 16,
  },
  content: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingBottom: 26,
    gap: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: '31%',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    padding: 10,
  },
  statCardWide: {
    width: '100%',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    padding: 10,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 0.9,
    color: '#8B827A',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    marginTop: 4,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
    color: '#1F1B17',
  },
  tierText: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '800',
    color: '#1F1B17',
  },
  tierHint: {
    marginTop: 2,
    fontSize: 11,
    color: '#7C736B',
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: '#FBFBFB',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#211B15',
  },
  sectionTitle: {
    fontSize: 14,
    color: '#1F1A16',
    fontWeight: '800',
  },
  sectionSub: {
    marginTop: 2,
    fontSize: 11,
    color: '#7D746B',
    fontWeight: '500',
  },
  input: {
    marginTop: 9,
    height: 42,
    borderWidth: 1,
    borderColor: '#DDD3C8',
    borderRadius: 11,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1F1A16',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#C84A4A',
    backgroundColor: '#FFF8F8',
  },
  fieldLabel: {
    marginTop: 10,
    color: '#6E6258',
    fontSize: 11,
    fontWeight: '800',
  },
  advancedToggle: {
    marginTop: 10,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD3C8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  advancedToggleText: {
    color: '#4B4038',
    fontSize: 12,
    fontWeight: '800',
  },
  adjustmentChipRow: {
    gap: 8,
    paddingTop: 8,
    paddingRight: 4,
  },
  adjustmentChip: {
    minHeight: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD3C8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustmentChipActive: {
    backgroundColor: '#1F1A16',
    borderColor: '#1F1A16',
  },
  adjustmentChipText: {
    color: '#6E6258',
    fontSize: 11,
    fontWeight: '800',
  },
  adjustmentChipTextActive: {
    color: '#FFFFFF',
  },
  dropdownButton: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#DDD3C8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dropdownTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  dropdownValue: {
    color: '#1F1A16',
    fontSize: 13,
    fontWeight: '800',
  },
  dropdownMeta: {
    marginTop: 2,
    color: '#8A7B6E',
    fontSize: 10,
    fontWeight: '600',
  },
  dropdownList: {
    marginTop: 7,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E9DED0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownOption: {
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8DF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownOptionActive: {
    backgroundColor: '#FFF7EA',
  },
  dropdownOptionText: {
    flex: 1,
    color: '#302821',
    fontSize: 12,
    fontWeight: '800',
  },
  dropdownOptionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownOptionHandle: {
    maxWidth: 120,
    color: '#9C7127',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
  dropdownOptionTextActive: {
    color: '#9C7127',
  },
  actionSegment: {
    marginTop: 8,
    flexDirection: 'row',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#DDD3C8',
    backgroundColor: '#FFFFFF',
    padding: 3,
  },
  actionSegmentBtn: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSegmentBtnActive: {
    backgroundColor: '#1F1A16',
  },
  actionSegmentText: {
    color: '#6E6258',
    fontSize: 12,
    fontWeight: '800',
  },
  actionSegmentTextActive: {
    color: '#FFFFFF',
  },
  pointsActionRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsActionPrefix: {
    height: 42,
    minWidth: 84,
    borderTopLeftRadius: 11,
    borderBottomLeftRadius: 11,
    backgroundColor: '#1F1A16',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pointsActionPrefixText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  pointsInput: {
    flex: 1,
    height: 42,
    borderTopRightRadius: 11,
    borderBottomRightRadius: 11,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#DDD3C8',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1F1A16',
    backgroundColor: '#FFFFFF',
  },
  claimErrorText: {
    marginTop: 5,
    color: '#B23A3A',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
  conversionText: {
    marginTop: 7,
    fontSize: 11,
    color: '#9A7340',
    fontWeight: '700',
  },
  primaryBtn: {
    marginTop: 10,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1F1A16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  boardRow: {
    borderWidth: 1,
    borderColor: '#EFE6DC',
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boardName: {
    fontSize: 13,
    color: '#1F1A16',
    fontWeight: '700',
  },
  boardMeta: {
    marginTop: 1,
    fontSize: 10,
    color: '#8C837A',
    fontWeight: '500',
  },
  boardPoints: {
    fontSize: 13,
    color: '#9A7340',
    fontWeight: '800',
  },
  claimCard: {
    borderWidth: 1,
    borderColor: '#EFE6DC',
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 8,
  },
  claimCardHighlighted: {
    borderColor: '#C89D5A',
    borderWidth: 2,
    shadowColor: '#C89D5A',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  claimTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  claimNumber: {
    fontSize: 12,
    color: '#1F1A16',
    fontWeight: '800',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  claimMeta: {
    marginTop: 5,
    fontSize: 11,
    color: '#61574F',
    fontWeight: '600',
  },
  claimNote: {
    marginTop: 6,
    fontSize: 10,
    color: '#786E65',
    lineHeight: 14,
  },
  linkBtn: {
    marginTop: 7,
  },
  linkBtnText: {
    color: '#2D4D8A',
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 12,
    color: '#8B8179',
    fontWeight: '500',
  },
  refreshPermissionBtn: {
    marginTop: 18,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E6DED3',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A6E61',
  },
  loadMoreText: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
    color: '#8B8179',
    fontWeight: '700',
  },
});

export default SpiffRewardsScreen;
