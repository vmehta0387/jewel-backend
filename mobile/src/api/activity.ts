import { apiRequest } from './client';
import type { ActivityEvent } from '../utils/activityTracker';

export const recordActivityEvents = (token: string, events: ActivityEvent[]) =>
  apiRequest<{ success: true }>('/activity-events/batch', {
    method: 'POST',
    headers: events[0]?.deviceId ? { 'x-device-id': events[0].deviceId } : undefined,
    body: JSON.stringify({ events }),
  }, token);
