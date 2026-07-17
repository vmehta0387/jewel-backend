import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { createOrder, updateOrder } from '../api/orders';
import {
  fetchMobileDesignConfigurator,
  resolveMobileDesignConfigurator,
  type MobileConfiguratorResponse,
  type MobileConfiguratorResolveQuery,
} from '../api/designs';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationPopover from '../components/NotificationPopover';
import type { Design, Order } from '../types';
import type { DesignsStackParamList } from '../navigation/RootNavigator';
import type { NotificationFeedEntry } from '../utils/appNotifications';

type QuoteRoute = RouteProp<DesignsStackParamList, 'QuoteBuilder'>;
type QuoteNav = NativeStackNavigationProp<DesignsStackParamList>;

type VersionFilters = {
  shape: string;
  style: string;
  metalColor: string;
  weight: string;
  quality: string;
  ringSize: string;
};

type FilterKey = keyof VersionFilters;
type VersionOptionGroups = Record<FilterKey, string[]>;
type CustomerFieldErrors = Partial<Record<'name' | 'phone' | 'email', string>>;
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
const FOOTER_SCROLL_CLEARANCE = Platform.OS === 'ios' ? 86 : 76;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatQuoteDate = (value?: string | Date | null) => {
  if (!value) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const compact = (value?: string | number | null) => String(value ?? '').trim();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const THEME_ACTION_COLOR = '#BE9851';

const uniqueValues = (values: Array<string | number | null | undefined>) =>
  Array.from(new Set(values.map(compact).filter(Boolean)));

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

const buildSelectionSummaryPlain = (selection: VersionFilters) =>
  [toMetalShortCode(selection.metalColor), selection.style, selection.quality, toCtwLabel(selection.weight), selection.ringSize]
    .filter(Boolean)
    .join(' - ');

const getVersionAttributes = (design: Design) => ({
  shapes: uniqueValues(design.gemstones?.map((gem) => gem.shape) || []),
  styles: uniqueValues([design.diamondSpread]),
  metalColors: uniqueValues([...(design.metals?.map((metal) => metal.metalCaratage || metal.goldColour) || []), design.goldColour]),
  weights: uniqueValues([design.diamondWeight]),
  qualities: uniqueValues([design.diamondQuality]),
  ringSizes: uniqueValues([design.jewelrySize]),
});

const getFilterValuesFromDesign = (design: Design): VersionFilters => {
  const attrs = getVersionAttributes(design);
  return {
    shape: attrs.shapes[0] || '',
    style: attrs.styles[0] || '',
    metalColor: attrs.metalColors[0] || '',
    weight: attrs.weights[0] || '',
    quality: attrs.qualities[0] || '',
    ringSize: attrs.ringSizes[0] || '',
  };
};

const emptyOptionGroups = (): VersionOptionGroups => ({
  shape: [],
  style: [],
  metalColor: [],
  weight: [],
  quality: [],
  ringSize: [],
});

const filtersFromConfigurator = (response: MobileConfiguratorResponse): VersionFilters => ({
  shape: response.selectedOptions?.shape || response.optionGroups.shape?.[0] || '',
  style: response.selectedOptions?.style || response.optionGroups.style?.[0] || '',
  metalColor: response.selectedOptions?.metalCaratage || response.optionGroups.metalCaratage?.[0] || '',
  weight: response.selectedOptions?.weight || response.optionGroups.weight?.[0] || '',
  quality: response.selectedOptions?.quality || response.optionGroups.quality?.[0] || '',
  ringSize: response.selectedOptions?.ringSize || response.optionGroups.ringSize?.[0] || '',
});

const optionGroupsFromConfigurator = (
  response: MobileConfiguratorResponse,
  selected: VersionFilters,
): VersionOptionGroups => ({
  shape: uniqueValues([...(response.optionGroups.shape || []), selected.shape]),
  style: uniqueValues([...(response.optionGroups.style || []), selected.style]),
  metalColor: uniqueValues([...(response.optionGroups.metalCaratage || []), selected.metalColor]),
  weight: uniqueValues([...(response.optionGroups.weight || []), selected.weight]),
  quality: uniqueValues([...(response.optionGroups.quality || []), selected.quality]),
  ringSize: uniqueValues([...(response.optionGroups.ringSize || []), selected.ringSize]),
});

const configuratorQueryFromFilters = (
  filters: VersionFilters,
  selectedKey?: FilterKey,
): MobileConfiguratorResolveQuery => ({
  shape: filters.shape,
  style: filters.style,
  metalCaratage: filters.metalColor,
  weight: filters.weight,
  quality: filters.quality,
  ringSize: filters.ringSize,
  selectedKey: selectedKey === 'metalColor' ? 'metalCaratage' : selectedKey,
});

const QuoteBuilderScreen = () => {
  const route = useRoute<QuoteRoute>();
  const navigation = useNavigation<QuoteNav>();
  const { token, user } = useAuth();
  const { unreadCount: notificationCount } = useNotifications();
  const { draft } = route.params;
  const { width, height: windowHeight } = useWindowDimensions();
  const companyId = user?.companyId || '';
  const branchId = user?.branchId || '';
  const initializedDraftKeyRef = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const customerCardRef = useRef<View | null>(null);
  const activeCustomerFieldRef = useRef<keyof CustomerFieldErrors | null>(null);
  const customerFieldRefs = useRef<Record<keyof CustomerFieldErrors, View | null>>({
    name: null,
    phone: null,
    email: null,
  });
  const screenRef = useRef<View | null>(null);
  const scrollYRef = useRef(0);
  const dropdownFieldRefs = useRef<Record<FilterKey, View | null>>({
    shape: null,
    style: null,
    metalColor: null,
    weight: null,
    quality: null,
    ringSize: null,
  });

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [approvalConfirmVisible, setApprovalConfirmVisible] = useState(false);

  const [familyDesigns, setFamilyDesigns] = useState<Design[]>([]);
  const [activeDesignId, setActiveDesignId] = useState<string | null>(null);
  const [optionGroups, setOptionGroups] = useState<VersionOptionGroups>(() => emptyOptionGroups());
  const [priceByDesignId, setPriceByDesignId] = useState<Record<string, number>>({});

  const [shape, setShape] = useState(draft.selection?.shape || '');
  const [metalColor, setMetalColor] = useState(draft.selection?.metalColor || '');
  const [style, setStyle] = useState(draft.selection?.style || '');
  const [weight, setWeight] = useState(draft.selection?.weight || '');
  const [quality, setQuality] = useState(draft.selection?.quality || '');
  const [ringSize, setRingSize] = useState(draft.selection?.ringSize || '');

  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState(draft.purchaseOrderNumber || '');
  const [customerName, setCustomerName] = useState(draft.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(draft.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState(draft.customerEmail || '');
  const [customerErrors, setCustomerErrors] = useState<CustomerFieldErrors>({});
  const [notes, setNotes] = useState(draft.notes || '');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(draft.orderId || null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [dropdownSelected, setDropdownSelected] = useState('');
  const [dropdownKey, setDropdownKey] = useState<FilterKey | null>(null);
  const [dropdownLayout, setDropdownLayout] = useState<DropdownLayout | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');

  useEffect(() => {
    const draftKey = draft.orderId || draft.designId;
    if (initializedDraftKeyRef.current === draftKey) return;
    initializedDraftKeyRef.current = draftKey;

    setPurchaseOrderNumber(draft.purchaseOrderNumber || '');
    setCustomerName(draft.customerName || '');
    setCustomerPhone(draft.customerPhone || '');
    setCustomerEmail(draft.customerEmail || '');
    setCustomerErrors({});
    setNotes(draft.notes || '');
    setEditingOrderId(draft.orderId || null);
  }, [
    draft.orderId,
    draft.purchaseOrderNumber,
    draft.customerName,
    draft.customerPhone,
    draft.customerEmail,
    draft.notes,
  ]);

  const focusCustomerField = useCallback((field: keyof CustomerFieldErrors) => {
    activeCustomerFieldRef.current = field;
    const scrollToField = () => {
      const fieldNode = customerFieldRefs.current[field];
      if (!fieldNode) return;

      fieldNode.measureLayout(
        scrollRef.current as any,
        (_x, y) => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, y - 14),
            animated: true,
          });
        },
        () => {
          customerCardRef.current?.measureLayout(
            scrollRef.current as any,
            (_x, y) => {
              scrollRef.current?.scrollTo({
                y: Math.max(0, y - 12),
                animated: true,
              });
            },
            () => scrollRef.current?.scrollToEnd({ animated: true }),
          );
        },
      );
    };

    window.setTimeout(scrollToField, 80);
    window.setTimeout(scrollToField, 220);
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
      const activeField = activeCustomerFieldRef.current;
      if (activeField) {
        window.setTimeout(() => focusCustomerField(activeField), 80);
      }
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [focusCustomerField]);

  const applyActiveDesignSelection = useCallback((design: Design, selectedOptions?: Partial<VersionFilters>) => {
    const next = { ...getFilterValuesFromDesign(design), ...(selectedOptions || {}) };
    setActiveDesignId(design.id);
    setShape(next.shape || '');
    setStyle(next.style || '');
    setMetalColor(next.metalColor || '');
    setWeight(next.weight || '');
    setQuality(next.quality || '');
    setRingSize(next.ringSize || '');
  }, []);

  const applyConfiguratorResponse = useCallback((response: MobileConfiguratorResponse) => {
    const selected = filtersFromConfigurator(response);
    const design = response.selectedDesign;
    setFamilyDesigns([design]);
    setOptionGroups(optionGroupsFromConfigurator(response, selected));
    setPriceByDesignId({
      [design.id]: Number(design.displayPrice ?? design.totalValue ?? draft.unitPrice ?? 0),
    });
    applyActiveDesignSelection(design, selected);
  }, [applyActiveDesignSelection, draft.unitPrice]);

  useEffect(() => {
    if (!token) return;
    let active = true;

    const loadConfigurator = async () => {
      setLoadingFamily(true);
      try {
        if (!active) return;
        const response = draft.configurator || await fetchMobileDesignConfigurator(token, draft.designId);
        if (active) applyConfiguratorResponse(response);
      } catch {
        if (active) {
          setFamilyDesigns([]);
          setActiveDesignId(null);
          setOptionGroups(emptyOptionGroups());
        }
      } finally {
        if (active) setLoadingFamily(false);
      }
    };

    loadConfigurator();
    return () => {
      active = false;
    };
  }, [token, draft.designId, draft.configurator, applyConfiguratorResponse]);

  const activeDesign = useMemo(() => {
    if (!familyDesigns.length) return null;
    return familyDesigns.find((row) => row.id === activeDesignId) || familyDesigns[0];
  }, [familyDesigns, activeDesignId]);

  const activeImage = useMemo(() => {
    const imageFromFamily = activeDesign?.imageUrls?.find(Boolean);
    return imageFromFamily || draft.imageUrl || null;
  }, [activeDesign?.imageUrls, draft.imageUrl]);

  const displayPrice = useMemo(() => {
    if (activeDesign) return priceByDesignId[activeDesign.id] ?? activeDesign.totalValue ?? draft.unitPrice ?? 0;
    return Number(draft.unitPrice || 0);
  }, [activeDesign, priceByDesignId, draft.unitPrice]);

  const shapeOptions = useMemo(() => {
    const values = optionGroups.shape;
    return values.length ? values : uniqueValues([shape]);
  }, [optionGroups.shape, shape]);
  const styleOptions = useMemo(() => {
    const values = optionGroups.style;
    return values.length ? values : uniqueValues([style]);
  }, [optionGroups.style, style]);
  const metalColorOptions = useMemo(() => {
    const values = optionGroups.metalColor;
    return values.length ? values : uniqueValues([metalColor]);
  }, [optionGroups.metalColor, metalColor]);
  const weightOptions = useMemo(() => {
    const values = optionGroups.weight;
    return values.length ? values : uniqueValues([weight]);
  }, [optionGroups.weight, weight]);
  const qualityOptions = useMemo(() => {
    const values = optionGroups.quality;
    return values.length ? values : uniqueValues([quality]);
  }, [optionGroups.quality, quality]);
  const ringSizeOptions = useMemo(() => {
    const values = optionGroups.ringSize;
    return values.length ? values : uniqueValues([ringSize]);
  }, [optionGroups.ringSize, ringSize]);

  const selection = useMemo<VersionFilters>(
    () => ({
      shape,
      style,
      metalColor,
      weight,
      quality,
      ringSize,
    }),
    [shape, style, metalColor, weight, quality, ringSize],
  );

  const selectionSummary = useMemo(() => buildSelectionSummaryPlain(selection), [selection]);

  const setSelectionField = useCallback((key: FilterKey, value: string) => {
    switch (key) {
      case 'shape':
        setShape(value);
        break;
      case 'style':
        setStyle(value);
        break;
      case 'metalColor':
        setMetalColor(value);
        break;
      case 'weight':
        setWeight(value);
        break;
      case 'quality':
        setQuality(value);
        break;
      case 'ringSize':
        setRingSize(value);
        break;
      default:
        break;
    }
  }, []);

  const resolveVersionSelection = useCallback(
    async (selectedKey: FilterKey, selectedValue: string) => {
      if (!token) {
        setSelectionField(selectedKey, selectedValue);
        return;
      }
      const nextSelection: VersionFilters = { ...selection, [selectedKey]: selectedValue };
      setSelectionField(selectedKey, selectedValue);
      setLoadingFamily(true);
      try {
        const response = await resolveMobileDesignConfigurator(
          token,
          draft.designId,
          configuratorQueryFromFilters(nextSelection, selectedKey),
        );
        applyConfiguratorResponse(response);
      } catch {
        setSelectionField(selectedKey, selectedValue);
      } finally {
        setLoadingFamily(false);
      }
    },
    [token, selection, setSelectionField, draft.designId, applyConfiguratorResponse],
  );

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
          const visibleBottom = windowHeight - keyboardHeight - DROPDOWN_EDGE_PADDING;
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
    [keyboardHeight, width, windowHeight],
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
    [closeDropdown, dropdownVisible, dropdownKey, measureDropdownLayout],
  );

  const handleDropdownSelect = useCallback(
    (value: string) => {
      if (!dropdownKey) return;
      void resolveVersionSelection(dropdownKey, value);
      closeDropdown();
    },
    [closeDropdown, dropdownKey, resolveVersionSelection],
  );

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

  useEffect(() => {
    if (!dropdownVisible || !dropdownKey) return;
    requestAnimationFrame(() => {
      measureDropdownLayout(dropdownKey, dropdownOptions.length);
    });
  }, [dropdownKey, dropdownOptions.length, dropdownVisible, keyboardHeight, measureDropdownLayout]);

  const renderDropdownOverlay = useCallback(() => {
    if (!dropdownVisible || !dropdownKey || !dropdownLayout) return null;

    return (
      <View style={styles.dropdownOverlay} pointerEvents="box-none">
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
                  key={`qb-dd-${dropdownKey}-${item}`}
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
    dropdownKey,
    dropdownLayout,
    dropdownSearch,
    dropdownSelected,
    dropdownVisible,
    filteredDropdownOptions,
    handleDropdownSelect,
  ]);

  const currentOrderStatus = String(order?.status || draft.status || '').toUpperCase();
  const isApprovedOrderLocked = currentOrderStatus === 'APPROVED' && user?.role !== 'BRANCH_MANAGER';
  const canPersist = Boolean(token && companyId && branchId && !saving && !sending && !isApprovedOrderLocked);

  const clearCustomerError = useCallback((field: keyof CustomerFieldErrors) => {
    setCustomerErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setError(null);
  }, []);

  const validateCustomerDetails = useCallback(() => {
    const nextErrors: CustomerFieldErrors = {};
    const phone = customerPhone.trim();
    const email = customerEmail.trim();
    const phoneDigits = phone.replace(/\D/g, '');

    if (phone && (phoneDigits.length < 7 || phoneDigits.length > 15)) nextErrors.phone = 'Enter a valid phone number.';
    if (email && !emailPattern.test(email)) nextErrors.email = 'Enter a valid email address.';

    setCustomerErrors(nextErrors);
    const firstError = nextErrors.name || nextErrors.phone || nextErrors.email;
    if (firstError) {
      setError(firstError);
      return false;
    }

    return true;
  }, [customerEmail, customerName, customerPhone]);

  const persistOrder = useCallback(
    async (nextStatus: 'QUOTE' | 'PENDING_APPROVAL') => {
      if (!token || !companyId || !branchId) return null;
      if (isApprovedOrderLocked) {
        setError('Only branch managers can edit approved orders.');
        return null;
      }
      const payload = {
        designId: activeDesign?.id || draft.designId,
        shortDescription: selectionSummary || undefined,
        purchaseOrderNumber: purchaseOrderNumber.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        status: nextStatus,
      };

      const targetOrderId = order?.id || editingOrderId;
      if (targetOrderId) {
        let updated = await updateOrder(token, targetOrderId, payload);
        if (String(updated.status || '').toUpperCase() !== nextStatus) {
          updated = await updateOrder(token, targetOrderId, { status: nextStatus });
        }
        setOrder(updated);
        setEditingOrderId(updated.id);
        return updated;
      }

      let created = await createOrder(token, {
        companyId,
        branchId,
        designId: payload.designId,
        quantity: 1,
        price: Number(displayPrice || draft.unitPrice || 0),
        shortDescription: payload.shortDescription,
        purchaseOrderNumber: payload.purchaseOrderNumber,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        customerEmail: payload.customerEmail,
        notes: payload.notes,
        status: payload.status,
      });
      if (String(created.status || '').toUpperCase() !== nextStatus) {
        created = await updateOrder(token, created.id, { status: nextStatus });
      }
      setOrder(created);
      setEditingOrderId(created.id);
      return created;
    },
    [
      token,
      companyId,
      branchId,
      order?.id,
      editingOrderId,
      activeDesign?.id,
      draft.designId,
      displayPrice,
      draft.unitPrice,
      selectionSummary,
      purchaseOrderNumber,
      customerName,
      customerPhone,
      customerEmail,
      notes,
      isApprovedOrderLocked,
    ],
  );

  const handleSave = useCallback(async () => {
    if (!canPersist) return;
    if (!validateCustomerDetails()) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await persistOrder('QUOTE');
      if (!saved) return;
      (navigation as any).navigate('OrdersTab', {
        screen: 'OrderDetail',
        params: { orderId: saved.id },
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to save quote.');
    } finally {
      setSaving(false);
    }
  }, [canPersist, navigation, persistOrder, validateCustomerDetails]);

  const handleSendForApproval = useCallback(async () => {
    if (!canPersist) return;
    if (!validateCustomerDetails()) return;
    closeDropdown();
    setApprovalConfirmVisible(true);
  }, [canPersist, closeDropdown, validateCustomerDetails]);

  const handleConfirmSendForApproval = useCallback(async () => {
    setApprovalConfirmVisible(false);
    setSending(true);
    setError(null);
    try {
      const updated = await persistOrder('PENDING_APPROVAL');
      if (!updated) return;
      (navigation as any).navigate('OrdersTab', {
        screen: 'OrderDetail',
        params: { orderId: updated.id },
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to send quote for approval.');
    } finally {
      setSending(false);
    }
  }, [navigation, persistOrder]);

  const headerDate = formatQuoteDate(order?.createdAt || draft.createdAt);
  const preparedFor = customerName.trim() || '-';
  const quoteNo = order?.orderNumber || draft.orderNumber || '...';
  const itemMetaLine = [toMetalShortCode(metalColor), style, quality].filter(Boolean).join(' - ');
  const itemMetaLine2 = [`Size ${ringSize || '-'}`, toCtwLabel(weight)].filter(Boolean).join(' - ');

  const renderDropdownField = (
    label: string,
    fieldKey: FilterKey,
    value: string,
    options: string[],
  ) => (
    <View
      ref={(node) => {
        dropdownFieldRefs.current[fieldKey] = node;
      }}
      style={[styles.dropdownFieldWrap, dropdownVisible && dropdownKey === fieldKey ? styles.dropdownFieldWrapActive : null]}
    >
      <Text style={styles.specLabel}>{label}</Text>
      <TouchableOpacity style={styles.dropdownFieldCard} activeOpacity={0.9} onPress={() => openDropdown(fieldKey, options, value)}>
        <View style={styles.dropdownValueRow}>
          <Text style={styles.dropdownValueText} numberOfLines={1}>
            {value || '-'}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#7D746A" />
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView ref={screenRef} style={styles.screen} edges={['top']}>
      <View style={styles.headerRow} onTouchStart={closeDropdown}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
          <Ionicons name="chevron-back" size={17} color="#7A6E61" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quote Builder</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBellBtn}
            onPress={handleOpenNotifications}
            activeOpacity={0.88}
          >
            <Ionicons name="notifications-outline" size={16} color="#7A6E61" />
            {notificationCount > 0 ? (
              <View style={styles.headerBellBadge}>
                <Text style={styles.headerBellBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.proposalStrip}>
        <View style={styles.proposalLeft}>
          <Text style={styles.quoteNoText}>QUOTE #{quoteNo}</Text>
          <Text style={styles.proposalTitle} numberOfLines={1}>
            Jewelry Proposal
          </Text>
          <Text style={styles.proposalSub}>A luxury selection, crafted for you</Text>
        </View>
        <View style={styles.proposalRight}>
          <Text style={styles.preparedLabel}>PREPARED FOR</Text>
          <Text style={styles.preparedName} numberOfLines={1}>
            {preparedFor}
          </Text>
          <Text style={styles.preparedDate}>{headerDate}</Text>
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onTouchStart={closeDropdown}
        onScroll={(event) => {
          scrollYRef.current = event.nativeEvent.contentOffset.y;
        }}
        onScrollBeginDrag={closeDropdown}
        scrollEventThrottle={16}
      >
        <View style={styles.editorShell}>
          <View style={styles.purchaseSection}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.blockLabel}>PURCHASE ORDER #</Text>
              <View style={styles.requiredPill}>
                <Text style={styles.requiredPillText}>REQUIRED</Text>
              </View>
            </View>
            <TextInput
              value={purchaseOrderNumber}
              onChangeText={setPurchaseOrderNumber}
              placeholder="PO-2024-LJ-0092"
              placeholderTextColor="#A69582"
              style={styles.poInput}
            />
          </View>

          <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemHeading}>ITEM 1</Text>
              {loadingFamily ? <ActivityIndicator size="small" color="#B58A45" /> : <Text style={styles.modifyText}>Modify</Text>}
            </View>

            <View style={styles.itemTopRow}>
              {activeImage ? (
                <Image source={{ uri: activeImage, cache: 'force-cache' }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <Ionicons name="diamond-outline" size={17} color="#B2874A" />
                </View>
              )}
              <View style={styles.itemTopText}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {activeDesign?.designName || draft.designName || activeDesign?.designNo || draft.designNo}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {itemMetaLine || '-'}
                </Text>
                <Text style={styles.itemMetaSub} numberOfLines={1}>
                  {itemMetaLine2 || '-'}
                </Text>
              </View>
              <Text style={styles.itemPrice}>{formatCurrency(displayPrice)}</Text>
            </View>

            <View style={styles.dropdownGrid}>
              {renderDropdownField('SHAPE', 'shape', shape, shapeOptions)}
              {renderDropdownField('METAL', 'metalColor', metalColor, metalColorOptions)}
              {renderDropdownField('COVERAGE', 'style', style, styleOptions)}
              {renderDropdownField('DIA. WEIGHT', 'weight', weight, weightOptions)}
              {renderDropdownField('DIA. QUALITY', 'quality', quality, qualityOptions)}
              {renderDropdownField('JEWELRY SIZE', 'ringSize', ringSize, ringSizeOptions)}
            </View>

            <View style={styles.notesWrap}>
              <Text style={styles.specLabel}>NOTES / SPECIAL INSTRUCTIONS</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                style={styles.notesInput}
                placeholder="Rush delivery by Nov 15 - Possible engraving TBD"
                placeholderTextColor="#94897C"
              />
            </View>
          </View>
        </View>

        <View
          ref={customerCardRef}
          style={styles.customerCard}
        >
          <Text style={styles.blockLabel}>CUSTOMER INFO</Text>
          <View
            ref={(node) => {
              customerFieldRefs.current.name = node;
            }}
            style={styles.customerInputWrap}
          >
            <TextInput
              value={customerName}
              onChangeText={(value) => {
                setCustomerName(value);
                clearCustomerError('name');
              }}
              placeholder="Customer name"
              placeholderTextColor="#A29587"
              style={[
                styles.customerInput,
                customerErrors.name ? styles.customerInputError : null,
                customerErrors.name ? styles.customerInputWithIcon : null,
              ]}
              onFocus={() => focusCustomerField('name')}
            />
            {customerErrors.name ? (
              <Ionicons style={styles.customerErrorIcon} name="alert-circle" size={17} color="#B54040" />
            ) : null}
          </View>
          <View
            ref={(node) => {
              customerFieldRefs.current.phone = node;
            }}
            style={styles.customerInputWrap}
          >
            <TextInput
              value={customerPhone}
              onChangeText={(value) => {
                setCustomerPhone(value);
                clearCustomerError('phone');
              }}
              placeholder="+1 (212) 555-0198"
              placeholderTextColor="#A29587"
              keyboardType="phone-pad"
              style={[
                styles.customerInput,
                customerErrors.phone ? styles.customerInputError : null,
                customerErrors.phone ? styles.customerInputWithIcon : null,
              ]}
              onFocus={() => focusCustomerField('phone')}
            />
            {customerErrors.phone ? (
              <Ionicons style={styles.customerErrorIcon} name="alert-circle" size={17} color="#B54040" />
            ) : null}
          </View>
          <View
            ref={(node) => {
              customerFieldRefs.current.email = node;
            }}
            style={styles.customerInputWrap}
          >
            <TextInput
              value={customerEmail}
              onChangeText={(value) => {
                setCustomerEmail(value);
                clearCustomerError('email');
              }}
              placeholder="customer@email.com"
              placeholderTextColor="#A29587"
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.customerInput,
                customerErrors.email ? styles.customerInputError : null,
                customerErrors.email ? styles.customerInputWithIcon : null,
              ]}
              onFocus={() => focusCustomerField('email')}
            />
            {customerErrors.email ? (
              <Ionicons style={styles.customerErrorIcon} name="alert-circle" size={17} color="#B54040" />
            ) : null}
          </View>
        </View>

        <View style={{ height: keyboardHeight ? keyboardHeight + 28 : FOOTER_SCROLL_CLEARANCE }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {isApprovedOrderLocked ? (
          <View style={styles.lockedOrderNotice}>
            <Ionicons name="lock-closed-outline" size={14} color="#8A7C6B" />
            <Text style={styles.lockedOrderNoticeText}>Only branch managers can edit approved orders.</Text>
          </View>
        ) : null}
        <View style={styles.bottomActionsRow}>
          <TouchableOpacity
            style={[styles.smallBtn, !canPersist ? styles.actionBtnDisabled : null]}
            onPress={handleSave}
            disabled={!canPersist}
            activeOpacity={0.9}
          >
            <Text style={styles.smallBtnText}>{saving ? 'Saving...' : 'Save Quote'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendBtn, !canPersist ? styles.sendBtnDisabled : null]}
            onPress={handleSendForApproval}
            disabled={!canPersist}
            activeOpacity={0.9}
          >
            <Text style={styles.sendBtnText}>
              {sending ? 'Sending...' : 'Send For Approval'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {renderDropdownOverlay()}
      <Modal
        visible={approvalConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setApprovalConfirmVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmHeaderRow}>
              <View style={styles.confirmIconWrap}>
                <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.confirmHeaderText}>
                <Text style={styles.confirmTitle}>Send For Approval?</Text>
                <Text style={styles.confirmMessage}>
                  Order will be generated and kept pending for approval.
                </Text>
              </View>
            </View>
            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setApprovalConfirmVisible(false)}
                activeOpacity={0.9}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmPrimaryBtn}
                onPress={handleConfirmSendForApproval}
                activeOpacity={0.9}
                accessibilityRole="button"
                focusable
                hasTVPreferredFocus
              >
                <Text style={styles.confirmPrimaryText}>Send For Approval</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <NotificationPopover
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        onOpenNotification={handleOpenNotificationEntry}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  dropdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
    elevation: 40,
  },
  headerRow: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E6E0D7',
    backgroundColor: '#FFFFFF',
  },
  headerIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBellBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DED4C8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDFBF8',
  },
  headerBellBadge: {
    position: 'absolute',
    top: -4,
    right: -3,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D84141',
  },
  headerBellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  proposalStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E1D7',
    backgroundColor: '#FFFFFF',
  },
  proposalLeft: {
    flex: 1,
    paddingRight: 8,
  },
  proposalRight: {
    width: 120,
    alignItems: 'flex-end',
  },
  quoteNoText: {
    fontSize: 10,
    letterSpacing: 1.1,
    color: '#8B8379',
    fontWeight: '700',
    marginBottom: 2,
  },
  proposalTitle: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '800',
    color: '#1F1A15',
  },
  proposalSub: {
    marginTop: 2,
    fontSize: 10,
    color: '#BA8F4A',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  preparedLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#8B8379',
    fontWeight: '700',
  },
  preparedName: {
    marginTop: 1,
    fontSize: 16,
    color: '#2A241F',
    fontWeight: '700',
    textAlign: 'right',
  },
  preparedDate: {
    marginTop: 1,
    fontSize: 11,
    color: '#7F766C',
    fontWeight: '600',
  },
  errorText: {
    color: '#B54040',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  editorShell: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  purchaseSection: {
    marginBottom: 9,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockLabel: {
    fontSize: 10,
    letterSpacing: 1.1,
    color: '#7F756B',
    fontWeight: '700',
  },
  requiredPill: {
    marginLeft: 8,
    paddingHorizontal: 7,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#D54646',
    justifyContent: 'center',
  },
  requiredPillText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  poInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#D7C8B2',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    color: '#6E573B',
    fontSize: 14,
    fontWeight: '700',
  },
  itemCard: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 13,
    backgroundColor: '#F8F6F2',
    padding: 10,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemHeading: {
    fontSize: 10,
    letterSpacing: 1,
    color: '#8A8178',
    fontWeight: '700',
  },
  modifyText: {
    fontSize: 11,
    color: '#B58A45',
    fontWeight: '700',
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFE9DE',
    borderWidth: 1,
    borderColor: '#D9C9B1',
  },
  itemImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTopText: {
    flex: 1,
    paddingHorizontal: 8,
  },
  itemName: {
    fontSize: 15,
    color: '#27211C',
    fontWeight: '700',
  },
  itemMeta: {
    marginTop: 1,
    fontSize: 10,
    color: '#7C746A',
    fontWeight: '600',
  },
  itemMetaSub: {
    marginTop: 1,
    fontSize: 10,
    color: '#7C746A',
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 18,
    color: '#B2874A',
    fontWeight: '800',
  },
  dropdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  dropdownFieldWrap: {
    width: '48.5%',
    position: 'relative',
    marginBottom: 8,
  },
  dropdownFieldWrapActive: {
    zIndex: 350,
  },
  specLabel: {
    fontSize: 9,
    letterSpacing: 0.9,
    color: '#888075',
    fontWeight: '700',
    marginBottom: 4,
  },
  dropdownFieldCard: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: '#D8D0C4',
    borderRadius: 9,
    backgroundColor: '#F6F3EE',
    paddingHorizontal: 9,
    justifyContent: 'center',
  },
  dropdownValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownValueText: {
    flex: 1,
    marginRight: 8,
    fontSize: 12,
    color: '#2C2620',
    fontWeight: '700',
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
    fontSize: 12,
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
    fontSize: 12,
    color: '#38312A',
    fontWeight: '600',
    textAlign: 'left',
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
    fontSize: 12,
    color: '#8F8378',
    fontWeight: '600',
    textAlign: 'left',
  },
  notesWrap: {
    marginBottom: 8,
  },
  notesInput: {
    height: 36,
    borderWidth: 1,
    borderColor: '#D7C4A2',
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    color: '#2E2721',
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 10,
  },
  customerCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 13,
    backgroundColor: '#FAF8F5',
    padding: 10,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  customerInputWrap: {
    position: 'relative',
    marginTop: 8,
  },
  customerInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#D9D0C4',
    borderRadius: 10,
    backgroundColor: '#F5F2ED',
    paddingHorizontal: 10,
    color: '#342D26',
    fontSize: 13,
    fontWeight: '600',
  },
  customerInputError: {
    borderColor: '#B54040',
    backgroundColor: '#FFF7F5',
  },
  customerInputWithIcon: {
    paddingRight: 34,
  },
  customerErrorIcon: {
    position: 'absolute',
    right: 10,
    top: 11,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 26, 21, 0.18)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 86 : 76,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DCCD',
    padding: 12,
    shadowColor: '#201810',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 18,
  },
  confirmHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  confirmIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME_ACTION_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  confirmHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2A241F',
  },
  confirmMessage: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: '#6F665D',
    fontWeight: '600',
  },
  confirmActionsRow: {
    marginTop: 12,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 0.82,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7CEC2',
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 13,
    color: '#6F665D',
    fontWeight: '800',
  },
  confirmPrimaryBtn: {
    flex: 1.35,
    height: 42,
    borderRadius: 12,
    backgroundColor: THEME_ACTION_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPrimaryText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#E8E1D7',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 22 : 12,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockedOrderNotice: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4D7C8',
    backgroundColor: '#FBF7F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  lockedOrderNoticeText: {
    flexShrink: 1,
    marginLeft: 6,
    fontSize: 12,
    color: '#8A7C6B',
    fontWeight: '700',
    textAlign: 'center',
  },
  smallBtn: {
    flex: 0.9,
    minWidth: 0,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7CEC2',
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: {
    fontSize: 12,
    color: '#6F665D',
    fontWeight: '700',
  },
  sendBtn: {
    flex: 1.25,
    minWidth: 0,
    height: 46,
    borderRadius: 12,
    backgroundColor: THEME_ACTION_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default QuoteBuilderScreen;
