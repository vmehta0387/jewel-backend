import { FormEvent, useEffect, useMemo, useState } from 'react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import api from '../../services/api';
import { getStoredUser } from '../../utils/auth';

interface MetalMasterRow {
  id: string;
  value: string;
  aliasName?: string | null;
  description?: string | null;
  marketPricePerOunce?: number | null;
  marketPricePerGm?: number | null;
  livePricePerGm?: number | null;
  updatedAt?: string;
}

interface PacketRow {
  id: string;
  packetName: string;
  stone?: string | null;
  shape?: string | null;
  size?: string | null;
  cut?: string | null;
  color?: string | null;
  quality?: string | null;
  priceIn?: 'WT' | 'PCS';
  sellingPrice?: number | null;
  weightPerPc?: number | null;
  weightUnit?: 'CTS' | 'GMS';
  updatedAt?: string;
}

interface ActionModalProps {
  open: boolean;
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
}

function ActionModal({ open, title, description, children, onClose }: ActionModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-lg font-semibold text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
            aria-label="Close"
          >
            x
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function formatMoney(value?: number | null, digits = 2): string {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount.toFixed(digits) : '0.00';
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return 'Not updated yet';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not updated yet';
  }

  return date.toLocaleString();
}

function parseOptionalNumber(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function DashboardStatIcon({ kind }: { kind: 'companies' | 'orders' | 'designs' | 'revenue' }) {
  const svgProps = {
    className: 'h-5 w-5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (kind === 'companies') {
    return (
      <svg {...svgProps}>
        <path d="M4.5 20.25h15" />
        <path d="M6 20.25V5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 .75.75v15" />
        <path d="M9 8.25h2.25M9 11.25h2.25M9 14.25h2.25M13.5 8.25h2.25M13.5 11.25h2.25M13.5 14.25h2.25" />
      </svg>
    );
  }

  if (kind === 'orders') {
    return (
      <svg {...svgProps}>
        <rect x="6" y="4.5" width="12" height="15" rx="1.75" />
        <path d="M9 8.25h6M9 12h6M9 15.75h4.5" />
      </svg>
    );
  }

  if (kind === 'designs') {
    return (
      <svg {...svgProps}>
        <path d="M12 3.75 19.5 8.25v7.5L12 20.25 4.5 15.75v-7.5L12 3.75Z" />
        <path d="M12 9v6M8.75 12h6.5" />
      </svg>
    );
  }

  return (
    <svg {...svgProps}>
      <path d="M12 4.5v15" />
      <path d="M15 7.5h-4.5a2.25 2.25 0 1 0 0 4.5h3a2.25 2.25 0 1 1 0 4.5H9" />
    </svg>
  );
}

export default function DashboardPage() {
  const user = useMemo(() => getStoredUser(), []);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [goldModalOpen, setGoldModalOpen] = useState(false);
  const [goldLoading, setGoldLoading] = useState(false);
  const [goldSaving, setGoldSaving] = useState(false);
  const [goldError, setGoldError] = useState<string | null>(null);
  const [goldMaster, setGoldMaster] = useState<MetalMasterRow | null>(null);
  const [goldValue, setGoldValue] = useState('Gold');
  const [goldAliasName, setGoldAliasName] = useState('G');
  const [goldDescription, setGoldDescription] = useState('');
  const [goldMarketPricePerOunce, setGoldMarketPricePerOunce] = useState('');
  const [goldMarketPricePerGm, setGoldMarketPricePerGm] = useState('');
  const [goldLivePricePerGm, setGoldLivePricePerGm] = useState('');

  const [packetModalOpen, setPacketModalOpen] = useState(false);
  const [packetLoading, setPacketLoading] = useState(false);
  const [packetSaving, setPacketSaving] = useState(false);
  const [packetError, setPacketError] = useState<string | null>(null);
  const [packetRows, setPacketRows] = useState<PacketRow[]>([]);
  const [selectedPacketId, setSelectedPacketId] = useState('');
  const [selectedPacketPrice, setSelectedPacketPrice] = useState('');

  const stats = [
    { label: 'Total Companies', value: '2', kind: 'companies' as const },
    { label: 'Active Orders', value: '0', kind: 'orders' as const },
    { label: 'Ring Styles', value: '0', kind: 'designs' as const },
    { label: 'Total Revenue', value: '$0', kind: 'revenue' as const },
  ];

  const selectedPacket = useMemo(
    () => packetRows.find((row) => row.id === selectedPacketId) ?? null,
    [packetRows, selectedPacketId],
  );

  const packetInfo = useMemo(() => {
    if (!selectedPacket) {
      return '';
    }

    return [selectedPacket.stone, selectedPacket.shape, selectedPacket.size, selectedPacket.cut, selectedPacket.color, selectedPacket.quality]
      .filter((value) => !!value)
      .join(', ');
  }, [selectedPacket]);

  const hydrateGoldForm = (row: MetalMasterRow) => {
    setGoldMaster(row);
    setGoldValue(row.value || 'Gold');
    setGoldAliasName(row.aliasName || row.value || 'Gold');
    setGoldDescription(row.description || '');
    setGoldMarketPricePerOunce(
      row.marketPricePerOunce !== null && row.marketPricePerOunce !== undefined
        ? String(row.marketPricePerOunce)
        : '',
    );
    setGoldMarketPricePerGm(
      row.marketPricePerGm !== null && row.marketPricePerGm !== undefined
        ? String(row.marketPricePerGm)
        : '',
    );
    setGoldLivePricePerGm(
      row.livePricePerGm !== null && row.livePricePerGm !== undefined
        ? String(row.livePricePerGm)
        : '',
    );
  };

  const fetchGoldMaster = async () => {
    setGoldLoading(true);
    setGoldError(null);
    try {
      const response = await api.get('/products/masters', {
        params: { type: 'METAL_NAME', status: 'ALL', search: 'Gold' },
      });

      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      const match =
        rows.find((row: MetalMasterRow) => row.value?.trim().toLowerCase() === 'gold') ||
        rows.find((row: MetalMasterRow) => row.aliasName?.trim().toLowerCase() === 'gold') ||
        null;

      if (!match) {
        throw new Error('Gold metal master was not found.');
      }

      hydrateGoldForm(match);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to load Gold metal master.';
      setGoldError(message);
    } finally {
      setGoldLoading(false);
    }
  };

  const fetchPackets = async () => {
    setPacketLoading(true);
    setPacketError(null);
    try {
      const response = await api.get('/products/packets', {
        params: { status: 'ALL', page: 1, limit: 200 },
      });

      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setPacketRows(rows);

      if (rows.length === 0) {
        setSelectedPacketId('');
        setSelectedPacketPrice('');
        return;
      }

      const activeSelection = rows.find((row: PacketRow) => row.id === selectedPacketId) || rows[0];
      setSelectedPacketId(activeSelection.id);
      setSelectedPacketPrice(
        activeSelection.sellingPrice !== null && activeSelection.sellingPrice !== undefined
          ? String(activeSelection.sellingPrice)
          : '',
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to load stone packets.';
      setPacketError(message);
    } finally {
      setPacketLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    void fetchGoldMaster();
    void fetchPackets();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!selectedPacket) {
      return;
    }

    setSelectedPacketPrice(
      selectedPacket.sellingPrice !== null && selectedPacket.sellingPrice !== undefined
        ? String(selectedPacket.sellingPrice)
        : '',
    );
  }, [selectedPacket]);

  const openGoldModal = async () => {
    setGoldModalOpen(true);
    await fetchGoldMaster();
  };

  const openPacketModal = async () => {
    setPacketModalOpen(true);
    await fetchPackets();
  };

  const handleGoldSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!goldMaster) {
      setGoldError('Gold metal master was not found.');
      return;
    }

    const marketPricePerOunce = parseOptionalNumber(goldMarketPricePerOunce);
    const marketPricePerGm = parseOptionalNumber(goldMarketPricePerGm);
    const livePricePerGm = parseOptionalNumber(goldLivePricePerGm);

    if (!goldValue.trim() || !goldAliasName.trim()) {
      setGoldError('Metal name and alias name are required.');
      return;
    }
    if (marketPricePerOunce === null || marketPricePerGm === null) {
      setGoldError('Market Price/Ounce and Market Price/Gms are required.');
      return;
    }

    setGoldSaving(true);
    setGoldError(null);
    try {
      await api.put(`/products/masters/${goldMaster.id}`, {
        value: goldValue.trim(),
        aliasName: goldAliasName.trim(),
        description: goldDescription.trim() || null,
        marketPricePerOunce,
        marketPricePerGm,
        livePricePerGm: livePricePerGm ?? marketPricePerGm,
      });
      await fetchGoldMaster();
      setGoldModalOpen(false);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to update Gold pricing.';
      setGoldError(message);
    } finally {
      setGoldSaving(false);
    }
  };

  const handlePacketSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedPacket) {
      setPacketError('Select a packet first.');
      return;
    }

    const sellingPrice = parseOptionalNumber(selectedPacketPrice);
    if (sellingPrice === null) {
      setPacketError('Selling price is required.');
      return;
    }

    setPacketSaving(true);
    setPacketError(null);
    try {
      await api.put(`/products/packets/${selectedPacket.id}`, {
        sellingPrice,
      });
      await fetchPackets();
      setPacketModalOpen(false);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to update packet pricing.';
      setPacketError(message);
    } finally {
      setPacketSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Operational overview and quick pricing controls.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-slate-200 bg-white/95">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                  {stat.value}
                </p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#AACDDC] bg-[#F3E3D0] text-[#81A6C6]">
                <DashboardStatIcon kind={stat.kind} />
              </span>
            </div>
          </Card>
        ))}
      </div>

      {isSuperAdmin ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="border-[#AACDDC] bg-gradient-to-br from-white to-[#F3E3D0]/50">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#81A6C6]">
                      Quick Action
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">Live Gold Price</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Opens the Gold metal master and updates the stored Gold values. Saving here
                      recalculates metal caratage rates and dependent design metal values.
                    </p>
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#AACDDC] bg-[#81A6C6] text-white">
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M12 3c-3.2 3.8-5 6-5 9a5 5 0 1 0 10 0c0-3-1.8-5.2-5-9Z" />
                    </svg>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Market / Ounce
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      USD {formatMoney(goldMaster?.marketPricePerOunce)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Market / Gm
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      USD {formatMoney(goldMaster?.marketPricePerGm)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Live / Gm
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      USD {formatMoney(goldMaster?.livePricePerGm)}
                    </p>
                  </div>
                </div>

                {goldError ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {goldError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Last synced: {formatTimestamp(goldMaster?.updatedAt)}
                </p>
                <Button type="button" onClick={() => void openGoldModal()} disabled={goldLoading}>
                  {goldLoading ? 'Loading...' : 'Add Live Gold Price'}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border-[#D2C4B4] bg-gradient-to-br from-white to-[#AACDDC]/35">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#81A6C6]">
                      Quick Action
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">Live Packet Price</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Update packet selling prices from the dashboard. Saving here recalculates
                      gemstone amounts in any design using the selected packet.
                    </p>
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#D2C4B4] bg-[#AACDDC] text-white">
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M12 3.75 19.5 8.25v7.5L12 20.25 4.5 15.75v-7.5L12 3.75Z" />
                      <path d="M12 9v6M8.75 12h6.5" />
                    </svg>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Active Packets
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{packetRows.length}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Current Selection
                    </p>
                    <p className="mt-2 truncate text-lg font-semibold text-slate-900">
                      {selectedPacket?.packetName || 'No packet selected'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedPacket
                        ? `USD ${formatMoney(selectedPacket.sellingPrice)}`
                        : 'Load packets to update pricing'}
                    </p>
                  </div>
                </div>

                {packetError ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {packetError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Last synced: {formatTimestamp(selectedPacket?.updatedAt)}
                </p>
                <Button type="button" onClick={() => void openPacketModal()} disabled={packetLoading}>
                  {packetLoading ? 'Loading...' : 'Add Live Packet Price'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      <ActionModal
        open={goldModalOpen}
        title="Update Gold Metal Master"
        description="This uses the same Gold metal master values that feed metal caratage pricing."
        onClose={() => setGoldModalOpen(false)}
      >
        <form onSubmit={handleGoldSubmit} className="space-y-4">
          <p className="text-sm font-medium text-rose-700">* Required fields</p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Metal Name*</label>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={goldValue}
                onChange={(event) => setGoldValue(event.target.value)}
                placeholder="Gold"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Alias Name*</label>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={goldAliasName}
                onChange={(event) => setGoldAliasName(event.target.value)}
                placeholder="G"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Market Price/Ounce*</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={goldMarketPricePerOunce}
                onChange={(event) => setGoldMarketPricePerOunce(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Market Price/Gms*</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={goldMarketPricePerGm}
                onChange={(event) => setGoldMarketPricePerGm(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Live Price/Gms*</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={goldLivePricePerGm}
                onChange={(event) => setGoldLivePricePerGm(event.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                className="h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={goldDescription}
                onChange={(event) => setGoldDescription(event.target.value)}
                placeholder="Description"
              />
            </div>
          </div>

          {goldError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {goldError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="submit" size="sm" disabled={goldSaving || goldLoading}>
              {goldSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setGoldModalOpen(false)}>
              Close
            </Button>
          </div>
        </form>
      </ActionModal>

      <ActionModal
        open={packetModalOpen}
        title="Update Packet Selling Price"
        description="Choose a packet and update its live selling price. The backend will refresh dependent design gemstone values."
        onClose={() => setPacketModalOpen(false)}
      >
        <form onSubmit={handlePacketSubmit} className="space-y-4">
          <p className="text-sm font-medium text-rose-700">* Required fields</p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Packet*</label>
              <select
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={selectedPacketId}
                onChange={(event) => setSelectedPacketId(event.target.value)}
                required
              >
                <option value="">Select Packet</option>
                {packetRows.map((packet) => (
                  <option key={packet.id} value={packet.id}>
                    {packet.packetName}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Packet Info</label>
              <div className="min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                {packetInfo || 'Select a packet to review its stone details.'}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Price In</label>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {selectedPacket?.priceIn === 'PCS' ? 'PCS' : 'WT'}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Weight/Pc</label>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {selectedPacket
                  ? `${formatMoney(selectedPacket.weightPerPc, 3)} ${selectedPacket.weightUnit || 'CTS'}`
                  : '0.000 CTS'}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Selling Price*</label>
              <div className="flex">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-l border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={selectedPacketPrice}
                  onChange={(event) => setSelectedPacketPrice(event.target.value)}
                  placeholder="0.00"
                  required
                />
                <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
                  USD
                </span>
              </div>
            </div>
          </div>

          {packetError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {packetError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="submit" size="sm" disabled={packetSaving || packetLoading}>
              {packetSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setPacketModalOpen(false)}>
              Close
            </Button>
          </div>
        </form>
      </ActionModal>
    </div>
  );
}
