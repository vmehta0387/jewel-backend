import { recordActivityEvents } from '../api/activity';

export type ActivityModule = 'Design' | 'Order' | 'Notification' | 'Auth' | 'Navigation' | 'Profile' | 'Spiff' | string;

export type ActivityChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

export type ActivityEvent = {
  id: string;
  userId?: string | number;
  deviceId?: string;
  module: ActivityModule;
  event: string;
  screen?: string;
  entityType?: string;
  entityId?: string | number;
  changes?: ActivityChange[];
  data?: Record<string, unknown>;
  createdAt: string;
};

type TokenGetter = () => string | null | undefined;
type ActivityContextGetter = () => {
  userId?: string | number | null;
  deviceId?: string | null;
  deviceType?: string | null;
};

const MAX_QUEUE = 100;
const BATCH_SIZE = 20;
const FLUSH_DELAY_MS = 1200;

let queue: ActivityEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let getToken: TokenGetter = () => null;
let getActivityContext: ActivityContextGetter = () => ({});

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const sanitizeData = (data?: Record<string, unknown>) => {
  if (!data) return undefined;
  return Object.entries(data).reduce<Record<string, unknown>>((safe, [key, value]) => {
    const lowerKey = key.toLowerCase();
    safe[key] = /(password|token|secret|otp|pin)/.test(lowerKey) ? '[hidden]' : value;
    return safe;
  }, {});
};

const sanitizeChanges = (changes?: ActivityChange[]) => {
  if (!changes?.length) return undefined;
  return changes.map((change) => {
    const lowerField = change.field.toLowerCase();
    if (/(password|token|secret|otp|pin)/.test(lowerField)) {
      return { ...change, oldValue: '[hidden]', newValue: '[changed]' };
    }
    return change;
  });
};

const scheduleFlush = () => {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flushActivityEvents();
  }, FLUSH_DELAY_MS);
};

export const configureActivityTracker = (tokenGetter: TokenGetter) => {
  getToken = tokenGetter;
};

export const configureActivityContext = (contextGetter: ActivityContextGetter) => {
  getActivityContext = contextGetter;
};

export const trackActivity = (
  module: ActivityModule,
  event: string,
  payload: Omit<Partial<ActivityEvent>, 'id' | 'module' | 'event' | 'createdAt'> = {},
) => {
  const context = getActivityContext();
  const data = sanitizeData({
    ...(payload.data || {}),
    ...(context.deviceType ? { deviceType: context.deviceType } : {}),
  });

  queue.push({
    id: createId(),
    userId: context.userId || undefined,
    deviceId: context.deviceId || undefined,
    module,
    event,
    screen: payload.screen,
    entityType: payload.entityType,
    entityId: payload.entityId,
    changes: sanitizeChanges(payload.changes),
    data,
    createdAt: new Date().toISOString(),
  });

  if (queue.length > MAX_QUEUE) {
    queue = queue.slice(queue.length - MAX_QUEUE);
  }

  scheduleFlush();
};

export const flushActivityEvents = async () => {
  const token = getToken();
  if (!token || flushing || queue.length === 0) return;

  flushing = true;
  const events = queue.splice(0, BATCH_SIZE);

  try {
    await recordActivityEvents(token, events);
  } catch (err: any) {
    const statusCode = Number(err?.statusCode || err?.status || err?.response?.status || 0);
    if (statusCode >= 400 && statusCode < 500) return;
    queue = [...events, ...queue].slice(0, MAX_QUEUE);
  } finally {
    flushing = false;
    if (queue.length > 0) scheduleFlush();
  }
};
