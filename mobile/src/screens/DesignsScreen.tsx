import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    design.designName,
    design.jewelryGroup,
    design.collection,
    design.jewelrySize,
    design.goldColour,
    design.diamondType,
    design.diamondSpread,
    design.diamondQuality,
    design.version,
    ...(design.gemstones?.flatMap((gem) => [gem.stone, gem.shape, gem.size, gem.color, gem.quality]) || []),
    ...(design.metals?.flatMap((metal) => [metal.goldColour, metal.metalCaratage]) || []),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

const normalizeBaseDesignNo = (designNo?: string | null) => String(designNo || '').replace(/-V\d+$/i, '').trim();
type SortOption = 'recent' | 'priceAsc' | 'priceDesc' | 'designAsc' | 'designDesc';
type PriceBand = 'ALL' | 'UNDER_2000' | 'BETWEEN_2000_5000' | 'ABOVE_5000';

const SORT_OPTIONS: Array<{ key: SortOption; label: string }> = [
  { key: 'recent', label: 'Newest first' },
  { key: 'priceAsc', label: 'Price: Low to High' },
  { key: 'priceDesc', label: 'Price: High to Low' },
  { key: 'designAsc', label: 'Design No: A to Z' },
  { key: 'designDesc', label: 'Design No: Z to A' },
];

const PRICE_BAND_OPTIONS: Array<{ key: PriceBand; label: string }> = [
  { key: 'ALL', label: 'Any Price' },
  { key: 'UNDER_2000', label: 'Under USD 2000' },
  { key: 'BETWEEN_2000_5000', label: 'USD 2000 - 5000' },
  { key: 'ABOVE_5000', label: 'Above USD 5000' },
];

const normalizeText = (value?: string | null) => String(value || '').trim();
const toLower = (value?: string | null) => normalizeText(value).toLowerCase();

const uniqueNonEmpty = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.map((v) => normalizeText(v)).filter(Boolean)));

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

const getDesignShapes = (design: Design) =>
  uniqueNonEmpty((design.gemstones || []).map((gem) => gem.shape));

const getDesignDiamondTypes = (design: Design) =>
  uniqueNonEmpty([design.diamondType, ...(design.gemstones || []).map((gem) => gem.stone)]);

// Kept as a compatibility helper to avoid runtime stale-bundle crashes
// when older cached JS still references this function.
const getDesignMetals = (design: Design) =>
  uniqueNonEmpty([
    design.goldColour,
    ...(design.metals || []).flatMap((metal) => [metal.goldColour, metal.metalCaratage]),
  ]);

const DesignsScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const numColumns = 2;
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCollection, setSelectedCollection] = useState('All');
  const [selectedShape, setSelectedShape] = useState('All');
  const [selectedDiamondType, setSelectedDiamondType] = useState('All');
  const [selectedPriceBand, setSelectedPriceBand] = useState<PriceBand>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

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

  const collections = useMemo(() => {
    const source =
      selectedCategory === 'All'
        ? designs
        : designs.filter((design) => toLower(design.jewelryGroup) === toLower(selectedCategory));

    return ['All', ...uniqueNonEmpty(source.map((design) => design.collection))];
  }, [designs, selectedCategory]);

  const shapeOptions = useMemo(
    () => ['All', ...uniqueNonEmpty(designs.flatMap((design) => getDesignShapes(design)))],
    [designs],
  );

  const diamondTypeOptions = useMemo(
    () => ['All', ...uniqueNonEmpty(designs.flatMap((design) => getDesignDiamondTypes(design)))],
    [designs],
  );

  const filteredDesigns = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = designs.filter((design) => {
      const matchesCategory =
        selectedCategory === 'All' || toLower(design.jewelryGroup) === toLower(selectedCategory);
      const matchesCollection =
        selectedCollection === 'All' || toLower(design.collection) === toLower(selectedCollection);
      const matchesShape =
        selectedShape === 'All' ||
        getDesignShapes(design).some((shape) => toLower(shape) === toLower(selectedShape));
      const matchesDiamondType =
        selectedDiamondType === 'All' ||
        getDesignDiamondTypes(design).some((type) => toLower(type) === toLower(selectedDiamondType));
      const designPrice = Number(getDisplayPrice(design, user?.role) || 0);
      const matchesPriceBand =
        selectedPriceBand === 'ALL' ||
        (selectedPriceBand === 'UNDER_2000' && designPrice < 2000) ||
        (selectedPriceBand === 'BETWEEN_2000_5000' && designPrice >= 2000 && designPrice <= 5000) ||
        (selectedPriceBand === 'ABOVE_5000' && designPrice > 5000);
      const matchesSearch = !term || getSearchableFields(design).some((value) => value.includes(term));

      return (
        matchesCategory &&
        matchesCollection &&
        matchesShape &&
        matchesDiamondType &&
        matchesPriceBand &&
        matchesSearch
      );
    });

    const sorted = [...filtered];
    const getPrice = (design: Design) => Number(getDisplayPrice(design, user?.role) || 0);
    const getDesignNo = (design: Design) => String(design.designNo || '').toLowerCase();

    if (sortOption === 'priceAsc') {
      sorted.sort((a, b) => getPrice(a) - getPrice(b));
    } else if (sortOption === 'priceDesc') {
      sorted.sort((a, b) => getPrice(b) - getPrice(a));
    } else if (sortOption === 'designAsc') {
      sorted.sort((a, b) => getDesignNo(a).localeCompare(getDesignNo(b)));
    } else if (sortOption === 'designDesc') {
      sorted.sort((a, b) => getDesignNo(b).localeCompare(getDesignNo(a)));
    }

    return sorted;
  }, [
    designs,
    search,
    selectedCategory,
    selectedCollection,
    selectedShape,
    selectedDiamondType,
    selectedPriceBand,
    sortOption,
    user?.role,
  ]);

  const renderDesignCard = ({ item, index }: { item: Design; index: number }) => {
    const badge = getBadge(index);
    const imageUrl = item.imageUrls?.[0];

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.cardTouchable, numColumns > 1 ? styles.cardTouchableGrid : null]}
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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'All') count += 1;
    if (selectedCollection !== 'All') count += 1;
    if (selectedShape !== 'All') count += 1;
    if (selectedDiamondType !== 'All') count += 1;
    if (selectedPriceBand !== 'ALL') count += 1;
    return count;
  }, [selectedCategory, selectedCollection, selectedShape, selectedDiamondType, selectedPriceBand]);

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
    <View style={styles.container}>
      <LinearGradient colors={['#FCFAF8', '#F5EBE1', '#E8D5C4']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
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
            {collections.map((item) => {
              const selected = item === selectedCollection;

              return (
                <TouchableOpacity
                  key={`collection-${item}`}
                  activeOpacity={0.9}
                  onPress={() => setSelectedCollection(item)}
                  style={[styles.chip, styles.chipSpacing, selected ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setSortMenuVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="options-outline" size={16} color="#6f6257" />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <Modal
        visible={sortMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSortMenuVisible(false)}>
          <View style={styles.sortOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sortCard}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.sortTitle}>Sort & Filters</Text>
                  {SORT_OPTIONS.map((option) => {
                    const selected = sortOption === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[styles.sortOption, selected ? styles.sortOptionActive : null]}
                        onPress={() => {
                          setSortOption(option.key);
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.sortOptionText, selected ? styles.sortOptionTextActive : null]}>
                          {option.label}
                        </Text>
                        {selected ? <Ionicons name="checkmark-circle" size={18} color="#9C7127" /> : null}
                      </TouchableOpacity>
                    );
                  })}

                <Text style={styles.filterSectionTitle}>Collection</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChipRow}>
                  {collections.map((item) => {
                    const selected = item === selectedCollection;
                    return (
                      <TouchableOpacity
                        key={`m-col-${item}`}
                        style={[styles.modalChip, selected ? styles.modalChipActive : null]}
                        onPress={() => setSelectedCollection(item)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.modalChipText, selected ? styles.modalChipTextActive : null]}>{item}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={styles.filterSectionTitle}>Diamond Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChipRow}>
                  {diamondTypeOptions.map((item) => {
                    const selected = item === selectedDiamondType;
                    return (
                      <TouchableOpacity
                        key={`m-type-${item}`}
                        style={[styles.modalChip, selected ? styles.modalChipActive : null]}
                        onPress={() => setSelectedDiamondType(item)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.modalChipText, selected ? styles.modalChipTextActive : null]}>{item}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={styles.filterSectionTitle}>Price</Text>
                <View style={styles.priceBandGrid}>
                  {PRICE_BAND_OPTIONS.map((option) => {
                    const selected = option.key === selectedPriceBand;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[styles.modalChip, styles.priceBandChip, selected ? styles.modalChipActive : null]}
                        onPress={() => setSelectedPriceBand(option.key)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.modalChipText, selected ? styles.modalChipTextActive : null]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                  <View style={styles.sortActionsRow}>
                  <TouchableOpacity
                    style={styles.sortActionButton}
                    onPress={() => {
                      setSearch('');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.sortActionText}>Reset Search</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sortActionButton}
                    onPress={() => {
                      setSortOption('recent');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.sortActionText}>Reset Sort</Text>
                  </TouchableOpacity>
                  </View>
                  <View style={styles.sortActionsRow}>
                  <TouchableOpacity
                    style={styles.sortActionButton}
                    onPress={() => {
                      setSelectedCategory('All');
                      setSelectedCollection('All');
                      setSelectedShape('All');
                      setSelectedDiamondType('All');
                      setSelectedPriceBand('ALL');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.sortActionText}>Reset Filters</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sortActionButton, styles.sortApplyButton]}
                    onPress={() => setSortMenuVisible(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.sortActionText, styles.sortApplyText]}>Apply</Text>
                  </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <FlatList
        data={filteredDesigns}
        key={`design-grid-${numColumns}`}
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
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
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
  subChipList: {
    paddingRight: 8,
    marginTop: 8,
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
    backgroundColor: '#D8AB52',
    borderColor: '#C6973F',
  },
  chipText: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: '600',
    color: '#6A5F56',
  },
  chipTextActive: {
    color: '#FFFFFF',
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
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: '#D8AB52',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f8efe5',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  subChip: {
    height: Platform.OS === 'android' ? 28 : 30,
    borderRadius: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.24)',
    marginRight: 8,
  },
  subChipActive: {
    backgroundColor: '#FAF5EE',
    borderColor: '#C6973F',
  },
  subChipText: {
    fontSize: 11,
    color: '#6A5F56',
    fontWeight: '600',
  },
  subChipTextActive: {
    color: '#9C7127',
  },
  sortOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'android' ? 104 : 118,
    paddingRight: 18,
  },
  sortCard: {
    width: '92%',
    maxWidth: 360,
    maxHeight: '80%',
    borderRadius: 14,
    backgroundColor: '#FFF8F1',
    borderWidth: 1,
    borderColor: '#D8C4AF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  sortTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C1E16',
    marginBottom: 8,
  },
  filterSectionTitle: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#5E5045',
  },
  modalChipRow: {
    paddingBottom: 4,
    paddingRight: 4,
  },
  modalChip: {
    minHeight: 32,
    borderRadius: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
    borderWidth: 1,
    borderColor: '#E3D1BC',
  },
  modalChipActive: {
    backgroundColor: '#FAF5EE',
    borderColor: '#C6973F',
  },
  modalChipText: {
    fontSize: 11,
    color: '#6A5F56',
    fontWeight: '600',
  },
  modalChipTextActive: {
    color: '#9C7127',
  },
  priceBandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  priceBandChip: {
    marginRight: 8,
  },
  sortOption: {
    minHeight: 38,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
    borderWidth: 1,
    borderColor: '#E3D1BC',
  },
  sortOptionActive: {
    backgroundColor: '#FAF5EE',
    borderColor: '#C6973F',
  },
  sortOptionText: {
    fontSize: 12,
    color: '#6A5F56',
    fontWeight: '600',
  },
  sortOptionTextActive: {
    color: '#9C7127',
  },
  sortActionsRow: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
  },
  sortActionButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    borderWidth: 1,
    borderColor: '#DCC8B2',
  },
  sortActionText: {
    fontSize: 11,
    color: '#6A5A4D',
    fontWeight: '700',
  },
  sortApplyButton: {
    backgroundColor: '#D8AB52',
    borderColor: '#C6973F',
  },
  sortApplyText: {
    color: '#FFFFFF',
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
  cardTouchableGrid: {
    width: '48.5%',
    marginBottom: 0,
  },
  designCard: {
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: '#DCC8B2',
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
    color: '#4A3E35',
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
    color: '#4A3E35',
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
