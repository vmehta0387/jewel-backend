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

const SpiffRewardsScreen = () => {
  const navigation = useNavigation<any>();
  const { token, user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [summary, setSummary] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [claims, setClaims] = useState<SpiffClaim[]>([]);

  const [requestedPoints, setRequestedPoints] = useState('');
  const [note, setNote] = useState('');
  const [giftCardType, setGiftCardType] = useState('');

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
                : 'MY_BRANCH',
          period: 'MONTHLY',
          limit: 10,
        }),
        fetchSpiffClaims(token, 1, 20),
      ]);

      setConfig(configRes);
      setSummary(summaryRes);
      setLeaderboard(leaderboardRes);
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
