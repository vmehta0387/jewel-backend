import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../../components/common/Button';
import api from '../../services/api';
import { sendCustomNotification } from '../../services/notifications';
import type {
  CustomNotificationActivityType,
  CustomNotificationRecordOption,
  SendCustomNotificationPayload,
} from '../../types/notification.types';

interface CustomNotificationModalProps {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}

const activityOptions: Array<{ value: CustomNotificationActivityType; label: string }> = [
  { value: 'GENERAL', label: 'General' },
  { value: 'ORDER', label: 'Order' },
  { value: 'DESIGN', label: 'Design' },
];

const priorityOptions = [
  { value: 'P1', label: 'Normal' },
  { value: 'P0', label: 'High' },
  { value: 'P2', label: 'Low' },
] as const;

const loadActivityRecords = async (
  activityType: CustomNotificationActivityType,
  search: string,
): Promise<{ records: CustomNotificationRecordOption[]; total: number }> => {
  if (activityType === 'GENERAL') {
    return { records: [], total: 0 };
  }

  const endpoint = activityType === 'ORDER' ? '/orders' : '/products';
  const response = await api.get(endpoint, {
    params: {
      page: 1,
      limit: 10,
      search: search.trim() || undefined,
    },
  });
  const payload = response.data || {};
  const rows = Array.isArray(payload.data) ? payload.data : [];
  const records = rows.map((row: any) => {
    if (activityType === 'ORDER') {
      const labelParts = [
        row.orderNumber || row.orderNo || `Order #${row.id}`,
        row.customerName,
        row.status,
      ].filter(Boolean);
      return { id: Number(row.id), label: labelParts.join(' - ') };
    }

    const labelParts = [
      row.designNo || `Design #${row.id}`,
      row.name || row.designName,
      row.category,
    ].filter(Boolean);
    return { id: Number(row.id), label: labelParts.join(' - ') };
  });

  return {
    records,
    total: Number(payload.total || rows.length || 0),
  };
};

export default function CustomNotificationModal({ open, onClose, onSent }: CustomNotificationModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [activityType, setActivityType] = useState<CustomNotificationActivityType>('GENERAL');
  const [priority, setPriority] = useState<SendCustomNotificationPayload['priority']>('P1');
  const [channelPush, setChannelPush] = useState(true);
  const [recordSearch, setRecordSearch] = useState('');
  const [recordOptions, setRecordOptions] = useState<CustomNotificationRecordOption[]>([]);
  const [recordCount, setRecordCount] = useState(0);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);

  const needsActivityRecord = activityType !== 'GENERAL';
  const selectedRecord = useMemo(
    () => recordOptions.find((item) => String(item.id) === selectedRecordId),
    [recordOptions, selectedRecordId],
  );

  const refreshRecords = useCallback(async () => {
    if (!open || activityType === 'GENERAL') {
      setRecordOptions([]);
      setRecordCount(0);
      setSelectedRecordId('');
      return;
    }

    setRecordsLoading(true);
    setError(null);
    try {
      const response = await loadActivityRecords(activityType, recordSearch);
      setRecordOptions(response.records);
      setRecordCount(response.total);
      setSelectedRecordId((current) =>
        current && response.records.some((item) => String(item.id) === current) ? current : '',
      );
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Unable to load activity records');
      setRecordOptions([]);
      setRecordCount(0);
    } finally {
      setRecordsLoading(false);
    }
  }, [activityType, open, recordSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshRecords();
    }, activityType === 'GENERAL' ? 0 : 300);

    return () => window.clearTimeout(timeoutId);
  }, [activityType, refreshRecords]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setResultText(null);
  }, [open]);

  const resetAndClose = () => {
    if (sending) return;
    onClose();
  };

  const handleSend = async () => {
    setError(null);
    setResultText(null);

    if (!title.trim() || !message.trim()) {
      setError('Title and message are required.');
      return;
    }

    if (needsActivityRecord && !selectedRecordId) {
      setError(`Select a ${activityType.toLowerCase()} record first.`);
      return;
    }

    setSending(true);
    try {
      const response = await sendCustomNotification({
        title: title.trim(),
        message: message.trim(),
        activityType,
        activityRecordId: selectedRecordId ? Number(selectedRecordId) : undefined,
        priority,
        channelPush,
      });
      setResultText(`Notification created for ${response.targetUsers} users.`);
      setTitle('');
      setMessage('');
      setActivityType('GENERAL');
      setPriority('P1');
      setRecordSearch('');
      setSelectedRecordId('');
      onSent();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Unable to send custom notification');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[1.35rem] border border-[#e1d3c1] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#eadfce] px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Custom Notification</h2>
            <p className="mt-1 text-sm text-slate-600">Create an in-app and push notification for mobile users.</p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-full border border-[#dfd3c4] px-3 py-1.5 text-sm font-semibold text-[#6f6356] hover:bg-[#faf7f2]"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(92vh-86px)] space-y-5 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}
          {resultText ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {resultText}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c7148]">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-xl border border-[#dfd3c4] px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]"
                placeholder="Notification title"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c7148]">Activity</span>
              <select
                value={activityType}
                onChange={(event) => {
                  setActivityType(event.target.value as CustomNotificationActivityType);
                  setRecordSearch('');
                  setSelectedRecordId('');
                }}
                className="w-full rounded-xl border border-[#dfd3c4] px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]"
              >
                {activityOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c7148]">Message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-[#dfd3c4] px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]"
              placeholder="Write the push notification message"
            />
          </label>

          {needsActivityRecord ? (
            <div className="rounded-2xl border border-[#eadfce] bg-[#fcfaf6] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1 space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c7148]">
                    Search {activityType.toLowerCase()} records
                  </span>
                  <input
                    value={recordSearch}
                    onChange={(event) => setRecordSearch(event.target.value)}
                    className="w-full rounded-xl border border-[#dfd3c4] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]"
                    placeholder={`Search ${activityType.toLowerCase()} no, name, customer...`}
                  />
                </label>
                <Button type="button" variant="secondary" onClick={() => void refreshRecords()} disabled={recordsLoading}>
                  {recordsLoading ? 'Loading' : 'Refresh'}
                </Button>
              </div>

              <div className="mt-3 rounded-xl border border-[#e8dccd] bg-white px-4 py-2 text-xs font-semibold text-[#6f6356]">
                {recordsLoading ? 'Counting records...' : `${recordCount} ${activityType.toLowerCase()} records found`}
              </div>

              <label className="mt-3 block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c7148]">Select record</span>
                <select
                  value={selectedRecordId}
                  onChange={(event) => setSelectedRecordId(event.target.value)}
                  className="w-full rounded-xl border border-[#dfd3c4] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]"
                >
                  <option value="">Select {activityType.toLowerCase()}</option>
                  {recordOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>

              {selectedRecord ? (
                <p className="mt-2 text-xs font-medium text-[#73675b]">Selected: {selectedRecord.label}</p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c7148]">Priority</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as SendCustomNotificationPayload['priority'])}
                className="w-full rounded-xl border border-[#dfd3c4] px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]"
              >
                {priorityOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-[#dfd3c4] px-4 py-3">
              <input
                type="checkbox"
                checked={channelPush}
                onChange={(event) => setChannelPush(event.target.checked)}
                className="h-4 w-4 accent-[#b98e45]"
              />
              <span className="text-sm font-semibold text-slate-700">Send as push notification</span>
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[#eadfce] pt-4">
            <Button type="button" variant="secondary" onClick={resetAndClose} disabled={sending}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSend()} disabled={sending}>
              {sending ? 'Sending...' : 'Send Notification'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
