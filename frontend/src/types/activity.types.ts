export type ActivityEventChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

export type ActivityEventItem = {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  deviceId: string | null;
  module: string;
  event: string;
  screen: string | null;
  entityType: string | null;
  entityId: string | null;
  entityLabel?: string | null;
  entityStatus?: string | null;
  designId?: string | number | null;
  designNo?: string | null;
  changes: ActivityEventChange[] | null;
  data: Record<string, unknown> | null;
  createdAt: string;
};

export type ActivityEventsQuery = {
  page?: number;
  limit?: number;
  userId?: string;
  from?: string;
  to?: string;
  module?: string;
  event?: string;
  deviceId?: string;
  entityType?: string;
  entityId?: string;
};

export type ActivityEventsResponse = {
  data: ActivityEventItem[];
  total: number;
  page: number;
  totalPages: number;
};

