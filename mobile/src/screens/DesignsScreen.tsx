import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import Screen from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { fetchDesigns } from '../api/designs';
import { fetchPricePreview } from '../api/orders';
import type { Design } from '../types';
import type { DesignsStackParamList } from '../navigation/RootNavigator';
import { formatCurrency } from '../utils/format';

type BadgeTone = 'champagne' | 'mint' | 'rose';

const BADGE_PRESETS: Array<{ label: string; tone: BadgeTone }> = [
  { label: 'Bestseller', tone: 'champagne' },
  { label: 'New', tone: 'mint' },
  { label: 'Editor Pick', tone: 'rose' },
];

const getBadge = (index: number) => BADGE_PRESETS[index % BADGE_PRESETS.length];

const getDisplayPrice = (design: Design, role?: string) =>
  role === 'BRANCH_MANAGER' || role === 'SALES_REP'
    ? design.displayPrice ?? design.totalValue ?? 0
    : design.totalValue ?? 0;

const getDesignMeta = (design: Design) => {
  const sizeLabel = design.jewelrySize ? `Size ${design.jewelrySize}` : 'Size N/A';
  const toneLabel =
    design.goldColour ||
    design.metals?.find((metal) => metal.goldColour)?.goldColour ||
    design.metals?.find((metal) => metal.metalCaratage)?.metalCaratage ||
    design.version;

  return toneLabel ? `${sizeLabel} - ${toneLabel}` : sizeLabel;
};

