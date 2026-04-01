import type { AuthUser, Order } from '../types';

export type OrderNotification = {
  id: string;
  orderId: string;
  title: string;
  subtitle: string;
  time: string;
  status: string;
};

const formatRelativeTime = (date?: string | null) => {
  if (!date) return 'Just now';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Just now';

  const diffMs = Date.now() - parsed.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD}d ago`;
  return parsed.toLocaleDateString();
};

export const buildOrderNotifications = (
  orders: Order[],
  user: AuthUser | null,
): { count: number; items: OrderNotification[] } => {
  if (!user) return { count: 0, items: [] };

  if (user.role === 'BRANCH_MANAGER') {
    const pending = orders
      .filter((order) => String(order.status || '').toUpperCase() === 'PENDING_APPROVAL')
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      );

    return {
      count: pending.length,
      items: pending.map((order) => ({
        id: `pending-${order.id}`,
        orderId: order.id,
        title: `Approval needed: ${order.orderNumber}`,
        subtitle:
          `${order.designNo || 'Order awaiting review'} • ${
            order.salesRepName || order.salesRepEmail || 'Sales rep'
          }`,
        time: formatRelativeTime(order.createdAt),
        status: 'PENDING_APPROVAL',
      })),
    };
  }

  if (user.role === 'SALES_REP') {
    const updates = orders
      .filter(
        (order) =>
          order.salesRepId === user.id &&
          ['APPROVED', 'CANCELLED'].includes(String(order.status || '').toUpperCase()),
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime(),
      );

    return {
      count: updates.length,
      items: updates.map((order) => ({
        id: `decision-${order.id}`,
        orderId: order.id,
        title:
          String(order.status || '').toUpperCase() === 'APPROVED'
            ? `Approved: ${order.orderNumber}`
            : `Cancelled: ${order.orderNumber}`,
        subtitle: order.designNo || 'Order decision updated',
        time: formatRelativeTime(order.updatedAt || order.createdAt),
        status: String(order.status || '').toUpperCase(),
      })),
    };
  }

  return { count: 0, items: [] };
};
