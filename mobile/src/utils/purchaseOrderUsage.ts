import { Alert, Platform } from 'react-native';
import { fetchPurchaseOrderUsage } from '../api/orders';

export const confirmPurchaseOrderReuse = async (params: {
  token?: string | null;
  companyId?: string | null;
  branchId?: string | null;
  purchaseOrderNumber?: string | null;
  excludeOrderId?: string | null;
  onError?: (message: string) => void;
}) => {
  const normalizedPo = String(params.purchaseOrderNumber || '').trim();
  if (!params.token || !params.companyId || !normalizedPo) return true;

  try {
    const usage = await fetchPurchaseOrderUsage(params.token, {
      companyId: params.companyId,
      branchId: params.branchId,
      purchaseOrderNumber: normalizedPo,
      excludeOrderId: params.excludeOrderId,
    });
    const count = Number(usage.count || 0);
    if (count <= 0) return true;

    const examples = (usage.orders || [])
      .slice(0, 3)
      .map((entry) => [entry.orderNumber, entry.status].filter(Boolean).join(' - '))
      .filter(Boolean)
      .join('\n');
    const message = `This PO has already been used for ${count} item(s). Do you want to continue with the same PO number?${examples ? `\n\n${examples}` : ''}`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.confirm(message);
    }

    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'PO already used',
        message,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  } catch (err: any) {
    console.warn('Unable to verify PO usage:', err?.message || err);
    return true;
  }
};
