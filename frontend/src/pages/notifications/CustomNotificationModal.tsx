import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../../components/common/Button';
import SmartDropdown from '../../components/common/SmartDropdown';
import api from '../../services/api';
import { sendCustomNotification } from '../../services/notifications';
import type {
  CustomNotificationActivityType,
  CustomNotificationRecordOption,
  SendCustomNotificationPayload,
} from '../../types/notification.types';

type TargetMode = 'ALL' | 'FILTERED' | 'SELECTED';

interface CustomNotificationModalProps {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}

interface RecipientUserOption {
  id: number;
  label: string;
  email: string;
  role: string;
  companyName?: string;
  branchName?: string;
}

const activityOptions: Array<{ value: CustomNotificationActivityType; label: string }> = [
  { value: 'GENERAL', label: 'General' },
  { value: 'ORDER', label: 'Order' },
  { value: 'DESIGN', label: 'Design' },
];

const roleOptions = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'INTERNAL_REP', label: 'Internal Rep' },
  { value: 'COMPANY_ADMIN', label: 'Company Admin' },
  { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
  { value: 'SALES_REP', label: 'Sales Rep' },
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
  if (activityType === 'GENERAL') return { records: [], total: 0 };

  const endpoint = activityType === 'ORDER' ? '/orders' : '/products';
  const response = await api.get(endpoint, {
    params: { page: 1, limit: 10, search: search.trim() || undefined },
  });
  const payload = response.data || {};
  const rows = Array.isArray(payload.data) ? payload.data : [];
  const records = rows.map((row: any) => {
    if (activityType === 'ORDER') {
      const labelParts = [row.orderNumber || row.orderNo || `Order #${row.id}`, row.customerName, row.status].filter(Boolean);
      return { id: Number(row.id), label: labelParts.join(' - ') };
    }

    const labelParts = [row.designNo || `Design #${row.id}`, row.name || row.designName, row.category].filter(Boolean);
    return { id: Number(row.id), label: labelParts.join(' - ') };
  });

  return { records, total: Number(payload.total || rows.length || 0) };
};

const loadRecipientUsers = async (filters: {
  role: string;
  companyId: string;
  branchId: string;
  search: string;
}): Promise<RecipientUserOption[]> => {
  const response = await api.get('/users/lookup', {
    params: {
      status: 'ACTIVE',
      role: filters.role || undefined,
      companyId: filters.companyId || undefined,
      branchId: filters.branchId || undefined,
      search: filters.search.trim() || undefined,
    },
  });
  const rows = Array.isArray(response.data) ? response.data : Array.isArray(response.data?.data) ? response.data.data : [];
  return rows.map((row: any) => ({
    id: Number(row.id),
    label: row.label || `${row.firstName || ''} ${row.lastName || ''}`.trim() || row.email || `User #${row.id}`,
    email: row.email || '',
    role: row.role || '',
    companyName: row.company?.companyName || row.companyName || '',
    branchName: row.branch?.name || row.branchName || '',
  }));
};

