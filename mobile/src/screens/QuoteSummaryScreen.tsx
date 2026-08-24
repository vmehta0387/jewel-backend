import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createOrder, fetchOrder, getOrderPdfUrl, updateOrder } from '../api/orders';
import { fetchAllDesigns, fetchDesign } from '../api/designs';
import { useAuth } from '../context/AuthContext';
import type { Design, Order, SelectedDesignOptions } from '../types';
import type { QuoteBuilderDraft, QuoteSummaryPayload } from '../navigation/RootNavigator';
import { getDesignFamilyKey } from '../utils/designFamily';
import { canApproveOrderByStatus, canEditOrderByStatus, getOrderSubmitStatus } from '../utils/orderLifecycle';
import { diffChanges } from '../utils/changeDiff';
import { trackOrderChanged, trackOrderCreated } from '../utils/activityEvents';

type SummaryRoute = RouteProp<{ QuoteSummary: { summary: QuoteSummaryPayload } }, 'QuoteSummary'>;
type SummaryNav = NativeStackNavigationProp<any>;
type PdfWriteTarget = string | null | undefined;

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

const requestAndroidPdfWritePermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const androidVersion = Number(Platform.Version);
  if (Number.isFinite(androidVersion) && androidVersion >= 29) {
    return true;
  }

  const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
  const hasPermission = await PermissionsAndroid.check(permission);
  if (hasPermission) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission, {
    title: 'Storage Permission',
    message: 'Allow BLITZ NYC to save order PDFs on this device.',
    buttonPositive: 'Allow',
    buttonNegative: 'Cancel',
  });

  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return true;
  }

  Alert.alert('Permission required', 'Storage permission is required to save the order PDF.');
  return false;
};

const requestPdfWriteTarget = async (): Promise<PdfWriteTarget> => {
  if (Platform.OS !== 'android') {
    return null;
  }

  const hasWritePermission = await requestAndroidPdfWritePermission();
  if (!hasWritePermission) {
    return undefined;
  }

  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) {
    Alert.alert('Permission required', 'Please allow a save location to download the order PDF.');
    return undefined;
  }

  return permissions.directoryUri;
};

const openSavedPdfLocation = async (folderUri: string, fileUri?: string) => {
  try {
    await Linking.openURL(folderUri);
  } catch {
    if (!fileUri) return;
    try {
      await Linking.openURL(fileUri);
    } catch {
      // Some Android file providers do not expose saved document URIs back to apps.
    }
  }
};
const parseVersion = (version?: string | null) => {
  const match = /V(\d+)/i.exec(compact(version));
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
};
const stripSelectionLabel = (value?: string | null) =>
  compact(value).replace(/^(metal|coverage|diamond quality|diamond|quality|carat weight|weight|ring size|stone|shape)\s*[:\-]\s*/i, '').trim();

const getOrderDesignName = (order: Order) =>
  compact(order.designName || order.design?.designName);

const isLikelyMetal = (value?: string | null) => /(wg|yg|rg|pt|white|yellow|rose|gold|platinum|\b\d{1,2}\s*k\b)/i.test(compact(value));
const isLikelyCoverage = (value?: string | null) => /(eternity|full|half|3\/4|quarter|stone|pav|halo|solitaire)/i.test(compact(value));
const isLikelyQuality = (value?: string | null) => /(vvs|vs|si|if|fl|lab|ef|gh|ij)/i.test(compact(value));
const isLikelyWeight = (value?: string | null) => /(ctw|carat|carats|\bct\b)/i.test(compact(value));
const isLikelyRingSize = (value?: string | null) => /^(?:\d+(?:\.\d+)?|size\s*\d+(?:\.\d+)?|ring size\s*\d+(?:\.\d+)?)$/i.test(compact(value));

