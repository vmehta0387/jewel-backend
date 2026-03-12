import { useEffect, useMemo, useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import api from '../../services/api';
import { getStoredUser, hasTaskPermission } from '../../utils/auth';

interface OrderRow {
  id: string;
  orderNumber: string;
  designId?: string | null;
  designNo?: string | null;
  designVersion?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  deliveryDate?: string | null;
  quantity: number;
  price: number;
  shortDescription?: string | null;
  notes?: string | null;
  status: string;
  isActive: boolean;
  createdAt: string;
}

interface CompanyOption {
  id: string;
  companyName: string;
  companyCode?: string;
}

interface BranchOption {
  id: string;
  name: string;
  code?: string;
  companyId?: string;
}

interface DesignOption {
  id: string;
  designNo: string;
  version?: string;
  jewelryGroup?: string | null;
}

interface DesignMetal {
  id?: string;
  metalCaratage?: string | null;
  goldColour?: string | null;
  netWt?: number | null;
  wastagePercent?: number | null;
  totalWt?: number | null;
  pricePerGm?: number | null;
  value?: number | null;
}

interface DesignGemstone {
  id?: string;
  packetId?: string | null;
  stone?: string | null;
  shape?: string | null;
  size?: string | null;
  color?: string | null;
  quality?: string | null;
  wtPerPcs?: number | null;
  pcs?: number | null;
  wtInCts?: number | null;
  pricePerCt?: number | null;
  amount?: number | null;
}

interface DesignDetail {
  id: string;
  designNo: string;
  version?: string;
  jewelryGroup?: string | null;
  collection?: string | null;
  jewelrySize?: string | null;
  metals?: DesignMetal[];
  gemstones?: DesignGemstone[];
  imageUrls?: string[];
}

interface OrderFormState {
  companyId: string;
  branchId: string;
  designId: string;
  deliveryDate: string;
  price: string;
  quantity: string;
  shortDescription: string;
  notes: string;
}

const defaultForm: OrderFormState = {
  companyId: '',
  branchId: '',
  designId: '',
  deliveryDate: '',
  price: '',
  quantity: '1',
  shortDescription: '',
  notes: '',
};

const orderStatusOptions = [
  'QUOTE',
  'PENDING_APPROVAL',
  'APPROVED',
  'IN_PRODUCTION',
  'COMPLETED',
  'CANCELLED',
];

const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const publicAssetsBaseUrl = apiBaseUrl.replace(/\/api$/, '');
const resolvePublicAssetUrl = (rawUrl: string): string => {
  const url = rawUrl.trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) {
    return url;
  }
  if (!publicAssetsBaseUrl) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${publicAssetsBaseUrl}${url}`;
  }
  return `${publicAssetsBaseUrl}/${url}`;
};
const stripUrlSuffix = (url: string): string => url.split('#')[0].split('?')[0].toLowerCase();
const isVideoUrl = (url: string): boolean => {
  const normalized = (url || '').trim();
  if (!normalized) return false;
  if (/^data:video\//i.test(normalized)) return true;
  const clean = stripUrlSuffix(normalized);
  return ['.mp4', '.webm', '.mov', '.m4v', '.ogv', '.ogg'].some((ext) => clean.endsWith(ext));
};

const formatMoney = (value: number): string =>
  `USD ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatWeight = (value?: number | null): string => Number(value || 0).toFixed(3);

function MediaPreview({ url, alt }: { url: string; alt: string }) {
  const resolved = resolvePublicAssetUrl(url);
  if (isVideoUrl(resolved)) {
    return (
      <video
        src={resolved}
        className="h-40 w-full rounded-lg border border-slate-200 object-cover"
        controls
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return <img src={resolved} alt={alt} className="h-40 w-full rounded-lg border border-slate-200 object-cover" />;
}

function Modal({
  title,
  onClose,
  children,
  size = 'max-w-6xl',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-[1px]">
      <div className={`w-full ${size} max-h-[95vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            aria-label="Close"
          >
            x
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const currentUser = useMemo(() => getStoredUser(), []);
  const canViewOrders = useMemo(() => {
    if (!currentUser) return false;
    return hasTaskPermission(currentUser, 'ORDER_ENTRIES');
  }, [currentUser]);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [form, setForm] = useState<OrderFormState>(defaultForm);
  const [orderNumber, setOrderNumber] = useState('');
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [designOptions, setDesignOptions] = useState<DesignOption[]>([]);
  const [designDetail, setDesignDetail] = useState<DesignDetail | null>(null);
  const [packetLookup, setPacketLookup] = useState<Record<string, string>>({});
  const [viewOrder, setViewOrder] = useState<OrderRow | null>(null);
  const [viewDesign, setViewDesign] = useState<DesignDetail | null>(null);
  const [filters, setFilters] = useState({
    orderStatus: '',
    companyId: '',
    deliveryFrom: '',
    deliveryTo: '',
  });

  const pageOffset = (page - 1) * 15;

  const loadOrders = async () => {
    if (!canViewOrders) return;
    try {
      setOrdersLoading(true);
      setOrdersError(null);
      const response = await api.get('/orders', {
        params: {
          page,
          limit: 15,
          orderStatus: filters.orderStatus || undefined,
          companyId: filters.companyId || undefined,
          deliveryFrom: filters.deliveryFrom || undefined,
          deliveryTo: filters.deliveryTo || undefined,
        },
      });
      const payload = response.data || {};
      setOrders(payload.data || []);
      setTotalOrders(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
    } catch (err: any) {
      setOrdersError(err?.response?.data?.message || 'Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadCompanies = async () => {
    if (companies.length) return;
    const response = await api.get('/companies', { params: { limit: 200, status: 'ACTIVE' } });
    setCompanies(response.data?.data || []);
  };

  const loadDesigns = async () => {
    if (designOptions.length) return;
    const response = await api.get('/products', { params: { limit: 200, status: 'ACTIVE' } });
    setDesignOptions(response.data?.data || []);
  };

  const loadPackets = async () => {
    if (Object.keys(packetLookup).length) return;
    const response = await api.get('/products/packets', { params: { page: 1, limit: 200, status: 'ACTIVE' } });
    const packets = response.data?.data || [];
    const mapped: Record<string, string> = {};
    packets.forEach((packet: any) => {
      if (packet?.id && packet?.packetName) {
        mapped[String(packet.id)] = String(packet.packetName);
      }
    });
    setPacketLookup(mapped);
  };

  const loadBranches = async (companyId: string) => {
    if (!companyId) {
      setBranches([]);
      return;
    }
    const response = await api.get('/branches', {
      params: { companyId, limit: 200, status: 'ACTIVE' },
    });
    setBranches(response.data?.data || []);
  };

  const loadOrderNumber = async (companyId?: string, branchId?: string) => {
    try {
      if (!companyId || !branchId) {
        setOrderNumber('');
        return;
      }
      const response = await api.get('/orders/next-order-no', { params: { companyId, branchId } });
      setOrderNumber(response.data?.orderNumber || '');
    } catch {
      setOrderNumber('');
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, filters, canViewOrders]);

  useEffect(() => {
    if (!canViewOrders) return;
    loadCompanies();
  }, [canViewOrders]);

  useEffect(() => {
    if (!showAddModal) return;
    loadDesigns();
    loadOrderNumber(form.companyId, form.branchId);
    loadPackets();
  }, [showAddModal]);

  useEffect(() => {
    if (!showViewModal) return;
    loadPackets();
  }, [showViewModal]);

  useEffect(() => {
    if (!form.companyId) {
      setBranches([]);
      setForm((prev) => ({ ...prev, branchId: '' }));
      return;
    }
    loadBranches(form.companyId);
  }, [form.companyId]);

  useEffect(() => {
    if (!showAddModal) return;
    if (!form.companyId || !form.branchId) {
      setOrderNumber('');
      return;
    }
    loadOrderNumber(form.companyId, form.branchId);
  }, [form.companyId, form.branchId, showAddModal]);

  useEffect(() => {
    if (!showAddModal) return;
    if (!form.designId || !form.companyId || !form.branchId) {
      if (!priceManuallyEdited) {
        setForm((prev) => ({ ...prev, price: '' }));
      }
      return;
    }
    if (priceManuallyEdited) return;
    const fetchPrice = async () => {
      try {
        const response = await api.get('/orders/price-preview', {
          params: {
            designId: form.designId,
            companyId: form.companyId,
            branchId: form.branchId,
          },
        });
        const nextPrice = response.data?.finalPrice;
        if (nextPrice !== undefined && nextPrice !== null) {
          setForm((prev) => ({ ...prev, price: String(nextPrice) }));
        }
      } catch {
        // ignore preview failures
      }
    };
    fetchPrice();
  }, [form.designId, form.companyId, form.branchId, showAddModal, priceManuallyEdited]);

  useEffect(() => {
    const designId = form.designId;
    if (!designId) {
      setDesignDetail(null);
      return;
    }

    const fetchDetail = async () => {
      try {
        const response = await api.get(`/products/${designId}`);
        setDesignDetail(response.data || null);
      } catch {
        setDesignDetail(null);
      }
    };

    fetchDetail();
  }, [form.designId]);

  const handleCreateOrder = async () => {
    try {
      setSavingOrder(true);
      const payload = {
        companyId: form.companyId,
        branchId: form.branchId,
        designId: form.designId,
        deliveryDate: form.deliveryDate || undefined,
        price: Number(form.price || 0),
        quantity: Number(form.quantity || 1),
        shortDescription: form.shortDescription?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };

      await api.post('/orders', payload);
      setShowAddModal(false);
      setForm(defaultForm);
      setDesignDetail(null);
      loadOrders();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to create order';
      alert(message);
    } finally {
      setSavingOrder(false);
    }
  };

  const openViewModal = async (order: OrderRow) => {
    try {
      const response = await api.get(`/orders/${order.id}`);
      const raw = response.data as any;
      const detail: OrderRow = {
        ...raw,
        companyName: raw?.company?.companyName ?? raw?.companyName ?? null,
        branchName: raw?.branch?.name ?? raw?.branchName ?? null,
      };
      setViewOrder(detail);
      loadPackets();
      if (detail?.designId) {
        const designResponse = await api.get(`/products/${detail.designId}`);
        setViewDesign(designResponse.data || null);
      } else {
        setViewDesign(null);
      }
      setShowViewModal(true);
    } catch {
      setViewOrder(null);
      setViewDesign(null);
      setShowViewModal(true);
    }
  };

  const selectedDesignLabel = useMemo(() => {
    if (!designDetail) return '-';
    return `${designDetail.designNo}${designDetail.version ? ` (${designDetail.version})` : ''}`;
  }, [designDetail]);

  const metalsDisplay = useMemo(() => {
    if (!designDetail?.metals?.length) return [];
    return designDetail.metals.map((metal) => metal.metalCaratage || metal.goldColour || '').filter(Boolean);
  }, [designDetail]);

  const mediaUrls = useMemo(() => {
    return (designDetail?.imageUrls || []).filter((url) => url && url.trim());
  }, [designDetail]);

  const resolvePacketName = (packetId?: string | null): string => {
    if (!packetId) return '-';
    return packetLookup[packetId] || '-';
  };

  if (!canViewOrders) {
    return (
      <Card>
        <div className="text-center py-12 text-gray-500">
          You do not have permission to view orders.
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-slate-600">Manage designed jewelry demands and track delivery details.</p>
        </div>
        <Button onClick={() => { setForm(defaultForm); setDesignDetail(null); setBranches([]); setPriceManuallyEdited(false); setShowAddModal(true); }}>+ Add New Order</Button>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <select
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={filters.orderStatus}
              onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, orderStatus: event.target.value })); }}
            >
              <option value="">All Status</option>
              {orderStatusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Company</label>
            <select
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={filters.companyId}
              onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, companyId: event.target.value })); }}
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.companyName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Delivery From</label>
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={filters.deliveryFrom}
              onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, deliveryFrom: event.target.value })); }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Delivery To</label>
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={filters.deliveryTo}
              onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, deliveryTo: event.target.value })); }}
            />
          </div>
        </div>
        <div className="mb-3 text-xs text-slate-600">
          Showing {orders.length ? pageOffset + 1 : 0} - {pageOffset + orders.length} of {totalOrders} orders
        </div>
        <div className="app-table-shell">
          <div className="app-table-scroll scrollbar-top">
            <table className="app-table app-table-compact min-w-[900px]">
              <thead>
                <tr>
                  <th className="app-table-head-cell">#</th>
                  <th className="app-table-head-cell">Order No</th>
                  <th className="app-table-head-cell">Design</th>
                  <th className="app-table-head-cell">Company</th>
                  <th className="app-table-head-cell">Branch</th>
                  <th className="app-table-head-cell">Delivery</th>
                  <th className="app-table-head-cell">Qty</th>
                  <th className="app-table-head-cell">Price</th>
                  <th className="app-table-head-cell">Status</th>
                  <th className="app-table-head-cell">Created</th>
                  <th className="app-table-head-cell">Action</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading && (
                  <tr>
                    <td colSpan={11} className="app-table-empty">Loading orders...</td>
                  </tr>
                )}
                {!ordersLoading && orders.length === 0 && (
                  <tr>
                    <td colSpan={11} className="app-table-empty">No orders found.</td>
                  </tr>
                )}
                {!ordersLoading && orders.map((order, index) => (
                  <tr key={order.id} className="app-table-row">
                    <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                    <td className="app-table-cell text-sm font-semibold text-slate-900">{order.orderNumber}</td>
                    <td className="app-table-cell text-sm text-slate-700">
                      {order.designNo ? `${order.designNo}${order.designVersion ? ` (${order.designVersion})` : ''}` : '-'}
                    </td>
                    <td className="app-table-cell text-sm text-slate-700">{order.companyName || '-'}</td>
                    <td className="app-table-cell text-sm text-slate-700">{order.branchName || '-'}</td>
                    <td className="app-table-cell text-sm text-slate-700">{order.deliveryDate || '-'}</td>
                    <td className="app-table-cell text-sm text-slate-700">{Number(order.quantity || 0)}</td>
                    <td className="app-table-cell text-sm font-semibold text-slate-800">{formatMoney(Number(order.price || 0))}</td>
                    <td className="app-table-cell text-sm text-slate-700">{order.status}</td>
                    <td className="app-table-cell whitespace-nowrap text-sm text-slate-600">
                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="app-table-cell text-sm">
                      <button
                        type="button"
                        className="app-table-action"
                        onClick={() => openViewModal(order)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {ordersError && <div className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{ordersError}</div>}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </Card>

      {showAddModal && (
        <Modal title="ADD DESIGNED JEWELRY DEMAND" onClose={() => setShowAddModal(false)} size="max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span className="text-xs text-rose-700">* Required fields</span>
            <span className="text-sm font-semibold text-slate-700">Order No: {orderNumber || '---'}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Design No*</label>
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={form.designId}
                onChange={(event) => {
                  setPriceManuallyEdited(false);
                  setForm((prev) => ({ ...prev, designId: event.target.value }));
                }}
              >
                <option value="">Select Design</option>
                {designOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.designNo}{option.version ? ` (${option.version})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Company*</label>
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={form.companyId}
                onChange={(event) => {
                  setPriceManuallyEdited(false);
                  setForm((prev) => ({ ...prev, companyId: event.target.value, branchId: '' }));
                }}
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Branch*</label>
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={form.branchId}
                onChange={(event) => {
                  setPriceManuallyEdited(false);
                  setForm((prev) => ({ ...prev, branchId: event.target.value }));
                }}
                disabled={!form.companyId}
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Jewelry Group</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {designDetail?.jewelryGroup || '-'}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Collection</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {designDetail?.collection || '-'}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Jewelry Size</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {designDetail?.jewelrySize || '-'}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Metal</label>
              <div className="mt-1 flex min-h-[42px] flex-wrap items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {metalsDisplay.length ? metalsDisplay.map((value) => (
                  <span key={value} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {value}
                  </span>
                )) : <span className="text-slate-500">-</span>}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Delivery Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={form.deliveryDate}
                onChange={(event) => setForm((prev) => ({ ...prev, deliveryDate: event.target.value }))}
              />
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800">Stone Information</div>
            <div className="app-table-shell">
              <div className="app-table-scroll scrollbar-top">
                <table className="app-table app-table-compact w-full">
                  <thead>
                    <tr>
                      <th className="app-table-head-cell">Packet</th>
                      <th className="app-table-head-cell">Stone</th>
                      <th className="app-table-head-cell">Shape</th>
                      <th className="app-table-head-cell">Size</th>
                      <th className="app-table-head-cell">Color</th>
                      <th className="app-table-head-cell">Quality</th>
                      <th className="app-table-head-cell">Wt/Pcs</th>
                      <th className="app-table-head-cell">Pcs</th>
                      <th className="app-table-head-cell">Wt (Cts)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designDetail?.gemstones?.length ? (
                      designDetail.gemstones.map((gem, index) => (
                        <tr key={gem.id || index} className="app-table-row">
                          <td className="app-table-cell text-sm text-slate-700">{resolvePacketName(gem.packetId)}</td>
                          <td className="app-table-cell text-sm text-slate-700">{gem.stone || '-'}</td>
                          <td className="app-table-cell text-sm text-slate-700">{gem.shape || '-'}</td>
                          <td className="app-table-cell text-sm text-slate-700">{gem.size || '-'}</td>
                          <td className="app-table-cell text-sm text-slate-700">{gem.color || '-'}</td>
                          <td className="app-table-cell text-sm text-slate-700">{gem.quality || '-'}</td>
                          <td className="app-table-cell text-sm text-slate-700">{formatWeight(gem.wtPerPcs)}</td>
                          <td className="app-table-cell text-sm text-slate-700">{gem.pcs ?? '-'}</td>
                          <td className="app-table-cell text-sm text-slate-700">{formatWeight(gem.wtInCts)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="app-table-empty">No stone information</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="text-sm font-semibold text-slate-800 mb-2">Images & Videos</div>
              {mediaUrls.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {mediaUrls.map((url, index) => (
                    <MediaPreview key={`${url}-${index}`} url={url} alt={`${selectedDesignLabel}-${index}`} />
                  ))}
                </div>
              ) : (
                <div className="flex h-36 items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  No media available for this design.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Price</label>
                  <div className="mt-1 flex">
                    <input
                      type="number"
                      className="w-full rounded-l border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={form.price}
                      onChange={(event) => {
                        setPriceManuallyEdited(true);
                        setForm((prev) => ({ ...prev, price: event.target.value }));
                      }}
                    />
                    <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-600">USD</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">No. of Pcs</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={form.quantity}
                    onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Short Description</label>
                  <textarea
                    className="mt-1 h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={form.shortDescription}
                    onChange={(event) => setForm((prev) => ({ ...prev, shortDescription: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Notes</label>
                  <textarea
                    className="mt-1 h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
              Close
            </Button>
            <Button type="button" disabled={savingOrder || !form.designId || !form.companyId || !form.branchId} onClick={handleCreateOrder}>
              {savingOrder ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </Modal>
      )}
      {showViewModal && (
        <Modal title={`ORDER DETAILS ${viewOrder?.orderNumber ? `(${viewOrder.orderNumber})` : ''}`} onClose={() => setShowViewModal(false)} size="max-w-6xl">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Design</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewDesign ? `${viewDesign.designNo}${viewDesign.version ? ` (${viewDesign.version})` : ''}` : '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Company</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewOrder?.companyName || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Branch</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewOrder?.branchName || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Jewelry Group</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewDesign?.jewelryGroup || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Collection</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewDesign?.collection || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Jewelry Size</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewDesign?.jewelrySize || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Delivery Date</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewOrder?.deliveryDate || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Quantity</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewOrder?.quantity ?? '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Price</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                {formatMoney(Number(viewOrder?.price || 0))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800">Stone Information</div>
            <div className="app-table-shell">
              <div className="app-table-scroll scrollbar-top">
                <table className="app-table app-table-compact w-full">
                  <thead>
                    <tr>
                      <th className="app-table-head-cell">Packet</th>
                      <th className="app-table-head-cell">Stone</th>
                      <th className="app-table-head-cell">Shape</th>
                      <th className="app-table-head-cell">Size</th>
                      <th className="app-table-head-cell">Color</th>
                      <th className="app-table-head-cell">Quality</th>
                      <th className="app-table-head-cell">Wt/Pcs</th>
                      <th className="app-table-head-cell">Pcs</th>
                      <th className="app-table-head-cell">Wt (Cts)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewDesign?.gemstones?.length ? (
                      viewDesign.gemstones.map((gem, index) => (
                        <tr key={gem.id || index} className="app-table-row">
                          <td className="app-table-cell text-sm text-slate-700">{resolvePacketName(gem.packetId)}</td>
                          <td className="app-table-cell text-sm text-slate-700">{gem.stone || '-'}</td>
                          <td className="app-table-cell text-sm text-slate-700">{gem.shape || '-'}</td>
                          <td className="app-table-cell text-sm text-slate-700">{gem.size || '-'}</td>
                          <td className="app-table-cell text-sm text-slate-700">{gem.color || '-'}</td>
                          <td className="app-table-cell text-sm text-slate-700">{gem.quality || '-'}</td>
                          <td className="app-table-cell text-sm text-slate-700">{formatWeight(gem.wtPerPcs)}</td>
                          <td className="app-table-cell text-sm text-slate-700">{gem.pcs ?? '-'}</td>
                          <td className="app-table-cell text-sm text-slate-700">{formatWeight(gem.wtInCts)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="app-table-empty">No stone information</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="text-sm font-semibold text-slate-800 mb-2">Images & Videos</div>
              {viewDesign?.imageUrls?.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {viewDesign.imageUrls.map((url, index) => (
                    <MediaPreview key={`${url}-${index}`} url={url} alt={`${viewDesign.designNo}-${index}`} />
                  ))}
                </div>
              ) : (
                <div className="flex h-36 items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  No media available for this design.
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Short Description</label>
                <div className="mt-1 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {viewOrder?.shortDescription || '-'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <div className="mt-1 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {viewOrder?.notes || '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
