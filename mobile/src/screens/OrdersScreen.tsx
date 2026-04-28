import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { fetchOrders, updateOrder, updateOrderActiveStatus } from '../api/orders';
import type { Order } from '../types';
import type { OrdersStackParamList, QuoteSummaryPayload } from '../navigation/RootNavigator';

type FilterKey = 'QUOTE' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PRODUCTION' | 'SHIPPED';
type NotificationTone = 'alertGold' | 'alertRed' | 'neutral' | 'info' | 'promo';
type NotificationEntry = {
  id: string;
  orderId: string;
  title: string;
  subtitle: string;
  time: string;
  tone: NotificationTone;
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'QUOTE', label: 'Quotes' },
  { key: 'PENDING_APPROVAL', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'IN_PRODUCTION', label: 'In Prod.' },
  { key: 'SHIPPED', label: 'Shipped' },
];

const normalizeStatus = (value?: string | null) => String(value || '').trim().toUpperCase();

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
    case 'SHIPPED':
      return 'Shipped';
    case 'COMPLETED':
      return 'Shipped';
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
  if (key === 'SHIPPED' || key === 'COMPLETED') {
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
  if (key === 'SHIPPED' || key === 'COMPLETED') return 4;
  return 0;
};

const matchesFilter = (order: Order, filter: FilterKey) => {
  const key = normalizeStatus(order.status);
  if (filter === 'SHIPPED') return key === 'SHIPPED' || key === 'COMPLETED';
  return key === filter;
};

const safeText = (value?: string | null, fallback = '-') => {
  const trimmed = String(value || '').trim();
  return trimmed || fallback;
};

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
  String(value || '').replace(/^(metal|coverage|diamond quality|diamond|quality|carat weight|weight|ring size|shape)\s*[:\-]\s*/i, '').trim();

