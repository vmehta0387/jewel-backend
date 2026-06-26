import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import SearchableSelect from '../../components/common/SearchableSelect';
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
  salesRepName?: string | null;
  salesRepEmail?: string | null;
  deliveryDate?: string | null;
  quantity: number;
  costPrice?: number | null;
  price: number;
  shortDescription?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  purchaseOrderNumber?: string | null;
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
  designName?: string | null;
  version?: string;
  jewelryGroup?: string | null;
  collection?: string | null;
  jewelrySize?: string | null;
  goldColour?: string | null;
  designStatus?: string | null;
  stoneInfo?: string | null;
  isPrimary?: boolean;
  createdAt?: string;
  imageUrls?: string[];
}

interface DesignMetal {
  id?: string;
  metalCaratage?: string | null;
  goldColour?: string | null;
  netWt?: number | null;
  wastagePercent?: number | null;
  wastageWt?: number | null;
  totalWt?: number | null;
  pricePerGm?: number | null;
  value?: number | null;
  components?: number | null;
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
  designName?: string | null;
  jewelryGroup?: string | null;
  collection?: string | null;
  jewelrySize?: string | null;
  designStatus?: string | null;
  diamondType?: string | null;
  diamondSpread?: string | null;
  diamondWeight?: string | null;
  diamondQuality?: string | null;
  metals?: DesignMetal[];
  gemstones?: DesignGemstone[];
  imageUrls?: string[];
}

interface OrderFormState {
  companyId: string;
  branchId: string;
  designId: string;
  deliveryDate: string;
  status: string;
  price: string;
  quantity: string;
  shortDescription: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  purchaseOrderNumber: string;
  notes: string;
}

interface OrderFormErrors {
  deliveryDate?: string;
  price?: string;
  quantity?: string;
  totalAmount?: string;
}

const defaultForm: OrderFormState = {
  companyId: '',
  branchId: '',
  designId: '',
  deliveryDate: '',
  status: 'QUOTE',
  price: '',
  quantity: '1',
  shortDescription: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  purchaseOrderNumber: '',
  notes: '',
};

