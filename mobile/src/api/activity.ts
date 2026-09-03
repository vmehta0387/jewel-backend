import { apiRequest } from './client';
import type { ActivityEvent } from '../utils/activityTracker';

type ActivityEventPayload = Omit<ActivityEvent, 'id'> & { id?: number };

const toIntegerOrUndefined = (value?: string | number) => {
  if (value === undefined || value === null || value === '') return undefined;
  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : undefined;
};

const serializeActivityEvent = (event: ActivityEvent): ActivityEventPayload => {
  const { id: _localId, entityId, userId, ...rest } = event;

  return {
    ...rest,
    userId: toIntegerOrUndefined(userId),
    entityId: toIntegerOrUndefined(entityId),
  };
};

export const recordActivityEvents = (token: string, events: ActivityEvent[]) =>
  apiRequest<{ success: true }>('/activity-events/batch', {
    method: 'POST',
    headers: events[0]?.deviceId ? { 'x-device-id': events[0].deviceId } : undefined,
    body: JSON.stringify({ events: events.map(serializeActivityEvent) }),
  }, token);
