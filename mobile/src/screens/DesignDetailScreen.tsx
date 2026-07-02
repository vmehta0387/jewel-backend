import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
  fetchMobileDesignConfigurator,
  resolveMobileDesignConfigurator,
  type MobileConfiguratorResponse,
} from '../api/designs';
import { fetchPricePreview } from '../api/orders';
import type { Design } from '../types';
import type { DesignsStackParamList } from '../navigation/RootNavigator';
import { formatNumber } from '../utils/format';

type OptionVariant = 'default' | 'metal';

type VersionFilters = {
  diamondType: string;
  shape: string;
  style: string;
  metalColor: string;
  weight: string;
  quality: string;
  ringSize: string;
};

type FilterKey = keyof VersionFilters;
type VersionOptionGroups = Record<FilterKey, string[]>;

const formatDetailPrice = (value: number | null | undefined) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(numeric);
};

const compact = (value?: string | number | null) => String(value ?? '').trim();

const uniqueValues = (values: Array<string | number | null | undefined>) =>
  Array.from(new Set(values.map(compact).filter(Boolean)));

const toCaratLabel = (value?: string | number | null) => {
  const clean = compact(value);
  if (!clean) return '';
  if (/ct|cts|carat/i.test(clean)) return clean;
  const num = Number(clean);
  return Number.isFinite(num) ? `${formatNumber(num, 2)} ct` : clean;
};

const toCtwLabel = (value?: string | number | null) => {
  const clean = compact(value);
  if (!clean) return '';
  const normalized = clean
    .replace(/\bcarats?\b/gi, 'ctw')
    .replace(/\bcts?\b/gi, 'ctw')
    .replace(/\bct\b/gi, 'ctw');
  if (/ctw/i.test(normalized)) return normalized;
  return `${normalized} ctw`;
};

const metalSwatchByValue = (value: string) => {
  const normalized = value.toLowerCase();
  const karatMatch = normalized.match(/(\d{1,2})\s*k/i);
  const karat = karatMatch ? Number.parseInt(karatMatch[1], 10) : null;

  if (normalized.includes('yellow') || normalized.includes('yg')) {
    if (karat && karat >= 18) return '#C79C3E';
    if (karat && karat >= 14) return '#D9B657';
    return '#E2C672';
  }
  if (normalized.includes('rose') || normalized.includes('pink') || normalized.includes('rg')) {
    if (karat && karat >= 18) return '#C78673';
    if (karat && karat >= 14) return '#D89D89';
    return '#E4B2A0';
  }
  if (normalized.includes('white') || normalized.includes('wg')) {
    if (karat && karat >= 18) return '#CED1D8';
    if (karat && karat >= 14) return '#DEE1E8';
    return '#E8EBF1';
  }
  if (normalized.includes('platinum') || normalized.includes('pt')) return '#CFCEDA';
  if (normalized.includes('silver')) return '#C7C6D2';
  if (normalized.includes('green')) return '#95B79C';
  if (normalized.includes('red')) return '#C08B85';
  if (normalized.includes('brown')) return '#B79A7E';
  return '#BFB7AF';
};

const toMetalShortCode = (value?: string | null) => {
  const text = compact(value);
  const lower = text.toLowerCase();
  const karatMatch = lower.match(/\b(\d{1,2}\s*k)\b/i);
  const karat = karatMatch ? karatMatch[1].toUpperCase().replace(/\s+/g, '') : '';

  let code = '';
  if (/\bwg\b|white/.test(lower)) code = 'WG';
  else if (/\brg\b|rose|pink/.test(lower)) code = 'RG';
  else if (/\byg\b|yellow/.test(lower)) code = 'YG';
  else if (/\bpt\b|platinum/.test(lower)) code = 'PT';
  else if (/\bsv\b|silver/.test(lower)) code = 'SV';

  if (karat && code) return `${karat} ${code}`;
  if (karat) return karat;
  if (code) return code;

  const compacted = text.replace(/\s+/g, ' ').trim();
  if (!compacted) return '-';
  if (compacted.length <= 10) return compacted.toUpperCase();
  return compacted;
};

