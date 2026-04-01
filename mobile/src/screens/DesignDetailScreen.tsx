import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { StackActions, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import Screen from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { fetchDesign, fetchDesigns } from '../api/designs';
import { fetchPricePreview } from '../api/orders';
import type { Design } from '../types';
import type { DesignsStackParamList } from '../navigation/RootNavigator';
import { formatNumber } from '../utils/format';

type OptionVariant = 'default' | 'shape' | 'color';

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

const GLASS_CARD_BG = Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.22)';
const GLASS_SOFT_BG = Platform.OS === 'android' ? 'rgba(255, 252, 245, 0.42)' : 'rgba(255, 252, 245, 0.72)';
const GLASS_CHIP_BG = Platform.OS === 'android' ? 'rgba(255, 252, 245, 0.34)' : 'rgba(255, 252, 245, 0.76)';
const GLASS_BUTTON_BG = Platform.OS === 'android' ? 'rgba(255, 252, 245, 0.38)' : 'rgba(255, 252, 245, 0.82)';

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

const normalizeBaseDesignNo = (designNo?: string | null) =>
  String(designNo || '').replace(/-V\d+$/i, '').trim();

const parseVersion = (version?: string | null) => {
  const match = /V(\d+)/i.exec(String(version || '').trim());
  const parsed = match ? Number.parseInt(match[1], 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

const toCaratLabel = (value?: string | number | null) => {
  const clean = compact(value);
  if (!clean) return '';
  if (/ct|cts|carat/i.test(clean)) return clean;
  const num = Number(clean);
  return Number.isFinite(num) ? `${formatNumber(num, 2)} ct` : clean;
};

const canonicalMetalColor = (value?: string | null) => {
  const normalized = String(value || '').toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('rose')) return 'Rose Gold';
  if (normalized.includes('yellow')) return 'Yellow Gold';
  if (normalized.includes('white')) return 'White Gold';
  if (normalized.includes('silver')) return 'Silver';
  if (normalized.includes('green')) return 'Green Gold';
  return compact(value);
};

const shapeIconByValue = (value: string): keyof typeof Ionicons.glyphMap => {
  const normalized = value.toLowerCase();
  if (normalized.includes('oval')) return 'ellipse-outline';
  if (normalized.includes('round')) return 'radio-button-on-outline';
  if (normalized.includes('princess')) return 'square-outline';
  if (normalized.includes('emerald')) return 'stop-outline';
  if (normalized.includes('pear')) return 'triangle-outline';
  if (normalized.includes('heart')) return 'heart-outline';
  if (normalized.includes('marquise')) return 'diamond-outline';
  return 'diamond-outline';
};

const metalSwatchByValue = (value: string) => {
  const normalized = value.toLowerCase();
  if (normalized.includes('yellow')) return '#CBAA6A';
  if (normalized.includes('rose') || normalized.includes('pink')) return '#CBA284';
  if (normalized.includes('white')) return '#D9D9D9';
  if (normalized.includes('silver')) return '#C0C0C0';
  if (normalized.includes('green')) return '#95B79C';
  if (normalized.includes('red')) return '#C08B85';
  if (normalized.includes('brown')) return '#B79A7E';
  return '#BFB7AF';
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

const getMetalColorDisplayFromCaratage = (design: Design) => {
  const fullCaratageValues = uniqueValues(
    (design.metals || []).map((metal) => metal.metalCaratage),
  );
  if (fullCaratageValues.length) return fullCaratageValues.join(', ');
  return canonicalMetalColor(design.goldColour) || '-';
};

const pickPrimaryFromFamily = (family: Design[]) => {
  if (!family.length) return null;
  return (
    family.find((design) => design.isPrimary) ||
    [...family].sort((a, b) => parseVersion(a.version) - parseVersion(b.version))[0]
  );
};

const matchesFilter = (values: string[], selected: string) => !selected || values.includes(selected);

const findBestMatchingVersion = (
  family: Design[],
  filters: VersionFilters,
  currentId: string | null,
) => {
  const candidates = family.filter((design) => {
    const attrs = getVersionAttributes(design);
    return (
      matchesFilter(attrs.diamondTypes, filters.diamondType) &&
      matchesFilter(attrs.shapes, filters.shape) &&
      matchesFilter(attrs.styles, filters.style) &&
      matchesFilter(attrs.metalColors, filters.metalColor) &&
      matchesFilter(attrs.qualities, filters.quality) &&
      matchesFilter(attrs.weights, filters.weight) &&
      matchesFilter(attrs.ringSizes, filters.ringSize)
    );
  });

  if (!candidates.length) return null;
  const current = candidates.find((item) => item.id === currentId);
  if (current) return current;
  return [...candidates].sort((a, b) => parseVersion(a.version) - parseVersion(b.version))[0];
};

const filterMatchesDesign = (design: Design, key: FilterKey, value: string) => {
  const attrs = getVersionAttributes(design);
  switch (key) {
    case 'diamondType':
      return attrs.diamondTypes.includes(value);
    case 'shape':
      return attrs.shapes.includes(value);
    case 'style':
      return attrs.styles.includes(value);
    case 'metalColor':
      return attrs.metalColors.includes(value);
    case 'weight':
      return attrs.weights.includes(value);
    case 'quality':
      return attrs.qualities.includes(value);
    case 'ringSize':
      return attrs.ringSizes.includes(value);
    default:
      return false;
  }
};

const scoreDesignAgainstFilters = (design: Design, filters: VersionFilters, skipKey: FilterKey) => {
  let score = 0;
  (Object.keys(filters) as FilterKey[]).forEach((key) => {
    if (key === skipKey) return;
    if (!filters[key]) return;
    if (filterMatchesDesign(design, key, filters[key])) score += 1;
  });
  return score;
};

const findBestVersionForFieldSelection = (
  family: Design[],
  selectedKey: FilterKey,
  selectedValue: string,
  currentFilters: VersionFilters,
  currentId: string | null,
) => {
  const candidates = family.filter((design) => filterMatchesDesign(design, selectedKey, selectedValue));
  if (!candidates.length) return null;

  const scored = [...candidates].sort((a, b) => {
    const scoreA = scoreDesignAgainstFilters(a, currentFilters, selectedKey);
    const scoreB = scoreDesignAgainstFilters(b, currentFilters, selectedKey);
    if (scoreA !== scoreB) return scoreB - scoreA;
    if (a.id === currentId) return -1;
    if (b.id === currentId) return 1;
    return parseVersion(a.version) - parseVersion(b.version);
  });
  return scored[0];
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
      <View
        style={[
          styles.optionWrap,
          variant === 'shape' ? styles.shapeWrap : null,
          variant === 'color' ? styles.colorWrap : null,
        ]}
      >
        {options.map((option) => {
          const active = selected === option;
          if (variant === 'shape') {
            return (
              <TouchableOpacity
                key={`${title}-${option}`}
                style={[styles.shapeOption, active ? styles.shapeOptionActive : null]}
                onPress={() => onSelect(option)}
                activeOpacity={0.9}
              >
                <Ionicons name={shapeIconByValue(option)} size={24} color={active ? '#2C1E16' : '#7E736A'} />
              </TouchableOpacity>
            );
          }

          if (variant === 'color') {
            return (
              <TouchableOpacity
                key={`${title}-${option}`}
                style={[styles.colorOption, active ? styles.colorOptionActive : null]}
                onPress={() => onSelect(option)}
                activeOpacity={0.9}
              >
                <View style={[styles.colorSwatch, { backgroundColor: metalSwatchByValue(option) }]} />
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
  const { addItem, itemCount } = useCart();
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const route = useRoute<RouteProp<DesignsStackParamList, 'DesignDetail'>>();
  const { width } = useWindowDimensions();
  const compactLayout = width < 390;
  const heroHeight = Math.min(340, Math.max(220, width * 0.7));

  const [familyDesigns, setFamilyDesigns] = useState<Design[]>([]);
  const [activeDesignId, setActiveDesignId] = useState<string | null>(null);
  const [priceByDesignId, setPriceByDesignId] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [selectedShape, setSelectedShape] = useState('');
  const [selectedDiamondType, setSelectedDiamondType] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedMetalColor, setSelectedMetalColor] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [selectedRingSize, setSelectedRingSize] = useState('');

  const handleBackToDesigns = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.dispatch(StackActions.popToTop());
      return;
    }
    navigation.navigate('Designs');
  }, [navigation]);

  const applyActiveDesignSelection = useCallback((design: Design) => {
    const next = getFilterValuesFromDesign(design);
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

  const loadDesign = useCallback(async () => {
    if (!token) return;
    setError(null);

    try {
      const primary = await fetchDesign(token, route.params.designId);
      const baseDesignNo = normalizeBaseDesignNo(primary.designNo);

      let familyIds = [primary.id];
      try {
        const list = await fetchDesigns(token, 1, 200);
        const fromList = (list.data || [])
          .filter((row) => normalizeBaseDesignNo(row.designNo) === baseDesignNo)
          .map((row) => row.id);
        familyIds = Array.from(new Set([primary.id, ...fromList]));
      } catch {
        familyIds = [primary.id];
      }

      const detailed = (
        await Promise.all(
          familyIds.map(async (id) => {
            try {
              return await fetchDesign(token, id);
            } catch {
              return null;
            }
          }),
        )
      ).filter(Boolean) as Design[];

      const family = (detailed.length ? detailed : [primary]).sort(
        (a, b) => parseVersion(a.version) - parseVersion(b.version),
      );

      const primaryDesign = pickPrimaryFromFamily(family) || primary;
      setFamilyDesigns(family);
      applyActiveDesignSelection(primaryDesign);

      const shouldApplyPricing =
        (user?.role === 'BRANCH_MANAGER' || user?.role === 'SALES_REP') &&
        Boolean(user?.companyId) &&
        Boolean(user?.branchId);

      if (shouldApplyPricing) {
        const pricedRows = await Promise.all(
          family.map(async (design) => {
            try {
              const preview = await fetchPricePreview(token, design.id, user?.companyId as string, user?.branchId as string);
              return [design.id, preview.finalPrice ?? design.totalValue ?? 0] as const;
            } catch {
              return [design.id, design.totalValue ?? 0] as const;
            }
          }),
        );
        setPriceByDesignId(Object.fromEntries(pricedRows));
      } else {
        setPriceByDesignId(
          Object.fromEntries(family.map((design) => [design.id, design.totalValue ?? 0] as const)),
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load design');
    }
  }, [token, route.params.designId, user?.role, user?.companyId, user?.branchId, applyActiveDesignSelection]);

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
  const displayPrice = useMemo(
    () => (activeDesign ? priceByDesignId[activeDesign.id] ?? activeDesign.totalValue ?? 0 : 0),
    [activeDesign, priceByDesignId],
  );

  const shapeOptions = useMemo(
    () => uniqueValues(familyDesigns.flatMap((design) => getVersionAttributes(design).shapes)),
    [familyDesigns],
  );
  const diamondTypeOptions = useMemo(
    () => uniqueValues(familyDesigns.flatMap((design) => getVersionAttributes(design).diamondTypes)),
    [familyDesigns],
  );
  const styleOptions = useMemo(
    () => uniqueValues(familyDesigns.flatMap((design) => getVersionAttributes(design).styles)),
    [familyDesigns],
  );
  const metalColorOptions = useMemo(
    () => uniqueValues(familyDesigns.flatMap((design) => getVersionAttributes(design).metalColors)),
    [familyDesigns],
  );
  const qualityOptions = useMemo(
    () => uniqueValues(familyDesigns.flatMap((design) => getVersionAttributes(design).qualities)),
    [familyDesigns],
  );
  const weightOptions = useMemo(
    () => uniqueValues(familyDesigns.flatMap((design) => getVersionAttributes(design).weights)),
    [familyDesigns],
  );
  const ringSizeOptions = useMemo(
    () => uniqueValues(familyDesigns.flatMap((design) => getVersionAttributes(design).ringSizes)),
    [familyDesigns],
  );

  const resolveVersionSelection = useCallback(
    (selectedKey: FilterKey, selectedValue: string) => {
      const currentFilters: VersionFilters = {
        diamondType: selectedDiamondType,
        shape: selectedShape,
        style: selectedStyle,
        metalColor: selectedMetalColor,
        weight: selectedWeight,
        quality: selectedQuality,
        ringSize: selectedRingSize,
      };

      const strictFilters: VersionFilters = { ...currentFilters, [selectedKey]: selectedValue };
      const strictMatch = findBestMatchingVersion(familyDesigns, strictFilters, activeDesignId);

      const matched =
        strictMatch ||
        findBestVersionForFieldSelection(
          familyDesigns,
          selectedKey,
          selectedValue,
          currentFilters,
          activeDesignId,
        );

      if (!matched) return;
      applyActiveDesignSelection(matched);
    },
    [
      familyDesigns,
      activeDesignId,
      selectedShape,
      selectedDiamondType,
      selectedStyle,
      selectedMetalColor,
      selectedWeight,
      selectedQuality,
      selectedRingSize,
      applyActiveDesignSelection,
    ],
  );

  const handleShare = useCallback(async () => {
    if (!activeDesign) return;
    await Share.share({
      message: `${activeDesign.designNo}\n${formatDetailPrice(displayPrice)}\n${selectedMetalColor || 'Metal N/A'}`,
      title: activeDesign.designNo,
    });
  }, [activeDesign, displayPrice, selectedMetalColor]);

  const handleAddToCart = useCallback(() => {
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

    addItem({
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
    });

    Alert.alert('Added to cart', `${activeDesign.designNo} has been added to cart.`);
  }, [
    activeDesign,
    activeImage,
    addItem,
    displayPrice,
    selectedMetalColor,
    selectedDiamondType,
    selectedQuality,
    selectedRingSize,
    selectedShape,
    selectedStyle,
    selectedWeight,
  ]);

  const generalInfoRows = useMemo(
    () =>
      [
        { label: 'Category', value: activeDesign?.jewelryGroup || '-' },
        { label: 'Sub Category', value: activeDesign?.collection || '-' },
        { label: 'Size', value: activeDesign?.jewelrySize || '-' },
        {
          label: 'Metal Color',
          value: activeDesign ? getMetalColorDisplayFromCaratage(activeDesign) : '-',
        },
      ].filter((row) => compact(row.value)),
    [activeDesign],
  );

  const totalGemWt = useMemo(
    () => (activeDesign?.gemstones || []).reduce((sum, gem) => sum + Number(gem.wtInCts || 0), 0),
    [activeDesign?.gemstones],
  );

  const gemstoneInfoRows = useMemo(() => {
    const firstGem = activeDesign?.gemstones?.[0];
    return [
      { label: 'Stone', value: firstGem?.stone || activeDesign?.diamondType || '-' },
      { label: 'Shape', value: firstGem?.shape || selectedShape || '-' },
      { label: 'Size', value: firstGem?.size || '-' },
      { label: 'Quality', value: firstGem?.quality || selectedQuality || '-' },
      { label: 'Color', value: firstGem?.color || '-' },
      {
        label: 'Weight',
        value: totalGemWt > 0 ? `${formatNumber(totalGemWt, 3)} cts` : '-',
      },
    ];
  }, [activeDesign?.gemstones, activeDesign?.diamondType, selectedShape, selectedQuality, totalGemWt]);

  if (!activeDesign && !error) {
    return (
      <Screen style={styles.stateScreen}>
        <ActivityIndicator size="large" color="#8a6b55" />
        <Text style={styles.stateText}>Loading design...</Text>
      </Screen>
    );
  }

  if (!activeDesign) {
    return (
      <Screen style={styles.stateScreen}>
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Unable to load design</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={loadDesign}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopBar}>
            <TouchableOpacity style={styles.iconButton} onPress={handleBackToDesigns} activeOpacity={0.88}>
              <Ionicons name="arrow-back" size={18} color="#2f2119" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('CartTab' as never)}
              activeOpacity={0.88}
            >
              <Ionicons name="cart-outline" size={18} color="#2f2119" />
              {itemCount > 0 ? (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          <View style={[styles.heroImageShell, { height: heroHeight }]}>
            {activeImage ? (
              <Image source={{ uri: activeImage, cache: 'force-cache' }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderHero}>
                <Ionicons name="diamond-outline" size={42} color="#c5a890" />
                <Text style={styles.placeholderText}>Image coming soon</Text>
              </View>
            )}
          </View>
        </View>

        {gallery.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailRow}
            style={styles.thumbnailScroller}
          >
            {gallery.map((imageUrl, index) => (
              <TouchableOpacity
                key={`${imageUrl}-${index}`}
                onPress={() => setSelectedImageIndex(index)}
                activeOpacity={0.88}
                style={[
                  styles.thumbnailFrame,
                  index === selectedImageIndex ? styles.thumbnailFrameActive : null,
                ]}
              >
                <Image source={{ uri: imageUrl, cache: 'force-cache' }} style={styles.thumbnailImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <View style={[styles.detailCard, compactLayout ? styles.detailCardCompact : null]}>
          <Text
            style={[
              styles.designName,
              Platform.OS === 'android' ? styles.designNameAndroid : null,
              compactLayout ? styles.designNameCompact : null,
            ]}
          >
            {activeDesign.designName || activeDesign.designNo}
          </Text>
          <Text style={[styles.designPrice, compactLayout ? styles.designPriceCompact : null]}>
            {formatDetailPrice(displayPrice)}
          </Text>

          <OptionSection
            title={`Shape: ${selectedShape || '-'}`}
            options={shapeOptions}
            selected={selectedShape}
            onSelect={(value) => {
              resolveVersionSelection('shape', value);
            }}
            variant="shape"
          />

          <OptionSection
            title={`Metal Color: ${selectedMetalColor || '-'}`}
            options={metalColorOptions}
            selected={selectedMetalColor}
            onSelect={(value) => {
              resolveVersionSelection('metalColor', value);
            }}
          />

          <OptionSection
            title={`Diamond Type: ${selectedDiamondType || '-'}`}
            options={diamondTypeOptions}
            selected={selectedDiamondType}
            onSelect={(value) => {
              resolveVersionSelection('diamondType', value);
            }}
          />

          <OptionSection
            title="Diamond Spread"
            options={styleOptions}
            selected={selectedStyle}
            onSelect={(value) => {
              resolveVersionSelection('style', value);
            }}
          />

          <OptionSection
            title="Diamond Weight"
            options={weightOptions}
            selected={selectedWeight}
            onSelect={(value) => {
              resolveVersionSelection('weight', value);
            }}
          />

          <OptionSection
            title="Diamond Quality"
            options={qualityOptions}
            selected={selectedQuality}
            onSelect={(value) => {
              resolveVersionSelection('quality', value);
            }}
          />

          <OptionSection
            title="Ring Size"
            options={ringSizeOptions}
            selected={selectedRingSize}
            onSelect={(value) => {
              resolveVersionSelection('ringSize', value);
            }}
          />

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryAction}
              activeOpacity={0.92}
              onPress={handleAddToCart}
            >
              <Text style={styles.primaryActionText}>Add to Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryAction}
              activeOpacity={0.92}
              onPress={handleShare}
            >
              <Ionicons name="arrow-redo-outline" size={16} color="#3f3026" />
              <Text style={styles.secondaryActionText}>Share</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.descriptionBlock}>
            <Text style={styles.descriptionTitle}>Product Description</Text>
            <Text style={styles.descriptionIntro}>
              Refined showroom-ready jewelry profile with selected specifications below.
            </Text>

            <View style={styles.infoPanels}>
              <View style={styles.infoPanel}>
                <View style={styles.infoPanelHeader}>
                  <Ionicons name="layers-outline" size={14} color="#7A6551" />
                  <Text style={styles.infoPanelTitle}>General Information</Text>
                </View>
                {generalInfoRows.map((row) => (
                  <View key={`general-${row.label}`} style={[styles.infoRow, compactLayout ? styles.infoRowStack : null]}>
                    <Text style={styles.infoLabel}>{row.label}</Text>
                    <Text style={[styles.infoValue, compactLayout ? styles.infoValueStack : null]}>{row.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.infoPanel}>
                <View style={styles.infoPanelHeader}>
                  <Ionicons name="diamond-outline" size={14} color="#7A6551" />
                  <Text style={styles.infoPanelTitle}>Gemstone Information</Text>
                </View>
                {gemstoneInfoRows.map((row) => (
                  <View key={`gem-${row.label}`} style={[styles.infoRow, compactLayout ? styles.infoRowStack : null]}>
                    <Text style={styles.infoLabel}>{row.label}</Text>
                    <Text style={[styles.infoValue, compactLayout ? styles.infoValueStack : null]}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: 'transparent',
  },
  container: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 24,
  },
  heroCard: {
    position: 'relative',
  },
  heroTopBar: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 252, 245, 0.5)' : 'rgba(255, 252, 245, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A67F3F',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  heroImageShell: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F2EAE1',
  },
  heroImage: {
    width: '100%',
    height: '100%',
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
  thumbnailRow: {
    paddingTop: 12,
    paddingHorizontal: 6,
  },
  thumbnailScroller: {
    marginTop: 2,
  },
  thumbnailFrame: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eadfd2',
    backgroundColor: '#f3e9dd',
    marginRight: 10,
  },
  thumbnailFrameActive: {
    borderColor: '#3c2b20',
    borderWidth: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  detailCard: {
    marginTop: 12,
    backgroundColor: GLASS_CARD_BG,
    borderWidth: 1.3,
    borderColor: '#7C6650',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#6E533D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 0 : 2,
  },
  detailCardCompact: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  designName: {
    fontFamily: 'serif',
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: 0.55,
    color: '#2C1E16',
  },
  designNameAndroid: {
    fontSize: 27,
    lineHeight: 32,
  },
  designNameCompact: {
    fontSize: 24,
    lineHeight: 29,
  },
  designPrice: {
    marginTop: 4,
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '800',
    color: '#2C1E16',
    marginBottom: 8,
  },
  designPriceCompact: {
    fontSize: 20,
    marginBottom: 6,
  },
  sectionBlock: {
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C1E16',
    marginBottom: 8,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  shapeWrap: {
    alignItems: 'center',
  },
  shapeOption: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 12,
    marginBottom: 6,
  },
  shapeOptionActive: {
    borderBottomColor: '#2C1E16',
  },
  colorWrap: {
    alignItems: 'center',
  },
  colorOption: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: GLASS_SOFT_BG,
    marginRight: 10,
    marginBottom: 6,
  },
  colorOptionActive: {
    borderColor: '#2C1E16',
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 102, 80, 0.22)',
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BCA48B',
    backgroundColor: GLASS_CHIP_BG,
    marginRight: 8,
    marginBottom: 8,
  },
  optionChipActive: {
    backgroundColor: '#2C1E16',
    borderColor: '#2C1E16',
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C1E16',
  },
  optionChipTextActive: {
    color: 'rgba(255, 252, 245, 0.94)',
  },
  emptyOption: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  primaryAction: {
    flex: 1.15,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2C1E16',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 252, 245, 0.92)',
  },
  secondaryAction: {
    flex: 0.85,
    height: 50,
    borderRadius: 12,
    backgroundColor: GLASS_BUTTON_BG,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C1E16',
  },
  descriptionBlock: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 102, 80, 0.25)',
  },
  descriptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C1E16',
    marginBottom: 6,
    letterSpacing: 0.25,
  },
  descriptionIntro: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6E635B',
    marginBottom: 10,
  },
  infoPanels: {
    marginTop: 4,
  },
  infoPanel: {
    backgroundColor: GLASS_SOFT_BG,
    borderWidth: 1,
    borderColor: 'rgba(124, 102, 80, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
  },
  infoPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 2,
    marginBottom: 6,
  },
  infoPanelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5C4A3C',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 102, 80, 0.12)',
  },
  infoRowStack: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 12,
    color: '#7A6551',
    fontWeight: '600',
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    color: '#2C1E16',
    fontWeight: '700',
  },
  infoValueStack: {
    textAlign: 'left',
    width: '100%',
    marginTop: 2,
  },
  stateScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  stateCard: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    borderRadius: 14,
    backgroundColor: GLASS_CARD_BG,
    borderWidth: 1.3,
    borderColor: '#7C6650',
    alignItems: 'center',
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