const sanitizeSelection = (selection?: QuoteSummaryPayload['selection'] | null): QuoteSummaryPayload['selection'] => ({
  shape: compact(selection?.shape).split(',')[0]?.trim() || undefined,
  metalColor: isLikelyMetal(selection?.metalColor) ? compact(selection?.metalColor) : undefined,
  style: isLikelyCoverage(selection?.style) ? compact(selection?.style) : undefined,
  weight: isLikelyWeight(selection?.weight) ? compact(selection?.weight) : undefined,
  quality: isLikelyQuality(selection?.quality) ? compact(selection?.quality) : undefined,
  ringSize: isLikelyRingSize(selection?.ringSize) ? compact(selection?.ringSize).replace(/^ring size\s*/i, '').replace(/^size\s*/i, '') : undefined,
});

const selectionFromSelectedOptions = (options?: SelectedDesignOptions | null): QuoteSummaryPayload['selection'] => sanitizeSelection({
  shape: options?.shape?.label,
  metalColor: options?.metalCaratage?.label,
  style: options?.style?.label,
  weight: options?.weight?.label,
  quality: options?.quality?.label,
  ringSize: options?.ringSize?.label,
});

const selectedOptionsFromSelection = (selection?: QuoteSummaryPayload['selection'] | null): SelectedDesignOptions => ({
  shape: compact(selection?.shape) ? { id: null, label: compact(selection?.shape) } : undefined,
  metalCaratage: compact(selection?.metalColor) ? { id: null, label: compact(selection?.metalColor) } : undefined,
  style: compact(selection?.style) ? { id: null, label: compact(selection?.style) } : undefined,
  weight: compact(selection?.weight) ? { id: null, label: compact(selection?.weight) } : undefined,
  quality: compact(selection?.quality) ? { id: null, label: compact(selection?.quality) } : undefined,
  ringSize: compact(selection?.ringSize) ? { id: null, label: compact(selection?.ringSize) } : undefined,
});
const parseSelectionFromSummaryText = (value?: string | null): QuoteSummaryPayload['selection'] => {
  const text = compact(value);
  if (!text) return {};

  const labeledSelection: QuoteSummaryPayload['selection'] = {};
  text.split(/\s*[|\u2022]\s*/).forEach((part) => {
    const separatorIndex = part.indexOf(':');
    if (separatorIndex < 0) return;
    const label = part.slice(0, separatorIndex).trim().toLowerCase();
    const selectedValue = part.slice(separatorIndex + 1).trim();
    if (!selectedValue) return;

    if (label === 'stone' || label === 'shape') {
      labeledSelection.shape = selectedValue.split(',')[0]?.trim() || selectedValue;
    }
    else if (label === 'metal') labeledSelection.metalColor = selectedValue;
    else if (label === 'coverage') labeledSelection.style = selectedValue;
    else if (label === 'dia. weight' || label === 'diamond weight') labeledSelection.weight = selectedValue;
    else if (label === 'dia. quality' || label === 'diamond quality') labeledSelection.quality = selectedValue;
    else if (label === 'jewelry size' || label === 'ring size') labeledSelection.ringSize = selectedValue;
  });
  if (Object.values(labeledSelection).some(Boolean)) {
    return labeledSelection;
  }

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
    shape: compact(design.gemstones?.[0]?.stone || design.gemstones?.[0]?.stoneType) || undefined,
    metalColor: compact(design.metals?.[0]?.metalCaratage || design.metals?.[0]?.metalCaratage || design.metalCaratage) || undefined,
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

const mergeOrderIntoSummary = (base: QuoteSummaryPayload, order: Order): QuoteSummaryPayload => ({
  ...base,
  orderId: order.id || base.orderId,
  orderNumber: order.orderNumber || base.orderNumber,
  createdAt: order.createdAt || base.createdAt,
  status: order.status || base.status,
  shortDescription: order.shortDescription || base.shortDescription,
  designId: order.designId || base.designId,
  designNo: order.designNo || base.designNo,
  designName: getOrderDesignName(order) || base.designName,
  imageUrl: order.designImageUrl || base.imageUrl,
  price: Number(order.price || base.price || 0),
  customerName: compact(order.customerName) || base.customerName,
  customerPhone: compact(order.customerPhone) || base.customerPhone,
  customerEmail: compact(order.customerEmail) || base.customerEmail,
  salesRepName: compact(order.salesRepName) || compact(order.salesRepEmail) || base.salesRepName,
  purchaseOrderNumber: compact(order.purchaseOrderNumber) || base.purchaseOrderNumber,
  branchName: compact(order.branchName) || base.branchName,
  notes: compact(order.notes) || base.notes,
  selectedOptions: order.selectedOptions || base.selectedOptions || null,
});

const QuoteSummaryScreen = () => {
  const route = useRoute<SummaryRoute>();
  const navigation = useNavigation<SummaryNav>();
  const { token, user } = useAuth();
  const { summary } = route.params;

  const [displaySummary, setDisplaySummary] = useState<QuoteSummaryPayload>(summary);
  const [orderId, setOrderId] = useState(summary.orderId);
  const [orderNumber, setOrderNumber] = useState(summary.orderNumber);
  const [currentStatus, setCurrentStatus] = useState(normalizeStatus(summary.status));
  const [resolvedSelection, setResolvedSelection] = useState<QuoteSummaryPayload['selection']>(() => {
    const fromOptions = selectionFromSelectedOptions(summary.selectedOptions);
    const fromText = parseSelectionFromSummaryText(summary.shortDescription);
    const fromPayload = sanitizeSelection(summary.selection);
    return {
      shape: fromOptions.shape || fromText.shape || fromPayload.shape,
      metalColor: fromOptions.metalColor || fromText.metalColor || fromPayload.metalColor,
      style: fromOptions.style || fromText.style || fromPayload.style,
      weight: fromOptions.weight || fromText.weight || fromPayload.weight,
      quality: fromOptions.quality || fromText.quality || fromPayload.quality,
      ringSize: fromOptions.ringSize || fromText.ringSize || fromPayload.ringSize,
    };
  });
  const [sending, setSending] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2600);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const hydrateSelection = async () => {
      if (!token || !summary.orderId) return;
      try {
        const order = await fetchOrder(token, summary.orderId);
        const parsedFromOptions = selectionFromSelectedOptions(order.selectedOptions);
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
        setDisplaySummary((prev) => mergeOrderIntoSummary(prev, order));
        setOrderId(order.id || summary.orderId);
        setOrderNumber(order.orderNumber || summary.orderNumber);
        setCurrentStatus(normalizeStatus(order.status || summary.status));
        setResolvedSelection((prev) => {
          const fromPrev = sanitizeSelection(prev);
          const fromOptions = sanitizeSelection(parsedFromOptions);
          const fromOrder = sanitizeSelection(parsedFromOrder);
          const fromDesign = sanitizeSelection(parsedFromDesign);
          return {
            shape: fromOptions.shape || fromOrder.shape || fromDesign.shape || fromPrev.shape,
            metalColor: fromOptions.metalColor || fromOrder.metalColor || fromDesign.metalColor || fromPrev.metalColor,
            style: fromOptions.style || fromOrder.style || fromDesign.style || fromPrev.style,
            weight: fromOptions.weight || fromOrder.weight || fromDesign.weight || fromPrev.weight,
            quality: fromOptions.quality || fromOrder.quality || fromDesign.quality || fromPrev.quality,
            ringSize: fromOptions.ringSize || fromOrder.ringSize || fromDesign.ringSize || fromPrev.ringSize,
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

  const retailPrice = Number(displaySummary.price || 0);
  const summaryStatus = statusLabel(currentStatus);

  const itemLine1 = useMemo(
    () => `Metal: ${resolvedSelection.metalColor || '-'} - Diamond Spread: ${resolvedSelection.style || '-'}`,
    [resolvedSelection.metalColor, resolvedSelection.style],
  );
  const itemLine2 = useMemo(
    () => `Diamond: ${resolvedSelection.quality || '-'} - ${toCtwLabel(resolvedSelection.weight) || '-'}`,
    [resolvedSelection.quality, resolvedSelection.weight],
  );
  const itemLine3 = useMemo(
    () => `Ring Size: ${resolvedSelection.ringSize || '-'} - Stone: ${resolvedSelection.shape || '-'}`,
    [resolvedSelection.ringSize, resolvedSelection.shape],
  );

  const statusFlow = useMemo(() => {
    const key = normalizeStatus(currentStatus);
    const pendingDone = ['PENDING_APPROVAL', 'APPROVED', 'IN_PRODUCTION', 'COMPLETED'].includes(key);
    const approvedDone = ['APPROVED', 'IN_PRODUCTION', 'COMPLETED'].includes(key);
    const completedDone = key === 'COMPLETED';
    return {
      created: true,
      pending: pendingDone,
      approved: approvedDone,
      completed: completedDone,
    };
  }, [currentStatus]);

  const handleSendForApproval = useCallback(async () => {
    if (!token || !user?.companyId || !user?.branchId) {
      setError('Company and branch are required.');
      return;
    }
    if (!displaySummary.designId) {
      setError('Design reference is missing for this quote.');
      return;
    }

    setSending(true);
    setError(null);
    try {
      const targetStatus = getOrderSubmitStatus('PENDING_APPROVAL', user?.role);

      const payload = {
        designId: displaySummary.designId,
        selectedOptions: displaySummary.selectedOptions || selectedOptionsFromSelection(resolvedSelection),
        shortDescription: [
          ['Stone', resolvedSelection.shape],
          ['Metal', resolvedSelection.metalColor],
          ['Diamond Spread', resolvedSelection.style],
          ['Dia. Weight', resolvedSelection.weight],
          ['Dia. Quality', resolvedSelection.quality],
          ['Jewelry Size', resolvedSelection.ringSize],
        ]
          .filter(([, value]) => Boolean(compact(value)))
          .map(([label, value]) => `${label}: ${compact(value)}`)
          .join(' | '),
        purchaseOrderNumber: displaySummary.purchaseOrderNumber || undefined,
        customerName: displaySummary.customerName || undefined,
        customerPhone: displaySummary.customerPhone || undefined,
        customerEmail: displaySummary.customerEmail || undefined,
        notes: displaySummary.notes || undefined,
        status: targetStatus,
      };

      let nextOrderId = orderId;
      let nextOrderNumber = orderNumber;
      if (nextOrderId) {
        const updated = await updateOrder(token, nextOrderId, payload);
        trackOrderChanged(
          updated.id,
          diffChanges(
            {
              status: currentStatus,
              shortDescription: displaySummary.shortDescription,
              purchaseOrderNumber: displaySummary.purchaseOrderNumber,
              customerName: displaySummary.customerName,
              customerPhone: displaySummary.customerPhone,
              customerEmail: displaySummary.customerEmail,
              notes: displaySummary.notes,
            },
            {
              status: updated.status,
              shortDescription: updated.shortDescription,
              purchaseOrderNumber: updated.purchaseOrderNumber,
              customerName: updated.customerName,
              customerPhone: updated.customerPhone,
              customerEmail: updated.customerEmail,
              notes: updated.notes,
            },
          ),
        );
        nextOrderId = updated.id;
        nextOrderNumber = updated.orderNumber || nextOrderNumber;
        setDisplaySummary((prev) => mergeOrderIntoSummary(prev, updated));
      } else {
        const created = await createOrder(token, {
          companyId: user.companyId,
          branchId: user.branchId,
          designId: displaySummary.designId,
          quantity: 1,
          price: retailPrice,
          shortDescription: payload.shortDescription,
          selectedOptions: payload.selectedOptions,
          purchaseOrderNumber: payload.purchaseOrderNumber,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          customerEmail: payload.customerEmail,
          notes: payload.notes,
          status: targetStatus,
        });
        trackOrderCreated(created.id, {
          orderNumber: created.orderNumber,
          designId: created.designId,
          status: created.status,
          price: created.price,
        });
        nextOrderId = created.id;
        nextOrderNumber = created.orderNumber || nextOrderNumber;
        setDisplaySummary((prev) => mergeOrderIntoSummary(prev, created));
      }

      setOrderId(nextOrderId);
      setOrderNumber(nextOrderNumber);
      setCurrentStatus(targetStatus);
      Alert.alert(
        targetStatus === 'APPROVED' ? 'Approved' : 'Sent',
        targetStatus === 'APPROVED' ? 'Order approved successfully.' : 'Order sent for approval.',
      );
    } catch (err: any) {
      setError(err?.message || 'Unable to process order.');
    } finally {
      setSending(false);
    }
  }, [token, user, displaySummary, retailPrice, orderId, orderNumber, resolvedSelection, currentStatus]);

  const statusKey = useMemo(() => normalizeStatus(currentStatus), [currentStatus]);
  const shouldShowSalesRep = Boolean(user && user.role !== 'SALES_REP');
  const canModifyCurrentOrder = canEditOrderByStatus(statusKey, user?.role);

  const handleBackToOrders = useCallback(() => {
    (navigation as any).navigate('OrdersTab', {
      screen: 'Orders',
    });
  }, [navigation]);

  const handleOpenOrderDetails = useCallback(() => {
    if (orderId) {
      navigation.navigate('OrderDetail', { orderId });
      return;
    }
    navigation.goBack();
  }, [navigation, orderId]);

  const handleDownloadPdf = useCallback(async () => {
    if (!token || !orderId) {
      Alert.alert('PDF unavailable', 'Please create the order before downloading PDF.');
      return;
    }

    const safeOrderNo = compact(orderNumber || displaySummary.orderNumber || orderId)
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'order';
    const fileName = `${safeOrderNo}-summary.pdf`;
    const localUri = `${FileSystem.cacheDirectory}${fileName}`;

    setDownloadingPdf(true);
    try {
      const writeTarget = await requestPdfWriteTarget();
      if (writeTarget === undefined) {
        return;
      }

      const result = await FileSystem.downloadAsync(getOrderPdfUrl(orderId), localUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (result.status !== 200) {
        throw new Error('Unable to download PDF.');
      }

      if (writeTarget) {
        const base64 = await FileSystem.readAsStringAsync(result.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(
          writeTarget,
          fileName,
          'application/pdf',
        );
        await FileSystem.writeAsStringAsync(targetUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        showToast('File downloaded successfully.');
        await openSavedPdfLocation(writeTarget, targetUri);
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Save or share order PDF',
        });
        showToast('File downloaded successfully.');
      } else {
        showToast('File downloaded successfully.');
        Alert.alert('Downloaded', `PDF saved at ${result.uri}`);
      }
    } catch (err: any) {
      Alert.alert('Download failed', err?.message || 'Unable to download order PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  }, [displaySummary.orderNumber, orderId, orderNumber, showToast, token]);

  const actionConfig = useMemo(() => {
    if (statusKey === 'QUOTE') {
      return {
        primaryLabel: sending
          ? 'Processing...'
          : canApproveOrderByStatus('PENDING_APPROVAL', user?.role)
          ? 'Approve Order ->'
          : 'Send for Approval ->',
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
    if (statusKey === 'COMPLETED') {
      return {
        primaryLabel: 'Order Completed',
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

  const handleModifyOrder = useCallback(() => {
    if (!canModifyCurrentOrder) {
      setError('This order cannot be changed in its current status.');
      return;
    }

    const designId = compact(displaySummary.designId);
    if (!designId) {
      setError('Design reference is missing for this order.');
      return;
    }

    const draft: QuoteBuilderDraft = {
      orderId,
      orderNumber,
      createdAt: displaySummary.createdAt,
      status: currentStatus,
      designId,
      designNo: compact(displaySummary.designNo) || orderNumber || 'Order',
      designName: displaySummary.designName || displaySummary.designNo || null,
      imageUrl: displaySummary.imageUrl || null,
      unitPrice: retailPrice,
      shortDescription: displaySummary.shortDescription || undefined,
      selectedOptions: displaySummary.selectedOptions || selectedOptionsFromSelection(resolvedSelection),
      selection: sanitizeSelection(resolvedSelection),
      purchaseOrderNumber: displaySummary.purchaseOrderNumber || undefined,
      customerName: displaySummary.customerName || undefined,
      customerPhone: displaySummary.customerPhone || undefined,
      customerEmail: displaySummary.customerEmail || undefined,
      notes: displaySummary.notes || undefined,
    };

    navigation.navigate('QuoteBuilder', { draft });
  }, [canModifyCurrentOrder, currentStatus, displaySummary, navigation, orderId, orderNumber, resolvedSelection, retailPrice]);

  const handleManagerPendingDecision = useCallback(
    async (nextStatus: 'APPROVED' | 'CANCELLED') => {
      if (!token || !orderId) {
        setError('Order reference is missing.');
        return;
      }

      setSending(true);
      setError(null);
      try {
        const updated = await updateOrder(token, orderId, { status: nextStatus });
        trackOrderChanged(orderId, [
          { field: 'status', oldValue: currentStatus, newValue: updated.status || nextStatus },
        ]);
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
    [currentStatus, orderId, token],
  );

  const showManagerPendingActions = canApproveOrderByStatus(statusKey, user?.role);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={handleBackToOrders} activeOpacity={0.9}>
          <Ionicons name="chevron-back" size={17} color="#7A6E61" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Summary</Text>
        <TouchableOpacity
          style={[styles.printBtn, downloadingPdf ? styles.printBtnDisabled : null]}
          activeOpacity={0.9}
          onPress={handleDownloadPdf}
          disabled={downloadingPdf}
        >
          <Ionicons name="print-outline" size={14} color="#8A7C6B" />
          <Text style={styles.printText}>{downloadingPdf ? 'PDF...' : 'Print'}</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <View style={styles.topLineRow}>
            <Text style={styles.quoteText}>QUOTE #{orderNumber || 'DRAFT'}</Text>
            {/* <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{summaryStatus}</Text>
            </View> */}
          </View>
          <Text style={styles.mainTitle}>Order Summary</Text>
          <Text style={styles.metaText}>
            Created {formatSummaryDate(displaySummary.createdAt)} - {displaySummary.customerName || 'Client'}
          </Text>
          <View style={styles.topDivider} />
          {shouldShowSalesRep && displaySummary.salesRepName ? (
            <View style={styles.salesRepRow}>
              <View style={styles.salesRepIcon}>
                <Ionicons name="person-outline" size={13} color="#9A7843" />
              </View>
              <Text style={styles.salesRepLabel}>SALES REP</Text>
              <Text style={styles.salesRepName} numberOfLines={1}>
                {displaySummary.salesRepName}
              </Text>
            </View>
          ) : null}
          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>CLIENT</Text>
              <Text style={styles.infoValue}>{displaySummary.customerName || '-'}</Text>
              <Text style={styles.infoSub}>{displaySummary.customerPhone || '-'}</Text>
              <Text style={styles.infoSub}>{displaySummary.customerEmail || '-'}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>PURCHASE ORDER</Text>
              <Text style={styles.poValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
                {displaySummary.purchaseOrderNumber || '-'}
              </Text>
              <Text style={styles.infoSub}>{displaySummary.branchName || '-'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.itemRow}>
            {displaySummary.imageUrl ? (
              <Image source={{ uri: displaySummary.imageUrl, cache: 'force-cache' }} style={styles.itemImage} />
            ) : (
              <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                <Ionicons name="diamond-outline" size={16} color="#B2874A" />
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{displaySummary.designName || displaySummary.designNo || '-'}</Text>
              <Text style={styles.itemLine}>{itemLine1}</Text>
              <Text style={styles.itemLine}>{itemLine2}</Text>
              <Text style={styles.itemLine}>{itemLine3}</Text>
              {displaySummary.notes ? <Text style={styles.itemLine}>Notes: {displaySummary.notes}</Text> : null}
            </View>
            <Text style={styles.itemPrice}>{formatCurrency(retailPrice).replace('.00', '')}</Text>
          </View>
          {statusKey === 'CANCELLED' ? (
            <View style={styles.cancelledNoticeBox}>
              <Ionicons name="close-circle-outline" size={14} color="#C34F4F" />
              <Text style={styles.cancelledNoticeText}>This order has been cancelled.</Text>
            </View>
          ) : canModifyCurrentOrder ? (
            <TouchableOpacity style={styles.modifyBtn} onPress={handleModifyOrder} activeOpacity={0.9}>
              <Ionicons name="create-outline" size={14} color="#93826F" />
              <Text style={styles.modifyBtnText}>Modify this order</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.modifyLockedBox}>
              <Ionicons name="lock-closed-outline" size={14} color="#93826F" />
              <Text style={styles.modifyLockedText}>This order cannot be changed in its current status.</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          {statusKey === 'CANCELLED' ? (
            <View style={styles.statusTrackRow}>
              <View style={styles.statusStep}>
                <View style={[styles.statusDot, styles.statusDotDoneGreen]}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
                <Text style={[styles.statusText, styles.statusTextDoneGreen]}>Created</Text>
              </View>
              <View style={[styles.statusLine, { backgroundColor: '#F8B4B4' }]} />
              <View style={styles.statusStep}>
                <View style={[styles.statusDot, { backgroundColor: '#C34F4F', borderColor: '#C34F4F' }]}>
                  <Ionicons name="close" size={10} color="#fff" />
                </View>
                <Text style={[styles.statusText, { color: '#C34F4F', fontWeight: '700' }]}>Cancelled</Text>
              </View>
            </View>
          ) : (
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
                <View style={[styles.statusDot, statusFlow.completed ? styles.statusDotDoneNeutral : null]}>
                  {statusFlow.completed ? <Ionicons name="checkmark" size={10} color="#fff" /> : null}
                </View>
                <Text style={[styles.statusText, statusFlow.completed ? styles.statusTextDoneNeutral : null]}>Completed</Text>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 138 }} />
      </ScrollView>

      {toastMessage ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={styles.toastPill}>
            <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      ) : null}

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
          <View style={styles.smallActionsRow}>
            <TouchableOpacity
              style={styles.smallBtn}
              onPress={statusKey === 'QUOTE' ? handleModifyOrder : handleOpenOrderDetails}
              activeOpacity={0.9}
            >
              <Ionicons name={actionConfig.leftIcon} size={13} color="#D08748" />
              <Text style={[styles.smallBtnText, styles.smallBtnTextEdit]} numberOfLines={1}>
                {actionConfig.leftLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, actionConfig.primaryDisabled ? styles.sendBtnDisabled : null]}
              onPress={handlePrimaryAction}
              activeOpacity={0.9}
              disabled={actionConfig.primaryDisabled}
            >
              <Text style={styles.sendBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                {actionConfig.primaryLabel}
              </Text>
            </TouchableOpacity>
          </View>
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
  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    alignItems: 'center',
  },
  toastPill: {
    maxWidth: 360,
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#231913',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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
  printBtnDisabled: {
    opacity: 0.65,
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
  salesRepRow: {
    minHeight: 32,
    marginBottom: 8,
    borderRadius: 9,
    backgroundColor: '#FBF7F0',
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  salesRepIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1E4CF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  salesRepLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#928679',
    fontWeight: '700',
    marginRight: 8,
  },
  salesRepName: {
    flex: 1,
    minWidth: 0,
    color: '#3B332C',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
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
  cancelledNoticeBox: {
    marginTop: 10,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F8B4B4',
    backgroundColor: '#FDF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelledNoticeText: {
    marginLeft: 6,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#9B1C1C',
  },
  modifyBtnText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#8E8072',
    fontWeight: '700',
  },
  modifyLockedBox: {
    marginTop: 10,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4D7C8',
    backgroundColor: '#FBF7F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modifyLockedText: {
    flexShrink: 1,
    marginLeft: 6,
    fontSize: 12,
    color: '#8E8072',
    fontWeight: '700',
    textAlign: 'center',
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
    gap: 8,
  },
  smallBtn: {
    flex: 0.9,
    height: 46,
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
    flex: 1.55,
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


