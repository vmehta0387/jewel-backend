import api from './api';
import type { ActivityEventsQuery, ActivityEventsResponse } from '../types/activity.types';

const compactQuery = (query: ActivityEventsQuery) =>
  Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== ''),
  );

export const fetchActivityEvents = async (query: ActivityEventsQuery) => {
  const response = await api.get<ActivityEventsResponse>('/activity-events', {
    params: compactQuery(query),
  });
  return response.data;
};