const getVersionAttributes = (design: Design) => ({
  diamondTypes: uniqueValues([design.diamondType]),
  shapes: uniqueValues(design.gemstones?.map((gem) => gem.shape) || []),
  // Spread must come only from design-level field (not gemstone type).
  styles: uniqueValues([design.diamondSpread]),
  metalColors: uniqueValues(
    [
      ...(design.metals?.map((metal) => metal.metalCaratage || metal.goldColour) || []),
      design.goldColour,
    ],
  ),
  // Quality/weight/ring size options are version-level selections from general info.
  qualities: uniqueValues([design.diamondQuality]),
  weights: uniqueValues([toCaratLabel(design.diamondWeight)]),
  ringSizes: uniqueValues([design.jewelrySize]),
});

const getFilterValuesFromDesign = (design: Design): VersionFilters => {
  const attrs = getVersionAttributes(design);
  return {
    diamondType: attrs.diamondTypes[0] || '',
    shape: attrs.shapes[0] || '',
    style: attrs.styles[0] || '',
    metalColor: attrs.metalColors[0] || '',
    weight: attrs.weights[0] || '',
    quality: attrs.qualities[0] || '',
    ringSize: attrs.ringSizes[0] || '',
  };
};

const OptionSection = ({
  title,
  options,
  selected,
  onSelect,
  variant = 'default',
}: {
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  variant?: OptionVariant;
}) => (
  <View style={styles.sectionBlock}>
    <Text style={styles.sectionLabel}>{title}</Text>
    {options.length ? (
      <View style={[styles.optionWrap, variant === 'metal' ? styles.metalWrap : null]}>
        {options.map((option) => {
          const active = selected === option;
          if (variant === 'metal') {
            return (
              <TouchableOpacity
                key={`${title}-${option}`}
                style={[styles.metalChip, active ? styles.metalChipActive : null]}
                onPress={() => onSelect(option)}
                activeOpacity={0.9}
              >
                <View style={[styles.metalDot, { backgroundColor: metalSwatchByValue(option) }]} />
                <Text style={[styles.metalChipText, active ? styles.metalChipTextActive : null]} numberOfLines={1}>
                  {toMetalShortCode(option)}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={`${title}-${option}`}
              style={[styles.optionChip, active ? styles.optionChipActive : null]}
              onPress={() => onSelect(option)}
              activeOpacity={0.9}
            >
              <Text style={[styles.optionChipText, active ? styles.optionChipTextActive : null]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ) : (
      <Text style={styles.emptyOption}>Not available</Text>
    )}
  </View>
);

const DesignDetailScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const route = useRoute<RouteProp<DesignsStackParamList, 'DesignDetail'>>();
  const { width } = useWindowDimensions();
  const mediaHeight = Math.min(178, Math.max(136, width * 0.38));
  const mediaFrameWidth = Math.max(220, width - 28);
  const mediaListRef = useRef<FlatList<string> | null>(null);

  const [familyDesigns, setFamilyDesigns] = useState<Design[]>([]);
  const [activeDesignId, setActiveDesignId] = useState<string | null>(null);
  const [optionGroups, setOptionGroups] = useState<VersionOptionGroups>({
    diamondType: [],
    shape: [],
    style: [],
    metalColor: [],
    weight: [],
    quality: [],
    ringSize: [],
  });
  const [priceByDesignId, setPriceByDesignId] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [resolvingSelection, setResolvingSelection] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [selectedShape, setSelectedShape] = useState('');
  const [selectedDiamondType, setSelectedDiamondType] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedMetalColor, setSelectedMetalColor] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [selectedRingSize, setSelectedRingSize] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [dropdownSelected, setDropdownSelected] = useState('');
  const [dropdownKey, setDropdownKey] = useState<FilterKey | null>(null);
  const resolveRequestSeqRef = useRef(0);

  const handleBackToDesigns = useCallback(() => {
    navigation.navigate('Designs', {
      presetCategory: route.params?.presetCategory,
    });
  }, [navigation, route.params?.presetCategory]);

  const applyActiveDesignSelection = useCallback((design: Design, selectedOptions?: Partial<VersionFilters>) => {
    const next = { ...getFilterValuesFromDesign(design), ...(selectedOptions || {}) };
    setActiveDesignId(design.id);
    setSelectedShape(next.shape);
    setSelectedDiamondType(next.diamondType);
    setSelectedStyle(next.style);
    setSelectedMetalColor(next.metalColor);
    setSelectedWeight(next.weight);
    setSelectedQuality(next.quality);
    setSelectedRingSize(next.ringSize);
    setSelectedImageIndex(0);
  }, []);

  const applyConfiguratorResponse = useCallback(
    (response: MobileConfiguratorResponse) => {
      setFamilyDesigns([response.selectedDesign]);
      setOptionGroups(response.optionGroups);
      applyActiveDesignSelection(response.selectedDesign, response.selectedOptions);
    },
    [applyActiveDesignSelection],
  );

  const loadPriceForDesign = useCallback(
    async (design: Design) => {
      const fallback = design.totalValue ?? 0;
      const shouldApplyPricing =
        (user?.role === 'BRANCH_MANAGER' || user?.role === 'SALES_REP') &&
        Boolean(user?.companyId) &&
        Boolean(user?.branchId);

      if (!shouldApplyPricing || !token) {
        setPriceByDesignId({ [design.id]: fallback });
        return;
      }

      try {
        const preview = await fetchPricePreview(token, design.id, user?.companyId as string, user?.branchId as string);
        setPriceByDesignId({ [design.id]: preview.finalPrice ?? fallback });
      } catch {
        setPriceByDesignId({ [design.id]: fallback });
      }
    },
    [token, user?.role, user?.companyId, user?.branchId],
  );

  const setSelectedFeatureValue = useCallback((key: FilterKey, value: string) => {
    if (key === 'diamondType') setSelectedDiamondType(value);
    else if (key === 'shape') setSelectedShape(value);
    else if (key === 'style') setSelectedStyle(value);
    else if (key === 'metalColor') setSelectedMetalColor(value);
    else if (key === 'weight') setSelectedWeight(value);
    else if (key === 'quality') setSelectedQuality(value);
    else if (key === 'ringSize') setSelectedRingSize(value);
  }, []);

  const loadDesign = useCallback(async () => {
    if (!token) return;
    setError(null);

    try {
      const response = await fetchMobileDesignConfigurator(token, route.params.designId);
      applyConfiguratorResponse(response);
      await loadPriceForDesign(response.selectedDesign);
    } catch (err: any) {
      setError(err?.message || 'Unable to load design');
    }
  }, [token, route.params.designId, applyConfiguratorResponse, loadPriceForDesign]);

  useFocusEffect(
    useCallback(() => {
      loadDesign();
    }, [loadDesign]),
  );

  const activeDesign = useMemo(() => {
    if (!familyDesigns.length) return null;
    return familyDesigns.find((row) => row.id === activeDesignId) || familyDesigns[0];
  }, [familyDesigns, activeDesignId]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [activeDesignId]);

  const gallery = useMemo(() => activeDesign?.imageUrls?.filter(Boolean) || [], [activeDesign?.imageUrls]);
  const activeImage = gallery[selectedImageIndex] || gallery[0];

  const handleMediaSwipeEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!gallery.length || mediaFrameWidth <= 0) return;
      const offsetX = event.nativeEvent.contentOffset.x;
      const nextIndex = Math.round(offsetX / mediaFrameWidth);
      const boundedIndex = Math.max(0, Math.min(gallery.length - 1, nextIndex));
      if (boundedIndex !== selectedImageIndex) {
        setSelectedImageIndex(boundedIndex);
      }
    },
    [gallery.length, mediaFrameWidth, selectedImageIndex],
  );

  useEffect(() => {
    if (!gallery.length || selectedImageIndex < 0 || selectedImageIndex >= gallery.length) return;
    mediaListRef.current?.scrollToIndex({
      index: selectedImageIndex,
      animated: true,
      viewPosition: 0,
    });
  }, [gallery.length, selectedImageIndex]);

  const displayPrice = useMemo(
    () => (activeDesign ? priceByDesignId[activeDesign.id] ?? activeDesign.totalValue ?? 0 : 0),
    [activeDesign, priceByDesignId],
  );

  const diamondTypeOptions = useMemo(
    () => optionGroups.diamondType,
    [optionGroups.diamondType],
  );
  const styleOptions = useMemo(
    () => optionGroups.style,
    [optionGroups.style],
  );
  const metalColorOptions = useMemo(
    () => optionGroups.metalColor,
    [optionGroups.metalColor],
  );
  const qualityOptions = useMemo(
    () => optionGroups.quality,
    [optionGroups.quality],
  );
  const weightOptions = useMemo(
    () => optionGroups.weight,
    [optionGroups.weight],
  );
  const ringSizeOptions = useMemo(
    () => optionGroups.ringSize,
    [optionGroups.ringSize],
  );

  const resolveVersionSelection = useCallback(
    async (selectedKey: FilterKey, selectedValue: string) => {
      if (!token) return;
      const requestId = resolveRequestSeqRef.current + 1;
      resolveRequestSeqRef.current = requestId;
      const currentFilters: VersionFilters = {
        diamondType: selectedDiamondType,
        shape: selectedShape,
        style: selectedStyle,
        metalColor: selectedMetalColor,
        weight: selectedWeight,
        quality: selectedQuality,
        ringSize: selectedRingSize,
      };
      const nextFilters = { ...currentFilters, [selectedKey]: selectedValue };

      setSelectedFeatureValue(selectedKey, selectedValue);
      setResolvingSelection(true);
      setError(null);

      try {
        const response = await resolveMobileDesignConfigurator(token, route.params.designId, {
          ...nextFilters,
          selectedKey,
        });
        if (resolveRequestSeqRef.current !== requestId) return;
        applyConfiguratorResponse(response);
        await loadPriceForDesign(response.selectedDesign);
      } catch (err: any) {
        if (resolveRequestSeqRef.current === requestId) {
          setError(err?.message || 'Unable to update design selection');
        }
      } finally {
        if (resolveRequestSeqRef.current === requestId) {
          setResolvingSelection(false);
        }
      }
    },
    [
      token,
      route.params.designId,
      selectedShape,
      selectedDiamondType,
      selectedStyle,
      selectedMetalColor,
      selectedWeight,
      selectedQuality,
      selectedRingSize,
      setSelectedFeatureValue,
      applyConfiguratorResponse,
      loadPriceForDesign,
    ],
  );

  const handleOpenQuoteBuilder = useCallback(() => {
    if (!activeDesign) return;
    const shortDescription = [
      selectedDiamondType ? `Type: ${selectedDiamondType}` : null,
      selectedMetalColor ? `Metal: ${selectedMetalColor}` : null,
      selectedRingSize ? `Size: ${selectedRingSize}` : null,
      selectedStyle ? `Spread: ${selectedStyle}` : null,
      selectedQuality ? `Quality: ${selectedQuality}` : null,
      selectedWeight ? `Weight: ${selectedWeight}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    navigation.navigate('QuoteBuilder', {
      draft: {
        designId: activeDesign.id,
        designNo: activeDesign.designNo,
        designName: activeDesign.designName,
        imageUrl: activeImage || null,
        unitPrice: Math.round(Number(displayPrice || 0)),
        shortDescription,
        selection: {
          diamondType: selectedDiamondType,
          shape: selectedShape,
          style: selectedStyle,
          metalColor: selectedMetalColor,
          weight: selectedWeight,
          quality: selectedQuality,
          ringSize: selectedRingSize,
        },
      },
    });
  }, [
    activeDesign,
    activeImage,
    displayPrice,
    navigation,
    selectedDiamondType,
    selectedMetalColor,
    selectedQuality,
    selectedRingSize,
    selectedShape,
    selectedStyle,
    selectedWeight,
  ]);

  const handleProcessOrder = useCallback(() => {
    if (!activeDesign) return;
    handleOpenQuoteBuilder();
  }, [activeDesign, handleOpenQuoteBuilder]);

  const openDropdown = useCallback(
    (key: FilterKey, options: string[], selected: string) => {
      if (!options.length) return;
      if (dropdownVisible && dropdownKey === key) {
        setDropdownVisible(false);
        return;
      }
      setDropdownKey(key);
      setDropdownOptions(options);
      setDropdownSelected(selected);
      setDropdownVisible(true);
    },
    [dropdownKey, dropdownVisible],
  );

  const handleDropdownSelect = useCallback(
    (value: string) => {
      if (!dropdownKey) return;
      resolveVersionSelection(dropdownKey, value);
      setDropdownVisible(false);
    },
    [dropdownKey, resolveVersionSelection],
  );

  const renderInlineDropdown = useCallback(
    (ownerKey: FilterKey) => {
      if (!dropdownVisible || dropdownKey !== ownerKey) return null;

      return (
        <View style={styles.inlineDropdownMenu}>
          <ScrollView style={styles.inlineDropdownScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {dropdownOptions.map((item, index) => {
              const active = item === dropdownSelected;
              const isLast = index === dropdownOptions.length - 1;
              return (
                <TouchableOpacity
                  key={`inline-dd-${ownerKey}-${item}`}
                  style={[
                    styles.inlineDropdownOption,
                    isLast ? styles.inlineDropdownOptionLast : null,
                    active ? styles.inlineDropdownOptionActive : null,
                  ]}
                  onPress={() => handleDropdownSelect(item)}
                  activeOpacity={0.88}
                >
                  <Text style={[styles.inlineDropdownOptionText, active ? styles.inlineDropdownOptionTextActive : null]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      );
    },
    [dropdownVisible, dropdownKey, dropdownOptions, dropdownSelected, handleDropdownSelect],
  );

  const totalGemWt = useMemo(
    () => (activeDesign?.gemstones || []).reduce((sum, gem) => sum + Number(gem.wtInCts || 0), 0),
    [activeDesign?.gemstones],
  );
  const totalStonePieces = useMemo(
    () =>
      (activeDesign?.gemstones || []).reduce((sum, gem) => {
        const row = gem as { pcs?: number | string; Pcs?: number | string };
        const pieces = Number(row.pcs ?? row.Pcs ?? 0);
        return sum + (Number.isFinite(pieces) ? Math.max(0, pieces) : 0);
      }, 0),
    [activeDesign?.gemstones],
  );
  const hasStonePieces = useMemo(
    () =>
      (activeDesign?.gemstones || []).some((gem) => {
        const row = gem as { pcs?: number | string; Pcs?: number | string };
        return row.pcs !== undefined || row.Pcs !== undefined;
      }),
    [activeDesign?.gemstones],
  );
  const firstGem = activeDesign?.gemstones?.[0];
  const heroCaption = useMemo(
    () => String(activeDesign?.designName || activeDesign?.designNo || '').trim(),
    [activeDesign?.designName, activeDesign?.designNo],
  );

  const specRows = useMemo(
    () => [
      { label: 'Stone', value: firstGem?.stone || selectedDiamondType || 'Diamond (Lab Grown)' },
      { label: 'Stone Shape', value: selectedShape || firstGem?.shape || '-' },
      { label: 'Ring Size', value: selectedRingSize || activeDesign?.jewelrySize || '-' },
      { label: 'Quality', value: selectedQuality || firstGem?.quality || activeDesign?.diamondQuality || '-' },
      { label: 'Color', value: firstGem?.color || '-' },
      {
        label: 'Approx. Total Carat Wt.',
        value: toCtwLabel(selectedWeight) || (totalGemWt > 0 ? `${formatNumber(totalGemWt, 2)} ctw` : '-'),
        highlight: true,
      },
      {
        label: 'Total No. of Stones',
        value: hasStonePieces ? formatNumber(totalStonePieces, 0) : '-',
      },
    ],
    [
      firstGem?.stone,
      firstGem?.shape,
      firstGem?.quality,
      firstGem?.color,
      selectedDiamondType,
      selectedShape,
      selectedRingSize,
      selectedQuality,
      selectedWeight,
      totalGemWt,
      totalStonePieces,
      hasStonePieces,
      activeDesign?.jewelrySize,
      activeDesign?.diamondQuality,
    ],
  );

  const renderMediaSkeleton = () => (
    <View style={styles.mediaSkeleton}>
      <View style={styles.mediaSkeletonImage} />
    </View>
  );

  const renderSpecSkeleton = () => (
    <>
      {[0, 1, 2, 3, 4].map((item, index) => (
        <View key={`spec-sk-${item}`} style={[styles.specRow, index === 4 ? styles.specRowLast : null]}>
          <View style={[styles.skeletonLine, styles.specSkeletonLabel]} />
          <View style={[styles.skeletonLine, styles.specSkeletonValue]} />
        </View>
      ))}
    </>
  );

  if (!activeDesign && !error) {
    return (
      <View style={{flex: 1}}>
        <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.stateScreen} edges={['top']}>
          <ActivityIndicator size="large" color="#8a6b55" />
          <Text style={styles.stateText}>Loading design...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!activeDesign) {
    return (
      <View style={{flex: 1}}>
        <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.stateScreen} edges={['top']}>
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Unable to load design</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={loadDesign}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.screenShell} edges={['top']}>
        <View style={styles.fixedTopSection}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleBackToDesigns} activeOpacity={0.88}>
              <Ionicons name="chevron-back" size={18} color="#7A6E61" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Ring Configurator</Text>
            <TouchableOpacity
              style={styles.headerBellBtn}
              onPress={() => (navigation as any).navigate('OrdersTab')}
              activeOpacity={0.88}
            >
              <Ionicons name="notifications-outline" size={17} color="#7A6E61" />
              <View style={styles.headerBellBadge}>
                <Text style={styles.headerBellBadgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.fixedMediaCard, { height: mediaHeight + 70 }]}>
            <View style={[styles.fixedMediaImageShell, { height: mediaHeight }]}>
              {resolvingSelection ? (
                renderMediaSkeleton()
              ) : gallery.length ? (
                <FlatList
                  ref={mediaListRef}
                  data={gallery}
                  horizontal
                  pagingEnabled
                  bounces={false}
                  scrollEventThrottle={16}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  showsHorizontalScrollIndicator={false}
                  initialScrollIndex={Math.min(selectedImageIndex, Math.max(0, gallery.length - 1))}
                  onMomentumScrollEnd={handleMediaSwipeEnd}
                  onScrollToIndexFailed={(info) => {
                    mediaListRef.current?.scrollToOffset({
                      offset: info.averageItemLength * info.index,
                      animated: false,
                    });
                  }}
                  getItemLayout={(_, index) => ({
                    length: mediaFrameWidth,
                    offset: mediaFrameWidth * index,
                    index,
                  })}
                  renderItem={({ item }) => (
                    <View style={[styles.mediaSlide, { width: mediaFrameWidth, height: mediaHeight }]}>
                      <Image source={{ uri: item, cache: 'force-cache' }} style={styles.fixedMediaImage} resizeMode="cover" />
                    </View>
                  )}
                />
              ) : (
                <View style={styles.placeholderHero}>
                  <Ionicons name="diamond-outline" size={42} color="#c5a890" />
                  <Text style={styles.placeholderText}>Image coming soon</Text>
                </View>
              )}
            </View>
            {resolvingSelection ? (
              <View style={[styles.skeletonLine, styles.mediaCaptionSkeleton]} />
            ) : (
              <Text style={styles.mediaCaption} numberOfLines={1}>
                {heroCaption}
              </Text>
            )}

            {!resolvingSelection && gallery.length > 1 ? (
              <View style={styles.imagePagerRow}>
                {gallery.slice(0, 6).map((_, index) => (
                  <TouchableOpacity
                    key={`gallery-chip-${index}`}
                    style={[styles.imagePagerChip, selectedImageIndex === index ? styles.imagePagerChipActive : null]}
                    onPress={() => {
                      setSelectedImageIndex(index);
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.imagePagerText, selectedImageIndex === index ? styles.imagePagerTextActive : null]}>
                      {index + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.configPanel}>
            <OptionSection
              title="METAL"
              options={metalColorOptions}
              selected={selectedMetalColor}
              onSelect={(value) => {
                resolveVersionSelection('metalColor', value);
              }}
              variant="metal"
            />

            <View style={styles.dualRow}>
              <View style={[styles.dropdownFieldWrap, dropdownVisible && dropdownKey === 'style' ? styles.dropdownFieldWrapActive : null]}>
                <Text style={styles.sectionLabel}>COVERAGE</Text>
                <TouchableOpacity
                  style={styles.dualFieldCard}
                  activeOpacity={0.9}
                onPress={() => openDropdown('style', styleOptions, selectedStyle)}
                >
                  <View style={styles.dropdownValueRow}>
                    <Text style={styles.dualFieldValue} numberOfLines={1}>
                      {selectedStyle || '-'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#7D746A" />
                  </View>
                </TouchableOpacity>
                {renderInlineDropdown('style')}
              </View>

              <View style={[styles.dropdownFieldWrap, dropdownVisible && dropdownKey === 'quality' ? styles.dropdownFieldWrapActive : null]}>
                <Text style={styles.sectionLabel}>DIAMOND QUALITY</Text>
                <TouchableOpacity
                  style={styles.dualFieldCard}
                  activeOpacity={0.9}
                onPress={() => openDropdown('quality', qualityOptions, selectedQuality)}
                >
                  <View style={styles.dropdownValueRow}>
                    <Text style={styles.dualFieldValue} numberOfLines={1}>
                      {selectedQuality || '-'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#7D746A" />
                  </View>
                </TouchableOpacity>
                {renderInlineDropdown('quality')}
              </View>
            </View>

            <OptionSection
              title="CARAT WEIGHT"
              options={weightOptions}
              selected={selectedWeight}
              onSelect={(value) => {
                resolveVersionSelection('weight', value);
              }}
            />

            {ringSizeOptions.length ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>RING SIZE</Text>
                <View style={[styles.singleDropdownWrap, dropdownVisible && dropdownKey === 'ringSize' ? styles.dropdownFieldWrapActive : null]}>
                  <TouchableOpacity
                    style={styles.singleDropdownCard}
                    activeOpacity={0.9}
                    onPress={() => openDropdown('ringSize', ringSizeOptions, selectedRingSize)}
                  >
                    <Text style={styles.singleDropdownValue} numberOfLines={1}>
                      {selectedRingSize || '-'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#7D746A" />
                  </TouchableOpacity>
                  {renderInlineDropdown('ringSize')}
                </View>
              </View>
            ) : null}

            {diamondTypeOptions.length > 1 ? (
              <OptionSection
                title="STONE"
                options={diamondTypeOptions}
                selected={selectedDiamondType}
                onSelect={(value) => {
                  resolveVersionSelection('diamondType', value);
                }}
              />
            ) : null}
          </View>

          <View style={styles.specCard}>
            <Text style={styles.specTitle}>PRODUCT SPECIFICATIONS</Text>
            {resolvingSelection
              ? renderSpecSkeleton()
              : specRows.map((row, index) => (
                  <View key={`spec-${row.label}`} style={[styles.specRow, index === specRows.length - 1 ? styles.specRowLast : null]}>
                    <Text style={styles.specLabel}>{row.label}</Text>
                    <Text style={[styles.specValue, row.highlight ? styles.specValueHighlight : null]}>{row.value}</Text>
                  </View>
                ))}
          </View>
        </ScrollView>

        <View style={styles.bottomSummary}>
          <View style={styles.bottomTopRow}>
            <View style={styles.retailBlock}>
              <Text style={styles.retailLabel}>RETAIL PRICE</Text>
              {resolvingSelection ? (
                <View style={[styles.skeletonLine, styles.priceSkeleton]} />
              ) : (
                <Text style={styles.retailValue}>{formatDetailPrice(displayPrice)}</Text>
              )}
            </View>
            <View style={styles.orderSummaryCard}>
              <Text style={styles.orderSummaryTitle}>ORDER SUMMARY</Text>
              {resolvingSelection ? (
                <>
                  <View style={[styles.skeletonLine, styles.orderSkeletonLine]} />
                  <View style={[styles.skeletonLine, styles.orderSkeletonLine]} />
                  <View style={[styles.skeletonLine, styles.orderSkeletonLine]} />
                </>
              ) : (
                <>
                  <Text style={styles.orderSummaryLine}>{toMetalShortCode(selectedMetalColor)}</Text>
                  <Text style={styles.orderSummaryLine}>{toCtwLabel(selectedWeight) || '-'}</Text>
                  <Text style={styles.orderSummaryLine}>{selectedRingSize || '-'}</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.bottomActionsRow}>
            <TouchableOpacity style={styles.ghostActionBtn} onPress={handleOpenQuoteBuilder} activeOpacity={0.9}>
              <Text style={styles.ghostActionText}>Save Quote</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.processActionBtn} onPress={handleProcessOrder} activeOpacity={0.9}>
              <Text style={styles.processActionText}>Process Order</Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screenShell: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fixedTopSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7DE',
  },
  headerRow: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 4,
    fontSize: 18,
    fontWeight: '700',
    color: '#4B433A',
  },
  headerBellBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCCFC0',
    backgroundColor: '#FBF9F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBellBadge: {
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
  headerBellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  fixedMediaCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECE7DE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  fixedMediaImageShell: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixedMediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaSkeleton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaSkeletonImage: {
    width: 76,
    height: '92%',
    borderRadius: 10,
    backgroundColor: '#F1ECE5',
  },
  mediaSlide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaCaption: {
    marginTop: 6,
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#80786F',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mediaCaptionSkeleton: {
    width: 96,
    height: 10,
    marginTop: 8,
  },
  imagePagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  imagePagerChip: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    marginHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F4EE',
    borderWidth: 1,
    borderColor: '#CFC6B9',
  },
  imagePagerChipActive: {
    backgroundColor: '#201D19',
    borderColor: '#201D19',
  },
  imagePagerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7B7369',
  },
  imagePagerTextActive: {
    color: '#FFFFFF',
  },
  detailScroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  detailScrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  configPanel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  sectionBlock: {
    marginTop: 7,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '700',
    color: '#81786E',
    marginBottom: 7,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metalWrap: {
    marginBottom: 2,
  },
  metalChip: {
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6CEC2',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    marginRight: 6,
    marginBottom: 6,
  },
  metalChipActive: {
    borderColor: '#1D1A17',
    backgroundColor: '#FAF8F5',
  },
  metalDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
    borderWidth: 1,
    borderColor: 'rgba(124, 102, 80, 0.22)',
  },
  metalChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4A3E35',
  },
  metalChipTextActive: {
    color: '#1D1A17',
  },
  optionChip: {
    minHeight: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D6CEC2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  optionChipActive: {
    borderColor: '#1D1A17',
    backgroundColor: '#F6F3EF',
  },
  optionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A5148',
  },
  optionChipTextActive: {
    color: '#1D1A17',
  },
  dualRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 30,
  },
  dropdownFieldWrap: {
    width: '48.5%',
    position: 'relative',
  },
  dropdownFieldWrapActive: {
    zIndex: 380,
  },
  dualFieldCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#D8D0C4',
    backgroundColor: '#FBFAF8',
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  dualFieldValue: {
    fontSize: 12,
    color: '#2C2620',
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  dropdownValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dualFieldHint: {
    marginTop: 3,
    fontSize: 9,
    color: '#A0968B',
    fontWeight: '600',
  },
  singleDropdownWrap: {
    position: 'relative',
    zIndex: 40,
  },
  singleDropdownCard: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: '#D8D0C4',
    borderRadius: 11,
    backgroundColor: '#FBFAF8',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  singleDropdownValue: {
    fontSize: 12,
    color: '#2C2620',
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  inlineDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9CDBD',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#201810',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 420,
  },
  inlineDropdownScroll: {
    maxHeight: 176,
  },
  inlineDropdownOption: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE5DA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  inlineDropdownOptionLast: {
    borderBottomWidth: 0,
  },
  inlineDropdownOptionActive: {
    backgroundColor: '#1D6ED4',
    borderBottomColor: '#1D6ED4',
  },
  inlineDropdownOptionText: {
    width: '100%',
    fontSize: 12,
    color: '#38312A',
    fontWeight: '600',
    textAlign: 'left',
  },
  inlineDropdownOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  specCard: {
    marginTop: 10,
    backgroundColor: '#F9F7F3',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  specTitle: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '800',
    color: '#7E6F5C',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DED7CD',
  },
  specRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5DDD2',
  },
  specRowLast: {
    borderBottomWidth: 0,
  },
  specLabel: {
    fontSize: 12,
    color: '#6D665D',
  },
  specValue: {
    fontSize: 12,
    color: '#2A241F',
    fontWeight: '700',
  },
  specValueHighlight: {
    color: '#B2874A',
  },
  skeletonLine: {
    borderRadius: 999,
    backgroundColor: '#EEE7DE',
  },
  specSkeletonLabel: {
    width: 78,
    height: 10,
  },
  specSkeletonValue: {
    width: 108,
    height: 10,
  },
  bottomSummary: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E1D7',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 18 : 12,
    shadowColor: '#AFA191',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 14,
  },
  bottomTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  retailBlock: {
    flex: 1,
  },
  retailLabel: {
    fontSize: 10,
    letterSpacing: 1.1,
    color: '#8E867D',
    fontWeight: '700',
    marginBottom: 1,
  },
  retailValue: {
    fontSize: 31,
    lineHeight: 33,
    fontWeight: '800',
    color: '#1F1A15',
  },
  priceSkeleton: {
    width: 130,
    height: 31,
    marginTop: 2,
  },
  orderSummaryCard: {
    width: 122,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 10,
    backgroundColor: '#FBF9F6',
    paddingVertical: 7,
    paddingHorizontal: 8,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  orderSummaryTitle: {
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#A1968A',
    fontWeight: '700',
    marginBottom: 2,
  },
  orderSummaryLine: {
    fontSize: 10,
    lineHeight: 13,
    color: '#5D554C',
    textAlign: 'right',
    fontWeight: '600',
  },
  orderSkeletonLine: {
    width: 54,
    height: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ghostActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9D0C4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  ghostActionText: {
    fontSize: 12,
    color: '#7B736A',
    fontWeight: '700',
  },
  processActionBtn: {
    flex: 1.45,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#BE9851',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginLeft: 2,
  },
  processActionText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
    marginRight: 6,
  },
  placeholderHero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: '#8a786a',
  },
  emptyOption: {
    fontSize: 12,
    color: '#8E8E93',
  },
  stateScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  stateCard: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#231913',
    marginBottom: 8,
  },
  stateText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#7f7064',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 18,
    height: 46,
    minWidth: 130,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#2C1E16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#fffdf8',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default DesignDetailScreen;



