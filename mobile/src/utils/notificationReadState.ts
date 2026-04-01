import AsyncStorage from '@react-native-async-storage/async-storage';

const readStateKey = (userId: string) => `order_notify_seen_${userId}`;

export const loadSeenNotificationIds = async (userId?: string | null): Promise<Set<string>> => {
  if (!userId) return new Set<string>();
  try {
    const raw = await AsyncStorage.getItem(readStateKey(userId));
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((value) => typeof value === 'string' && value.trim().length > 0));
  } catch {
    return new Set<string>();
  }
};

export const markNotificationsAsSeen = async (
  userId: string | null | undefined,
  notificationIds: string[],
): Promise<void> => {
  if (!userId || !notificationIds.length) return;
  const current = await loadSeenNotificationIds(userId);
  notificationIds.forEach((id) => {
    if (id) current.add(id);
  });

  // keep the payload bounded
  const compact = Array.from(current).slice(-500);
  await AsyncStorage.setItem(readStateKey(userId), JSON.stringify(compact));
};