export default function CustomNotificationModal({ open, onClose, onSent }: CustomNotificationModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [activityType, setActivityType] = useState<CustomNotificationActivityType>('GENERAL');
  const [priority, setPriority] = useState<SendCustomNotificationPayload['priority']>('P1');
  const [channelPush, setChannelPush] = useState(true);
  const [targetMode, setTargetMode] = useState<TargetMode>('ALL');
  const [role, setRole] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [recipientUsers, setRecipientUsers] = useState<RecipientUserOption[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
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
  const selectedUserIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);
  const filteredTargetCount = targetMode === 'ALL' ? 'All active users' : `${recipientUsers.length} matching users`;

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
      const apiMessage = err?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage || 'Unable to load activity records');
      setRecordOptions([]);
      setRecordCount(0);
    } finally {
      setRecordsLoading(false);
    }
  }, [activityType, open, recordSearch]);

  const refreshRecipients = useCallback(async () => {
    if (!open || targetMode === 'ALL') {
      setRecipientUsers([]);
      return;
    }

    setRecipientsLoading(true);
    setError(null);
    try {
      const users = await loadRecipientUsers({ role, companyId, branchId, search: userSearch });
      setRecipientUsers(users);
      setSelectedUserIds((current) => current.filter((id) => users.some((user) => user.id === id)));
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage || 'Unable to load users');
      setRecipientUsers([]);
    } finally {
      setRecipientsLoading(false);
    }
  }, [branchId, companyId, open, role, targetMode, userSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshRecords();
    }, activityType === 'GENERAL' ? 0 : 300);
    return () => window.clearTimeout(timeoutId);
  }, [activityType, refreshRecords]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshRecipients();
    }, targetMode === 'ALL' ? 0 : 300);
    return () => window.clearTimeout(timeoutId);
  }, [refreshRecipients, targetMode]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setResultText(null);
  }, [open]);

  const resetAndClose = () => {
    if (sending) return;
    onClose();
  };

  const toggleSelectedUser = (id: number) => {
    setSelectedUserIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleAllVisibleUsers = () => {
    const visibleIds = recipientUsers.map((user) => user.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedUserIdSet.has(id));
    setSelectedUserIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...current, ...visibleIds]));
    });
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
    if (targetMode === 'SELECTED' && selectedUserIds.length === 0) {
      setError('Select at least one user.');
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
        targetMode,
        role: targetMode === 'FILTERED' ? role || undefined : undefined,
        companyId: targetMode === 'FILTERED' && companyId ? Number(companyId) : undefined,
        branchId: targetMode === 'FILTERED' && branchId ? Number(branchId) : undefined,
        userSearch: targetMode === 'FILTERED' ? userSearch.trim() || undefined : undefined,
        selectedUserIds: targetMode === 'SELECTED' ? selectedUserIds : undefined,
      });
      setResultText(`Notification created for ${response.targetUsers} users.`);
      setTitle('');
      setMessage('');
      setActivityType('GENERAL');
      setPriority('P1');
      setRecordSearch('');
      setSelectedRecordId('');
      setTargetMode('ALL');
      setSelectedUserIds([]);
      onSent();
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage || 'Unable to send custom notification');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[1.35rem] border border-[#e1d3c1] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#eadfce] px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Custom Notification</h2>
            <p className="mt-1 text-sm text-slate-600">Create a targeted in-app and push notification.</p>
          </div>
          <button type="button" onClick={resetAndClose} className="rounded-full border border-[#dfd3c4] px-3 py-1.5 text-sm font-semibold text-[#6f6356] hover:bg-[#faf7f2]">
            Close
          </button>
        </div>

        <div className="max-h-[calc(92vh-86px)] space-y-5 overflow-y-auto px-6 py-5">
          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
          {resultText ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{resultText}</div> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c7148]">Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-[#dfd3c4] px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]" placeholder="Notification title" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c7148]">Activity</span>
              <select value={activityType} onChange={(event) => { setActivityType(event.target.value as CustomNotificationActivityType); setRecordSearch(''); setSelectedRecordId(''); }} className="w-full rounded-xl border border-[#dfd3c4] px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]">
                {activityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>

          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c7148]">Message</span>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className="w-full resize-none rounded-xl border border-[#dfd3c4] px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]" placeholder="Write the push notification message" />
          </label>

          {needsActivityRecord ? (
            <div className="rounded-2xl border border-[#eadfce] bg-[#fcfaf6] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1 space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c7148]">Search {activityType.toLowerCase()} records</span>
                  <input value={recordSearch} onChange={(event) => setRecordSearch(event.target.value)} className="w-full rounded-xl border border-[#dfd3c4] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]" placeholder={`Search ${activityType.toLowerCase()} no, name, customer...`} />
                </label>
                <Button type="button" variant="secondary" onClick={() => void refreshRecords()} disabled={recordsLoading}>{recordsLoading ? 'Loading' : 'Refresh'}</Button>
              </div>
              <div className="mt-3 rounded-xl border border-[#e8dccd] bg-white px-4 py-2 text-xs font-semibold text-[#6f6356]">{recordsLoading ? 'Counting records...' : `${recordCount} ${activityType.toLowerCase()} records found`}</div>
              <label className="mt-3 block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c7148]">Select record</span>
                <select value={selectedRecordId} onChange={(event) => setSelectedRecordId(event.target.value)} className="w-full rounded-xl border border-[#dfd3c4] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]">
                  <option value="">Select {activityType.toLowerCase()}</option>
                  {recordOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              {selectedRecord ? <p className="mt-2 text-xs font-medium text-[#73675b]">Selected: {selectedRecord.label}</p> : null}
            </div>
          ) : null}

          <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c7148]">Recipients</p>
                <p className="mt-1 text-sm text-slate-600">{targetMode === 'SELECTED' ? `${selectedUserIds.length} selected users` : filteredTargetCount}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['ALL', 'FILTERED', 'SELECTED'] as TargetMode[]).map((mode) => (
                  <button key={mode} type="button" onClick={() => setTargetMode(mode)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${targetMode === mode ? 'bg-[#1f1a16] text-white' : 'border border-[#ddcfbf] bg-[#faf7f2] text-[#6f6356] hover:bg-[#f3ebdf]'}`}>
                    {mode === 'ALL' ? 'Send to all' : mode === 'FILTERED' ? 'Use filters' : 'Select users'}
                  </button>
                ))}
              </div>
            </div>

            {targetMode !== 'ALL' ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[#8c7148]">Role</span>
                    <SmartDropdown value={role} onChange={setRole} config={{ options: roleOptions, valueKey: 'value', labelKey: 'label', placeholder: 'All roles', showSearch: false }} />
                  </div>
                  <div>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[#8c7148]">Company</span>
                    <SmartDropdown value={companyId} onChange={(value) => { setCompanyId(value); setBranchId(''); }} config={{ apiSubPath: '/companies/lookup', extraParams: { status: 'ACTIVE' }, valueKey: 'id', labelKey: 'companyName', placeholder: 'All companies', pagination: true, limit: 20 }} />
                  </div>
                  <div>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[#8c7148]">Branch</span>
                    <SmartDropdown value={branchId} onChange={setBranchId} config={{ apiSubPath: '/branches', extraParams: { status: 'ACTIVE', companyId: companyId || undefined }, valueKey: 'id', labelKey: 'name', placeholder: 'All branches', pagination: true, limit: 20 }} />
                  </div>
                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[#8c7148]">Search</span>
                    <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} className="h-10 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-[#c9a971]" placeholder="Name, email, company" />
                  </label>
                </div>

                <div className="rounded-xl border border-[#e8dccd] bg-[#fcfaf6]">
                  <div className="flex items-center justify-between gap-3 border-b border-[#e8dccd] px-4 py-3">
                    <p className="text-sm font-semibold text-[#4a4037]">{recipientsLoading ? 'Loading users...' : `${recipientUsers.length} users found`}</p>
                    {targetMode === 'SELECTED' ? <Button type="button" size="sm" variant="secondary" onClick={toggleAllVisibleUsers} disabled={!recipientUsers.length}>Toggle Visible</Button> : null}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {recipientUsers.length ? recipientUsers.map((user) => (
                      <label key={user.id} className="flex cursor-pointer items-start gap-3 border-b border-[#efe5d8] px-4 py-3 last:border-b-0 hover:bg-white">
                        {targetMode === 'SELECTED' ? <input type="checkbox" checked={selectedUserIdSet.has(user.id)} onChange={() => toggleSelectedUser(user.id)} className="mt-1 h-4 w-4 accent-[#b98e45]" /> : null}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800">{user.label}</span>
                          <span className="mt-1 block truncate text-xs text-slate-500">{user.email}</span>
                          <span className="mt-1 flex flex-wrap gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#8b7c6b]">
                            <span>{user.role}</span>
                            {user.companyName ? <span>{user.companyName}</span> : null}
                            {user.branchName ? <span>{user.branchName}</span> : null}
                          </span>
                        </span>
                      </label>
                    )) : <div className="px-4 py-8 text-center text-sm text-[#8a7f72]">No users match these filters.</div>}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c7148]">Priority</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as SendCustomNotificationPayload['priority'])} className="w-full rounded-xl border border-[#dfd3c4] px-4 py-2.5 text-sm outline-none focus:border-[#c9a971]">
                {priorityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-[#dfd3c4] px-4 py-3">
              <input type="checkbox" checked={channelPush} onChange={(event) => setChannelPush(event.target.checked)} className="h-4 w-4 accent-[#b98e45]" />
              <span className="text-sm font-semibold text-slate-700">Send as push notification</span>
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[#eadfce] pt-4">
            <Button type="button" variant="secondary" onClick={resetAndClose} disabled={sending}>Cancel</Button>
            <Button type="button" onClick={() => void handleSend()} disabled={sending}>{sending ? 'Sending...' : 'Send Notification'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
