import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createOrder, fetchOrder, updateOrder } from '../api/orders';
import { fetchAllDesigns, fetchDesign } from '../api/designs';
import { useAuth } from '../context/AuthContext';
import type { Design } from '../types';
import type { QuoteSummaryPayload } from '../navigation/RootNavigator';
import { getDesignFamilyKey } from '../utils/designFamily';

type SummaryRoute = RouteProp<{ QuoteSummary: { summary: QuoteSummaryPayload } }, 'QuoteSummary'>;
type SummaryNav = NativeStackNavigationProp<any>;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatSummaryDate = (value?: string | null) => {
  if (!value) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const toCtwLabel = (value?: string | number | null) => {
  const clean = String(value ?? '').trim();
  if (!clean) return '';
  const normalized = clean
    .replace(/\bcarats?\b/gi, 'ctw')
    .replace(/\bcts?\b/gi, 'ctw')
    .replace(/\bct\b/gi, 'ctw');
  if (/ctw/i.test(normalized)) return normalized;
  return `${normalized} ctw`;
};

const statusLabel = (status?: string) => {
  const key = String(status || 'QUOTE').trim().toUpperCase();
  switch (key) {
    case 'PENDING_APPROVAL':
      return 'Pending Approval';
    case 'APPROVED':
      return 'Approved';
    case 'IN_PRODUCTION':
      return 'In Production';
    case 'SHIPPED':
      return 'Shipped';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return 'Quote';
  }
};

const normalizeStatus = (status?: string | null) => String(status || 'QUOTE').trim().toUpperCase();
const compact = (value?: string | number | null) => String(value ?? '').trim();
const KNOWN_SHAPES = ['oval', 'round', 'emerald', 'radiant', 'pear', 'marquise', 'princess', 'cushion', 'heart', 'asscher'];
const parseVersion = (version?: string | null) => {
  const match = /V(\d+)/i.exec(compact(version));
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
};
const stripSelectionLabel = (value?: string | null) =>
  compact(value).replace(/^(metal|coverage|diamond quality|diamond|quality|carat weight|weight|ring size|shape)\s*[:\-]\s*/i, '').trim();

const isLikelyMetal = (value?: string | null) => /(wg|yg|rg|pt|white|yellow|rose|gold|platinum|\b\d{1,2}\s*k\b)/i.test(compact(value));
const isLikelyCoverage = (value?: string | null) => /(eternity|full|half|3\/4|quarter|stone|pav|halo|solitaire)/i.test(compact(value));
const isLikelyQuality = (value?: string | null) => /(vvs|vs|si|if|fl|lab|ef|gh|ij)/i.test(compact(value));
const isLikelyWeight = (value?: string | null) => /(ctw|carat|carats|\bct\b)/i.test(compact(value));
const isLikelyRingSize = (value?: string | null) => /^(?:\d+(?:\.\d+)?|size\s*\d+(?:\.\d+)?|ring size\s*\d+(?:\.\d+)?)$/i.test(compact(value));
const isLikelyShape = (value?: string | null) => KNOWN_SHAPES.includes(compact(value).toLowerCase());

const sanitizeSelection = (selection?: QuoteSummaryPayload['selection'] | null): QuoteSummaryPayload['selection'] => ({
  shape: isLikelyShape(selection?.shape) ? compact(selection?.shape) : undefined,
  metalColor: isLikelyMetal(selection?.metalColor) ? compact(selection?.metalColor) : undefined,
  style: isLikelyCoverage(selection?.style) ? compact(selection?.style) : undefined,
  weight: isLikelyWeight(selection?.weight) ? compact(selection?.weight) : undefined,
  quality: isLikelyQuality(selection?.quality) ? compact(selection?.quality) : undefined,
  ringSize: isLikelyRingSize(selection?.ringSize) ? compact(selection?.ringSize).replace(/^ring size\s*/i, '').replace(/^size\s*/i, '') : undefined,
});

const parseSelectionFromSummaryText = (value?: string | null): QuoteSummaryPayload['selection'] => {
  const text = compact(value);
  if (!text) return {};

  const parts = text
    .replace(/[|\u2022]/g, ' - ')
    .replace(/\s*-\s*/g, ' - ')
    .split(' - ')
    .map((item) => item.trim())
    .filter(Boolean);

  const next: QuoteSummaryPayload['selection'] = {};
  for (const item of parts) {
    const cleaned = stripSelectionLabel(item);
    const lower = cleaned.toLowerCase();
    if (!next.weight && /(ctw|carat|carats|\bct\b)/i.test(lower)) {
      next.weight = cleaned;
      continue;
    }
    if (!next.ringSize && /(ring size|size|^sz\s*\d|^size\s*\d|^\d+(\.\d+)?$)/i.test(lower)) {
      next.ringSize = cleaned.replace(/^ring size\s*[:\-]?\s*/i, '').replace(/^size\s*[:\-]?\s*/i, '');
      continue;
    }
    if (!next.quality && /(vvs|vs|si|if|fl|lab|ef|gh|ij)/i.test(lower)) {
      next.quality = cleaned;
      continue;
    }
    if (!next.metalColor && /(wg|yg|rg|pt|white|yellow|rose|gold|platinum|\bk\b)/i.test(lower)) {
      next.metalColor = cleaned;
      continue;
    }
    if (!next.style && isLikelyCoverage(cleaned)) {
      next.style = cleaned;
    }
  }
  return sanitizeSelection(next);
};

const selectionFromDesign = (design?: Design | null): QuoteSummaryPayload['selection'] => {
  if (!design) return {};
  return sanitizeSelection({
    shape: compact(design.gemstones?.[0]?.shape) || undefined,
    metalColor: compact(design.metals?.[0]?.metalCaratage || design.metals?.[0]?.goldColour || design.goldColour) || undefined,
    style: compact(design.diamondSpread) || undefined,
    weight: compact(design.diamondWeight) || undefined,
    quality: compact(design.diamondQuality) || undefined,
    ringSize: compact(design.jewelrySize) || undefined,
  });
};

const findDesignByOrderMeta = async (
  token: string,
  input: { designNo?: string | null; designVersion?: string | null },
) => {
  const designNo = compact(input.designNo);
  if (!designNo) return null;

  const rows = await fetchAllDesigns(token, 200);
  const familyKey = getDesignFamilyKey(designNo);
  const direct = rows.filter((row) => getDesignFamilyKey(row.designNo) === familyKey);
  const byExact = direct.length
    ? direct
    : rows.filter((row) => compact(row.designNo).toLowerCase() === designNo.toLowerCase());

  if (!byExact.length) return null;

  const targetVersion = compact(input.designVersion).toLowerCase();
  if (targetVersion) {
    const exactVersion = byExact.find((row) => compact(row.version).toLowerCase() === targetVersion);
    if (exactVersion) return exactVersion;
  }

  return [...byExact].sort((a, b) => parseVersion(a.version) - parseVersion(b.version))[0];
};

const QuoteSummaryScreen = () => {
  const route = useRoute<SummaryRoute>();
  const navigation = useNavigation<SummaryNav>();
  const { token, user } = useAuth();
  const { summary } = route.params;

  const [orderId, setOrderId] = useState(summary.orderId);
  const [orderNumber, setOrderNumber] = useState(summary.orderNumber);
  const [currentStatus, setCurrentStatus] = useState(normalizeStatus(summary.status));
  const [resolvedSelection, setResolvedSelection] = useState<QuoteSummaryPayload['selection']>(() => {
    const fromText = parseSelectionFromSummaryText(summary.shortDescription);
    const fromPayload = sanitizeSelection(summary.selection);
    return {
      shape: fromText.shape || fromPayload.shape,
      metalColor: fromText.metalColor || fromPayload.metalColor,
      style: fromText.style || fromPayload.style,
      weight: fromText.weight || fromPayload.weight,
      quality: fromText.quality || fromPayload.quality,
      ringSize: fromText.ringSize || fromPayload.ringSize,
    };
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const hydrateSelection = async () => {
      if (!token || !summary.orderId) return;
      try {
        const order = await fetchOrder(token, summary.orderId);
        const parsedFromOrder = parseSelectionFromSummaryText(order.shortDescription);

        let parsedFromDesign: QuoteSummaryPayload['selection'] = {};
        const designId = compact(summary.designId) || compact(order.designId);
        if (designId) {
          try {
            const design = await fetchDesign(token, designId);
            parsedFromDesign = selectionFromDesign(design);
          } catch {
            // optional fallback
          }
        } else {
          try {
            const resolved = await findDesignByOrderMeta(token, {
              designNo: order.designNo || summary.designNo,
              designVersion: (order as any).designVersion || undefined,
            });
            parsedFromDesign = selectionFromDesign(resolved);
          } catch {
            // optional fallback
          }
        }

        if (!active) return;
        setResolvedSelection((prev) => {
          const fromPrev = sanitizeSelection(prev);
          const fromOrder = sanitizeSelection(parsedFromOrder);
          const fromDesign = sanitizeSelection(parsedFromDesign);
          return {
            shape: fromOrder.shape || fromDesign.shape || fromPrev.shape,
            metalColor: fromOrder.metalColor || fromDesign.metalColor || fromPrev.metalColor,
            style: fromOrder.style || fromDesign.style || fromPrev.style,
            weight: fromOrder.weight || fromDesign.weight || fromPrev.weight,
            quality: fromOrder.quality || fromDesign.quality || fromPrev.quality,
            ringSize: fromOrder.ringSize || fromDesign.ringSize || fromPrev.ringSize,
          };
        });
      } catch {
        // keep existing summary payload data
      }
    };
    hydrateSelection();
    return () => {
      active = false;
    };
  }, [token, summary.orderId, summary.designId]);

  const retailPrice = Number(summary.price || 0);
  const summaryStatus = statusLabel(currentStatus);

  const itemLine1 = useMemo(
    () => `Metal: ${resolvedSelection.metalColor || '-'} - Coverage: ${resolvedSelection.style || '-'}`,
    [resolvedSelection.metalColor, resolvedSelection.style],
  );
  const itemLine2 = useMemo(
    () => `Diamond: ${resolvedSelection.quality || '-'} - ${toCtwLabel(resolvedSelection.weight) || '-'}`,
    [resolvedSelection.quality, resolvedSelection.weight],
  );
  const itemLine3 = useMemo(
    () => `Ring Size: ${resolvedSelection.ringSize || '-'} - Shape: ${resolvedSelection.shape || '-'}`,
    [resolvedSelection.ringSize, resolvedSelection.shape],
  );

  const statusFlow = useMemo(() => {
    const key = normalizeStatus(currentStatus);
    const pendingDone = ['PENDING_APPROVAL', 'APPROVED', 'IN_PRODUCTION', 'SHIPPED', 'COMPLETED'].includes(key);
    const approvedDone = ['APPROVED', 'IN_PRODUCTION', 'SHIPPED', 'COMPLETED'].includes(key);
    const shippedDone = ['SHIPPED', 'COMPLETED'].includes(key);
    return {
      created: true,
      pending: pendingDone,
      approved: approvedDone,
      shipped: shippedDone,
    };
  }, [currentStatus]);

  const handleSendForApproval = useCallback(async () => {
    if (!token || !user?.companyId || !user?.branchId) {
      setError('Company and branch are required.');
      return;
    }
    if (!summary.designId) {
      setError('Design reference is missing for this quote.');
      return;
    }

    setSending(true);
    setError(null);
    try {
      const payload = {
        designId: summary.designId,
        shortDescription: [resolvedSelection.metalColor, resolvedSelection.style, resolvedSelection.quality, toCtwLabel(resolvedSelection.weight), resolvedSelection.ringSize]
          .filter(Boolean)
          .join(' - '),
        purchaseOrderNumber: summary.purchaseOrderNumber || undefined,
        customerName: summary.customerName || undefined,
        customerPhone: summary.customerPhone || undefined,
        customerEmail: summary.customerEmail || undefined,
        notes: summary.notes || undefined,
        status: 'PENDING_APPROVAL',
      };

      let nextOrderId = orderId;
      let nextOrderNumber = orderNumber;
      if (nextOrderId) {
        const updated = await updateOrder(token, nextOrderId, payload);
        nextOrderId = updated.id;
        nextOrderNumber = updated.orderNumber || nextOrderNumber;
      } else {
        const created = await createOrder(token, {
          companyId: user.companyId,
          branchId: user.branchId,
          designId: summary.designId,
          quantity: 1,
          price: retailPrice,
          shortDescription: payload.shortDescription,
          purchaseOrderNumber: payload.purchaseOrderNumber,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          customerEmail: payload.customerEmail,
          notes: payload.notes,
          status: 'PENDING_APPROVAL',
        });
        nextOrderId = created.id;
        nextOrderNumber = created.orderNumber || nextOrderNumber;
      }

      setOrderId(nextOrderId);
      setOrderNumber(nextOrderNumber);
      setCurrentStatus('PENDING_APPROVAL');
      Alert.alert('Sent', 'Order sent for approval.');
    } catch (err: any) {
      setError(err?.message || 'Unable to send for approval.');
    } finally {
      setSending(false);
    }
  }, [token, user?.companyId, user?.branchId, summary, retailPrice, orderId, orderNumber, resolvedSelection]);

  const statusKey = useMemo(() => normalizeStatus(currentStatus), [currentStatus]);
  const isBranchManager = user?.role === 'BRANCH_MANAGER';

  const actionConfig = useMemo(() => {
    if (statusKey === 'QUOTE') {
      return {
        primaryLabel: sending ? 'Sending...' : 'Send for Approval ->',
        primaryDisabled: sending,
        leftLabel: 'Edit Order',
        leftIcon: 'create-outline' as const,
      };
    }
    if (statusKey === 'PENDING_APPROVAL') {
      return {
        primaryLabel: 'Awaiting Approval',
        primaryDisabled: true,
        leftLabel: 'Order Details',
        leftIcon: 'document-text-outline' as const,
      };
    }
    if (statusKey === 'APPROVED' || statusKey === 'IN_PRODUCTION') {
      return {
        primaryLabel: 'Request Cancellation / Modification',
        primaryDisabled: false,
        leftLabel: 'Order Details',
        leftIcon: 'document-text-outline' as const,
      };
    }
    if (statusKey === 'SHIPPED' || statusKey === 'COMPLETED') {
      return {
        primaryLabel: 'Order Shipped',
        primaryDisabled: true,
        leftLabel: 'Order Details',
        leftIcon: 'checkmark-circle-outline' as const,
      };
    }
    return {
      primaryLabel: 'Order Cancelled',
      primaryDisabled: true,
      leftLabel: 'Order Details',
      leftIcon: 'close-circle-outline' as const,
    };
  }, [sending, statusKey]);

  const handlePrimaryAction = useCallback(() => {
    if (statusKey === 'QUOTE') {
      handleSendForApproval();
      return;
    }
    if (statusKey === 'APPROVED' || statusKey === 'IN_PRODUCTION') {
      Alert.alert('Request queued', 'Cancellation / modification request flow will be connected next.');
    }
  }, [statusKey, handleSendForApproval]);

  const handleManagerPendingDecision = useCallback(
    async (nextStatus: 'APPROVED' | 'CANCELLED') => {
      if (!token || !orderId) {
        setError('Order reference is missing.');
        return;
      }

      setSending(true);
      setError(null);
      try {
        await updateOrder(token, orderId, { status: nextStatus });
        setCurrentStatus(nextStatus);
        Alert.alert(
          nextStatus === 'APPROVED' ? 'Approved' : 'Rejected',
          nextStatus === 'APPROVED'
            ? 'Order approved successfully.'
            : 'Order rejected successfully.',
        );
      } catch (err: any) {
        setError(err?.message || 'Unable to update order status.');
      } finally {
        setSending(false);
      }
    },
    [orderId, token],
  );

  const showManagerPendingActions = isBranchManager && statusKey === 'PENDING_APPROVAL';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
          <Ionicons name="chevron-back" size={17} color="#7A6E61" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Summary</Text>
        <TouchableOpacity style={styles.printBtn} activeOpacity={0.9} onPress={() => Alert.alert('Print', 'Print view coming soon.')}>
          <Ionicons name="print-outline" size={14} color="#8A7C6B" />
          <Text style={styles.printText}>Print</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <View style={styles.topLineRow}>
            <Text style={styles.quoteText}>QUOTE #{orderNumber || 'DRAFT'}</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{summaryStatus}</Text>
            </View>
          </View>
          <Text style={styles.mainTitle}>Order Summary</Text>
          <Text style={styles.metaText}>
            Created {formatSummaryDate(summary.createdAt)} - {summary.customerName || 'Customer'}
          </Text>
          <View style={styles.topDivider} />
          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>CUSTOMER</Text>
              <Text style={styles.infoValue}>{summary.customerName || '-'}</Text>
              <Text style={styles.infoSub}>{summary.customerEmail || '-'}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>PURCHASE ORDER</Text>
              <Text style={styles.poValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
                {summary.purchaseOrderNumber || '-'}
              </Text>
              <Text style={styles.infoSub}>{summary.branchName || '-'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.itemRow}>
            {summary.imageUrl ? (
              <Image source={{ uri: summary.imageUrl, cache: 'force-cache' }} style={styles.itemImage} />
            ) : (
              <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                <Ionicons name="diamond-outline" size={16} color="#B2874A" />
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{summary.designName || summary.designNo || '-'}</Text>
              <Text style={styles.itemLine}>{itemLine1}</Text>
              <Text style={styles.itemLine}>{itemLine2}</Text>
              <Text style={styles.itemLine}>{itemLine3}</Text>
              {summary.notes ? <Text style={styles.itemLine}>Notes: {summary.notes}</Text> : null}
            </View>
            <Text style={styles.itemPrice}>{formatCurrency(retailPrice).replace('.00', '')}</Text>
          </View>
          <TouchableOpacity style={styles.modifyBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <Ionicons name="create-outline" size={14} color="#93826F" />
            <Text style={styles.modifyBtnText}>Modify this order</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <View style={styles.statusTrackRow}>
            <View style={styles.statusStep}>
              <View style={[styles.statusDot, statusFlow.created ? styles.statusDotDoneGreen : null]}>
                {statusFlow.created ? <Ionicons name="checkmark" size={10} color="#fff" /> : null}
              </View>
              <Text style={[styles.statusText, statusFlow.created ? styles.statusTextDoneGreen : null]}>Created</Text>
            </View>
            <View style={styles.statusLine} />
            <View style={styles.statusStep}>
              <View style={[styles.statusDot, statusFlow.pending ? styles.statusDotDoneGold : null]}>
                {statusFlow.pending ? <Ionicons name="checkmark" size={10} color="#fff" /> : null}
              </View>
              <Text style={[styles.statusText, statusFlow.pending ? styles.statusTextDoneGold : null]}>Pending</Text>
            </View>
            <View style={styles.statusLine} />
            <View style={styles.statusStep}>
              <View style={[styles.statusDot, statusFlow.approved ? styles.statusDotDoneNeutral : null]}>
                {statusFlow.approved ? <Ionicons name="checkmark" size={10} color="#fff" /> : null}
              </View>
              <Text style={[styles.statusText, statusFlow.approved ? styles.statusTextDoneNeutral : null]}>Approved</Text>
            </View>
            <View style={styles.statusLine} />
            <View style={styles.statusStep}>
              <View style={[styles.statusDot, statusFlow.shipped ? styles.statusDotDoneNeutral : null]}>
                {statusFlow.shipped ? <Ionicons name="checkmark" size={10} color="#fff" /> : null}
              </View>
              <Text style={[styles.statusText, statusFlow.shipped ? styles.statusTextDoneNeutral : null]}>Shipped</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 138 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {showManagerPendingActions ? (
          <View style={styles.managerDecisionRow}>
            <TouchableOpacity
              style={[styles.managerRejectBtn, sending ? styles.sendBtnDisabled : null]}
              onPress={() => handleManagerPendingDecision('CANCELLED')}
              activeOpacity={0.9}
              disabled={sending}
            >
              <Ionicons name="close" size={14} color="#C34F4F" />
              <Text style={styles.managerRejectText}>{sending ? 'Updating...' : 'Reject'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.managerApproveBtn, sending ? styles.sendBtnDisabled : null]}
              onPress={() => handleManagerPendingDecision('APPROVED')}
              activeOpacity={0.9}
              disabled={sending}
            >
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              <Text style={styles.managerApproveText}>Approve</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.smallActionsRow}>
              <TouchableOpacity style={styles.smallBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
                <Ionicons name={actionConfig.leftIcon} size={13} color="#D08748" />
                <Text style={[styles.smallBtnText, styles.smallBtnTextEdit]}>{actionConfig.leftLabel}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.sendBtn, actionConfig.primaryDisabled ? styles.sendBtnDisabled : null]}
              onPress={handlePrimaryAction}
              activeOpacity={0.9}
              disabled={actionConfig.primaryDisabled}
            >
              <Text style={styles.sendBtnText}>{actionConfig.primaryLabel}</Text>
            </TouchableOpacity>
          </>
        )}
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
  printBtn: {
    height: 30,
    borderRadius: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#DED4C8',
    backgroundColor: '#FAF8F5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  printText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#8A7C6B',
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
  topCard: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 10,
    marginBottom: 10,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  topLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 10,
    letterSpacing: 1,
    color: '#8B8379',
    fontWeight: '700',
  },
  statusPill: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E4CDA5',
    backgroundColor: '#FBF3E3',
    justifyContent: 'center',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B2874A',
  },
  mainTitle: {
    marginTop: 3,
    fontSize: 17,
    lineHeight: 21,
    color: '#1F1A15',
    fontWeight: '800',
  },
  metaText: {
    marginTop: 1,
    fontSize: 11,
    color: '#8A8178',
    fontWeight: '500',
  },
  topDivider: {
    marginTop: 8,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#E7DED1',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCell: {
    width: '48.5%',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 10,
    backgroundColor: '#F8F5F1',
    paddingVertical: 8,
    paddingHorizontal: 9,
  },
  infoLabel: {
    fontSize: 9,
    letterSpacing: 0.9,
    color: '#8B8175',
    fontWeight: '700',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 18,
    color: '#2A241F',
    fontWeight: '700',
  },
  poValue: {
    fontSize: 16,
    lineHeight: 18,
    color: '#B2874A',
    fontWeight: '800',
    flexShrink: 1,
  },
  infoSub: {
    marginTop: 1,
    fontSize: 11,
    color: '#7C7369',
    fontWeight: '500',
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 10,
    marginBottom: 10,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#1F1A15',
    fontWeight: '700',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFE9DE',
    borderWidth: 1,
    borderColor: '#D9C9B1',
  },
  itemImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    paddingHorizontal: 9,
  },
  itemName: {
    fontSize: 15,
    color: '#27211C',
    fontWeight: '700',
    marginBottom: 1,
  },
  itemLine: {
    fontSize: 11,
    color: '#7C746A',
    fontWeight: '500',
    lineHeight: 15,
  },
  itemPrice: {
    fontSize: 17,
    color: '#B2874A',
    fontWeight: '800',
  },
  modifyBtn: {
    marginTop: 10,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCCFC0',
    borderStyle: 'dashed',
    backgroundColor: '#FDFBF8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modifyBtnText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#8E8072',
    fontWeight: '700',
  },
  statusTrackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  statusStep: {
    alignItems: 'center',
    width: 58,
  },
  statusLine: {
    flex: 1,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#DAD2C6',
  },
  statusDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E4DFD8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotDoneGreen: {
    backgroundColor: '#2E8A59',
  },
  statusDotDoneGold: {
    backgroundColor: '#B2874A',
  },
  statusDotDoneNeutral: {
    backgroundColor: '#AAA194',
  },
  statusText: {
    marginTop: 4,
    fontSize: 10,
    color: '#A49A8D',
    fontWeight: '600',
  },
  statusTextDoneGreen: {
    color: '#2E8A59',
  },
  statusTextDoneGold: {
    color: '#B2874A',
  },
  statusTextDoneNeutral: {
    color: '#756D63',
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
  smallActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  smallBtn: {
    width: '48.5%',
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7CEC2',
    backgroundColor: '#FAF8F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: {
    fontSize: 13,
    color: '#6F665D',
    fontWeight: '700',
    marginLeft: 6,
  },
  smallBtnTextEdit: {
    color: '#8B6D50',
  },
  sendBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1A1715',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.65,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  managerDecisionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  managerRejectBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7C2C2',
    backgroundColor: '#FDF1F1',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  managerRejectText: {
    color: '#C34F4F',
    fontSize: 13,
    fontWeight: '700',
  },
  managerApproveBtn: {
    flex: 1.35,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2F8A58',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  managerApproveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default QuoteSummaryScreen;