const getSearchableFields = (design: Design) =>
  [
    design.designNo,
    design.jewelryGroup,
    design.jewelrySize,
    design.goldColour,
    design.version,
    ...(design.metals?.flatMap((metal) => [metal.goldColour, metal.metalCaratage]) || []),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

const normalizeBaseDesignNo = (designNo?: string | null) => String(designNo || '').replace(/-V\d+$/i, '').trim();

const isActiveDesign = (design: Design) => {
  const row = design as Design & { status?: string; isActive?: boolean };
  if (typeof row.isActive === 'boolean') return row.isActive;
  if (typeof row.status === 'string') return row.status.toUpperCase() === 'ACTIVE';
  return true;
};

const keepPrimaryDesignsOnly = (rows: Design[]) => {
  if (!rows.length) return rows;
  const hasExplicitPrimaryFlag = rows.some((row) => typeof row.isPrimary === 'boolean');

  if (hasExplicitPrimaryFlag) {
    return rows.filter((row) => row.isPrimary === true);
  }

  const primaryByBase = new Map<string, Design>();
  for (const row of rows) {
    const base = normalizeBaseDesignNo(row.designNo);
    if (!base) continue;
    const existing = primaryByBase.get(base);
    const isV1 = /^V1$/i.test(String(row.version || '').trim());

    if (!existing) {
      primaryByBase.set(base, row);
      continue;
    }

    const existingIsV1 = /^V1$/i.test(String(existing.version || '').trim());
    if (isV1 && !existingIsV1) {
      primaryByBase.set(base, row);
    }
  }

  return primaryByBase.size > 0 ? Array.from(primaryByBase.values()) : rows;
};

const DesignsScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const numColumns = 1;
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadDesigns = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchDesigns(token);
      const activeDesigns = (response.data || []).filter(isActiveDesign);
      const baseDesigns = keepPrimaryDesignsOnly(activeDesigns);
      // Render immediately so users don't wait for pricing preview round-trips.
      setDesigns(baseDesigns);

      const shouldApplyPricing =
        (user?.role === 'BRANCH_MANAGER' || user?.role === 'SALES_REP') &&
        Boolean(user?.companyId) &&
        Boolean(user?.branchId);

      if (!shouldApplyPricing) {
        return;
      }

      const companyId = user.companyId as string;
      const branchId = user.branchId as string;
      const pricedDesigns = await Promise.all(
        baseDesigns.map(async (design) => {
          try {
            const preview = await fetchPricePreview(token, design.id, companyId, branchId);
            return { ...design, displayPrice: preview.finalPrice };
          } catch {
            return { ...design, displayPrice: design.totalValue ?? 0 };
          }
        }),
      );

      setDesigns((current) => {
        const byId = new Map(pricedDesigns.map((row) => [row.id, row]));
        return current.map((row) => byId.get(row.id) || row);
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to load designs');
    } finally {
      setLoading(false);
    }
  }, [token, user?.role, user?.companyId, user?.branchId]);

  useFocusEffect(
    useCallback(() => {
      loadDesigns();
    }, [loadDesigns]),
  );

  const categories = useMemo(() => {
    const orderedGroups = Array.from(
      new Set(
        designs
          .map((design) => design.jewelryGroup?.trim())
          .filter(Boolean) as string[],
      ),
    );

    return ['All', ...orderedGroups];
  }, [designs]);

  const filteredDesigns = useMemo(() => {
    const term = search.trim().toLowerCase();

    return designs.filter((design) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        (design.jewelryGroup || '').toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch = !term || getSearchableFields(design).some((value) => value.includes(term));

      return matchesCategory && matchesSearch;
    });
  }, [designs, search, selectedCategory]);

  const renderDesignCard = ({ item, index }: { item: Design; index: number }) => {
    const badge = getBadge(index);
    const imageUrl = item.imageUrls?.[0];

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.cardTouchable}
        onPress={() => navigation.navigate('DesignDetail', { designId: item.id })}
      >
        <View style={styles.designCard}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                badge.tone === 'mint' ? styles.badgeMint : null,
                badge.tone === 'rose' ? styles.badgeRose : null,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  badge.tone === 'mint' ? styles.badgeTextMint : null,
                  badge.tone === 'rose' ? styles.badgeTextRose : null,
                ]}
              >
                {badge.label}
              </Text>
            </View>
          </View>

          <View style={styles.imageShell}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl, cache: 'force-cache' }}
                style={styles.designImage}
                resizeMode="cover"
                resizeMethod="resize"
                fadeDuration={120}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="diamond-outline" size={34} color="#cfb49a" />
              </View>
            )}
          </View>

          <Text style={styles.designName} numberOfLines={2}>
            {item.designNo}
          </Text>
          <Text style={styles.designMeta} numberOfLines={1}>
            {getDesignMeta(item)}
          </Text>
          <Text style={styles.designPrice}>{formatCurrency(getDisplayPrice(item, user?.role))}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading && designs.length === 0) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color="#8a6b55" />
          <Text style={styles.loadingText}>Loading designs...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="sparkles-outline" size={28} color="#8a6b55" />
        </View>
        <Text style={styles.emptyTitle}>No designs match your search</Text>
        <Text style={styles.emptyText}>Try another keyword or reset the filters to explore the full catalog.</Text>
      </View>
    );
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.fixedHeader}>
        <View style={styles.searchShell}>
          <Ionicons name="search-outline" size={18} color="#a79687" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search designs, styles, groups..."
            placeholderTextColor="#a79687"
            value={search}
            onChangeText={setSearch}
            underlineColorAndroid="transparent"
            cursorColor="#8B7355"
            selectionColor="#8B7355"
            autoCorrect={false}
            autoCapitalize="none"
            textAlignVertical="center"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#b2a294" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipList}
          >
            {categories.map((item) => {
              const selected = item === selectedCategory;

              return (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.9}
                  onPress={() => setSelectedCategory(item)}
                  style={[styles.chip, styles.chipSpacing, selected ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              setSelectedCategory('All');
              setSearch('');
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="options-outline" size={16} color="#6f6257" />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <FlatList
        data={filteredDesigns}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        renderItem={renderDesignCard}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={30}
        removeClippedSubviews
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadDesigns}
            tintColor="#8a6b55"
            colors={['#8a6b55']}
          />
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: 'transparent',
  },
  fixedHeader: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 10 : 18,
    paddingBottom: Platform.OS === 'android' ? 8 : 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    zIndex: 5,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.16)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#8B7355',
    shadowColor: '#9c7f64',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 0 : 1,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#2d221c',
    height: 40,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 10 : 14,
  },
  chipList: {
    paddingRight: 12,
  },
  chipSpacing: {
    marginRight: 8,
  },
  chip: {
    height: Platform.OS === 'android' ? 30 : 34,
    borderRadius: 12,
    paddingHorizontal: Platform.OS === 'android' ? 12 : 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  chipActive: {
    backgroundColor: '#2C1E16',
    borderColor: '#2C1E16',
  },
  chipText: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  chipTextActive: {
    color: 'rgba(255, 252, 245, 0.82)',
  },
  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    marginLeft: 10,
  },
  error: {
    marginTop: 12,
    color: '#b14b42',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 4 : 6,
    paddingBottom: Platform.OS === 'android' ? 20 : 28,
    flexGrow: 1,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: Platform.OS === 'android' ? 10 : 14,
  },
  cardTouchable: {
    width: '100%',
    marginBottom: Platform.OS === 'android' ? 10 : 14,
  },
  designCard: {
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1.3,
    borderColor: '#7C6650',
    borderRadius: 14,
    padding: Platform.OS === 'android' ? 10 : 12,
    shadowColor: '#6E533D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 0 : 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  badge: {
    backgroundColor: '#f5dfb6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeMint: {
    backgroundColor: '#daf0e4',
  },
  badgeRose: {
    backgroundColor: '#f3dedd',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#966c26',
  },
  badgeTextMint: {
    color: '#36775a',
  },
  badgeTextRose: {
    color: '#8a4a4a',
  },
  imageShell: {
    height: Platform.OS === 'android' ? 146 : 186,
    borderRadius: 18,
    backgroundColor: '#f6efe7',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'android' ? 8 : 12,
  },
  designImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  designName: {
    fontFamily: 'serif',
    fontSize: Platform.OS === 'android' ? 13 : 14,
    lineHeight: Platform.OS === 'android' ? 17 : 18,
    fontWeight: '700',
    color: '#2C1E16',
    minHeight: Platform.OS === 'android' ? 28 : 36,
  },
  designMeta: {
    fontSize: Platform.OS === 'android' ? 10 : 11,
    color: '#8E8E93',
    marginTop: Platform.OS === 'android' ? 2 : 4,
  },
  designPrice: {
    fontFamily: 'serif',
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '800',
    color: '#2C1E16',
    marginTop: Platform.OS === 'android' ? 6 : 10,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 44,
  },
  loadingText: {
    fontSize: 13,
    color: '#8a786a',
    marginTop: 10,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: '#8B7355',
    marginTop: 20,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#f2e7da',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2b2019',
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8a786a',
    lineHeight: 20,
  },
});

export default DesignsScreen;
