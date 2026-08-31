import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Keyboard,
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PinchGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
  type PinchGestureHandlerGestureEvent,
  type PinchGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationPopover from '../components/NotificationPopover';
import {
  fetchDesign,
  fetchMobileDesignConfigurator,
  resolveMobileDesignConfigurator,
  buildConfiguratorResolveQuery,
  type MobileConfiguratorOptionGroups,
  type MobileConfiguratorResponse,
} from '../api/designs';
import { fetchPricePreview } from '../api/orders';
import type { Design } from '../types';
import type { DesignsStackParamList } from '../navigation/RootNavigator';
import { formatNumber } from '../utils/format';
import type { NotificationFeedEntry } from '../utils/appNotifications';
import { diffChanges } from '../utils/changeDiff';
import {
  trackCreateOrderStarted,
  trackDesignOptionsChanged,
  trackDesignViewed,
} from '../utils/activityEvents';

type OptionVariant = 'default' | 'metal';

type VersionFilters = {
  diamondType: string;
  shape: string;
  style: string;
  metalCaratage: string;
  weight: string;
  quality: string;
  ringSize: string;
};

type FilterKey = keyof VersionFilters;
type VersionOptionGroups = Record<FilterKey, string[]>;
type RawOptionGroups = MobileConfiguratorOptionGroups;
type DropdownLayout = {
  top: number;
  left: number;
  width: number;
  listMaxHeight: number;
};

const DROPDOWN_EDGE_PADDING = 12;
const DROPDOWN_GAP = 6;
const DROPDOWN_LIST_MAX_HEIGHT = 176;
const DROPDOWN_OPTION_HEIGHT = 40;
const DROPDOWN_SEARCH_HEIGHT = 48;
const DROPDOWN_LIST_MIN_HEIGHT = 40;
const FILTER_KEYS: FilterKey[] = ['diamondType', 'shape', 'style', 'metalCaratage', 'weight', 'quality', 'ringSize'];

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

const hasDisplayValue = (value?: string | number | null) => compact(value) !== '';

const uniqueValues = (values: Array<string | number | null | undefined>) =>
  Array.from(new Set(values.map(compact).filter(Boolean)));

const splitStoneOptions = (values: Array<string | number | null | undefined>) =>
  uniqueValues(
    values.flatMap((value) =>
      compact(value)
        .split(',')
        .map((stone) => stone.trim())
        .filter(Boolean),
    ),
  );

const splitMetalOptions = (values: Array<string | number | null | undefined>) =>
  uniqueValues(
    (values || []).flatMap((value) =>
      compact(value)
        .split(',')
        .map((metal) => metal.trim())
        .filter(Boolean),
    ),
  );

const firstMetal = (value?: string | number | null) => splitMetalOptions([value])[0] || '';

const cleanOptions = (values?: Array<string | number | null | undefined> | null) => uniqueValues(values || []);

const sortJewelrySizes = (values?: Array<string | number | null | undefined> | null) =>
  cleanOptions(values).sort((left, right) => {
    const leftNumber = Number.parseFloat(left.match(/-?\d+(?:\.\d+)?/)?.[0] || '');
    const rightNumber = Number.parseFloat(right.match(/-?\d+(?:\.\d+)?/)?.[0] || '');
    const leftIsNumeric = Number.isFinite(leftNumber);
    const rightIsNumeric = Number.isFinite(rightNumber);

    if (leftIsNumeric && rightIsNumeric && leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }
    if (leftIsNumeric !== rightIsNumeric) {
      return leftIsNumeric ? -1 : 1;
    }
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
  });

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

const metalCaratageSwatchByValue = (value: string) => {
  const palette = ['#B8A46A', '#A7AEB8', '#B98D7E', '#8EA8A1', '#9B8CB6', '#AF9A86'];
  const normalized = compact(value).toLowerCase();
  const hash = Array.from(normalized).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
};

const toMetalCaratageLabel = (value?: string | null) => {
  return compact(value).replace(/\s+/g, ' ');
};

const toMetalShortCode = (value?: string | null) => {
  return toMetalCaratageLabel(value);
};

const getMediaExtension = (uri?: string | null) => {
  const cleanUri = String(uri || '').split('?')[0].split('#')[0];
  const fileName = cleanUri.split('/').pop() || '';
  const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() || '';
};

const imageMediaExtensions = new Set(['avif', 'bmp', 'gif', 'heic', 'heif', 'jpeg', 'jpg', 'png', 'webp']);
const videoMediaExtensions = new Set(['m4v', 'mov', 'mp4', 'mpeg', 'mpg', 'ogv', 'webm']);

const getMediaFileIcon = (uri?: string | null) => {
  const extension = getMediaExtension(uri);
  if (videoMediaExtensions.has(extension)) return 'videocam-outline' as const;
  if (extension === 'stl' || extension === 'obj' || extension === '3dm') return 'cube-outline' as const;
  if (extension === 'pdf') return 'document-text-outline' as const;
  if (['xls', 'xlsx', 'csv'].includes(extension)) return 'grid-outline' as const;
  if (['doc', 'docx', 'txt'].includes(extension)) return 'document-text-outline' as const;
  if (['zip', 'rar', '7z'].includes(extension)) return 'archive-outline' as const;
  return 'document-outline' as const;
};

const getMediaFileLabel = (uri?: string | null) => {
  const extension = getMediaExtension(uri);
  if (!extension) return 'File unavailable';
  if (imageMediaExtensions.has(extension)) return `${extension.toUpperCase()} unavailable`;
  if (videoMediaExtensions.has(extension)) return `${extension.toUpperCase()} video`;
  return `${extension.toUpperCase()} file`;
};

const isVideoMedia = (uri?: string | null) => videoMediaExtensions.has(getMediaExtension(uri));

const MediaVideo = ({
  uri,
  style,
  nativeControls,
  autoPlay,
}: {
  uri: string;
  style: any;
  nativeControls?: boolean;
  autoPlay?: boolean;
}) => {
  const player = useVideoPlayer(uri, (nextPlayer) => {
    nextPlayer.loop = !nativeControls;
    nextPlayer.muted = !nativeControls;
    nextPlayer.staysActiveInBackground = false;
    nextPlayer.showNowPlayingNotification = false;
  });

  useEffect(() => {
    if (autoPlay) {
      player.play();
      return;
    }
    player.pause();
  }, [autoPlay, player]);

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="contain"
      nativeControls={nativeControls}
      allowsFullscreen={false}
      playsInline
    />
  );
};

// const formatStoneNumber = (value: string | number | null | undefined, decimals = 3) => {
//   const numeric = Number(value);
//   if (!Number.isFinite(numeric)) return '';
//   return formatNumber(numeric, decimals);
// };

const getMetalOptionsFromDesign = (design: Design) => {
  const metals = design.metals || [];
  if (metals.length) {
    return splitMetalOptions(metals.map((metal) => metal.metalCaratage || metal.metalCaratage));
  }
  return splitMetalOptions([design.metalCaratage]);
};

const getVersionAttributes = (design: Design) => ({
  diamondTypes: uniqueValues([design.diamondType]),
  shapes: splitStoneOptions(design.gemstones?.map((gem) => gem.stone || gem.stoneType) || []),
  // Spread must come only from design-level field (not gemstone type).
  styles: uniqueValues([design.diamondSpread]),
  metalCaratages: getMetalOptionsFromDesign(design),
  // Quality/weight/jewelry size options are version-level selections from general info.
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
    metalCaratage: attrs.metalCaratages[0] || '',
    weight: attrs.weights[0] || '',
    quality: attrs.qualities[0] || '',
    ringSize: attrs.ringSizes[0] || '',
  };
};

const emptyRawOptionGroups = (): RawOptionGroups => ({
  diamondType: [],
  shape: [],
  style: [],
  metalCaratage: [],
  weight: [],
  quality: [],
  ringSize: [],
});

const emptyVersionFilters = (): VersionFilters => ({
  diamondType: '',
  shape: '',
  style: '',
  metalCaratage: '',
  weight: '',
  quality: '',
  ringSize: '',
});

