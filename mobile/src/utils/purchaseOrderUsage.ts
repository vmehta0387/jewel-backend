import { Alert } from 'react-native';
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
  if (!params.token || !params.companyId || !params.branchId || !normalizedPo) return true;

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

    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'PO already used',
        `This PO has already been used for ${count} item(s). Continue?${examples ? `\n\n${examples}` : ''}`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue', onPress: () => resolve(true) },
        ],
      );
    });
  } catch (err: any) {
    params.onError?.(err?.message || 'Unable to verify PO usage.');
    return false;
  }
};
