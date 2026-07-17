import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function toDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toDateParam(start), end: toDateParam(end) };
}

function getLastSevenDaysRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return { start: toDateParam(start), end: toDateParam(end) };
}

function DashboardStatIcon({
  kind,
}: {
  kind: 'companies' | 'branches' | 'designs' | 'variants' | 'revenue';
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

  if (kind === 'variants') {
    return (
      <svg {...svgProps}>
        <rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="13" y="4.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="4.5" y="13" width="6.5" height="6.5" rx="1.5" />
        <rect x="13" y="13" width="6.5" height="6.5" rx="1.5" />
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
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const didLoadStatsRef = useRef(false);

  const [metals, setMetals] = useState<MetalMasterRow[]>([]);
  const [goldMaster, setGoldMaster] = useState<MetalMasterRow | null>(null);
  const [platMaster, setPlatMaster] = useState<MetalMasterRow | null>(null);

  const [metalModalOpen, setMetalModalOpen] = useState(false);
  const [metalLoading, setMetalLoading] = useState(false);
  const [metalSaving, setMetalSaving] = useState(false);
  const [metalError, setMetalError] = useState<string | null>(null);

  const [selectedMetalId, setSelectedMetalId] = useState('');
  const [priceOunce, setPriceOunce] = useState('');
  const [priceGm, setPriceGm] = useState('');
  const [livePriceGm, setLivePriceGm] = useState('');
  const [packetSearchModalOpen, setPacketSearchModalOpen] = useState(false);
  const [packetSearchQuery, setPacketSearchQuery] = useState('');
  const [packetsLoaded, setPacketsLoaded] = useState(false);
  const [packetDropdownFilter, setPacketDropdownFilter] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [packetSaving, setPacketSaving] = useState(false);
  const [packetError, setPacketError] = useState<string | null>(null);
  const [packetRows, setPacketRows] = useState<PacketRow[]>([]);
  const [selectedPacketId, setSelectedPacketId] = useState('');
  const [selectedPacketPrice, setSelectedPacketPrice] = useState('');
  const [packetDraftPrices, setPacketDraftPrices] = useState<Record<string, string>>({});

  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<Date | null>(null);
  const [statsData, setStatsData] = useState<{
    companies: number | null;
    branches: number | null;
    designs: number | null;
    versions: number | null;
  }>({
    companies: null,
    branches: null,
    designs: null,
    versions: null,
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
  const changedPacketPriceRows = useMemo(
    () =>
      packetRows.filter((row) => {
        const draft = packetDraftPrices[row.id] ?? '';
        const current = row.sellingPrice !== null && row.sellingPrice !== undefined ? String(row.sellingPrice) : '';
        return draft.trim() !== current.trim();
      }),
    [packetRows, packetDraftPrices],
  );

  const openOrdersView = (view: 'received-today' | 'due-today' | 'sales-this-week' | 'last-7-days' | 'active') => {
    if (view === 'sales-this-week') {
      const week = getCurrentWeekRange();
      navigate(`/orders?view=sales-this-week&createdFrom=${week.start}&createdTo=${week.end}`);
      return;
    }
    if (view === 'last-7-days') {
      const range = getLastSevenDaysRange();
      navigate(`/orders?view=last-7-days&createdFrom=${range.start}&createdTo=${range.end}`);
      return;
    }
    navigate(`/orders?view=${view}`);
  };



  const fetchMetals = async () => {
    setMetalLoading(true);
    setMetalError(null);
    try {
      const response = await api.get('/products/masters', {
        params: { type: 'METAL_NAME', status: 'ALL' },
      });

      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setMetals(rows);

      const gold =
        rows.find((row: MetalMasterRow) => row.value?.trim().toLowerCase() === 'gold') ||
        rows.find((row: MetalMasterRow) => row.aliasName?.trim().toLowerCase() === 'gold') ||
        null;
      
      const plat =
        rows.find((row: MetalMasterRow) => row.value?.trim().toLowerCase() === 'platinum') ||
        rows.find((row: MetalMasterRow) => row.aliasName?.trim().toLowerCase() === 'pt') ||
        null;

      if (gold) setGoldMaster(gold);
      if (plat) setPlatMaster(plat);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to load metal masters.';
      setMetalError(message);
    } finally {
      setMetalLoading(false);
    }
  };

  useEffect(() => {
    const selected = metals.find((m) => m.id === selectedMetalId);
    if (selected) {
      setPriceOunce(
        selected.marketPricePerOunce !== null && selected.marketPricePerOunce !== undefined
          ? String(selected.marketPricePerOunce)
          : '',
      );
      setPriceGm(
        selected.marketPricePerGm !== null && selected.marketPricePerGm !== undefined
          ? String(selected.marketPricePerGm)
          : '',
      );
      setLivePriceGm(
        selected.livePricePerGm !== null && selected.livePricePerGm !== undefined
          ? String(selected.livePricePerGm)
          : '',
      );
    } else {
      setPriceOunce('');
      setPriceGm('');
      setLivePriceGm('');
    }
  }, [selectedMetalId, metals]);

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

  const fetchDesignSummary = async (): Promise<{ designs: number; versions: number }> => {
    const response = await api.get('/products/dashboard-summary', {
      params: { status: 'ALL' },
    });

    return {
      designs: Number(response.data?.designs || 0),
      versions: Number(response.data?.versions || 0),
    };
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
        versions:
          designsResult.status === 'fulfilled'
            ? designsResult.value.versions
            : statsData.versions,
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
    setPacketError(null);
    try {
      const response = await api.get('/products/packets', {
        params: { status: 'ALL', page: 1, limit: 200 },
      });

      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setPacketRows(rows);
      setPacketDraftPrices(
        Object.fromEntries(
          rows.map((row: PacketRow) => [
            row.id,
            row.sellingPrice !== null && row.sellingPrice !== undefined ? String(row.sellingPrice) : '',
          ]),
        ),
      );

      if (rows.length === 0) {
        setSelectedPacketId('');
        setSelectedPacketPrice('');
        setPacketDraftPrices({});
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
    }
  };

  const ensurePacketsLoaded = async () => {
    if (!packetsLoaded) {
      await fetchPackets();
      setPacketsLoaded(true);
    }
  };

  useEffect(() => {
    if (didLoadStatsRef.current) {
      return;
    }
    didLoadStatsRef.current = true;
    void loadStats();
    void fetchMetals();
  }, []);

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

  const handlePriceOunceChange = (value: string) => {
    setPriceOunce(value);
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    const perGm = (parsed / 31.1035).toFixed(4);
    if (perGm !== priceGm) {
      setPriceGm(perGm);
    }
  };

  const handleLivePriceGmChange = (value: string) => {
    setLivePriceGm(value);
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    const perGm = parsed.toFixed(4);
    const perOunce = (parsed * 31.1035).toFixed(2);
    if (perGm !== priceGm) {
      setPriceGm(perGm);
    }
    if (perOunce !== priceOunce) {
      setPriceOunce(perOunce);
    }
  };

  const openMetalModal = (defaultId?: string) => {
    setMetalError(null);
    setMetalModalOpen(true);
    if (defaultId) {
      setSelectedMetalId(defaultId);
    } else if (metals.length > 0) {
      setSelectedMetalId(metals[0].id);
    }
  };



  const handleMetalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMetalId) {
      setMetalError('Please select a metal.');
      return;
    }

    const marketPricePerOunce = parseOptionalNumber(priceOunce);
    const marketPricePerGm = parseOptionalNumber(priceGm);
    const livePricePerGm = parseOptionalNumber(livePriceGm);

    if (marketPricePerOunce === null || marketPricePerGm === null) {
      setMetalError('Market Price/Ounce and Market Price/Gms are required.');
      return;
    }

    setMetalSaving(true);
    setMetalError(null);
    try {
      const selected = metals.find((m) => m.id === selectedMetalId);
      if (!selected) {
        throw new Error('Selected metal not found.');
      }

      await api.put(`/products/masters/${selectedMetalId}`, {
        value: selected.value,
        aliasName: selected.aliasName || selected.value,
        description: selected.description || null,
        marketPricePerOunce,
        marketPricePerGm,
        livePricePerGm: livePricePerGm ?? marketPricePerGm,
      });

      await fetchMetals();
      setMetalModalOpen(false);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to update metal pricing.';
      setMetalError(message);
    } finally {
      setMetalSaving(false);
    }
  };



  const handleDirectPacketPriceSave = async (event?: FormEvent) => {
    if (event) event.preventDefault();

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
      setSelectedPacketId('');
      setSelectedPacketPrice('');
      setPacketDropdownFilter('');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to update packet price.';
      setPacketError(message);
    } finally {
      setPacketSaving(false);
    }
  };

  const handleBulkPacketPriceSave = async () => {
    if (!changedPacketPriceRows.length) return;

    const updates = changedPacketPriceRows.map((row) => {
      const sellingPrice = parseOptionalNumber(packetDraftPrices[row.id] ?? '');
      return { row, sellingPrice };
    });
    const invalid = updates.find((item) => item.sellingPrice === null);
    if (invalid) {
      setPacketError(`Selling price is required for packet ${invalid.row.packetName}.`);
      return;
    }

    setPacketSaving(true);
    setPacketError(null);
    try {
      await Promise.all(
        updates.map(({ row, sellingPrice }) =>
          api.put(`/products/packets/${row.id}`, {
            sellingPrice,
          }),
        ),
      );
      await fetchPackets();
      if (selectedPacketId) {
        const nextSelected = packetRows.find((row) => row.id === selectedPacketId);
        const nextDraft = nextSelected ? packetDraftPrices[nextSelected.id] : '';
        setSelectedPacketPrice(nextDraft || selectedPacketPrice);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to update packet prices.';
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
          <button type="button" onClick={() => navigate('/companies')} className="flex w-full items-start justify-between gap-6 text-left">
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
          </button>
        </Card>
        
        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white relative group">
          <button type="button" onClick={() => navigate('/branches')} className="flex w-full items-start justify-between gap-6 text-left">
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
          </button>
        </Card>

        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white relative group">
          <button type="button" onClick={() => navigate('/products')} className="flex w-full items-start justify-between gap-6 text-left">
            <div>
              <p className="text-sm font-bold tracking-wider text-violet-700">
                Design Families
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
                {statsLoading && statsData.designs === null ? '--' : formatCount(statsData.designs)}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500 tracking-wide">Primary designs only</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 border border-violet-100 text-violet-600 shadow-sm transition-transform group-hover:scale-110">
              <DashboardStatIcon kind="designs" />
            </span>
          </button>
        </Card>

        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white relative group">
          <button type="button" onClick={() => navigate('/products')} className="flex w-full items-start justify-between gap-6 text-left">
            <div>
              <p className="text-sm font-bold tracking-wider text-emerald-700">
                Versions
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
                {statsLoading && statsData.versions === null ? '--' : formatCount(statsData.versions)}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500 tracking-wide">Generated variant entries</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm transition-transform group-hover:scale-110">
              <DashboardStatIcon kind="variants" />
            </span>
          </button>
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
          <button type="button" onClick={() => openOrdersView('received-today')} className="flex w-full items-start justify-between gap-6 text-left">
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
          </button>
        </Card>
        
        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white relative group">
          <button type="button" onClick={() => openOrdersView('due-today')} className="flex w-full items-start justify-between gap-6 text-left">
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
          </button>
        </Card>

        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white relative group">
          <button type="button" onClick={() => openOrdersView('sales-this-week')} className="flex w-full items-start justify-between gap-6 text-left">
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
          </button>
        </Card>

        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white relative group">
          <button type="button" onClick={() => openOrdersView('active')} className="flex w-full items-start justify-between gap-6 text-left">
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
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white">
          <button type="button" onClick={() => openOrdersView('last-7-days')} className="block w-full text-left">
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
          </button>
        </Card>
        
        <Card className="glass-panel overflow-hidden rounded-2xl px-6 py-6 hover-lift border-t border-l border-white">
          <button type="button" onClick={() => openOrdersView('last-7-days')} className="block w-full text-left">
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
          </button>
        </Card>
      </div>

      {isSuperAdmin ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 mt-2">
          {/* Gold Price Card */}
          <Card className="glass-panel rounded-3xl p-1 hover-lift border-t border-l border-white/60 group overflow-hidden">
            <div className="h-full bg-slate-50/40 rounded-[1.35rem] px-6 py-6 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col justify-center">
                    <h2 className="text-xl font-bold tracking-tight text-slate-800 group-hover:text-amber-600 transition-colors">Live Gold Price</h2>
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
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-200/60 pt-5 mt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {formatTimestamp(goldMaster?.updatedAt)}
                </p>
                <Button type="button" size="sm" onClick={() => openMetalModal(goldMaster?.id)} disabled={metalLoading} className="shadow-sm hover:shadow-md transition-shadow">
                  {metalLoading ? 'Loading...' : 'Update Gold Price'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Platinum Price Card */}
          <Card className="glass-panel rounded-3xl p-1 hover-lift border-t border-l border-white/60 group overflow-hidden">
            <div className="h-full bg-slate-50/40 rounded-[1.35rem] px-6 py-6 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col justify-center">
                    <h2 className="text-xl font-bold tracking-tight text-slate-800 group-hover:text-slate-500 transition-colors">Live Platinum Price</h2>
                  </div>
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-soft ring-1 ring-slate-200">
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
                      {formatMoney(platMaster?.marketPricePerOunce)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/50 bg-white shadow-sm px-4 py-3">
                    <p className="text-[0.80rem] font-bold tracking-wider text-slate-700">/ Gm</p>
                    <p className="mt-1.5 text-[0.95rem] font-bold text-slate-800">
                      <span className="text-slate-400 font-medium text-xs mr-1">$</span>
                      {formatMoney(platMaster?.marketPricePerGm)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 shadow-sm px-4 py-3">
                    <p className="text-[0.80rem] font-bold tracking-wider text-indigo-700">Live / Gm</p>
                    <p className="mt-1.5 text-[0.95rem] font-bold text-indigo-700">
                      <span className="text-indigo-400 font-medium text-xs mr-1">$</span>
                      {formatMoney(platMaster?.livePricePerGm)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-200/60 pt-5 mt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {formatTimestamp(platMaster?.updatedAt)}
                </p>
                <Button type="button" size="sm" onClick={() => openMetalModal(platMaster?.id)} disabled={metalLoading} className="shadow-sm hover:shadow-md transition-shadow">
                  {metalLoading ? 'Loading...' : 'Update Platinum Price'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Packet Price Card */}
          <Card className="glass-panel rounded-3xl p-1 hover-lift border-t border-l border-white/60 group overflow-hidden">
            <div className="h-full bg-slate-50/40 rounded-[1.35rem] px-6 py-6 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col justify-center">
                    <h2 className="text-xl font-bold tracking-tight text-slate-800 group-hover:text-indigo-600 transition-colors">Live Packet Price</h2>
                    <p className="text-xs text-slate-500 font-medium">Total: {packetRows.length} Packets</p>
                  </div>
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-500 shadow-soft ring-1 ring-slate-200">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3.75 19.5 8.25v7.5L12 20.25 4.5 15.75v-7.5L12 3.75Z" />
                      <path d="M12 9v6M8.75 12h6.5" />
                    </svg>
                  </span>
                </div>

                {/* Custom Searchable Dropdown selector and advanced search */}
                <div className="flex items-center gap-2 relative">
                  <div className="flex-1 relative">
                    <button
                      type="button"
                      onClick={async () => {
                        await ensurePacketsLoaded();
                        setDropdownOpen(!dropdownOpen);
                      }}
                      className="w-full flex items-center justify-between rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white text-slate-700 hover:border-slate-400 focus:border-indigo-500 focus:outline-none transition-colors"
                    >
                      <span className="truncate font-medium">
                        {selectedPacket ? selectedPacket.packetName : 'Select Packet'}
                      </span>
                      <span className="text-slate-400 text-[10px] ml-1">▼</span>
                    </button>

                    {dropdownOpen && (
                      <>
                        {/* Backdrop overlay to close when clicking outside */}
                        <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                        
                        {/* Dropdown Options Popup with embedded search bar */}
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-40 overflow-hidden flex flex-col max-h-64">
                          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5">
                            <span className="text-[10px]">🔍</span>
                            <input
                              type="text"
                              className="flex-1 text-xs bg-transparent focus:outline-none placeholder-slate-400"
                              placeholder="Search packets..."
                              value={packetDropdownFilter}
                              onChange={(e) => setPacketDropdownFilter(e.target.value)}
                              autoFocus
                            />
                            {packetDropdownFilter && (
                              <button
                                type="button"
                                onClick={() => setPacketDropdownFilter('')}
                                className="text-slate-400 hover:text-slate-600 text-[10px]"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          
                          <div className="overflow-y-auto divide-y divide-slate-100 max-h-48">
                            {packetRows
                              .filter((p) =>
                                p.packetName.toLowerCase().includes(packetDropdownFilter.toLowerCase())
                              )
                              .map((packet) => (
                                <button
                                  key={packet.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPacketId(packet.id);
                                    setDropdownOpen(false);
                                    setPacketDropdownFilter('');
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-600 transition-colors font-medium flex items-center justify-between ${
                                    packet.id === selectedPacketId ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700'
                                  }`}
                                >
                                  <span className="truncate">{packet.packetName}</span>
                                  {packet.stone && (
                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2">
                                      {packet.stone}
                                    </span>
                                  )}
                                </button>
                              ))}
                            {packetRows.filter((p) =>
                              p.packetName.toLowerCase().includes(packetDropdownFilter.toLowerCase())
                            ).length === 0 && (
                              <div className="px-3 py-4 text-xs text-slate-400 italic text-center">
                                No matching packets found.
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await ensurePacketsLoaded();
                      setPacketSearchModalOpen(true);
                    }}
                    className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center shrink-0 self-stretch animate-fade-in"
                    title="Advanced Search"
                  >
                    <span className="text-sm">🔍</span>
                  </button>
                </div>

                {/* Selected packet specs */}
                {selectedPacket ? (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-slate-200/50 bg-white/60 p-3 text-xs text-slate-600 shadow-inner">
                    <div>
                      <span className="font-semibold text-slate-400 block">Stone:</span>
                      <span className="font-bold text-slate-800">{selectedPacket.stone || '--'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block">Shape:</span>
                      <span className="font-bold text-slate-800">{selectedPacket.shape || '--'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block">Size:</span>
                      <span className="font-bold text-slate-800">{selectedPacket.size || '--'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block">Color / Quality:</span>
                      <span className="font-bold text-slate-800">
                        {selectedPacket.color || '--'} / {selectedPacket.quality || '--'}
                      </span>
                    </div>
                    <div className="col-span-2 border-t border-slate-200/50 pt-2 mt-1 grid grid-cols-2 gap-x-3">
                      <div>
                        <span className="font-semibold text-slate-400 block">Weight Per Pc:</span>
                        <span className="font-bold text-slate-800">
                          {selectedPacket.weightPerPc !== null && selectedPacket.weightPerPc !== undefined
                            ? `${formatMoney(selectedPacket.weightPerPc, 3)} ${selectedPacket.weightUnit || 'CTS'}`
                            : '--'}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-400 block">Price In:</span>
                        <span className="font-bold text-slate-800">{selectedPacket.priceIn || 'WT'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white/30 p-6 text-center text-xs text-slate-400 italic">
                    Select a packet to review specifications.
                  </div>
                )}

                {/* Packet errors */}
                {packetError ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-2 text-[0.80rem] font-medium text-rose-700 shadow-sm">
                    {packetError}
                  </p>
                ) : null}
              </div>

              {/* Inline pricing form & footer */}
              <div className="border-t border-slate-200/60 pt-4 flex flex-col space-y-3">
                {selectedPacket ? (
                  <form onSubmit={handleDirectPacketPriceSave} className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-xl border border-slate-300 pl-7 pr-3 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                        value={selectedPacketPrice}
                        onChange={(e) => setSelectedPacketPrice(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <Button type="submit" size="sm" disabled={packetSaving} className="rounded-xl shadow-sm text-xs py-1.5">
                      {packetSaving ? 'Saving...' : 'Save Price'}
                    </Button>
                  </form>
                ) : null}

                <div className="flex items-center justify-between">
                  <p className="text-[0.70rem] font-medium text-slate-400 flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {formatTimestamp(selectedPacket?.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      <ActionModal
        open={metalModalOpen}
        title="Update Metal Prices"
        description="Select a metal master to update its live pricing variables and view update history."
        onClose={() => setMetalModalOpen(false)}
      >
        <form onSubmit={handleMetalSubmit} className="space-y-5">
          <p className="text-sm font-medium text-rose-700">* Required fields</p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Select Metal*</label>
              <select
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={selectedMetalId}
                onChange={(event) => setSelectedMetalId(event.target.value)}
                required
              >
                <option value="">Select Metal</option>
                {metals.map((metal) => (
                  <option key={metal.id} value={metal.id}>
                    {metal.value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Market Price/Ounce*</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={priceOunce}
                onChange={(event) => handlePriceOunceChange(event.target.value)}
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
                value={priceGm}
                onChange={(event) => setPriceGm(event.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Live Price/Gms*</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={livePriceGm}
                onChange={(event) => handleLivePriceGmChange(event.target.value)}
                required
              />
            </div>
          </div>

          {metalError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {metalError}
            </p>
          ) : null}


          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="submit" size="sm" disabled={metalSaving || metalLoading}>
              {metalSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setMetalModalOpen(false)}>
              Close
            </Button>
          </div>
        </form>
      </ActionModal>

      <ActionModal
        open={packetSearchModalOpen}
        title="Find Stone Packet"
        description="Search through stone packets by name, stone, shape, size, color, quality, and select one to update its price."
        onClose={() => setPacketSearchModalOpen(false)}
      >
        <div className="space-y-4">
          <input
            type="text"
            className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            placeholder="Search by name, stone, shape, size, color, quality..."
            value={packetSearchQuery}
            onChange={(e) => setPacketSearchQuery(e.target.value)}
          />

          <div className="overflow-x-auto max-h-96 rounded-xl border border-slate-200 shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs text-slate-700 bg-white">
              <thead className="bg-slate-50 sticky top-0 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Packet Name</th>
                  <th className="px-4 py-3">Stone</th>
                  <th className="px-4 py-3">Shape</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Color</th>
                  <th className="px-4 py-3">Quality</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Price</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packetRows
                  .filter((p) => {
                    const q = packetSearchQuery.toLowerCase();
                    return (
                      p.packetName.toLowerCase().includes(q) ||
                      (p.stone || '').toLowerCase().includes(q) ||
                      (p.shape || '').toLowerCase().includes(q) ||
                      (p.size || '').toLowerCase().includes(q) ||
                      (p.color || '').toLowerCase().includes(q) ||
                      (p.quality || '').toLowerCase().includes(q)
                    );
                  })
                  .map((packet) => {
                    const draftPrice = packetDraftPrices[packet.id] ?? '';
                    const currentPrice =
                      packet.sellingPrice !== null && packet.sellingPrice !== undefined ? String(packet.sellingPrice) : '';
                    const changed = draftPrice.trim() !== currentPrice.trim();
                    return (
                      <tr key={packet.id} className={`transition-colors ${changed ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            {packet.packetName}
                            {changed && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.62rem] font-bold text-amber-700">
                                Changed
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{packet.stone || '--'}</td>
                        <td className="px-4 py-3">{packet.shape || '--'}</td>
                        <td className="px-4 py-3">{packet.size || '--'}</td>
                        <td className="px-4 py-3">{packet.color || '--'}</td>
                        <td className="px-4 py-3">{packet.quality || '--'}</td>
                        <td className="px-4 py-3">
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.70rem] font-bold text-slate-400">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className={`w-full rounded-lg border bg-white py-1.5 pl-6 pr-2 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                changed ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'
                              }`}
                              value={draftPrice}
                              onChange={(event) =>
                                setPacketDraftPrices((prev) => ({ ...prev, [packet.id]: event.target.value }))
                              }
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPacketId(packet.id);
                              setSelectedPacketPrice(packetDraftPrices[packet.id] ?? '');
                              setPacketSearchModalOpen(false);
                            }}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-lg transition-colors border border-indigo-100 text-[0.70rem]"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-semibold text-slate-500">
              {changedPacketPriceRows.length
                ? `${changedPacketPriceRows.length} price change${changedPacketPriceRows.length === 1 ? '' : 's'} pending`
                : 'No pending price changes'}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                disabled={packetSaving || !changedPacketPriceRows.length}
                onClick={handleBulkPacketPriceSave}
              >
                {packetSaving ? 'Saving...' : 'Save Price Changes'}
              </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setPacketSearchModalOpen(false)}>
              Close
            </Button>
            </div>
          </div>
        </div>
      </ActionModal>
    </div>
  );
}