const parseSelectionFromSummaryText = (value?: string | null): QuoteSummaryPayload['selection'] => {
  const text = String(value || '').trim();
  if (!text) return {};

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
  const navigation = useNavigation<NativeStackNavigationProp<OrdersStackParamList>>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('PENDING_APPROVAL');
  const [actingOrderId, setActingOrderId] = useState<string | null>(null);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const fullAccess =
        user?.role === 'BRANCH_MANAGER' || user?.role === 'COMPANY_ADMIN' || user?.role === 'SALES_REP';
      const response = await fetchOrders(token, 1, 100, fullAccess ? 'ALL' : 'ACTIVE');
      const rows = (response.data || []).filter(
        (order) => order.isActive !== false && normalizeStatus(order.status) !== 'CANCELLED',
      );
      rows.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      setOrders(rows);
    } catch (err: any) {
      setError(err?.message || 'Unable to load orders');
    } finally {
      setLoading(false);
    }
  }, [token, user?.role]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  const countsByFilter = useMemo(() => {
    const initial: Record<FilterKey, number> = {
      QUOTE: 0,
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      IN_PRODUCTION: 0,
      SHIPPED: 0,
    };

    orders.forEach((order) => {
      const key = normalizeStatus(order.status);
      if (key === 'QUOTE') initial.QUOTE += 1;
      else if (key === 'PENDING_APPROVAL') initial.PENDING_APPROVAL += 1;
      else if (key === 'APPROVED') initial.APPROVED += 1;
      else if (key === 'IN_PRODUCTION') initial.IN_PRODUCTION += 1;
      else if (key === 'SHIPPED' || key === 'COMPLETED') initial.SHIPPED += 1;
    });

    return initial;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const searchable = [
        order.orderNumber,
        order.designNo,
        order.purchaseOrderNumber,
        order.customerName,
        order.customerEmail,
        order.shortDescription,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !term || searchable.includes(term);
      return matchesSearch && matchesFilter(order, selectedFilter);
    });
  }, [orders, search, selectedFilter]);

  const notificationEntries = useMemo<NotificationEntry[]>(() => {
    const rows = [...orders].sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return rows.slice(0, 24).map((order) => {
      const status = normalizeStatus(order.status);
      const orderLabel = order.orderNumber || order.id;
      const detail = safeText(order.designNo, 'Order update');
      const customer = safeText(order.customerName, 'Customer');
      const subtitle = `${detail} - ${customer}`;

      if (status === 'PENDING_APPROVAL') {
        return {
          id: `notify-${order.id}-pending`,
          orderId: order.id,
          title: `Approval needed: ${orderLabel}`,
          subtitle,
          time: formatRelativeTime(order.updatedAt || order.createdAt),
          tone: 'alertGold',
        };
      }

      if (status === 'CANCELLED') {
        return {
          id: `notify-${order.id}-cancelled`,
          orderId: order.id,
          title: `Cancelled: ${orderLabel}`,
          subtitle,
          time: formatRelativeTime(order.updatedAt || order.createdAt),
          tone: 'alertRed',
        };
      }

      if (status === 'SHIPPED' || status === 'COMPLETED') {
        return {
          id: `notify-${order.id}-shipped`,
          orderId: order.id,
          title: `Shipped: ${orderLabel}`,
          subtitle,
          time: formatRelativeTime(order.updatedAt || order.createdAt),
          tone: 'info',
        };
      }

      if (status === 'QUOTE') {
        return {
          id: `notify-${order.id}-quote`,
          orderId: order.id,
          title: `Quote draft: ${orderLabel}`,
          subtitle,
          time: formatRelativeTime(order.updatedAt || order.createdAt),
          tone: 'promo',
        };
      }

      return {
        id: `notify-${order.id}-activity`,
        orderId: order.id,
        title: `${statusLabel(status)}: ${orderLabel}`,
        subtitle,
        time: formatRelativeTime(order.updatedAt || order.createdAt),
        tone: 'neutral',
      };
    });
  }, [orders]);

  const alerts = useMemo(
    () => notificationEntries.filter((entry) => entry.tone === 'alertGold' || entry.tone === 'alertRed').slice(0, 5),
    [notificationEntries],
  );
  const recentActivity = useMemo(
    () => notificationEntries.filter((entry) => entry.tone === 'neutral').slice(0, 6),
    [notificationEntries],
  );
  const updates = useMemo(
    () => notificationEntries.filter((entry) => entry.tone === 'info' || entry.tone === 'promo').slice(0, 6),
    [notificationEntries],
  );
  const hasAnyNotifications = alerts.length || recentActivity.length || updates.length;
  const isSalesRepOrBranchManager = user?.role === 'SALES_REP' || user?.role === 'BRANCH_MANAGER';
  const isBranchManager = user?.role === 'BRANCH_MANAGER';
  const isCompanyAdmin = user?.role === 'COMPANY_ADMIN';
  const headerTitle = isSalesRepOrBranchManager ? 'Branch Orders' : 'My Orders';
  const visibleFilters = useMemo(() => {
    if (isBranchManager || isCompanyAdmin) {
      return FILTERS.filter((filter) => filter.key !== 'QUOTE');
    }
    return FILTERS;
  }, [isBranchManager, isCompanyAdmin]);

  useEffect(() => {
    if (!notificationsVisible) {
      setNotificationCount(notificationEntries.length);
    }
  }, [notificationEntries.length, notificationsVisible]);

  useEffect(() => {
    if ((isBranchManager || isCompanyAdmin) && selectedFilter === 'QUOTE') {
      setSelectedFilter('PENDING_APPROVAL');
    }
  }, [isBranchManager, isCompanyAdmin, selectedFilter]);

  const openOrderSummary = useCallback(
    (order: Order) => {
      const summary: QuoteSummaryPayload = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        shortDescription: order.shortDescription || undefined,
        designId: order.designId || '',
        designNo: safeText(order.designNo, order.orderNumber),
        designName: order.designNo || null,
        imageUrl: order.designImageUrl || null,
        price: Number(order.price || 0),
        selection: parseSelectionFromSummaryText(order.shortDescription),
        customerName: order.customerName || undefined,
        customerPhone: order.customerPhone || undefined,
        customerEmail: order.customerEmail || undefined,
        purchaseOrderNumber: order.purchaseOrderNumber || undefined,
        branchName: order.branchName || undefined,
        notes: order.notes || undefined,
      };
      navigation.navigate('QuoteSummary', { summary });
    },
    [navigation],
  );

  const handleContinueEditing = useCallback(
    (order: Order) => {
      if (order.designId) {
        (navigation as any).navigate('DesignsTab', {
          screen: 'QuoteBuilder',
          params: {
            draft: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              createdAt: order.createdAt,
              status: order.status,
              designId: order.designId,
              designNo: safeText(order.designNo, order.orderNumber),
              designName: order.designNo || null,
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
        setOrders((prev) => prev.filter((row) => row.id !== order.id));
      } catch (err: any) {
        setError(err?.message || 'Unable to suspend draft');
      } finally {
        setActingOrderId(null);
      }
    },
    [token],
  );

  const markCancelled = useCallback(
    async (order: Order) => {
      if (!token) return;
      setActingOrderId(order.id);
      try {
        await updateOrder(token, order.id, { status: 'CANCELLED' });
        setOrders((prev) => prev.filter((row) => row.id !== order.id));
      } catch (err: any) {
        setError(err?.message || 'Unable to update order');
      } finally {
        setActingOrderId(null);
      }
    },
    [token],
  );

  const approvePending = useCallback(
    async (order: Order) => {
      if (!token) return;
      setActingOrderId(order.id);
      try {
        await updateOrder(token, order.id, { status: 'APPROVED' });
        setOrders((prev) =>
          prev.map((row) => (row.id === order.id ? { ...row, status: 'APPROVED' } : row)),
        );
      } catch (err: any) {
        setError(err?.message || 'Unable to approve order');
      } finally {
        setActingOrderId(null);
      }
    },
    [token],
  );

  const renderTimeline = (status?: string | null) => {
    const activeIndex = statusTimelineIndex(status);
    const labels = ['Order\nCreated', 'Pending\nApproval', 'Approved', 'In\nProd.', 'Shipped'];
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
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnGhostRed]}
            onPress={() => suspendDraft(order)}
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
      if (isBranchManager) {
        return (
          <View style={styles.actionRowThree}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnGhostRedCompact]}
              onPress={() => markCancelled(order)}
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
            style={[styles.actionBtn, styles.actionBtnGhostRed]}
            onPress={() => markCancelled(order)}
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

  const renderOrderCard = ({ item }: { item: Order }) => {
    const pill = statusPillStyle(item.status);
    const price = formatMoney(item.price);
    const title = safeText(item.designNo, item.orderNumber);
    const subtitle =
      item.shortDescription?.replace(/\s*\|\s*/g, ' - ') ||
      [item.customerName, item.purchaseOrderNumber ? `PO: ${item.purchaseOrderNumber}` : null].filter(Boolean).join(' - ');

    const thumbRingColor =
      normalizeStatus(item.status) === 'SHIPPED' || normalizeStatus(item.status) === 'COMPLETED'
        ? '#4A8ADA'
        : normalizeStatus(item.status) === 'APPROVED'
          ? '#B2874A'
          : normalizeStatus(item.status) === 'PENDING_APPROVAL'
            ? '#C4826C'
            : '#B4A692';

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={() => openOrderSummary(item)}>
        <View style={styles.cardTopRow}>
          <View style={styles.thumbWrap}>
            {item.designImageUrl ? (
              <Image source={{ uri: item.designImageUrl, cache: 'force-cache' }} style={styles.thumbImage} />
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
                <Text style={[styles.statusPillText, { color: pill.textColor }]}>{statusLabel(item.status)}</Text>
              </View>
            </View>

            <View style={styles.cardMetaRow}>
              <Text style={styles.cardMeta} numberOfLines={3}>
                {safeText(subtitle, 'No details')}
              </Text>
              <Text style={styles.cardPrice}>{price}</Text>
            </View>
          </View>
        </View>

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
    setNotificationCount(0);
  }, []);

  const closeNotifications = useCallback(() => {
    setNotificationsVisible(false);
  }, []);

  const openFromNotification = useCallback(
    (entry: NotificationEntry) => {
      setNotificationsVisible(false);
      const targetOrder = orders.find((order) => order.id === entry.orderId);
      if (targetOrder) {
        openOrderSummary(targetOrder);
      }
    },
    [orders, openOrderSummary],
  );

  const getNotificationCardStyle = useCallback((tone: NotificationTone) => {
    if (tone === 'alertGold') return [styles.notificationCardBase, styles.notificationCardGold];
    if (tone === 'alertRed') return [styles.notificationCardBase, styles.notificationCardRed];
    if (tone === 'info') return [styles.notificationCardBase, styles.notificationCardInfo];
    if (tone === 'promo') return [styles.notificationCardBase, styles.notificationCardPromo];
    return [styles.notificationCardBase, styles.notificationCardNeutral];
  }, []);

  const getNotificationDotStyle = useCallback((tone: NotificationTone) => {
    if (tone === 'alertGold') return [styles.notificationDot, styles.notificationDotGold];
    if (tone === 'alertRed') return [styles.notificationDot, styles.notificationDotRed];
    if (tone === 'info') return [styles.notificationDot, styles.notificationDotInfo];
    if (tone === 'promo') return [styles.notificationDot, styles.notificationDotPromo];
    return [styles.notificationDot, styles.notificationDotNeutral];
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.brandHeader}>
        <View style={styles.brandLeft}>
          <Ionicons name="flash-sharp" size={23} color="#C89D5A" style={styles.brandBoltIcon} />
          <View>
            <Text style={styles.brandTitle}>BLITZ NYC</Text>
            <Text style={styles.brandSub}>Built for closers</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.9} onPress={openNotifications}>
          <Ionicons name="notifications-outline" size={16} color="#7A6E61" />
          {notificationCount > 0 ? (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={styles.topPanel}>
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
          {isSalesRepOrBranchManager ? (
            <Text style={styles.pageTotalText}>{formatCount(orders.length)} total</Text>
          ) : null}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#B0A79E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search PO# or customer name..."
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

        <View style={styles.filterRow}>{visibleFilters.map((item) => renderFilterChip(item))}</View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOrders} tintColor="#8a6b55" colors={['#8a6b55']} />}
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

      <Modal visible={notificationsVisible} transparent animationType="fade" onRequestClose={closeNotifications}>
        <TouchableWithoutFeedback onPress={closeNotifications}>
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
                            onPress={() => openFromNotification(entry)}
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
                            onPress={() => openFromNotification(entry)}
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

                    {updates.length ? (
                      <View style={styles.notificationSection}>
                        <Text style={styles.notificationSectionLabel}>UPDATES</Text>
                        {updates.map((entry) => (
                          <TouchableOpacity
                            key={entry.id}
                            style={getNotificationCardStyle(entry.tone)}
                            onPress={() => openFromNotification(entry)}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  modalOverlayLock: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.22)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  notificationsWindow: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE6DB',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    maxHeight: '82%',
  },
  notificationsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  notificationsTitle: {
    fontSize: 30,
    lineHeight: 33,
    color: '#211A14',
    fontWeight: '800',
  },
  markReadText: {
    color: '#B2874A',
    fontSize: 12,
    fontWeight: '700',
  },
  notificationSection: {
    marginBottom: 11,
  },
  notificationSectionLabel: {
    fontSize: 11,
    letterSpacing: 1.1,
    color: '#9B9185',
    fontWeight: '800',
    marginBottom: 6,
  },
  notificationCardBase: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  notificationCardGold: {
    backgroundColor: '#FAF4E8',
    borderColor: '#E6D3B2',
  },
  notificationCardRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#ECCACA',
  },
  notificationCardNeutral: {
    backgroundColor: '#FBF9F6',
    borderColor: '#E4DBD0',
  },
  notificationCardInfo: {
    backgroundColor: '#EDF3FE',
    borderColor: '#CBDBF6',
  },
  notificationCardPromo: {
    backgroundColor: '#FBF4E8',
    borderColor: '#E7D4B7',
  },
  notificationCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginRight: 7,
  },
  notificationDotGold: {
    backgroundColor: '#C9A45F',
  },
  notificationDotRed: {
    backgroundColor: '#DE5F5F',
  },
  notificationDotNeutral: {
    backgroundColor: '#B8AAA0',
  },
  notificationDotInfo: {
    backgroundColor: '#6C8FCB',
  },
  notificationDotPromo: {
    backgroundColor: '#C48E3C',
  },
  notificationCardTitle: {
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
    color: '#2D261F',
    fontWeight: '700',
  },
  notificationCardSubtitle: {
    fontSize: 12,
    lineHeight: 15,
    color: '#685E54',
    fontWeight: '500',
  },
  notificationCardTime: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
    color: '#938779',
    fontWeight: '500',
  },
  emptyNotifBox: {
    borderWidth: 1,
    borderColor: '#E8DFD3',
    borderRadius: 12,
    backgroundColor: '#FAF8F5',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotifString: {
    fontSize: 13,
    color: '#85796C',
    fontWeight: '600',
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 2,
  },
  filterChip: {
    minWidth: 66,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#DCCFC0',
    backgroundColor: '#FAF8F5',
    marginRight: 8,
    marginBottom: 6,
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
  card: {
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
  cardPrice: {
    fontSize: 18,
    color: '#B2874A',
    fontWeight: '800',
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
    backgroundColor: '#1A1715',
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
    backgroundColor: '#2F8A58',
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
});

export default OrdersScreen;
