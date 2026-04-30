import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  fetchCompanyAdminPricingSettings,
  type CompanyAdminPricingSettingsResponse,
  type PricingSlab,
  updateCompanyAdminBranchPricing,
  updateCompanyAdminCompanyPricing,
} from '../api/pricing';

type ApplyMode = 'COMPANY' | 'BRANCH';
type EditableSlab = {
  id: string;
  minCost: string;
  maxCost: string;
  multiplier: string;
};

const NO_LIMIT_VALUE = 999999999;
const PREVIEW_COST = 1000;

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const toEditableSlabs = (slabs: PricingSlab[]): EditableSlab[] =>
  (slabs || []).map((slab, idx) => ({
    id: slab.id || `slab-${idx + 1}`,
    minCost: String(Math.max(0, Number(slab.minCost || 0))),
    maxCost: Number(slab.maxCost || 0) >= NO_LIMIT_VALUE ? 'No limit' : String(Math.max(0, Number(slab.maxCost || 0))),
    multiplier: String(Number(slab.multiplier || 1)),
  }));

const normalizeCostInput = (input: string) => input.replace(/[^0-9.]/g, '');

const PricingScreen = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CompanyAdminPricingSettingsResponse | null>(null);
  const [mode, setMode] = useState<ApplyMode>('COMPANY');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [markupInput, setMarkupInput] = useState('1');
  const [slabs, setSlabs] = useState<EditableSlab[]>([]);

  const selectedBranch = useMemo(
    () => settings?.branches?.find((branch) => branch.id === selectedBranchId) || null,
    [settings?.branches, selectedBranchId],
  );

  const syncEditorFromSettings = useCallback(
    (next: CompanyAdminPricingSettingsResponse, nextMode: ApplyMode, branchId?: string) => {
      if (nextMode === 'COMPANY') {
        setMarkupInput(String(Number(next.company?.defaultMultiplier || 1)));
        setSlabs(toEditableSlabs(next.company?.pricingSlabs || []));
        return;
      }

      const resolvedBranchId = branchId || next.branches?.[0]?.id || '';
      const branch = next.branches?.find((item) => item.id === resolvedBranchId) || next.branches?.[0];
      if (!branch) {
        setMarkupInput('1');
        setSlabs([]);
        setSelectedBranchId('');
        return;
      }

      setSelectedBranchId(branch.id);
      setMarkupInput(String(Number(branch.branchMultiplier || 1)));
      setSlabs(toEditableSlabs(branch.pricingSlabs || []));
    },
    [],
  );

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const response = await fetchCompanyAdminPricingSettings(token);
      setSettings(response);
      if (mode === 'COMPANY') {
        syncEditorFromSettings(response, 'COMPANY');
      } else {
        syncEditorFromSettings(response, 'BRANCH', selectedBranchId || response.branches?.[0]?.id);
      }
    } catch (error: any) {
      Alert.alert('Pricing', error?.message || 'Unable to load pricing settings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, mode, selectedBranchId, syncEditorFromSettings]);

  useFocusEffect(
    useCallback(() => {
      if (user?.role !== 'COMPANY_ADMIN') return;
      load();
    }, [load, user?.role]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const applyMode = useCallback((nextMode: ApplyMode) => {
    setMode(nextMode);
    if (!settings) return;
    if (nextMode === 'COMPANY') {
      syncEditorFromSettings(settings, 'COMPANY');
      return;
    }
    syncEditorFromSettings(settings, 'BRANCH', selectedBranchId || settings.branches?.[0]?.id);
  }, [selectedBranchId, settings, syncEditorFromSettings]);

  const applyBranch = useCallback((branchId: string) => {
    setSelectedBranchId(branchId);
    if (!settings) return;
    syncEditorFromSettings(settings, 'BRANCH', branchId);
  }, [settings, syncEditorFromSettings]);

  const updateSlabField = useCallback((id: string, field: 'minCost' | 'maxCost' | 'multiplier', value: string) => {
    setSlabs((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === 'maxCost' && value.trim().toLowerCase() === 'no limit') {
          return { ...row, maxCost: 'No limit' };
        }
        return {
          ...row,
          [field]: normalizeCostInput(value),
        };
      }),
    );
  }, []);

  const addSlab = useCallback(() => {
    setSlabs((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        minCost: prev.length ? prev[prev.length - 1].maxCost.replace(/[^0-9.]/g, '') || '0' : '0',
        maxCost: '',
        multiplier: markupInput || '1',
      },
    ]);
  }, [markupInput]);

  const parsePayloadSlabs = useCallback(() => {
    const parsed = slabs
      .map((row) => {
        const min = Number(row.minCost || 0);
        const max = row.maxCost.trim().toLowerCase() === 'no limit' ? NO_LIMIT_VALUE : Number(row.maxCost || 0);
        const multiplier = Number(row.multiplier || 1);
        return {
          minCost: Number.isFinite(min) ? min : 0,
          maxCost: Number.isFinite(max) ? max : 0,
          multiplier: Number.isFinite(multiplier) ? multiplier : 1,
        };
      })
      .filter((row) => row.maxCost >= row.minCost);

    return parsed.sort((a, b) => a.minCost - b.minCost);
  }, [slabs]);

  const save = useCallback(async () => {
    if (!token) return;
    const multiplier = Number(markupInput || 1);
    if (!Number.isFinite(multiplier) || multiplier < 1 || multiplier > 10) {
      Alert.alert('Pricing', 'Markup multiplier must be between 1 and 10.');
      return;
    }

    setSaving(true);
    try {
      const payloadSlabs = parsePayloadSlabs();
      const response =
        mode === 'COMPANY'
          ? await updateCompanyAdminCompanyPricing(token, {
              defaultMultiplier: Number(multiplier.toFixed(2)),
              enableSlabPricing: payloadSlabs.length > 0,
              pricingSlabs: payloadSlabs,
            })
          : await updateCompanyAdminBranchPricing(token, selectedBranchId, {
              branchMultiplier: Number(multiplier.toFixed(2)),
              enableSlabPricing: payloadSlabs.length > 0,
              pricingSlabs: payloadSlabs,
            });

      setSettings(response);
      syncEditorFromSettings(response, mode, selectedBranchId);
      Alert.alert('Pricing', 'Pricing published successfully.');
    } catch (error: any) {
      Alert.alert('Pricing', error?.message || 'Unable to save pricing.');
    } finally {
      setSaving(false);
    }
  }, [markupInput, mode, parsePayloadSlabs, selectedBranchId, syncEditorFromSettings, token]);

  const previewMultiplier = Number(markupInput || 1);
  const previewSell = Number.isFinite(previewMultiplier) ? PREVIEW_COST * previewMultiplier : PREVIEW_COST;

  if (user?.role !== 'COMPANY_ADMIN') {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Pricing</Text>
            <Text style={styles.emptyText}>This screen is available for company admin only.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="chevron-back" size={18} color="#8D8276" />
            <Text style={styles.headerTitle}>Markup & Pricing</Text>
          </View>
          <TouchableOpacity style={styles.publishBtn} onPress={save} disabled={saving}>
            <Text style={styles.publishBtnText}>{saving ? 'Saving...' : 'Save & Publish'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color="#A47C39" />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A47C39" />}
          >
            <Text style={styles.sectionTitle}>Apply pricing to</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeChip, mode === 'COMPANY' ? styles.modeChipActive : null]}
                onPress={() => applyMode('COMPANY')}
              >
                <Text style={[styles.modeChipText, mode === 'COMPANY' ? styles.modeChipTextActive : null]}>
                  Company-wide
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeChip, mode === 'BRANCH' ? styles.modeChipActive : null]}
                onPress={() => applyMode('BRANCH')}
              >
                <Text style={[styles.modeChipText, mode === 'BRANCH' ? styles.modeChipTextActive : null]}>
                  Per Branch
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'BRANCH' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.branchRow}>
                {(settings?.branches || []).map((branch) => (
                  <TouchableOpacity
                    key={branch.id}
                    style={[styles.branchChip, selectedBranchId === branch.id ? styles.branchChipActive : null]}
                    onPress={() => applyBranch(branch.id)}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.branchChipText, selectedBranchId === branch.id ? styles.branchChipTextActive : null]}>
                      {branch.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            <Text style={styles.cardLabel}>Default markup</Text>
            <View style={styles.infoCard}>
              <Text style={styles.helperText}>Applied to all orders unless overridden by a pricing slab below.</Text>
              <View style={styles.markupRow}>
                <View style={styles.markupFieldWrap}>
                  <Text style={styles.fieldTitle}>MARKUP MULTIPLIER</Text>
                  <TextInput
                    style={styles.markupInput}
                    value={markupInput}
                    onChangeText={(value) => setMarkupInput(normalizeCostInput(value))}
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor="#A49A90"
                  />
                </View>
                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>Preview</Text>
                  <Text style={styles.previewCost}>{formatMoney(PREVIEW_COST)}</Text>
                  <Text style={styles.previewArrow}>→ {formatMoney(previewSell)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.slabHeaderRow}>
              <Text style={styles.cardLabel}>Pricing slabs</Text>
              <TouchableOpacity onPress={addSlab}>
                <Text style={styles.addSlabText}>+ Add slab</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.slabTable}>
              <View style={styles.slabHead}>
                <Text style={[styles.slabHeadText, styles.slabCellWide]}>COST FROM</Text>
                <Text style={[styles.slabHeadText, styles.slabCellWide]}>COST TO</Text>
                <Text style={[styles.slabHeadText, styles.slabCellNarrow]}>MARKUP</Text>
              </View>

              {slabs.map((row) => (
                <View key={row.id} style={styles.slabRow}>
                  <TextInput
                    value={row.minCost}
                    onChangeText={(value) => updateSlabField(row.id, 'minCost', value)}
                    keyboardType="decimal-pad"
                    style={[styles.slabInput, styles.slabCellWide]}
                    placeholder="$0"
                    placeholderTextColor="#A89D92"
                  />
                  <TextInput
                    value={row.maxCost}
                    onChangeText={(value) => updateSlabField(row.id, 'maxCost', value)}
                    keyboardType="default"
                    style={[styles.slabInput, styles.slabCellWide]}
                    placeholder="No limit"
                    placeholderTextColor="#A89D92"
                  />
                  <TextInput
                    value={row.multiplier}
                    onChangeText={(value) => updateSlabField(row.id, 'multiplier', value)}
                    keyboardType="decimal-pad"
                    style={[styles.slabInput, styles.slabCellNarrow]}
                    placeholder="1.0"
                    placeholderTextColor="#A89D92"
                  />
                </View>
              ))}

              {!slabs.length ? <Text style={styles.noSlabText}>No slab overrides configured yet.</Text> : null}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#211B15' },
  emptyText: { marginTop: 8, fontSize: 13, color: '#81776C', textAlign: 'center' },
  headerRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEE6DB',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  headerTitle: { fontSize: 16, lineHeight: 20, color: '#2A231C', fontWeight: '700' },
  publishBtn: {
    backgroundColor: '#171311',
    borderRadius: 11,
    height: 34,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingVertical: 14, paddingBottom: 28, gap: 10 },
  sectionTitle: { fontSize: 13, color: '#2A231C', fontWeight: '700' },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChip: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD2C4',
    backgroundColor: '#F8F6F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipActive: { backgroundColor: '#171311', borderColor: '#171311' },
  modeChipText: { fontSize: 12, color: '#7B7269', fontWeight: '700' },
  modeChipTextActive: { color: '#FFFFFF' },
  branchRow: { gap: 8, paddingVertical: 2 },
  branchChip: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E1D6C8',
    backgroundColor: '#FBF9F6',
    paddingHorizontal: 10,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchChipActive: { borderColor: '#B98E45', backgroundColor: '#F5ECD9' },
  branchChipText: { fontSize: 11, color: '#7B7267', fontWeight: '600' },
  branchChipTextActive: { color: '#9C7230', fontWeight: '700' },
  cardLabel: { fontSize: 12, color: '#322B24', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  infoCard: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#FAFAF8',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    shadowColor: '#1E140B',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  helperText: { fontSize: 11, color: '#918679', lineHeight: 15 },
  markupRow: { marginTop: 10, flexDirection: 'row', gap: 10 },
  markupFieldWrap: { flex: 1 },
  fieldTitle: { fontSize: 10, color: '#80776E', fontWeight: '700', letterSpacing: 0.7, marginBottom: 6 },
  markupInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#D8CDBF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
    fontSize: 19,
    lineHeight: 22,
    color: '#1E1A16',
    fontWeight: '800',
    backgroundColor: '#F1EEEA',
  },
  previewCard: {
    width: 112,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7C4A3',
    backgroundColor: '#F3EFE6',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  previewLabel: { fontSize: 10, color: '#978771', fontWeight: '700' },
  previewCost: { marginTop: 3, fontSize: 17, lineHeight: 20, color: '#B38433', fontWeight: '800' },
  previewArrow: { marginTop: 1, fontSize: 14, lineHeight: 17, color: '#1E1A16', fontWeight: '800' },
  slabHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addSlabText: { fontSize: 12, color: '#AE7D34', fontWeight: '700' },
  slabTable: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#FAFAF8',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  slabHead: { flexDirection: 'row', gap: 7 },
  slabHeadText: { fontSize: 9, color: '#9C9185', fontWeight: '700', letterSpacing: 0.6 },
  slabRow: { flexDirection: 'row', gap: 7 },
  slabInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#D8CEC2',
    borderRadius: 9,
    backgroundColor: '#F0ECE7',
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#2E261E',
    fontWeight: '700',
  },
  slabCellWide: { flex: 1 },
  slabCellNarrow: { width: 84 },
  noSlabText: { marginTop: 4, fontSize: 12, color: '#8D8174' },
});

export default PricingScreen;
