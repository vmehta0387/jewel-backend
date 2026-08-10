import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  markNotificationRead,
} from '../api/notifications';
import NotificationPopover from '../components/NotificationPopover';
import { fetchBranchEmployees } from '../api/branchEmployees';
import { fetchOrders, updateOrder, updateOrderActiveStatus } from '../api/orders';
import type { BranchEmployee, Order } from '../types';
import type { OrdersStackParamList, QuoteSummaryPayload } from '../navigation/RootNavigator';
import {
  getSpiffClaimTargetFromNotification,
  getOrderIdFromNotification,
  type NotificationFeedEntry,
} from '../utils/appNotifications';
import { canApproveOrderByStatus } from '../utils/orderLifecycle';
import {
  trackNotificationAction,
  trackNotificationViewed,
  trackOrderChanged,
  trackOrderFilterApplied,
  trackOrderListViewed,
  trackOrderViewed,
} from '../utils/activityEvents';

type FilterKey = 'QUOTE' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED';
type ConfirmationAction = 'deleteDraft' | 'cancelOrder';
type PopoverPosition = { top: number; left: number };

const CONFIRM_POPOVER_WIDTH = 312;
const CONFIRM_POPOVER_MARGIN = 12;
const CONFIRM_POPOVER_ESTIMATED_HEIGHT = 184;
const THEME_ACTION_COLOR = '#BE9851';
const ORDERS_PAGE_LIMIT = 15;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'QUOTE', label: 'Quotes' },
  { key: 'PENDING_APPROVAL', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'IN_PRODUCTION', label: 'In Prod.' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const normalizeStatus = (value?: string | null): FilterKey => {
  const status = String(value || '').trim().toUpperCase();
  if (status === 'QUOTE') return 'QUOTE';
  if (status === 'PENDING' || status === 'PENDING_APPROVAL') return 'PENDING_APPROVAL';
  if (status === 'APPROVED') return 'APPROVED';
  if (status === 'PRODUCTION' || status === 'IN_PRODUCTION') return 'IN_PRODUCTION';
  if (status === 'COMPLETED') return 'COMPLETED';
  if (status === 'CANCELLED' || status === 'REJECTED') return 'CANCELLED';
  return 'PENDING_APPROVAL';
};

const statusLabel = (status?: string | null) => {
  const key = normalizeStatus(status);
  switch (key) {
    case 'QUOTE':
      return 'Quote';
    case 'PENDING_APPROVAL':
      return 'Pending';
    case 'APPROVED':
      return 'Approved';
    case 'IN_PRODUCTION':
      return 'In Prod.';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return key || 'Pending';
  }
};

const statusPillStyle = (status?: string | null) => {
  const key = normalizeStatus(status);
  if (key === 'QUOTE') {
    return {
      backgroundColor: '#F8F2E8',
      borderColor: '#DCC8A9',
      textColor: '#8C7048',
    };
  }
  if (key === 'PENDING_APPROVAL') {
    return {
      backgroundColor: '#F8F5F0',
      borderColor: '#DCCFC0',
      textColor: '#2A221C',
    };
  }
  if (key === 'APPROVED') {
    return {
      backgroundColor: '#E7F2EA',
      borderColor: '#BFD9C8',
      textColor: '#2C7B4D',
    };
  }
  if (key === 'IN_PRODUCTION') {
    return {
      backgroundColor: '#EAF1FD',
      borderColor: '#BFD2F1',
      textColor: '#3D6CAF',
    };
  }
  if (key === 'COMPLETED') {
    return {
      backgroundColor: '#E8EFFC',
      borderColor: '#C4D4F4',
      textColor: '#3D63A3',
    };
  }
  return {
    backgroundColor: '#F4E8E8',
    borderColor: '#E1C4C4',
    textColor: '#9B5555',
  };
};

const formatMoney = (value: number | null | undefined) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numeric);
};

const formatCount = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const statusTimelineIndex = (status?: string | null) => {
  const key = normalizeStatus(status);
  if (key === 'QUOTE') return 1;
  if (key === 'PENDING_APPROVAL') return 1;
  if (key === 'APPROVED') return 2;
  if (key === 'IN_PRODUCTION') return 3;
  if (key === 'COMPLETED') return 4;
  return 0;
};

const matchesFilter = (order: Order, filter: FilterKey) => {
  const key = normalizeStatus(order.status);
  return key === filter;
};

const safeText = (value?: string | null, fallback = '-') => {
  const trimmed = String(value || '').trim();
  return trimmed || fallback;
};

const getOrderDesignName = (order: Order) =>
  String(order.designName || order.design?.designName || '').trim();

const getOrderDesignNo = (order: Order) =>
  String(order.designNo || order.design?.designNo || '').trim();

const formatRelativeTime = (date?: string | null) => {
  if (!date) return 'Just now';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Just now';
  const diffMs = Date.now() - parsed.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return parsed.toLocaleDateString();
};

const stripSelectionLabel = (value?: string | null) =>
  String(value || '').replace(/^(metal|coverage|diamond quality|diamond|quality|carat weight|weight|ring size|stone|shape)\s*[:\-]\s*/i, '').trim();

