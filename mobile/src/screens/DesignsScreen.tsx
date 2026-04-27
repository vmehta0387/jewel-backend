import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { fetchDesigns } from '../api/designs';
import { fetchOrders, fetchPricePreview } from '../api/orders';
import type { Design } from '../types';
import type { CatalogPresetCategory, DesignsStackParamList } from '../navigation/RootNavigator';

type NotificationTone = 'alertGold' | 'alertRed' | 'neutral' | 'info' | 'promo';
type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  sortDate: Date;
};
type NotificationEntry = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  tone: NotificationTone;
};

const formatRelativeTime = (date: Date): string => {
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString();
};

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

const SHAPE_LABELS = [
  'Round',
  'Oval',
  'Emerald',
  'Radiant',
  'Cushion',
  'Princess',
  'Pear',
  'Marquise',
  'Heart',
  'Asscher',
  'Baguette',
  'Trillion',
];

const SHAPE_LOOKUP = new Map(SHAPE_LABELS.map((shape) => [shape.toLowerCase(), shape]));
const SHAPE_PATTERNS = SHAPE_LABELS.map((shape) => ({
  label: shape,
  pattern: new RegExp(`\\b${shape.toLowerCase()}\\b`, 'i'),
}));

const normalizeShapeLabel = (value?: string | null) => {
  const cleaned = normalizeText(value);
  if (!cleaned) return '';

  const mapped = SHAPE_LOOKUP.get(cleaned.toLowerCase());
  if (mapped) return mapped;

  return cleaned
    .split(/[\s-]+/)
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : ''))
    .join(' ');
};

const extractKnownShapes = (values: Array<string | null | undefined>) => {
  const found: string[] = [];
  const joined = values.map((value) => toLower(value)).filter(Boolean);

  for (const text of joined) {
    for (const entry of SHAPE_PATTERNS) {
      if (entry.pattern.test(text)) {
        found.push(entry.label);
      }
    }
  }

  return uniqueNonEmpty(found);
};

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

const getDesignShapes = (design: Design) => {
  const row = design as Design & { shape?: string | null; Shape?: string | null; stoneInfo?: string | null };
  const explicitShapes = uniqueNonEmpty([
    ...(design.gemstones || []).map((gem) => gem.shape),
    row.shape,
    row.Shape,
  ]).map((shape) => normalizeShapeLabel(shape));

  const inferredShapes = extractKnownShapes([
    design.diamondSpread,
    row.stoneInfo,
    design.designName,
    design.designNo,
  ]);

  return uniqueNonEmpty([...explicitShapes, ...inferredShapes]);
};

const getDesignDiamondTypes = (design: Design) =>
  uniqueNonEmpty([design.diamondType, ...(design.gemstones || []).map((gem) => gem.stone)]);

// Kept as a compatibility helper to avoid runtime stale-bundle crashes
// when older cached JS still references this function.
const getDesignMetals = (design: Design) =>
  uniqueNonEmpty([
    design.goldColour,
    ...(design.metals || []).flatMap((metal) => [metal.goldColour, metal.metalCaratage]),
  ]);

const PRESET_CATEGORY_MATCH: Record<CatalogPresetCategory, string[]> = {
  rings: ['ring'],
  bracelets: ['bracelet', 'bangle'],
  studs: ['stud', 'earring'],
  necklaces: ['necklace', 'pendant', 'chain'],
};

const PRESET_CATEGORY_TITLES: Record<CatalogPresetCategory, string> = {
  rings: 'Eternity Rings',
  bracelets: 'Bracelets',
  studs: 'Studs',
  necklaces: 'Necklaces',
};

