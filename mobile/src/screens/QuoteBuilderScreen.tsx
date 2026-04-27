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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { createOrder, fetchPricePreview, updateOrder } from '../api/orders';
import { fetchDesign, fetchDesigns } from '../api/designs';
import { useAuth } from '../context/AuthContext';
import type { Design, Order } from '../types';
import type { DesignsStackParamList } from '../navigation/RootNavigator';

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

const uniqueValues = (values: Array<string | number | null | undefined>) =>
  Array.from(new Set(values.map(compact).filter(Boolean)));

const normalizeBaseDesignNo = (designNo?: string | null) =>
  String(designNo || '').replace(/-V\d+$/i, '').trim();

const parseVersion = (version?: string | null) => {
  const match = /V(\d+)/i.exec(String(version || '').trim());
  const parsed = match ? Number.parseInt(match[1], 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
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

const matchesFilter = (values: string[], selected: string) => !selected || values.includes(selected);

const filterMatchesDesign = (design: Design, key: FilterKey, value: string) => {
  const attrs = getVersionAttributes(design);
  switch (key) {
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

const findBestMatchingVersion = (family: Design[], filters: VersionFilters, currentId: string | null) => {
  const candidates = family.filter((design) => {
    const attrs = getVersionAttributes(design);
    return (
      matchesFilter(attrs.shapes, filters.shape) &&
      matchesFilter(attrs.styles, filters.style) &&
      matchesFilter(attrs.metalColors, filters.metalColor) &&
      matchesFilter(attrs.weights, filters.weight) &&
      matchesFilter(attrs.qualities, filters.quality) &&
      matchesFilter(attrs.ringSizes, filters.ringSize)
    );
  });

  if (!candidates.length) return null;
  const current = candidates.find((item) => item.id === currentId);
  if (current) return current;
  return [...candidates].sort((a, b) => parseVersion(a.version) - parseVersion(b.version))[0];
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

const QuoteBuilderScreen = () => {
  const route = useRoute<QuoteRoute>();
  const navigation = useNavigation<QuoteNav>();
  const { token, user } = useAuth();
  const { draft } = route.params;
  const companyId = user?.companyId || '';
  const branchId = user?.branchId || '';

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingFamily, setLoadingFamily] = useState(false);

  const [familyDesigns, setFamilyDesigns] = useState<Design[]>([]);
  const [activeDesignId, setActiveDesignId] = useState<string | null>(null);
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
  const [notes, setNotes] = useState(draft.notes || '');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(draft.orderId || null);

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [dropdownSelected, setDropdownSelected] = useState('');
  const [dropdownKey, setDropdownKey] = useState<FilterKey | null>(null);

  useEffect(() => {
    setPurchaseOrderNumber(draft.purchaseOrderNumber || '');
    setCustomerName(draft.customerName || '');
    setCustomerPhone(draft.customerPhone || '');
    setCustomerEmail(draft.customerEmail || '');
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

  const applyActiveDesignSelection = useCallback((design: Design) => {
    const next = getFilterValuesFromDesign(design);
    setActiveDesignId(design.id);
    setShape(next.shape || '');
    setStyle(next.style || '');
    setMetalColor(next.metalColor || '');
    setWeight(next.weight || '');
    setQuality(next.quality || '');
    setRingSize(next.ringSize || '');
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;

    const loadFamily = async () => {
      setLoadingFamily(true);
      try {
        const primary = await fetchDesign(token, draft.designId);
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

        const family = (detailed.length ? detailed : [primary]).sort((a, b) => parseVersion(a.version) - parseVersion(b.version));
        const primaryDesign = [...family].sort((a, b) => parseVersion(a.version) - parseVersion(b.version))[0] || primary;
        if (!active) return;

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
          if (active) setPriceByDesignId(Object.fromEntries(pricedRows));
        } else {
          setPriceByDesignId(Object.fromEntries(family.map((design) => [design.id, design.totalValue ?? 0] as const)));
        }
      } catch {
        if (active) {
          setFamilyDesigns([]);
          setActiveDesignId(null);
        }
      } finally {
        if (active) setLoadingFamily(false);
      }
    };

    loadFamily();
    return () => {
      active = false;
    };
  }, [token, draft.designId, user?.role, user?.companyId, user?.branchId, applyActiveDesignSelection]);

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
    const values = uniqueValues(familyDesigns.flatMap((design) => getVersionAttributes(design).shapes));
    return values.length ? values : uniqueValues([shape]);
  }, [familyDesigns, shape]);
  const styleOptions = useMemo(() => {
    const values = uniqueValues(familyDesigns.flatMap((design) => getVersionAttributes(design).styles));
    return values.length ? values : uniqueValues([style]);
  }, [familyDesigns, style]);
  const metalColorOptions = useMemo(() => {
    const values = uniqueValues(familyDesigns.flatMap((design) => getVersionAttributes(design).metalColors));
    return values.length ? values : uniqueValues([metalColor]);
  }, [familyDesigns, metalColor]);
  const weightOptions = useMemo(() => {
    const values = uniqueValues(familyDesigns.flatMap((design) => getVersionAttributes(design).weights));
    return values.length ? values : uniqueValues([weight]);
  }, [familyDesigns, weight]);
  const qualityOptions = useMemo(() => {
    const values = uniqueValues(familyDesigns.flatMap((design) => getVersionAttributes(design).qualities));
    return values.length ? values : uniqueValues([quality]);
  }, [familyDesigns, quality]);
  const ringSizeOptions = useMemo(() => {
    const values = uniqueValues(familyDesigns.flatMap((design) => getVersionAttributes(design).ringSizes));
    return values.length ? values : uniqueValues([ringSize]);
  }, [familyDesigns, ringSize]);

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
    (selectedKey: FilterKey, selectedValue: string) => {
      if (!familyDesigns.length) {
        setSelectionField(selectedKey, selectedValue);
        return;
      }
      const strictFilters: VersionFilters = { ...selection, [selectedKey]: selectedValue };
      const strictMatch = findBestMatchingVersion(familyDesigns, strictFilters, activeDesignId);
      const matched =
        strictMatch ||
        findBestVersionForFieldSelection(familyDesigns, selectedKey, selectedValue, selection, activeDesignId);
      if (!matched) {
        setSelectionField(selectedKey, selectedValue);
        return;
      }
      applyActiveDesignSelection(matched);
    },
    [familyDesigns, selection, activeDesignId, setSelectionField, applyActiveDesignSelection],
  );

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
    [dropdownVisible, dropdownKey],
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
                  key={`qb-dd-${ownerKey}-${item}`}
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

  const canPersist = Boolean(token && companyId && branchId && !saving && !sending);

  const persistOrder = useCallback(
    async (nextStatus: 'QUOTE' | 'PENDING_APPROVAL') => {
      if (!token || !companyId || !branchId) return null;
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
    ],
  );

  const handleSave = useCallback(async () => {
    if (!canPersist) return;
    setSaving(true);
    setError(null);
    try {
      await persistOrder('QUOTE');
      Alert.alert('Saved', 'Quote draft has been saved.');
    } catch (err: any) {
      setError(err?.message || 'Unable to save quote.');
    } finally {
      setSaving(false);
    }
  }, [canPersist, persistOrder]);

  const handleSendForApproval = useCallback(async () => {
    if (!canPersist) return;
    setSending(true);
    setError(null);
    try {
      const updated = await persistOrder('PENDING_APPROVAL');
      if (!updated) return;
      Alert.alert('Quote sent', 'Quote has been sent for approval.');
      (navigation as any).navigate('OrdersTab', {
        screen: 'OrderDetail',
        params: { orderId: updated.id },
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to send quote for approval.');
    } finally {
      setSending(false);
    }
  }, [canPersist, navigation, persistOrder]);

  const handleShare = useCallback(async () => {
    const quoteNo = order?.orderNumber || 'Quote Draft';
    const payload = [
      `${quoteNo} - Jewelry Proposal`,
      `Design: ${(activeDesign?.designNo || draft.designNo || '').trim()}`,
      activeDesign?.designName || draft.designName ? `Item: ${(activeDesign?.designName || draft.designName || '').trim()}` : null,
      `Price: ${formatCurrency(displayPrice)}`,
      selectionSummary ? `Specs: ${selectionSummary}` : null,
      customerName ? `Prepared for: ${customerName}` : null,
      customerPhone ? `Phone: ${customerPhone}` : null,
      customerEmail ? `Email: ${customerEmail}` : null,
      notes ? `Notes: ${notes}` : null,
      activeImage ? `Image: ${activeImage}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await Share.share({
      title: quoteNo,
      message: payload,
    });
  }, [
    order?.orderNumber,
    activeDesign?.designNo,
    activeDesign?.designName,
    draft.designNo,
    draft.designName,
    displayPrice,
    selectionSummary,
    customerName,
    customerPhone,
    customerEmail,
    notes,
    activeImage,
  ]);

  const handleSummary = useCallback(() => {
    navigation.navigate('QuoteSummary', {
      summary: {
        orderId: order?.id || editingOrderId || undefined,
        orderNumber: order?.orderNumber || draft.orderNumber,
        createdAt: order?.createdAt || draft.createdAt,
        status: order?.status || draft.status || 'QUOTE',
        designId: activeDesign?.id || draft.designId,
        designNo: activeDesign?.designNo || draft.designNo,
        designName: activeDesign?.designName || draft.designName || null,
        imageUrl: activeImage || null,
        price: Number(displayPrice || draft.unitPrice || 0),
        selection: {
          shape,
          metalColor,
          style,
          weight,
          quality,
          ringSize,
        },
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        purchaseOrderNumber: purchaseOrderNumber.trim() || undefined,
        branchName: user?.branchName || undefined,
        notes: notes.trim() || undefined,
      },
    });
  }, [
    navigation,
    order?.id,
    order?.orderNumber,
    order?.createdAt,
    order?.status,
    editingOrderId,
    activeDesign?.id,
    activeDesign?.designNo,
    activeDesign?.designName,
    draft.designId,
    draft.designNo,
    draft.designName,
    draft.orderNumber,
    draft.createdAt,
    draft.status,
    activeImage,
    displayPrice,
    draft.unitPrice,
    shape,
    metalColor,
    style,
    weight,
    quality,
    ringSize,
    customerName,
    customerPhone,
    customerEmail,
    purchaseOrderNumber,
    user?.branchName,
    notes,
  ]);

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
    <View style={[styles.dropdownFieldWrap, dropdownVisible && dropdownKey === fieldKey ? styles.dropdownFieldWrapActive : null]}>
      <Text style={styles.specLabel}>{label}</Text>
      <TouchableOpacity style={styles.dropdownFieldCard} activeOpacity={0.9} onPress={() => openDropdown(fieldKey, options, value)}>
        <View style={styles.dropdownValueRow}>
          <Text style={styles.dropdownValueText} numberOfLines={1}>
            {value || '-'}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#7D746A" />
        </View>
      </TouchableOpacity>
      {renderInlineDropdown(fieldKey)}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
          <Ionicons name="chevron-back" size={17} color="#7A6E61" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quote Builder</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.smallActionBtn} activeOpacity={0.9} onPress={handleSave} disabled={!canPersist}>
            <Ionicons name="create-outline" size={13} color="#7A6E61" />
            <Text style={styles.smallActionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBellBtn}
            onPress={() => (navigation as any).navigate('OrdersTab')}
            activeOpacity={0.88}
          >
            <Ionicons name="notifications-outline" size={16} color="#7A6E61" />
            <View style={styles.headerBellBadge}>
              <Text style={styles.headerBellBadgeText}>3</Text>
            </View>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
              {renderDropdownField('CARAT WEIGHT', 'weight', weight, weightOptions)}
              {renderDropdownField('DIAMOND', 'quality', quality, qualityOptions)}
              {renderDropdownField('RING SIZE', 'ringSize', ringSize, ringSizeOptions)}
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

            <TouchableOpacity style={styles.saveChangesBtn} onPress={handleSave} disabled={!canPersist} activeOpacity={0.9}>
              <Text style={styles.saveChangesText}>{saving ? 'Saving...' : 'Save changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.customerCard}>
          <Text style={styles.blockLabel}>CUSTOMER INFO</Text>
          <TextInput
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Customer name"
            placeholderTextColor="#A29587"
            style={styles.customerInput}
          />
          <TextInput
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="+1 (212) 555-0198"
            placeholderTextColor="#A29587"
            keyboardType="phone-pad"
            style={styles.customerInput}
          />
          <TextInput
            value={customerEmail}
            onChangeText={setCustomerEmail}
            placeholder="customer@email.com"
            placeholderTextColor="#A29587"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.customerInput}
          />
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomSmallActions}>
          <TouchableOpacity style={styles.smallBtn} onPress={handleSave} disabled={!canPersist} activeOpacity={0.9}>
            <Text style={styles.smallBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallBtn} onPress={handleShare} activeOpacity={0.9}>
            <Text style={styles.smallBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallBtn} onPress={handleSummary} activeOpacity={0.9}>
            <Text style={styles.smallBtnText}>Summary</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, !canPersist ? styles.sendBtnDisabled : null]}
          onPress={handleSendForApproval}
          disabled={!canPersist}
          activeOpacity={0.9}
        >
          <Text style={styles.sendBtnText}>
            {sending ? 'Sending...' : 'Send for Approval - close the deal ->'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  smallActionBtn: {
    height: 30,
    borderRadius: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#DED4C8',
    backgroundColor: '#FAF8F5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallActionText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#7A6E61',
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
    backgroundColor: '#F4EFE5',
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
  notesWrap: {
    marginBottom: 8,
  },
  notesInput: {
    height: 36,
    borderWidth: 1,
    borderColor: '#D7C4A2',
    borderRadius: 9,
    backgroundColor: '#FBF6ED',
    color: '#2E2721',
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 10,
  },
  saveChangesBtn: {
    height: 38,
    borderRadius: 11,
    backgroundColor: '#1B1816',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveChangesText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
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
    marginTop: 8,
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
  bottomSmallActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  smallBtn: {
    width: '31.5%',
    height: 34,
    borderRadius: 11,
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
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1A1715',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default QuoteBuilderScreen;