const orderStatusOptions = [
  'QUOTE',
  'PENDING_APPROVAL',
  'APPROVED',
  'IN_PRODUCTION',
  'SHIPPED',
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
  `USD ${Math.round(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const calculateTotalAmount = (price: number | string | null | undefined, quantity: number | string | null | undefined): number =>
  Number(price || 0) * Number(quantity || 0);
const formatDisplayDate = (value?: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US');
};
const formatNumberInput = (value: number): string => {
  if (!Number.isFinite(value)) return '';
  return Number(value.toFixed(2)).toString();
};
const toDateInputValue = (value?: string | Date | null): string => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const formatWeight = (value?: number | null): string => Number(value || 0).toFixed(3);
const formatDesignLabel = (designNo?: string | null, version?: string | null): string => {
  const safeNo = String(designNo || '').trim();
  const safeVersion = String(version || '').trim();
  if (!safeNo && !safeVersion) return '-';
  if (!safeVersion) return safeNo || '-';
  if (!safeNo) return safeVersion;
  return `${safeNo} - ${safeVersion.toUpperCase()}`;
};
const getBaseDesignNo = (designNo?: string | null): string =>
  String(designNo || '')
    .trim()
    .toUpperCase()
    .replace(/-V\d+$/i, '');

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

function OrderActionIconButton({
  title,
  onClick,
  children,
  className = '',
  disabled = false,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`app-table-icon-action ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
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
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:items-center sm:p-6 backdrop-blur-sm transition-all duration-300">
      <div className={`relative flex w-full ${size} max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]`}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/95 px-6 py-4 backdrop-blur-md">
          <h2 className="text-[1.15rem] font-bold tracking-tight text-slate-800">{title}</h2>
          <button
            type="button"
            className="group flex h-9 w-9 items-center justify-center rounded-full bg-slate-100/50 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-900"
            onClick={onClose}
            aria-label="Close"
          >
            <svg className="h-4 w-4 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-50/30 p-5 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkedOrderRef = useRef<string | null>(null);
  const orderRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const currentUser = useMemo(() => getStoredUser(), []);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const canViewOrders = useMemo(() => {
    if (!currentUser) return false;
    return hasTaskPermission(currentUser, 'ORDER_ENTRIES');
  }, [currentUser]);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const [activeToggleOrderId, setActiveToggleOrderId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState<OrderFormState>(defaultForm);
  const [formErrors, setFormErrors] = useState<OrderFormErrors>({});
  const [deliveryDateMin, setDeliveryDateMin] = useState(() => toDateInputValue());
  const [orderNumber, setOrderNumber] = useState('');
  const [editingDesignNo, setEditingDesignNo] = useState('');
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [designOptions, setDesignOptions] = useState<DesignOption[]>([]);
  const [designDetail, setDesignDetail] = useState<DesignDetail | null>(null);
  const [designMediaUrls, setDesignMediaUrls] = useState<string[]>([]);
  const [showDesignFilters, setShowDesignFilters] = useState(false);
  const [designFilters, setDesignFilters] = useState({
    search: '',
    jewelryGroup: '',
    collection: '',
    metal: '',
  });
  const [packetLookup, setPacketLookup] = useState<Record<string, string>>({});
  const [viewOrder, setViewOrder] = useState<OrderRow | null>(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [viewDesign, setViewDesign] = useState<DesignDetail | null>(null);
  const [viewMediaUrls, setViewMediaUrls] = useState<string[]>([]);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ from: string; to: string } | null>(null);
  const [filters, setFilters] = useState({
    orderStatus: '',
    companyId: '',
    deliveryFrom: '',
    deliveryTo: '',
  });

  const isEditing = Boolean(editingOrderId);
  const listTableColumnCount = isSuperAdmin ? 13 : 12;

  const pageOffset = (page - 1) * pageSize;
  const hasActiveFilters = Boolean(filters.orderStatus || filters.companyId || filters.deliveryFrom || filters.deliveryTo);
  const formTotalAmount = useMemo(
    () => calculateTotalAmount(form.price, form.quantity),
    [form.price, form.quantity],
  );
  const updatePriceFromTotalAmount = (totalAmount: string) => {
    const quantity = Number(form.quantity || 0);
    const nextPrice = quantity > 0 ? Number(totalAmount || 0) / quantity : 0;
    setPriceManuallyEdited(true);
    setForm((prev) => ({ ...prev, price: formatNumberInput(nextPrice) }));
  };

  const loadOrders = async () => {
    if (!canViewOrders) return;
    try {
      setOrdersLoading(true);
      setOrdersError(null);
      const response = await api.get('/orders', {
        params: {
          page,
          limit: pageSize,
          status: showInactive ? 'INACTIVE' : 'ACTIVE',
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
    try {
      const response = await api.get('/products', { params: { limit: 200, status: 'ACTIVE' } });
      const allRows: DesignOption[] = response.data?.data || [];
      const sorted = [...allRows].sort((a, b) => {
        const aBase = getBaseDesignNo(a.designNo);
        const bBase = getBaseDesignNo(b.designNo);
        if (aBase !== bBase) return aBase.localeCompare(bBase);
        return (a.version || '').localeCompare(b.version || '', undefined, { numeric: true, sensitivity: 'base' });
      });
      setDesignOptions(sorted);
    } catch {
      setDesignOptions([]);
    }
  };

  const loadPackets = async (): Promise<Record<string, string>> => {
    if (Object.keys(packetLookup).length) return packetLookup;
    const response = await api.get('/products/packets', { params: { page: 1, limit: 200, status: 'ACTIVE' } });
    const packets = response.data?.data || [];
    const mapped: Record<string, string> = {};
    packets.forEach((packet: any) => {
      if (packet?.id && packet?.packetName) {
        mapped[String(packet.id)] = String(packet.packetName);
      }
    });
    setPacketLookup(mapped);
    return mapped;
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

  const loadOrderNumber = async () => {
    try {
      const response = await api.get('/orders/next-order-no');
      setOrderNumber(response.data?.orderNumber || '');
    } catch {
      setOrderNumber('');
    }
  };

  const uniqueMediaUrls = (urls: Array<string | null | undefined>): string[] => {
    const seen = new Set<string>();
    const unique: string[] = [];
    urls.forEach((rawUrl) => {
      const url = String(rawUrl || '').trim();
      if (!url || seen.has(url)) return;
      seen.add(url);
      unique.push(url);
    });
    return unique;
  };

  const loadDesignFamilyMedia = async (design: DesignDetail | null): Promise<string[]> => {
    if (!design?.designNo) {
      return uniqueMediaUrls(design?.imageUrls || []);
    }

    const baseDesignNo = getBaseDesignNo(design.designNo);
    const currentMedia = uniqueMediaUrls(design.imageUrls || []);

    try {
      const response = await api.get('/products', {
        params: {
          search: baseDesignNo,
          limit: 200,
          status: 'ALL',
          summaryOnly: true,
        },
      });
      const rows: DesignOption[] = response.data?.data || [];
      const familyMedia = rows
        .filter((row) => getBaseDesignNo(row.designNo) === baseDesignNo)
        .flatMap((row) => row.imageUrls || []);

      return uniqueMediaUrls([...currentMedia, ...familyMedia]);
    } catch {
      return currentMedia;
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, pageSize, filters, canViewOrders, showInactive]);

  useEffect(() => {
    if (!canViewOrders) return;
    loadCompanies();
  }, [canViewOrders]);

  useEffect(() => {
    if (!showAddModal) return;
    loadDesigns();
    if (!editingOrderId) {
      loadOrderNumber();
    }
    loadPackets();
  }, [showAddModal, editingOrderId]);

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
    if (editingOrderId) return;
    loadOrderNumber();
  }, [showAddModal, editingOrderId]);

  useEffect(() => {
    if (!showAddModal) return;
    if (editingOrderId) return;
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
          setForm((prev) => ({ ...prev, price: String(Math.round(Number(nextPrice) || 0)) }));
        }
      } catch {
        // ignore preview failures
      }
    };
    fetchPrice();
  }, [form.designId, form.companyId, form.branchId, showAddModal, editingOrderId, priceManuallyEdited]);

  useEffect(() => {
    const designId = form.designId;
    if (!designId) {
      setDesignDetail(null);
      setDesignMediaUrls([]);
      return;
    }

    let cancelled = false;
    const fetchDetail = async () => {
      try {
        const response = await api.get(`/products/${designId}`);
        const detail = response.data || null;
        if (cancelled) return;
        setDesignDetail(detail);
        const familyMedia = await loadDesignFamilyMedia(detail);
        if (cancelled) return;
        setDesignMediaUrls(familyMedia);
      } catch {
        if (cancelled) return;
        setDesignDetail(null);
        setDesignMediaUrls([]);
      }
    };

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [form.designId]);

  const handleSaveOrder = async () => {
    const nextErrors: OrderFormErrors = {};
    if (!form.deliveryDate) {
      nextErrors.deliveryDate = 'Delivery date is required.';
    } else if (deliveryDateMin && form.deliveryDate < deliveryDateMin) {
      nextErrors.deliveryDate = 'Delivery date cannot be before order creation date.';
    }
    if (!form.price || Number(form.price) <= 0) {
      nextErrors.price = 'Price @ is required.';
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      nextErrors.quantity = 'No. of Pcs is required.';
    }
    if (calculateTotalAmount(form.price, form.quantity) <= 0) {
      nextErrors.totalAmount = 'TOTAL AMOUNT is required.';
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    try {
      setSavingOrder(true);
      const payload = {
        companyId: form.companyId,
        branchId: form.branchId,
        designId: form.designId,
        deliveryDate: form.deliveryDate || undefined,
        status: form.status || undefined,
        price: Number(form.price || 0),
        quantity: Number(form.quantity || 1),
        shortDescription: form.shortDescription?.trim() || '',
        customerName: form.customerName?.trim() || '',
        customerPhone: form.customerPhone?.trim() || '',
        customerEmail: form.customerEmail?.trim() || '',
        purchaseOrderNumber: form.purchaseOrderNumber?.trim() || '',
        notes: form.notes?.trim() || '',
      };

      if (editingOrderId) {
        await api.put(`/orders/${editingOrderId}`, payload);
      } else {
        await api.post('/orders', payload);
      }
      setShowAddModal(false);
      setEditingOrderId(null);
      setEditingDesignNo('');
      setForm(defaultForm);
      setFormErrors({});
      setDeliveryDateMin(toDateInputValue());
      setDesignDetail(null);
      setDesignMediaUrls([]);
      await loadOrders();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (editingOrderId ? 'Failed to update order' : 'Failed to create order');
      alert(message);
    } finally {
      setSavingOrder(false);
    }
  };

  const fetchOrderWithDesign = async (orderId: string) => {
    const response = await api.get(`/orders/${orderId}`);
    const raw = response.data as any;
    const detail: OrderRow = {
      ...raw,
      companyName: raw?.company?.companyName ?? raw?.companyName ?? null,
      branchName: raw?.branch?.name ?? raw?.branchName ?? null,
      salesRepName: raw?.salesRepName ?? null,
      salesRepEmail: raw?.salesRepEmail ?? null,
    };
    let design: DesignDetail | null = null;
    if (detail?.designId) {
      const designResponse = await api.get(`/products/${detail.designId}`);
      design = designResponse.data || null;
    }
    return { detail, design };
  };

  const openViewModal = async (order: OrderRow) => {
    try {
      const { detail, design } = await fetchOrderWithDesign(order.id);
      setViewOrder(detail);
      const [familyMedia] = await Promise.all([
        loadDesignFamilyMedia(design),
        loadPackets(),
      ]);
      setViewDesign(design);
      setViewMediaUrls(familyMedia);
      setShowViewModal(true);
    } catch {
      setViewOrder(null);
      setViewDesign(null);
      setViewMediaUrls([]);
      setShowViewModal(true);
    }
  };

  useEffect(() => {
    const deepLinkedOrderId = searchParams.get('open');
    if (!deepLinkedOrderId) {
      deepLinkedOrderRef.current = null;
      return;
    }

    if (deepLinkedOrderRef.current === deepLinkedOrderId) {
      return;
    }

    deepLinkedOrderRef.current = deepLinkedOrderId;
    setHighlightedOrderId(deepLinkedOrderId);

    const openDeepLinkedOrder = async () => {
      try {
        const { detail, design } = await fetchOrderWithDesign(deepLinkedOrderId);
        setViewOrder(detail);
        await loadPackets();
        setViewDesign(design);
        setShowViewModal(true);
      } catch (error) {
        console.error('Failed to open deep-linked order', error);
        setViewOrder(null);
        setViewDesign(null);
        setShowViewModal(true);
      } finally {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('open');
        setSearchParams(nextParams, { replace: true });
      }
    };

    void openDeepLinkedOrder();
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!highlightedOrderId) return;
    const targetRow = orderRowRefs.current[highlightedOrderId];
    if (!targetRow) return;

    targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timeoutId = window.setTimeout(() => setHighlightedOrderId((current) => (current === highlightedOrderId ? null : current)), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedOrderId, orders]);

  const openEditModal = async (order: OrderRow) => {
    setEditingOrderId(order.id);
    setEditingDesignNo(order.designNo || '');
    setPriceManuallyEdited(false);
    setFormErrors({});
    setDeliveryDateMin(toDateInputValue(order.createdAt));
    setForm({
      companyId: order.companyId || '',
      branchId: order.branchId || '',
      designId: order.designId || '',
      deliveryDate: order.deliveryDate || '',
      status: order.status || 'QUOTE',
      price: order.price !== undefined && order.price !== null ? String(order.price) : '',
      quantity: order.quantity !== undefined && order.quantity !== null ? String(order.quantity) : '1',
      shortDescription: order.shortDescription || '',
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      customerEmail: order.customerEmail || '',
      purchaseOrderNumber: order.purchaseOrderNumber || '',
      notes: order.notes || '',
    });
    setOrderNumber(order.orderNumber || '');
    setDesignDetail(null);
    setDesignMediaUrls([]);
    if (order.companyId) {
      loadBranches(order.companyId);
    }
    setShowAddModal(true);
  };

  const requestStatusChange = (nextStatus: string) => {
    if (!nextStatus || nextStatus === form.status) return;
    setPendingStatusChange({ from: form.status, to: nextStatus });
  };

  const selectedDesignLabel = useMemo(() => {
    if (!designDetail) return '-';
    return formatDesignLabel(designDetail.designNo, designDetail.version);
  }, [designDetail]);

  const editingDesignLabel = useMemo(() => {
    if (selectedDesignLabel !== '-') return selectedDesignLabel;
    if (editingDesignNo) return editingDesignNo;
    const matched = designOptions.find((option) => option.id === form.designId);
    return formatDesignLabel(matched?.designNo, matched?.version);
  }, [selectedDesignLabel, editingDesignNo, designOptions, form.designId]);
  const designSelectOptions = useMemo(
    () =>
      designOptions
        .filter((option) => {
          const search = designFilters.search.trim().toLowerCase();
          const haystack = [
            option.designNo,
            option.version,
            option.designName,
            option.jewelryGroup,
            option.collection,
            option.jewelrySize,
            option.goldColour,
            option.designStatus,
            option.stoneInfo,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          if (search && !haystack.includes(search)) return false;
          if (designFilters.jewelryGroup && option.jewelryGroup !== designFilters.jewelryGroup) return false;
          if (designFilters.collection && option.collection !== designFilters.collection) return false;
          if (designFilters.metal && option.goldColour !== designFilters.metal) return false;
          return true;
        })
        .map((option) => ({
        value: option.id,
        label: formatDesignLabel(option.designNo, option.version),
      })),
    [designOptions, designFilters],
  );
  const designFilterOptions = useMemo(() => {
    const uniqueSorted = (values: Array<string | null | undefined>) =>
      Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      );

    return {
      jewelryGroups: uniqueSorted(designOptions.map((option) => option.jewelryGroup)),
      collections: uniqueSorted(
        designOptions
          .filter((option) => !designFilters.jewelryGroup || option.jewelryGroup === designFilters.jewelryGroup)
          .map((option) => option.collection),
      ),
      metals: uniqueSorted(designOptions.map((option) => option.goldColour)),
    };
  }, [designOptions, designFilters.jewelryGroup]);
  const hasActiveDesignFilters = Boolean(
    designFilters.search || designFilters.jewelryGroup || designFilters.collection || designFilters.metal,
  );

  const metalsDisplay = useMemo(() => {
    if (!designDetail?.metals?.length) return [];
    return designDetail.metals.map((metal) => metal.metalCaratage || metal.goldColour || '').filter(Boolean);
  }, [designDetail]);

  const mediaUrls = useMemo(() => {
    return designMediaUrls.filter((url) => url && url.trim());
  }, [designMediaUrls]);

  const resolvePacketName = (packetId?: string | null): string => {
    if (!packetId) return '-';
    return packetLookup[packetId] || '-';
  };

  const toggleOrderActive = async (order: OrderRow, nextActive: boolean) => {
    const confirmed = window.confirm(
      nextActive
        ? 'Resume this order? It will be visible in active orders again.'
        : 'Suspend this order? It will move to inactive orders.',
    );
    if (!confirmed) return;

    try {
      setActiveToggleOrderId(order.id);
      await api.patch(`/orders/${order.id}/active`, { isActive: nextActive });
      await loadOrders();
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to update order status.');
    } finally {
      setActiveToggleOrderId(null);
    }
  };

  const buildPrintHtml = (order: OrderRow, design: DesignDetail | null, packetNames: Record<string, string>) => {
    const stones = design?.gemstones || [];
    const metals = design?.metals || [];

    const stoneRows = stones.length
      ? stones.map((gem) => `
          <tr>
            <td>${packetNames[gem.packetId || ''] || '-'}</td>
            <td>${gem.stone || '-'}</td>
            <td>${gem.shape || '-'}</td>
            <td>${gem.size || '-'}</td>
            <td>${gem.color || '-'}</td>
            <td>${gem.quality || '-'}</td>
            <td>${formatWeight(gem.wtPerPcs)}</td>
            <td>${gem.pcs ?? '-'}</td>
            <td>${formatWeight(gem.wtInCts)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="9">No stone information</td></tr>';

    const metalRows = metals.length
      ? metals.map((metal) => `
          <tr>
            <td>${metal.metalCaratage || metal.goldColour || '-'}</td>
            <td>${formatWeight(metal.netWt)}</td>
            <td>${formatWeight(metal.totalWt)}</td>
            <td>${Number(metal.value || 0).toFixed(2)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4">No metal information</td></tr>';

    return `
      <html>
        <head>
          <title>${order.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1, h2 { margin: 0 0 12px; }
            .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 24px; margin-bottom: 24px; }
            .meta div { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 24px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; }
            .section { margin-top: 24px; }
          </style>
        </head>
        <body>
          <h1>Order Details</h1>
          <div class="meta">
            <div><span class="label">Order No</span>${order.orderNumber}</div>
            <div><span class="label">Status</span>${order.status}${order.isActive ? '' : ' (Suspended)'}</div>
            <div><span class="label">Company</span>${order.companyName || '-'}</div>
            <div><span class="label">Branch</span>${order.branchName || '-'}</div>
            <div><span class="label">Design</span>${design ? formatDesignLabel(design.designNo, design.version) : '-'}</div>
            <div><span class="label">Delivery Date</span>${order.deliveryDate || '-'}</div>
            <div><span class="label">Quantity</span>${order.quantity}</div>
            ${isSuperAdmin ? `<div><span class="label">Cost Price</span>${order.costPrice !== undefined && order.costPrice !== null ? formatMoney(Number(order.costPrice || 0)) : '-'}</div>` : ''}
            <div><span class="label">Price</span>${formatMoney(Number(order.price || 0))}</div>
            <div><span class="label">Sales Rep</span>${order.salesRepName || order.salesRepEmail || '-'}</div>
            <div><span class="label">Customer Name</span>${order.customerName || '-'}</div>
            <div><span class="label">Customer Phone</span>${order.customerPhone || '-'}</div>
            <div><span class="label">Customer Email</span>${order.customerEmail || '-'}</div>
            <div><span class="label">PO Number</span>${order.purchaseOrderNumber || '-'}</div>
            <div><span class="label">Short Description</span>${order.shortDescription || '-'}</div>
            <div><span class="label">Notes</span>${order.notes || '-'}</div>
          </div>
          <div class="section">
            <h2>Metal Information</h2>
            <table>
              <thead>
                <tr><th>Metal Caratage</th><th>Net Wt.</th><th>Total Wt.</th><th>Value</th></tr>
              </thead>
              <tbody>${metalRows}</tbody>
            </table>
          </div>
          <div class="section">
            <h2>Stone Information</h2>
            <table>
              <thead>
                <tr><th>Packet</th><th>Stone</th><th>Shape</th><th>Size</th><th>Color</th><th>Quality</th><th>Wt/Pcs</th><th>Pcs</th><th>Wt (Cts)</th></tr>
              </thead>
              <tbody>${stoneRows}</tbody>
            </table>
          </div>
        </body>
      </html>
    `;
  };

  const printOrder = async (order: OrderRow) => {
    try {
      setPrintingOrderId(order.id);
      const [packetNames, { detail, design }] = await Promise.all([
        loadPackets(),
        fetchOrderWithDesign(order.id),
      ]);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc || !iframe.contentWindow) {
        document.body.removeChild(iframe);
        window.alert('Unable to open print view.');
        return;
      }

      doc.open();
      doc.write(buildPrintHtml(detail, design, packetNames));
      doc.close();

      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        window.setTimeout(() => {
          document.body.removeChild(iframe);
        }, 500);
      };
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to print order.');
    } finally {
      setPrintingOrderId(null);
    }
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setPage(1);
              setShowInactive((prev) => !prev);
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 12h18" />
              <path d="M12 3v18" />
            </svg>
            {showInactive ? 'View Active' : 'View Inactive'}
          </Button>
          <Button
            onClick={() => {
              setEditingOrderId(null);
              setEditingDesignNo('');
              setForm(defaultForm);
              setFormErrors({});
              setDeliveryDateMin(toDateInputValue());
              setDesignDetail(null);
              setDesignMediaUrls([]);
              setBranches([]);
              setPriceManuallyEdited(false);
              setShowAddModal(true);
            }}
          >
            + Add New Order
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
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
          <div className="flex items-end">
            <Button
              variant="secondary"
              type="button"
              disabled={!hasActiveFilters}
              onClick={() => {
                setPage(1);
                setFilters({
                  orderStatus: '',
                  companyId: '',
                  deliveryFrom: '',
                  deliveryTo: '',
                });
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
        <div className="app-table-shell">
          <div className="app-table-scroll scrollbar-top">
            <table className="app-table app-table-compact min-w-[1000px]">
              <thead>
                <tr>
                  <th className="app-table-head-cell">#</th>
                  <th className="app-table-head-cell">Order No</th>
                  <th className="app-table-head-cell">Design</th>
                  <th className="app-table-head-cell">Company</th>
                  <th className="app-table-head-cell">Branch</th>
                  <th className="app-table-head-cell">Delivery</th>
                  <th className="app-table-head-cell">Qty</th>
                  {isSuperAdmin && <th className="app-table-head-cell">Cost Price</th>}
                  <th className="app-table-head-cell">Price</th>
                  <th className="app-table-head-cell">TOTAL AMOUNT</th>
                  <th className="app-table-head-cell">Status</th>
                  <th className="app-table-head-cell">Created</th>
                  <th className="app-table-head-cell">Action</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading && (
                  <tr>
                    <td colSpan={listTableColumnCount} className="app-table-empty">Loading orders...</td>
                  </tr>
                )}
                {!ordersLoading && orders.length === 0 && (
                  <tr>
                    <td colSpan={listTableColumnCount} className="app-table-empty">No orders found.</td>
                  </tr>
                )}
                {!ordersLoading && orders.map((order, index) => (
                  <tr
                    key={order.id}
                    ref={(node) => {
                      orderRowRefs.current[order.id] = node;
                    }}
                    className={`app-table-row transition-colors ${highlightedOrderId === order.id ? 'bg-amber-50/70 ring-2 ring-[#ead7b5]' : ''}`}
                  >
                    <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                    <td className="app-table-cell text-sm font-semibold text-slate-900">{order.orderNumber}</td>
                    <td className="app-table-cell text-sm text-slate-700">{formatDesignLabel(order.designNo, order.designVersion)}</td>
                    <td className="app-table-cell text-sm text-slate-700">{order.companyName || '-'}</td>
                    <td className="app-table-cell text-sm text-slate-700">{order.branchName || '-'}</td>
                    <td className="app-table-cell text-sm text-slate-700">{formatDisplayDate(order.deliveryDate)}</td>
                    <td className="app-table-cell text-sm text-slate-700">{Number(order.quantity || 0)}</td>
                    {isSuperAdmin && (
                      <td className="app-table-cell text-sm text-slate-700">
                        {order.costPrice !== undefined && order.costPrice !== null ? formatMoney(Number(order.costPrice || 0)) : '-'}
                      </td>
                    )}
                    <td className="app-table-cell text-sm font-semibold text-slate-800">{formatMoney(Number(order.price || 0))}</td>
                    <td className="app-table-cell text-sm font-semibold text-slate-800">
                      {formatMoney(calculateTotalAmount(order.price, order.quantity))}
                    </td>
                    <td className="app-table-cell text-sm text-slate-700">{order.status}</td>
                    <td className="app-table-cell whitespace-nowrap text-sm text-slate-600">
                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="app-table-cell text-sm">
                      <div className="flex flex-wrap gap-1.5">
                        <OrderActionIconButton
                          title="View Order"
                          onClick={() => openViewModal(order)}
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </OrderActionIconButton>
                        <OrderActionIconButton
                          title="Edit Order"
                          onClick={() => openEditModal(order)}
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                          </svg>
                        </OrderActionIconButton>
                        <OrderActionIconButton
                          title="Print Order"
                          onClick={() => printOrder(order)}
                          disabled={printingOrderId === order.id}
                        >
                          {printingOrderId === order.id ? (
                            <span className="text-[10px] font-semibold">...</span>
                          ) : (
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M6 9V4h12v5" />
                              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                              <path d="M6 14h12v6H6z" />
                            </svg>
                          )}
                        </OrderActionIconButton>
                        {order.isActive ? (
                          <OrderActionIconButton
                            title="Suspend Order"
                            onClick={() => toggleOrderActive(order, false)}
                            className="border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={activeToggleOrderId === order.id}
                          >
                            {activeToggleOrderId === order.id ? (
                              <span className="text-[10px] font-semibold">...</span>
                            ) : (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="6" y="5" width="4" height="14" rx="1" />
                                <rect x="14" y="5" width="4" height="14" rx="1" />
                              </svg>
                            )}
                          </OrderActionIconButton>
                        ) : (
                          <OrderActionIconButton
                            title="Resume Order"
                            onClick={() => toggleOrderActive(order, true)}
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={activeToggleOrderId === order.id}
                          >
                            {activeToggleOrderId === order.id ? (
                              <span className="text-[10px] font-semibold">...</span>
                            ) : (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M8 5v14l11-7-11-7Z" />
                              </svg>
                            )}
                          </OrderActionIconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {ordersError && <div className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{ordersError}</div>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span>
              Showing {orders.length ? pageOffset + 1 : 0} - {pageOffset + orders.length} of {totalOrders} orders
            </span>
            <label className="flex items-center gap-2 font-semibold text-slate-700">
              Rows
              <select
                className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={pageSize}
                onChange={(event) => {
                  setPage(1);
                  setPageSize(Number(event.target.value));
                }}
              >
                {[10, 15, 25, 50].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            alwaysShow
            className="mt-0"
          />
        </div>
      </Card>

      {showAddModal && (
        <Modal
          title={isEditing ? 'EDIT DESIGNED JEWELRY DEMAND' : 'ADD DESIGNED JEWELRY DEMAND'}
          onClose={() => {
            setShowAddModal(false);
            setEditingOrderId(null);
            setEditingDesignNo('');
            setFormErrors({});
            setDeliveryDateMin(toDateInputValue());
            setDesignMediaUrls([]);
          }}
          size="max-w-6xl"
        >
          <div className="space-y-6 [&_input]:rounded-md [&_input]:border-slate-200/80 [&_input]:shadow-sm [&_input]:transition-all [&_input]:focus:border-indigo-400 [&_input]:focus:ring-2 [&_input]:focus:ring-indigo-100 [&_input]:bg-white [&_input]:text-slate-800 [&_input]:placeholder:text-slate-400 [&_select]:rounded-md [&_select]:border-slate-200/80 [&_select]:shadow-sm [&_select]:transition-all [&_select]:focus:border-indigo-400 [&_select]:focus:ring-2 [&_select]:focus:ring-indigo-100 [&_select]:bg-white [&_select]:text-slate-800 [&_textarea]:rounded-md [&_textarea]:border-slate-200/80 [&_textarea]:shadow-sm [&_textarea]:transition-all [&_textarea]:focus:border-indigo-400 [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-indigo-100 [&_textarea]:bg-white [&_textarea]:text-slate-800 [&_textarea]:placeholder:text-slate-400">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <span className="font-semibold text-red-600">*Required fields</span>
              <span className="font-semibold text-slate-700">Order No: {orderNumber || '---'}</span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-sky-200/60 bg-white shadow-sm ring-1 ring-sky-900/5 transition-all hover:shadow-md">
              <div className="border-b border-sky-200/60 bg-sky-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-sky-800 backdrop-blur-sm">
                General Information
              </div>
              <div className="space-y-4 p-4">
                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
                  <div className={!isEditing && showDesignFilters ? 'md:col-span-3 xl:col-span-4' : ''}>
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium text-slate-700">Design No*</label>
                      {!isEditing && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                          onClick={() => setShowDesignFilters((prev) => !prev)}
                        >
                          {showDesignFilters ? 'Hide filters' : 'Advanced filter'}
                        </button>
                      )}
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        className="mt-1 w-full rounded border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                        value={editingDesignLabel}
                        disabled
                        readOnly
                      />
                    ) : (
                      <SearchableSelect
                        className="mt-1"
                        value={form.designId}
                        onChange={(value) => {
                          setPriceManuallyEdited(false);
                          setForm((prev) => ({ ...prev, designId: value }));
                        }}
                        options={designSelectOptions}
                        placeholder="Select Design"
                      />
                    )}
                    {!isEditing && showDesignFilters && (
                      <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <label className="text-xs font-semibold text-slate-600">Search</label>
                            <input
                              type="text"
                              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              value={designFilters.search}
                              placeholder="Design, version, stone..."
                              onChange={(event) => setDesignFilters((prev) => ({ ...prev, search: event.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-600">Category</label>
                            <select
                              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              value={designFilters.jewelryGroup}
                              onChange={(event) =>
                                setDesignFilters((prev) => ({ ...prev, jewelryGroup: event.target.value, collection: '' }))
                              }
                            >
                              <option value="">All Categories</option>
                              {designFilterOptions.jewelryGroups.map((value) => (
                                <option key={value} value={value}>{value}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-600">Collection</label>
                            <select
                              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              value={designFilters.collection}
                              onChange={(event) => setDesignFilters((prev) => ({ ...prev, collection: event.target.value }))}
                            >
                              <option value="">All Collections</option>
                              {designFilterOptions.collections.map((value) => (
                                <option key={value} value={value}>{value}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-600">Metal</label>
                            <select
                              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              value={designFilters.metal}
                              onChange={(event) => setDesignFilters((prev) => ({ ...prev, metal: event.target.value }))}
                            >
                              <option value="">All Metals</option>
                              {designFilterOptions.metals.map((value) => (
                                <option key={value} value={value}>{value}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                          <span>{designSelectOptions.length} matching design{designSelectOptions.length === 1 ? '' : 's'}</span>
                          <Button
                            variant="secondary"
                            type="button"
                            disabled={!hasActiveDesignFilters}
                            onClick={() => setDesignFilters({ search: '', jewelryGroup: '', collection: '', metal: '' })}
                          >
                            Reset Design Filters
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Company*</label>
                    <select
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={form.companyId}
                      disabled={isEditing}
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
                      disabled={isEditing || !form.companyId}
                      onChange={(event) => {
                        setPriceManuallyEdited(false);
                        setForm((prev) => ({ ...prev, branchId: event.target.value }));
                      }}
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
                    <label className="text-sm font-medium text-slate-700">Status*</label>
                    <select
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={form.status}
                      onChange={(event) => requestStatusChange(event.target.value)}
                    >
                      {orderStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Category</label>
                    <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {designDetail?.jewelryGroup || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Sub Category</label>
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
                  <div>
                    <label className="text-sm font-medium text-slate-700">Design Status</label>
                    <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {designDetail?.designStatus || '-'}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Diamond Type</label>
                    <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {designDetail?.diamondType || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Diamond Spread</label>
                    <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {designDetail?.diamondSpread || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Diamond Wt</label>
                    <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {designDetail?.diamondWeight || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Diamond Quality</label>
                    <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {designDetail?.diamondQuality || '-'}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                  <div>
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
                    <label className="text-sm font-medium text-slate-700">Delivery Date*</label>
                    <input
                      type="date"
                      className={`mt-1 w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                        formErrors.deliveryDate
                          ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500'
                          : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
                      }`}
                      value={form.deliveryDate}
                      min={deliveryDateMin}
                      required
                      aria-invalid={Boolean(formErrors.deliveryDate)}
                      aria-describedby={formErrors.deliveryDate ? 'delivery-date-error' : undefined}
                      onChange={(event) => {
                        const value = event.target.value;
                        setForm((prev) => ({ ...prev, deliveryDate: value }));
                        if (value && deliveryDateMin && value < deliveryDateMin) {
                          setFormErrors((prev) => ({
                            ...prev,
                            deliveryDate: 'Delivery date cannot be before order creation date.',
                          }));
                        } else if (value) {
                          setFormErrors((prev) => ({ ...prev, deliveryDate: undefined }));
                        }
                      }}
                    />
                    {formErrors.deliveryDate && (
                      <p id="delivery-date-error" className="mt-1 text-xs font-medium text-rose-600">
                        {formErrors.deliveryDate}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Customer Name</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={form.customerName}
                      onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Customer Phone</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={form.customerPhone}
                      onChange={(event) => setForm((prev) => ({ ...prev, customerPhone: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Customer Email</label>
                    <input
                      type="email"
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={form.customerEmail}
                      onChange={(event) => setForm((prev) => ({ ...prev, customerEmail: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Purchase Order Number</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={form.purchaseOrderNumber}
                      onChange={(event) => setForm((prev) => ({ ...prev, purchaseOrderNumber: event.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-cyan-200/70 bg-white shadow-sm ring-1 ring-cyan-900/5">
              <div className="border-b border-cyan-200/60 bg-cyan-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-cyan-800">
                Stone Information
              </div>
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

            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5">
                <div className="border-b border-slate-200/70 bg-slate-50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-slate-700">
                  Images & Videos
                </div>
                <div className="p-4">
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
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5">
                <div className="border-b border-slate-200/70 bg-slate-50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-slate-700">
                  Order Pricing & Notes
                </div>
                <div className="space-y-4 p-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Price @</label>
                      <div className="mt-1 flex">
                        <input
                          type="number"
                          className={`w-full rounded-l border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                            formErrors.price
                              ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500'
                              : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
                          }`}
                          value={form.price}
                          required
                          min="0.01"
                          aria-invalid={Boolean(formErrors.price)}
                          aria-describedby={formErrors.price ? 'price-error' : undefined}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPriceManuallyEdited(true);
                            setForm((prev) => ({ ...prev, price: value }));
                            if (Number(value || 0) > 0) {
                              setFormErrors((prev) => ({ ...prev, price: undefined, totalAmount: undefined }));
                            }
                          }}
                        />
                        <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-600">USD</span>
                      </div>
                      {formErrors.price && (
                        <p id="price-error" className="mt-1 text-xs font-medium text-rose-600">
                          {formErrors.price}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">No. of Pcs</label>
                      <input
                        type="number"
                        className={`mt-1 w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                          formErrors.quantity
                            ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500'
                            : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
                        }`}
                        value={form.quantity}
                        required
                        min="1"
                        aria-invalid={Boolean(formErrors.quantity)}
                        aria-describedby={formErrors.quantity ? 'quantity-error' : undefined}
                        onChange={(event) => {
                          const value = event.target.value;
                          setForm((prev) => ({ ...prev, quantity: value }));
                          if (Number(value || 0) > 0) {
                            setFormErrors((prev) => ({ ...prev, quantity: undefined, totalAmount: undefined }));
                          }
                        }}
                      />
                      {formErrors.quantity && (
                        <p id="quantity-error" className="mt-1 text-xs font-medium text-rose-600">
                          {formErrors.quantity}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">TOTAL AMOUNT</label>
                      <div className="mt-1 flex">
                        <input
                          type="number"
                          className={`w-full rounded-l border px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 ${
                            formErrors.totalAmount
                              ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500'
                              : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
                          }`}
                          value={formatNumberInput(formTotalAmount)}
                          required
                          min="0.01"
                          aria-invalid={Boolean(formErrors.totalAmount)}
                          aria-describedby={formErrors.totalAmount ? 'total-amount-error' : undefined}
                          onChange={(event) => {
                            updatePriceFromTotalAmount(event.target.value);
                            if (Number(event.target.value || 0) > 0) {
                              setFormErrors((prev) => ({ ...prev, price: undefined, totalAmount: undefined }));
                            }
                          }}
                        />
                        <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-600">USD</span>
                      </div>
                      {formErrors.totalAmount && (
                        <p id="total-amount-error" className="mt-1 text-xs font-medium text-rose-600">
                          {formErrors.totalAmount}
                        </p>
                      )}
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
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditingOrderId(null);
                setEditingDesignNo('');
                setFormErrors({});
                setDeliveryDateMin(toDateInputValue());
                setDesignMediaUrls([]);
              }}
            >
              Close
            </Button>
            <Button
              type="button"
              disabled={savingOrder || !form.designId || !form.companyId || !form.branchId}
              onClick={handleSaveOrder}
            >
              {savingOrder ? 'Saving...' : isEditing ? 'Update' : 'Save'}
            </Button>
          </div>
        </Modal>
      )}
      {pendingStatusChange && (
        <Modal title="Confirm status change" onClose={() => setPendingStatusChange(null)} size="max-w-md">
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Do you want to change status from <span className="font-semibold">{pendingStatusChange.from}</span> to{' '}
              <span className="font-semibold">{pendingStatusChange.to}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setPendingStatusChange(null)}>
                No
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, status: pendingStatusChange.to }));
                  setPendingStatusChange(null);
                }}
              >
                Yes
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {showViewModal && (
        <Modal title={`ORDER DETAILS ${viewOrder?.orderNumber ? `(${viewOrder.orderNumber})` : ''}`} onClose={() => setShowViewModal(false)} size="max-w-6xl">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Design</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewDesign ? formatDesignLabel(viewDesign.designNo, viewDesign.version) : '-'}
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
              <label className="text-sm font-medium text-slate-700">Category</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewDesign?.jewelryGroup || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Sub Category</label>
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
              <label className="text-sm font-medium text-slate-700">Design Status</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewDesign?.designStatus || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Diamond Type</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewDesign?.diamondType || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Diamond Spread</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewDesign?.diamondSpread || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Diamond Wt</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewDesign?.diamondWeight || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Diamond Quality</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewDesign?.diamondQuality || '-'}
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
            <div>
              <label className="text-sm font-medium text-slate-700">Total Amount</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                {formatMoney(calculateTotalAmount(viewOrder?.price, viewOrder?.quantity))}
              </div>
            </div>
            {isSuperAdmin && (
              <div>
                <label className="text-sm font-medium text-slate-700">Cost Price</label>
                <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {viewOrder?.costPrice !== undefined && viewOrder?.costPrice !== null
                    ? formatMoney(Number(viewOrder?.costPrice || 0))
                    : '-'}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700">Sales Rep</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewOrder?.salesRepName || viewOrder?.salesRepEmail || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Customer Name</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewOrder?.customerName || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Customer Phone</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewOrder?.customerPhone || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Customer Email</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewOrder?.customerEmail || '-'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Purchase Order Number</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewOrder?.purchaseOrderNumber || '-'}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800">Metal Information</div>
            <div className="flex min-h-[54px] flex-wrap items-center gap-2 bg-white px-4 py-3">
              {viewDesign?.metals?.length ? (
                viewDesign.metals.map((metal, index) => {
                  const label = metal.metalCaratage || metal.goldColour || '-';
                  return (
                    <span key={metal.id || `${label}-${index}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                      {label}
                    </span>
                  );
                })
              ) : (
                <span className="text-sm text-slate-500">No metal information</span>
              )}
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
              {viewMediaUrls.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {viewMediaUrls.map((url, index) => (
                    <MediaPreview key={`${url}-${index}`} url={url} alt={`${viewDesign?.designNo || 'order-media'}-${index}`} />
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
