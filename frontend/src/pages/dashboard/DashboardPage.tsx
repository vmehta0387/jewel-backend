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

function formatCurrency(value?: number | null): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return '$0';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCount(value?: number | null): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US').format(amount);
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

function DashboardStatIcon({
  kind,
}: {
  kind: 'companies' | 'branches' | 'designs' | 'revenue';
}) {
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

  if (kind === 'branches') {
    return (
      <svg {...svgProps}>
        <circle cx="6.75" cy="6.75" r="2.25" />
        <circle cx="17.25" cy="6.75" r="2.25" />
        <circle cx="17.25" cy="17.25" r="2.25" />
        <path d="M9 6.75h6M6.75 9v6.75a1.5 1.5 0 0 0 1.5 1.5H15" />
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

function OrderSummaryIcon({
  kind,
}: {
  kind: 'received' | 'due' | 'sales' | 'active';
}) {
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

  if (kind === 'received') {
    return (
      <svg {...svgProps}>
        <path d="M21 12a9 9 0 1 1-18 0" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 5v10" />
      </svg>
    );
  }

  if (kind === 'due') {
    return (
      <svg {...svgProps}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M12 14h5" />
      </svg>
    );
  }

  if (kind === 'sales') {
    return (
      <svg {...svgProps}>
        <path d="M4 18h16" />
        <path d="M6 15l3-3 3 2 4-5 2 3" />
      </svg>
    );
  }

  return (
    <svg {...svgProps}>
      <path d="M6 4h12v6H6z" />
      <path d="M4 10h16v10H4z" />
      <path d="M9 14h6" />
    </svg>
  );
}

function MiniBarChart({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <svg viewBox="0 0 120 48" className="h-14 w-full">
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      {values.map((value, index) => {
        const height = Math.max(4, (value / max) * 40);
        const x = index * 16 + 4;
        const y = 44 - height;
        return (
          <rect
            key={`${value}-${index}`}
            x={x}
            y={y}
            width={10}
            height={height}
            rx={3}
            fill="url(#barGradient)"
            className="transition-all duration-500 ease-out hover:opacity-80 cursor-pointer"
          />
        );
      })}
    </svg>
  );
}

function MiniLineChart({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => {
    const x = index * 16 + 4;
    const y = 44 - (value / max) * 36;
    return `${x},${y}`;
  });

  return (
    <svg viewBox="0 0 120 48" className="h-14 w-full">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#6366f1"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-sm"
      />
      {points.map((point, index) => {
        const [x, y] = point.split(',');
        return <circle key={`${point}-${index}`} cx={x} cy={y} r={3} fill="#4f46e5" className="hover:r-4 transition-all duration-300 cursor-pointer shadow-soft outline outline-2 outline-white" />;
      })}
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

  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<Date | null>(null);
  const [statsData, setStatsData] = useState<{
    companies: number | null;
    branches: number | null;
    designs: number | null;
    totalValue: number | null;
  }>({
    companies: null,
    branches: null,
    designs: null,
    totalValue: null,
  });
  const [orderSummary, setOrderSummary] = useState<{
    activeOrders: number | null;
    ordersReceivedToday: number | null;
    ordersDueToday: number | null;
    salesThisWeek: number | null;
  }>({
    activeOrders: null,
    ordersReceivedToday: null,
    ordersDueToday: null,
    salesThisWeek: null,
  });
  const [orderTrends, setOrderTrends] = useState<{ date: string; orders: number; sales: number }[]>([]);

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

  const fetchCompaniesCount = async (): Promise<number> => {
    const response = await api.get('/companies', {
      params: { page: 1, limit: 1, status: 'ALL' },
    });
    const total = response.data?.total;
    if (typeof total === 'number') {
      return total;
    }
    return Array.isArray(response.data?.data) ? response.data.data.length : 0;
  };

  const fetchBranchesCount = async (): Promise<number> => {
    const response = await api.get('/branches', {
      params: { page: 1, limit: 1, status: 'ALL' },
    });
    const total = response.data?.total;
    if (typeof total === 'number') {
      return total;
    }
    return Array.isArray(response.data?.data) ? response.data.data.length : 0;
  };

  const fetchDesignSummary = async (): Promise<{ designs: number; totalValue: number }> => {
    let page = 1;
    const limit = 200;
    let totalDesigns = 0;
    let totalValue = 0;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await api.get('/products', {
        params: { page, limit, status: 'ALL' },
      });
      const data = Array.isArray(response.data?.data) ? response.data.data : [];
      if (page === 1) {
        totalDesigns = Number(response.data?.total ?? data.length);
        totalPages = Number(
          response.data?.totalPages ?? (totalDesigns > 0 ? Math.ceil(totalDesigns / limit) : 1),
        );
      }
      totalValue += data.reduce((sum: number, row: any) => sum + Number(row?.totalValue ?? 0), 0);

      if (data.length < limit && !response.data?.totalPages) {
        totalPages = page;
      }
      page += 1;
    }

    return { designs: totalDesigns, totalValue };
  };

  const fetchOrderSummary = async () => {
    const response = await api.get('/orders/summary');
    return response.data || {};
  };

  const fetchOrderTrends = async () => {
    const response = await api.get('/orders/trends');
    return Array.isArray(response.data?.points) ? response.data.points : [];
  };

  const loadStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const [companiesResult, branchesResult, designsResult, ordersResult, trendsResult] = await Promise.allSettled([
        fetchCompaniesCount(),
        fetchBranchesCount(),
        fetchDesignSummary(),
        fetchOrderSummary(),
        fetchOrderTrends(),
      ]);

      const nextStats = {
        companies:
          companiesResult.status === 'fulfilled' ? companiesResult.value : statsData.companies,
        branches:
          branchesResult.status === 'fulfilled' ? branchesResult.value : statsData.branches,
        designs:
          designsResult.status === 'fulfilled'
            ? designsResult.value.designs
            : statsData.designs,
        totalValue:
          designsResult.status === 'fulfilled'
            ? designsResult.value.totalValue
            : statsData.totalValue,
      };

      setStatsData(nextStats);
      if (ordersResult.status === 'fulfilled') {
        setOrderSummary((prev) => ({
          activeOrders:
            ordersResult.value?.activeOrders ?? prev.activeOrders,
          ordersReceivedToday:
            ordersResult.value?.ordersReceivedToday ?? prev.ordersReceivedToday,
          ordersDueToday:
            ordersResult.value?.ordersDueToday ?? prev.ordersDueToday,
          salesThisWeek:
            ordersResult.value?.salesThisWeek ?? prev.salesThisWeek,
        }));
      }
      if (trendsResult.status === 'fulfilled') {
        setOrderTrends(trendsResult.value);
      }
      setStatsUpdatedAt(new Date());

      if (
        companiesResult.status === 'rejected' ||
        branchesResult.status === 'rejected' ||
        designsResult.status === 'rejected' ||
        ordersResult.status === 'rejected' ||
        trendsResult.status === 'rejected'
      ) {
        setStatsError('Some dashboard metrics could not be loaded.');
      }
    } catch (error: any) {
      setStatsError(error?.response?.data?.message || 'Unable to load dashboard metrics.');
    } finally {
      setStatsLoading(false);
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
    void loadStats();
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

  const handleGoldMarketPricePerOunceChange = (value: string) => {
    setGoldMarketPricePerOunce(value);
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    const perGm = (parsed / 31.1035).toFixed(2);
    if (perGm !== goldMarketPricePerGm) {
      setGoldMarketPricePerGm(perGm);
    }
  };

  const handleGoldLivePricePerGmChange = (value: string) => {
    setGoldLivePricePerGm(value);
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    const perGm = parsed.toFixed(2);
    const perOunce = (parsed * 31.1035).toFixed(2);
    if (perGm !== goldMarketPricePerGm) {
      setGoldMarketPricePerGm(perGm);
    }
    if (perOunce !== goldMarketPricePerOunce) {
      setGoldMarketPricePerOunce(perOunce);
    }
  };

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
    <div className="dashboard-shell space-y-8 animate-fade-in pb-12">
      <div className="glass-panel rounded-2xl px-5 py-4 md:px-6 md:py-5 shadow-glass-md flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-t border-l border-white">
        <div className="flex items-center gap-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171311] text-[#c89948] shadow-soft ring-1 ring-[#dec8a1]">
            <span className="text-base">⚡</span>
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-[1.38rem] font-bold tracking-tight text-[#211913] leading-none">
              BLITZ NYC Admin
            </h1>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center bg-white/50 p-2 rounded-2xl border border-slate-200/50 backdrop-blur-sm">
          <div className="px-3 py-1 text-xs font-semibold text-slate-500 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {statsUpdatedAt
              ? `Synced at ${statsUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Connecting...'}
          </div>
          <Button type="button" size="sm" onClick={() => void loadStats()} disabled={statsLoading} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
            {statsLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {statsError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 backdrop-blur-md px-5 py-4 text-sm font-medium text-rose-700 shadow-sm animate-fade-in">
          {statsError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white relative group">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-bold tracking-wider text-indigo-700">
                Total Companies
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
                {statsLoading && statsData.companies === null ? '--' : formatCount(statsData.companies)}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500 tracking-wide">Active + inactive</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm transition-transform group-hover:scale-110">
              <DashboardStatIcon kind="companies" />
            </span>
          </div>
        </Card>
        
        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white relative group">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-bold tracking-wider text-sky-700">
                Total Branches
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
                {statsLoading && statsData.branches === null ? '--' : formatCount(statsData.branches)}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500 tracking-wide">Across all companies</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 shadow-sm transition-transform group-hover:scale-110">
              <DashboardStatIcon kind="branches" />
            </span>
          </div>
        </Card>

        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white relative group">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-bold tracking-wider text-violet-700">
                Designs
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
                {statsLoading && statsData.designs === null ? '--' : formatCount(statsData.designs)}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500 tracking-wide">All design entries</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 border border-violet-100 text-violet-600 shadow-sm transition-transform group-hover:scale-110">
              <DashboardStatIcon kind="designs" />
            </span>
          </div>
        </Card>

        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white relative group">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-bold tracking-wider text-emerald-700">
                Design Value
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
                {statsLoading && statsData.totalValue === null ? '--' : formatCurrency(statsData.totalValue)}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500 tracking-wide">Aggregate estimated value</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm transition-transform group-hover:scale-110">
              <DashboardStatIcon kind="revenue" />
            </span>
          </div>
        </Card>
      </div>

      <div className="glass-panel rounded-2xl px-6 py-5 shadow-glass-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-t border-l border-white mt-8">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 shadow-inner">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-xl font-bold tracking-tight text-slate-800">Order Activity</h2>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/50 bg-white/50 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm flex items-center gap-2 mt-4 md:mt-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          {statsUpdatedAt ? `Updated ${statsUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Updating metrics...'}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white relative group">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-bold tracking-wider text-blue-700">
                Orders Received
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
                {statsLoading && orderSummary.ordersReceivedToday === null ? '--' : formatCount(orderSummary.ordersReceivedToday)}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500 tracking-wide">Today</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 shadow-sm transition-transform group-hover:scale-110">
              <OrderSummaryIcon kind="received" />
            </span>
          </div>
        </Card>
        
        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white relative group">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-bold tracking-wider text-amber-700">
                Orders Due Today
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
                {statsLoading && orderSummary.ordersDueToday === null ? '--' : formatCount(orderSummary.ordersDueToday)}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500 tracking-wide">Delivery schedule</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 shadow-sm transition-transform group-hover:scale-110">
              <OrderSummaryIcon kind="due" />
            </span>
          </div>
        </Card>

        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white relative group">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-bold tracking-wider text-emerald-700">
                Sales This Week
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
                {statsLoading && orderSummary.salesThisWeek === null ? '--' : formatCurrency(orderSummary.salesThisWeek)}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500 tracking-wide">Week to date</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm transition-transform group-hover:scale-110">
              <OrderSummaryIcon kind="sales" />
            </span>
          </div>
        </Card>

        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white relative group">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-bold tracking-wider text-rose-700">
                Active Orders
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
                {statsLoading && orderSummary.activeOrders === null ? '--' : formatCount(orderSummary.activeOrders)}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500 tracking-wide">Live pipeline</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 shadow-sm transition-transform group-hover:scale-110">
              <OrderSummaryIcon kind="active" />
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-bold tracking-wider text-indigo-700">
                Orders Trend
              </p>
              <p className="mt-2 text-xl font-bold tracking-tight text-slate-800">Last 7 days</p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {formatCount(orderTrends.reduce((sum, row) => sum + (row.orders || 0), 0))} orders
              </p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
              <OrderSummaryIcon kind="received" />
            </span>
          </div>
          <div className="mt-6 rounded-2xl border border-slate-200/50 bg-white/60 backdrop-blur-sm px-5 py-5 shadow-inner">
            <MiniBarChart values={orderTrends.map((row) => row.orders || 0)} />
          </div>
        </Card>
        
        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-bold tracking-wider text-indigo-700">
                Sales Trend
              </p>
              <p className="mt-2 text-xl font-bold tracking-tight text-slate-800">Last 7 days</p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {formatCurrency(orderTrends.reduce((sum, row) => sum + (row.sales || 0), 0))}
              </p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
              <OrderSummaryIcon kind="sales" />
            </span>
          </div>
          <div className="mt-6 rounded-2xl border border-slate-200/50 bg-white/60 backdrop-blur-sm px-5 py-5 shadow-inner">
            <MiniLineChart values={orderTrends.map((row) => row.sales || 0)} />
          </div>
        </Card>
      </div>

      {isSuperAdmin ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 mt-2">
          <Card className="glass-panel rounded-3xl p-1 hover-lift border-t border-l border-white/60 group overflow-hidden">
            <div className="h-full bg-slate-50/40 rounded-[1.35rem] px-6 py-6 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col justify-center">
                    <h2 className="text-xl font-bold tracking-tight text-slate-800 group-hover:text-indigo-600 transition-colors">Live Gold Price</h2>
                  </div>
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-soft ring-1 ring-slate-200">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3c-3.2 3.8-5 6-5 9a5 5 0 1 0 10 0c0-3-1.8-5.2-5-9Z" />
                    </svg>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-200/50 bg-white shadow-sm px-4 py-3">
                    <p className="text-[0.80rem] font-bold tracking-wider text-slate-700">/ Ounce</p>
                    <p className="mt-1.5 text-[0.95rem] font-bold text-slate-800">
                      <span className="text-slate-400 font-medium text-xs mr-1">$</span>
                      {formatMoney(goldMaster?.marketPricePerOunce)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/50 bg-white shadow-sm px-4 py-3">
                    <p className="text-[0.80rem] font-bold tracking-wider text-slate-700">/ Gm</p>
                    <p className="mt-1.5 text-[0.95rem] font-bold text-slate-800">
                      <span className="text-slate-400 font-medium text-xs mr-1">$</span>
                      {formatMoney(goldMaster?.marketPricePerGm)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 shadow-sm px-4 py-3">
                    <p className="text-[0.80rem] font-bold tracking-wider text-indigo-700">Live / Gm</p>
                    <p className="mt-1.5 text-[0.95rem] font-bold text-indigo-700">
                      <span className="text-indigo-400 font-medium text-xs mr-1">$</span>
                      {formatMoney(goldMaster?.livePricePerGm)}
                    </p>
                  </div>
                </div>

                {goldError ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-2.5 text-sm font-medium text-rose-700 shadow-sm">
                    {goldError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-200/60 pt-5 mt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {formatTimestamp(goldMaster?.updatedAt)}
                </p>
                <Button type="button" size="sm" onClick={() => void openGoldModal()} disabled={goldLoading} className="shadow-sm hover:shadow-md transition-shadow">
                  {goldLoading ? 'Loading...' : 'Update Gold Price'}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="glass-panel rounded-3xl p-1 hover-lift border-t border-l border-white/60 group overflow-hidden">
            <div className="h-full bg-slate-50/40 rounded-[1.35rem] px-6 py-6 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col justify-center">
                    <h2 className="text-xl font-bold tracking-tight text-slate-800 group-hover:text-indigo-600 transition-colors">Live Packet Price</h2>
                  </div>
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-500 shadow-soft ring-1 ring-slate-200">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3.75 19.5 8.25v7.5L12 20.25 4.5 15.75v-7.5L12 3.75Z" />
                      <path d="M12 9v6M8.75 12h6.5" />
                    </svg>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/50 bg-white shadow-sm px-4 py-3">
                    <p className="text-[0.80rem] font-bold tracking-wider text-slate-700">Total Packets</p>
                    <p className="mt-1.5 text-lg font-bold text-slate-800">{packetRows.length}</p>
                  </div>
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 shadow-sm px-4 py-3 md:col-span-2 flex flex-col justify-center">
                    <div className="flex justify-between items-start">
                      <p className="text-[0.80rem] font-bold tracking-wider text-indigo-700">Selected</p>
                      {selectedPacket ? (
                        <p className="text-[0.95rem] font-bold text-indigo-700">
                          <span className="text-indigo-400 font-medium text-xs mr-1">$</span>
                          {formatMoney(selectedPacket.sellingPrice)}
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-1.5 truncate text-[0.95rem] font-bold text-slate-800">
                      {selectedPacket?.packetName || 'No packet selected'}
                    </p>
                  </div>
                </div>

                {packetError ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-2.5 text-sm font-medium text-rose-700 shadow-sm">
                    {packetError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-200/60 pt-5 mt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {formatTimestamp(selectedPacket?.updatedAt)}
                </p>
                <Button type="button" size="sm" onClick={() => void openPacketModal()} disabled={packetLoading} className="shadow-sm hover:shadow-md transition-shadow">
                  {packetLoading ? 'Loading...' : 'Update Packet Price'}
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
                onChange={(event) => handleGoldMarketPricePerOunceChange(event.target.value)}
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
                onChange={(event) => handleGoldLivePricePerGmChange(event.target.value)}
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

