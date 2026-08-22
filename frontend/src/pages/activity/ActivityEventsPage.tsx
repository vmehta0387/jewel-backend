import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Pagination from '../../components/common/Pagination';
import { fetchActivityEvents } from '../../services/activityEvents';
import type { ActivityEventItem, ActivityEventsQuery } from '../../types/activity.types';

type Filters = {
  userId: string;
  from: string;
  to: string;
  module: string;
  event: string;
  deviceId: string;
  entityType: string;
  entityId: string;
};

const DEFAULT_LIMIT = 20;
const emptyFilters: Filters = {
  userId: '',
  from: '',
  to: '',
  module: '',
  event: '',
  deviceId: '',
  entityType: '',
  entityId: '',
};

const fieldClassName = 'w-full rounded-lg border border-[#dfd3c4] bg-white px-3 py-2 text-left text-sm text-slate-900 outline-none transition focus:border-[#b98e45] focus:ring-2 focus:ring-[#b98e45]/15';
const labelClassName = 'mb-1.5 block text-left text-xs font-bold uppercase tracking-[0.12em] text-[#7e6f61]';

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatLabel = (value: string | null | undefined) => {
  if (!value) return 'Not provided';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'Blank';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const summarizeData = (value: Record<string, unknown> | null) => {
  if (!value) return [];
  return Object.entries(value).slice(0, 4);
};

const getUserTitle = (item: ActivityEventItem) => item.userName || item.userEmail || `User ${item.userId}`;
const getUserSubtext = (item: ActivityEventItem) => item.userName ? item.userEmail || '' : '';
const getRecordTitle = (item: ActivityEventItem) => item.entityLabel || formatLabel(item.entityType);
const getRecordSubtext = (item: ActivityEventItem) => {
  const parts = [item.entityStatus ? `Status: ${formatLabel(item.entityStatus)}` : '', item.designNo ? `Design: ${item.designNo}` : '']
    .filter(Boolean);
  if (parts.length) return parts.join(' | ');
  return item.entityId ? `ID ${item.entityId}` : '';
};

const formatDeviceType = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (text === 'ios') return 'iOS';
  if (text === 'android') return 'Android';
  if (text === 'web') return 'Web';
  return text ? formatLabel(text) : '';
};

const getDeviceType = (item: ActivityEventItem) => {
  const data = item.data || {};
  const explicitType = formatDeviceType(data.deviceType || data.platform || data.os || data.source);
  if (explicitType) return explicitType;
  if (item.deviceId?.startsWith('mobile-')) return 'Mobile device';
  return item.deviceId ? 'Device' : 'Not recorded';
};

const toIsoBoundary = (value: string, endOfDay = false) => {
  if (!value) return undefined;
  return `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`;
};