// Keep helper at module scope so stale fast-refresh closures always find it.
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const DesignsScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const route = useRoute<RouteProp<DesignsStackParamList, 'Designs'>>();
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
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const appliedSearchPresetRef = useRef('');
  const appliedCategoryPresetRef = useRef('');

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

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const ordersRes = await fetchOrders(token, 1, 100, 'ALL');
      const orderRows = ordersRes.data || [];
      const items: ActivityItem[] = [];
      const activityRows =
        user?.role === 'BRANCH_MANAGER'
          ? orderRows.filter((order) =>
              ['PENDING_APPROVAL', 'APPROVED', 'CANCELLED'].includes(String(order.status || '').toUpperCase()),
            )
          : orderRows.filter((order) => (user?.id ? order.salesRepId === user.id : false));

      for (const order of activityRows.slice(0, 15)) {
        const date = order.createdAt ? new Date(order.createdAt) : new Date();
        const salesPerson = order.salesRepName || order.salesRepEmail || 'Sales rep';
        const managerName =
          order.branchManagerName || [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Manager';
        const normalizedStatus = String(order.status || '').toUpperCase();

        let title = '';
        let subtitle = order.designNo || 'No design';

        if (user?.role === 'BRANCH_MANAGER') {
          if (normalizedStatus === 'PENDING_APPROVAL') {
            title = `Order #${order.orderNumber} came for approval`;
            subtitle = `From sales rep ${salesPerson}`;
          } else if (normalizedStatus === 'APPROVED') {
            title = `Order #${order.orderNumber} approved`;
            subtitle = `For sales rep ${salesPerson}`;
          } else if (normalizedStatus === 'CANCELLED') {
            title = `Order #${order.orderNumber} cancelled`;
            subtitle = `For sales rep ${salesPerson}`;
          } else {
            title = `Order #${order.orderNumber} updated`;
            subtitle = `${order.designNo || 'No design'} - ${salesPerson}`;
          }
        } else {
          if (normalizedStatus === 'PENDING_APPROVAL') {
            title = `Order #${order.orderNumber} sent for approval`;
            subtitle = `To manager ${managerName}`;
          } else if (normalizedStatus === 'APPROVED') {
            title = `Order #${order.orderNumber} approved`;
            subtitle = `By manager ${managerName}`;
          } else if (normalizedStatus === 'CANCELLED') {
            title = `Order #${order.orderNumber} cancelled`;
            subtitle = `By manager ${managerName}`;
          } else {
            title = `Order #${order.orderNumber} updated`;
            subtitle = order.designNo || 'No design';
          }
        }

        items.push({
          id: `order-${order.id}-${normalizedStatus}`,
          title,
          subtitle,
          time: formatRelativeTime(date),
          sortDate: date,
        });
      }

      items.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
      setActivity(items);
      setNotificationCount(items.length);
    } catch {
      setActivity([]);
      setNotificationCount(0);
    }
  }, [token, user?.id, user?.role, user?.firstName, user?.lastName]);

  const handleOpenNotifications = useCallback(() => {
    setNotificationsVisible(true);
    setNotificationCount(0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDesigns();
      loadNotifications();
    }, [loadDesigns, loadNotifications]),
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

  useEffect(() => {
    const presetSearch = String(route.params?.prefillSearch || '').trim();
    if (!presetSearch || appliedSearchPresetRef.current === presetSearch) return;
    setSearch(presetSearch);
    appliedSearchPresetRef.current = presetSearch;
  }, [route.params?.prefillSearch]);

  useEffect(() => {
    const presetCategory = route.params?.presetCategory;
    if (!presetCategory || categories.length <= 1) return;

    const signature = `${presetCategory}|${categories.join('|')}`;
    if (appliedCategoryPresetRef.current === signature) return;

    const hints = PRESET_CATEGORY_MATCH[presetCategory] || [];
    const matchedCategory =
      categories
        .filter((item) => item !== 'All')
        .find((item) => hints.some((hint) => item.toLowerCase().includes(hint))) || 'All';

    setSelectedCategory(matchedCategory);
    setSelectedCollection('All');
    setSelectedShape('All');
    setSelectedDiamondType('All');
    setSelectedPriceBand('ALL');
    appliedCategoryPresetRef.current = signature;
  }, [route.params?.presetCategory, categories]);

  const collections = useMemo(() => {
    const source =
      selectedCategory === 'All'
        ? designs
        : designs.filter((design) => toLower(design.jewelryGroup) === toLower(selectedCategory));

    return ['All', ...uniqueNonEmpty(source.map((design) => design.collection))];
  }, [designs, selectedCategory]);

  const shapeOptions = useMemo(
    () => uniqueNonEmpty(designs.flatMap((design) => getDesignShapes(design))),
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

  const useCollectionRibbon = useMemo(
    () => collections.some((item) => toLower(item) !== 'all'),
    [collections],
  );

  const ribbonTabs = useMemo(
    () =>
      useCollectionRibbon
        ? ['All', ...collections.filter((item) => toLower(item) !== 'all')]
        : ['All', ...categories.filter((item) => toLower(item) !== 'all')],
    [useCollectionRibbon, collections, categories],
  );

  const catalogTitle = useMemo(() => {
    const preset = route.params?.presetCategory;
    if (preset && PRESET_CATEGORY_TITLES[preset]) return PRESET_CATEGORY_TITLES[preset];
    if (selectedCategory !== 'All') return selectedCategory;
    return 'Browse Catalog';
  }, [route.params?.presetCategory, selectedCategory]);

  const searchPlaceholder = useMemo(() => {
    const preset = route.params?.presetCategory;
    if (preset === 'rings') return 'Search rings...';
    if (preset === 'bracelets') return 'Search bracelets...';
    if (preset === 'studs') return 'Search studs...';
    if (preset === 'necklaces') return 'Search necklaces...';
    return 'Search products...';
  }, [route.params?.presetCategory]);

  const activityEntries: NotificationEntry[] = useMemo(
    () =>
      activity.slice(0, 10).map((item) => {
        const text = `${item.title} ${item.subtitle}`.toLowerCase();
        const isApproval = text.includes('approval') || text.includes('approve');
        const isCritical = text.includes('cancelled') || text.includes('rejected') || text.includes('failed');
        const tone: NotificationTone = isCritical ? 'alertRed' : isApproval ? 'alertGold' : 'neutral';
        return {
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          time: item.time,
          tone,
        };
      }),
    [activity],
  );

  const alerts = useMemo(
    () => activityEntries.filter((entry) => entry.tone === 'alertGold' || entry.tone === 'alertRed').slice(0, 3),
    [activityEntries],
  );
  const recentActivity = useMemo(
    () => activityEntries.filter((entry) => entry.tone === 'neutral').slice(0, 4),
    [activityEntries],
  );
  const updates: NotificationEntry[] = useMemo(
    () => [
      {
        id: 'update-catalog-sync',
        title: 'Catalog sync completed',
        subtitle: 'Latest designs are available for browsing',
        time: 'Available now',
        tone: 'info',
      },
      {
        id: 'update-catalog-count',
        title: `${filteredDesigns.length} designs in ${catalogTitle}`,
        subtitle: 'Use filters to narrow or expand your results',
        time: 'Now',
        tone: 'promo',
      },
    ],
    [filteredDesigns.length, catalogTitle],
  );

  const getNotificationCardStyle = (tone: NotificationTone) => {
    if (tone === 'alertGold') return [styles.notificationCardBase, styles.notificationCardGold];
    if (tone === 'alertRed') return [styles.notificationCardBase, styles.notificationCardRed];
    if (tone === 'info') return [styles.notificationCardBase, styles.notificationCardInfo];
    if (tone === 'promo') return [styles.notificationCardBase, styles.notificationCardPromo];
    return [styles.notificationCardBase, styles.notificationCardNeutral];
  };

  const getNotificationDotStyle = (tone: NotificationTone) => {
    if (tone === 'alertGold') return [styles.notificationDot, styles.notificationDotGold];
    if (tone === 'alertRed') return [styles.notificationDot, styles.notificationDotRed];
    if (tone === 'info') return [styles.notificationDot, styles.notificationDotInfo];
    if (tone === 'promo') return [styles.notificationDot, styles.notificationDotPromo];
    return [styles.notificationDot, styles.notificationDotNeutral];
  };

  const hasAnyNotifications = alerts.length || recentActivity.length || updates.length;

  const renderDesignCard = ({ item }: { item: Design; index: number }) => {
    const imageUrl = item.imageUrls?.[0];

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.cardTouchable, numColumns > 1 ? styles.cardTouchableGrid : null]}
        onPress={() => navigation.navigate('DesignDetail', { designId: item.id })}
      >
        <View style={styles.designCard}>
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

          <View style={styles.cardBody}>
            <Text style={styles.designName} numberOfLines={1}>
              {item.designName || item.designNo}
            </Text>
            <Text style={styles.designMeta} numberOfLines={1}>
              {getDesignMeta(item)}
            </Text>
            <Text style={styles.designPrice}>{formatCurrency(getDisplayPrice(item, user?.role))}</Text>
          </View>
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
      <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <View style={styles.fixedHeader}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.85}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                  return;
                }
                navigation.navigate('CatalogCategories');
              }}
            >
              <Ionicons name="chevron-back" size={18} color="#7A6E61" />
            </TouchableOpacity>

            <Text style={styles.pageTitle} numberOfLines={1}>
              {catalogTitle}
            </Text>

            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.85} onPress={handleOpenNotifications}>
              <Ionicons name="notifications-outline" size={18} color="#7A6E61" />
              {notificationCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          <View style={styles.searchShell}>
            <Ionicons name="search-outline" size={16} color="#A59686" />
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor="#A59686"
              value={search}
              onChangeText={setSearch}
              underlineColorAndroid="transparent"
              cursorColor="#8B7355"
              selectionColor="#8B7355"
              autoCorrect={false}
              autoCapitalize="none"
              textAlignVertical="center"
            />

            <TouchableOpacity
              style={styles.searchActionBtn}
              onPress={() => navigation.navigate('CatalogCategories')}
              activeOpacity={0.85}
            >
              <Ionicons name="grid-outline" size={14} color="#8D8276" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchActionBtn} onPress={() => setSortMenuVisible(true)} activeOpacity={0.85}>
              <Ionicons name="camera-outline" size={14} color="#8D8276" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
              {ribbonTabs.map((item) => {
                const selected = useCollectionRibbon ? item === selectedCollection : item === selectedCategory;
                return (
                  <TouchableOpacity
                    key={`collection-ribbon-${item}`}
                    activeOpacity={0.9}
                    onPress={() => {
                      if (useCollectionRibbon) {
                        setSelectedCollection(item);
                        return;
                      }

                      setSelectedCategory(item);
                      setSelectedCollection('All');
                    }}
                    style={[styles.chip, styles.chipSpacing, selected ? styles.chipActive : null]}
                  >
                    <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.filterButton} onPress={() => setSortMenuVisible(true)} activeOpacity={0.85}>
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
          visible={notificationsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setNotificationsVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setNotificationsVisible(false)}>
            <View style={styles.modalOverlayLock}>
              <TouchableWithoutFeedback>
                <View style={styles.notificationsWindow}>
                  <View style={styles.notificationsHeaderRow}>
                    <Text style={styles.notificationsTitle}>Notifications</Text>
                    <TouchableOpacity onPress={() => setNotificationCount(0)}>
                      <Text style={styles.markReadText}>Mark all read</Text>
                    </TouchableOpacity>
                  </View>

                  {hasAnyNotifications ? (
                    <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                      {alerts.length ? (
                        <View style={styles.notificationSection}>
                          <Text style={styles.notificationSectionLabel}>ALERTS</Text>
                          {alerts.map((entry) => (
                            <TouchableOpacity
                              key={entry.id}
                              style={getNotificationCardStyle(entry.tone)}
                              onPress={() => {
                                setNotificationsVisible(false);
                                (navigation as any).navigate('OrdersTab');
                              }}
                              activeOpacity={0.88}
                            >
                              <View style={styles.notificationCardTopRow}>
                                <View style={getNotificationDotStyle(entry.tone)} />
                                <Text style={styles.notificationCardTitle} numberOfLines={1}>
                                  {entry.title}
                                </Text>
                              </View>
                              <Text style={styles.notificationCardSubtitle}>{entry.subtitle}</Text>
                              <Text style={styles.notificationCardTime}>{entry.time}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}

                      {recentActivity.length ? (
                        <View style={styles.notificationSection}>
                          <Text style={styles.notificationSectionLabel}>RECENT ACTIVITY</Text>
                          {recentActivity.map((entry) => (
                            <TouchableOpacity
                              key={entry.id}
                              style={getNotificationCardStyle(entry.tone)}
                              onPress={() => {
                                setNotificationsVisible(false);
                                (navigation as any).navigate('OrdersTab');
                              }}
                              activeOpacity={0.88}
                            >
                              <View style={styles.notificationCardTopRow}>
                                <View style={getNotificationDotStyle(entry.tone)} />
                                <Text style={styles.notificationCardTitle} numberOfLines={1}>
                                  {entry.title}
                                </Text>
                              </View>
                              <Text style={styles.notificationCardSubtitle}>{entry.subtitle}</Text>
                              <Text style={styles.notificationCardTime}>{entry.time}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}

                      <View style={styles.notificationSection}>
                        <Text style={styles.notificationSectionLabel}>UPDATES</Text>
                        {updates.map((entry) => (
                          <TouchableOpacity
                            key={entry.id}
                            style={getNotificationCardStyle(entry.tone)}
                            onPress={() => {
                              setNotificationsVisible(false);
                              navigation.navigate('CatalogCategories');
                            }}
                            activeOpacity={0.88}
                          >
                            <View style={styles.notificationCardTopRow}>
                              <View style={getNotificationDotStyle(entry.tone)} />
                              <Text style={styles.notificationCardTitle} numberOfLines={1}>
                                {entry.title}
                              </Text>
                            </View>
                            <Text style={styles.notificationCardSubtitle}>{entry.subtitle}</Text>
                            <Text style={styles.notificationCardTime}>{entry.time}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyNotifBox}>
                      <Text style={styles.emptyNotifString}>No recent activity</Text>
                    </View>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

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
    backgroundColor: '#FFFFFF',
  },
  fixedHeader: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 10 : 8,
    paddingBottom: Platform.OS === 'android' ? 8 : 8,
    backgroundColor: '#FFFFFF',
    zIndex: 5,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    flex: 1,
    fontSize: 18,
    color: '#443D35',
    fontWeight: '700',
  },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCCFC0',
    backgroundColor: '#FBF9F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#DE5858',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#DCCFC0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 7,
    fontSize: 14,
    color: '#2F2923',
    height: 40,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  searchActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD4C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    backgroundColor: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
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
    height: 29,
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCCFC0',
  },
  chipActive: {
    backgroundColor: '#1D1A17',
    borderColor: '#1D1A17',
  },
  chipText: {
    fontSize: 11,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCCFC0',
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
  modalOverlayLock: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  notificationsWindow: {
    position: 'absolute',
    top: 80,
    right: 10,
    width: 338,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  notificationsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F1C18',
  },
  notificationsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  markReadText: {
    fontSize: 11,
    color: '#B2874A',
    fontWeight: '700',
  },
  notificationSection: {
    marginBottom: 12,
  },
  notificationSectionLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#8F877E',
    fontWeight: '700',
    marginBottom: 6,
  },
  notificationCardBase: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
  },
  notificationCardGold: {
    backgroundColor: '#FCF7EC',
    borderColor: '#FFFFFF',
  },
  notificationCardRed: {
    backgroundColor: '#FDF2F3',
    borderColor: '#FFFFFF',
  },
  notificationCardNeutral: {
    backgroundColor: '#F8F8F8',
    borderColor: '#FFFFFF',
  },
  notificationCardInfo: {
    backgroundColor: '#ECF3FF',
    borderColor: '#FFFFFF',
  },
  notificationCardPromo: {
    backgroundColor: '#F8F4EC',
    borderColor: '#FFFFFF',
  },
  notificationCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  notificationDotGold: {
    backgroundColor: '#C59A44',
  },
  notificationDotRed: {
    backgroundColor: '#DE5858',
  },
  notificationDotNeutral: {
    backgroundColor: '#9A9188',
  },
  notificationDotInfo: {
    backgroundColor: '#5D86C7',
  },
  notificationDotPromo: {
    backgroundColor: '#C49B52',
  },
  notificationCardTitle: {
    flex: 1,
    fontSize: 11,
    color: '#2D2823',
    fontWeight: '700',
  },
  notificationCardSubtitle: {
    fontSize: 10,
    lineHeight: 14,
    color: '#6C645B',
  },
  notificationCardTime: {
    fontSize: 11,
    color: '#8E867D',
    marginTop: 2,
  },
  emptyNotifBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyNotifString: {
    fontSize: 13,
    color: '#9E968D',
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
    borderColor: '#FFFFFF',
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
    paddingTop: 8,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E8DED2',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#3D342A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 9,
    elevation: 3,
  },
  imageShell: {
    height: 118,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.6,
    borderBottomColor: '#F1EAE1',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    paddingHorizontal: 9,
    paddingVertical: 8,
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
    lineHeight: 17,
    fontWeight: '700',
    color: '#2B251F',
    minHeight: 18,
  },
  designMeta: {
    fontSize: 10,
    color: '#8A8178',
    marginTop: 1,
  },
  designPrice: {
    fontSize: 17,
    lineHeight: 19,
    fontWeight: '800',
    color: '#B2874A',
    marginTop: 3,
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
    borderColor: '#FFFFFF',
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

