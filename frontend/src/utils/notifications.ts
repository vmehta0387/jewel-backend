import type { NotificationItem } from '../types/notification.types';

export type NotificationSection = 'ALERTS' | 'UPDATES';

export const formatNotificationTime = (value?: string | null) => {
  if (!value) return 'Just now';
  const parsed = new Date(value);
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

export const getNotificationToneClasses = (item: NotificationItem) => {
  const type = String(item.type || '').toUpperCase();
  if (item.priority === 'P0' || type.includes('CANCELLED') || type.includes('REJECTED') || type.includes('HOLD')) {
    return {
      card: 'border-[#f0d1d1] bg-[#fff5f5] hover:bg-[#fff0f0]',
      dot: 'bg-[#d55b5b]',
    };
  }
  if (type.includes('APPROVAL') || type.includes('APPROVED')) {
    return {
      card: 'border-[#e8d4af] bg-[#fff8ee] hover:bg-[#fff5e7]',
      dot: 'bg-[#c89d5a]',
    };
  }
  if (type.includes('SHIPPED') || type.includes('FULFILLED') || type.includes('COMPLETED')) {
    return {
      card: 'border-[#d7e5fb] bg-[#f5f9ff] hover:bg-[#edf5ff]',
      dot: 'bg-[#6f8fce]',
    };
  }
  return {
    card: 'border-[#e7ded2] bg-white hover:bg-[#faf7f2]',
    dot: 'bg-[#8d8174]',
  };
};

export const getNotificationSection = (item: NotificationItem): NotificationSection => {
  const type = String(item.type || '').toUpperCase();
  if (item.priority === 'P0' || type.includes('CANCELLED') || type.includes('REJECTED') || type.includes('HOLD') || type.includes('APPROVAL')) {
    return 'ALERTS';
  }
  return 'UPDATES';
};

export const resolveNotificationPath = (item: NotificationItem) => {
  const actionUrl = String(item.actionUrl || '').trim().toLowerCase();
  const metadata = (item.metadata || {}) as Record<string, unknown>;

  if (String(item.entityType || '').trim().toUpperCase() === 'ORDER') {
    const orderId = String(item.entityId || metadata.orderId || '').trim();
    return orderId ? `/orders?open=${encodeURIComponent(orderId)}` : '/orders';
  }

  if (String(item.entityType || '').trim().toUpperCase() === 'SPIFF_CLAIM') {
    const claimId = String(item.entityId || metadata.claimId || '').trim();
    const claimNumber = String(metadata.claimNumber || '').trim();
    const params = new URLSearchParams();
    if (claimId) params.set('claimId', claimId);
    if (claimNumber) params.set('claimNumber', claimNumber);
    const qs = params.toString();
    return qs ? `/spiff?${qs}` : '/spiff';
  }

  if (actionUrl.startsWith('/users')) return '/users';
  if (actionUrl.startsWith('/products')) return '/products';
  if (actionUrl.startsWith('/branches')) return '/branches';
  if (actionUrl.startsWith('/companies')) return '/companies';
  if (actionUrl.startsWith('/spiff')) return '/spiff';
  if (actionUrl.startsWith('/orders')) return '/orders';

  const entityType = String(item.entityType || '').trim().toUpperCase();
  if (entityType === 'USER') return '/users';
  return '/dashboard';
};