function FilterField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className={labelClassName}>{label}</span>
      <input
        className={fieldClassName}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function ActivityEventsPage() {
  const [events, setEvents] = useState<ActivityEventItem[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo<ActivityEventsQuery>(() => ({
    page,
    limit,
    userId: appliedFilters.userId.trim(),
    from: toIsoBoundary(appliedFilters.from),
    to: toIsoBoundary(appliedFilters.to, true),
    module: appliedFilters.module.trim(),
    event: appliedFilters.event.trim(),
    deviceId: appliedFilters.deviceId.trim(),
    entityType: appliedFilters.entityType.trim(),
    entityId: appliedFilters.entityId.trim(),
  }), [appliedFilters, limit, page]);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchActivityEvents(query);
      setEvents(response.data || []);
      setTotal(Number(response.total || 0));
      setTotalPages(Math.max(1, Number(response.totalPages || 1)));
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Unable to load activity events');
      setEvents([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    setPage(1);
  }, [appliedFilters, limit]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  const rangeStart = total ? (page - 1) * limit + 1 : 0;
  const rangeEnd = total ? Math.min(page * limit, total) : 0;
  const visibleUsers = new Set(events.map((item) => item.userId).filter(Boolean)).size;
  const visibleModules = new Set(events.map((item) => item.module).filter(Boolean)).size;
  const visibleChanges = events.reduce((sum, item) => sum + (item.changes?.length || 0), 0);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activity Tracking</h1>
          <p className="text-sm text-slate-600">See who did what, where it happened, and what changed in simple language.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void loadActivity()}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-[#e4dacd] bg-white px-5 py-4 shadow-[0_18px_45px_-36px_rgba(28,21,15,0.35)]">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a7a67]">Records found</p>
          <p className="mt-2 text-left text-2xl font-bold text-[#251d17]">{total}</p>
        </div>
        <div className="rounded-2xl border border-[#e4dacd] bg-white px-5 py-4 shadow-[0_18px_45px_-36px_rgba(28,21,15,0.35)]">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a7a67]">Users on page</p>
          <p className="mt-2 text-left text-2xl font-bold text-[#251d17]">{visibleUsers}</p>
        </div>
        <div className="rounded-2xl border border-[#e4dacd] bg-white px-5 py-4 shadow-[0_18px_45px_-36px_rgba(28,21,15,0.35)]">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a7a67]">Areas touched</p>
          <p className="mt-2 text-left text-2xl font-bold text-[#251d17]">{visibleModules}</p>
        </div>
        <div className="rounded-2xl border border-[#e4dacd] bg-white px-5 py-4 shadow-[0_18px_45px_-36px_rgba(28,21,15,0.35)]">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a7a67]">Field changes</p>
          <p className="mt-2 text-left text-2xl font-bold text-[#251d17]">{visibleChanges}</p>
        </div>
      </div>

      <Card
        title={
          <div>
            <h3 className="text-base font-semibold text-[#251d17]">Find Activity</h3>
            <p className="mt-1 text-sm text-slate-600">Use one or more fields to narrow the list. Leave fields blank to see all activity.</p>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterField label="User" placeholder="User ID or staff ID" value={filters.userId} onChange={(value) => updateFilter('userId', value)} />
          <FilterField label="From date" type="date" value={filters.from} onChange={(value) => updateFilter('from', value)} />
          <FilterField label="To date" type="date" value={filters.to} onChange={(value) => updateFilter('to', value)} />
          <FilterField label="Area" placeholder="Example: Customer" value={filters.module} onChange={(value) => updateFilter('module', value)} />
          <FilterField label="Action" placeholder="Example: Created" value={filters.event} onChange={(value) => updateFilter('event', value)} />
          <FilterField label="Device" placeholder="Phone or tablet ID" value={filters.deviceId} onChange={(value) => updateFilter('deviceId', value)} />
          <FilterField label="Record type" placeholder="Example: Order" value={filters.entityType} onChange={(value) => updateFilter('entityType', value)} />
          <FilterField label="Record ID" placeholder="Specific record number" value={filters.entityId} onChange={(value) => updateFilter('entityId', value)} />
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <div className="flex flex-wrap justify-start gap-2">
            <Button type="button" variant="secondary" onClick={clearFilters}>Clear</Button>
            <Button type="button" onClick={applyFilters}>Apply</Button>
          </div>
        </div>
      </Card>

      <Card
        title={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-[#251d17]">Activity Events</h3>
            <span className="text-xs font-semibold text-slate-500">
              Showing {rangeStart}-{rangeEnd} of {total} records
            </span>
          </div>
        }
      >
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-dashed border-[#e4d7c6] bg-[#fcfaf6] px-4 py-12 text-center text-sm text-[#8a7f72]">Loading activity...</div>
        ) : events.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-[0.16em] text-[#8a7a67]">
                  <th className="border-b border-[#eadfce] px-4 py-3">When</th>
                  <th className="border-b border-[#eadfce] px-4 py-3">Person</th>
                  <th className="border-b border-[#eadfce] px-4 py-3">Activity</th>
                  <th className="border-b border-[#eadfce] px-4 py-3">Record</th>
                  <th className="border-b border-[#eadfce] px-4 py-3">Device</th>
                  <th className="border-b border-[#eadfce] px-4 py-3">What changed</th>
                </tr>
              </thead>
              <tbody>
                {events.map((item) => (
                  <tr key={item.id} className="align-top text-[#40362e] transition hover:bg-[#fffaf2]">
                    <td className="whitespace-nowrap border-b border-[#f0e7dc] px-4 py-4 font-medium text-[#251d17]">{formatDateTime(item.createdAt)}</td>
                    <td className="border-b border-[#f0e7dc] px-4 py-4">
                      <p className="font-semibold text-[#251d17]">{getUserTitle(item)}</p>
                      {getUserSubtext(item) ? <p className="mt-1 break-all text-xs text-slate-500">{getUserSubtext(item)}</p> : null}
                    </td>
                    <td className="border-b border-[#f0e7dc] px-4 py-4">
                      <div className="flex flex-wrap justify-start gap-2">
                        <span className="rounded-full bg-[#f3eadc] px-2.5 py-1 text-xs font-bold text-[#7a5c2d]">{formatLabel(item.module)}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{formatLabel(item.event)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">Screen: {formatLabel(item.screen)}</p>
                    </td>
                    <td className="border-b border-[#f0e7dc] px-4 py-4">
                      {item.entityType || item.entityId ? (
                        <div>
                          <p className="font-semibold text-[#251d17]">{getRecordTitle(item)}</p>
                          {getRecordSubtext(item) ? <p className="mt-1 break-all text-xs text-slate-500">{getRecordSubtext(item)}</p> : null}
                        </div>
                      ) : (
                        <span className="text-slate-500">No record linked</span>
                      )}
                    </td>
                    <td className="border-b border-[#f0e7dc] px-4 py-4">
                      <p className="font-semibold text-[#251d17]">{getDeviceType(item)}</p>
                      {item.deviceId ? <p className="mt-1 break-all font-mono text-xs text-slate-500">{item.deviceId}</p> : null}
                    </td>
                    <td className="border-b border-[#f0e7dc] px-4 py-4">
                      {item.changes?.length ? (
                        <details className="mb-3 rounded-lg border border-[#eadfce] bg-[#fffdf9] px-3 py-2" open={item.changes.length <= 2}>
                          <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.1em] text-[#7a5c2d]">Changes ({item.changes.length})</summary>
                          <div className="mt-2 space-y-2 text-left">
                            {item.changes.map((change, index) => (
                              <div key={`${change.field}-${index}`} className="rounded-md bg-[#f8f1e8] p-2">
                                <p className="text-xs font-bold text-[#251d17]">{formatLabel(change.field)}</p>
                                <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Before:</span> {formatValue(change.oldValue)}</p>
                                <p className="mt-0.5 text-xs text-slate-600"><span className="font-semibold">After:</span> {formatValue(change.newValue)}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : null}
                      {item.data ? (
                        <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.1em] text-slate-600">More details</summary>
                          <div className="mt-2 space-y-1.5 text-left">
                            {summarizeData(item.data).map(([key, value]) => (
                              <p key={key} className="text-xs text-slate-600"><span className="font-semibold text-slate-800">{formatLabel(key)}:</span> {formatValue(value)}</p>
                            ))}
                          </div>
                        </details>
                      ) : null}
                      {!item.changes?.length && !item.data ? <span className="text-slate-500">No extra details</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} alwaysShow />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#e4d7c6] bg-[#fcfaf6] px-4 py-12 text-center">
            <p className="text-sm font-semibold text-[#4a4037]">No activity events found</p>
            <p className="mt-1 text-xs text-[#8a7f72]">Try changing the filters or check that mobile events are uploading.</p>
          </div>
        )}
      </Card>
    </div>
  );
}











