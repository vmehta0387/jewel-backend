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

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatJson = (value: unknown) => {
  if (!value) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const toIsoBoundary = (value: string, endOfDay = false) => {
  if (!value) return undefined;
  return `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`;
};

export default function ActivityEventsPage() {
  const [events, setEvents] = useState<ActivityEventItem[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activity Tracking</h1>
          <p className="text-sm text-slate-600">Review mobile user actions by date, module, device, and entity.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void loadActivity()}>
          Refresh
        </Button>
      </div>

      <Card title="Filters">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input className="rounded-xl border border-[#dfd3c4] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]" placeholder="User ID" value={filters.userId} onChange={(event) => updateFilter('userId', event.target.value)} />
          <input className="rounded-xl border border-[#dfd3c4] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]" type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} />
          <input className="rounded-xl border border-[#dfd3c4] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]" type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} />
          <input className="rounded-xl border border-[#dfd3c4] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]" placeholder="Module" value={filters.module} onChange={(event) => updateFilter('module', event.target.value)} />
          <input className="rounded-xl border border-[#dfd3c4] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]" placeholder="Event" value={filters.event} onChange={(event) => updateFilter('event', event.target.value)} />
          <input className="rounded-xl border border-[#dfd3c4] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]" placeholder="Device ID" value={filters.deviceId} onChange={(event) => updateFilter('deviceId', event.target.value)} />
          <input className="rounded-xl border border-[#dfd3c4] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]" placeholder="Entity Type" value={filters.entityType} onChange={(event) => updateFilter('entityType', event.target.value)} />
          <input className="rounded-xl border border-[#dfd3c4] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]" placeholder="Entity ID" value={filters.entityId} onChange={(event) => updateFilter('entityId', event.target.value)} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <select
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="rounded-xl border border-[#dfd3c4] bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-[#c9a971]"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          <div className="flex flex-wrap gap-2">
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
              Showing {rangeStart}-{rangeEnd} of {total}
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
                <tr className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a7a67]">
                  <th className="border-b border-[#eadfce] px-3 py-3">Date</th>
                  <th className="border-b border-[#eadfce] px-3 py-3">User</th>
                  <th className="border-b border-[#eadfce] px-3 py-3">Module</th>
                  <th className="border-b border-[#eadfce] px-3 py-3">Event</th>
                  <th className="border-b border-[#eadfce] px-3 py-3">Screen</th>
                  <th className="border-b border-[#eadfce] px-3 py-3">Entity</th>
                  <th className="border-b border-[#eadfce] px-3 py-3">Device</th>
                  <th className="border-b border-[#eadfce] px-3 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((item) => (
                  <tr key={item.id} className="align-top text-[#40362e]">
                    <td className="border-b border-[#f0e7dc] px-3 py-3 whitespace-nowrap">{formatDateTime(item.createdAt)}</td>
                    <td className="border-b border-[#f0e7dc] px-3 py-3 font-mono text-xs">{item.userId}</td>
                    <td className="border-b border-[#f0e7dc] px-3 py-3">
                      <span className="rounded-full bg-[#f3eadc] px-2.5 py-1 text-xs font-bold text-[#7a5c2d]">{item.module}</span>
                    </td>
                    <td className="border-b border-[#f0e7dc] px-3 py-3 font-semibold">{item.event}</td>
                    <td className="border-b border-[#f0e7dc] px-3 py-3">{item.screen || '-'}</td>
                    <td className="border-b border-[#f0e7dc] px-3 py-3">
                      {item.entityType || item.entityId ? (
                        <div>
                          <p className="font-semibold">{item.entityType || '-'}</p>
                          <p className="font-mono text-xs text-slate-500">{item.entityId || '-'}</p>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="border-b border-[#f0e7dc] px-3 py-3 font-mono text-xs">{item.deviceId || '-'}</td>
                    <td className="border-b border-[#f0e7dc] px-3 py-3">
                      {item.changes?.length ? (
                        <details className="mb-2">
                          <summary className="cursor-pointer text-xs font-bold text-[#7a5c2d]">Changes ({item.changes.length})</summary>
                          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-[#171311] p-3 text-xs text-[#f6efe4]">{formatJson(item.changes)}</pre>
                        </details>
                      ) : null}
                      {item.data ? (
                        <details>
                          <summary className="cursor-pointer text-xs font-bold text-[#7a5c2d]">Data</summary>
                          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-[#171311] p-3 text-xs text-[#f6efe4]">{formatJson(item.data)}</pre>
                        </details>
                      ) : null}
                      {!item.changes?.length && !item.data ? '-' : null}
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