const mergeOptionGroupsWithSelection = (
  groups: VersionOptionGroups,
  selected: Partial<VersionFilters>,
): VersionOptionGroups => {
  const next = { ...groups };
  FILTER_KEYS.forEach((key) => {
    const selectedValue = compact(selected[key]);
    if (!selectedValue) return;
    const values = key === 'metalCaratage' ? splitMetalOptions(next[key]) : (next[key] || []);
    if (!values.some((value: string) => compact(value) === selectedValue)) {
      next[key] = [selectedValue, ...values];
    } else {
      next[key] = values;
    }
  });
  return next;
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
}) => {
  const visibleOptions = cleanOptions(options);
  if (!visibleOptions.length) return null;

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={[styles.optionWrap, variant === 'metal' ? styles.metalWrap : null]}>
        {visibleOptions.map((option) => {
          const active = selected === option;
          if (variant === 'metal') {
            return (
              <TouchableOpacity
                key={`${title}-${option}`}
                style={[styles.metalChip, active ? styles.metalChipActive : null]}
                onPress={() => onSelect(option)}
                activeOpacity={0.9}
              >
                <View style={[styles.metalDot, { backgroundColor: metalCaratageSwatchByValue(option) }]} />
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
    </View>
  );
};

// Design gemstones are hidden for now, but kept here so the table can be restored later.
// const hasGemstoneValue = (gem: NonNullable<Design['gemstones']>[number]) => {
//   const numericValues = [gem.wtPerPcs, gem.pcs, gem.wtInCts].map(Number);
//   return (
//     [gem.stone, gem.shape, gem.size, gem.color, gem.quality].some(hasDisplayValue) ||
//     numericValues.some((value) => Number.isFinite(value) && value > 0)
//   );
// };
//
// const GemstoneGrid = ({ gemstones }: { gemstones: NonNullable<Design['gemstones']> }) => {
//   const visibleGemstones = gemstones.filter(hasGemstoneValue);
//   if (!visibleGemstones.length) return null;
//
//   return (
//     <View style={styles.gemstoneCard}>
//       <Text style={styles.specTitle}>DESIGN GEMSTONES</Text>
//       <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
//         <View style={styles.gemstoneTable}>
//           <View style={[styles.gemstoneTableRow, styles.gemstoneHeaderRow]}>
//             <Text style={[styles.gemstoneHeaderCell, styles.gemstoneStoneCell]}>Stone</Text>
//             <Text style={[styles.gemstoneHeaderCell, styles.gemstoneTextCell]}>Shape</Text>
//             <Text style={[styles.gemstoneHeaderCell, styles.gemstoneTextCell]}>Size</Text>
//             <Text style={[styles.gemstoneHeaderCell, styles.gemstoneTextCell]}>Color</Text>
//             <Text style={[styles.gemstoneHeaderCell, styles.gemstoneTextCell]}>Quality</Text>
//             <Text style={[styles.gemstoneHeaderCell, styles.gemstoneNumberCell]}>Wt/Pcs</Text>
//             <Text style={[styles.gemstoneHeaderCell, styles.gemstoneSmallNumberCell]}>Pcs</Text>
//             <Text style={[styles.gemstoneHeaderCell, styles.gemstoneNumberCell]}>Wt(Cts)</Text>
//           </View>
//           {visibleGemstones.map((gem, index) => (
//             <View
//               key={`gem-row-${gem.packetId || gem.stone || index}-${index}`}
//               style={[styles.gemstoneTableRow, index === visibleGemstones.length - 1 ? styles.gemstoneTableRowLast : null]}
//             >
//               <Text style={[styles.gemstoneCell, styles.gemstoneStoneCell]} numberOfLines={1}>
//                 {compact(gem.stone)}
//               </Text>
//               <Text style={[styles.gemstoneCell, styles.gemstoneTextCell]} numberOfLines={1}>
//                 {compact(gem.shape)}
//               </Text>
//               <Text style={[styles.gemstoneCell, styles.gemstoneTextCell]} numberOfLines={1}>
//                 {compact(gem.size)}
//               </Text>
//               <Text style={[styles.gemstoneCell, styles.gemstoneTextCell]} numberOfLines={1}>
//                 {compact(gem.color)}
//               </Text>
//               <Text style={[styles.gemstoneCell, styles.gemstoneTextCell]} numberOfLines={1}>
//                 {compact(gem.quality)}
//               </Text>
//               <Text style={[styles.gemstoneCell, styles.gemstoneNumberCell]}>
//                 {formatStoneNumber(gem.wtPerPcs)}
//               </Text>
//               <Text style={[styles.gemstoneCell, styles.gemstoneSmallNumberCell]}>
//                 {formatStoneNumber(gem.pcs, 0)}
//               </Text>
//               <Text style={[styles.gemstoneCell, styles.gemstoneNumberCell]}>
//                 {formatStoneNumber(gem.wtInCts)}
//               </Text>
//             </View>
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// };

const DesignDetailScreen = ({
  modalDesignId,
  modalPresetCategory,
  onClose,
}: {
  modalDesignId?: string;
  modalPresetCategory?: string;
  onClose?: () => void;
} = {}) => {
  const { token, user } = useAuth();
  const { unreadCount: notificationCount } = useNotifications();
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const route = useRoute<RouteProp<DesignsStackParamList, 'DesignDetail'>>();
  const insets = useSafeAreaInsets();
  const isModal = Boolean(modalDesignId && onClose);
  const designId = modalDesignId || route.params?.designId;
  const presetCategory = modalPresetCategory ?? route.params?.presetCategory;
  const { width, height: windowHeight } = useWindowDimensions();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 0);
  const mediaHeight = Math.min(width >= 700 ? 360 : 260, Math.max(156, width * 0.54));
  const mediaListRef = useRef<FlatList<string> | null>(null);
  const detailScrollRef = useRef<ScrollView | null>(null);
  const detailScrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const keyboardRestoreScrollYRef = useRef<number | null>(null);
  const keyboardManualScrollRef = useRef(false);
  const lastViewerTapAtRef = useRef(0);
  const pinchRef = useRef<PinchGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);
  const baseScaleRef = useRef(new Animated.Value(1));
  const pinchScaleRef = useRef(new Animated.Value(1));
  const panXRef = useRef(new Animated.Value(0));
  const panYRef = useRef(new Animated.Value(0));
  const lastScaleRef = useRef(1);
  const lastPanRef = useRef({ x: 0, y: 0 });
  const screenRef = useRef<View | null>(null);
  const dropdownFieldRefs = useRef<Record<FilterKey, View | null>>({
    diamondType: null,
    shape: null,
    style: null,
    metalCaratage: null,
    weight: null,
    quality: null,
    ringSize: null,
  });

  const [familyDesigns, setFamilyDesigns] = useState<Design[]>([]);
  const [activeDesignId, setActiveDesignId] = useState<string | null>(null);
  const [optionGroups, setOptionGroups] = useState<VersionOptionGroups>({
    diamondType: [],
    shape: [],
    style: [],
    metalCaratage: [],
    weight: [],
    quality: [],
    ringSize: [],
  });
  const [rawOptionGroups, setRawOptionGroups] = useState<RawOptionGroups>(() => emptyRawOptionGroups());
  const [priceByDesignId, setPriceByDesignId] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [resolvingSelection, setResolvingSelection] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [mediaViewportWidth, setMediaViewportWidth] = useState(0);
  const [failedMediaUrls, setFailedMediaUrls] = useState<Set<string>>(() => new Set());
  const [imageViewerUri, setImageViewerUri] = useState<string | null>(null);
  const [imageViewerZoomed, setImageViewerZoomed] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  const [selectedShape, setSelectedShape] = useState('');
  const [selectedDiamondType, setSelectedDiamondType] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedMetalCaratage, setSelectedMetalCaratage] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [selectedRingSize, setSelectedRingSize] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [dropdownSelected, setDropdownSelected] = useState('');
  const [dropdownKey, setDropdownKey] = useState<FilterKey | null>(null);
  const [dropdownLayout, setDropdownLayout] = useState<DropdownLayout | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const resolveRequestSeqRef = useRef(0);

  const handleBackToDesigns = useCallback(() => {
    if (isModal && onClose) {
      onClose();
      return;
    }
    navigation.navigate('Designs', { presetCategory });
  }, [isModal, onClose, navigation, presetCategory]);

  const applyActiveDesignSelection = useCallback((design: Design, selectedOptions?: Partial<VersionFilters>) => {
    const next = { ...getFilterValuesFromDesign(design), ...(selectedOptions || {}) };
    setActiveDesignId(design.id);
    setSelectedShape(next.shape);
    setSelectedDiamondType(next.diamondType);
    setSelectedStyle(next.style);
    setSelectedMetalCaratage(next.metalCaratage);
    setSelectedWeight(next.weight);
    setSelectedQuality(next.quality);
    setSelectedRingSize(next.ringSize);
    setSelectedImageIndex(0);
  }, []);

  const applyConfiguratorResponse = useCallback(
    (response: MobileConfiguratorResponse, preservedOptions: Partial<VersionFilters> = {}) => {
      const responseSelectedOptions = {
        diamondType: response.selectedOptionLabels?.diamondType || response.optionGroupLabels.diamondType[0] || '',
        shape: splitStoneOptions([response.selectedOptionLabels?.shape || response.optionGroupLabels.shape[0]])[0] || '',
        style: response.selectedOptionLabels?.style || response.optionGroupLabels.style[0] || '',
        metalCaratage: firstMetal(response.selectedOptionLabels?.metalCaratage || response.optionGroupLabels.metalCaratage[0]),
        weight: response.selectedOptionLabels?.weight || response.optionGroupLabels.weight[0] || '',
        quality: response.selectedOptionLabels?.quality || response.optionGroupLabels.quality[0] || '',
        ringSize: response.selectedOptionLabels?.ringSize || response.optionGroupLabels.ringSize[0] || '',
      };
      const selectedOptions = {
        ...responseSelectedOptions,
        ...Object.fromEntries(
          Object.entries(preservedOptions).filter(([, value]) => compact(value)),
        ),
      } as VersionFilters;
      setFamilyDesigns([response.selectedDesign]);
      setOptionGroups(mergeOptionGroupsWithSelection(response.optionGroupLabels, selectedOptions));
      setRawOptionGroups(response.optionGroups);
      applyActiveDesignSelection(response.selectedDesign, selectedOptions);
    },
    [applyActiveDesignSelection],
  );

  const loadPriceForDesign = useCallback(
    async (design: Design) => {
      const fallback = design.displayPrice ?? design.totalValue ?? 0;
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

  const loadStoneCountForDesign = useCallback(
    async (design: Design): Promise<Design> => {
      if (!token) return design;
      if (design.stoneCount !== undefined && design.totalStoneWeight !== undefined) return design;

      try {
        const designDetails = await fetchDesign(token, design.id);
        const stoneCount = (designDetails.gemstones || []).reduce(
          (total, gemstone) => total + Math.max(0, Math.trunc(Number(gemstone.pcs) || 0)),
          0,
        );
        const gemTotal = (designDetails.gemstones || []).reduce((sum, gem) => {
          const wt = Number(gem.wtInCts) || (Number(gem.wtPerPcs || 0) * Number(gem.pcs || 0));
          return sum + (Number.isFinite(wt) && wt > 0 ? wt : 0);
        }, 0);
        const parsedWeight = Number.parseFloat(String(designDetails.diamondWeight || '').replace(/[^\d.]/g, ''));
        const totalStoneWeight = gemTotal > 0 ? Number(gemTotal.toFixed(3)) : (Number.isFinite(parsedWeight) ? parsedWeight : 0);

        return {
          ...design,
          stoneCount: design.stoneCount ?? stoneCount,
          totalStoneWeight: design.totalStoneWeight ?? totalStoneWeight,
          gemstones: designDetails.gemstones || design.gemstones,
        };
      } catch {
        return design;
      }
    },
    [token],
  );

  const setSelectedFeatureValue = useCallback((key: FilterKey, value: string) => {
    if (key === 'diamondType') setSelectedDiamondType(value);
    else if (key === 'shape') setSelectedShape(value);
    else if (key === 'style') setSelectedStyle(value);
    else if (key === 'metalCaratage') setSelectedMetalCaratage(value);
    else if (key === 'weight') setSelectedWeight(value);
    else if (key === 'quality') setSelectedQuality(value);
    else if (key === 'ringSize') setSelectedRingSize(value);
  }, []);

  const loadDesign = useCallback(async () => {
    if (!token) return;
    setError(null);

    try {
      const response = await fetchMobileDesignConfigurator(token, designId);
      const selectedDesign = await loadStoneCountForDesign(response.selectedDesign);
      applyConfiguratorResponse({ ...response, selectedDesign });
      await loadPriceForDesign(selectedDesign);
      trackDesignViewed(selectedDesign.id, {
        designNo: selectedDesign.designNo,
        designName: selectedDesign.designName,
        sourceDesignId: designId,
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to load design');
    }
  }, [token, designId, applyConfiguratorResponse, loadPriceForDesign, loadStoneCountForDesign]);

  useFocusEffect(
    useCallback(() => {
      loadDesign();
    }, [loadDesign]),
  );

  // In modal mode useFocusEffect never fires, so use a plain effect keyed on designId
  useEffect(() => {
    if (!isModal) return;
    loadDesign();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModal, designId]);

  const activeDesign = useMemo(() => {
    if (!familyDesigns.length) return null;
    return familyDesigns.find((row) => row.id === activeDesignId) || familyDesigns[0];
  }, [familyDesigns, activeDesignId]);

  useEffect(() => {
    setSelectedImageIndex(0);
    setFailedMediaUrls(new Set());
  }, [activeDesignId]);

  const gallery = useMemo(() => activeDesign?.imageUrls?.filter(Boolean) || [], [activeDesign?.imageUrls]);
  const mediaFallbackWidth = Math.max(1, width - 28);
  const mediaFrameWidth = mediaViewportWidth || mediaFallbackWidth;
  const activeImage = gallery[selectedImageIndex] || gallery[0];
  const hasPreviousMedia = selectedImageIndex > 0;
  const hasNextMedia = selectedImageIndex < gallery.length - 1;

  const handleMediaLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.max(1, Math.round(event.nativeEvent.layout.width));
    setMediaViewportWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
  }, []);

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

  const goToMediaIndex = useCallback(
    (index: number) => {
      if (!gallery.length || mediaViewportWidth <= 0) return;
      const boundedIndex = Math.max(0, Math.min(gallery.length - 1, index));
      setSelectedImageIndex(boundedIndex);
      mediaListRef.current?.scrollToIndex({
        index: boundedIndex,
        animated: true,
        viewPosition: 0,
      });
    },
    [gallery.length, mediaViewportWidth],
  );

  const markMediaFailed = useCallback((uri: string) => {
    setFailedMediaUrls((current) => {
      if (current.has(uri)) return current;
      const next = new Set(current);
      next.add(uri);
      return next;
    });
  }, []);

  const imageViewerScale = useMemo(
    () => Animated.multiply(baseScaleRef.current, pinchScaleRef.current),
    [],
  );

  const resetImageViewerTransform = useCallback(() => {
    lastScaleRef.current = 1;
    lastPanRef.current = { x: 0, y: 0 };
    baseScaleRef.current.setValue(1);
    pinchScaleRef.current.setValue(1);
    panXRef.current.setOffset(0);
    panYRef.current.setOffset(0);
    panXRef.current.setValue(0);
    panYRef.current.setValue(0);
    setImageViewerZoomed(false);
  }, []);

  const openImageViewer = useCallback((uri: string) => {
    resetImageViewerTransform();
    setImageViewerUri(uri);
  }, [resetImageViewerTransform]);

  const closeImageViewer = useCallback(() => {
    setImageViewerUri(null);
    resetImageViewerTransform();
  }, [resetImageViewerTransform]);

  const zoomImageViewerTo = useCallback((nextScale: number) => {
    const normalizedScale = Math.max(1, Math.min(nextScale, 4));
    lastScaleRef.current = normalizedScale;
    baseScaleRef.current.setValue(normalizedScale);
    pinchScaleRef.current.setValue(1);
    lastPanRef.current = { x: 0, y: 0 };
    panXRef.current.setOffset(0);
    panYRef.current.setOffset(0);
    panXRef.current.setValue(0);
    panYRef.current.setValue(0);
    setImageViewerZoomed(normalizedScale > 1.02);
  }, []);

  const handleImageViewerTap = useCallback(() => {
    const now = Date.now();
    if (now - lastViewerTapAtRef.current <= 320) {
      lastViewerTapAtRef.current = 0;
      zoomImageViewerTo(lastScaleRef.current > 1.02 ? 1 : 2);
      return;
    }
    lastViewerTapAtRef.current = now;
  }, [zoomImageViewerTo]);

  const handlePinchGestureEvent = useMemo(
    () =>
      Animated.event<PinchGestureHandlerGestureEvent>(
        [{ nativeEvent: { scale: pinchScaleRef.current } }],
        { useNativeDriver: true },
      ),
    [],
  );

  const handlePanGestureEvent = useMemo(
    () =>
      Animated.event<PanGestureHandlerGestureEvent>(
        [{ nativeEvent: { translationX: panXRef.current, translationY: panYRef.current } }],
        { useNativeDriver: true },
      ),
    [],
  );

  const handlePinchStateChange = useCallback((event: PinchGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState !== State.ACTIVE) return;
    const nextScale = Math.max(1, Math.min(lastScaleRef.current * event.nativeEvent.scale, 4));
    lastScaleRef.current = nextScale;
    baseScaleRef.current.setValue(nextScale);
    pinchScaleRef.current.setValue(1);
    setImageViewerZoomed(nextScale > 1.02);

    if (nextScale <= 1.02) {
      lastPanRef.current = { x: 0, y: 0 };
      panXRef.current.setOffset(0);
      panYRef.current.setOffset(0);
      panXRef.current.setValue(0);
      panYRef.current.setValue(0);
    }
  }, []);

  const handlePanStateChange = useCallback((event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState !== State.ACTIVE || lastScaleRef.current <= 1.02) return;
    lastPanRef.current = {
      x: lastPanRef.current.x + event.nativeEvent.translationX,
      y: lastPanRef.current.y + event.nativeEvent.translationY,
    };
    panXRef.current.setOffset(lastPanRef.current.x);
    panYRef.current.setOffset(lastPanRef.current.y);
    panXRef.current.setValue(0);
    panYRef.current.setValue(0);
  }, []);

  const handleMediaPress = useCallback(
    (uri: string) => {
      openImageViewer(uri);
    },
    [openImageViewer],
  );

  const retryMediaScrollToIndex = useCallback(
    (index: number, animated = false) => {
      if (!gallery.length || mediaFrameWidth <= 0) return;
      const boundedIndex = Math.max(0, Math.min(gallery.length - 1, index));
      requestAnimationFrame(() => {
        mediaListRef.current?.scrollToIndex({
          index: boundedIndex,
          animated,
          viewPosition: 0,
        });
      });
    },
    [gallery.length, mediaFrameWidth],
  );

  useEffect(() => {
    if (!gallery.length || mediaViewportWidth <= 0 || selectedImageIndex < 0 || selectedImageIndex >= gallery.length) return;
    mediaListRef.current?.scrollToIndex({
      index: selectedImageIndex,
      animated: false,
      viewPosition: 0,
    });
  }, [gallery.length, mediaViewportWidth]);

  const displayPrice = useMemo(
    () => (activeDesign ? priceByDesignId[activeDesign.id] ?? activeDesign.displayPrice ?? activeDesign.totalValue ?? 0 : 0),
    [activeDesign, priceByDesignId],
  );

  const diamondTypeOptions = useMemo(
    () => cleanOptions(optionGroups.diamondType),
    [optionGroups.diamondType],
  );
  const styleOptions = useMemo(
    () => cleanOptions(optionGroups.style),
    [optionGroups.style],
  );
  const metalCaratageOptions = useMemo(
    () => splitMetalOptions(optionGroups.metalCaratage),
    [optionGroups.metalCaratage],
  );
  const qualityOptions = useMemo(
    () => cleanOptions(optionGroups.quality),
    [optionGroups.quality],
  );
  const weightOptions = useMemo(
    () => cleanOptions(optionGroups.weight),
    [optionGroups.weight],
  );
  const ringSizeOptions = useMemo(
    () => sortJewelrySizes(optionGroups.ringSize),
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
        metalCaratage: selectedMetalCaratage,
        weight: selectedWeight,
        quality: selectedQuality,
        ringSize: selectedRingSize,
      };
      const nextFilters = { ...currentFilters, [selectedKey]: selectedValue };

      setSelectedFeatureValue(selectedKey, selectedValue);
      setResolvingSelection(true);
      setError(null);

      try {
        const response = await resolveMobileDesignConfigurator(
          token,
          designId,
          buildConfiguratorResolveQuery(
            selectedKey,
            rawOptionGroups[selectedKey].find((option) => option.label === selectedValue) || selectedValue,
            {
              style: rawOptionGroups.style.find((option) => option.label === nextFilters.style) || nextFilters.style,
              metalCaratage: rawOptionGroups.metalCaratage.find((option) => option.label === nextFilters.metalCaratage) || nextFilters.metalCaratage,
              weight: rawOptionGroups.weight.find((option) => option.label === nextFilters.weight) || nextFilters.weight,
              quality: rawOptionGroups.quality.find((option) => option.label === nextFilters.quality) || nextFilters.quality,
              ringSize: rawOptionGroups.ringSize.find((option) => option.label === nextFilters.ringSize) || nextFilters.ringSize,
            },
          ),
        );
        if (resolveRequestSeqRef.current !== requestId) return;
        const selectedDesign = await loadStoneCountForDesign(response.selectedDesign);
        if (resolveRequestSeqRef.current !== requestId) return;
        applyConfiguratorResponse({ ...response, selectedDesign }, nextFilters);
        await loadPriceForDesign(selectedDesign);
        trackDesignOptionsChanged(
          selectedDesign.id,
          diffChanges(currentFilters, nextFilters, [selectedKey]),
        );
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
      designId,
      selectedShape,
      selectedDiamondType,
      selectedStyle,
      selectedMetalCaratage,
      selectedWeight,
      selectedQuality,
      selectedRingSize,
      loadStoneCountForDesign,
      setSelectedFeatureValue,
      applyConfiguratorResponse,
      loadPriceForDesign,
      rawOptionGroups,
    ],
  );

  const findRawOption = useCallback((key: keyof RawOptionGroups, label: string) => (
    rawOptionGroups[key].find((option) => option.label === label) || { id: null, label }
  ), [rawOptionGroups]);

  const handleOpenQuoteBuilder = useCallback(() => {
    if (!activeDesign) return;
    const shortDescription = [
      selectedDiamondType ? `Type: ${selectedDiamondType}` : null,
      selectedMetalCaratage ? `Metal: ${toMetalCaratageLabel(selectedMetalCaratage)}` : null,
      selectedRingSize ? `Jewelry Size: ${selectedRingSize}` : null,
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
        selectedOptions: {
          diamondType: findRawOption('diamondType', selectedDiamondType),
          shape: findRawOption('shape', selectedShape),
          style: findRawOption('style', selectedStyle),
          metalCaratage: findRawOption('metalCaratage', selectedMetalCaratage),
          weight: findRawOption('weight', selectedWeight),
          quality: findRawOption('quality', selectedQuality),
          ringSize: findRawOption('ringSize', selectedRingSize),
        },
        configurator: {
          selectedDesign: activeDesign,
          selectedOptions: {
            diamondType: findRawOption('diamondType', selectedDiamondType),
            shape: findRawOption('shape', selectedShape),
            style: findRawOption('style', selectedStyle),
            metalCaratage: findRawOption('metalCaratage', selectedMetalCaratage),
            weight: findRawOption('weight', selectedWeight),
            quality: findRawOption('quality', selectedQuality),
            ringSize: findRawOption('ringSize', selectedRingSize),
          },
          optionGroups: rawOptionGroups,
          selectedOptionLabels: {
            diamondType: selectedDiamondType,
            shape: selectedShape,
            style: selectedStyle,
            metalCaratage: selectedMetalCaratage,
            weight: selectedWeight,
            quality: selectedQuality,
            ringSize: selectedRingSize,
          },
          optionGroupLabels: optionGroups,
        },
        selection: {
          diamondType: selectedDiamondType,
          shape: selectedShape,
          style: selectedStyle,
          metalColor: selectedMetalCaratage,
          weight: selectedWeight,
          quality: selectedQuality,
          ringSize: selectedRingSize,
        },
      },
    });
    if (isModal && onClose) onClose();
    trackCreateOrderStarted(activeDesign.id, {
      designNo: activeDesign.designNo,
      designName: activeDesign.designName,
      price: Math.round(Number(displayPrice || 0)),
    });
  }, [
    activeDesign,
    activeImage,
    displayPrice,
    navigation,
    findRawOption,
    optionGroups,
    rawOptionGroups,
    selectedDiamondType,
    selectedMetalCaratage,
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

  const filteredDropdownOptions = useMemo(() => {
    const search = dropdownSearch.trim().toLowerCase();
    if (!search) return dropdownOptions;
    return dropdownOptions.filter((option) => option.toLowerCase().includes(search));
  }, [dropdownOptions, dropdownSearch]);

  const closeDropdown = useCallback(() => {
    setDropdownVisible(false);
    setDropdownLayout(null);
    setDropdownSearch('');
  }, []);

  const measureDropdownLayout = useCallback(
    (key: FilterKey, optionCount: number) => {
      const fieldNode = dropdownFieldRefs.current[key];
      const screenNode = screenRef.current;
      if (!fieldNode || !screenNode) {
        setDropdownLayout(null);
        return;
      }

      screenNode.measureInWindow((rootX, rootY) => {
        fieldNode.measureInWindow((fieldX, fieldY, fieldWidth, fieldHeight) => {
          const preferredListHeight = Math.min(
            DROPDOWN_LIST_MAX_HEIGHT,
            Math.max(DROPDOWN_OPTION_HEIGHT, optionCount * DROPDOWN_OPTION_HEIGHT),
          );
          const visibleBottom = windowHeight - keyboardHeightRef.current - DROPDOWN_EDGE_PADDING;
          const spaceBelow = visibleBottom - (fieldY + fieldHeight);
          const spaceAbove = fieldY - DROPDOWN_EDGE_PADDING;
          const preferredMenuHeight = DROPDOWN_SEARCH_HEIGHT + preferredListHeight;
          const openDownTop = fieldY + fieldHeight + DROPDOWN_GAP;
          const openUpTop = Math.max(DROPDOWN_EDGE_PADDING, fieldY - preferredMenuHeight - DROPDOWN_GAP);
          const canOpenDown = spaceBelow >= DROPDOWN_SEARCH_HEIGHT + DROPDOWN_LIST_MIN_HEIGHT;
          const openUp = spaceBelow < preferredMenuHeight && spaceAbove > spaceBelow;
          const openDown = canOpenDown || !openUp;
          const listHeight = openDown
            ? Math.max(
                DROPDOWN_LIST_MIN_HEIGHT,
                Math.min(preferredListHeight, visibleBottom - openDownTop - DROPDOWN_SEARCH_HEIGHT),
              )
            : preferredListHeight;
          const menuTopInWindow = openDown ? openDownTop : openUpTop;
          const menuLeft = Math.max(
            DROPDOWN_EDGE_PADDING,
            Math.min(fieldX - rootX, width - DROPDOWN_EDGE_PADDING - fieldWidth),
          );

          setDropdownLayout({
            top: menuTopInWindow - rootY,
            left: menuLeft,
            width: fieldWidth,
            listMaxHeight: listHeight,
          });
        });
      });
    },
    [width, windowHeight],
  );

  const openDropdown = useCallback(
    (key: FilterKey, options: string[], selected: string) => {
      if (!options.length) return;
      if (dropdownVisible && dropdownKey === key) {
        closeDropdown();
        return;
      }
      setDropdownKey(key);
      setDropdownOptions(options);
      setDropdownSelected(selected);
      setDropdownSearch('');
      measureDropdownLayout(key, options.length);
      setDropdownVisible(true);
    },
    [closeDropdown, dropdownKey, dropdownVisible, measureDropdownLayout],
  );

  const handleDropdownSelect = useCallback(
    (value: string) => {
      if (!dropdownKey) return;
      resolveVersionSelection(dropdownKey, value);
      closeDropdown();
    },
    [closeDropdown, dropdownKey, resolveVersionSelection],
  );

  const handleDetailScrollBegin = useCallback(() => {
    if (keyboardHeightRef.current > 0) {
      keyboardManualScrollRef.current = true;
      keyboardRestoreScrollYRef.current = null;
    }
    if (dropdownVisible) closeDropdown();
  }, [closeDropdown, dropdownVisible]);

  const handleDetailTouchStart = useCallback(() => {
    if (dropdownVisible) closeDropdown();
  }, [closeDropdown, dropdownVisible]);

  const handleOutsideDropdownTouchStart = useCallback(() => {
    if (dropdownVisible) closeDropdown();
  }, [closeDropdown, dropdownVisible]);

  const handleOpenNotifications = useCallback(() => {
    closeDropdown();
    setNotificationsVisible(true);
  }, [closeDropdown]);

  const handleOpenNotificationEntry = useCallback(
    (_entry: NotificationFeedEntry) => {
      (navigation as any).navigate('OrdersTab');
    },
    [navigation],
  );

  const keepDropdownAboveKeyboard = useCallback(
    (keyboardHeight: number) => {
      if (!dropdownKey || keyboardHeight <= 0) return;
      const fieldNode = dropdownFieldRefs.current[dropdownKey];
      if (!fieldNode) return;

      fieldNode.measureInWindow((_, fieldY, __, fieldHeight) => {
        const listHeight = Math.min(
          DROPDOWN_LIST_MAX_HEIGHT,
          Math.max(DROPDOWN_OPTION_HEIGHT, dropdownOptions.length * DROPDOWN_OPTION_HEIGHT),
        );
        const menuHeight = DROPDOWN_SEARCH_HEIGHT + listHeight;
        const visibleBottom = windowHeight - keyboardHeight - DROPDOWN_EDGE_PADDING;
        const wantedBottom = fieldY + fieldHeight + DROPDOWN_GAP + menuHeight;
        const overlap = wantedBottom - visibleBottom;

        if (overlap > 0) {
          if (keyboardRestoreScrollYRef.current === null) {
            keyboardRestoreScrollYRef.current = detailScrollYRef.current;
          }
          keyboardManualScrollRef.current = false;
          const nextY = Math.max(0, detailScrollYRef.current + overlap + DROPDOWN_EDGE_PADDING);
          detailScrollYRef.current = nextY;
          detailScrollRef.current?.scrollTo({
            y: nextY,
            animated: false,
          });
          requestAnimationFrame(() => {
            measureDropdownLayout(dropdownKey, dropdownOptions.length);
            requestAnimationFrame(() => {
              measureDropdownLayout(dropdownKey, dropdownOptions.length);
            });
          });
          return;
        }

        measureDropdownLayout(dropdownKey, dropdownOptions.length);
        requestAnimationFrame(() => {
          measureDropdownLayout(dropdownKey, dropdownOptions.length);
        });
      });
    },
    [dropdownKey, dropdownOptions.length, measureDropdownLayout, windowHeight],
  );

  useEffect(() => {
    const handleKeyboardShow = (event: { endCoordinates?: { height?: number } }) => {
      const nextHeight = event.endCoordinates?.height || 0;
      keyboardHeightRef.current = nextHeight;
      keepDropdownAboveKeyboard(nextHeight);
    };
    const handleKeyboardHide = () => {
      keyboardHeightRef.current = 0;
      const restoreY = keyboardRestoreScrollYRef.current;
      if (restoreY !== null && !keyboardManualScrollRef.current) {
        detailScrollYRef.current = restoreY;
        detailScrollRef.current?.scrollTo({
          y: restoreY,
          animated: false,
        });
      }
      keyboardRestoreScrollYRef.current = null;
      keyboardManualScrollRef.current = false;
      if (dropdownVisible && dropdownKey) {
        requestAnimationFrame(() => {
          measureDropdownLayout(dropdownKey, dropdownOptions.length);
          requestAnimationFrame(() => {
            measureDropdownLayout(dropdownKey, dropdownOptions.length);
          });
        });
      }
    };

    const showSubscription = Keyboard.addListener('keyboardDidShow', handleKeyboardShow);
    const hideSubscription = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [
    dropdownKey,
    dropdownOptions.length,
    dropdownVisible,
    keepDropdownAboveKeyboard,
    measureDropdownLayout,
  ]);

  const renderDropdownOverlay = useCallback(() => {
    if (!dropdownVisible || !dropdownKey || !dropdownLayout) return null;

    return (
      <View style={styles.dropdownOverlay} pointerEvents="auto">
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={closeDropdown}
          accessibilityRole="button"
          accessibilityLabel="Close options"
        />
        <View
          style={[
            styles.inlineDropdownMenu,
            {
              top: dropdownLayout.top,
              left: dropdownLayout.left,
              width: dropdownLayout.width,
            },
          ]}
        >
          <View style={styles.inlineDropdownSearchRow}>
            <Ionicons name="search-outline" size={14} color="#9A8D80" />
            <TextInput
              style={styles.inlineDropdownSearchInput}
              value={dropdownSearch}
              onChangeText={setDropdownSearch}
              placeholder="Search options"
              placeholderTextColor="#A79C91"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => keepDropdownAboveKeyboard(keyboardHeightRef.current)}
              returnKeyType="search"
            />
            {dropdownSearch ? (
              <TouchableOpacity
                style={styles.inlineDropdownClearBtn}
                onPress={() => setDropdownSearch('')}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={15} color="#A79C91" />
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView
            style={[styles.inlineDropdownScroll, { maxHeight: dropdownLayout.listMaxHeight }]}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={filteredDropdownOptions.length * DROPDOWN_OPTION_HEIGHT > dropdownLayout.listMaxHeight}
          >
            {filteredDropdownOptions.length ? filteredDropdownOptions.map((item, index) => {
              const active = item === dropdownSelected;
              const isLast = index === filteredDropdownOptions.length - 1;
              return (
                <TouchableOpacity
                  key={`inline-dd-${dropdownKey}-${item}`}
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
            }) : (
              <View style={styles.inlineDropdownEmptyRow}>
                <Text style={styles.inlineDropdownEmptyText}>No matching options</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    );
  }, [
    closeDropdown,
    dropdownKey,
    dropdownLayout,
    dropdownSearch,
    filteredDropdownOptions,
    dropdownOptions,
    dropdownSelected,
    dropdownVisible,
    handleDropdownSelect,
    keepDropdownAboveKeyboard,
  ]);

  const heroCaption = useMemo(
    () => String(activeDesign?.designName || activeDesign?.designNo || '').trim(),
    [activeDesign?.designName, activeDesign?.designNo],
  );
  const specRows = useMemo(
    () =>
      [
        { label: 'Design No.', value: compact(activeDesign?.designNo), wide: true },
        { label: 'QR Code No.', value: compact(activeDesign?.barcode) },
        { label: 'Metal', value: toMetalCaratageLabel(selectedMetalCaratage) },
        { label: 'Size', value: compact(selectedRingSize || activeDesign?.jewelrySize) },
        { label: 'Diamond Type', value: compact(activeDesign?.diamondType || selectedDiamondType) },
        { label: 'Stones', value: String(activeDesign?.stoneCount ?? 0) },
        {
          label: 'Approx. Total Carat Wt.',
          value: toCtwLabel(
            selectedWeight ||
              (activeDesign?.totalStoneWeight && activeDesign.totalStoneWeight > 0
                ? activeDesign.totalStoneWeight.toFixed(2)
                : activeDesign?.diamondWeight),
          ),
          highlight: true,
        },
        {
          label: 'Remarks',
          value: compact(activeDesign?.remarks),
          multiline: true,
        },
      ].filter((row) => hasDisplayValue(row.value)),
    [
      activeDesign?.barcode,
      activeDesign?.designNo,
      activeDesign?.diamondType,
      activeDesign?.diamondWeight,
      activeDesign?.jewelrySize,
      activeDesign?.remarks,
      activeDesign?.stoneCount,
      activeDesign?.totalStoneWeight,
      selectedDiamondType,
      selectedMetalCaratage,
      selectedRingSize,
      selectedWeight,
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

  const showStyleDropdown = styleOptions.length > 0;
  const showQualityDropdown = qualityOptions.length > 0;
  const hasPairedDropdowns = showStyleDropdown && showQualityDropdown;
  const hasConfiguratorOptions =
    metalCaratageOptions.length > 0 ||
    showStyleDropdown ||
    showQualityDropdown ||
    weightOptions.length > 0 ||
    ringSizeOptions.length > 0 ||
    diamondTypeOptions.length > 1;

  if (!activeDesign && !error) {
    const loadingContent = (
      <View style={{flex: 1}}>
        <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.stateScreen} edges={['top']}>
          <ActivityIndicator size="large" color="#8a6b55" />
          <Text style={styles.stateText}>Loading design...</Text>
        </SafeAreaView>
      </View>
    );
    if (isModal) {
      return (
        <Modal visible animationType="slide" onRequestClose={onClose}>
          {loadingContent}
        </Modal>
      );
    }
    return loadingContent;
  }

  if (!activeDesign) {
    const errorContent = (
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
    if (isModal) {
      return (
        <Modal visible animationType="slide" onRequestClose={onClose}>
          {errorContent}
        </Modal>
      );
    }
    return errorContent;
  }

  const screenContent = (
    <View style={styles.root}>
      <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView ref={screenRef} style={styles.screenShell} edges={['top']}>
        <View style={styles.fixedTopSection} onTouchStart={handleOutsideDropdownTouchStart}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleBackToDesigns} activeOpacity={0.88}>
              <Ionicons name="chevron-back" size={18} color="#7A6E61" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Ring Configurator</Text>
            <TouchableOpacity
              style={styles.headerBellBtn}
              onPress={handleOpenNotifications}
              activeOpacity={0.88}
            >
              <Ionicons name="notifications-outline" size={17} color="#7A6E61" />
              {notificationCount > 0 ? (
                <View style={styles.headerBellBadge}>
                  <Text style={styles.headerBellBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          <View style={[styles.fixedMediaCard, { height: mediaHeight + 70 }]}>
            <View style={[styles.fixedMediaImageShell, { height: mediaHeight }]} onLayout={handleMediaLayout}>
              {resolvingSelection ? (
                renderMediaSkeleton()
              ) : gallery.length ? (
                <FlatList
                  ref={mediaListRef}
                  data={gallery}
                  extraData={`${selectedImageIndex}-${failedMediaUrls.size}`}
                  horizontal
                  pagingEnabled
                  bounces={false}
                  scrollEventThrottle={16}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  showsHorizontalScrollIndicator={false}
                  initialScrollIndex={Math.min(selectedImageIndex, Math.max(0, gallery.length - 1))}
                  onMomentumScrollEnd={handleMediaSwipeEnd}
                  onScrollToIndexFailed={(info) => {
                    retryMediaScrollToIndex(info.index);
                  }}
                  getItemLayout={(_, index) => ({
                    length: mediaFrameWidth,
                    offset: mediaFrameWidth * index,
                    index,
                  })}
                  style={{ width: mediaFrameWidth }}
                  renderItem={({ item, index }) => {
                    const extension = getMediaExtension(item);
                    const canPreviewImage = imageMediaExtensions.has(extension) && !failedMediaUrls.has(item);
                    const canPreviewVideo = videoMediaExtensions.has(extension);

                    return (
                      <View style={[styles.mediaSlide, { width: mediaFrameWidth, height: mediaHeight }]}>
                        {canPreviewImage ? (
                          <TouchableOpacity
                            style={styles.fixedMediaImageTapArea}
                            activeOpacity={0.96}
                            onPress={() => handleMediaPress(item)}
                          >
                            <Image
                              source={{ uri: item, cache: 'force-cache' }}
                              style={styles.fixedMediaImage}
                              resizeMode="contain"
                              onError={() => markMediaFailed(item)}
                            />
                          </TouchableOpacity>
                        ) : canPreviewVideo ? (
                          <TouchableOpacity
                            style={styles.fixedMediaImageTapArea}
                            activeOpacity={0.92}
                            onPress={() => handleMediaPress(item)}
                          >
                            <MediaVideo
                              uri={item}
                              style={styles.mediaVideo}
                              autoPlay={index === selectedImageIndex}
                            />
                            <View style={styles.mediaVideoOverlay}>
                              <View style={styles.mediaVideoPlayBtn}>
                                <Ionicons name="play" size={22} color="#FFFFFF" />
                              </View>
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.mediaFileFallback}>
                            <View style={styles.mediaFileIconWrap}>
                              <Ionicons name={getMediaFileIcon(item)} size={42} color="#D4C4AE" />
                            </View>
                            <Text style={styles.mediaFileLabel} numberOfLines={1}>
                              {getMediaFileLabel(item)}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  }}
                />
              ) : (
                <View style={styles.placeholderHero}>
                  <Ionicons name="diamond-outline" size={42} color="#c5a890" />
                  <Text style={styles.placeholderText}>Image coming soon</Text>
                </View>
              )}
              {!resolvingSelection && gallery.length > 1 ? (
                <TouchableOpacity
                  style={[styles.mediaNavButton, styles.mediaNavButtonLeft, !hasPreviousMedia ? styles.mediaNavButtonDisabled : null]}
                  onPress={() => goToMediaIndex(selectedImageIndex - 1)}
                  activeOpacity={0.75}
                  disabled={!hasPreviousMedia}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="chevron-back" size={20} color={hasPreviousMedia ? '#2A241F' : '#9C948B'} />
                </TouchableOpacity>
              ) : null}
              {!resolvingSelection && gallery.length > 1 ? (
                <TouchableOpacity
                  style={[styles.mediaNavButton, styles.mediaNavButtonRight, !hasNextMedia ? styles.mediaNavButtonDisabled : null]}
                  onPress={() => goToMediaIndex(selectedImageIndex + 1)}
                  activeOpacity={0.75}
                  disabled={!hasNextMedia}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="chevron-forward" size={20} color={hasNextMedia ? '#2A241F' : '#9C948B'} />
                </TouchableOpacity>
              ) : null}
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
                      goToMediaIndex(index);
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

        <ScrollView
          ref={detailScrollRef}
          style={styles.detailScroll}
          contentContainerStyle={[styles.detailScrollContent, { paddingBottom: bottomInset + 82 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!dropdownVisible}
          onTouchStart={handleDetailTouchStart}
          onScroll={(event) => {
            detailScrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          onScrollBeginDrag={handleDetailScrollBegin}
          scrollEventThrottle={16}
        >
          {hasConfiguratorOptions ? (
          <View style={[styles.configPanel, dropdownVisible ? styles.configPanelDropdownOpen : null]}>
            <OptionSection
              title="METAL"
              options={metalCaratageOptions}
              selected={selectedMetalCaratage}
              onSelect={(value) => {
                resolveVersionSelection('metalCaratage', value);
              }}
              variant="metal"
            />

            {showStyleDropdown || showQualityDropdown ? (
            <View style={styles.dualRow}>
              {showStyleDropdown ? (
              <View
                ref={(node) => {
                  dropdownFieldRefs.current.style = node;
                }}
                style={[
                  styles.dropdownFieldWrap,
                  !hasPairedDropdowns ? styles.dropdownFieldWrapSingle : null,
                  dropdownVisible && dropdownKey === 'style' ? styles.dropdownFieldWrapActive : null,
                ]}
              >
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
              </View>
              ) : null}

              {showQualityDropdown ? (
              <View
                ref={(node) => {
                  dropdownFieldRefs.current.quality = node;
                }}
                style={[
                  styles.dropdownFieldWrap,
                  !hasPairedDropdowns ? styles.dropdownFieldWrapSingle : null,
                  dropdownVisible && dropdownKey === 'quality' ? styles.dropdownFieldWrapActive : null,
                ]}
              >
                <Text style={styles.sectionLabel}>DIA. QUALITY</Text>
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
              </View>
              ) : null}
            </View>
            ) : null}

            <OptionSection
              title="DIA. WEIGHT"
              options={weightOptions}
              selected={selectedWeight}
              onSelect={(value) => {
                resolveVersionSelection('weight', value);
              }}
            />

            {ringSizeOptions.length ? (
              <View
                style={[
                  styles.sectionBlock,
                  dropdownVisible && dropdownKey === 'ringSize' ? styles.dropdownSectionOpen : null,
                ]}
              >
                <Text style={styles.sectionLabel}>JEWELRY SIZE</Text>
                <View
                  ref={(node) => {
                    dropdownFieldRefs.current.ringSize = node;
                  }}
                  style={[styles.singleDropdownWrap, dropdownVisible && dropdownKey === 'ringSize' ? styles.dropdownFieldWrapActive : null]}
                >
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
                </View>
              </View>
            ) : null}
          </View>
          ) : null}

          {resolvingSelection || specRows.length ? (
          <View style={styles.specCard}>
            <Text style={styles.specTitle}>PRODUCT SPECIFICATIONS</Text>
            {resolvingSelection
              ? renderSpecSkeleton()
              : specRows.map((row, index) => (
                  <View
                    key={`spec-${row.label}`}
                    style={[
                      styles.specRow,
                      row.wide ? styles.specRowWide : null,
                      index === specRows.length - 1 ? styles.specRowLast : null,
                    ]}
                  >
                    <Text style={[styles.specLabel, row.wide ? styles.specLabelWide : null]}>{row.label}</Text>
                    <Text
                      style={[
                        styles.specValue,
                        row.wide ? styles.specValueWide : null,
                        row.highlight ? styles.specValueHighlight : null,
                        row.multiline ? styles.specValueMultiline : null,
                      ]}
                      numberOfLines={row.wide || row.multiline ? undefined : 1}
                    >
                      {row.value}
                    </Text>
                  </View>
                ))}
          </View>
          ) : null}

          {/* <GemstoneGrid gemstones={activeDesign.gemstones || []} /> */}
        </ScrollView>

        <View
          style={[styles.bottomSummary, { paddingBottom: bottomInset + 12 }]}
          onTouchStart={handleOutsideDropdownTouchStart}
        >
          <View style={styles.bottomTopRow}>
            <View style={styles.retailBlock}>
              <Text style={styles.retailLabel}>RETAIL PRICE</Text>
              {resolvingSelection ? (
                <View style={[styles.skeletonLine, styles.priceSkeleton]} />
              ) : (
                <Text style={styles.retailValue}>{formatDetailPrice(displayPrice)}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.processActionBtn} onPress={handleProcessOrder} activeOpacity={0.9}>
              <Text style={styles.processActionText}>Process Order</Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        {renderDropdownOverlay()}
        <NotificationPopover
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
          onOpenNotification={handleOpenNotificationEntry}
        />
        <Modal visible={Boolean(imageViewerUri)} transparent animationType="fade" onRequestClose={closeImageViewer}>
          <GestureHandlerRootView style={styles.imageViewerRoot}>
            <View style={styles.imageViewerOverlay}>
            <SafeAreaView style={styles.imageViewerSafe} edges={['top', 'bottom']}>
              <View style={styles.imageViewerHeader}>
                <TouchableOpacity
                  style={styles.imageViewerIconBtn}
                  onPress={closeImageViewer}
                  activeOpacity={0.85}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.imageViewerTitle} numberOfLines={1}>
                  {activeDesign?.designNo || activeDesign?.designName || 'Design Image'}
                </Text>
                <View style={styles.imageViewerHeaderSpacer} />
              </View>

              <View style={styles.imageViewerGestureArea}>
                {imageViewerUri && isVideoMedia(imageViewerUri) ? (
                  <MediaVideo
                    uri={imageViewerUri}
                    nativeControls
                    autoPlay
                    style={[
                      styles.imageViewerVideo,
                      {
                        width,
                        height: windowHeight * 0.78,
                      },
                    ]}
                  />
                ) : imageViewerUri ? (
                  <PinchGestureHandler
                    ref={pinchRef}
                    simultaneousHandlers={panRef}
                    shouldCancelWhenOutside={false}
                    onGestureEvent={handlePinchGestureEvent}
                    onHandlerStateChange={handlePinchStateChange}
                  >
                    <Animated.View style={styles.imageViewerGestureArea}>
                      <PanGestureHandler
                        ref={panRef}
                        simultaneousHandlers={pinchRef}
                        enabled={imageViewerZoomed}
                        shouldCancelWhenOutside={false}
                        onGestureEvent={handlePanGestureEvent}
                        onHandlerStateChange={handlePanStateChange}
                      >
                        <Animated.View style={styles.imageViewerGestureArea}>
                          <TouchableOpacity
                            activeOpacity={1}
                            style={styles.imageViewerGestureArea}
                            onPress={handleImageViewerTap}
                          >
                          <Animated.Image
                            source={{ uri: imageViewerUri, cache: 'force-cache' }}
                            style={[
                              styles.imageViewerImage,
                              {
                                width,
                                height: windowHeight * 0.78,
                                transform: [
                                  { translateX: panXRef.current },
                                  { translateY: panYRef.current },
                                  { scale: imageViewerScale },
                                ],
                              },
                            ]}
                            resizeMode="contain"
                          />
                          </TouchableOpacity>
                        </Animated.View>
                      </PanGestureHandler>
                    </Animated.View>
                  </PinchGestureHandler>
                ) : null}
              </View>
            </SafeAreaView>
            </View>
          </GestureHandlerRootView>
        </Modal>
      </SafeAreaView>
    </View>
  );

  if (isModal) {
    return (
      <Modal visible animationType="slide" onRequestClose={onClose}>
        {screenContent}
      </Modal>
    );
  }
  return screenContent;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screenShell: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  dropdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
    elevation: 40,
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
    fontSize: 20,
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
    fontSize: 11,
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
    overflow: 'hidden',
  },
  fixedMediaImage: {
    width: '100%',
    height: '100%',
  },
  fixedMediaImageTapArea: {
    width: '100%',
    height: '100%',
  },
  mediaVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F0EE',
  },
  mediaVideoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as any,
  },
  mediaVideoPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 26, 23, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
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
  mediaFileFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  mediaFileIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 16,
    backgroundColor: '#FCFAF6',
    borderWidth: 1,
    borderColor: '#EFE7DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaFileLabel: {
    marginTop: 9,
    maxWidth: '86%',
    color: '#B4A692',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  mediaNavButton: {
    position: 'absolute',
    top: '50%',
    width: 38,
    height: 38,
    borderRadius: 19,
    marginTop: -19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: '#E8DFD3',
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  mediaNavButtonDisabled: {
    opacity: 0.48,
  },
  mediaNavButtonLeft: {
    left: 8,
  },
  mediaNavButtonRight: {
    right: 8,
  },
  mediaCaption: {
    marginTop: 6,
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#7B7369',
  },
  imagePagerTextActive: {
    color: '#FFFFFF',
  },
  imageViewerRoot: {
    flex: 1,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
  },
  imageViewerSafe: {
    flex: 1,
  },
  imageViewerHeader: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
    elevation: 20,
  },
  imageViewerTitle: {
    flex: 1,
    marginHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  imageViewerHeaderSpacer: {
    width: 44,
    height: 44,
  },
  imageViewerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 18, 18, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
  },
  imageViewerGestureArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  imageViewerImage: {
    alignSelf: 'center',
  },
  imageViewerVideo: {
    alignSelf: 'center',
    backgroundColor: '#000000',
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
    zIndex: 20,
    elevation: 2,
  },
  configPanelDropdownOpen: {
    zIndex: 900,
    elevation: 18,
  },
  sectionBlock: {
    marginTop: 7,
  },
  dropdownSectionOpen: {
    zIndex: 880,
    elevation: 18,
  },
  sectionLabel: {
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 13,
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
  dropdownFieldWrapSingle: {
    width: '100%',
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
    fontSize: 14,
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
    fontSize: 11,
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
    fontSize: 14,
    color: '#2C2620',
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  inlineDropdownMenu: {
    position: 'absolute',
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
  inlineDropdownSearchRow: {
    height: DROPDOWN_SEARCH_HEIGHT,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE5DA',
    backgroundColor: '#FBFAF8',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineDropdownSearchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 8,
    paddingVertical: 0,
    fontSize: 14,
    color: '#2C2620',
    fontWeight: '600',
  },
  inlineDropdownClearBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 14,
    color: '#38312A',
    fontWeight: '600',
    textAlign: 'right',
  },
  inlineDropdownOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inlineDropdownEmptyRow: {
    minHeight: 40,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  inlineDropdownEmptyText: {
    width: '100%',
    fontSize: 14,
    color: '#8F8378',
    fontWeight: '600',
    textAlign: 'right',
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
    fontSize: 12,
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
  specRowWide: {
    minHeight: 48,
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingVertical: 7,
  },
  specLabel: {
    flex: 0.9,
    fontSize: 13,
    color: '#6D665D',
  },
  specLabelWide: {
    flex: 0,
  },
  specValue: {
    flex: 1.15,
    marginLeft: 10,
    fontSize: 13,
    color: '#2A241F',
    fontWeight: '700',
    textAlign: 'right',
  },
  specValueHighlight: {
    color: '#B2874A',
  },
  specValueWide: {
    flex: 0,
    marginLeft: 0,
    marginTop: 3,
    lineHeight: 17,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  specValueMultiline: {
    lineHeight: 16,
  },
  gemstoneCard: {
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
  gemstoneTable: {
    minWidth: 720,
  },
  gemstoneTableRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DDD2',
  },
  gemstoneHeaderRow: {
    minHeight: 32,
    backgroundColor: '#F1ECE4',
  },
  gemstoneTableRowLast: {
    borderBottomWidth: 0,
  },
  gemstoneHeaderCell: {
    paddingHorizontal: 8,
    fontSize: 12,
    letterSpacing: 0.7,
    color: '#7E6F5C',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  gemstoneCell: {
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#2A241F',
    fontWeight: '700',
  },
  gemstoneStoneCell: {
    width: 96,
  },
  gemstoneTextCell: {
    width: 88,
  },
  gemstoneNumberCell: {
    width: 82,
    textAlign: 'right',
  },
  gemstoneSmallNumberCell: {
    width: 54,
    textAlign: 'right',
  },
  gemstoneEmptyRow: {
    minHeight: 42,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  gemstoneEmptyText: {
    fontSize: 14,
    color: '#8F8378',
    fontWeight: '600',
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
    paddingTop: 9,
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
    alignItems: 'center',
  },
  retailBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
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
  processActionBtn: {
    width: 174,
    maxWidth: '52%',
    height: 40,
    borderRadius: 12,
    backgroundColor: '#BE9851',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
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
    fontSize: 15,
    color: '#8a786a',
  },
  emptyOption: {
    fontSize: 14,
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
    fontSize: 22,
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
    fontSize: 16,
    fontWeight: '700',
  },
});

export default DesignDetailScreen;

