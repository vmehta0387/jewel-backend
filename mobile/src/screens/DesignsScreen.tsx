import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
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
type SkeletonDesignItem = { id: string; skeleton: true };

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

const DesignsScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const designsRef = useRef<Design[]>([]);
  const skeletonPulse = useRef(new Animated.Value(0.58)).current;

  const loadDesigns = useCallback(async (options?: { refresh?: boolean }) => {
    if (!token) return;
    const isRefresh = options?.refresh === true;
    const showSkeleton = !isRefresh && designsRef.current.length === 0;

    if (isRefresh) {
      setRefreshing(true);
    } else if (showSkeleton) {
      setLoading(true);
    }

    setError(null);
    try {
      const response = await fetchDesigns(token);
      const baseDesigns = response.data || [];
      const shouldApplyPricing =
        (user?.role === 'BRANCH_MANAGER' || user?.role === 'SALES_REP') &&
        Boolean(user?.companyId) &&
        Boolean(user?.branchId);

      if (!shouldApplyPricing) {
        designsRef.current = baseDesigns;
        setDesigns(baseDesigns);
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

      designsRef.current = pricedDesigns;
      setDesigns(pricedDesigns);
    } catch (err: any) {
      setError(err?.message || 'Unable to load designs');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else if (showSkeleton) {
        setLoading(false);
      }
    }
  }, [token, user?.role, user?.companyId, user?.branchId]);

  useFocusEffect(
    useCallback(() => {
      loadDesigns();
    }, [loadDesigns]),
  );

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0.58,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [skeletonPulse]);

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

  const skeletonCount = useMemo(() => {
    const visibleCount = refreshing
      ? Math.max(filteredDesigns.length, Math.min(designs.length, 6))
      : filteredDesigns.length;
    const baseCount = visibleCount > 0 ? Math.min(Math.max(visibleCount, 4), 6) : 6;
    return baseCount % 2 === 0 ? baseCount : baseCount + 1;
  }, [designs.length, filteredDesigns.length, refreshing]);

  const skeletonItems = useMemo<SkeletonDesignItem[]>(
    () => Array.from({ length: skeletonCount }, (_, index) => ({ id: `skeleton-${index}`, skeleton: true })),
    [skeletonCount],
  );
  const showGridSkeleton = (loading && designs.length === 0) || refreshing;
  const gridData = showGridSkeleton ? skeletonItems : filteredDesigns;

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
              <Image source={{ uri: imageUrl }} style={styles.designImage} resizeMode="cover" />
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

  const renderSkeletonCard = ({ index }: { index: number }) => (
    <View style={styles.cardTouchable}>
      <View style={styles.designCard}>
        <View style={styles.badgeRow}>
          <Animated.View style={[styles.skeletonBadge, { opacity: skeletonPulse }]} />
        </View>

        <Animated.View style={[styles.imageShell, styles.skeletonBlock, { opacity: skeletonPulse }]}>
          <View style={styles.skeletonImageGlow} />
          <View style={styles.skeletonImageCore} />
        </Animated.View>
        <Animated.View style={[styles.skeletonLine, styles.skeletonTitleLine, { opacity: skeletonPulse }]} />
        <Animated.View style={[styles.skeletonLine, styles.skeletonTitleLineShort, { opacity: skeletonPulse }]} />
        <Animated.View style={[styles.skeletonLine, styles.skeletonMetaLine, { opacity: skeletonPulse }]} />
        <Animated.View
          style={[
            styles.skeletonLine,
            styles.skeletonPriceLine,
            index % 2 === 0 ? styles.skeletonPriceLineWide : null,
            { opacity: skeletonPulse },
          ]}
        />
      </View>
    </View>
  );

  const renderGridItem = ({ item, index }: { item: Design | SkeletonDesignItem; index: number }) =>
    'skeleton' in item ? renderSkeletonCard({ index }) : renderDesignCard({ item, index });

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
                  style={[styles.chip, selected ? styles.chipActive : null]}
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
        data={gridData}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderGridItem}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={showGridSkeleton ? null : renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => loadDesigns({ refresh: true })}
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
    paddingTop: 18,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#efe4d8',
    shadowColor: '#9c7f64',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#2d221c',
    height: 40,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  chipList: {
    gap: 8,
    paddingRight: 12,
  },
  chip: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3ebe2',
    borderWidth: 1,
    borderColor: '#eadfce',
  },
  chipActive: {
    backgroundColor: '#211711',
    borderColor: '#211711',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f6d60',
  },
  chipTextActive: {
    color: '#fff9f4',
  },
  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3ebe2',
    borderWidth: 1,
    borderColor: '#eadfce',
    marginLeft: 10,
  },
  error: {
    marginTop: 12,
    color: '#b14b42',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 28,
    flexGrow: 1,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTouchable: {
    width: '48.3%',
  },
  designCard: {
    backgroundColor: '#fffaf5',
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: '#efe3d6',
    shadowColor: '#513829',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
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
    height: 128,
    borderRadius: 18,
    backgroundColor: '#f6efe7',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#2c2019',
    minHeight: 36,
  },
  designMeta: {
    fontSize: 11,
    color: '#8c7a6c',
    marginTop: 4,
  },
  designPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2c2019',
    marginTop: 10,
  },
  skeletonBlock: {
    backgroundColor: '#f1e5d8',
  },
  skeletonBadge: {
    width: 74,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#f0e2d3',
  },
  skeletonImageGlow: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  skeletonImageCore: {
    width: '72%',
    height: '72%',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  skeletonLine: {
    borderRadius: 999,
    backgroundColor: '#efe2d3',
  },
  skeletonTitleLine: {
    height: 14,
    width: '84%',
  },
  skeletonTitleLineShort: {
    height: 14,
    width: '62%',
    marginTop: 6,
  },
  skeletonMetaLine: {
    height: 10,
    width: '66%',
    marginTop: 10,
  },
  skeletonPriceLine: {
    height: 14,
    width: '42%',
    marginTop: 12,
  },
  skeletonPriceLineWide: {
    width: '48%',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#fbf7f2',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: '#ece2d7',
    marginTop: 10,
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
