import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import AlertDialog from '../../components/common/AlertDialog';
import { useAppDialog } from '../../components/common/useAppDialog';
import Pagination from '../../components/common/Pagination';
import SmartDropdown from '../../components/common/SmartDropdown';
import TableLoadingRow from '../../components/common/TableLoadingRow';
import api from '../../services/api';
import { getStoredUser, hasActionPermission } from '../../utils/auth';
import {
  canChangeOrderStatus,
  canEditOrderByStatus,
  canOpenOrderStatusChange,
  canViewOrderHistory,
  getAllowedOrderStatuses,
  normalizeOrderStatus,
  orderStatusOptions,
} from '../../utils/orderLifecycle';

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
  salesRepId?: string | null;
  salesRepName?: string | null;
  salesRepEmail?: string | null;
  deliveryDate?: string | null;
  shipDate?: string | null;
  shipVia?: string | null;
  trackingNo?: string | null;
  invoiceNo?: string | null;
  quantity: number;
  costPrice?: number | null;
  price: number;
  baseCostSnapshot?: number | string | null;
  companyCostSnapshot?: number | string | null;
  companyMultiplierSnapshot?: number | string | null;
  branchCostSnapshot?: number | string | null;
  branchMultiplierSnapshot?: number | string | null;
  effectiveMultiplierSnapshot?: number | string | null;
  sellingPriceSnapshot?: number | string | null;
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

interface SalesRepOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  branchId?: string | null;
  companyId?: string | null;
}

interface DesignOption {
  id: string;
  designNo: string;
  barcode?: string | null;
  designName?: string | null;
  version?: string;
  jewelryGroup?: string | null;
  collection?: string | null;
  jewelrySize?: string | null;
  metalCaratage?: string | null;
  designStatus?: string | null;
  stoneInfo?: string | null;
  isPrimary?: boolean;
  createdAt?: string;
  imageUrls?: string[];
}

interface DesignMetal {
  id?: string;
  metalCaratage?: string | null;
  metalColor?: string | null;
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
  barcode?: string | null;
  version?: string;
  designName?: string | null;
  jewelryGroup?: string | null;
  collection?: string | null;
  jewelrySize?: string | null;
  designStatus?: string | null;
  diamondType?: string | null;
  stoneInfo?: string | null;
  diamondSpread?: string | null;
  diamondWeight?: string | null;
  diamondQuality?: string | null;
  metalCaratage?: string | null;
  displayPrice?: number | null;
  totalValue?: number | null;
  metals?: DesignMetal[];
  gemstones?: DesignGemstone[];
  imageUrls?: string[];
}

interface OrderFormState {
  companyId: string;
  branchId: string;
  salesRepId: string;
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
  companyId?: string;
  branchId?: string;
  salesRepId?: string;
  designId?: string;
  deliveryDate?: string;
  price?: string;
  quantity?: string;
  totalAmount?: string;
}

interface OrderHistoryChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface OrderHistoryRow {
  id: string;
  actionType: 'ADD' | 'EDIT' | 'STATUS_CHANGE' | 'CANCEL' | 'SUSPEND' | 'RESUME' | string;
  summary: string;
  changes?: OrderHistoryChange[] | null;
  performedByName?: string | null;
  performedByRole?: string | null;
  performedAt: string;
}

interface CompletedShippingForm {
  shipDate: string;
  shipVia: string;
  trackingNo: string;
  invoiceNo: string;
}

type OrderSaveType = 'QUOTE' | 'ORDER';

interface OrderSavePayload {
  companyId: number;
  branchId: number;
  salesRepId?: number;
  designId: number;
  deliveryDate?: string;
  orderType?: OrderSaveType;
  price: number;
  quantity: number;
  shortDescription: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  purchaseOrderNumber: string;
  notes: string;
}

type ConfiguratorKey = 'diamondType' | 'shape' | 'style' | 'metalCaratage' | 'weight' | 'quality' | 'ringSize';

type ConfiguratorOptions = Record<ConfiguratorKey, string>;

type ConfiguratorResponse = {
  selectedDesign: DesignDetail;
  selectedOptions?: Partial<Record<ConfiguratorKey | 'metalColor', unknown>>;
  optionGroups?: Partial<Record<ConfiguratorKey | 'metalColor', unknown[]>>;
};

const emptyConfiguratorOptions = (): ConfiguratorOptions => ({
  diamondType: '',
  shape: '',
  style: '',
  metalCaratage: '',
  weight: '',
  quality: '',
  ringSize: '',
});

const emptyOptionGroups = (): Record<ConfiguratorKey, string[]> => ({
  diamondType: [],
  shape: [],
  style: [],
  metalCaratage: [],
  weight: [],
  quality: [],
  ringSize: [],
});