const parseSelectionFromSummaryText = (value?: string | null): QuoteSummaryPayload['selection'] => {
  const text = String(value || '').trim();
  if (!text) return {};

  const labeledSelection: QuoteSummaryPayload['selection'] = {};
  text.split(/\s*[|•]\s*/).forEach((part) => {
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

  const tokens = text
    .replace(/[|•]/g, ' - ')
    .replace(/\s*-\s*/g, ' - ')
    .split(' - ')
    .map((item) => item.trim())
    .filter(Boolean);

  const next: QuoteSummaryPayload['selection'] = {};
  for (const item of tokens) {
    const cleaned = stripSelectionLabel(item);
    const lower = cleaned.toLowerCase();
    if (!next.weight && /(ctw|carat|carats|\bct\b)/i.test(lower)) {
      next.weight = cleaned;
      continue;
    }
    if (!next.ringSize && /^(?:\d+(?:\.\d+)?|size\s*\d+(?:\.\d+)?|ring size\s*\d+(?:\.\d+)?)$/i.test(lower)) {
      next.ringSize = cleaned.replace(/^ring size\s*[:\-]?\s*/i, '').replace(/^size\s*[:\-]?\s*/i, '');
      continue;
    }
    if (!next.quality && /(vvs|vs|si|if|fl|lab|ef|gh|ij)/i.test(lower)) {
      next.quality = cleaned;
      continue;
    }
    if (!next.metalColor && /(wg|yg|rg|pt|white|yellow|rose|gold|platinum|\b\d{1,2}\s*k\b)/i.test(lower)) {
      next.metalColor = cleaned;
      continue;
    }
    if (!next.style && /(eternity|full|half|3\/4|quarter|stone|pav|halo|solitaire)/i.test(lower)) {
      next.style = cleaned;
    }
  }

  return next;
};

const OrdersScreen = () => {
  const { token, user } = useAuth();
  const { unreadCount: notificationCount } = useNotifications();
  const navigation = useNavigation<NativeStackNavigationProp<OrdersStackParamList>>();
  const route = useRoute<RouteProp<OrdersStackParamList, 'Orders'>>();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const confirmationButtonRefs = useRef<Record<string, React.ElementRef<typeof TouchableOpacity> | null>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('PENDING_APPROVAL');
  const [selectedSalesRepId, setSelectedSalesRepId] = useState('ALL');
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Partial<Record<string, number>>>({});
  const [branchSalesReps, setBranchSalesReps] = useState<BranchEmployee[]>([]);
  const [actingOrderId, setActingOrderId] = useState<string | null>(null);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    action: ConfirmationAction;
    order: Order;
  } | null>(null);
  const [cancelPopoverPosition, setCancelPopoverPosition] = useState<PopoverPosition>({
    top: 0,
    left: CONFIRM_POPOVER_MARGIN,
  });
  const isBranchManager = user?.role === 'BRANCH_MANAGER';
  const canSeeSalesRepFilter = Boolean(user && user.role !== 'SALES_REP');

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const loadOrders = useCallback(async (pageToLoad = 1, append = false) => {
    if (!token) return;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const [response, employeeRows] = await Promise.all([
        fetchOrders(token, pageToLoad, ORDERS_PAGE_LIMIT, 'ACTIVE', {
          orderStatus: selectedFilter,
          search: debouncedSearch,
          salesRepId: selectedSalesRepId === 'ALL' ? undefined : selectedSalesRepId,
          includeStatusCounts: true,
        }),
        canSeeSalesRepFilter ? fetchBranchEmployees(token).catch(() => []) : Promise.resolve([]),
      ]);
      const rows = (response.data || []).filter(
        (order) => order.isActive !== false,
      );
      setOrders((current) => {
        if (!append) return rows;
        const seen = new Set(current.map((order) => order.id));
        return current.concat(rows.filter((order) => !seen.has(order.id)));
      });
      setOrdersPage(Number(response.page || pageToLoad));
      setOrdersTotalPages(Math.max(1, Number(response.totalPages || 1)));
      setOrdersTotal(Number(response.total || 0));
      setStatusCounts(response.statusCounts || {});
      setBranchSalesReps(employeeRows.filter((employee) => employee.role === 'SALES_REP'));
      const trackingData = {
        page: Number(response.page || pageToLoad),
        total: Number(response.total || 0),
        resultCount: rows.length,
        filters: {
          status: selectedFilter,
          search: debouncedSearch || undefined,
          salesRepId: selectedSalesRepId === 'ALL' ? undefined : selectedSalesRepId,
        },
      };
      trackOrderListViewed(trackingData);
      if (!append && (debouncedSearch || selectedSalesRepId !== 'ALL' || selectedFilter !== 'PENDING_APPROVAL')) {
        trackOrderFilterApplied(trackingData.filters);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load orders');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [canSeeSalesRepFilter, debouncedSearch, selectedFilter, selectedSalesRepId, token]);

  const loadMoreOrders = useCallback(() => {
    if (loading || loadingMore || ordersPage >= ordersTotalPages) return;
    loadOrders(ordersPage + 1, true);
  }, [loadOrders, loading, loadingMore, ordersPage, ordersTotalPages]);

  const salesRepOptions = useMemo(() => {
    const reps = new Map<string, string>();
    branchSalesReps.forEach((employee) => {
      const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email;
      if (name && employee.id) {
        reps.set(employee.id, name);
      }
    });

    orders.forEach((order) => {
      if (!order.salesRepId) return;
      const name = order.salesRepName?.trim() || order.salesRepEmail?.trim();
      if (name && !reps.has(order.salesRepId)) {
        if (!/admin/i.test(name)) {
          reps.set(order.salesRepId, name);
        }
      }
    });

    return Array.from(reps, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [branchSalesReps, orders]);

  useEffect(() => {
    if (selectedSalesRepId === 'ALL') return;
    if (!salesRepOptions.some((rep) => rep.id === selectedSalesRepId)) {
      setSelectedSalesRepId('ALL');
    }
  }, [salesRepOptions, selectedSalesRepId]);

  const salesRepFilteredOrders = useMemo(
    () =>
      selectedSalesRepId === 'ALL'
        ? orders
        : orders.filter((order) => order.salesRepId === selectedSalesRepId),
    [orders, selectedSalesRepId],
  );

  const countsByFilter = useMemo(() => {
    const initial: Record<FilterKey, number> = {
      QUOTE: Number(statusCounts.QUOTE || 0),
      PENDING_APPROVAL: Number(statusCounts.PENDING_APPROVAL || 0),
      APPROVED: Number(statusCounts.APPROVED || 0),
      IN_PRODUCTION: Number(statusCounts.IN_PRODUCTION || 0),
      COMPLETED: Number(statusCounts.COMPLETED || 0),
      CANCELLED: Number(statusCounts.CANCELLED || 0),
    };
    return initial;
  }, [statusCounts]);

  const filteredOrders = salesRepFilteredOrders;

  const isSalesRepOrBranchManager = user?.role === 'SALES_REP' || user?.role === 'BRANCH_MANAGER';
  const headerTitle = isSalesRepOrBranchManager ? 'Branch Orders' : 'My Orders';
  const visibleFilters = FILTERS;

  useEffect(() => {
    const term = search.trim().toLowerCase();
    if (!term) return;

    if (countsByFilter[selectedFilter] > 0) return;

    const bestMatchTab = visibleFilters.find((f) => countsByFilter[f.key] > 0);
    if (bestMatchTab) {
      setSelectedFilter(bestMatchTab.key);
    }
  }, [search, countsByFilter, selectedFilter, visibleFilters]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
      if (route.params?.initialFilter) {
        setSelectedFilter(route.params.initialFilter);
      }
    }, [loadOrders, route.params?.initialFilter]),
  );

  const openOrderSummary = useCallback(
    (order: Order) => {
      const summary: QuoteSummaryPayload = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        shortDescription: order.shortDescription || undefined,
        designId: order.designId || '',
        designNo: safeText(getOrderDesignNo(order), order.orderNumber),
        designName: getOrderDesignName(order) || null,
        imageUrl: order.designImageUrl || null,
        price: Number(order.price || 0),
        selection: parseSelectionFromSummaryText(order.shortDescription),
        customerName: order.customerName || undefined,
        customerPhone: order.customerPhone || undefined,
        customerEmail: order.customerEmail || undefined,
        salesRepName: order.salesRepName || order.salesRepEmail || undefined,
        purchaseOrderNumber: order.purchaseOrderNumber || undefined,
        branchName: order.branchName || undefined,
        notes: order.notes || undefined,
      };
      trackOrderViewed(order.id, {
        orderNumber: order.orderNumber,
        status: order.status,
        designId: order.designId,
      });
      navigation.navigate('QuoteSummary', { summary });
    },
    [navigation],
  );

  const handleContinueEditing = useCallback(
    (order: Order) => {
      if (order.designId) {
        navigation.navigate('QuoteBuilder', {
          draft: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            status: order.status,
            designId: order.designId,
            designNo: safeText(getOrderDesignNo(order), order.orderNumber),
            designName: getOrderDesignName(order) || null,
            imageUrl: order.designImageUrl || null,
            unitPrice: Number(order.price || 0),
            shortDescription: order.shortDescription || undefined,
            selection: parseSelectionFromSummaryText(order.shortDescription),
            purchaseOrderNumber: order.purchaseOrderNumber || undefined,
            customerName: order.customerName || undefined,
            customerPhone: order.customerPhone || undefined,
            customerEmail: order.customerEmail || undefined,
            notes: order.notes || undefined,
          },
        });
        return;
      }
      openOrderSummary(order);
    },
    [navigation, openOrderSummary],
  );

  const suspendDraft = useCallback(
    async (order: Order) => {
      if (!token) return;
      setActingOrderId(order.id);
      try {
        await updateOrderActiveStatus(token, order.id, false);
        trackOrderChanged(order.id, [
          { field: 'isActive', oldValue: order.isActive !== false, newValue: false },
        ]);
        await loadOrders();
      } catch (err: any) {
        setError(err?.message || 'Unable to suspend draft');
      } finally {
        setActingOrderId(null);
      }
    },
    [loadOrders, token],
  );

  const markCancelled = useCallback(
    async (order: Order) => {
      if (!token) return;
      setActingOrderId(order.id);
      try {
        await updateOrder(token, order.id, { status: 'CANCELLED' });
        trackOrderChanged(order.id, [
          { field: 'status', oldValue: order.status, newValue: 'CANCELLED' },
        ]);
        await loadOrders();
      } catch (err: any) {
        setError(err?.message || 'Unable to update order');
      } finally {
        setActingOrderId(null);
      }
    },
    [loadOrders, token],
  );

  const requestConfirmation = useCallback((order: Order, action: ConfirmationAction) => {
    const buttonNode = confirmationButtonRefs.current[`${order.id}-${action}`];
    const openAtFallbackPosition = () => {
      setCancelPopoverPosition({
        top: 176,
        left: Math.max(CONFIRM_POPOVER_MARGIN, (screenWidth - CONFIRM_POPOVER_WIDTH) / 2),
      });
      setPendingConfirmation({ action, order });
    };

    if (!buttonNode) {
      openAtFallbackPosition();
      return;
    }

    buttonNode.measureInWindow((x, y, w, h) => {
      const wantedLeft = x + w / 2 - CONFIRM_POPOVER_WIDTH / 2;
      const maxLeft = Math.max(CONFIRM_POPOVER_MARGIN, screenWidth - CONFIRM_POPOVER_WIDTH - CONFIRM_POPOVER_MARGIN);
      const wantedTop = y + h + 8;
      const topAbove = Math.max(CONFIRM_POPOVER_MARGIN, y - CONFIRM_POPOVER_ESTIMATED_HEIGHT - 8);
      setCancelPopoverPosition({
        top: wantedTop + CONFIRM_POPOVER_ESTIMATED_HEIGHT <= screenHeight - CONFIRM_POPOVER_MARGIN ? wantedTop : topAbove,
        left: Math.max(CONFIRM_POPOVER_MARGIN, Math.min(wantedLeft, maxLeft)),
      });
      setPendingConfirmation({ action, order });
    });
  }, [screenHeight, screenWidth]);

  const requestDeleteDraft = useCallback(
    (order: Order) => requestConfirmation(order, 'deleteDraft'),
    [requestConfirmation],
  );

  const requestCancelOrder = useCallback(
    (order: Order) => requestConfirmation(order, 'cancelOrder'),
    [requestConfirmation],
  );

  const closeConfirmation = useCallback(() => {
    setPendingConfirmation(null);
  }, []);

  const confirmPendingAction = useCallback(() => {
    if (!pendingConfirmation) return;
    const { action, order } = pendingConfirmation;
    setPendingConfirmation(null);
    if (action === 'deleteDraft') {
      void suspendDraft(order);
      return;
    }
    void markCancelled(order);
  }, [markCancelled, pendingConfirmation, suspendDraft]);

  const approvePending = useCallback(
    async (order: Order) => {
      if (!token) return;
      if (!canApproveOrderByStatus(order.status, user?.role)) return;
      setActingOrderId(order.id);
      try {
        await updateOrder(token, order.id, { status: 'APPROVED' });
        trackOrderChanged(order.id, [
          { field: 'status', oldValue: order.status, newValue: 'APPROVED' },
        ]);
        await loadOrders();
      } catch (err: any) {
        setError(err?.message || 'Unable to approve order');
      } finally {
        setActingOrderId(null);
      }
    },
    [loadOrders, token, user?.role],
  );

  const renderTimeline = (status?: string | null) => {
    const activeIndex = statusTimelineIndex(status);
    const labels = ['Order\nCreated', 'Pending\nApproval', 'Approved', 'In\nProd.', 'Completed'];
    return (
      <View style={styles.timelineWrap}>
        <Text style={styles.timelineTitle}>ORDER TIMELINE</Text>
        <View style={styles.timelineTrackRow}>
          {labels.map((label, index) => {
            const done = index <= activeIndex;
            const dotStyle =
              index === 0 && done
                ? styles.timelineDotGreen
                : done
                  ? styles.timelineDotGold
                  : styles.timelineDotIdle;
            const textStyle =
              index === 0 && done
                ? styles.timelineLabelGreen
                : done
                  ? styles.timelineLabelActive
                  : styles.timelineLabelIdle;
            return (
              <React.Fragment key={`timeline-${label}`}>
                <View style={styles.timelineStep}>
                  <View style={[styles.timelineDot, dotStyle]}>
                    {done ? <Ionicons name="checkmark" size={10} color="#FFFFFF" /> : null}
                  </View>
                  <Text style={[styles.timelineLabel, textStyle]}>{label}</Text>
                </View>
                {index < labels.length - 1 ? (
                  <View style={[styles.timelineLine, index < activeIndex ? styles.timelineLineActive : null]} />
                ) : null}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    );
  };

  const renderActions = (order: Order) => {
    const status = normalizeStatus(order.status);
    if (status === 'QUOTE') {
      if (isBranchManager) {
        return (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnGhost, styles.quoteManagerViewButton]}
            onPress={() => openOrderSummary(order)}
            activeOpacity={0.9}
          >
            <Text style={styles.actionBtnGhostText}>View Details -&gt;</Text>
          </TouchableOpacity>
        );
      }

      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            ref={(node) => {
              confirmationButtonRefs.current[`${order.id}-deleteDraft`] = node;
            }}
            style={[styles.actionBtn, styles.actionBtnGhostRed]}
            onPress={() => requestDeleteDraft(order)}
            activeOpacity={0.9}
            disabled={actingOrderId === order.id}
          >
            <Text style={styles.actionBtnGhostRedText}>{actingOrderId === order.id ? 'Deleting...' : 'Delete Draft'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnBlack]} onPress={() => handleContinueEditing(order)} activeOpacity={0.9}>
            <Text style={styles.actionBtnBlackText}>Continue Editing -&gt;</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'PENDING_APPROVAL') {
      if (canApproveOrderByStatus(order.status, user?.role)) {
        return (
          <View style={styles.actionRowThree}>
            <TouchableOpacity
              ref={(node) => {
                confirmationButtonRefs.current[`${order.id}-cancelOrder`] = node;
              }}
              style={[styles.actionBtn, styles.actionBtnGhostRedCompact]}
              onPress={() => requestCancelOrder(order)}
              activeOpacity={0.9}
              disabled={actingOrderId === order.id}
            >
              <Ionicons name="close" size={13} color="#CC5757" />
              <Text style={styles.actionBtnGhostRedTextCompact}>
                {actingOrderId === order.id ? 'Rejecting...' : 'Reject'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnGhostCompact]}
              onPress={() => handleContinueEditing(order)}
              activeOpacity={0.9}
            >
              <Ionicons name="pencil-outline" size={12} color="#7B7268" />
              <Text style={styles.actionBtnGhostTextCompact}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnApproveCompact]}
              onPress={() => approvePending(order)}
              activeOpacity={0.9}
              disabled={actingOrderId === order.id}
            >
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              <Text style={styles.actionBtnApproveTextCompact}>
                {actingOrderId === order.id ? 'Approving...' : 'Approve'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            ref={(node) => {
              confirmationButtonRefs.current[`${order.id}-cancelOrder`] = node;
            }}
            style={[styles.actionBtn, styles.actionBtnGhostRed]}
            onPress={() => requestCancelOrder(order)}
            activeOpacity={0.9}
            disabled={actingOrderId === order.id}
          >
            <Text style={styles.actionBtnGhostRedText}>{actingOrderId === order.id ? 'Canceling...' : 'Cancel Order'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGhost]} onPress={() => openOrderSummary(order)} activeOpacity={0.9}>
            <Text style={styles.actionBtnGhostText}>View Details -&gt;</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'APPROVED' || status === 'IN_PRODUCTION') {
      return (
        <>
          {renderTimeline(status)}
          <TouchableOpacity style={styles.requestBtn} onPress={() => openOrderSummary(order)} activeOpacity={0.9}>
            <Ionicons name="ellipse-outline" size={11} color="#B2874A" />
            <Text style={styles.requestBtnText}>Request Cancellation / Modification</Text>
          </TouchableOpacity>
        </>
      );
    }

    return null;
  };

  const activeConfirmationOrder = pendingConfirmation?.order || null;
  const activeConfirmationOrderId = activeConfirmationOrder?.id || null;
  const confirmationIsDeleteQuote = pendingConfirmation?.action === 'deleteDraft';
  const confirmationTitle = confirmationIsDeleteQuote ? 'Delete this quote?' : 'Cancel this order?';
  const confirmationMessage = confirmationIsDeleteQuote
    ? 'This quote draft will be removed from your orders list.'
    : 'This order will be removed from your active orders list.';
  const confirmationDangerText = confirmationIsDeleteQuote ? 'Delete Quote' : 'Cancel Order';

  const getOrderCardDisplay = (order: Order) => {
    const pill = statusPillStyle(order.status);
    const price = formatMoney(order.price);
    const title = safeText(getOrderDesignName(order), safeText(getOrderDesignNo(order), order.orderNumber));
    const subtitle =
      order.shortDescription?.replace(/\s*\|\s*/g, ' - ') ||
      order.customerName;
    const salesRepName = order.salesRepName?.trim() || order.salesRepEmail?.trim() || '';

    const thumbRingColor =
      normalizeStatus(order.status) === 'COMPLETED'
        ? '#4A8ADA'
        : normalizeStatus(order.status) === 'APPROVED'
          ? '#B2874A'
          : normalizeStatus(order.status) === 'PENDING_APPROVAL'
            ? '#C4826C'
            : '#B4A692';

    return { pill, price, title, subtitle, salesRepName, thumbRingColor };
  };

  const renderCardTop = (order: Order) => {
    const { pill, price, title, subtitle, salesRepName, thumbRingColor } = getOrderCardDisplay(order);

    return (
      <View style={styles.cardTopRow}>
        <View style={styles.thumbWrap}>
          {order.designImageUrl ? (
            <Image source={{ uri: order.designImageUrl, cache: 'force-cache' }} style={styles.thumbImage} />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <View style={[styles.thumbRing, { borderColor: thumbRingColor }]} />
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardHeadRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: pill.backgroundColor, borderColor: pill.borderColor }]}>
              <Text style={[styles.statusPillText, { color: pill.textColor }]}>{statusLabel(order.status)}</Text>
            </View>
          </View>

          <View style={styles.cardMetaRow}>
            <Text style={styles.cardMeta} numberOfLines={3}>
              {safeText(subtitle, 'No details')}
            </Text>
            <Text style={styles.cardPrice}>{price}</Text>
          </View>
          {canSeeSalesRepFilter && salesRepName ? (
            <View style={styles.cardSalesRepRow}>
              <Ionicons name="person-outline" size={11} color="#9A7843" />
              <Text style={styles.cardSalesRepText} numberOfLines={1}>
                {salesRepName}
              </Text>
            </View>
          ) : null}

          {order.purchaseOrderNumber?.trim() ? (
            <View style={styles.customerPoRow}>
              <Text style={styles.customerPoLabel}>Client PO</Text>
              <Text style={styles.customerPoValue} numberOfLines={1}>
                {order.purchaseOrderNumber.trim()}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderOrderCard = ({ item }: { item: Order }) => {
    const isCancelFocused = activeConfirmationOrderId === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isCancelFocused ? styles.cardFocused : null,
        ]}
        activeOpacity={0.92}
        onPress={() => {
          if (activeConfirmationOrderId) {
            closeConfirmation();
            return;
          }
          openOrderSummary(item);
        }}
      >
        {renderCardTop(item)}

        {renderActions(item)}
      </TouchableOpacity>
    );
  };

  const renderFilterChip = (filter: { key: FilterKey; label: string }) => {
    const selected = selectedFilter === filter.key;
    const count = countsByFilter[filter.key] || 0;
    return (
      <TouchableOpacity
        key={filter.key}
        style={[styles.filterChip, selected ? styles.filterChipActive : null]}
        onPress={() => setSelectedFilter(filter.key)}
        activeOpacity={0.9}
      >
        <View style={styles.filterChipLine}>
          <Text style={[styles.filterChipLabel, selected ? styles.filterChipLabelActive : null]}>{filter.label}</Text>
          <Text style={[styles.filterChipCount, selected ? styles.filterChipCountActive : null]}>{count}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const openNotifications = useCallback(() => {
    setNotificationsVisible(true);
  }, []);

  const closeNotifications = useCallback(() => {
    setNotificationsVisible(false);
  }, []);

  const openFromNotification = useCallback(
    async (entry: NotificationFeedEntry) => {
      if (token && !entry.isRead) {
        try {
          await markNotificationRead(token, entry.notificationId, true);
          trackNotificationAction(entry.notificationId, 'MARK_READ', {
            source: 'OrdersScreen',
          });
        } catch {
          // ignore mark-read errors in UI tap path
        }
      }
      setNotificationsVisible(false);
      trackNotificationViewed(entry.notificationId, {
        source: 'OrdersScreen',
        title: entry.title,
      });
      const orderId = getOrderIdFromNotification(entry);
      const targetOrder = orders.find((order) => order.id === orderId);
      if (targetOrder) {
        openOrderSummary(targetOrder);
        return;
      }

      if (orderId) {
        navigation.navigate('OrderDetail', { orderId });
        return;
      }

      const spiffTarget = getSpiffClaimTargetFromNotification(entry);
      if (spiffTarget) {
        trackNotificationAction(entry.notificationId, 'ACTION_OPENED', {
          source: 'OrdersScreen',
          target: 'SpiffRewards',
        });
        (navigation as any).navigate('DashboardTab', {
          screen: 'SpiffRewards',
          params: spiffTarget,
        });
      }
    },
    [navigation, openOrderSummary, orders, token],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.brandHeader} onTouchStart={activeConfirmationOrderId ? closeConfirmation : undefined}>
        <View style={styles.brandLeft}>
          <Image source={require('../../assets/icon.png')} style={[styles.brandBoltIcon, { width: 23, height: 23, resizeMode: 'contain' }]} />
          <View>
            <Text style={styles.brandTitle}>BLITZ NYC</Text>
            <Text style={styles.brandSub}>Built for closers</Text>
          </View>
        </View>
        <View style={styles.brandActions}>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.9}
            onPress={() => loadOrders()}
            disabled={loading}
          >
            <Ionicons name="refresh-outline" size={16} color={loading ? '#BBAFA4' : '#7A6E61'} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.9} onPress={openNotifications}>
            <Ionicons name="notifications-outline" size={16} color="#7A6E61" />
            {notificationCount > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.topPanel} onTouchStart={activeConfirmationOrderId ? closeConfirmation : undefined}>
        <View style={styles.pageTitleRow}>
          <View style={styles.pageTitleLeft}>
            {isSalesRepOrBranchManager ? (
              <TouchableOpacity
                style={styles.pageTitleBackBtn}
                onPress={() => (navigation as any).navigate('DashboardTab')}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={17} color="#8C837A" style={styles.pageTitleBackIcon} />
              </TouchableOpacity>
            ) : null}
            <Text style={styles.pageTitle}>{headerTitle}</Text>
          </View>
          <Text style={styles.pageTotalText}>{formatCount(ordersTotal)} total</Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#B0A79E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search PO# or client name..."
            placeholderTextColor="#A59D96"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#b2a294" />
            </TouchableOpacity>
          ) : null}
        </View>

        {canSeeSalesRepFilter && salesRepOptions.length > 0 ? (
          <View style={styles.salesRepFilter}>
            <Text style={styles.salesRepFilterLabel}>Sales Rep</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.salesRepFilterList}
            >
              {[{ id: 'ALL', name: 'All' }, ...salesRepOptions].map((rep) => {
                const selected = selectedSalesRepId === rep.id;
                return (
                  <TouchableOpacity
                    key={rep.id}
                    style={[styles.salesRepChip, selected ? styles.salesRepChipActive : null]}
                    onPress={() => setSelectedSalesRepId(rep.id)}
                    activeOpacity={0.88}
                  >
                    <Text
                      style={[styles.salesRepChipText, selected ? styles.salesRepChipTextActive : null]}
                      numberOfLines={1}
                    >
                      {rep.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          keyboardShouldPersistTaps="handled"
        >
          {visibleFilters.map((item) => renderFilterChip(item))}
        </ScrollView>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onTouchStart={activeConfirmationOrderId ? closeConfirmation : undefined}
        onScrollBeginDrag={closeConfirmation}
        onEndReached={loadMoreOrders}
        onEndReachedThreshold={0.35}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOrders} tintColor="#8a6b55" colors={['#8a6b55']} />}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.listFooter}>
              <ActivityIndicator size="small" color="#8a6b55" />
              <Text style={styles.listFooterText}>Loading more...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="small" color="#8a6b55" />
              <Text style={styles.emptyText}>Loading orders...</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="receipt-outline" size={24} color="#A67F3F" />
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptyText}>Try another filter or search keyword.</Text>
            </View>
          )
        }
      />

      {activeConfirmationOrder ? <View pointerEvents="none" style={styles.confirmationScreenDim} /> : null}

      <Modal
        visible={Boolean(activeConfirmationOrder)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeConfirmation}
      >
        <TouchableWithoutFeedback onPress={closeConfirmation}>
          <View style={styles.cancelMenuOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.cancelPopover,
                  {
                    top: cancelPopoverPosition.top,
                    left: cancelPopoverPosition.left,
                  },
                ]}
              >
                <View style={styles.cancelPopoverHeader}>
                  <View style={styles.cancelPopoverIcon}>
                    <Ionicons name="alert-circle-outline" size={18} color="#CC5757" />
                  </View>
                  <View style={styles.cancelPopoverTextWrap}>
                    <Text style={styles.cancelPopoverTitle}>{confirmationTitle}</Text>
                    <Text style={styles.cancelPopoverMessage}>{confirmationMessage}</Text>
                  </View>
                </View>
                <View style={styles.cancelPopoverOrderBox}>
                  <View style={styles.cancelPopoverOrderCol}>
                    <Text style={styles.cancelPopoverOrderLabel}>Order No.</Text>
                    <Text style={styles.cancelPopoverOrderValue} numberOfLines={1}>
                      {activeConfirmationOrder?.orderNumber || '-'}
                    </Text>
                  </View>
                  <View style={styles.cancelPopoverOrderDivider} />
                  <View style={styles.cancelPopoverOrderCol}>
                    <Text style={styles.cancelPopoverOrderLabel}>Design</Text>
                    <Text style={styles.cancelPopoverOrderValue} numberOfLines={1}>
                      {activeConfirmationOrder
                        ? getOrderDesignName(activeConfirmationOrder) || getOrderDesignNo(activeConfirmationOrder) || '-'
                        : '-'}
                    </Text>
                  </View>
                </View>
                <View style={styles.cancelPopoverActions}>
                  <TouchableOpacity style={styles.cancelPopoverKeepBtn} activeOpacity={0.9} onPress={closeConfirmation}>
                    <Text style={styles.cancelPopoverKeepText}>Keep</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelPopoverDangerBtn} activeOpacity={0.9} onPress={confirmPendingAction}>
                    <Text style={styles.cancelPopoverDangerText}>{confirmationDangerText}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <NotificationPopover
        visible={notificationsVisible}
        onClose={closeNotifications}
        onOpenNotification={openFromNotification}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  confirmationScreenDim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
    elevation: 8,
    backgroundColor: 'rgba(31, 26, 21, 0.34)',
  },
  brandHeader: {
    height: 66,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E1D7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBoltIcon: {
    marginRight: 9,
    marginTop: -2,
  },
  brandTitle: {
    fontSize: 16,
    letterSpacing: 2.4,
    color: '#1E1E1E',
    fontWeight: '800',
  },
  brandSub: {
    marginTop: 1,
    fontSize: 10,
    fontStyle: 'italic',
    color: '#B18441',
    fontWeight: '500',
  },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DED4C8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDFBF8',
  },
  bellBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D84141',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  topPanel: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  pageTitle: {
    fontSize: 17,
    lineHeight: 22,
    color: '#1F1A15',
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pageTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageTitleBackBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitleBackIcon: {
    marginRight: 4,
    marginLeft: -2,
    marginTop: 1,
  },
  pageTotalText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#9A9188',
    fontWeight: '500',
  },
  searchBox: {
    minHeight: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#DCCFC0',
    backgroundColor: '#FAF8F5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#2C1E16',
    height: 38,
    includeFontPadding: false,
    fontWeight: '500',
  },
  salesRepFilter: {
    marginTop: 9,
  },
  salesRepFilterLabel: {
    marginBottom: 5,
    fontSize: 11,
    lineHeight: 14,
    color: '#6F665D',
    fontWeight: '700',
  },
  salesRepFilterList: {
    paddingRight: 4,
  },
  salesRepChip: {
    maxWidth: 150,
    minHeight: 30,
    marginRight: 7,
    paddingHorizontal: 11,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DCCFC0',
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  salesRepChipActive: {
    borderColor: '#B88B43',
    backgroundColor: '#F6EBD8',
  },
  salesRepChipText: {
    fontSize: 11,
    color: '#746A61',
    fontWeight: '500',
  },
  salesRepChipTextActive: {
    color: '#7D5B24',
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 12,
  },
  filterChip: {
    minWidth: 66,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#DCCFC0',
    backgroundColor: '#FAF8F5',
    marginRight: 8,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  filterChipActive: {
    backgroundColor: '#1E1A17',
    borderColor: '#1E1A17',
  },
  filterChipLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipLabel: {
    fontSize: 10,
    color: '#7A7168',
    fontWeight: '600',
  },
  filterChipLabelActive: {
    color: '#FFFFFF',
  },
  filterChipCount: {
    fontSize: 10,
    color: '#7A7168',
    fontWeight: '700',
    marginLeft: 4,
  },
  filterChipCountActive: {
    color: '#FFFFFF',
  },
  errorText: {
    marginHorizontal: 12,
    marginTop: 2,
    marginBottom: 4,
    color: '#b14b42',
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 18,
    paddingTop: 2,
    flexGrow: 1,
  },
  listFooter: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listFooterText: {
    marginTop: 6,
    fontSize: 11,
    color: '#8A8178',
    fontWeight: '700',
  },
  card: {
    position: 'relative',
    borderWidth: 1.2,
    borderColor: '#E8DED2',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 10,
    marginBottom: 10,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 9,
    elevation: 3,
  },
  cardFocused: {
    zIndex: 12,
    borderColor: '#E7C2C2',
    transform: [{ scale: 1.018 }],
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#F3ECE2',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    flex: 1,
  },
  cardHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardTitle: {
    flex: 1,
    marginRight: 8,
    fontSize: 17,
    lineHeight: 20,
    color: '#1F1A15',
    fontWeight: '700',
  },
  statusPill: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 10,
    borderWidth: 1,
    justifyContent: 'center',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardMeta: {
    flex: 1,
    marginRight: 8,
    fontSize: 11,
    lineHeight: 14,
    color: '#7C746A',
    fontWeight: '500',
  },
  cardSalesRepRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSalesRepText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 4,
    fontSize: 11,
    lineHeight: 14,
    color: '#7A6040',
    fontWeight: '700',
  },
  cardPrice: {
    fontSize: 18,
    color: '#B2874A',
    fontWeight: '800',
  },
  customerPoRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerPoLabel: {
    marginRight: 5,
    fontSize: 11,
    lineHeight: 14,
    color: '#7C746A',
    fontWeight: '800',
  },
  customerPoValue: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 14,
    color: '#2C241D',
    fontWeight: '400',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  actionRowThree: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 6,
  },
  actionBtn: {
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 4,
  },
  actionBtnBlack: {
    flex: 1.35,
    backgroundColor: THEME_ACTION_COLOR,
  },
  actionBtnBlackText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  actionBtnGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D3CBC0',
    backgroundColor: '#F7F4F0',
  },
  actionBtnGhostText: {
    color: '#7B7268',
    fontSize: 13,
    fontWeight: '700',
  },
  quoteManagerViewButton: {
    marginTop: 10,
  },
  actionBtnGhostRed: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E7C2C2',
    backgroundColor: '#FDF1F1',
  },
  actionBtnGhostRedCompact: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E7C2C2',
    backgroundColor: '#FDF1F1',
    borderRadius: 11,
    height: 36,
    paddingHorizontal: 8,
  },
  actionBtnGhostRedText: {
    color: '#CC5757',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelMenuOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cancelPopover: {
    position: 'absolute',
    width: CONFIRM_POPOVER_WIDTH,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E7C2C2',
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  cancelPopoverHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cancelPopoverIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3F1',
    borderWidth: 1,
    borderColor: '#F2D6D1',
    marginRight: 9,
  },
  cancelPopoverTextWrap: {
    flex: 1,
  },
  cancelPopoverTitle: {
    fontSize: 14,
    lineHeight: 18,
    color: '#251D17',
    fontWeight: '800',
  },
  cancelPopoverMessage: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#7B7268',
    fontWeight: '500',
  },
  cancelPopoverOrderBox: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEE1D6',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cancelPopoverOrderCol: {
    flex: 1,
    minWidth: 0,
  },
  cancelPopoverOrderDivider: {
    width: 1,
    marginHorizontal: 9,
    backgroundColor: '#E8DED2',
  },
  cancelPopoverOrderLabel: {
    fontSize: 9,
    lineHeight: 12,
    color: '#A0978F',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  cancelPopoverOrderValue: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    color: '#2C1E16',
    fontWeight: '700',
  },
  cancelPopoverActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 11,
  },
  cancelPopoverKeepBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8CEC3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  cancelPopoverKeepText: {
    fontSize: 12,
    color: '#6F665C',
    fontWeight: '800',
  },
  cancelPopoverDangerBtn: {
    flex: 1.25,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CC5757',
  },
  cancelPopoverDangerText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  actionBtnGhostRedTextCompact: {
    color: '#CC5757',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnGhostCompact: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D3CBC0',
    backgroundColor: '#F7F4F0',
    borderRadius: 11,
    height: 36,
    paddingHorizontal: 8,
  },
  actionBtnGhostTextCompact: {
    color: '#7B7268',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnApproveCompact: {
    flex: 1.25,
    borderRadius: 11,
    height: 36,
    backgroundColor: THEME_ACTION_COLOR,
    paddingHorizontal: 10,
  },
  actionBtnApproveTextCompact: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  requestBtn: {
    marginTop: 10,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E0CBA6',
    backgroundColor: '#FAF5E9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestBtnText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#B2874A',
    fontWeight: '700',
  },
  timelineWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 10,
    backgroundColor: '#FAF8F5',
    padding: 8,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  timelineTitle: {
    fontSize: 10,
    letterSpacing: 1,
    color: '#8A8178',
    fontWeight: '700',
    marginBottom: 7,
  },
  timelineTrackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  timelineStep: {
    width: 46,
    alignItems: 'center',
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotGreen: {
    backgroundColor: '#2F8A58',
  },
  timelineDotGold: {
    backgroundColor: '#B2874A',
  },
  timelineDotIdle: {
    backgroundColor: '#DFD8CF',
  },
  timelineLine: {
    flex: 1,
    marginTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#D8D1C6',
  },
  timelineLineActive: {
    borderTopColor: '#4E9A6D',
    borderTopWidth: 2,
  },
  timelineLabel: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '600',
  },
  timelineLabelGreen: {
    color: '#2F8A58',
  },
  timelineLabelActive: {
    color: '#7C746A',
  },
  timelineLabelIdle: {
    color: '#B2A99E',
  },
  emptyWrap: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#3A322A',
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 3,
    fontSize: 12,
    color: '#8A8178',
    fontWeight: '500',
  },
  confirmOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: 'rgba(31, 26, 21, 0.48)',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0E5DA',
    backgroundColor: '#FFFFFF',
    padding: 18,
    alignItems: 'center',
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 8,
  },
  confirmIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3F1',
    borderWidth: 1,
    borderColor: '#F2D6D1',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: '#251D17',
    fontWeight: '800',
    textAlign: 'center',
  },
  confirmMessage: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: '#7B7268',
    fontWeight: '500',
    textAlign: 'center',
  },
  confirmOrderBox: {
    width: '100%',
    marginTop: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DED2',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  confirmOrderLabel: {
    fontSize: 10,
    lineHeight: 13,
    color: '#A0978F',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  confirmOrderValue: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 18,
    color: '#2C1E16',
    fontWeight: '700',
  },
  confirmActions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8CEC3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginRight: 9,
  },
  confirmCancelText: {
    fontSize: 13,
    color: '#6F665C',
    fontWeight: '800',
  },
  confirmDangerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CC5757',
    shadowColor: '#CC5757',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 2,
  },
  confirmDangerText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

export default OrdersScreen;
