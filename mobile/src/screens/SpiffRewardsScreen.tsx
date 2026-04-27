import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  createSpiffClaim,
  fetchSpiffClaims,
  fetchSpiffConfig,
  fetchSpiffLeaderboard,
  fetchSpiffSummary,
  type SpiffClaim,
} from '../api/spiff';

const formatPoints = (value: number | null | undefined) => {
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
  { code: 'CLOSER', label: 'Closer', min: 0, max: 499, rate: 1.0 },
  { code: 'SHARP', label: 'Sharp', min: 500, max: 1499, rate: 1.25 },
  { code: 'ELITE', label: 'Elite', min: 1500, max: 3999, rate: 1.5 },
  { code: 'LEGEND', label: 'Legend', min: 4000, max: null as number | null, rate: 2.0 },
] as const;

type SalesRepPanel = 'COMPANY_BOARD' | 'GLOBAL_BOARD' | 'REDEEM' | 'ACTIVITY';

const SpiffRewardsScreen = () => {
  const navigation = useNavigation<any>();
  const { token, user } = useAuth();
  const isSalesRep = user?.role === 'SALES_REP';

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [summary, setSummary] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any>(null);
  const [claims, setClaims] = useState<SpiffClaim[]>([]);

  const [requestedPoints, setRequestedPoints] = useState('');
  const [note, setNote] = useState('');
  const [giftCardType, setGiftCardType] = useState('');
  const [salesRepPanel, setSalesRepPanel] = useState<SalesRepPanel>('REDEEM');

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);

    try {
      const [configRes, summaryRes, leaderboardRes, claimsRes] = await Promise.all([
        fetchSpiffConfig(token),
        fetchSpiffSummary(token),
        fetchSpiffLeaderboard(token, {
          scope:
            user?.role === 'SUPER_ADMIN'
              ? 'GLOBAL'
              : user?.role === 'COMPANY_ADMIN'
                ? 'MY_COMPANY'
                : user?.role === 'SALES_REP'
                  ? 'MY_COMPANY'
                : 'MY_BRANCH',
          period: 'MONTHLY',
          limit: 10,
        }),
        fetchSpiffClaims(token, 1, 20),
      ]);
      let globalBoardRes: any = null;
      if (user?.role === 'SALES_REP') {
        try {
          globalBoardRes = await fetchSpiffLeaderboard(token, {
            scope: 'GLOBAL',
            period: 'MONTHLY',
            limit: 10,
          });
        } catch {
          globalBoardRes = null;
        }
      }

      setConfig(configRes);
      setSummary(summaryRes);
      setLeaderboard(leaderboardRes);
      setGlobalLeaderboard(globalBoardRes);
      setClaims(claimsRes.data || []);
      setGiftCardType((current) => current || configRes.giftCardOptions?.[0] || 'Amazon');
    } catch (error: any) {
      Alert.alert('SPIFF', error?.message || 'Unable to load SPIFF data right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.role]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const submitClaim = useCallback(async () => {
    if (!token) return;

    const points = Math.floor(Number(requestedPoints || 0));
    if (!Number.isFinite(points) || points <= 0) {
      Alert.alert('SPIFF', 'Enter valid points to redeem.');
      return;
    }

    if (!giftCardType.trim()) {
      Alert.alert('SPIFF', 'Select a gift card type.');
      return;
    }

    setSubmitting(true);
    try {
      await createSpiffClaim(token, {
        requestedPoints: points,
        giftCardType,
        note: note.trim() || undefined,
      });
      setRequestedPoints('');
      setNote('');
      await load(true);
      Alert.alert('Claim submitted', 'Your redemption claim is now in review queue.');
    } catch (error: any) {
      Alert.alert('SPIFF', error?.message || 'Unable to submit claim right now.');
    } finally {
      setSubmitting(false);
    }
  }, [token, requestedPoints, giftCardType, note, load]);

  const nextTierHint = useMemo(() => {
    const nextTierAt = Number(summary?.tier?.nextTierAt || 0);
    const totalEarned = Number(summary?.wallet?.totalEarnedPoints || 0);
    if (!nextTierAt || nextTierAt <= totalEarned) {
      return 'Top tier unlocked';
    }
    return `${formatPoints(nextTierAt - totalEarned)} pts to next tier`;
  }, [summary?.tier?.nextTierAt, summary?.wallet?.totalEarnedPoints]);

  const fullName = useMemo(() => {
    const value = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return value || 'Sales Rep';
  }, [user?.firstName, user?.lastName]);

  const initials = useMemo(() => {
    const first = user?.firstName?.charAt(0) || '';
    const last = user?.lastName?.charAt(0) || '';
    const value = `${first}${last}`.toUpperCase();
    if (value) return value;
    return (user?.email?.charAt(0) || 'SR').toUpperCase();
  }, [user?.firstName, user?.lastName, user?.email]);

  const totalPoints = Number(summary?.wallet?.totalEarnedPoints || 0);
  const redeemablePoints = Number(summary?.wallet?.availablePoints || 0);
  const pointsPerDollar = Number(config?.pointsPerDollar || 100);
  const redeemableAmount = pointsPerDollar > 0 ? redeemablePoints / pointsPerDollar : 0;
  const currentRank = Number(leaderboard?.myRank?.rank || 0);
  const nextTierAt = Number(summary?.tier?.nextTierAt || 0);
  const progressGoal = nextTierAt > 0 ? nextTierAt : Math.max(totalPoints, 1);
  const progressRatio = Math.max(0, Math.min(totalPoints / progressGoal, 1));
  const pointsToNext = Math.max(0, nextTierAt - totalPoints);
  const tierCode = String(summary?.tier?.code || '').toUpperCase();
  const tierLabel = summary?.tier?.label || 'Closer';
  const tierBadge = summary?.tier?.badge || '🥉';
  const hasGlobalBoardRows = (globalLeaderboard?.entries || []).length > 0;
  const globalBoardScope = String(globalLeaderboard?.scope || '').toUpperCase();

  if (isSalesRep) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.srHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.srBackBtn} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={18} color="#8D8276" />
            </TouchableOpacity>
            <Text allowFontScaling={false} style={styles.srHeaderTitle}>Spiff Dashboard</Text>
            <View style={styles.srAvatarChip}>
              <Text allowFontScaling={false} style={styles.srAvatarChipText}>{initials}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.srContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A67F3F" />}
          >
            <View style={styles.srHeroCard}>
              <Text allowFontScaling={false} style={styles.srHeroEyebrow}>YOUR SPIFF PROFILE</Text>
              <View style={styles.srHeroTitleRow}>
                <Text allowFontScaling={false} style={styles.srHeroBadge}>{tierBadge}</Text>
                <Text allowFontScaling={false} numberOfLines={1} style={styles.srHeroTitle}>{tierLabel}</Text>
              </View>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.srHeroName}>{`${fullName} · ${user?.branchName || user?.companyName || '-'}`}</Text>

              <View style={styles.srHeroStatsRow}>
                <View style={styles.srHeroStatBox}>
                  <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={styles.srHeroStatValue}>{formatPoints(totalPoints)}</Text>
                  <Text allowFontScaling={false} style={styles.srHeroStatLabel}>Total Pts</Text>
                </View>
                <View style={styles.srHeroStatBox}>
                  <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={styles.srHeroStatValue}>{currentRank > 0 ? `#${currentRank}` : '-'}</Text>
                  <Text allowFontScaling={false} style={styles.srHeroStatLabel}>Company Rank</Text>
                </View>
                <View style={styles.srHeroStatBox}>
                  <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={styles.srHeroStatValue}>{formatMoney(redeemableAmount)}</Text>
                  <Text allowFontScaling={false} style={styles.srHeroStatLabel}>Redeemable</Text>
                </View>
              </View>

              <Text allowFontScaling={false} numberOfLines={1} style={styles.srHeroHint}>
                ⚡ {tierLabel} rate: {TIER_RATES.find((row) => row.code === tierCode)?.rate.toFixed(2) || '1.00'}x
                {' · '}Your {formatPoints(totalPoints)} pts
                {' ≈ '}
                {formatMoney(redeemableAmount)}
              </Text>
            </View>

            <View>
              <Text style={styles.srSectionTitle}>Tier rates</Text>
              <View style={styles.srTierTable}>
                <View style={styles.srTierHeaderRow}>
                  <Text style={[styles.srTierHeaderCell, styles.srTierHeaderTierCell]}>TIER</Text>
                  <Text style={[styles.srTierHeaderCell, styles.srTierHeaderRangeCell]}>POINTS RANGE</Text>
                  <Text style={[styles.srTierHeaderCell, styles.srTierHeaderRateCell]}>$/PT RATE</Text>
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
                        <Text style={styles.srTierCellRate}>{row.rate.toFixed(2)}%</Text>
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
              {salesRepPanel === 'REDEEM' ? (
                <>
                  <Text style={styles.sectionSub}>Minimum {formatPoints(config?.minRedeemPoints || 500)} points</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    placeholder="Points to redeem"
                    placeholderTextColor="#9F978F"
                    value={requestedPoints}
                    onChangeText={setRequestedPoints}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.giftOptionsRow}>
                    {(config?.giftCardOptions || ['Amazon']).map((option: string) => {
                      const active = giftCardType === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[styles.giftChip, active ? styles.giftChipActive : null]}
                          onPress={() => setGiftCardType(option)}
                          activeOpacity={0.9}
                        >
                          <Text style={[styles.giftChipText, active ? styles.giftChipTextActive : null]}>{option}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <TextInput
                    style={styles.input}
                    placeholder="Notes (optional)"
                    placeholderTextColor="#9F978F"
                    value={note}
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

              {salesRepPanel === 'COMPANY_BOARD' ? (
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

              {salesRepPanel === 'GLOBAL_BOARD' ? (
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
                claims.length ? (
                  claims.map((claim) => (
                    <View key={claim.id} style={styles.claimCard}>
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
                  <Text style={styles.emptyText}>No activity yet.</Text>
                )
              ) : null}
            </View>
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

          <TouchableOpacity style={styles.refreshBtn} onPress={() => load(true)}>
            <Ionicons name="refresh" size={17} color="#7A6E61" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
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
                {summary?.tier?.badge || '🥉'} {summary?.tier?.label || 'Closer'}
              </Text>
              <Text style={styles.tierHint}>{nextTierHint}</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Redeem Points</Text>
            <Text style={styles.sectionSub}>Minimum {formatPoints(config?.minRedeemPoints || 500)} points</Text>

            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Points to redeem"
              placeholderTextColor="#9F978F"
              value={requestedPoints}
              onChangeText={setRequestedPoints}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.giftOptionsRow}>
              {(config?.giftCardOptions || ['Amazon']).map((option: string) => {
                const active = giftCardType === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.giftChip, active ? styles.giftChipActive : null]}
                    onPress={() => setGiftCardType(option)}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.giftChipText, active ? styles.giftChipTextActive : null]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              style={styles.input}
              placeholder="Notes (optional)"
              placeholderTextColor="#9F978F"
              value={note}
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

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>My Claims</Text>
            {claims.length ? (
              claims.map((claim) => (
                <View key={claim.id} style={styles.claimCard}>
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
    paddingBottom: 28,
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
  giftOptionsRow: {
    paddingTop: 8,
    paddingBottom: 2,
    gap: 8,
  },
  giftChip: {
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#DDD3C8',
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  giftChipActive: {
    backgroundColor: '#1F1A16',
    borderColor: '#1F1A16',
  },
  giftChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5E554D',
  },
  giftChipTextActive: {
    color: '#FFFFFF',
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
});

export default SpiffRewardsScreen;