const defaultForm: OrderFormState = {
  companyId: '',
  branchId: '',
  salesRepId: '',
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

const DESIGN_DROPDOWN_PAGE_SIZE = 50;
const SHIP_VIA_OPTIONS = [
  { value: 'UPS', label: 'UPS' },
  { value: 'FED_EX', label: 'FED EX' },
  { value: 'HAND_DELIVERY', label: 'HAND DELIVERY' },
  { value: 'OTHER', label: 'OTHER' },
];
const defaultCompletedShippingForm: CompletedShippingForm = {
  shipDate: '',
  shipVia: '',
  trackingNo: '',
  invoiceNo: '',
};

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
const getUrlExtension = (url: string): string => {
  const clean = stripUrlSuffix(url);
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toUpperCase() || 'FILE';
};
const isImageUrl = (url: string): boolean => {
  const normalized = (url || '').trim();
  if (!normalized) return false;
  if (/^data:image\//i.test(normalized)) return true;
  const clean = stripUrlSuffix(normalized);
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif'].some((ext) => clean.endsWith(ext));
};
const isVideoUrl = (url: string): boolean => {
  const normalized = (url || '').trim();
  if (!normalized) return false;
  if (/^data:video\//i.test(normalized)) return true;
  const clean = stripUrlSuffix(normalized);
  return ['.mp4', '.webm', '.mov', '.m4v', '.ogv', '.ogg'].some((ext) => clean.endsWith(ext));
};
const toOptionLabel = (value: unknown): string => {
  if (value && typeof value === 'object' && 'label' in value) return String((value as { label: unknown }).label || '').trim();
  return String(value || '').trim();
};
const compactOptions = (values?: unknown[]): string[] =>
  Array.from(new Set((values || []).map(toOptionLabel).filter(Boolean)));

const formatMoney = (value: number): string =>
  `USD ${Math.round(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const hasSnapshotValue = (value: unknown): boolean =>
  value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value));
const formatSnapshotMoney = (value: unknown): string =>
  hasSnapshotValue(value) ? formatMoney(Number(value)) : 'Not captured';
const formatSnapshotMultiplier = (value: unknown): string =>
  hasSnapshotValue(value) ? `× ${Number(value).toFixed(2)}` : '—';
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
const getDesignDefaultPrice = (design?: Pick<DesignDetail, 'displayPrice' | 'totalValue'> | null): number => {
  const displayPrice = Number(design?.displayPrice ?? 0);
  if (Number.isFinite(displayPrice) && displayPrice > 0) return displayPrice;
  const totalValue = Number(design?.totalValue ?? 0);
  return Number.isFinite(totalValue) && totalValue > 0 ? totalValue : 0;
};
const toOrderPriceInput = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '';
  return String(Math.round(value));
};
const toDateInputValue = (value?: string | Date | null): string => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const addDays = (value: string | Date | null | undefined, days: number): Date => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};
const getExpectedDeliveryDefault = (createdAt?: string | Date | null): string => toDateInputValue(addDays(createdAt, 28));
const getExpectedDeliveryMin = (createdAt?: string | Date | null): string => toDateInputValue(addDays(createdAt, 14));
const formatWeight = (value?: number | null): string => Number(value || 0).toFixed(3);
const formatDesignLabel = (designNo?: string | null, version?: string | null): string => {
  const safeNo = String(designNo || '').trim();
  const safeVersion = String(version || '').trim();
  if (!safeNo && !safeVersion) return '-';
  if (!safeVersion) return safeNo || '-';
  if (!safeNo) return safeVersion;
  return `${safeNo} - ${safeVersion.toUpperCase()}`;
};
const buildSelectionDescription = (options: Partial<ConfiguratorOptions>): string =>
  [
    options.diamondType ? `Type: ${options.diamondType}` : null,
    options.metalCaratage ? `Metal: ${options.metalCaratage}` : null,
    options.ringSize ? `Jewelry Size: ${options.ringSize}` : null,
    options.style ? `Spread: ${options.style}` : null,
    options.quality ? `Quality: ${options.quality}` : null,
    options.weight ? `Weight: ${options.weight}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

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

function MediaFileFallback({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center rounded-lg border border-[#efe7dc] bg-[#fcfaf6] text-[#b4a692] ${compact ? 'gap-1' : 'gap-3'}`}>
      <svg className={compact ? 'h-6 w-6' : 'h-12 w-12'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
        <path d="M14 2v5h5" />
      </svg>
      <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold uppercase tracking-wide`}>{label}</span>
    </div>
  );
}

function OrderMediaPreview({
  url,
  alt,
  failedMediaUrls,
  onImageError,
  className = '',
}: {
  url: string;
  alt: string;
  failedMediaUrls: Set<string>;
  onImageError: (url: string) => void;
  className?: string;
}) {
  const resolved = resolvePublicAssetUrl(url);
  const extension = getUrlExtension(resolved);
  if (isVideoUrl(resolved)) {
    return (
      <video
        src={resolved}
        className={`h-full w-full rounded-lg border border-slate-200 bg-slate-50 object-contain ${className}`}
        controls
        muted
        playsInline
        preload="metadata"
      />
    );
  }
  if (isImageUrl(resolved) && !failedMediaUrls.has(resolved)) {
    return (
      <img
        src={resolved}
        alt={alt}
        className={`h-full w-full rounded-lg border border-slate-200 bg-white object-contain ${className}`}
        onError={() => onImageError(resolved)}
      />
    );
  }
  return <MediaFileFallback label={isImageUrl(resolved) ? `${extension} unavailable` : `${extension} file`} />;
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm transition-all duration-300 sm:p-6">
      <div className={`relative my-auto flex max-h-[calc(100dvh-2rem)] w-full ${size} flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]`}>
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
  const { confirm: confirmAppDialog, dialogNode: appDialogNode } = useAppDialog();
  const deepLinkedOrderRef = useRef<string | null>(null);
  const orderRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const purchaseOrderBlurCheckRef = useRef('');
  const currentUser = useMemo(() => getStoredUser(), []);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCompanyAdmin = currentUser?.role === 'COMPANY_ADMIN';
  const canViewCostPrice = isSuperAdmin || isCompanyAdmin || currentUser?.role === 'BRANCH_MANAGER';
  const isBranchScopedUser = currentUser?.role === 'BRANCH_MANAGER' || currentUser?.role === 'SALES_REP';
  const currentUserRole = currentUser?.role;
  const currentUserId = currentUser?.id;
  const canEditOrder = Boolean(currentUser && hasActionPermission(currentUser, 'order.edit'));
  const canUpdateOrderStatus = Boolean(currentUser && hasActionPermission(currentUser, 'order.status_update'));
  const canSeeOrderHistory = canViewOrderHistory(currentUserRole);

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
  const [editingOrderStatus, setEditingOrderStatus] = useState<string>('');
  const [editOrderLoading, setEditOrderLoading] = useState(false);
  const [viewOrderLoading, setViewOrderLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const [activeToggleOrderId, setActiveToggleOrderId] = useState<string | null>(null);
  const [statusUpdatingOrderId, setStatusUpdatingOrderId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState<OrderFormState>(defaultForm);
  const [formErrors, setFormErrors] = useState<OrderFormErrors>({});
  const [deliveryDateMin, setDeliveryDateMin] = useState(() => getExpectedDeliveryMin());
  const [orderNumber, setOrderNumber] = useState('');
  const [editingDesignNo, setEditingDesignNo] = useState('');
  const [baseDesignId, setBaseDesignId] = useState('');
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
  const [designOptions, setDesignOptions] = useState<DesignOption[]>([]);
  const [designOptionsLoading, setDesignOptionsLoading] = useState(false);
  const [designOptionsPage, setDesignOptionsPage] = useState(0);
  const [designOptionsTotalPages, setDesignOptionsTotalPages] = useState(1);
  const [designDropdownSearch, setDesignDropdownSearch] = useState('');
  const [designDetail, setDesignDetail] = useState<DesignDetail | null>(null);
  const [designMediaUrls, setDesignMediaUrls] = useState<string[]>([]);
  const [configuratorOptionGroups, setConfiguratorOptionGroups] = useState<Record<ConfiguratorKey, string[]>>(emptyOptionGroups);
  const [selectedConfiguratorOptions, setSelectedConfiguratorOptions] = useState<ConfiguratorOptions>(emptyConfiguratorOptions);
  const [configuratorLoading, setConfiguratorLoading] = useState(false);
  const [configuratorError, setConfiguratorError] = useState<string | null>(null);
  const [configuratorRawOptionGroups, setConfiguratorRawOptionGroups] = useState<any>({});
  const [resolvingConfigurator, setResolvingConfigurator] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [failedMediaUrls, setFailedMediaUrls] = useState<Set<string>>(() => new Set());
  const [showDesignPickerModal, setShowDesignPickerModal] = useState(false);
  const [designFilters, setDesignFilters] = useState({
    search: '',
    jewelryGroup: '',
    collection: '',
    metal: '',
    jewelrySize: '',
    designStatus: '',
  });
  const [viewOrder, setViewOrder] = useState<OrderRow | null>(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [viewDesign, setViewDesign] = useState<DesignDetail | null>(null);
  const [viewMediaUrls, setViewMediaUrls] = useState<string[]>([]);
  const [statusChangeOrder, setStatusChangeOrder] = useState<OrderRow | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState('');
  const [completedShippingForm, setCompletedShippingForm] = useState<CompletedShippingForm>(defaultCompletedShippingForm);
  const [completedShippingErrors, setCompletedShippingErrors] = useState<Partial<Record<keyof CompletedShippingForm, string>>>({});
  const [historyOrder, setHistoryOrder] = useState<OrderRow | null>(null);
  const [historyRows, setHistoryRows] = useState<OrderHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [pendingOrderStatusChange, setPendingOrderStatusChange] = useState<{
    order: OrderRow;
    from: string;
    to: string;
    shipping?: CompletedShippingForm;
  } | null>(null);
  const [pendingOrderSaveChoice, setPendingOrderSaveChoice] = useState<OrderSavePayload | null>(null);
  const [orderSaveChoiceSubmitting, setOrderSaveChoiceSubmitting] = useState<OrderSaveType | null>(null);
  const [alertDialog, setAlertDialog] = useState<{
    title: string;
    message: string;
    variant?: 'info' | 'success' | 'warning' | 'error';
  } | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    orderStatus: '',
    companyId: '',
    branchId: '',
    salesRepId: '',
    statusGroup: '',
    deliveryFrom: '',
    deliveryTo: '',
    createdFrom: '',
    createdTo: '',
    completedFrom: '',
    completedTo: '',
  });
  const designSearchDebounceRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const designRequestSeqRef = useRef(0);
  const configuratorRequestSeqRef = useRef(0);
  const previousDesignFiltersRef = useRef(designFilters);

  const isEditing = Boolean(editingOrderId);
  const listTableColumnCount = canViewCostPrice ? 14 : 13;
  const canSelectOrderCompany = isSuperAdmin;
  const canSelectOrderBranch = isSuperAdmin || isCompanyAdmin;
  const effectiveCompanyFilterId = filters.companyId || (isCompanyAdmin ? currentUser?.companyId || '' : '');
  const roleScopedDefaultForm = useMemo(
    () => ({
      ...defaultForm,
      companyId: currentUser?.role === 'SUPER_ADMIN' ? '' : currentUser?.companyId || '',
      branchId: isBranchScopedUser ? currentUser?.branchId || '' : '',
      salesRepId: currentUser?.role === 'SALES_REP' ? currentUser.id : '',
    }),
    [currentUser?.role, currentUser?.id, currentUser?.companyId, currentUser?.branchId, isBranchScopedUser],
  );

  const pageOffset = (page - 1) * pageSize;
  const hasActiveFilters = Boolean(
    filters.search ||
    filters.orderStatus ||
    filters.companyId ||
    filters.branchId ||
    filters.salesRepId ||
    filters.statusGroup ||
    filters.deliveryFrom ||
    filters.deliveryTo ||
    filters.createdFrom ||
    filters.createdTo ||
    filters.completedFrom ||
    filters.completedTo,
  );
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
  const showAlert = (
    message: string,
    options: { title?: string; variant?: 'info' | 'success' | 'warning' | 'error' } = {},
  ) => {
    setAlertDialog({
      title: options.title || 'Notice',
      message,
      variant: options.variant || 'info',
    });
  };

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      setOrdersError(null);
      const response = await api.get('/orders', {
        params: {
          page,
          limit: pageSize,
          status: showInactive ? 'INACTIVE' : 'ACTIVE',
          search: filters.search.trim() || undefined,
          orderStatus: filters.orderStatus || undefined,
          companyId: filters.companyId || undefined,
          branchId: filters.branchId || undefined,
          salesRepId: filters.salesRepId || undefined,
          statusGroup: filters.statusGroup || undefined,
          deliveryFrom: filters.deliveryFrom || undefined,
          deliveryTo: filters.deliveryTo || undefined,
          createdFrom: filters.createdFrom || undefined,
          createdTo: filters.createdTo || undefined,
          completedFrom: filters.completedFrom || undefined,
          completedTo: filters.completedTo || undefined,
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
    const response = await api.get('/companies/lookup', { params: { limit: 200, status: 'ACTIVE' } });
    setCompanies(response.data?.data || []);
  };

  const loadDesigns = async ({
    page: nextPage = 1,
    search = designDropdownSearch,
    reset = false,
  }: { page?: number; search?: string; reset?: boolean } = {}) => {
    if (designOptionsLoading) return;
    const requestSeq = designRequestSeqRef.current + 1;
    designRequestSeqRef.current = requestSeq;
    setDesignOptionsLoading(true);
    try {
      const trimmedSearch = search.trim();
      const response = await api.get('/products', {
        params: {
          page: nextPage,
          limit: DESIGN_DROPDOWN_PAGE_SIZE,
          status: 'ACTIVE',
          selectorOnly: true,
          search: trimmedSearch || undefined,
        },
      });
      if (requestSeq !== designRequestSeqRef.current) return;

      const rows: DesignOption[] = response.data?.data || [];
      setDesignOptions((prev) => {
        if (reset) return rows;
        const byId = new Map(prev.map((row) => [row.id, row]));
        rows.forEach((row) => byId.set(row.id, row));
        return Array.from(byId.values());
      });
      setDesignOptionsPage(response.data?.page || nextPage);
      setDesignOptionsTotalPages(response.data?.totalPages || 1);
    } catch {
      if (reset) {
        setDesignOptions([]);
        setDesignOptionsPage(0);
        setDesignOptionsTotalPages(1);
      }
    } finally {
      if (requestSeq === designRequestSeqRef.current) {
        setDesignOptionsLoading(false);
      }
    }
  };

  const openDesignDropdown = () => {
    if (designSearchDebounceRef.current) {
      window.clearTimeout(designSearchDebounceRef.current);
      designSearchDebounceRef.current = null;
    }
    setDesignDropdownSearch('');
    loadDesigns({ page: 1, search: '', reset: true });
  };

  const loadMoreDesigns = () => {
    if (designOptionsLoading || designOptionsPage >= designOptionsTotalPages) return;
    loadDesigns({ page: designOptionsPage + 1, search: designDropdownSearch, reset: false });
  };

  const loadPackets = async (): Promise<Record<string, string>> => {
    const response = await api.get('/products/master-tables/PACKET', { params: { page: 1, limit: 200, status: 'ACTIVE' } });
    const packets = response.data?.data || [];
    const mapped: Record<string, string> = {};
    packets.forEach((packet: any) => {
      if (packet?.id && packet?.packetName) {
        mapped[String(packet.id)] = String(packet.packetName);
      }
    });
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

  const loadSalesReps = async (branchId: string) => {
    if (!branchId) {
      setSalesReps([]);
      return;
    }

    try {
      const response = await api.get('/users/lookup', {
        params: { role: 'SALES_REP', branchId, status: 'ACTIVE' },
      });
      setSalesReps(response.data || []);
    } catch {
      setSalesReps([]);
    }
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



  const resetConfiguratorState = () => {
    setDesignDetail(null);
    setDesignMediaUrls([]);
    setConfiguratorOptionGroups(emptyOptionGroups());
    setSelectedConfiguratorOptions(emptyConfiguratorOptions());
    setConfiguratorError(null);
    setConfiguratorRawOptionGroups({});
    setResolvingConfigurator(false);
    setSelectedMediaIndex(0);
    setFailedMediaUrls(new Set());
  };

  const normalizeConfiguratorResponse = (response: ConfiguratorResponse) => {
    const selectedOptions = response.selectedOptions || {};
    const optionGroups = response.optionGroups || {};
    const normalizedOptions: ConfiguratorOptions = {
      ...emptyConfiguratorOptions(),
      ...Object.fromEntries(Object.entries(selectedOptions).map(([k, v]) => [k, toOptionLabel(v)])),
      metalCaratage: toOptionLabel(selectedOptions.metalCaratage || selectedOptions.metalColor || ''),
    };
    const normalizedGroups: Record<ConfiguratorKey, string[]> = {
      diamondType: compactOptions(optionGroups.diamondType),
      shape: compactOptions(optionGroups.shape),
      style: compactOptions(optionGroups.style),
      metalCaratage: compactOptions(optionGroups.metalCaratage || optionGroups.metalColor),
      weight: compactOptions(optionGroups.weight),
      quality: compactOptions(optionGroups.quality),
      ringSize: compactOptions(optionGroups.ringSize),
    };

    (Object.keys(normalizedGroups) as ConfiguratorKey[]).forEach((key) => {
      if (!normalizedOptions[key] && normalizedGroups[key][0]) {
        normalizedOptions[key] = normalizedGroups[key][0];
      }
      if (normalizedOptions[key] && !normalizedGroups[key].includes(normalizedOptions[key])) {
        normalizedGroups[key] = [normalizedOptions[key], ...normalizedGroups[key]];
      }
    });

    return {
      selectedDesign: response.selectedDesign,
      selectedOptions: normalizedOptions,
      optionGroups: normalizedGroups,
    };
  };

  const applyConfiguratorResponse = async (response: ConfiguratorResponse, preserveManualDescription = false) => {
    const normalized = normalizeConfiguratorResponse(response);
    setDesignDetail(normalized.selectedDesign);
    setConfiguratorOptionGroups(normalized.optionGroups);
    setConfiguratorRawOptionGroups(response.optionGroups || {});
    setSelectedConfiguratorOptions(normalized.selectedOptions);
    setSelectedMediaIndex(0);
    setFailedMediaUrls(new Set());
    setForm((prev) => {
      const generatedDescription = buildSelectionDescription(normalized.selectedOptions);
      const defaultPrice = toOrderPriceInput(getDesignDefaultPrice(normalized.selectedDesign));
      const shouldSyncPrice = !editingOrderId && !priceManuallyEdited && defaultPrice;
      return {
        ...prev,
        designId: normalized.selectedDesign.id,
        price: shouldSyncPrice ? defaultPrice : prev.price,
        quantity: prev.quantity || '1',
        shortDescription: preserveManualDescription && prev.shortDescription ? prev.shortDescription : generatedDescription,
      };
    });
    const familyMedia = uniqueMediaUrls(normalized.selectedDesign?.imageUrls || []);
    setDesignMediaUrls(familyMedia);
  };

  const loadDesignConfigurator = async (designId: string, preserveManualDescription = false) => {
    const requestSeq = configuratorRequestSeqRef.current + 1;
    configuratorRequestSeqRef.current = requestSeq;
    if (!designId) {
      resetConfiguratorState();
      return;
    }
    setConfiguratorLoading(true);
    setConfiguratorError(null);
    try {
      const response = await api.get(`/products/mobile/configurator/${encodeURIComponent(designId)}`);
      if (requestSeq !== configuratorRequestSeqRef.current) return;
      await applyConfiguratorResponse(response.data, preserveManualDescription);
    } catch (error: any) {
      if (requestSeq !== configuratorRequestSeqRef.current) return;
      resetConfiguratorState();
      setConfiguratorError(error?.response?.data?.message || 'Unable to load design configurator.');
    } finally {
      if (requestSeq === configuratorRequestSeqRef.current) {
        setConfiguratorLoading(false);
      }
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, pageSize, filters, showInactive]);

  useEffect(() => {
    const today = toDateInputValue();
    const view = searchParams.get('view');
    const nextFilters = {
      search: searchParams.get('search') || '',
      orderStatus: searchParams.get('orderStatus') || '',
      companyId: searchParams.get('companyId') || '',
      branchId: searchParams.get('branchId') || '',
      salesRepId: searchParams.get('salesRepId') || '',
      statusGroup: searchParams.get('statusGroup') || '',
      deliveryFrom: searchParams.get('deliveryFrom') || '',
      deliveryTo: searchParams.get('deliveryTo') || '',
      createdFrom: searchParams.get('createdFrom') || '',
      createdTo: searchParams.get('createdTo') || '',
      completedFrom: searchParams.get('completedFrom') || '',
      completedTo: searchParams.get('completedTo') || '',
    };
    let nextShowInactive = false;

    if (view === 'due-today') {
      nextFilters.deliveryFrom = today;
      nextFilters.deliveryTo = today;
    } else if (view === 'received-today') {
      nextFilters.createdFrom = today;
      nextFilters.createdTo = today;
    } else if (view === 'active') {
      nextFilters.statusGroup = nextFilters.statusGroup || 'NON_COMPLETED';
      nextShowInactive = false;
    } else if (view === 'orders-trend') {
      nextFilters.statusGroup = nextFilters.statusGroup || 'NON_COMPLETED';
    } else if (view === 'sales-trend' || view === 'sales-this-week') {
      nextFilters.statusGroup = nextFilters.statusGroup || 'COMPLETED';
    }

    setPage(1);
    setShowInactive(nextShowInactive);
    setFilters(nextFilters);
  }, [searchParams]);



  useEffect(() => {
    if (!showAddModal) return;
    loadCompanies();
    if (!editingOrderId) {
      loadOrderNumber();
    }
  }, [showAddModal, editingOrderId]);

  useEffect(
    () => () => {
      if (designSearchDebounceRef.current) {
        window.clearTimeout(designSearchDebounceRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!showViewModal) return;
  }, [showViewModal]);

  useEffect(() => {
    if (!form.companyId) {
      setBranches([]);
      setSalesReps([]);
      setForm((prev) => ({ ...prev, branchId: '', salesRepId: '' }));
      return;
    }
    loadBranches(form.companyId);
  }, [form.companyId]);

  useEffect(() => {
    if (!form.branchId) {
      setSalesReps([]);
      setForm((prev) => ({ ...prev, salesRepId: currentUser?.role === 'SALES_REP' ? currentUser.id : '' }));
      return;
    }
    loadSalesReps(form.branchId);
  }, [form.branchId, currentUser?.role, currentUser?.id]);

  useEffect(() => {
    if (!showAddModal) return;
    if (editingOrderId) return;
    loadOrderNumber();
  }, [showAddModal, editingOrderId]);

  useEffect(() => {
    if (!showAddModal) return;
    if (editingOrderId) return;
    if (!form.designId) {
      if (!priceManuallyEdited) {
        setForm((prev) => ({ ...prev, price: '' }));
      }
      return;
    }
    if (!form.companyId || !form.branchId) {
      if (!priceManuallyEdited) {
        const fallbackPrice = designDetail?.id === form.designId ? toOrderPriceInput(getDesignDefaultPrice(designDetail)) : '';
        if (fallbackPrice) {
          setForm((prev) => ({ ...prev, price: prev.price || fallbackPrice, quantity: prev.quantity || '1' }));
        }
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
          setForm((prev) => ({ ...prev, price: toOrderPriceInput(Number(nextPrice)), quantity: prev.quantity || '1' }));
        }
      } catch {
        const fallbackPrice = designDetail?.id === form.designId ? toOrderPriceInput(getDesignDefaultPrice(designDetail)) : '';
        if (fallbackPrice) {
          setForm((prev) => ({ ...prev, price: prev.price || fallbackPrice, quantity: prev.quantity || '1' }));
        }
      }
    };
    fetchPrice();
  }, [form.designId, form.companyId, form.branchId, showAddModal, editingOrderId, priceManuallyEdited, designDetail]);

  const confirmPurchaseOrderReuse = async (payload: {
    companyId: number;
    branchId?: number;
    purchaseOrderNumber: string;
  }) => {
    const poNumber = payload.purchaseOrderNumber.trim();
    if (!poNumber) return true;

    try {
      const response = await api.get('/orders/po-usage', {
        params: {
          companyId: payload.companyId,
          branchId: payload.branchId,
          purchaseOrderNumber: poNumber,
          excludeOrderId: editingOrderId || undefined,
        },
      });
      const count = Number(response.data?.count || 0);
      if (count <= 0) return true;

      const sampleOrders = Array.isArray(response.data?.orders)
        ? response.data.orders
          .slice(0, 3)
          .map((order: any) => [order?.orderNumber, order?.status].filter(Boolean).join(' - '))
          .filter(Boolean)
        : [];
      const suffix = sampleOrders.length ? `\n\nExisting item(s):\n${sampleOrders.join('\n')}` : '';
      return confirmAppDialog(`This PO has already been used for ${count} item(s). Continue?${suffix}`, {
        title: 'Purchase order already used',
        confirmLabel: 'Continue',
      });
    } catch (error: any) {
      showAlert(error?.response?.data?.message || 'Unable to verify PO usage.', {
        title: 'PO check failed',
        variant: 'error',
      });
      return false;
    }
  };

  const checkPurchaseOrderUsageOnBlur = async () => {
    const poNumber = form.purchaseOrderNumber.trim();
    if (!form.companyId || !poNumber) return;
    const checkKey = [form.companyId, editingOrderId || '', poNumber.toLowerCase()].join('|');
    if (purchaseOrderBlurCheckRef.current === checkKey) return;
    purchaseOrderBlurCheckRef.current = checkKey;
    await confirmPurchaseOrderReuse({
      companyId: Number(form.companyId),
      branchId: form.branchId ? Number(form.branchId) : undefined,
      purchaseOrderNumber: poNumber,
    });
  };

  const submitOrderPayload = async (payload: OrderSavePayload) => {
    if (editingOrderId) {
      await api.put(`/orders/${editingOrderId}`, payload);
    } else {
      await api.post('/orders', payload);
    }
    setShowAddModal(false);
    setEditingOrderId(null);
    setEditingOrderStatus('');
    setEditingDesignNo('');
    setForm({ ...roleScopedDefaultForm, deliveryDate: getExpectedDeliveryDefault() });
    setFormErrors({});
    setDeliveryDateMin(getExpectedDeliveryMin());
    resetConfiguratorState();
    await loadOrders();
  };

  const handleSaveOrder = async () => {
    if (editingOrderId && (!canEditOrder || !canEditOrderByStatus(editingOrderStatus, currentUserRole))) {
      showAlert('This order cannot be edited in its current status.', {
        title: 'Order locked',
        variant: 'warning',
      });
      return;
    }

    const nextErrors: OrderFormErrors = {};
    if (!form.companyId) {
      nextErrors.companyId = 'Company is required.';
    }
    if (!form.branchId) {
      nextErrors.branchId = 'Branch is required.';
    }
    if (!form.salesRepId) {
      nextErrors.salesRepId = 'Sales Rep is required.';
    }
    if (!form.designId) {
      nextErrors.designId = 'Design is required.';
    }
    if (!form.deliveryDate) {
      nextErrors.deliveryDate = 'Expected delivery date is required.';
    } else if (deliveryDateMin && form.deliveryDate < deliveryDateMin) {
      nextErrors.deliveryDate = 'Expected delivery date cannot be within 2 weeks of order creation date.';
    }
    if (!form.price || Number(form.price) <= 0) {
      nextErrors.price = 'Sale Price @ is required.';
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      nextErrors.quantity = 'No. of Pcs is required.';
    }
    if (calculateTotalAmount(form.price, form.quantity) <= 0) {
      nextErrors.totalAmount = 'TOTAL AMOUNT is required.';
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      showAlert(Object.values(nextErrors).filter(Boolean).join('\n'), {
        title: 'Please complete required fields',
        variant: 'warning',
      });
      return;
    }

    try {
      setSavingOrder(true);
      const payload: OrderSavePayload = {
        companyId: Number(form.companyId),
        branchId: Number(form.branchId),
        salesRepId: form.salesRepId ? Number(form.salesRepId) : undefined,
        designId: Number(form.designId),
        deliveryDate: form.deliveryDate || undefined,
        price: Number(form.price || 0),
        quantity: Number(form.quantity || 1),
        shortDescription: form.shortDescription?.trim() || '',
        customerName: form.customerName?.trim() || '',
        customerPhone: form.customerPhone?.trim() || '',
        customerEmail: form.customerEmail?.trim() || '',
        purchaseOrderNumber: form.purchaseOrderNumber?.trim() || '',
        notes: form.notes?.trim() || '',
      };

      const canContinue = await confirmPurchaseOrderReuse({
        companyId: payload.companyId,
        branchId: payload.branchId !== undefined && payload.branchId !== null ? Number(payload.branchId) : undefined,
        purchaseOrderNumber: payload.purchaseOrderNumber,
      });
      if (!canContinue) return;

      if (form.status === 'QUOTE') {
        setPendingOrderSaveChoice(payload);
        return;
      }

      await submitOrderPayload({ ...payload, orderType: 'ORDER' });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (editingOrderId ? 'Failed to update order' : 'Failed to create order');
      showAlert(message, { title: 'Unable to save order', variant: 'error' });
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
    setShowViewModal(true);
    setViewOrderLoading(true);
    setViewOrder(order);
    setViewDesign(null);
    setViewMediaUrls([]);
    try {
      const { detail, design } = await fetchOrderWithDesign(order.id);
      setViewOrder(detail);
      setViewDesign(design);
      setViewMediaUrls(uniqueMediaUrls(design?.imageUrls || []));
      setViewOrderLoading(false);
    } catch {
      setViewOrder(order);
      setViewDesign(null);
      setViewMediaUrls([]);
      setViewOrderLoading(false);
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
    setShowViewModal(true);
    setViewOrderLoading(true);
    setViewOrder(null);
    setViewDesign(null);
    setViewMediaUrls([]);

    const openDeepLinkedOrder = async () => {
      try {
        const { detail, design } = await fetchOrderWithDesign(deepLinkedOrderId);
        setViewOrder(detail);
        setViewDesign(design);
        setViewMediaUrls(uniqueMediaUrls(design?.imageUrls || []));
        setViewOrderLoading(false);
      } catch (error) {
        console.error('Failed to open deep-linked order', error);
        setViewOrder(null);
        setViewDesign(null);
        setViewMediaUrls([]);
        setViewOrderLoading(false);
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
    if (!canEditOrder || !canEditOrderByStatus(order.status, currentUserRole)) {
      showAlert('This order cannot be edited in its current status.', {
        title: 'Order locked',
        variant: 'warning',
      });
      return;
    }

    setShowAddModal(true);
    setEditOrderLoading(true);
    setEditingOrderId(order.id);
    setEditingOrderStatus(normalizeOrderStatus(order.status));
    setEditingDesignNo(order.designNo || '');
    setPriceManuallyEdited(false);
    setFormErrors({});
    setDeliveryDateMin(getExpectedDeliveryMin(order.createdAt));
    setOrderNumber(order.orderNumber || '');
    resetConfiguratorState();

    try {
      const { detail, design } = await fetchOrderWithDesign(order.id);
      setEditingDesignNo(detail.designNo || order.designNo || '');
      setDeliveryDateMin(getExpectedDeliveryMin(detail.createdAt || order.createdAt));
      setBaseDesignId(detail.designId || '');
      setForm({
        companyId: detail.companyId || '',
        branchId: detail.branchId || '',
        salesRepId: detail.salesRepId || '',
        designId: detail.designId || '',
        deliveryDate: detail.deliveryDate || getExpectedDeliveryDefault(detail.createdAt || order.createdAt),
        status: normalizeOrderStatus(detail.status) === 'QUOTE' ? 'QUOTE' : 'ORDER',
        price: detail.price !== undefined && detail.price !== null ? String(detail.price) : '',
        quantity: detail.quantity !== undefined && detail.quantity !== null ? String(detail.quantity) : '1',
        shortDescription: detail.shortDescription || '',
        customerName: detail.customerName || '',
        customerPhone: detail.customerPhone || '',
        customerEmail: detail.customerEmail || '',
        purchaseOrderNumber: detail.purchaseOrderNumber || '',
        notes: detail.notes || '',
      });
      if (detail.companyId) {
        loadBranches(detail.companyId);
      }
      setEditOrderLoading(false);
      if (detail.designId) {
        void loadDesignConfigurator(detail.designId, true);
      } else {
        setDesignDetail(design);
        setDesignMediaUrls(uniqueMediaUrls(design?.imageUrls || []));
      }
    } catch {
      setForm({
        companyId: order.companyId || '',
        branchId: order.branchId || '',
        salesRepId: order.salesRepId || '',
        designId: order.designId || '',
        deliveryDate: order.deliveryDate || getExpectedDeliveryDefault(order.createdAt),
        status: normalizeOrderStatus(order.status) === 'QUOTE' ? 'QUOTE' : 'ORDER',
        price: order.price !== undefined && order.price !== null ? String(order.price) : '',
        quantity: order.quantity !== undefined && order.quantity !== null ? String(order.quantity) : '1',
        shortDescription: order.shortDescription || '',
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        customerEmail: order.customerEmail || '',
        purchaseOrderNumber: order.purchaseOrderNumber || '',
        notes: order.notes || '',
      });
      if (order.companyId) {
        loadBranches(order.companyId);
      }
      setEditOrderLoading(false);
    }
  };

  const openOrderStatusChange = (order: OrderRow) => {
    if (!canUpdateOrderStatus || !canOpenOrderStatusChange(order.status, currentUserRole, order.salesRepId, currentUserId)) {
      showAlert('No status change is allowed for this order in its current status.', {
        title: 'Status locked',
        variant: 'warning',
      });
      return;
    }
    const allowedStatuses = getAllowedOrderStatuses(order.status, currentUserRole, order.salesRepId, currentUserId);
    setStatusChangeOrder(order);
    setStatusChangeTarget(allowedStatuses.includes(order.status) ? order.status : allowedStatuses[0] || '');
    setCompletedShippingForm({
      shipDate: order.shipDate || toDateInputValue(),
      shipVia: order.shipVia || '',
      trackingNo: order.trackingNo || '',
      invoiceNo: order.invoiceNo || '',
    });
    setCompletedShippingErrors({});
  };

  const closeOrderStatusChange = () => {
    setStatusChangeOrder(null);
    setStatusChangeTarget('');
    setCompletedShippingForm(defaultCompletedShippingForm);
    setCompletedShippingErrors({});
  };

  const validateCompletedShippingForm = () => {
    const nextErrors: Partial<Record<keyof CompletedShippingForm, string>> = {};
    if (!completedShippingForm.shipDate) nextErrors.shipDate = 'Ship date is required.';
    if (!completedShippingForm.shipVia) nextErrors.shipVia = 'Ship via is required.';
    if (!completedShippingForm.trackingNo.trim()) nextErrors.trackingNo = 'Tracking no. is required.';
    if (!completedShippingForm.invoiceNo.trim()) nextErrors.invoiceNo = 'Invoice no. is required.';
    setCompletedShippingErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const requestOrderStatusChange = () => {
    if (!statusChangeOrder || !statusChangeTarget || statusChangeTarget === statusChangeOrder.status) return;
    if (!canUpdateOrderStatus || !canChangeOrderStatus(statusChangeOrder.status, statusChangeTarget, currentUserRole, statusChangeOrder.salesRepId, currentUserId)) {
      showAlert('This status change is not allowed for your role.', {
        title: 'Status locked',
        variant: 'warning',
      });
      return;
    }
    if (statusChangeTarget === 'COMPLETED' && !validateCompletedShippingForm()) {
      return;
    }
    setPendingOrderStatusChange({
      order: statusChangeOrder,
      from: statusChangeOrder.status,
      to: statusChangeTarget,
      shipping: statusChangeTarget === 'COMPLETED'
        ? {
          shipDate: completedShippingForm.shipDate,
          shipVia: completedShippingForm.shipVia,
          trackingNo: completedShippingForm.trackingNo.trim(),
          invoiceNo: completedShippingForm.invoiceNo.trim(),
        }
        : undefined,
    });
    closeOrderStatusChange();
  };

  const confirmOrderStatusChange = async () => {
    if (!pendingOrderStatusChange) return;
    if (!canUpdateOrderStatus || !canChangeOrderStatus(
      pendingOrderStatusChange.from,
      pendingOrderStatusChange.to,
      currentUserRole,
      pendingOrderStatusChange.order.salesRepId,
      currentUserId,
    )) {
      showAlert('This status change is not allowed for your role.', {
        title: 'Status locked',
        variant: 'warning',
      });
      return;
    }
    try {
      setStatusUpdatingOrderId(pendingOrderStatusChange.order.id);
      await api.patch(`/orders/${pendingOrderStatusChange.order.id}/status`, {
        status: pendingOrderStatusChange.to,
        ...(pendingOrderStatusChange.shipping || {}),
      });
      setPendingOrderStatusChange(null);
      await loadOrders();
    } catch (error: any) {
      showAlert(error?.response?.data?.message || 'Unable to change order status.', {
        title: 'Status update failed',
        variant: 'error',
      });
    } finally {
      setStatusUpdatingOrderId(null);
    }
  };

  const openOrderHistory = async (order: OrderRow) => {
    if (!canSeeOrderHistory) return;
    setHistoryOrder(order);
    setHistoryRows([]);
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const response = await api.get<OrderHistoryRow[]>(`/orders/${order.id}/history`);
      setHistoryRows(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      setHistoryError(error?.response?.data?.message || 'Unable to load order history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeOrderHistory = () => {
    setHistoryOrder(null);
    setHistoryRows([]);
    setHistoryError(null);
    setHistoryLoading(false);
  };

  const formatHistoryValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getVisibleHistoryChanges = (row: OrderHistoryRow): OrderHistoryChange[] => {
    if (!Array.isArray(row.changes)) return [];
    if (row.actionType === 'STATUS_CHANGE') return [];
    return row.changes;
  };

  const formatShipVia = (value?: string | null) => SHIP_VIA_OPTIONS.find((option) => option.value === value)?.label || value || '-';

  const handleConfiguratorOptionChange = async (key: ConfiguratorKey, value: string) => {
    if (!form.designId || !value) return;
    const nextOptions = { ...selectedConfiguratorOptions, [key]: value };
    setSelectedConfiguratorOptions(nextOptions);
    setResolvingConfigurator(true);
    setConfiguratorError(null);

    try {
      const params = new URLSearchParams();
      (Object.keys(nextOptions) as ConfiguratorKey[]).forEach((optionKey) => {
        if (optionKey === 'diamondType') return;
        const optionLabel = nextOptions[optionKey];
        if (optionLabel) {
          const rawGroup = configuratorRawOptionGroups[optionKey] || configuratorRawOptionGroups[optionKey === 'metalCaratage' ? 'metalColor' : optionKey] || [];
          const rawOption = rawGroup.find((o: any) => typeof o === 'object' && o !== null && String(o.name || o.value || o.label || '') === optionLabel);
          const optionId = rawOption?.id || rawOption?.value || optionLabel;
          params.set(optionKey, optionId);
        }
      });
      params.set('selectedKey', key);
      const response = await api.get(
        `/products/mobile/configurator/${encodeURIComponent(form.designId)}/resolve?${params.toString()}`,
      );
      await applyConfiguratorResponse(response.data);
      setPriceManuallyEdited(false);
    } catch (error: any) {
      setConfiguratorError(error?.response?.data?.message || 'Unable to update design selection.');
    } finally {
      setResolvingConfigurator(false);
    }
  };

  const selectDesignForOrder = (designId: string, closePicker = false) => {
    setPriceManuallyEdited(false);
    setBaseDesignId(designId);
    setForm((prev) => ({
      ...prev,
      designId,
      ...(designId ? {} : { shortDescription: '' }),
    }));
    if (designId) {
      setFormErrors((prev) => ({ ...prev, designId: undefined, price: undefined, totalAmount: undefined }));
    }
    void loadDesignConfigurator(designId);
    if (closePicker) {
      setShowDesignPickerModal(false);
    }
  };

  const clearSelectedDesign = () => {
    configuratorRequestSeqRef.current += 1;
    setBaseDesignId('');
    setForm((prev) => ({ ...prev, designId: '', shortDescription: '' }));
    resetConfiguratorState();
  };

  const resetDesignFilters = () => {
    setDesignFilters({
      search: '',
      jewelryGroup: '',
      collection: '',
      metal: '',
      jewelrySize: '',
      designStatus: '',
    });
    clearSelectedDesign();
  };

  const selectedDesignLabel = useMemo(() => {
    if (!designDetail) return '-';
    return formatDesignLabel(designDetail.designNo);
  }, [designDetail]);

  const editingDesignLabel = useMemo(() => {
    if (selectedDesignLabel !== '-') return selectedDesignLabel;
    if (editingDesignNo) return editingDesignNo;
    const matched = designOptions.find((option) => option.id === form.designId);
    return formatDesignLabel(matched?.designNo, matched?.version);
  }, [selectedDesignLabel, editingDesignNo, designOptions, form.designId]);
  const designSelectOptions = useMemo(
    () => {
      const rows = [...designOptions];
      if (designDetail && !rows.some((option) => option.id === designDetail.id)) {
        rows.unshift({
          id: designDetail.id,
          designNo: designDetail.designNo,
          designName: designDetail.designName,
          version: designDetail.version,
          jewelryGroup: designDetail.jewelryGroup,
          collection: designDetail.collection,
          jewelrySize: designDetail.jewelrySize,
          metalCaratage: designDetail.metalCaratage,
          designStatus: designDetail.designStatus,
          stoneInfo: designDetail.stoneInfo,
        });
      }
      return rows
        .filter((option) => {
          const search = designFilters.search.trim().toLowerCase();
          const haystack = [
            option.designNo,
            option.version,
            option.designName,
            option.jewelryGroup,
            option.collection,
            option.jewelrySize,
            option.metalCaratage,
            option.designStatus,
            option.stoneInfo,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          if (search && !haystack.includes(search)) return false;
          if (designFilters.jewelryGroup && option.jewelryGroup !== designFilters.jewelryGroup) return false;
          if (designFilters.collection && option.collection !== designFilters.collection) return false;
          if (designFilters.metal && option.metalCaratage !== designFilters.metal) return false;
          if (designFilters.jewelrySize && option.jewelrySize !== designFilters.jewelrySize) return false;
          if (designFilters.designStatus && option.designStatus !== designFilters.designStatus) return false;
          return true;
        })
        .map((option) => ({
          value: option.id,
          label: formatDesignLabel(option.designNo, option.version),
        }));
    },
    [designOptions, designFilters, designDetail],
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
      metals: uniqueSorted(designOptions.map((option) => option.metalCaratage)),
      jewelrySizes: uniqueSorted(designOptions.map((option) => option.jewelrySize)),
      designStatuses: uniqueSorted(designOptions.map((option) => option.designStatus)),
    };
  }, [designOptions, designFilters.jewelryGroup]);
  const hasActiveDesignFilters = Boolean(
    designFilters.search ||
    designFilters.jewelryGroup ||
    designFilters.collection ||
    designFilters.metal ||
    designFilters.jewelrySize ||
    designFilters.designStatus,
  );
  useEffect(() => {
    const filtersChanged = Object.entries(designFilters).some(
      ([key, value]) => previousDesignFiltersRef.current[key as keyof typeof designFilters] !== value,
    );
    previousDesignFiltersRef.current = designFilters;

    if (!filtersChanged) return;
    if (!baseDesignId || !designDetail) return;

    const matchesFilters =
      (!designFilters.jewelryGroup || designDetail.jewelryGroup === designFilters.jewelryGroup) &&
      (!designFilters.collection || designDetail.collection === designFilters.collection) &&
      (!designFilters.metal || designDetail.metalCaratage === designFilters.metal) &&
      (!designFilters.jewelrySize || designDetail.jewelrySize === designFilters.jewelrySize) &&
      (!designFilters.designStatus || designDetail.designStatus === designFilters.designStatus) &&
      (!designFilters.search || [designDetail.designNo, designDetail.version, designDetail.designName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(designFilters.search.trim().toLowerCase()));

    if (!matchesFilters) {
      clearSelectedDesign();
    }
  }, [designFilters]);
  const filteredDesignOptions = useMemo(
    () =>
      designSelectOptions
        .map((option) => designOptions.find((row) => row.id === option.value) || (designDetail?.id === option.value ? designDetail : null))
        .filter((row): row is DesignOption | DesignDetail => Boolean(row)),
    [designSelectOptions, designOptions, designDetail],
  );

  const mediaUrls = useMemo(() => {
    return designMediaUrls.filter((url) => url && url.trim());
  }, [designMediaUrls]);
  useEffect(() => {
    if (!mediaUrls.length && selectedMediaIndex !== 0) {
      setSelectedMediaIndex(0);
      return;
    }
    if (mediaUrls.length && selectedMediaIndex >= mediaUrls.length) {
      setSelectedMediaIndex(0);
    }
  }, [mediaUrls.length, selectedMediaIndex]);
  const selectedMediaUrl = mediaUrls[selectedMediaIndex] || mediaUrls[0] || '';
  const configuratorFields = useMemo(
    () => [
      { key: 'metalCaratage' as ConfiguratorKey, label: 'Metal' },
      { key: 'style' as ConfiguratorKey, label: 'Diamond Spread' },
      { key: 'quality' as ConfiguratorKey, label: 'Dia. Quality' },
      { key: 'weight' as ConfiguratorKey, label: 'Dia. Weight' },
      { key: 'ringSize' as ConfiguratorKey, label: 'Jewelry Size' },
      { key: 'shape' as ConfiguratorKey, label: 'Stones' },
    ],
    [],
  );
  const markMediaFailed = (url: string) => {
    setFailedMediaUrls((current) => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  };

  const toggleOrderActive = async (order: OrderRow, nextActive: boolean) => {
    if (!canEditOrder || !canEditOrderByStatus(order.status, currentUserRole)) {
      showAlert('This order cannot be changed in its current status.', {
        title: 'Order locked',
        variant: 'warning',
      });
      return;
    }
    const confirmed = await confirmAppDialog(
      nextActive
        ? 'Resume this order? It will be visible in active orders again.'
        : 'Suspend this order? It will move to inactive orders.',
      {
        title: nextActive ? 'Resume order' : 'Suspend order',
        confirmLabel: nextActive ? 'Resume' : 'Suspend',
      },
    );
    if (!confirmed) return;

    try {
      setActiveToggleOrderId(order.id);
      await api.patch(`/orders/${order.id}/active`, { isActive: nextActive });
      await loadOrders();
    } catch (error: any) {
      showAlert(error?.response?.data?.message || 'Unable to update order status.', {
        title: 'Order update failed',
        variant: 'error',
      });
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
            <td>${metal.metalCaratage || '-'}</td>
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
            <div><span class="label">Expected Delivery Date</span>${order.deliveryDate || '-'}</div>
            <div><span class="label">Ship Date</span>${order.shipDate || '-'}</div>
            <div><span class="label">Ship Via</span>${formatShipVia(order.shipVia)}</div>
            <div><span class="label">Tracking No.</span>${order.trackingNo || '-'}</div>
            <div><span class="label">Invoice No.</span>${order.invoiceNo || '-'}</div>
            <div><span class="label">Quantity</span>${order.quantity}</div>
            ${canViewCostPrice ? `<div><span class="label">Cost Price</span>${order.costPrice !== undefined && order.costPrice !== null ? formatMoney(Number(order.costPrice || 0)) : '-'}</div>` : ''}
            <div><span class="label">Sale Price</span>${formatMoney(Number(order.price || 0))}</div>
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
                <tr><th>Metal</th><th>Net Wt.</th><th>Total Wt.</th><th>Value</th></tr>
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
        showAlert('Unable to open print view.', { title: 'Print unavailable', variant: 'warning' });
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
      showAlert(error?.response?.data?.message || 'Unable to print order.', {
        title: 'Print failed',
        variant: 'error',
      });
    } finally {
      setPrintingOrderId(null);
    }
  };

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
              setForm({ ...roleScopedDefaultForm, deliveryDate: getExpectedDeliveryDefault() });
              setFormErrors({});
              setDeliveryDateMin(getExpectedDeliveryMin());
              resetConfiguratorState();
              setBranches([]);
              setPriceManuallyEdited(false);
              setBaseDesignId('');
              setShowAddModal(true);
            }}
          >
            + Add New Order
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[repeat(10,minmax(0,1fr))_auto]">
          <div>
            <label className="text-xs font-semibold text-slate-600">Search</label>
            <input
              type="text"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={filters.search}
              placeholder="PO #, customer, order..."
              onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, search: event.target.value })); }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <SmartDropdown
              value={filters.orderStatus}
              onChange={(val) => { setPage(1); setFilters((prev) => ({ ...prev, orderStatus: val, statusGroup: val ? '' : prev.statusGroup })); }}
              config={{
                options: orderStatusOptions.map(status => ({ id: status, value: status })),
                valueKey: 'id',
                labelKey: 'value',
                placeholder: 'All Status',
                clearLabel: 'All Status',
              }}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Status Group</label>
            <SmartDropdown
              value={filters.statusGroup}
              onChange={(val) => { setPage(1); setFilters((prev) => ({ ...prev, statusGroup: val, orderStatus: val ? '' : prev.orderStatus })); }}
              config={{
                options: [
                  { id: 'NON_COMPLETED', value: 'Active / Not Completed' },
                  { id: 'COMPLETED', value: 'Completed Sales' },
                  { id: 'FULFILLED', value: 'Fulfilled' },
                ],
                valueKey: 'id',
                labelKey: 'value',
                placeholder: 'All Groups',
                clearLabel: 'All Groups',
              }}
              className="mt-1"
            />
          </div>
          {canSelectOrderCompany ? (
            <div>
              <label className="text-xs font-semibold text-slate-600">Company</label>
              <SmartDropdown
                value={filters.companyId}
                onChange={(val) => { setPage(1); setFilters((prev) => ({ ...prev, companyId: val, branchId: '', salesRepId: '' })); }}
                config={{
                  apiSubPath: '/companies/lookup',
                  extraParams: { limit: 200, status: 'ACTIVE' },
                  valueKey: 'id',
                  labelKey: 'companyName',
                  placeholder: 'All Companies',
                  clearLabel: 'All Companies',
                }}
                className="mt-1"
              />
            </div>
          ) : null}
          <div>
            <label className="text-xs font-semibold text-slate-600">Branch</label>
            <SmartDropdown
              value={filters.branchId}
              onChange={(val) => { setPage(1); setFilters((prev) => ({ ...prev, branchId: val, salesRepId: '' })); }}
              config={{
                apiSubPath: '/branches',
                responsePath: 'data',
                extraParams: { companyId: effectiveCompanyFilterId || undefined, limit: 200, status: 'ACTIVE' },
                valueKey: 'id',
                labelKey: 'name',
                placeholder: 'All Branches',
                clearLabel: 'All Branches',
              }}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Rep Name</label>
            <SmartDropdown
              value={filters.salesRepId}
              onChange={(val) => { setPage(1); setFilters((prev) => ({ ...prev, salesRepId: val })); }}
              config={{
                apiSubPath: '/users/lookup',
                extraParams: { role: 'SALES_REP', status: 'ACTIVE', companyId: effectiveCompanyFilterId || undefined, branchId: filters.branchId || undefined },
                valueKey: 'id',
                labelKey: 'email',
                renderLabel: (option) => {
                  const fullName = `${option.firstName || ''} ${option.lastName || ''}`.trim();
                  return fullName || String(option.email || 'Sales Rep');
                },
                placeholder: 'All Reps',
                clearLabel: 'All Reps',
              }}
              className="mt-1"
            />
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
          <div>
            <label className="text-xs font-semibold text-slate-600">Created From</label>
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={filters.createdFrom}
              onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, createdFrom: event.target.value })); }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Created To</label>
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={filters.createdTo}
              onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, createdTo: event.target.value })); }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Completed From</label>
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={filters.completedFrom}
              onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, completedFrom: event.target.value })); }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Completed To</label>
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={filters.completedTo}
              onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, completedTo: event.target.value })); }}
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
                  search: '',
                  orderStatus: '',
                  companyId: '',
                  branchId: '',
                  salesRepId: '',
                  statusGroup: '',
                  deliveryFrom: '',
                  deliveryTo: '',
                  createdFrom: '',
                  createdTo: '',
                  completedFrom: '',
                  completedTo: '',
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
                  <th className="app-table-head-cell">Rep Name</th>
                  <th className="app-table-head-cell">Delivery</th>
                  <th className="app-table-head-cell">Qty</th>
                  {canViewCostPrice && <th className="app-table-head-cell">Cost Price</th>}
                  <th className="app-table-head-cell">Sale Price</th>
                  <th className="app-table-head-cell">TOTAL AMOUNT</th>
                  <th className="app-table-head-cell">Status</th>
                  <th className="app-table-head-cell">Created</th>
                  <th className="app-table-head-cell min-w-[190px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading && (
                  <TableLoadingRow colSpan={listTableColumnCount} label="Loading orders..." />
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
                    <td className="app-table-cell text-sm text-slate-700">{order.salesRepName || order.salesRepEmail || '-'}</td>
                    <td className="app-table-cell text-sm text-slate-700">{formatDisplayDate(order.deliveryDate)}</td>
                    <td className="app-table-cell text-sm text-slate-700">{Number(order.quantity || 0)}</td>
                    {canViewCostPrice && (
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
                    <td className="app-table-cell min-w-[190px] text-sm">
                      <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
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
                          title={canEditOrder && canEditOrderByStatus(order.status, currentUserRole) ? 'Edit Order' : 'Order locked'}
                          onClick={() => openEditModal(order)}
                          disabled={!canEditOrder || !canEditOrderByStatus(order.status, currentUserRole)}
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
                        {canUpdateOrderStatus && canOpenOrderStatusChange(order.status, currentUserRole, order.salesRepId, currentUserId) && (
                          <OrderActionIconButton
                            title="Change Status"
                            onClick={() => openOrderStatusChange(order)}
                            className="border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={statusUpdatingOrderId === order.id}
                          >
                            {statusUpdatingOrderId === order.id ? (
                              <span className="text-[10px] font-semibold">...</span>
                            ) : (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 12a9 9 0 0 1 15.5-6.2" />
                                <path d="M18.5 2.5v3.8h-3.8" />
                                <path d="M21 12a9 9 0 0 1-15.5 6.2" />
                                <path d="M5.5 21.5v-3.8h3.8" />
                              </svg>
                            )}
                          </OrderActionIconButton>
                        )}
                        {canSeeOrderHistory && (
                          <OrderActionIconButton
                            title="Order History"
                            onClick={() => openOrderHistory(order)}
                            className="border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100 hover:text-violet-800"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 8v5l3 2" />
                              <path d="M3.05 11a9 9 0 1 1 2.64 7" />
                              <path d="M3 18h3v-3" />
                            </svg>
                          </OrderActionIconButton>
                        )}
                        {order.isActive ? (
                          <OrderActionIconButton
                            title="Suspend Order"
                            onClick={() => toggleOrderActive(order, false)}
                            className="border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={activeToggleOrderId === order.id || !canEditOrder || !canEditOrderByStatus(order.status, currentUserRole)}
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
                            disabled={activeToggleOrderId === order.id || !canEditOrder || !canEditOrderByStatus(order.status, currentUserRole)}
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
            setEditingOrderStatus('');
            setEditOrderLoading(false);
            setEditingDesignNo('');
            setFormErrors({});
            setDeliveryDateMin(getExpectedDeliveryMin());
            resetConfiguratorState();
          }}
          size="max-w-7xl"
        >
          {editOrderLoading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600">
              Loading order details...
            </div>
          ) : (
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
                  <fieldset className="rounded-xl border border-[#ead7b5] bg-[#fffaf2] px-4 pb-4 pt-3 shadow-sm">
                    <legend className="rounded-full border border-[#ead7b5] bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9a6a2f]">Filter</legend>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.35fr)_minmax(150px,0.7fr)_minmax(150px,0.7fr)_minmax(150px,0.7fr)_auto] xl:items-end">
                      <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label className="text-sm font-medium text-slate-700">Design No</label>
                          {!isEditing && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-[#c9954f] hover:bg-[#fff8ed] hover:text-slate-900"
                              onClick={() => {
                                setShowDesignPickerModal(true);
                                openDesignDropdown();
                              }}
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 5h18" />
                                <path d="M6 12h12" />
                                <path d="M10 19h4" />
                              </svg>
                              Advanced filter
                            </button>
                          )}
                        </div>
                        {isEditing ? (
                          <input
                            type="text"
                            className="w-full rounded border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                            value={editingDesignLabel}
                            placeholder="Selected design"
                            disabled
                            readOnly
                          />
                        ) : (
                          <SmartDropdown
                            value={baseDesignId || form.designId}
                            onChange={(val) => selectDesignForOrder(val)}
                            config={{
                              apiSubPath: '/products',
                              extraParams: {
                                status: 'ACTIVE',
                                selectorOnly: true,
                                jewelryGroup: designFilters.jewelryGroup || undefined,
                                collection: designFilters.collection || undefined,
                                metalCaratage: designFilters.metal || undefined,
                                jewelrySize: designFilters.jewelrySize || undefined,
                                designStatus: designFilters.designStatus || undefined,
                              },
                              pagination: true,
                              valueKey: 'id',
                              labelKey: 'designNo',
                              renderLabel: (opt) => formatDesignLabel(opt.designNo as string, opt.version as string),
                              placeholder: 'Select Design',
                            }}
                          />
                        )}
                        {formErrors.designId && (
                          <p id="design-error" className="mt-1 text-xs font-medium text-rose-600">
                            {formErrors.designId}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Category</label>
                        <SmartDropdown
                          value={designFilters.jewelryGroup}
                          onChange={(val) => setDesignFilters((prev) => ({ ...prev, jewelryGroup: val, collection: '' }))}
                          config={{
                            apiSubPath: '/products/master-tables/JEWELRY_GROUP/dropdown',
                            valueKey: 'value',
                            labelKey: 'label',
                            placeholder: 'All Categories',
                            clearLabel: 'All Categories',
                          }}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Size</label>
                        <SmartDropdown
                          value={designFilters.jewelrySize}
                          onChange={(val) => setDesignFilters((prev) => ({ ...prev, jewelrySize: val }))}
                          config={{
                            apiSubPath: '/products/master-tables/JEWELRY_SIZE/dropdown',
                            valueKey: 'value',
                            labelKey: 'label',
                            placeholder: 'All Sizes',
                            clearLabel: 'All Sizes',
                          }}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Metal</label>
                        <SmartDropdown
                          value={designFilters.metal}
                          onChange={(val) => setDesignFilters((prev) => ({ ...prev, metal: val }))}
                          config={{
                            apiSubPath: '/products/master-tables/METAL_CARATAGE/dropdown',
                            valueKey: 'value',
                            labelKey: 'label',
                            placeholder: 'All Metals',
                            clearLabel: 'All Metals',
                          }}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <Button
                          variant="secondary"
                          type="button"
                          disabled={!hasActiveDesignFilters}
                          onClick={resetDesignFilters}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </fieldset>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(220px,0.75fr)]">
                    {canSelectOrderCompany ? (
                      <div>
                        <label className="text-sm font-medium text-slate-700">Company*</label>
                        <SmartDropdown
                          value={form.companyId}
                          onChange={(val) => {
                            setPriceManuallyEdited(false);
                            setForm((prev) => ({ ...prev, companyId: val, branchId: '', salesRepId: '' }));
                            setFormErrors((prev) => ({ ...prev, companyId: undefined, branchId: undefined, salesRepId: undefined }));
                          }}
                          config={{
                            apiSubPath: '/companies/lookup',
                            extraParams: { limit: 200, status: 'ACTIVE' },
                            valueKey: 'id',
                            labelKey: 'companyName',
                            placeholder: 'Select Company',
                            options: companies.map((company) => ({ ...company, label: company.companyCode ? company.companyName + ' (' + company.companyCode + ')' : company.companyName })),
                            renderLabel: (option) => [option.companyName, option.companyCode ? '(' + option.companyCode + ')' : ''].filter(Boolean).join(' '),
                          }}
                          className={`mt-1 ${formErrors.companyId
                            ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500'
                            : ''
                            }`}
                        />
                        {formErrors.companyId && (
                          <p id="company-error" className="mt-1 text-xs font-medium text-rose-600">
                            {formErrors.companyId}
                          </p>
                        )}
                      </div>

                    ) : null}

                    <div>
                      <label className="text-sm font-medium text-slate-700">Branch*</label>
                      <SmartDropdown
                        value={form.branchId}
                        onChange={(val) => {
                          setPriceManuallyEdited(false);
                          setForm((prev) => ({ ...prev, branchId: val, salesRepId: '' }));
                          setFormErrors((prev) => ({ ...prev, branchId: undefined, salesRepId: undefined }));
                        }}
                        config={{
                          apiSubPath: '/branches',
                          extraParams: { companyId: form.companyId, limit: 200, status: 'ACTIVE' },
                          valueKey: 'id',
                          labelKey: 'name',
                          placeholder: 'Select Branch',
                          disabled: !canSelectOrderBranch || !form.companyId,
                          options: branches.map((branch) => ({ ...branch, label: branch.code ? branch.name + ' (' + branch.code + ')' : branch.name })),
                          renderLabel: (option) => [option.name, option.code ? '(' + option.code + ')' : ''].filter(Boolean).join(' '),
                        }}
                        className={`mt-1 ${formErrors.branchId
                          ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500'
                          : ''
                          } ${(!canSelectOrderBranch || !form.companyId) ? 'appearance-none bg-none' : ''}`}
                      />
                      {formErrors.branchId && (
                        <p id="branch-error" className="mt-1 text-xs font-medium text-rose-600">
                          {formErrors.branchId}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">Sales Rep*</label>
                      <SmartDropdown
                        value={form.salesRepId}
                        onChange={(val) => {
                          setForm((prev) => ({ ...prev, salesRepId: val }));
                          setFormErrors((prev) => ({ ...prev, salesRepId: undefined }));
                        }}
                        config={{
                          apiSubPath: '/users/lookup',
                          extraParams: { role: 'SALES_REP', status: 'ACTIVE', companyId: form.companyId || undefined, branchId: form.branchId },
                          valueKey: 'id',
                          labelKey: 'email',
                          renderLabel: (option) => {
                            const fullName = `${option.firstName || ''} ${option.lastName || ''}`.trim();
                            return fullName || String(option.email || 'Sales Rep');
                          },
                          placeholder: 'Select Sales Rep',
                          disabled: currentUser?.role === 'SALES_REP' || !form.branchId,
                          options: salesReps.map((rep) => ({ ...rep })),
                        }}
                        className={`mt-1 ${formErrors.salesRepId
                          ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500'
                          : ''
                          } ${(currentUser?.role === 'SALES_REP' || !form.branchId) ? 'appearance-none bg-none' : ''}`}
                      />
                      {formErrors.salesRepId && (
                        <p id="sales-rep-error" className="mt-1 text-xs font-medium text-rose-600">
                          {formErrors.salesRepId}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">Expected Delivery Date*</label>
                      <input
                        type="date"
                        className={`mt-1 w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.deliveryDate
                          ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500'
                          : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
                          }`}
                        value={form.deliveryDate}
                        placeholder="Select expected delivery date"
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
                              deliveryDate: 'Expected delivery date cannot be within 2 weeks of order creation date.',
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

                  <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
                    <div className="md:col-span-3 xl:col-span-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a7a4c]">Ring Configurator</div>
                            <div className="mt-1 text-lg font-bold text-slate-900">{selectedDesignLabel}</div>
                            <div className="text-sm text-slate-500">{designDetail?.designName || designDetail?.jewelryGroup || 'Select a design to configure order details.'}</div>
                          </div>
                          {(configuratorLoading || resolvingConfigurator) && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              {configuratorLoading ? 'Loading design...' : 'Updating selection...'}
                            </span>
                          )}
                        </div>

                        <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                          <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-4 xl:min-h-[520px]">
                            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Options</div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              {configuratorFields.map(({ key, label }) => {
                                const options = configuratorOptionGroups[key];
                                const value = selectedConfiguratorOptions[key];
                                if (!options.length && !value) return null;
                                return (
                                  <div key={key}>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</label>
                                    {options.length > 1 ? (
                                      <div className="mt-1 flex flex-wrap gap-1.5">
                                        {options.map((option) => {
                                          const active = option === value;
                                          return (
                                            <button
                                              key={option}
                                              type="button"
                                              disabled={resolvingConfigurator}
                                              onClick={() => handleConfiguratorOptionChange(key, option)}
                                              className={`min-h-[24px] max-w-full rounded-full border px-2 py-0.5 text-[10px] font-bold leading-tight transition ${active
                                                ? 'border-[#c9954f] bg-[#fff8ed] text-slate-950 ring-2 ring-[#ead7b5]'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                                } disabled:cursor-wait disabled:opacity-70`}
                                            >
                                              <span className="block truncate">{option}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="mt-1 inline-flex min-h-[24px] max-w-full items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold leading-tight text-slate-900">
                                        <span className="truncate">{value || options[0] || '-'}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {configuratorError && (
                              <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                                {configuratorError}
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            <div
                              className="mx-auto flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                              style={{ width: '200px', height: '200px', maxWidth: '200px', maxHeight: '200px' }}
                            >
                              {selectedMediaUrl ? (
                                <OrderMediaPreview
                                  url={selectedMediaUrl}
                                  alt={selectedDesignLabel}
                                  failedMediaUrls={failedMediaUrls}
                                  onImageError={markMediaFailed}
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                                  No media available
                                </div>
                              )}
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                              {mediaUrls.length ? (
                                <div className="flex gap-2">
                                  {mediaUrls.map((url, index) => {
                                    const resolved = resolvePublicAssetUrl(url);
                                    const active = index === selectedMediaIndex;
                                    return (
                                      <button
                                        key={`${url}-${index}`}
                                        type="button"
                                        className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-white p-1 transition ${active ? 'border-[#c9954f] ring-2 ring-[#ead7b5]' : 'border-slate-200 hover:border-slate-300'
                                          }`}
                                        onClick={() => setSelectedMediaIndex(index)}
                                        title={`${getUrlExtension(resolved)} file`}
                                      >
                                        {isImageUrl(resolved) && !failedMediaUrls.has(resolved) ? (
                                          <img
                                            src={resolved}
                                            alt={`${selectedDesignLabel}-${index + 1}`}
                                            className="h-full w-full rounded object-cover"
                                            onError={() => markMediaFailed(resolved)}
                                          />
                                        ) : isVideoUrl(resolved) ? (
                                          <div className="flex h-full w-full items-center justify-center rounded bg-slate-900/5 text-[10px] font-bold text-slate-500">
                                            VIDEO
                                          </div>
                                        ) : (
                                          <MediaFileFallback label={getUrlExtension(resolved)} compact />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="flex h-20 items-center justify-center text-center text-xs font-semibold text-slate-400">
                                  No files
                                </div>
                              )}
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Product Specifications</div>
                              <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                                <div><span className="text-slate-500">Category</span><div className="font-semibold text-slate-900">{designDetail?.jewelryGroup || '-'}</div></div>
                                <div><span className="text-slate-500">Diamond Type</span><div className="font-semibold text-slate-900">{designDetail?.diamondType || '-'}</div></div>
                                <div><span className="text-slate-500">Diamond Spread</span><div className="font-semibold text-slate-900">{designDetail?.diamondSpread || '-'}</div></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Customer Name</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={form.customerName}
                        placeholder="Enter customer name"
                        onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Customer Phone</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={form.customerPhone}
                        placeholder="Enter customer phone"
                        onChange={(event) => setForm((prev) => ({ ...prev, customerPhone: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Customer Email</label>
                      <input
                        type="email"
                        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={form.customerEmail}
                        placeholder="Enter customer email"
                        onChange={(event) => setForm((prev) => ({ ...prev, customerEmail: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Purchase Order Number</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={form.purchaseOrderNumber}
                        placeholder="Enter purchase order number"
                        onChange={(event) => {
                          purchaseOrderBlurCheckRef.current = '';
                          setForm((prev) => ({ ...prev, purchaseOrderNumber: event.target.value }));
                        }}
                        onBlur={checkPurchaseOrderUsageOnBlur}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5">
                  <div className="border-b border-slate-200/70 bg-slate-50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-slate-700">
                    Order Pricing & Notes
                  </div>
                  <div className="space-y-4 p-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Selling Price (per piece)*</label>
                        <div className="mt-1 flex">
                          <input
                            type="number"
                            className={`w-full rounded-l border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.price
                              ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500'
                              : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
                              }`}
                            value={form.price}
                            placeholder="Enter sale price"
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
                        <p className="mt-1 text-xs text-slate-500">{hasSnapshotValue(form.price) ? `${formatMoney(Number(form.price))} per piece` : 'Enter the customer-facing unit price.'}</p>
                        {formErrors.price && (
                          <p id="price-error" className="mt-1 text-xs font-medium text-rose-600">
                            {formErrors.price}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">No. of Pcs*</label>
                        <input
                          type="number"
                          className={`mt-1 w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.quantity
                            ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500'
                            : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
                            }`}
                          value={form.quantity}
                          placeholder="Enter no. of pcs"
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
                        <label className="text-sm font-medium text-slate-700">Order Total*</label>
                        <div className="mt-1 flex">
                          <input
                            type="number"
                            className={`w-full rounded-l border px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 ${formErrors.totalAmount
                              ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500'
                              : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
                              }`}
                            value={formatNumberInput(formTotalAmount)}
                            placeholder="Total amount"
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

                    <div className="grid gap-3 rounded-xl border border-[#e5dacb] bg-[#faf7f1] p-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-white/80 bg-white/80 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Unit selling price</p>
                        <p className="mt-1 text-base font-bold tabular-nums text-slate-900">
                          {hasSnapshotValue(form.price) ? formatMoney(Number(form.price)) : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/80 bg-white/80 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Quantity</p>
                        <p className="mt-1 text-base font-bold tabular-nums text-slate-900">
                          {Number(form.quantity || 0) > 0 ? Number(form.quantity).toLocaleString() : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#cfe8da] bg-emerald-50/70 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Order total</p>
                        <p className="mt-1 text-base font-bold tabular-nums text-emerald-900">
                          {formTotalAmount > 0 ? formatMoney(formTotalAmount) : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Short Description</label>
                        <textarea
                          className="mt-1 h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          value={form.shortDescription}
                          placeholder="Enter short description"
                          onChange={(event) => setForm((prev) => ({ ...prev, shortDescription: event.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Notes</label>
                        <textarea
                          className="mt-1 h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          value={form.notes}
                          placeholder="Enter order notes"
                          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                        />
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
                    setEditingOrderStatus('');
                    setEditOrderLoading(false);
                    setEditingDesignNo('');
                    setFormErrors({});
                    setDeliveryDateMin(getExpectedDeliveryMin());
                    resetConfiguratorState();
                  }}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  disabled={savingOrder}
                  onClick={handleSaveOrder}
                >
                  {savingOrder ? 'Saving...' : isEditing ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
      {pendingOrderSaveChoice && (
        <Modal
          title="How would you like to generate?"
          onClose={() => {
            if (!orderSaveChoiceSubmitting) setPendingOrderSaveChoice(null);
          }}
          size="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              Save this entry as a quote draft, or generate it as an order for the selected sales rep?
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              If you choose Order, approval status will follow the selected sales rep approval setting.
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Button
                variant="secondary"
                type="button"
                disabled={savingOrder || Boolean(orderSaveChoiceSubmitting)}
                onClick={() => setPendingOrderSaveChoice(null)}
              >
                Cancel
              </Button>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  disabled={savingOrder || Boolean(orderSaveChoiceSubmitting)}
                  onClick={async () => {
                    const payload = pendingOrderSaveChoice;
                    setOrderSaveChoiceSubmitting('QUOTE');
                    setSavingOrder(true);
                    try {
                      await submitOrderPayload({ ...payload, orderType: 'QUOTE' });
                      setPendingOrderSaveChoice(null);
                    } catch (err: any) {
                      const message =
                        err?.response?.data?.message ||
                        (editingOrderId ? 'Failed to update order' : 'Failed to create order');
                      showAlert(message, { title: 'Unable to save quote', variant: 'error' });
                    } finally {
                      setSavingOrder(false);
                      setOrderSaveChoiceSubmitting(null);
                    }
                  }}
                >
                  {orderSaveChoiceSubmitting === 'QUOTE' ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                      Saving...
                    </>
                  ) : (
                    'Quote'
                  )}
                </Button>
                <Button
                  type="button"
                  disabled={savingOrder || Boolean(orderSaveChoiceSubmitting)}
                  onClick={async () => {
                    const payload = pendingOrderSaveChoice;
                    setOrderSaveChoiceSubmitting('ORDER');
                    setSavingOrder(true);
                    try {
                      await submitOrderPayload({ ...payload, orderType: 'ORDER' });
                      setPendingOrderSaveChoice(null);
                    } catch (err: any) {
                      const message =
                        err?.response?.data?.message ||
                        (editingOrderId ? 'Failed to update order' : 'Failed to create order');
                      showAlert(message, { title: 'Unable to save order', variant: 'error' });
                    } finally {
                      setSavingOrder(false);
                      setOrderSaveChoiceSubmitting(null);
                    }
                  }}
                >
                  {orderSaveChoiceSubmitting === 'ORDER' ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                      Generating...
                    </>
                  ) : (
                    'Order'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {historyOrder && (
        <Modal title={`Order history - ${historyOrder.orderNumber}`} onClose={closeOrderHistory} size="max-w-3xl">
          <div className="space-y-3">
            {historyLoading && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-600">
                Loading order history...
              </div>
            )}
            {historyError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                {historyError}
              </div>
            )}
            {!historyLoading && !historyError && historyRows.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-600">
                No history recorded yet.
              </div>
            )}
            {!historyLoading && !historyError && historyRows.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-bold">Description</th>
                      <th className="px-3 py-2 font-bold">Action</th>
                      <th className="px-3 py-2 font-bold">User Name</th>
                      <th className="px-3 py-2 font-bold">User Role</th>
                      <th className="px-3 py-2 font-bold">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {historyRows.map((row) => {
                      const visibleChanges = getVisibleHistoryChanges(row);
                      return (
                        <tr key={row.id} className="align-top">
                          <td className="px-3 py-3">
                            <div className="font-semibold text-slate-900">{row.summary}</div>
                            {visibleChanges.length > 0 && (
                              <div className="mt-2 space-y-1 text-xs text-slate-500">
                                {visibleChanges.map((change, index) => (
                                  <div key={`${row.id}-${change.field}-${index}`}>
                                    <span className="font-semibold text-slate-600">{change.field}</span>
                                    {': '}
                                    {formatHistoryValue(change.oldValue)}
                                    {' -> '}
                                    {formatHistoryValue(change.newValue)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-800">{row.actionType}</td>
                          <td className="px-3 py-3">{row.performedByName || 'Unknown user'}</td>
                          <td className="px-3 py-3">{row.performedByRole || '-'}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{row.performedAt ? new Date(row.performedAt).toLocaleString() : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
      {statusChangeOrder && (
        <Modal title="Change order status" onClose={closeOrderStatusChange} size="max-w-md">
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Order</div>
              <div className="mt-1 font-semibold text-slate-900">{statusChangeOrder.orderNumber}</div>
              <div className="mt-1 text-xs text-slate-500">
                Current status: <span className="font-semibold text-slate-700">{statusChangeOrder.status}</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">New Status</label>
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={statusChangeTarget}
                onChange={(event) => setStatusChangeTarget(event.target.value)}
              >
                {getAllowedOrderStatuses(
                  statusChangeOrder.status,
                  currentUserRole,
                  statusChangeOrder.salesRepId,
                  currentUserId,
                ).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            {statusChangeTarget === 'COMPLETED' && (
              <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Ship Date *</label>
                  <input
                    type="date"
                    className={`mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${completedShippingErrors.shipDate ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                      }`}
                    value={completedShippingForm.shipDate}
                    onChange={(event) => {
                      setCompletedShippingForm((prev) => ({ ...prev, shipDate: event.target.value }));
                      setCompletedShippingErrors((prev) => ({ ...prev, shipDate: undefined }));
                    }}
                  />
                  {completedShippingErrors.shipDate && <p className="mt-1 text-xs font-medium text-rose-600">{completedShippingErrors.shipDate}</p>}
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Ship Via *</label>
                  <select
                    className={`mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${completedShippingErrors.shipVia ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                      }`}
                    value={completedShippingForm.shipVia}
                    onChange={(event) => {
                      setCompletedShippingForm((prev) => ({ ...prev, shipVia: event.target.value }));
                      setCompletedShippingErrors((prev) => ({ ...prev, shipVia: undefined }));
                    }}
                  >
                    <option value="">Select Ship Via</option>
                    {SHIP_VIA_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {completedShippingErrors.shipVia && <p className="mt-1 text-xs font-medium text-rose-600">{completedShippingErrors.shipVia}</p>}
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Tracking No. *</label>
                  <input
                    type="text"
                    className={`mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${completedShippingErrors.trackingNo ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                      }`}
                    value={completedShippingForm.trackingNo}
                    onChange={(event) => {
                      setCompletedShippingForm((prev) => ({ ...prev, trackingNo: event.target.value }));
                      setCompletedShippingErrors((prev) => ({ ...prev, trackingNo: undefined }));
                    }}
                    placeholder="Enter tracking no."
                  />
                  {completedShippingErrors.trackingNo && <p className="mt-1 text-xs font-medium text-rose-600">{completedShippingErrors.trackingNo}</p>}
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Invoice No. *</label>
                  <input
                    type="text"
                    className={`mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${completedShippingErrors.invoiceNo ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                      }`}
                    value={completedShippingForm.invoiceNo}
                    onChange={(event) => {
                      setCompletedShippingForm((prev) => ({ ...prev, invoiceNo: event.target.value }));
                      setCompletedShippingErrors((prev) => ({ ...prev, invoiceNo: undefined }));
                    }}
                    placeholder="Enter invoice no."
                  />
                  {completedShippingErrors.invoiceNo && <p className="mt-1 text-xs font-medium text-rose-600">{completedShippingErrors.invoiceNo}</p>}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={closeOrderStatusChange}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!statusChangeTarget || statusChangeTarget === statusChangeOrder.status}
                onClick={requestOrderStatusChange}
              >
                Continue
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {pendingOrderStatusChange && (
        <Modal title="Confirm order status" onClose={() => setPendingOrderStatusChange(null)} size="max-w-md">
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Change order <span className="font-semibold">{pendingOrderStatusChange.order.orderNumber}</span> status from{' '}
              <span className="font-semibold">{pendingOrderStatusChange.from}</span> to{' '}
              <span className="font-semibold">{pendingOrderStatusChange.to}</span>?
            </p>
            {pendingOrderStatusChange.shipping && (
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                <div><span className="font-semibold text-slate-700">Ship Date:</span> {pendingOrderStatusChange.shipping.shipDate}</div>
                <div><span className="font-semibold text-slate-700">Ship Via:</span> {formatShipVia(pendingOrderStatusChange.shipping.shipVia)}</div>
                <div><span className="font-semibold text-slate-700">Tracking No.:</span> {pendingOrderStatusChange.shipping.trackingNo}</div>
                <div><span className="font-semibold text-slate-700">Invoice No.:</span> {pendingOrderStatusChange.shipping.invoiceNo}</div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                type="button"
                disabled={statusUpdatingOrderId === pendingOrderStatusChange.order.id}
                onClick={() => setPendingOrderStatusChange(null)}
              >
                No
              </Button>
              <Button
                type="button"
                disabled={statusUpdatingOrderId === pendingOrderStatusChange.order.id}
                onClick={confirmOrderStatusChange}
              >
                {statusUpdatingOrderId === pendingOrderStatusChange.order.id ? 'Updating...' : 'Yes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {showDesignPickerModal && (
        <Modal title="Select Design" onClose={() => setShowDesignPickerModal(false)} size="max-w-7xl">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600">Advanced Filters</div>
                <button
                  type="button"
                  className="text-xs font-bold text-[#9a6a2f] hover:text-[#7c5222]"
                  disabled={!hasActiveDesignFilters}
                  onClick={resetDesignFilters}
                >
                  Clear all filters
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Search</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={designFilters.search}
                    placeholder="Design no, version..."
                    onChange={(event) => setDesignFilters((prev) => ({ ...prev, search: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Category</label>
                  <select
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={designFilters.jewelryGroup}
                    onChange={(event) => setDesignFilters((prev) => ({ ...prev, jewelryGroup: event.target.value, collection: '' }))}
                  >
                    <option value="">All Categories</option>
                    {designFilterOptions.jewelryGroups.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Sub Category</label>
                  <select
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={designFilters.collection}
                    onChange={(event) => setDesignFilters((prev) => ({ ...prev, collection: event.target.value }))}
                  >
                    <option value="">All Sub Categories</option>
                    {designFilterOptions.collections.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Jewelry Size</label>
                  <select
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={designFilters.jewelrySize}
                    onChange={(event) => setDesignFilters((prev) => ({ ...prev, jewelrySize: event.target.value }))}
                  >
                    <option value="">All Sizes</option>
                    {designFilterOptions.jewelrySizes.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Metal Info</label>
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
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Status</label>
                  <select
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={designFilters.designStatus}
                    onChange={(event) => setDesignFilters((prev) => ({ ...prev, designStatus: event.target.value }))}
                  >
                    <option value="">All Statuses</option>
                    {designFilterOptions.designStatuses.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                <div className="text-sm font-bold text-slate-800">
                  Designs <span className="font-semibold text-slate-500">({filteredDesignOptions.length})</span>
                </div>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={designOptionsLoading || designOptionsPage >= designOptionsTotalPages}
                  onClick={loadMoreDesigns}
                >
                  {designOptionsLoading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
              <div className="max-h-[500px] overflow-auto">
                {filteredDesignOptions.length ? (
                  <table className="w-full min-w-[1040px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50">
                      <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                        <th className="w-10 px-3 py-3"></th>
                        <th className="w-12 px-2 py-3">#</th>
                        <th className="w-64 px-3 py-3">Design</th>
                        <th className="px-3 py-3">Barcode</th>
                        <th className="px-3 py-3">Category</th>
                        <th className="px-3 py-3">Size</th>
                        <th className="px-3 py-3">Metal</th>
                        <th className="px-3 py-3">Collection</th>
                        <th className="px-3 py-3">Stone</th>
                        <th className="px-3 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDesignOptions.map((design, index) => {
                        const selected = design.id === form.designId;
                        const cover = design.imageUrls?.[0] || '';
                        const resolvedCover = cover ? resolvePublicAssetUrl(cover) : '';
                        return (
                          <tr
                            key={design.id}
                            className={`cursor-pointer border-b border-slate-100 transition hover:bg-[#fffaf2] ${selected ? 'bg-[#fff8ed]' : 'bg-white'
                              }`}
                            onClick={() => selectDesignForOrder(design.id, true)}
                          >
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                readOnly
                                className="h-4 w-4 rounded border-slate-300 text-[#c9954f] focus:ring-[#c9954f]"
                              />
                            </td>
                            <td className="px-2 py-3 text-sm font-medium text-slate-500">{index + 1}</td>
                            <td className="px-3 py-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                  {resolvedCover && isImageUrl(resolvedCover) ? (
                                    <img src={resolvedCover} alt={design.designNo} className="h-full w-full object-cover" />
                                  ) : (
                                    <MediaFileFallback label="N/A" compact />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-bold text-slate-900">{design.designNo || '-'}</div>
                                  <div className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                    {design.version ? `${design.version.toUpperCase()} Ver.` : '1 Ver.'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-sm font-semibold text-slate-700">{design.barcode || '-'}</td>
                            <td className="px-3 py-3 text-sm text-slate-700">{design.jewelryGroup || '-'}</td>
                            <td className="px-3 py-3 text-sm text-slate-700">{design.jewelrySize || '-'}</td>
                            <td className="px-3 py-3 text-sm text-slate-700">{design.metalCaratage || '-'}</td>
                            <td className="px-3 py-3 text-sm text-slate-700">{design.collection || '-'}</td>
                            <td className="px-3 py-3 text-sm text-slate-700">{design.stoneInfo || '-'}</td>
                            <td className="px-3 py-3 text-sm font-semibold text-slate-700">{design.designStatus || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="m-3 flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
                    No designs match these filters.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
      {showViewModal && (
        <Modal title={`ORDER DETAILS ${viewOrder?.orderNumber ? `(${viewOrder.orderNumber})` : ''}`} onClose={() => setShowViewModal(false)} size="max-w-6xl">
          {viewOrderLoading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600">
              Loading order details...
            </div>
          ) : (
            <div className="space-y-6">
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
                {/* <div>
              <label className="text-sm font-medium text-slate-700">Sub Category</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewDesign?.collection || '-'}
              </div>
              </div> */}
                <div>
                  <label className="text-sm font-medium text-slate-700">Jewelry Size</label>
                  <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {viewDesign?.jewelrySize || '-'}
                  </div>
                </div>
                {/* <div>
              <label className="text-sm font-medium text-slate-700">Design Status</label>
              <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {viewDesign?.designStatus || '-'}
              </div>
              </div> */}
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
                  <label className="text-sm font-medium text-slate-700">Expected Delivery Date</label>
                  <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {viewOrder?.deliveryDate || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Ship Date</label>
                  <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {viewOrder?.shipDate || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Ship Via</label>
                  <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {formatShipVia(viewOrder?.shipVia)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Tracking No.</label>
                  <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {viewOrder?.trackingNo || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Invoice No.</label>
                  <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {viewOrder?.invoiceNo || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Quantity</label>
                  <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {viewOrder?.quantity ?? '-'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Selling Price (per piece)</label>
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
                {canViewCostPrice && (
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
                  <label className="text-sm font-medium text-slate-700">Client Name</label>
                  <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {viewOrder?.customerName || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Client Phone</label>
                  <div className="mt-1 min-h-[42px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {viewOrder?.customerPhone || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Client Email</label>
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

              {isSuperAdmin && (() => {
                const hasCostSnapshot = [
                  viewOrder?.baseCostSnapshot,
                  viewOrder?.companyCostSnapshot,
                  viewOrder?.branchCostSnapshot,
                ].some(hasSnapshotValue);
                const sellingPrice = hasSnapshotValue(viewOrder?.sellingPriceSnapshot)
                  ? viewOrder?.sellingPriceSnapshot
                  : viewOrder?.price;
                return (
                  <section className="overflow-hidden rounded-xl border border-[#dfd3c4] bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eadfce] bg-[#faf6ef] px-5 py-4">
                      <div>
                        <h3 className="text-base font-bold text-[#2b241d]">Pricing Breakdown</h3>
                        <p className="mt-0.5 text-xs text-slate-500">Pricing captured when this order was created.</p>
                      </div>
                      <span className="rounded-full border border-[#ead1a5] bg-[#fff8e8] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a6d25]">
                        Historical snapshot
                      </span>
                    </div>

                    {hasCostSnapshot ? (
                      <div className="p-4 sm:p-5">
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="min-w-full text-sm">
                            <thead className="border-b border-[#eadfce] bg-[#fcfaf6] text-left">
                              <tr>
                                <th scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Pricing Level</th>
                                <th scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Multiplier Applied</th>
                                <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Captured Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              <tr>
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-slate-800">Base Design Cost</p>
                                  <p className="mt-0.5 text-xs text-slate-500">Exact design/version cost at order creation</p>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-500">—</td>
                                <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{formatSnapshotMoney(viewOrder?.baseCostSnapshot)}</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-slate-800">Company Cost</p>
                                  <p className="mt-0.5 text-xs text-slate-500">Base cost after the company pricing rule</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex rounded-md border border-[#ead1a5] bg-[#fff8e8] px-2 py-1 text-xs font-semibold text-[#8a641f]">{formatSnapshotMultiplier(viewOrder?.companyMultiplierSnapshot)}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{formatSnapshotMoney(viewOrder?.companyCostSnapshot)}</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-slate-800">Branch Cost</p>
                                  <p className="mt-0.5 text-xs text-slate-500">Company cost after the branch pricing rule</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex rounded-md border border-[#ead1a5] bg-[#fff8e8] px-2 py-1 text-xs font-semibold text-[#8a641f]">{formatSnapshotMultiplier(viewOrder?.branchMultiplierSnapshot)}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{formatSnapshotMoney(viewOrder?.branchCostSnapshot)}</td>
                              </tr>
                              <tr className="bg-emerald-50/70">
                                <td className="px-4 py-3">
                                  <p className="font-bold text-emerald-900">Selling Price</p>
                                  <p className="mt-0.5 text-xs text-emerald-700">Final customer-facing price charged on this order</p>
                                </td>
                                <td className="px-4 py-3 text-sm text-emerald-800">—</td>
                                <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-emerald-900">{formatSnapshotMoney(sellingPrice)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {hasSnapshotValue(viewOrder?.effectiveMultiplierSnapshot) ? (
                          <p className="mt-3 text-right text-xs font-medium text-slate-500">
                            Effective multiplier: <span className="font-bold text-slate-700">{formatSnapshotMultiplier(viewOrder?.effectiveMultiplierSnapshot)}</span>
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="p-5">
                        <p className="text-sm font-semibold text-slate-700">Historical pricing snapshot is not available for this older order.</p>
                        <p className="mt-1 text-xs text-slate-500">The saved selling price remains available below.</p>
                        <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="text-sm font-semibold text-slate-700">Selling Price</span>
                          <span className="text-base font-bold tabular-nums text-slate-900">{formatSnapshotMoney(sellingPrice)}</span>
                        </div>
                      </div>
                    )}
                  </section>
                );
              })()}

              <div className="mt-6 rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800">Metal Information</div>
                <div className="flex min-h-[54px] flex-wrap items-center gap-2 bg-white px-4 py-3">
                  {viewDesign?.metals?.length ? (
                    viewDesign.metals.map((metal, index) => {
                      const label = metal.metalCaratage || '-';
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

              {/* <div className="mt-6 rounded-xl border border-slate-200">
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
          </div> */}

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
            </div>
          )}
        </Modal>
      )}
      <AlertDialog
        open={Boolean(alertDialog)}
        title={alertDialog?.title}
        message={alertDialog?.message || ''}
        variant={alertDialog?.variant}
        onClose={() => setAlertDialog(null)}
      />
      {appDialogNode}
    </div>
  );
}
