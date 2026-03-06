import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import api from '../../services/api';
import { getStoredUser } from '../../utils/auth';

type ModalType = 'info' | 'relevant' | 'stl' | 'process' | 'history' | 'pricing' | 'vendor' | null;

type DesignMasterType =
  | 'JEWELRY_GROUP'
  | 'COLLECTION'
  | 'JEWELRY_SIZE'
  | 'TAG'
  | 'DESIGN_STATUS'
  | 'STAGE'
  | 'METAL_CARATAGE'
  | 'GOLD_COLOUR'
  | 'DIAMOND_TYPE'
  | 'DIAMOND_SPREAD'
  | 'LABOR_HEAD'
  | 'FINDING_HEAD'
  | 'PACKET_STONE'
  | 'PACKET_SHAPE'
  | 'PACKET_SIZE'
  | 'PACKET_CUT'
  | 'PACKET_COLOR'
  | 'PACKET_QUALITY';

interface MasterOption {
  id: string;
  value: string;
  aliasName?: string;
  metalName?: string;
  metalColor?: string;
  metalPurity?: string;
  purityPercentage?: number;
  marketPricePerGm?: number;
  wastagePercent?: number;
  defaultWastagePercent?: number;
  livePricePerGm?: number;
}

interface DesignRow {
  id: string;
  designNo: string;
  version: string;
  jewelryGroup: string;
  jewelrySize: string;
  diamondType: string;
  diamondSpread: string;
  goldColour: string;
  collection: string;
  stoneInfo: string;
  price: number;
  tags: string[];
  stage: string;
  status: string;
  remarks: string;
  imageUrls?: string[];
  createdAt: string;
  modifiedAt: string;
}

interface ApiDesignRow {
  id: string;
  designNo?: string;
  version?: string;
  jewelryGroup?: string;
  jewelrySize?: string | null;
  diamondType?: string | null;
  diamondSpread?: string | null;
  goldColour?: string | null;
  collection?: string | null;
  stoneInfo?: string | null;
  totalValue?: number | string | null;
  tags?: unknown;
  stage?: string | null;
  designStatus?: string | null;
  remarks?: string | null;
  imageUrls?: unknown;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface DesignForm {
  designNo: string;
  jewelryGroup: string;
  collection: string;
  stage: string;
  diamondType: string;
  diamondSpread: string;
  jewelrySize: string;
  otherWeight: string;
  tags: string;
  designStatus: string;
  drawerLocation: string;
  designDescription: string;
  remarks: string;
}

interface PricingRow {
  id: string;
  title: string;
  qty: string;
  rate: string;
}

interface MetalRow {
  id: string;
  goldColour: string;
  netWt: string;
  wastagePercent: string;
  wastageWt: string;
  totalWt: string;
  pricePerGm: string;
  value: string;
}

interface GemRow {
  id: string;
  packetId: string;
  stone: string;
  shape: string;
  size: string;
  cut: string;
  color: string;
  quality: string;
  settingType: string;
  wtPerPcs: string;
  pcs: string;
  wtInCts: string;
  pricePerCt: string;
  amount: string;
}

interface LaborRow {
  id: string;
  laborHead: string;
  laborPerUnit: string;
  unitQty: string;
  laborValue: string;
}

interface FindingRow {
  id: string;
  findingHead: string;
  pricePerUnit: string;
  units: string;
  totalWeight: string;
  findingValue: string;
}

interface ProcessRow {
  id: string;
  stage: string;
  netWeight: string;
  duration: string;
  remarks: string;
}

interface VendorRow {
  id: string;
  supplier: string;
  stockType: string;
  supplierStyleNo: string;
}

interface PacketOption {
  id: string;
  packetName: string;
  stockType: string | null;
  stone: string | null;
  shape: string | null;
  size: string | null;
  cut: string | null;
  color: string | null;
  quality: string | null;
  priceIn: 'WT' | 'PCS';
  sellingPrice: number | null;
  weightPerPc: number | null;
  pieces: number;
  weight: number;
  weightUnit: 'CTS' | 'GMS';
  isActive: boolean;
}

interface PacketForm {
  packetName: string;
  stone: string;
  shape: string;
  size: string;
  cut: string;
  color: string;
  quality: string;
  priceIn: 'WT' | 'PCS';
  sellingPrice: string;
  weightPerPc: string;
  weightIn: 'CTS' | 'GRAM';
}

const makeId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const parseNum = (value: string): number => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};
const parseNumericValue = (value: number | string | null | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const toPacketToken = (value: string): string => value.replace(/\s+/g, '').replace(/[^a-zA-Z0-9/-]/g, '');
const buildPacketNameFromForm = (packet: Pick<PacketForm, 'stone' | 'shape' | 'size' | 'cut' | 'color' | 'quality'>): string => {
  const parts = [packet.stone, packet.shape, packet.size, packet.cut, packet.color, packet.quality]
    .map((entry) => toPacketToken((entry || '').trim()))
    .filter((entry) => entry.length > 0);
  return parts.join('');
};
const getMetalPurityDisplay = (option: MasterOption): string => {
  return (option.aliasName || option.value || '').trim();
};
const normalizeLookupKey = (value: unknown): string => String(value ?? '').trim().toLowerCase();
const normalizeDateTimeValue = (value: string | null | undefined): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 19).replace('T', ' ');
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
const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        return normalizeStringArray(JSON.parse(trimmed));
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }

  return [];
};
const mapApiDesignToRow = (design: ApiDesignRow): DesignRow => {
  const imageUrls = normalizeStringArray(design.imageUrls).map(resolvePublicAssetUrl);
  const tags = normalizeStringArray(design.tags);
  return {
    id: design.id,
    designNo: design.designNo || '',
    version: design.version || 'V1',
    jewelryGroup: design.jewelryGroup || '',
    jewelrySize: design.jewelrySize || 'N/A',
    diamondType: design.diamondType || '-',
    diamondSpread: design.diamondSpread || '-',
    goldColour: design.goldColour || 'N/A',
    collection: design.collection || 'General',
    stoneInfo: design.stoneInfo || 'N/A',
    price: parseNumericValue(design.totalValue),
    tags,
    stage: design.stage || '',
    status: design.designStatus || '',
    remarks: design.remarks || '',
    imageUrls,
    createdAt: normalizeDateTimeValue(design.createdAt) || '',
    modifiedAt: normalizeDateTimeValue(design.updatedAt) || '',
  };
};
const formatMoney = (value: number): string => `USD ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const DESIGN_GROUP_PREFIX_MAP: Record<string, string> = {
  ring: 'RING',
  bracelet: 'BL',
  earring: 'E',
  pendant: 'P',
  necklace: 'N',
  'nose pin': 'NP',
  nosepin: 'NP',
};
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildDesignNoPrefix = (jewelryGroup: string): string => {
  const normalized = jewelryGroup.trim().toLowerCase();
  if (!normalized) return 'DSN';
  const mapped = DESIGN_GROUP_PREFIX_MAP[normalized];
  if (mapped) return mapped;
  const token =
    jewelryGroup
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)[0] || 'DSN';
  return token.slice(0, 5);
};
const getNextDesignNo = (jewelryGroup: string, existingRows: DesignRow[]): string => {
  const prefix = buildDesignNoPrefix(jewelryGroup);
  const matcher = new RegExp(`^${escapeRegex(prefix)}-(\\d+)$`, 'i');

  let maxNumber = 0;
  existingRows.forEach((row) => {
    const match = matcher.exec((row.designNo || '').trim());
    if (!match) return;
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed > maxNumber) {
      maxNumber = parsed;
    }
  });

  return `${prefix}-${String(maxNumber + 1).padStart(4, '0')}`;
};

const designSeed: DesignRow[] = [
  { id: '1', designNo: 'RING-0006', version: 'V1', jewelryGroup: 'Ring', jewelrySize: 'US 6', diamondType: 'Lab Diamonds - EF/VVS-VS', diamondSpread: '1/2 Way', goldColour: '22 karat-Rose-Gold', collection: 'Silver', stoneInfo: 'Diamond 0', price: 1586.77, tags: ['Diamond Ring'], stage: 'Sketch', status: 'Mold', remarks: 'Primary hero ring', createdAt: '2025-12-17 12:23', modifiedAt: '2026-02-21 14:07' },
  { id: '2', designNo: 'BL-0001', version: 'V1', jewelryGroup: 'Bracelet', jewelrySize: '15.5 CM', diamondType: 'Natural Diamonds - GH/VS', diamondSpread: '3/4 Way', goldColour: '90-silver-Silver', collection: 'Silver Fortune', stoneInfo: 'Diamond 0', price: 9.6, tags: ['Silver Bracelet'], stage: 'Approved', status: 'Active', remarks: 'Starter collection item', createdAt: '2025-11-09 10:00', modifiedAt: '2026-02-16 15:42' },
  { id: '3', designNo: 'RING-0005', version: 'V1', jewelryGroup: 'Ring', jewelrySize: 'US 6', diamondType: 'Natural Diamonds - GH/VS', diamondSpread: 'Full Eternity', goldColour: '18 Karat-White-Gold', collection: 'Gold', stoneInfo: 'Diamond 0', price: 775.75, tags: ['Diamond Ring', 'Wedding'], stage: 'Production', status: 'Active', remarks: 'Wedding bestseller', createdAt: '2025-10-19 11:40', modifiedAt: '2026-02-18 10:51' },
  { id: '4', designNo: 'RING-0004', version: 'V2', jewelryGroup: 'Ring', jewelrySize: 'US 6', diamondType: 'Lab Diamonds - EF/VVS-VS', diamondSpread: '3/4 Way', goldColour: '18 Karat-White-Gold', collection: 'Gold', stoneInfo: 'Diamond 0', price: 1954.25, tags: ['Diamond Ring'], stage: 'Polish', status: 'Active', remarks: 'Premium edition', createdAt: '2025-10-01 09:15', modifiedAt: '2026-02-20 17:05' },
  { id: '5', designNo: 'NP-0001', version: 'V1', jewelryGroup: 'Nose Pin', jewelrySize: 'N/A', diamondType: 'Lab Diamonds - EF/VVS-VS', diamondSpread: '1/2 Way', goldColour: '22 karat-Rose-Gold', collection: 'Hermione', stoneInfo: 'None', price: 1951.6, tags: ['Minimal'], stage: 'Sketch', status: 'Inactive', remarks: 'Paused for revision', createdAt: '2025-08-07 13:20', modifiedAt: '2026-01-25 11:35' },
  { id: '6', designNo: 'RING-0003', version: 'V1', jewelryGroup: 'Ring', jewelrySize: 'US 6', diamondType: 'Natural Diamonds - GH/VS', diamondSpread: 'Full Eternity', goldColour: '22 karat-White-Gold', collection: 'Gold', stoneInfo: 'Diamond 0', price: 2871.74, tags: ['Diamond Ring', 'Gold Pendant'], stage: 'Production', status: 'Active', remarks: 'High-value custom request', createdAt: '2025-07-28 08:40', modifiedAt: '2026-02-22 09:05' },
  { id: '7', designNo: 'RING-0002', version: 'V2', jewelryGroup: 'Ring', jewelrySize: 'US 8', diamondType: 'Natural Diamonds - GH/VS', diamondSpread: '3/4 Way', goldColour: '18 K-Yellow-Gold', collection: 'Casual', stoneInfo: 'Aquamarine 0', price: 3247.69, tags: ['Diamond Ring'], stage: 'Quality Check', status: 'Active', remarks: 'Awaiting bulk order', createdAt: '2025-07-11 16:25', modifiedAt: '2026-02-23 10:45' },
  { id: '8', designNo: 'E-0001', version: 'V1', jewelryGroup: 'Earring', jewelrySize: '6 Inches', diamondType: 'Lab Diamonds - EF/VVS-VS', diamondSpread: '1/2 Way', goldColour: '22 karat-Rose-Gold', collection: 'Gold', stoneInfo: 'Diamond 0', price: 3555.63, tags: ['Gold Earring'], stage: 'Dispatch', status: 'Active', remarks: 'Ready for handoff', createdAt: '2025-06-15 09:00', modifiedAt: '2026-02-24 19:15' },
];

const defaultForm: DesignForm = {
  designNo: '',
  jewelryGroup: '',
  collection: '',
  stage: 'Sketch',
  diamondType: '',
  diamondSpread: '',
  jewelrySize: '',
  otherWeight: '',
  tags: '',
  designStatus: 'Mold',
  drawerLocation: '',
  designDescription: '',
  remarks: '',
};

const defaultPacketForm: PacketForm = {
  packetName: '',
  stone: '',
  shape: '',
  size: '',
  cut: '',
  color: '',
  quality: '',
  priceIn: 'WT',
  sellingPrice: '',
  weightPerPc: '',
  weightIn: 'CTS',
};

const historyRows = [
  ['Relevant designs updated successfully.', 'Developer', '2026-02-21 14:08'],
  ['Design updated successfully.', 'Developer', '2026-02-21 14:07'],
  ['Relevant designs updated successfully.', 'Admin', '2026-01-13 13:00'],
  ['Design added successfully.', 'Sina', '2025-12-17 12:23'],
];

const emptyMasterOptions = {
  jewelryGroups: [] as MasterOption[],
  collections: [] as MasterOption[],
  jewelrySizes: [] as MasterOption[],
  tags: [] as MasterOption[],
  designStatuses: [] as MasterOption[],
  stages: [] as MasterOption[],
  metalNames: [] as MasterOption[],
  metalColors: [] as MasterOption[],
  metalPurities: [] as MasterOption[],
  metalCaratages: [] as MasterOption[],
  goldColours: [] as MasterOption[],
  diamondTypes: [] as MasterOption[],
  diamondSpreads: [] as MasterOption[],
  laborHeads: [] as MasterOption[],
  findingHeads: [] as MasterOption[],
  packetStones: [] as MasterOption[],
  packetShapes: [] as MasterOption[],
  packetSizes: [] as MasterOption[],
  packetCuts: [] as MasterOption[],
  packetColors: [] as MasterOption[],
  packetQualities: [] as MasterOption[],
};

const masterTypeLabelMap: Record<DesignMasterType, string> = {
  JEWELRY_GROUP: 'Jewelry Group',
  COLLECTION: 'Collection',
  JEWELRY_SIZE: 'Jewelry Size',
  TAG: 'Tag',
  DESIGN_STATUS: 'Design Status',
  STAGE: 'Stage',
  METAL_CARATAGE: 'Metal Caratage',
  GOLD_COLOUR: 'Metal Caratage',
  DIAMOND_TYPE: 'Diamond Type',
  DIAMOND_SPREAD: 'Diamond Spread',
  LABOR_HEAD: 'Labor Head',
  FINDING_HEAD: 'Finding Head',
  PACKET_STONE: 'Stone',
  PACKET_SHAPE: 'Shape',
  PACKET_SIZE: 'Size',
  PACKET_CUT: 'Cut',
  PACKET_COLOR: 'Color',
  PACKET_QUALITY: 'Quality',
};

const inlineMasterAddButtonClass =
  'inline-flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold leading-none text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60';
const FINDING_FEATURE_ENABLED = false;

function Tag({ text }: { text: string }) {
  return <span className="inline-flex rounded bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">{text}</span>;
}

function Action({ label, onClick }: { label: string; onClick: () => void }) {
  const icon =
    label === 'View' ? (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ) : label === 'Edit' ? (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
      </svg>
    ) : (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    );

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
  size = 'max-w-6xl',
  zIndexClass = 'z-50',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: string;
  zIndexClass?: string;
}) {
  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-[1px]`}>
      <div className={`w-full ${size} max-h-[95vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
          <h2 className="text-base font-semibold tracking-wide text-slate-900">{title}</h2>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100" onClick={onClose}>x</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const currentUser = useMemo(() => getStoredUser(), []);
  const canModifyExistingDesigns = useMemo(() => {
    if (!currentUser) {
      return false;
    }

    return (
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'COMPANY_ADMIN' ||
      currentUser.role === 'BRANCH_MANAGER'
    );
  }, [currentUser]);
  const canCreateDesign = useMemo(() => {
    if (!currentUser) {
      return false;
    }

    if (canModifyExistingDesigns) {
      return true;
    }

    return currentUser.taskPermissions.includes('DESIGN_ENTRIES');
  }, [canModifyExistingDesigns, currentUser]);

  const [rows, setRows] = useState<DesignRow[]>(() => designSeed.slice(0, 0));
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [savingDesign, setSavingDesign] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDesignIds, setSelectedDesignIds] = useState<string[]>([]);
  const [isDesignNoManual, setIsDesignNoManual] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DesignForm>(defaultForm);
  const [filters, setFilters] = useState({ jewelryGroup: '', collection: '', jewelrySize: '', tags: '', stone: '', shape: '', stage: '', status: '', goldColour: '' });
  const [metalRows, setMetalRows] = useState<MetalRow[]>([{
    id: makeId(),
    goldColour: '',
    netWt: '',
    wastagePercent: '',
    wastageWt: '',
    totalWt: '',
    pricePerGm: '',
    value: '',
  }]);
  const [gemRows, setGemRows] = useState<GemRow[]>([{
    id: makeId(),
    packetId: '',
    stone: 'Diamond',
    shape: '',
    size: '',
    cut: '',
    color: '',
    quality: '',
    settingType: '',
    wtPerPcs: '0',
    pcs: '10',
    wtInCts: '0',
    pricePerCt: '100',
    amount: '',
  }]);
  const [laborRows, setLaborRows] = useState<LaborRow[]>([{
    id: makeId(),
    laborHead: 'Setting',
    laborPerUnit: 'Price Per Quantity',
    unitQty: '1',
    laborValue: '2',
  }]);
  const [findingRows, setFindingRows] = useState<FindingRow[]>([]);
  const [processRows, setProcessRows] = useState<ProcessRow[]>([
    { id: makeId(), stage: 'CAD', netWeight: '5', duration: '45', remarks: 'Initial modeling' },
    { id: makeId(), stage: 'Casting', netWeight: '5', duration: '90', remarks: 'Primary cast run' },
  ]);
  const [pricingRows, setPricingRows] = useState<PricingRow[]>([{ id: makeId(), title: 'Retail Tier', qty: '10', rate: '1745.45' }]);
  const [vendorRows, setVendorRows] = useState<VendorRow[]>([{ id: makeId(), supplier: 'Prime Vendor', stockType: 'Completed', supplierStyleNo: 'PV-RING-006' }]);
  const [relevantSelection, setRelevantSelection] = useState<string[]>([]);
  const [masterOptions, setMasterOptions] = useState(emptyMasterOptions);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [creatingMasterType, setCreatingMasterType] = useState<DesignMasterType | null>(null);
  const [tagPicker, setTagPicker] = useState('');
  const [packetOptions, setPacketOptions] = useState<PacketOption[]>([]);
  const [packetLoading, setPacketLoading] = useState(false);
  const [showPacketMasterModal, setShowPacketMasterModal] = useState(false);
  const [packetSaving, setPacketSaving] = useState(false);
  const [packetForm, setPacketForm] = useState<PacketForm>(defaultPacketForm);
  const [packetNameManuallyEdited, setPacketNameManuallyEdited] = useState(false);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [showInlineMasterModal, setShowInlineMasterModal] = useState(false);
  const [inlineMasterType, setInlineMasterType] = useState<DesignMasterType | null>(null);
  const [inlineMasterValue, setInlineMasterValue] = useState('');
  const [inlineMasterAliasName, setInlineMasterAliasName] = useState('');
  const [inlineMasterDescription, setInlineMasterDescription] = useState('');
  const [inlineFindingNo, setInlineFindingNo] = useState('');
  const [inlineMetalCaratage, setInlineMetalCaratage] = useState('');
  const [inlineMetalName, setInlineMetalName] = useState('');
  const [inlineMetalColor, setInlineMetalColor] = useState('');
  const [inlineMetalPurity, setInlineMetalPurity] = useState('');
  const [inlineDefaultWastagePercent, setInlineDefaultWastagePercent] = useState('');
  const [inlinePriceIn, setInlinePriceIn] = useState<'PIECES' | 'GRAM' | 'PAIR' | 'INCHES'>('PIECES');
  const [inlinePricePerUnit, setInlinePricePerUnit] = useState('');
  const [inlineDimensions, setInlineDimensions] = useState('');
  const [inlineWeightPerUnit, setInlineWeightPerUnit] = useState('');
  const inlineMasterCreatedHandlerRef = useRef<((masterValue: string) => void) | null>(null);
  const galleryUploadInputRef = useRef<HTMLInputElement | null>(null);
  const selectAllVisibleCheckboxRef = useRef<HTMLInputElement | null>(null);
  const designNoRequestSeqRef = useRef(0);

  const selected = useMemo(() => rows.find((item) => item.id === selectedId) ?? rows[0] ?? null, [rows, selectedId]);
  const selectedTags = useMemo(
    () =>
      form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    [form.tags],
  );
  const inlineMetalColorOptions = useMemo(
    () =>
      masterOptions.metalColors.filter(
        (option) =>
          !inlineMetalName ||
          normalizeLookupKey(option.metalName) === normalizeLookupKey(inlineMetalName),
      ),
    [inlineMetalName, masterOptions.metalColors],
  );
  const inlineMetalPurityOptions = useMemo(
    () =>
      masterOptions.metalPurities.filter(
        (option) =>
          !inlineMetalName ||
          normalizeLookupKey(option.metalName) === normalizeLookupKey(inlineMetalName),
      ),
    [inlineMetalName, masterOptions.metalPurities],
  );
  const inlineSelectedPurityOption = useMemo(
    () =>
      inlineMetalPurityOptions.find(
        (option) => normalizeLookupKey(option.value) === normalizeLookupKey(inlineMetalPurity),
      ),
    [inlineMetalPurity, inlineMetalPurityOptions],
  );
  const inlineSelectedPurityToken = useMemo(
    () =>
      inlineSelectedPurityOption
        ? getMetalPurityDisplay(inlineSelectedPurityOption)
        : inlineMetalPurity,
    [inlineMetalPurity, inlineSelectedPurityOption],
  );
  useEffect(() => {
    if (inlineMasterType !== 'METAL_CARATAGE') return;

    if (
      inlineMetalColor &&
      !inlineMetalColorOptions.some(
        (option) => normalizeLookupKey(option.value) === normalizeLookupKey(inlineMetalColor),
      )
    ) {
      setInlineMetalColor('');
    }

    if (
      inlineMetalPurity &&
      !inlineMetalPurityOptions.some(
        (option) => normalizeLookupKey(option.value) === normalizeLookupKey(inlineMetalPurity),
      )
    ) {
      setInlineMetalPurity('');
    }
  }, [
    inlineMasterType,
    inlineMetalColor,
    inlineMetalColorOptions,
    inlineMetalPurity,
    inlineMetalPurityOptions,
  ]);

  useEffect(() => {
    if (inlineMasterType !== 'METAL_CARATAGE') return;
    if (!inlineMetalPurity || !inlineMetalColor || !inlineMetalName) return;

    const purityToken = inlineSelectedPurityToken || inlineMetalPurity;
    const computedValue = `${purityToken}-${inlineMetalColor}-${inlineMetalName}`.trim();
    if (!computedValue) return;
    if (inlineMasterValue !== computedValue) {
      setInlineMasterValue(computedValue);
    }
    if (inlineMasterAliasName !== computedValue) {
      setInlineMasterAliasName(computedValue);
    }
  }, [
    inlineMasterAliasName,
    inlineMasterType,
    inlineMasterValue,
    inlineMetalColor,
    inlineMetalName,
    inlineMetalPurity,
    inlineSelectedPurityToken,
  ]);
  useEffect(() => {
    if (inlineMasterType !== 'METAL_CARATAGE') return;
    const selectedMetal = masterOptions.metalNames.find(
      (row) => normalizeLookupKey(row.value) === normalizeLookupKey(inlineMetalName),
    );
    const basePricePerGm = parseNumericValue(selectedMetal?.marketPricePerGm);
    const purityPercent = parseNumericValue(inlineSelectedPurityOption?.purityPercentage);
    if (basePricePerGm <= 0 || purityPercent <= 0) return;
    const computed = ((basePricePerGm * purityPercent) / 100).toFixed(2);
    if (computed !== inlinePricePerUnit) {
      setInlinePricePerUnit(computed);
    }
  }, [
    inlineMasterType,
    inlineMetalName,
    inlinePricePerUnit,
    inlineSelectedPurityOption,
    masterOptions.metalNames,
  ]);

  useEffect(() => {
    if (!showPacketMasterModal || packetNameManuallyEdited) {
      return;
    }
    const computedPacketName = buildPacketNameFromForm(packetForm);
    if (computedPacketName && computedPacketName !== packetForm.packetName) {
      setPacketForm((prev) => ({ ...prev, packetName: computedPacketName }));
    }
  }, [
    packetForm,
    packetNameManuallyEdited,
    showPacketMasterModal,
  ]);
  const galleryLibraryUrls = useMemo(() => {
    const seen = new Set<string>();
    const urls: string[] = [];

    rows.forEach((row) => {
      (row.imageUrls || []).forEach((url) => {
        if (!url || seen.has(url)) return;
        seen.add(url);
        urls.push(url);
      });
    });

    return urls;
  }, [rows]);

  const getMetalRate = (metalCaratage: string): number | undefined => {
    const masterOption = getMetalMasterOption(metalCaratage);
    const masterRate = parseNumericValue(masterOption?.livePricePerGm);
    if (masterRate > 0) {
      return masterRate;
    }
    return undefined;
  };

  const getMetalMasterOption = (metalCaratage: string): MasterOption | undefined => {
    const lookup = normalizeLookupKey(metalCaratage);
    if (!lookup) return undefined;
    return (
      masterOptions.metalCaratages.find(
        (option) => normalizeLookupKey(option.value) === lookup,
      ) ||
      masterOptions.goldColours.find(
        (option) => normalizeLookupKey(option.value) === lookup,
      )
    );
  };

  const getMetalDefaultWastage = (metalCaratage: string): string => {
    const option = getMetalMasterOption(metalCaratage);
    const wastagePercent =
      option?.defaultWastagePercent !== undefined && option?.defaultWastagePercent !== null
        ? option.defaultWastagePercent
        : option?.wastagePercent;
    if (wastagePercent === undefined || wastagePercent === null) {
      return '';
    }
    return String(wastagePercent);
  };

  const createMetalRow = (metalCaratage: string): MetalRow => {
    const rate = getMetalRate(metalCaratage);
    return {
      id: makeId(),
      goldColour: metalCaratage,
      netWt: '',
      wastagePercent: getMetalDefaultWastage(metalCaratage),
      wastageWt: '',
      totalWt: '',
      pricePerGm: rate !== undefined ? rate.toFixed(2) : '',
      value: '',
    };
  };

  const suggestNextDesignNo = (jewelryGroup: string): string =>
    getNextDesignNo(jewelryGroup, rows);

  const syncDesignNoFromServer = (jewelryGroup: string) => {
    const group = jewelryGroup.trim();
    if (!group || isDesignNoManual) return;

    const requestSeq = ++designNoRequestSeqRef.current;
    void (async () => {
      try {
        const response = await api.get('/products/next-design-no', {
          params: { jewelryGroup: group },
        });
        const suggestedDesignNo = String(response.data?.designNo || '').trim();
        if (!suggestedDesignNo) return;

        setForm((prev) => {
          if (designNoRequestSeqRef.current !== requestSeq) return prev;
          if (prev.jewelryGroup !== group) return prev;
          return { ...prev, designNo: suggestedDesignNo };
        });
      } catch {
        // Keep local fallback numbering if server suggestion fails.
      }
    })();
  };

  const handleJewelryGroupChange = (jewelryGroup: string) => {
    setForm((prev) => ({
      ...prev,
      jewelryGroup,
      designNo: isDesignNoManual ? prev.designNo : suggestNextDesignNo(jewelryGroup),
    }));

    if (!isDesignNoManual) {
      syncDesignNoFromServer(jewelryGroup);
    }
  };

  const addGalleryUrls = (urls: string[]) => {
    setGalleryUrls((prev) => {
      const next = [...prev];
      const seen = new Set(next);
      urls.forEach((url) => {
        if (!url || seen.has(url)) return;
        seen.add(url);
        next.push(url);
      });
      return next;
    });
  };

  const removeGalleryUrl = (url: string) => {
    setGalleryUrls((prev) => prev.filter((item) => item !== url));
  };

  const setPrimaryGalleryUrl = (url: string) => {
    setGalleryUrls((prev) => {
      if (!prev.includes(url)) return prev;
      return [url, ...prev.filter((item) => item !== url)];
    });
  };

  const moveGalleryUrl = (index: number, step: -1 | 1) => {
    setGalleryUrls((prev) => {
      const target = index + step;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleGalleryUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      window.alert('Please select image files only.');
      return;
    }

    const formData = new FormData();
    imageFiles.forEach((file) => formData.append('files', file));

    setGalleryUploading(true);
    try {
      const response = await api.post('/products/gallery-files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const urls = (response.data?.files || [])
        .map((file: { url?: string }) => file?.url || '')
        .filter((url: string) => Boolean(url));

      if (urls.length === 0) {
        window.alert('No images were uploaded.');
      } else {
        addGalleryUrls(urls);
      }

      if (imageFiles.length !== files.length) {
        window.alert('Only image files were uploaded. Non-image files were skipped.');
      }
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to upload images.');
    } finally {
      setGalleryUploading(false);
    }
  };

  const fetchDesignRows = async (preferredSelectedId?: string) => {
    setRowsLoading(true);
    setRowsError(null);
    try {
      const response = await api.get('/products', {
        params: {
          page: 1,
          limit: 200,
          status: 'ALL',
        },
      });
      const mappedRows = ((response.data?.data || []) as ApiDesignRow[]).map(mapApiDesignToRow);
      setRows(mappedRows);
      setSelectedId((current) => {
        if (preferredSelectedId && mappedRows.some((row) => row.id === preferredSelectedId)) {
          return preferredSelectedId;
        }
        if (current && mappedRows.some((row) => row.id === current)) {
          return current;
        }
        return mappedRows[0]?.id || '';
      });
    } catch (error: any) {
      setRowsError(error?.response?.data?.message || 'Unable to load designs from server.');
      setRows([]);
      setSelectedId('');
    } finally {
      setRowsLoading(false);
    }
  };

  const fetchMasterOptions = async () => {
    setMastersLoading(true);
    try {
      const response = await api.get('/products/masters');
      setMasterOptions({
        jewelryGroups: response.data?.jewelryGroups || [],
        collections: response.data?.collections || [],
        jewelrySizes: response.data?.jewelrySizes || [],
        tags: response.data?.tags || [],
        designStatuses: response.data?.designStatuses || [],
        stages: response.data?.stages || [],
        metalNames: response.data?.metalNames || [],
        metalColors: response.data?.metalColors || [],
        metalPurities: response.data?.metalPurities || [],
        metalCaratages: response.data?.metalCaratages || [],
        goldColours: response.data?.goldColours || [],
        diamondTypes: response.data?.diamondTypes || [],
        diamondSpreads: response.data?.diamondSpreads || [],
        laborHeads: response.data?.laborHeads || [],
        findingHeads: response.data?.findingHeads || [],
        packetStones: response.data?.packetStones || [],
        packetShapes: response.data?.packetShapes || [],
        packetSizes: response.data?.packetSizes || [],
        packetCuts: response.data?.packetCuts || [],
        packetColors: response.data?.packetColors || [],
        packetQualities: response.data?.packetQualities || [],
      });
    } catch {
      setMasterOptions(emptyMasterOptions);
    } finally {
      setMastersLoading(false);
    }
  };

  const fetchPacketOptions = async () => {
    setPacketLoading(true);
    try {
      const response = await api.get('/products/packets', {
        params: {
          status: 'ACTIVE',
          limit: 200,
        },
      });
      setPacketOptions(response.data?.data || []);
    } catch {
      setPacketOptions([]);
    } finally {
      setPacketLoading(false);
    }
  };

  const applyPacketToGemRow = (rowId: string, packetId: string) => {
    const packet = packetOptions.find((entry) => entry.id === packetId);
    setGemRows((prev) => {
      if (packet) {
        const packetWeight = Number(packet.weight || 0);
        if (!Number.isFinite(packetWeight) || packetWeight <= 0) {
          window.alert('Selected stone packet weight must be greater than 0.');
          return prev;
        }

        const packetAlreadyUsed = prev.some((row) => row.id !== rowId && row.packetId === packet.id);
        if (packetAlreadyUsed) {
          window.alert('This packet is already used in another line.');
          return prev;
        }

        const stoneKey = normalizeLookupKey(packet.stone);
        const stoneAlreadyUsed =
          stoneKey.length > 0 &&
          prev.some((row) => row.id !== rowId && normalizeLookupKey(row.stone) === stoneKey);
        if (stoneAlreadyUsed) {
          window.alert('This stone is already used in another line.');
          return prev;
        }
      }

      return prev.map((row) => {
        if (row.id !== rowId) return row;

        if (!packet) {
          return {
            ...row,
            packetId: '',
            stone: '',
            shape: '',
            size: '',
            cut: '',
            color: '',
            quality: '',
            settingType: '',
            wtPerPcs: '',
            pcs: '',
            wtInCts: '',
            amount: '',
          };
        }

        const pieces = Math.max(0, Number(packet.pieces || 0));
        const explicitWeightPerPc = Math.max(0, Number(packet.weightPerPc || 0));
        const totalWeight = Math.max(0, Number(packet.weight || 0));
        const wtPerPcs = explicitWeightPerPc > 0 ? explicitWeightPerPc : pieces > 0 ? totalWeight / pieces : 0;
        const wtInCts = wtPerPcs * pieces;

        return {
          ...row,
          packetId: packet.id,
          stone: packet.stone || '',
          shape: packet.shape || '',
          size: packet.size || '',
          cut: packet.cut || '',
          color: packet.color || '',
          quality: packet.quality || '',
          settingType: '',
          wtPerPcs: wtPerPcs > 0 ? wtPerPcs.toFixed(3) : '',
          pcs: pieces > 0 ? String(pieces) : '',
          wtInCts: wtInCts > 0 ? wtInCts.toFixed(3) : '',
          amount: '',
        };
      });
    });
  };

  const syncTags = (tags: string[]) => {
    const deduped = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
    setForm((prev) => ({ ...prev, tags: deduped.join(', ') }));
  };

  const addTag = (tag: string) => {
    syncTags([...selectedTags, tag]);
  };

  const removeTag = (tag: string) => {
    syncTags(selectedTags.filter((item) => item !== tag));
  };

  const closeInlineMasterModal = () => {
    setShowInlineMasterModal(false);
    setInlineMasterType(null);
    setInlineMasterValue('');
    setInlineMasterAliasName('');
    setInlineMasterDescription('');
    setInlineFindingNo('');
    setInlineMetalCaratage('');
    setInlineMetalName('');
    setInlineMetalColor('');
    setInlineMetalPurity('');
    setInlineDefaultWastagePercent('');
    setInlinePriceIn('PIECES');
    setInlinePricePerUnit('');
    setInlineDimensions('');
    setInlineWeightPerUnit('');
    inlineMasterCreatedHandlerRef.current = null;
  };

  const applyCreatedMasterSelection = (masterType: DesignMasterType, masterValue: string) => {
    if (masterType === 'JEWELRY_GROUP') {
      handleJewelryGroupChange(masterValue);
    } else if (masterType === 'COLLECTION') {
      setForm((prev) => ({ ...prev, collection: masterValue }));
    } else if (masterType === 'JEWELRY_SIZE') {
      setForm((prev) => ({ ...prev, jewelrySize: masterValue }));
    } else if (masterType === 'STAGE') {
      setForm((prev) => ({ ...prev, stage: masterValue }));
    } else if (masterType === 'GOLD_COLOUR' || masterType === 'METAL_CARATAGE') {
      setMetalRows((prev) =>
        prev.length === 0
          ? [createMetalRow(masterValue)]
          : prev.map((row, index) =>
              index === 0
                ? {
                    ...row,
                    goldColour: masterValue,
                    wastagePercent: getMetalDefaultWastage(masterValue),
                    pricePerGm:
                      getMetalRate(masterValue) !== undefined
                        ? getMetalRate(masterValue)!.toFixed(2)
                        : '',
                  }
                : row,
            ),
      );
    } else if (masterType === 'DIAMOND_TYPE') {
      setForm((prev) => ({ ...prev, diamondType: masterValue }));
    } else if (masterType === 'DIAMOND_SPREAD') {
      setForm((prev) => ({ ...prev, diamondSpread: masterValue }));
    } else if (masterType === 'LABOR_HEAD') {
      setLaborRows((prev) =>
        prev.length === 0
          ? [{ id: makeId(), laborHead: masterValue, laborPerUnit: '', unitQty: '', laborValue: '' }]
          : prev.map((row, index) => (index === 0 ? { ...row, laborHead: masterValue } : row)),
      );
    } else if (masterType === 'FINDING_HEAD') {
      setFindingRows((prev) =>
        prev.length === 0
          ? [{ id: makeId(), findingHead: masterValue, pricePerUnit: '', units: '', totalWeight: '', findingValue: '' }]
          : prev.map((row, index) => (index === 0 ? { ...row, findingHead: masterValue } : row)),
      );
    } else if (masterType === 'DESIGN_STATUS') {
      setForm((prev) => ({ ...prev, designStatus: masterValue }));
    } else if (masterType === 'PACKET_STONE') {
      setPacketForm((prev) => ({ ...prev, stone: masterValue }));
    } else if (masterType === 'PACKET_SHAPE') {
      setPacketForm((prev) => ({ ...prev, shape: masterValue }));
    } else if (masterType === 'PACKET_SIZE') {
      setPacketForm((prev) => ({ ...prev, size: masterValue }));
    } else if (masterType === 'PACKET_CUT') {
      setPacketForm((prev) => ({ ...prev, cut: masterValue }));
    } else if (masterType === 'PACKET_COLOR') {
      setPacketForm((prev) => ({ ...prev, color: masterValue }));
    } else if (masterType === 'PACKET_QUALITY') {
      setPacketForm((prev) => ({ ...prev, quality: masterValue }));
    } else {
      addTag(masterValue);
    }
  };

  const addMasterFromDesign = (
    masterType: DesignMasterType,
    onCreated?: (masterValue: string) => void,
  ) => {
    setInlineMasterType(masterType);
    setInlineMasterValue('');
    setInlineMasterAliasName('');
    setInlineMasterDescription('');
    setInlineFindingNo('');
    setInlineMetalCaratage('');
    setInlineMetalName('');
    setInlineMetalColor('');
    setInlineMetalPurity('');
    setInlineDefaultWastagePercent('');
    setInlinePriceIn('PIECES');
    setInlinePricePerUnit('');
    setInlineDimensions('');
    setInlineWeightPerUnit('');
    inlineMasterCreatedHandlerRef.current = onCreated || null;
    setShowInlineMasterModal(true);
  };

  const saveInlineMasterFromDesign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inlineMasterType) return;

    let value = inlineMasterValue.trim();
    let aliasName = inlineMasterAliasName.trim();

    if (
      inlineMasterType === 'METAL_CARATAGE' &&
      inlineMetalName &&
      inlineMetalPurity &&
      inlineMetalColor
    ) {
      const purityToken = inlineSelectedPurityToken || inlineMetalPurity;
      const computed = `${purityToken}-${inlineMetalColor}-${inlineMetalName}`.trim();
      if (computed) {
        value = computed;
        aliasName = computed;
      }
    }

    if (inlineMasterType !== 'METAL_CARATAGE' && (!value || !aliasName)) {
      window.alert('Master name and alias name are required.');
      return;
    }

    const findingPayload =
      inlineMasterType === 'FINDING_HEAD'
        ? {
            findingNo: inlineFindingNo.trim(),
            metalCaratage: inlineMetalCaratage.trim(),
            priceIn: inlinePriceIn,
            pricePerUnit: parseNum(inlinePricePerUnit),
            dimensions: inlineDimensions.trim() || null,
            weightPerUnit: parseNum(inlineWeightPerUnit),
          }
        : null;
    const defaultWastagePayload =
      inlineMasterType === 'GOLD_COLOUR'
        ? {
            pricePerUnit:
              inlinePricePerUnit.trim().length > 0 ? parseNum(inlinePricePerUnit) : null,
          }
        : null;
    const metalCaratagePayload =
      inlineMasterType === 'METAL_CARATAGE'
        ? {
            metalName: inlineMetalName.trim(),
            metalColor: inlineMetalColor.trim(),
            metalPurity: inlineMetalPurity.trim(),
            purityPercentage:
              inlineSelectedPurityOption?.purityPercentage !== undefined &&
              inlineSelectedPurityOption?.purityPercentage !== null
                ? parseNumericValue(inlineSelectedPurityOption.purityPercentage)
                : null,
            livePricePerGm:
              inlinePricePerUnit.trim().length > 0 ? parseNum(inlinePricePerUnit) : null,
            defaultWastagePercent:
              inlineDefaultWastagePercent.trim().length > 0
                ? parseNum(inlineDefaultWastagePercent)
                : null,
          }
        : null;
    const descriptionPayload = inlineMasterType === 'FINDING_HEAD' ? null : inlineMasterDescription.trim() || null;

    if (inlineMasterType === 'FINDING_HEAD') {
      if (!findingPayload?.findingNo || !findingPayload?.metalCaratage) {
        window.alert('Finding No and Metal Caratage are required.');
        return;
      }
      if (inlinePricePerUnit.trim().length === 0 || inlineWeightPerUnit.trim().length === 0) {
        window.alert('Price/Unit and Weight/Unit are required.');
        return;
      }
    }
    if (inlineMasterType === 'METAL_CARATAGE') {
      if (
        !metalCaratagePayload?.metalName ||
        !metalCaratagePayload?.metalColor ||
        !metalCaratagePayload?.metalPurity
      ) {
        window.alert('Metal Name, Metal Color, and Metal Purity are required.');
        return;
      }
    }

    setCreatingMasterType(inlineMasterType);
    try {
      const response = await api.post('/products/masters', {
        masterType: inlineMasterType,
        value,
        aliasName,
        description: descriptionPayload,
        ...(findingPayload || {}),
        ...(defaultWastagePayload || {}),
        ...(metalCaratagePayload || {}),
      });

      const masterValue = response.data?.value || value;
      await fetchMasterOptions();

      if (inlineMasterCreatedHandlerRef.current) {
        inlineMasterCreatedHandlerRef.current(masterValue);
      } else {
        applyCreatedMasterSelection(inlineMasterType, masterValue);
      }

      closeInlineMasterModal();
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to create master value.');
    } finally {
      setCreatingMasterType(null);
    }
  };

  const updatePacketFormField = (key: keyof PacketForm, value: string) => {
    setPacketForm((prev) => {
      const next = { ...prev, [key]: value } as PacketForm;
      if (
        !packetNameManuallyEdited &&
        key !== 'packetName' &&
        key !== 'priceIn' &&
        key !== 'weightIn' &&
        key !== 'sellingPrice' &&
        key !== 'weightPerPc'
      ) {
        const computedPacketName = buildPacketNameFromForm(next);
        if (computedPacketName) {
          next.packetName = computedPacketName;
        }
      }
      return next;
    });
    if (key === 'packetName') {
      setPacketNameManuallyEdited(true);
    }
  };

  const regeneratePacketName = () => {
    const computedPacketName = buildPacketNameFromForm(packetForm);
    setPacketForm((prev) => ({ ...prev, packetName: computedPacketName }));
    setPacketNameManuallyEdited(false);
  };

  const savePacketMaster = async () => {
    const payload = {
      packetName: packetForm.packetName.trim(),
      stone: packetForm.stone.trim(),
      shape: packetForm.shape.trim(),
      size: packetForm.size.trim(),
      cut: packetForm.cut.trim(),
      color: packetForm.color.trim(),
      quality: packetForm.quality.trim(),
      priceIn: packetForm.priceIn,
      sellingPrice: parseNum(packetForm.sellingPrice),
      weightPerPc: parseNum(packetForm.weightPerPc),
      pieces: 1,
      weight: parseNum(packetForm.weightPerPc),
      weightUnit: packetForm.weightIn === 'GRAM' ? 'GMS' : 'CTS',
    };

    if (!payload.packetName || !payload.stone || !payload.shape || !payload.size || !payload.cut || !payload.color || !payload.quality) {
      window.alert('Packet Name, Stone, Shape, Size, Cut, Color and Quality are required.');
      return;
    }
    if (payload.sellingPrice < 0) {
      window.alert('Selling price cannot be negative.');
      return;
    }
    if (payload.weightPerPc <= 0) {
      window.alert('Weight/Pc must be greater than 0.');
      return;
    }

    setPacketSaving(true);
    try {
      const response = await api.post('/products/packets', payload);
      await fetchPacketOptions();
      setShowPacketMasterModal(false);
      setPacketForm(defaultPacketForm);
      setPacketNameManuallyEdited(false);

      const createdId = response.data?.id;
      if (createdId && gemRows[0]) {
        applyPacketToGemRow(gemRows[0].id, createdId);
      }
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to save packet.');
    } finally {
      setPacketSaving(false);
    }
  };

  useEffect(() => {
    fetchDesignRows();
    fetchMasterOptions();
    fetchPacketOptions();
  }, []);

  useEffect(() => {
    setSelectedDesignIds((prev) => {
      const validIds = new Set(rows.map((row) => row.id));
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [rows]);

  useEffect(() => {
    if (!showAddModal || Boolean(editingId) || isDesignNoManual) return;

    setForm((prev) => {
      if (!prev.jewelryGroup) return prev;
      const nextDesignNo = suggestNextDesignNo(prev.jewelryGroup);
      if (!nextDesignNo || prev.designNo === nextDesignNo) {
        return prev;
      }
      return { ...prev, designNo: nextDesignNo };
    });
  }, [editingId, isDesignNoManual, rows, showAddModal]);

  useEffect(() => {
    setMetalRows((prev) =>
      prev.map((row) => {
        if (!row.goldColour) return row;
        const rate = getMetalRate(row.goldColour);
        const defaultWastage = getMetalDefaultWastage(row.goldColour);
        const nextPricePerGm = row.pricePerGm.trim().length > 0 ? row.pricePerGm : rate !== undefined ? rate.toFixed(2) : '';
        const nextWastagePercent =
          row.wastagePercent.trim().length > 0 ? row.wastagePercent : defaultWastage;

        if (nextPricePerGm === row.pricePerGm && nextWastagePercent === row.wastagePercent) {
          return row;
        }
        return { ...row, pricePerGm: nextPricePerGm, wastagePercent: nextWastagePercent };
      }),
    );
  }, [masterOptions.metalCaratages, masterOptions.goldColours]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((item) => {
      const hay = [item.designNo, item.version, item.jewelryGroup, item.jewelrySize, item.diamondType, item.diamondSpread, item.goldColour, item.collection, item.stoneInfo, item.tags.join(' '), item.stage, item.status].join(' ').toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (filters.jewelryGroup && item.jewelryGroup !== filters.jewelryGroup) return false;
      if (filters.collection && item.collection !== filters.collection) return false;
      if (filters.jewelrySize && item.jewelrySize !== filters.jewelrySize) return false;
      if (filters.tags && !item.tags.join(' ').toLowerCase().includes(filters.tags.toLowerCase())) return false;
      if (filters.stone && !item.stoneInfo.toLowerCase().includes(filters.stone.toLowerCase())) return false;
      if (filters.shape && !item.remarks.toLowerCase().includes(filters.shape.toLowerCase())) return false;
      if (filters.stage && item.stage !== filters.stage) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.goldColour && !item.goldColour.toLowerCase().includes(filters.goldColour.toLowerCase())) return false;
      return true;
    });
  }, [filters, rows, search]);

  const visibleRowIds = useMemo(() => filteredRows.map((row) => row.id), [filteredRows]);
  const selectedVisibleCount = useMemo(
    () => visibleRowIds.filter((id) => selectedDesignIds.includes(id)).length,
    [selectedDesignIds, visibleRowIds],
  );
  const allVisibleSelected = visibleRowIds.length > 0 && selectedVisibleCount === visibleRowIds.length;

  useEffect(() => {
    if (!selectAllVisibleCheckboxRef.current) return;
    selectAllVisibleCheckboxRef.current.indeterminate =
      selectedVisibleCount > 0 && selectedVisibleCount < visibleRowIds.length;
  }, [selectedVisibleCount, visibleRowIds.length]);

  const toggleDesignSelection = (designId: string) => {
    setSelectedDesignIds((prev) =>
      prev.includes(designId) ? prev.filter((id) => id !== designId) : [...prev, designId],
    );
  };

  const toggleSelectAllVisible = () => {
    setSelectedDesignIds((prev) => {
      if (!visibleRowIds.length) return prev;

      const isAllVisibleSelected = visibleRowIds.every((id) => prev.includes(id));
      if (isAllVisibleSelected) {
        return prev.filter((id) => !visibleRowIds.includes(id));
      }

      const next = new Set(prev);
      visibleRowIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const getMetalWastageWt = (row: MetalRow): number =>
    (Math.max(0, parseNum(row.netWt)) * Math.max(0, parseNum(row.wastagePercent))) / 100;

  const getMetalTotalWt = (row: MetalRow): number =>
    Math.max(0, parseNum(row.netWt)) + getMetalWastageWt(row);

  const getMetalValue = (row: MetalRow): number =>
    row.value.trim().length > 0
      ? Math.max(0, parseNum(row.value))
      : getMetalTotalWt(row) * Math.max(0, parseNum(row.pricePerGm));
  const getGemWeight = (row: GemRow): number =>
    Math.max(0, parseNum(row.wtPerPcs)) * Math.max(0, parseNum(row.pcs));
  const getGemValue = (row: GemRow): number =>
    row.amount.trim().length > 0
      ? Math.max(0, parseNum(row.amount))
      : getGemWeight(row) * Math.max(0, parseNum(row.pricePerCt));
  const getLaborValue = (row: LaborRow): number =>
    parseNum(row.unitQty) * parseNum(row.laborPerUnit);
  const getFindingValue = (row: FindingRow): number => {
    const manual = parseNum(row.findingValue);
    if (manual > 0) return manual;
    return parseNum(row.units) * parseNum(row.pricePerUnit);
  };

  const costTotals = useMemo(() => {
    const metal = metalRows.reduce((sum, row) => sum + getMetalValue(row), 0);
    const gem = gemRows.reduce((sum, row) => sum + getGemValue(row), 0);
    const labor = laborRows.reduce((sum, row) => sum + getLaborValue(row), 0);
    const finding = findingRows.reduce((sum, row) => sum + getFindingValue(row), 0);
    const grossWeight = metalRows.reduce((sum, row) => sum + getMetalTotalWt(row), 0);
    return { metal, gem, labor, finding, grossWeight, total: metal + gem + labor + finding };
  }, [findingRows, gemRows, laborRows, metalRows]);

  const openAdd = () => {
    if (!canCreateDesign) {
      window.alert('You do not have permission to add designs.');
      return;
    }
    setEditingId(null);
    setIsDesignNoManual(false);
    designNoRequestSeqRef.current += 1;
    const initialJewelryGroup = masterOptions.jewelryGroups[0]?.value || defaultForm.jewelryGroup;
    const autoDesignNo = suggestNextDesignNo(initialJewelryGroup);
    setForm({
      ...defaultForm,
      designNo: autoDesignNo,
      jewelryGroup: initialJewelryGroup,
      stage: masterOptions.stages[0]?.value || defaultForm.stage,
      diamondType: masterOptions.diamondTypes[0]?.value || defaultForm.diamondType,
      diamondSpread: masterOptions.diamondSpreads[0]?.value || defaultForm.diamondSpread,
      designStatus: masterOptions.designStatuses[0]?.value || defaultForm.designStatus,
    });
    syncDesignNoFromServer(initialJewelryGroup);
    setTagPicker('');
    setGalleryUrls([]);
    setShowGalleryPicker(false);
    setMetalRows([createMetalRow('')]);
    setGemRows([{
      id: makeId(),
      packetId: '',
      stone: '',
      shape: '',
      size: '',
      cut: '',
      color: '',
      quality: '',
      settingType: '',
      wtPerPcs: '',
      pcs: '',
      wtInCts: '',
      pricePerCt: '',
      amount: '',
    }]);
    setLaborRows([{
      id: makeId(),
      laborHead: 'Setting',
      laborPerUnit: 'Price Per Quantity',
      unitQty: '',
      laborValue: '',
    }]);
    setFindingRows([]);
    setShowAddModal(true);
  };

  const openEdit = async (row: DesignRow) => {
    if (!canModifyExistingDesigns) {
      setSelectedId(row.id);
      setModal('info');
      return;
    }

    setEditingId(row.id);
    setIsDesignNoManual(true);
    designNoRequestSeqRef.current += 1;
    setSelectedId(row.id);

    const asInput = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      return String(value);
    };
    const normalized = (value: unknown): string => String(value ?? '').trim().toLowerCase();
    const resolvePacketForGem = (gem: any): string => {
      const direct = typeof gem?.packetId === 'string' ? gem.packetId.trim() : '';
      if (direct) return direct;

      const match = packetOptions.find((packet) =>
        normalized(packet.stone) === normalized(gem?.stone) &&
        normalized(packet.shape) === normalized(gem?.shape) &&
        normalized(packet.size) === normalized(gem?.size) &&
        normalized(packet.cut) === normalized(gem?.cut) &&
        normalized(packet.color) === normalized(gem?.color) &&
        normalized(packet.quality) === normalized(gem?.quality),
      );
      return match?.id || '';
    };

    try {
      const canLoadDetails = /^[0-9a-fA-F-]{36}$/.test(row.id);
      const detail = canLoadDetails ? (await api.get(`/products/${row.id}`)).data : null;

      if (!detail) {
        throw new Error('Design details not available');
      }

      const tags = normalizeStringArray(detail.tags);
      const imageUrls = normalizeStringArray(detail.imageUrls).map(resolvePublicAssetUrl);
      const metals = Array.isArray(detail.metals) ? detail.metals : [];
      const gemstones = Array.isArray(detail.gemstones) ? detail.gemstones : [];
      const labors = Array.isArray(detail.labors) ? detail.labors : [];
      const findings = Array.isArray(detail.findings) ? detail.findings : [];
      const processStages = Array.isArray(detail.processStages) ? detail.processStages : [];
      const pricingTiers = Array.isArray(detail.pricingTiers) ? detail.pricingTiers : [];
      const vendors = Array.isArray(detail.vendors) ? detail.vendors : [];

      setForm({
        designNo: detail.designNo || row.designNo,
        jewelryGroup: detail.jewelryGroup || row.jewelryGroup,
        collection: detail.collection || row.collection,
        stage: detail.stage || row.stage || '',
        diamondType: detail.diamondType || '',
        diamondSpread: detail.diamondSpread || '',
        jewelrySize: detail.jewelrySize || row.jewelrySize || '',
        otherWeight: '',
        tags: tags.join(', '),
        designStatus: detail.designStatus || row.status || '',
        drawerLocation: detail.drawerLocation || '',
        designDescription: detail.designDescription || '',
        remarks: detail.remarks || row.remarks || '',
      });

      setMetalRows(
        metals.length > 0
          ? metals.map((item: any) => {
              const metalCaratage = item.metalCaratage || item.goldColour || '';
              const masterRate = getMetalRate(metalCaratage);
              return {
                id: item.id || makeId(),
                goldColour: metalCaratage,
                netWt: asInput(item.netWt),
                wastagePercent: asInput(item.wastagePercent),
                wastageWt: asInput(item.wastageWt),
                totalWt: asInput(item.totalWt),
                pricePerGm:
                  masterRate !== undefined ? masterRate.toFixed(2) : asInput(item.pricePerGm),
                value: asInput(item.value),
              };
            })
          : [createMetalRow(row.goldColour || '')],
      );

      setGemRows(
        gemstones.length > 0
          ? gemstones.map((item: any) => ({
              id: item.id || makeId(),
              packetId: resolvePacketForGem(item),
              stone: item.stone || '',
              shape: item.shape || '',
              size: item.size || '',
              cut: item.cut || '',
              color: item.color || '',
              quality: item.quality || '',
              settingType: item.stoneType || '',
              wtPerPcs: asInput(item.wtPerPcs),
              pcs: asInput(item.pcs),
              wtInCts: asInput(item.wtInCts),
              pricePerCt: asInput(item.pricePerCt),
              amount: asInput(item.amount),
            }))
          : [{
              id: makeId(),
              packetId: '',
              stone: '',
              shape: '',
              size: '',
              cut: '',
              color: '',
              quality: '',
              settingType: '',
              wtPerPcs: '',
              pcs: '',
              wtInCts: '',
              pricePerCt: '',
              amount: '',
            }],
      );

      setLaborRows(
        labors.length > 0
          ? labors.map((item: any) => ({
              id: item.id || makeId(),
              laborHead: item.laborHead || '',
              laborPerUnit: asInput(item.laborPerUnit),
              unitQty: asInput(item.unitQty),
              laborValue: asInput(item.laborValue),
            }))
          : [{
              id: makeId(),
              laborHead: 'Setting',
              laborPerUnit: '',
              unitQty: '',
              laborValue: '',
            }],
      );

      setFindingRows(
        FINDING_FEATURE_ENABLED
          ? findings.map((item: any) => ({
              id: item.id || makeId(),
              findingHead: item.findingHead || '',
              pricePerUnit: asInput(item.pricePerUnit),
              units: asInput(item.units),
              totalWeight: asInput(item.totalWeight),
              findingValue: asInput(item.findingValue),
            }))
          : [],
      );

      setProcessRows(
        processStages.length > 0
          ? processStages.map((item: any) => ({
              id: item.id || makeId(),
              stage: item.processStage || '',
              netWeight: asInput(item.netWeight),
              duration: asInput(item.duration),
              remarks: item.remarks || '',
            }))
          : [],
      );

      setPricingRows(
        pricingTiers.length > 0
          ? pricingTiers.map((item: any) => ({
              id: item.id || makeId(),
              title: item.name || '',
              qty: asInput(item.value),
              rate: asInput(item.sellingPrice ?? item.value),
            }))
          : [],
      );

      setVendorRows(
        vendors.length > 0
          ? vendors.map((item: any) => ({
              id: item.id || makeId(),
              supplier: item.supplierName || '',
              stockType: item.stockType || '',
              supplierStyleNo: item.supplierStyleNo || '',
            }))
          : [],
      );

      setTagPicker('');
      setGalleryUrls(imageUrls);
      setShowGalleryPicker(false);
      setShowAddModal(true);
    } catch {
      setForm({
        designNo: row.designNo,
        jewelryGroup: row.jewelryGroup,
        collection: row.collection,
        stage: row.stage,
        diamondType: row.diamondType || '',
        diamondSpread: row.diamondSpread || '',
        jewelrySize: row.jewelrySize,
        otherWeight: '',
        tags: row.tags.join(', '),
        designStatus: row.status,
        drawerLocation: '',
        designDescription: '',
        remarks: row.remarks,
      });
      setMetalRows([createMetalRow(row.goldColour)]);
      setGemRows([{
        id: makeId(),
        packetId: '',
        stone: row.stoneInfo,
        shape: '',
        size: '',
        cut: '',
        color: '',
        quality: '',
        settingType: '',
        wtPerPcs: '',
        pcs: '',
        wtInCts: '',
        pricePerCt: '',
        amount: '',
      }]);
      setTagPicker('');
      setGalleryUrls(row.imageUrls || []);
      setShowGalleryPicker(false);
      setShowAddModal(true);
    }
  };

  const saveDesign = async () => {
    if (editingId) {
      if (!canModifyExistingDesigns) {
        window.alert('You have read-only access for existing designs.');
        return;
      }
    } else if (!canCreateDesign) {
      window.alert('You do not have permission to add designs.');
      return;
    }

    if (savingDesign) return;
    if (!form.jewelryGroup.trim()) {
      window.alert('Jewelry Group is required.');
      return;
    }

    const resolvedDesignNo =
      form.designNo.trim() || (!editingId ? suggestNextDesignNo(form.jewelryGroup) : '');
    const shouldSendDesignNo = Boolean(editingId) || isDesignNoManual;
    if (shouldSendDesignNo && !resolvedDesignNo) {
      window.alert('Design No is required.');
      return;
    }

    const usedMetalKeys = new Set<string>();
    for (const row of metalRows) {
      if (!row.goldColour.trim()) {
        window.alert('Metal Caratage is required for all Metal rows.');
        return;
      }
      if (!row.netWt.trim()) {
        window.alert('Net Weight is required for all Metal rows.');
        return;
      }

      const netWt = parseNum(row.netWt);
      const wastagePercent = parseNum(row.wastagePercent);
      const pricePerGm = parseNum(row.pricePerGm);
      const value = parseNum(row.value);
      if (netWt <= 0) {
        window.alert('Net Weight must be greater than 0 for all Metal rows.');
        return;
      }
      if (wastagePercent < 0) {
        window.alert('Wastage % cannot be negative for Metal rows.');
        return;
      }
      if (pricePerGm < 0) {
        window.alert('Per Gram Weight/Price cannot be negative for Metal rows.');
        return;
      }
      if (value < 0) {
        window.alert('Metal Value cannot be negative for Metal rows.');
        return;
      }

      const key = normalizeLookupKey(row.goldColour);
      if (!key) continue;
      if (usedMetalKeys.has(key)) {
        window.alert('Each Metal Caratage can be used only once.');
        return;
      }
      usedMetalKeys.add(key);
    }

    const usedStoneKeys = new Set<string>();
    for (let index = 0; index < gemRows.length; index += 1) {
      const row = gemRows[index];
      const wtPerPcs = parseNum(row.wtPerPcs);
      const pcs = parseNum(row.pcs);
      const pricePerCt = parseNum(row.pricePerCt);
      const amount = parseNum(row.amount);

      if (wtPerPcs < 0) {
        window.alert(`Wt per Pcs cannot be negative in Stone row ${index + 1}.`);
        return;
      }
      if (pcs < 0) {
        window.alert(`Number of Pcs cannot be negative in Stone row ${index + 1}.`);
        return;
      }
      if (pricePerCt < 0) {
        window.alert(`Price per Ct cannot be negative in Stone row ${index + 1}.`);
        return;
      }
      if (amount < 0) {
        window.alert(`Amount cannot be negative in Stone row ${index + 1}.`);
        return;
      }

      const key = normalizeLookupKey(row.stone);
      if (!key) continue;
      if (usedStoneKeys.has(key)) {
        window.alert('Each Stone can be used only once.');
        return;
      }
      usedStoneKeys.add(key);
    }

    const basePayload = {
      designNo: shouldSendDesignNo ? resolvedDesignNo : undefined,
      jewelryGroup: form.jewelryGroup.trim(),
      collection: form.collection.trim() || undefined,
      stage: form.stage.trim() || undefined,
      diamondType: form.diamondType.trim() || undefined,
      diamondSpread: form.diamondSpread.trim() || undefined,
      jewelrySize: form.jewelrySize.trim() || undefined,
      designStatus: form.designStatus.trim() || undefined,
      drawerLocation: form.drawerLocation.trim() || undefined,
      designDescription: form.designDescription.trim() || undefined,
      remarks: form.remarks.trim() || undefined,
      tags: selectedTags,
      imageUrls: galleryUrls,
    };
    const createPayload = {
      ...basePayload,
      metals: metalRows.map((row) => ({
        metalCaratage: row.goldColour.trim() || undefined,
        goldColour: row.goldColour.trim() || undefined,
        netWt: parseNum(row.netWt),
        wastagePercent: parseNum(row.wastagePercent),
        wastageWt: getMetalWastageWt(row),
        totalWt: getMetalTotalWt(row),
        pricePerGm: parseNum(row.pricePerGm),
        value: getMetalValue(row),
      })),
      gemstones: gemRows.map((row) => ({
        packetId: row.packetId || undefined,
        stone: row.stone.trim() || undefined,
        shape: row.shape.trim() || undefined,
        size: row.size.trim() || undefined,
        cut: row.cut.trim() || undefined,
        color: row.color.trim() || undefined,
        quality: row.quality.trim() || undefined,
        stoneType: row.settingType.trim() || undefined,
        wtPerPcs: parseNum(row.wtPerPcs),
        pcs: parseNum(row.pcs),
        wtInCts: getGemWeight(row),
        pricePerCt: parseNum(row.pricePerCt),
        amount: getGemValue(row),
      })),
      labors: laborRows.map((row) => ({
        laborHead: row.laborHead.trim() || undefined,
        laborPerUnit: parseNum(row.laborPerUnit),
        unitQty: parseNum(row.unitQty),
        laborValue: parseNum(row.laborValue),
      })),
      findings: FINDING_FEATURE_ENABLED
        ? findingRows.map((row) => ({
            findingHead: row.findingHead.trim() || undefined,
            pricePerUnit: parseNum(row.pricePerUnit),
            units: parseNum(row.units),
            totalWeight: parseNum(row.totalWeight),
            findingValue: parseNum(row.findingValue),
          }))
        : [],
      processStages: processRows
        .filter((row) => row.stage.trim())
        .map((row) => ({
          processStage: row.stage.trim(),
          netWeight: parseNum(row.netWeight),
          duration: parseNum(row.duration),
          durationType: 'MINUTES',
          remarks: row.remarks.trim() || undefined,
        })),
      pricingTiers: pricingRows
        .filter((row) => row.title.trim())
        .map((row) => ({
          name: row.title.trim(),
          incrementBy: 'PERCENTAGE',
          value: parseNum(row.rate),
          sellingPrice: parseNum(row.rate),
          unit: 'PCS',
          weightBy: 'TOTAL',
        })),
      vendors: vendorRows
        .filter((row) => row.supplier.trim())
        .map((row) => ({
          supplierName: row.supplier.trim(),
          stockType: row.stockType.trim() || undefined,
          supplierStyleNo: row.supplierStyleNo.trim() || undefined,
        })),
      relevantDesignIds: relevantSelection,
    };

    setSavingDesign(true);
    try {
      if (editingId) {
        const canUpdate = /^[0-9a-fA-F-]{36}$/.test(editingId);
        if (canUpdate) {
          try {
            const response = await api.put(`/products/${editingId}`, createPayload);
            const saved = mapApiDesignToRow(response.data as ApiDesignRow);
            setRows((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
            setSelectedId(saved.id);
          } catch (error: any) {
            const message = String(error?.response?.data?.message || '');
            const isNotFound =
              error?.response?.status === 404 || /product design not found/i.test(message);
            if (!isNotFound) {
              throw error;
            }
            const response = await api.post('/products', createPayload);
            const saved = mapApiDesignToRow(response.data as ApiDesignRow);
            setRows((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
            setSelectedId(saved.id);
          }
        } else {
          const response = await api.post('/products', createPayload);
          const saved = mapApiDesignToRow(response.data as ApiDesignRow);
          setRows((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
          setSelectedId(saved.id);
        }
      } else {
        const response = await api.post('/products', createPayload);
        const saved = mapApiDesignToRow(response.data as ApiDesignRow);
        setRows((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
        setSelectedId(saved.id);
      }

      setEditingId(null);
      setIsDesignNoManual(false);
      setShowGalleryPicker(false);
      setShowAddModal(false);
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to save design.');
    } finally {
      setSavingDesign(false);
    }
  };

  const deleteDesign = async (id: string) => {
    if (!canModifyExistingDesigns) {
      window.alert('You have read-only access for designs.');
      return;
    }

    if (deletingId) return;
    const confirmed = window.confirm('Delete this design? This action cannot be undone.');
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await api.delete(`/products/${id}`);
      setRows((prev) => {
        const next = prev.filter((item) => item.id !== id);
        if (selectedId === id) {
          setSelectedId(next[0]?.id || '');
        }
        return next;
      });
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to delete design.');
    } finally {
      setDeletingId(null);
    }
  };

  const updateMetalRow = (id: string, key: keyof Omit<MetalRow, 'id'>, value: string) => {
    setMetalRows((prev) => {
      if (key === 'goldColour') {
        const normalizedValue = normalizeLookupKey(value);
        const isDuplicate =
          normalizedValue.length > 0 &&
          prev.some(
            (row) => row.id !== id && normalizeLookupKey(row.goldColour) === normalizedValue,
          );
        if (isDuplicate) {
          window.alert('This Metal Caratage is already used in another line.');
          return prev;
        }
      }

      return prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [key]: value };
        if (key === 'goldColour') {
          const rate = getMetalRate(value);
          const defaultWastage = getMetalDefaultWastage(value);
          const withDefaults = {
            ...updated,
            wastagePercent: defaultWastage,
            pricePerGm: rate !== undefined ? rate.toFixed(2) : '',
          };
          const hasAnyInput =
            withDefaults.netWt.trim().length > 0 || withDefaults.wastagePercent.trim().length > 0;
          if (!hasAnyInput) {
            return { ...withDefaults, wastageWt: '', totalWt: '' };
          }

          const wastageWt = getMetalWastageWt(withDefaults);
          const totalWt = getMetalTotalWt(withDefaults);
          return {
            ...withDefaults,
            wastageWt: wastageWt.toFixed(3),
            totalWt: totalWt.toFixed(3),
          };
        }

        if (key === 'netWt' || key === 'wastagePercent') {
          const hasAnyInput =
            updated.netWt.trim().length > 0 || updated.wastagePercent.trim().length > 0;
          if (!hasAnyInput) {
            return { ...updated, wastageWt: '', totalWt: '' };
          }

          const wastageWt = getMetalWastageWt(updated);
          const totalWt = getMetalTotalWt(updated);
          return {
            ...updated,
            wastageWt: wastageWt.toFixed(3),
            totalWt: totalWt.toFixed(3),
          };
        }

        return updated;
      });
    });
  };

  const updateGemRow = (id: string, key: keyof Omit<GemRow, 'id'>, value: string) => {
    setGemRows((prev) => {
      if (key === 'stone') {
        const normalizedValue = normalizeLookupKey(value);
        const isDuplicate =
          normalizedValue.length > 0 &&
          prev.some((row) => row.id !== id && normalizeLookupKey(row.stone) === normalizedValue);
        if (isDuplicate) {
          window.alert('This stone is already used in another line.');
          return prev;
        }
      }

      return prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [key]: value };
        if (key === 'wtPerPcs' || key === 'pcs') {
          const hasAnyInput =
            updated.wtPerPcs.trim().length > 0 || updated.pcs.trim().length > 0;
          return {
            ...updated,
            wtInCts: hasAnyInput ? getGemWeight(updated).toFixed(3) : '',
          };
        }

        return updated;
      });
    });
  };

  const addMetalLine = () => {
    setMetalRows((prev) => [...prev, createMetalRow('')]);
  };

  const updateLaborRow = (id: string, key: keyof Omit<LaborRow, 'id'>, value: string) => {
    setLaborRows((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const updateFindingRow = (id: string, key: keyof Omit<FindingRow, 'id'>, value: string) => {
    setFindingRows((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const updateCostRow = (setter: React.Dispatch<React.SetStateAction<PricingRow[]>>, id: string, key: 'title' | 'qty' | 'rate', value: string) => {
    setter((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const exportCsv = () => {
    const csv = [['Design No', 'Version', 'Jewelry Group', 'Jewelry Size', 'Metal Caratage', 'Collection', 'Stone Info', 'Price', 'Tags'], ...filteredRows.map((item) => [item.designNo, item.version, item.jewelryGroup, item.jewelrySize, item.goldColour, item.collection, item.stoneInfo, item.price.toFixed(2), item.tags.join('; ')])]
      .map((line) => line.join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'design-list.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPdf = () => {
    if (!selectedDesignIds.length) {
      window.alert('Please select at least one design row to export.');
      return;
    }

    const selectedRows = selectedDesignIds
      .map((id) => rows.find((row) => row.id === id))
      .filter((row): row is DesignRow => Boolean(row));

    if (!selectedRows.length) {
      window.alert('No valid selected rows found for PDF export.');
      return;
    }

    const escapeHtml = (value: string): string =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const tableRowsHtml = selectedRows
      .map((item, index) => {
        const cells = [
          String(index + 1),
          item.designNo || '-',
          item.version || '-',
          item.jewelryGroup || '-',
          item.jewelrySize || '-',
          item.diamondType || '-',
          item.diamondSpread || '-',
          item.goldColour || '-',
          item.collection || '-',
          item.stoneInfo || '-',
          formatMoney(item.price),
          item.tags.join(', ') || '-',
        ]
          .map((value) => `<td>${escapeHtml(value)}</td>`)
          .join('');

        return `<tr>${cells}</tr>`;
      })
      .join('');

    const printedAt = new Date().toLocaleString();
    const title = `Design List Export (${selectedRows.length} selected)`;
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          h1 { margin: 0 0 6px; font-size: 20px; }
          p.meta { margin: 0 0 16px; color: #6b7280; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; font-weight: 700; }
          @media print {
            body { margin: 12px; }
            @page { size: landscape; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">Printed at ${escapeHtml(printedAt)}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Design No</th>
              <th>Version</th>
              <th>Jewelry Group</th>
              <th>Jewelry Size</th>
              <th>Diamond Type</th>
              <th>Diamond Spread</th>
              <th>Metal Caratage</th>
              <th>Collection</th>
              <th>Stone Info</th>
              <th>Price</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>${tableRowsHtml}</tbody>
        </table>
      </body>
      </html>
    `;

    const printFrame = document.createElement('iframe');
    printFrame.setAttribute('aria-hidden', 'true');
    printFrame.style.position = 'fixed';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.right = '-9999px';
    printFrame.style.bottom = '-9999px';
    document.body.appendChild(printFrame);

    const cleanup = () => {
      setTimeout(() => {
        if (printFrame.parentNode) {
          printFrame.parentNode.removeChild(printFrame);
        }
      }, 500);
    };

    const frameWindow = printFrame.contentWindow;
    if (!frameWindow) {
      cleanup();
      window.alert('Unable to initialize PDF export frame.');
      return;
    }

    frameWindow.document.open();
    frameWindow.document.write(html);
    frameWindow.document.close();

    setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
      cleanup();
    }, 150);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Design List</h1>
          <p className="text-sm text-gray-600">Design entries module for super admin review.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => setShowFilters((prev) => !prev)}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          {canCreateDesign ? (
            <Button type="button" onClick={openAdd}>+ Add New</Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={exportPdf}>Export Selected PDF</Button>
          <Button type="button" variant="secondary" onClick={exportCsv}>Export as Excel</Button>
        </div>
      </div>

      <Card>
        {showFilters && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="mb-3 text-sm font-semibold text-gray-800">Filters</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Jewelry Group</label>
                <input className="w-full rounded border border-gray-300 px-2 py-2 text-sm" value={filters.jewelryGroup} onChange={(event) => setFilters((prev) => ({ ...prev, jewelryGroup: event.target.value }))} placeholder="Jewelry Group" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Collection</label>
                <input className="w-full rounded border border-gray-300 px-2 py-2 text-sm" value={filters.collection} onChange={(event) => setFilters((prev) => ({ ...prev, collection: event.target.value }))} placeholder="Collection" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Jewelry Size</label>
                <input className="w-full rounded border border-gray-300 px-2 py-2 text-sm" value={filters.jewelrySize} onChange={(event) => setFilters((prev) => ({ ...prev, jewelrySize: event.target.value }))} placeholder="Jewelry Size" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Tags</label>
                <input className="w-full rounded border border-gray-300 px-2 py-2 text-sm" value={filters.tags} onChange={(event) => setFilters((prev) => ({ ...prev, tags: event.target.value }))} placeholder="Jewelry Tags" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Stone</label>
                <input className="w-full rounded border border-gray-300 px-2 py-2 text-sm" value={filters.stone} onChange={(event) => setFilters((prev) => ({ ...prev, stone: event.target.value }))} placeholder="Stone" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Shape</label>
                <input className="w-full rounded border border-gray-300 px-2 py-2 text-sm" value={filters.shape} onChange={(event) => setFilters((prev) => ({ ...prev, shape: event.target.value }))} placeholder="Shape" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Metal Caratage</label>
                <input className="w-full rounded border border-gray-300 px-2 py-2 text-sm" value={filters.goldColour} onChange={(event) => setFilters((prev) => ({ ...prev, goldColour: event.target.value }))} placeholder="Metal Caratage" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Stage</label>
                <input className="w-full rounded border border-gray-300 px-2 py-2 text-sm" value={filters.stage} onChange={(event) => setFilters((prev) => ({ ...prev, stage: event.target.value }))} placeholder="Stage" />
              </div>
            </div>
          </div>
        )}

        <div className="mb-3 flex items-center justify-end">
          <label className="relative w-full max-w-sm">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-blue-500">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              className="w-full rounded-md border border-blue-200 bg-blue-50 pl-10 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Search designs"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        {rowsLoading ? (
          <p className="mb-3 text-sm text-blue-700">Loading designs...</p>
        ) : null}
        {rowsError ? (
          <p className="mb-3 text-sm text-red-600">{rowsError}</p>
        ) : null}

        <div className="overflow-x-auto scrollbar-top border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">
                  <div className="flex items-center gap-2">
                    <input
                      ref={selectAllVisibleCheckboxRef}
                      type="checkbox"
                      className="h-4 w-4"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all visible designs"
                    />
                    <span>#</span>
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Image</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Design No.</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Jewelry Group</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Jewelry Size</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Metal Info</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Collection</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Stone Info</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Price</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Tags</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredRows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selectedDesignIds.includes(row.id)}
                        onChange={() => toggleDesignSelection(row.id)}
                        aria-label={`Select ${row.designNo || `design ${idx + 1}`}`}
                      />
                      {idx + 1}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {row.imageUrls?.[0] ? (
                      <img
                        src={row.imageUrls[0]}
                        alt={`${row.designNo} preview`}
                        className="h-10 w-10 rounded border border-gray-300 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded border border-gray-300 bg-gray-100 text-[10px] font-semibold text-gray-500">IMG</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm font-semibold">
                    <button
                      type="button"
                      className="text-blue-700 underline-offset-2 hover:underline"
                      onClick={() => openEdit(row)}
                      title="Edit design"
                    >
                      {row.designNo}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">{row.jewelryGroup}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{row.jewelrySize}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    <span className="rounded bg-green-700 px-2 py-1 text-[11px] font-semibold text-white">
                      {row.goldColour || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">{row.collection}</td>
                  <td className="px-3 py-2 text-sm text-gray-700"><span className="rounded bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white">{row.stoneInfo}</span></td>
                  <td className="px-3 py-2 text-sm text-gray-700">{formatMoney(row.price)}</td>
                  <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{row.tags.map((tag) => <Tag key={`${row.id}-${tag}`} text={tag} />)}</div></td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Action label="View" onClick={() => { setSelectedId(row.id); setModal('info'); }} />
                      <Action label="History" onClick={() => { setSelectedId(row.id); setModal('history'); }} />
                      {canModifyExistingDesigns ? (
                        <>
                          <Action label="Edit" onClick={() => openEdit(row)} />
                          <button
                            type="button"
                            title="Delete"
                            aria-label="Delete"
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => deleteDesign(row.id)}
                            disabled={deletingId === row.id}
                          >
                            {deletingId === row.id ? (
                              '...'
                            ) : (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6M14 11v6" />
                              </svg>
                            )}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 space-y-1 text-sm text-gray-600">
          <p>Showing {filteredRows.length} of {rows.length} entries</p>
          <p className="text-xs text-blue-700">
            {canModifyExistingDesigns
              ? 'Tip: Click a Design No or use the Edit button in Action to edit an existing design.'
              : 'Tip: Click View to inspect an existing design.'}
          </p>
          <p className="text-xs text-gray-500">
            Selected rows for PDF export: {selectedDesignIds.length}
          </p>
        </div>
      </Card>

      {showAddModal && (
        <Modal title="ADD NEW DESIGN" size="max-w-[98vw]" onClose={() => { setShowGalleryPicker(false); setShowAddModal(false); setEditingId(null); }}>
          <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 [&_input]:rounded-md [&_input]:border-slate-300 [&_input]:bg-white [&_input]:text-slate-800 [&_input]:placeholder:text-slate-400 [&_select]:rounded-md [&_select]:border-slate-300 [&_select]:bg-white [&_select]:text-slate-800 [&_textarea]:rounded-md [&_textarea]:border-slate-300 [&_textarea]:bg-white [&_textarea]:text-slate-800 [&_textarea]:placeholder:text-slate-400 [&_th]:normal-case [&_th]:tracking-normal">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <p className="font-semibold text-red-600">*Required fields</p>
              <p className="font-semibold text-slate-700">Version: V1</p>
            </div>
            {mastersLoading && <p className="text-xs text-gray-500">Loading master dropdowns...</p>}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="rounded-xl border border-sky-200 bg-white shadow-sm [&_input]:py-1 [&_select]:py-1 [&_textarea]:py-1">
                <div className="border-b border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">General Information</div>
                <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Design No *</label>
                    <input
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={form.designNo}
                      onChange={(event) => {
                        setIsDesignNoManual(true);
                        designNoRequestSeqRef.current += 1;
                        setForm((prev) => ({ ...prev, designNo: event.target.value }));
                      }}
                      placeholder="Design No"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Jewelry Group *</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.jewelryGroup}
                        onChange={(event) => handleJewelryGroupChange(event.target.value)}
                      >
                        <option value="">Select Jewelry Group</option>
                        {masterOptions.jewelryGroups.map((option) => (
                          <option key={option.id} value={option.value}>
                            {option.value}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={inlineMasterAddButtonClass}
                        disabled={creatingMasterType === 'JEWELRY_GROUP'}
                        onClick={() => addMasterFromDesign('JEWELRY_GROUP')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Collection</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.collection}
                        onChange={(event) => setForm((prev) => ({ ...prev, collection: event.target.value }))}
                      >
                        <option value="">Select Collection</option>
                        {masterOptions.collections.map((option) => (
                          <option key={option.id} value={option.value}>
                            {option.value}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={inlineMasterAddButtonClass}
                        disabled={creatingMasterType === 'COLLECTION'}
                        onClick={() => addMasterFromDesign('COLLECTION')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Stage</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.stage}
                        onChange={(event) => setForm((prev) => ({ ...prev, stage: event.target.value }))}
                      >
                        <option value="">Select Stage</option>
                        {masterOptions.stages.map((option) => (
                          <option key={option.id} value={option.value}>
                            {option.value}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={inlineMasterAddButtonClass}
                        disabled={creatingMasterType === 'STAGE'}
                        onClick={() => addMasterFromDesign('STAGE')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Jewelry Size</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.jewelrySize}
                        onChange={(event) => setForm((prev) => ({ ...prev, jewelrySize: event.target.value }))}
                      >
                        <option value="">Select Jewelry Size</option>
                        {masterOptions.jewelrySizes.map((option) => (
                          <option key={option.id} value={option.value}>
                            {option.value}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={inlineMasterAddButtonClass}
                        disabled={creatingMasterType === 'JEWELRY_SIZE'}
                        onClick={() => addMasterFromDesign('JEWELRY_SIZE')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Diamond Type</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.diamondType}
                        onChange={(event) => setForm((prev) => ({ ...prev, diamondType: event.target.value }))}
                      >
                        <option value="">Select Diamond Type</option>
                        {masterOptions.diamondTypes.map((option) => (
                          <option key={option.id} value={option.value}>
                            {option.value}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={inlineMasterAddButtonClass}
                        disabled={creatingMasterType === 'DIAMOND_TYPE'}
                        onClick={() => addMasterFromDesign('DIAMOND_TYPE')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Diamond Spread</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.diamondSpread}
                        onChange={(event) => setForm((prev) => ({ ...prev, diamondSpread: event.target.value }))}
                      >
                        <option value="">Select Diamond Spread</option>
                        {masterOptions.diamondSpreads.map((option) => (
                          <option key={option.id} value={option.value}>
                            {option.value}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={inlineMasterAddButtonClass}
                        disabled={creatingMasterType === 'DIAMOND_SPREAD'}
                        onClick={() => addMasterFromDesign('DIAMOND_SPREAD')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Design Status</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.designStatus}
                        onChange={(event) => setForm((prev) => ({ ...prev, designStatus: event.target.value }))}
                      >
                        <option value="">Select Design Status</option>
                        {masterOptions.designStatuses.map((option) => (
                          <option key={option.id} value={option.value}>
                            {option.value}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={inlineMasterAddButtonClass}
                        disabled={creatingMasterType === 'DESIGN_STATUS'}
                        onClick={() => addMasterFromDesign('DESIGN_STATUS')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Drawer Location</label>
                    <input className="w-full rounded border border-gray-300 px-2 py-2 text-sm" value={form.drawerLocation} onChange={(event) => setForm((prev) => ({ ...prev, drawerLocation: event.target.value }))} placeholder="Drawer location" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Other Weight</label>
                    <input className="w-full rounded border border-gray-300 px-2 py-2 text-sm" value={form.otherWeight} onChange={(event) => setForm((prev) => ({ ...prev, otherWeight: event.target.value }))} placeholder="Other Weight" />
                  </div>
                  <div className="md:col-span-2 xl:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-600">Tags</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={tagPicker}
                        onChange={(event) => {
                          const selected = event.target.value;
                          if (!selected) return;
                          addTag(selected);
                          setTagPicker('');
                        }}
                      >
                        <option value="">Select Tag</option>
                        {masterOptions.tags.map((option) => (
                          <option key={option.id} value={option.value}>
                            {option.value}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={inlineMasterAddButtonClass}
                        disabled={creatingMasterType === 'TAG'}
                        onClick={() => addMasterFromDesign('TAG')}
                      >
                        +
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedTags.length === 0 ? (
                        <span className="text-xs text-gray-500">No tags selected</span>
                      ) : (
                        selectedTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800"
                            onClick={() => removeTag(tag)}
                            title="Click to remove"
                          >
                            {tag} x
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="xl:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-600">Design Description</label>
                    <textarea className="h-20 w-full rounded border border-gray-300 px-2 py-2 text-sm" value={form.designDescription} onChange={(event) => setForm((prev) => ({ ...prev, designDescription: event.target.value }))} placeholder="Design Description" />
                  </div>
                  <div className="xl:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-600">Remarks</label>
                    <textarea className="h-20 w-full rounded border border-gray-300 px-2 py-2 text-sm" value={form.remarks} onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))} placeholder="Design Remarks" />
                  </div>
                </div>
              </div>

              <div className="h-fit rounded-xl border border-violet-200 bg-white shadow-sm">
                <div className="border-b border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800">Images Gallery</div>
                <div className="space-y-3 p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                      onClick={() => setShowGalleryPicker(true)}
                    >
                      Choose From Gallery
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => galleryUploadInputRef.current?.click()}
                      disabled={galleryUploading}
                    >
                      {galleryUploading ? 'Uploading...' : 'Add Image'}
                    </button>
                  </div>
                  <input
                    ref={galleryUploadInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleGalleryUploadChange}
                  />
                  {galleryUrls.length === 0 ? (
                    <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-xs text-gray-500">
                      No images added yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-violet-700">
                        {galleryUrls.length} image{galleryUrls.length > 1 ? 's' : ''} selected
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {galleryUrls.map((url, index) => (
                          <div key={`${url}-${index}`} className="rounded border border-gray-200 bg-gray-50 p-1.5">
                            <img
                              src={url}
                              alt={`Design media ${index + 1}`}
                              className="h-24 w-full rounded object-cover"
                            />
                            <div className="mt-1 flex flex-wrap gap-1">
                              {index > 0 ? (
                                <button
                                  type="button"
                                  className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100"
                                  onClick={() => setPrimaryGalleryUrl(url)}
                                >
                                  Make Primary
                                </button>
                              ) : (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  Primary
                                </span>
                              )}
                              <button
                                type="button"
                                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                                onClick={() => moveGalleryUrl(index, -1)}
                                disabled={index === 0}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                                onClick={() => moveGalleryUrl(index, 1)}
                                disabled={index === galleryUrls.length - 1}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                                onClick={() => removeGalleryUrl(url)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Metal Information</div>
                  <div className="overflow-x-auto scrollbar-top">
                    <table className="min-w-[1020px] text-sm">
                      <thead className="bg-amber-50/70 text-left text-[11px] font-semibold text-amber-900">
                        <tr>
                          <th className="px-2 py-2">Metal Caratage</th>
                          <th className="px-2 py-2">Net Wt. *</th>
                          <th className="px-2 py-2">Wastage %</th>
                          <th className="px-2 py-2">Wastage Wt.</th>
                          <th className="px-2 py-2">Total Wt.</th>
                          <th className="px-2 py-2">@(Per Gms)</th>
                          <th className="px-2 py-2">Value</th>
                          <th className="px-2 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {metalRows.map((item) => (
                          <tr key={item.id}>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-2">
                                <select
                                  className="w-full rounded border border-gray-300 px-2 py-1"
                                  value={item.goldColour}
                                  onChange={(event) => updateMetalRow(item.id, 'goldColour', event.target.value)}
                                >
                                  <option value="">Select Metal Caratage</option>
                                  {!(
                                    (masterOptions.metalCaratages.length > 0
                                      ? masterOptions.metalCaratages
                                      : masterOptions.goldColours
                                    ).some((option) => option.value === item.goldColour)
                                  ) && item.goldColour ? (
                                    <option value={item.goldColour}>{item.goldColour}</option>
                                  ) : null}
                                  {(masterOptions.metalCaratages.length > 0
                                    ? masterOptions.metalCaratages
                                    : masterOptions.goldColours
                                  ).map((option) => {
                                    const optionKey = normalizeLookupKey(option.value);
                                    const isUsedInOtherRow =
                                      optionKey.length > 0 &&
                                      metalRows.some(
                                        (row) =>
                                          row.id !== item.id &&
                                          normalizeLookupKey(row.goldColour) === optionKey,
                                      );
                                    return (
                                      <option
                                        key={option.id}
                                        value={option.value}
                                        disabled={isUsedInOtherRow}
                                      >
                                        {option.value}
                                        {isUsedInOtherRow ? ' (Used)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                                <button
                                  type="button"
                                  className={inlineMasterAddButtonClass}
                                  disabled={creatingMasterType === 'METAL_CARATAGE'}
                                  onClick={() =>
                                    addMasterFromDesign('METAL_CARATAGE', (masterValue) =>
                                      updateMetalRow(item.id, 'goldColour', masterValue),
                                    )
                                  }
                                  title="Add Metal Caratage"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-2"><input type="number" min="0" step="0.001" className="w-28 rounded border border-gray-300 px-2 py-1" value={item.netWt} onChange={(event) => updateMetalRow(item.id, 'netWt', event.target.value)} placeholder="Net Wt" /></td>
                            <td className="px-2 py-2"><input type="number" min="0" step="0.01" className="w-24 rounded border border-gray-300 px-2 py-1" value={item.wastagePercent} onChange={(event) => updateMetalRow(item.id, 'wastagePercent', event.target.value)} placeholder="Wastage %" /></td>
                            <td className="px-2 py-2">
                              <input
                                className="w-28 rounded border border-gray-300 bg-gray-50 px-2 py-1 text-gray-700"
                                value={
                                  item.netWt.trim().length > 0 || item.wastagePercent.trim().length > 0
                                    ? getMetalWastageWt(item).toFixed(3)
                                    : ''
                                }
                                placeholder="Wastage Wt"
                                readOnly
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                className="w-28 rounded border border-gray-300 bg-gray-50 px-2 py-1 text-gray-700"
                                value={
                                  item.netWt.trim().length > 0 || item.wastagePercent.trim().length > 0
                                    ? getMetalTotalWt(item).toFixed(3)
                                    : ''
                                }
                                placeholder="Total Wt"
                                readOnly
                              />
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1">
                                <input type="number" min="0" step="0.01" className="w-28 rounded border border-gray-300 px-2 py-1" value={item.pricePerGm} onChange={(event) => updateMetalRow(item.id, 'pricePerGm', event.target.value)} placeholder="Price" />
                                <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">USD</span>
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-28 rounded border border-gray-300 px-2 py-1"
                                value={item.value}
                                onChange={(event) => updateMetalRow(item.id, 'value', event.target.value)}
                                placeholder={getMetalValue(item).toFixed(2)}
                              />
                            </td>
                            <td className="px-2 py-2"><button type="button" className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100" onClick={() => setMetalRows((prev) => prev.filter((row) => row.id !== item.id))}>Remove</button></td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 text-xs font-semibold text-gray-700">
                          <td className="px-2 py-2 text-right" colSpan={4}>Total</td>
                          <td className="px-2 py-2">{metalRows.reduce((sum, row) => sum + getMetalTotalWt(row), 0).toFixed(3)}</td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2">{costTotals.metal.toFixed(2)}</td>
                          <td className="px-2 py-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end border-t border-amber-200 bg-white px-3 py-2">
                    <button
                      type="button"
                      className="rounded-md bg-blue-700 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-800"
                      onClick={addMetalLine}
                    >
                      + Add Line
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between border-b border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800">
                    <span>Gemstone Information</span>
                    {packetLoading ? <span className="text-xs font-medium text-cyan-700">Loading packets...</span> : null}
                  </div>
                  <div className="overflow-x-auto scrollbar-top">
                    <table className="min-w-[920px] text-sm">
                      <thead className="bg-cyan-50/70 text-left text-[11px] font-semibold text-cyan-900">
                        <tr>
                          <th className="px-2 py-2">##</th>
                          <th className="px-2 py-2">Packet</th>
                          <th className="px-2 py-2">Wt/Per Pcs.</th>
                          <th className="px-2 py-2">Pcs</th>
                          <th className="px-2 py-2">Wt(In Cts)</th>
                          <th className="px-2 py-2">@(P/C/In USD)</th>
                          <th className="px-2 py-2">Amount</th>
                          <th className="px-2 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {gemRows.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="px-2 py-2 text-xs text-gray-600">{idx + 1}.</td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-2">
                                <select
                                  className="w-44 rounded border border-gray-300 px-2 py-1"
                                  value={item.packetId}
                                  onChange={(event) => applyPacketToGemRow(item.id, event.target.value)}
                                >
                                  <option value="">Select Packet</option>
                                  {packetOptions.map((packet) => {
                                    const isCurrentPacket = item.packetId === packet.id;
                                    const packetUsedByOtherRow = gemRows.some(
                                      (row) => row.id !== item.id && row.packetId === packet.id,
                                    );
                                    const stoneKey = normalizeLookupKey(packet.stone);
                                    const stoneUsedByOtherRow =
                                      stoneKey.length > 0 &&
                                      gemRows.some(
                                        (row) =>
                                          row.id !== item.id && normalizeLookupKey(row.stone) === stoneKey,
                                      );
                                    const isDisabled =
                                      !isCurrentPacket && (packetUsedByOtherRow || stoneUsedByOtherRow);

                                    return (
                                      <option key={packet.id} value={packet.id} disabled={isDisabled}>
                                        {packet.packetName}
                                        {isDisabled ? ' (Used)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                                <button
                                  type="button"
                                  className={inlineMasterAddButtonClass}
                                  onClick={() => {
                                    setPacketForm(defaultPacketForm);
                                    setPacketNameManuallyEdited(false);
                                    setShowPacketMasterModal(true);
                                  }}
                                  title="Add Packet"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-2"><input type="number" min="0" step="0.001" className="w-24 rounded border border-gray-300 px-2 py-1" value={item.wtPerPcs} onChange={(event) => updateGemRow(item.id, 'wtPerPcs', event.target.value)} placeholder="0.000" /></td>
                            <td className="px-2 py-2"><input type="number" min="0" step="1" className="w-20 rounded border border-gray-300 px-2 py-1" value={item.pcs} onChange={(event) => updateGemRow(item.id, 'pcs', event.target.value)} placeholder="Pcs" /></td>
                            <td className="px-2 py-2"><input className="w-24 rounded border border-gray-300 bg-gray-50 px-2 py-1 text-gray-700" value={item.wtPerPcs.trim().length > 0 || item.pcs.trim().length > 0 ? getGemWeight(item).toFixed(3) : ''} placeholder="0.000" readOnly /></td>
                            <td className="px-2 py-2"><input type="number" min="0" step="0.01" className="w-24 rounded border border-gray-300 px-2 py-1" value={item.pricePerCt} onChange={(event) => updateGemRow(item.id, 'pricePerCt', event.target.value)} placeholder="0.00" /></td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-24 rounded border border-gray-300 px-2 py-1"
                                value={item.amount}
                                onChange={(event) => updateGemRow(item.id, 'amount', event.target.value)}
                                placeholder={getGemValue(item).toFixed(2)}
                              />
                            </td>
                            <td className="px-2 py-2"><button type="button" className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100" onClick={() => setGemRows((prev) => prev.filter((row) => row.id !== item.id))}>Remove</button></td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 text-xs font-semibold text-gray-700">
                          <td className="px-2 py-2 text-right" colSpan={3}>Total</td>
                          <td className="px-2 py-2">{gemRows.reduce((sum, row) => sum + parseNum(row.pcs), 0).toFixed(0)}</td>
                          <td className="px-2 py-2">{gemRows.reduce((sum, row) => sum + getGemWeight(row), 0).toFixed(3)}</td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2">{costTotals.gem.toFixed(2)}</td>
                          <td className="px-2 py-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end border-t border-cyan-200 bg-white px-3 py-2">
                    <button type="button" className="rounded-md bg-blue-700 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-800" onClick={() => setGemRows((prev) => [...prev, { id: makeId(), packetId: '', stone: '', shape: '', size: '', cut: '', color: '', quality: '', settingType: '', wtPerPcs: '', pcs: '', wtInCts: '', pricePerCt: '', amount: '' }])}>+ Add Line</button>
                  </div>
                </div>
              </div>
              <div className="hidden xl:block" aria-hidden="true" />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[3fr_1fr]">
              <div className="space-y-4">
                <div className="rounded-xl border border-rose-200 bg-white shadow-sm">
                  <div className="border-b border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">Labor Information</div>
                  <div className="overflow-x-auto scrollbar-top">
                    <table className="min-w-full text-sm">
                      <thead className="bg-rose-50/70 text-left text-[11px] font-semibold text-rose-900">
                        <tr>
                          <th className="px-2 py-2">##</th>
                          <th className="px-2 py-2">Labor Head</th>
                          <th className="px-2 py-2">Labor/Unit</th>
                          <th className="px-2 py-2">Unit/Qty</th>
                          <th className="px-2 py-2">Labor Value</th>
                          <th className="px-2 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {laborRows.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="px-2 py-2 text-xs text-gray-600">{idx + 1}.</td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-2">
                                <select
                                  className="w-full rounded border border-gray-300 px-2 py-1"
                                  value={item.laborHead}
                                  onChange={(event) => updateLaborRow(item.id, 'laborHead', event.target.value)}
                                >
                                  <option value="">Select Labor Head</option>
                                  {!masterOptions.laborHeads.some((option) => option.value === item.laborHead) && item.laborHead ? (
                                    <option value={item.laborHead}>{item.laborHead}</option>
                                  ) : null}
                                  {masterOptions.laborHeads.map((option) => (
                                    <option key={option.id} value={option.value}>
                                      {option.value}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className={inlineMasterAddButtonClass}
                                  disabled={creatingMasterType === 'LABOR_HEAD'}
                                  onClick={() =>
                                    addMasterFromDesign('LABOR_HEAD', (masterValue) => updateLaborRow(item.id, 'laborHead', masterValue))
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.laborPerUnit} onChange={(event) => updateLaborRow(item.id, 'laborPerUnit', event.target.value)} placeholder="Price Per Quantity" /></td>
                            <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.unitQty} onChange={(event) => updateLaborRow(item.id, 'unitQty', event.target.value)} placeholder="0" /></td>
                            <td className="px-2 py-2">
                              <input
                                className="w-full cursor-not-allowed rounded border border-gray-300 bg-gray-50 px-2 py-1 text-gray-700"
                                value={getLaborValue(item).toFixed(2)}
                                readOnly
                                tabIndex={-1}
                              />
                            </td>
                            <td className="px-2 py-2"><button type="button" className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100" onClick={() => setLaborRows((prev) => prev.filter((row) => row.id !== item.id))}>Remove</button></td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 text-xs font-semibold text-gray-700">
                          <td className="px-2 py-2 text-right" colSpan={4}>Total</td>
                          <td className="px-2 py-2">{costTotals.labor.toFixed(2)}</td>
                          <td className="px-2 py-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end border-t border-rose-200 bg-white px-3 py-2">
                    <button type="button" className="rounded-md bg-blue-700 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-800" onClick={() => setLaborRows((prev) => [...prev, { id: makeId(), laborHead: masterOptions.laborHeads[0]?.value || '', laborPerUnit: '', unitQty: '', laborValue: '' }])}>+ Add Line</button>
                  </div>
                </div>

                {FINDING_FEATURE_ENABLED ? (
                  <div className="rounded-xl border border-indigo-200 bg-white shadow-sm">
                    <div className="border-b border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800">Finding Information</div>
                    <div className="overflow-x-auto scrollbar-top">
                      <table className="min-w-full text-sm">
                        <thead className="bg-indigo-50/70 text-left text-[11px] font-semibold text-indigo-900">
                          <tr>
                            <th className="px-2 py-2">##</th>
                            <th className="px-2 py-2">Finding Head</th>
                            <th className="px-2 py-2">Price/Unit</th>
                            <th className="px-2 py-2">No. of Units</th>
                            <th className="px-2 py-2">Total Weight (Gms)</th>
                            <th className="px-2 py-2">Finding Value</th>
                            <th className="px-2 py-2">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {findingRows.map((item, idx) => (
                            <tr key={item.id}>
                              <td className="px-2 py-2 text-xs text-gray-600">{idx + 1}.</td>
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-2">
                                  <select
                                    className="w-full rounded border border-gray-300 px-2 py-1"
                                    value={item.findingHead}
                                    onChange={(event) => updateFindingRow(item.id, 'findingHead', event.target.value)}
                                  >
                                    <option value="">Select Finding Head</option>
                                    {!masterOptions.findingHeads.some((option) => option.value === item.findingHead) && item.findingHead ? (
                                      <option value={item.findingHead}>{item.findingHead}</option>
                                    ) : null}
                                    {masterOptions.findingHeads.map((option) => (
                                      <option key={option.id} value={option.value}>
                                        {option.value}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    className={inlineMasterAddButtonClass}
                                    disabled={creatingMasterType === 'FINDING_HEAD'}
                                    onClick={() =>
                                      addMasterFromDesign('FINDING_HEAD', (masterValue) => updateFindingRow(item.id, 'findingHead', masterValue))
                                    }
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.pricePerUnit} onChange={(event) => updateFindingRow(item.id, 'pricePerUnit', event.target.value)} placeholder="0.00" /></td>
                              <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.units} onChange={(event) => updateFindingRow(item.id, 'units', event.target.value)} placeholder="0" /></td>
                              <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.totalWeight} onChange={(event) => updateFindingRow(item.id, 'totalWeight', event.target.value)} placeholder="0.000" /></td>
                              <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.findingValue} onChange={(event) => updateFindingRow(item.id, 'findingValue', event.target.value)} placeholder="0.00" /></td>
                              <td className="px-2 py-2"><button type="button" className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100" onClick={() => setFindingRows((prev) => prev.filter((row) => row.id !== item.id))}>Remove</button></td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 text-xs font-semibold text-gray-700">
                            <td className="px-2 py-2 text-right" colSpan={5}>Total</td>
                            <td className="px-2 py-2">{costTotals.finding.toFixed(2)}</td>
                            <td className="px-2 py-2"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-end border-t border-indigo-200 bg-white px-3 py-2">
                      <button type="button" className="rounded-md bg-blue-700 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-800" onClick={() => setFindingRows((prev) => [...prev, { id: makeId(), findingHead: masterOptions.findingHeads[0]?.value || '', pricePerUnit: '', units: '', totalWeight: '', findingValue: '' }])}>+ Add Line</button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="h-fit rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 text-sm shadow-sm">
                <h3 className="mb-3 border-b border-emerald-200 pb-2 text-base font-semibold text-emerald-900">Summary</h3>
                <div className="space-y-1 text-slate-700">
                  <p className="flex items-center justify-between"><span>Metal Value :</span><span className="font-semibold">{costTotals.metal.toFixed(2)}</span></p>
                  <p className="flex items-center justify-between"><span>Stone Value :</span><span className="font-semibold">{costTotals.gem.toFixed(2)}</span></p>
                  <p className="flex items-center justify-between"><span>Labor Value :</span><span className="font-semibold">{costTotals.labor.toFixed(2)}</span></p>
                  {FINDING_FEATURE_ENABLED ? (
                    <p className="flex items-center justify-between"><span>Finding Value :</span><span className="font-semibold">{costTotals.finding.toFixed(2)}</span></p>
                  ) : null}
                  <p className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-base"><span className="font-semibold">Total Value :</span><span className="font-bold text-slate-900">{costTotals.total.toFixed(2)}</span></p>
                </div>
                <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-slate-700">
                  <p className="flex items-center justify-between"><span>Gross Weight :</span><span className="font-semibold">{costTotals.grossWeight.toFixed(3)}</span></p>
                  <p className="flex items-center justify-between"><span>Live Price :</span><span className="font-semibold">0.00</span></p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white/95 pt-3 shadow-[0_-6px_18px_rgba(15,23,42,0.08)]">
              <Button type="button" onClick={saveDesign} disabled={savingDesign}>
                {savingDesign ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => { setShowGalleryPicker(false); setShowAddModal(false); setEditingId(null); }}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {showAddModal && showGalleryPicker && (
        <Modal title="CHOOSE FROM GALLERY" size="max-w-5xl" onClose={() => setShowGalleryPicker(false)}>
          <div className="space-y-4">
            {galleryLibraryUrls.length === 0 ? (
              <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
                No images found in existing designs yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {galleryLibraryUrls.map((url, index) => {
                  const selectedInCurrent = galleryUrls.includes(url);
                  return (
                    <div key={`${url}-${index}`} className="rounded border border-gray-200 bg-white p-2 shadow-sm">
                      <img src={url} alt={`Gallery ${index + 1}`} className="h-28 w-full rounded object-cover" />
                      <button
                        type="button"
                        className={`mt-2 w-full rounded px-2 py-1 text-xs font-semibold ${
                          selectedInCurrent
                            ? 'cursor-default border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                        onClick={() => {
                          if (selectedInCurrent) return;
                          addGalleryUrls([url]);
                        }}
                      >
                        {selectedInCurrent ? 'Selected' : 'Add'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowGalleryPicker(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showInlineMasterModal && inlineMasterType && (
        <Modal title={`ADD NEW ${masterTypeLabelMap[inlineMasterType].toUpperCase()}`} onClose={closeInlineMasterModal} size="max-w-3xl" zIndexClass="z-[70]">
          <form onSubmit={saveInlineMasterFromDesign} className="space-y-4">
            <p className="text-sm font-medium text-rose-700">* Required fields</p>

            {inlineMasterType === 'FINDING_HEAD' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Finding No.*</label>
                  <input
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineFindingNo}
                    onChange={(event) => setInlineFindingNo(event.target.value)}
                    placeholder="ACS-0001"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">{masterTypeLabelMap[inlineMasterType]}*</label>
                  <input
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineMasterValue}
                    onChange={(event) => setInlineMasterValue(event.target.value)}
                    placeholder={masterTypeLabelMap[inlineMasterType]}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Alias Name*</label>
                  <input
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineMasterAliasName}
                    onChange={(event) => setInlineMasterAliasName(event.target.value)}
                    placeholder="Alias Name"
                    required
                  />
                </div>
              </div>
            ) : null}

            {inlineMasterType !== 'FINDING_HEAD' && inlineMasterType !== 'METAL_CARATAGE' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">{masterTypeLabelMap[inlineMasterType]}*</label>
                  <input
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineMasterValue}
                    onChange={(event) => setInlineMasterValue(event.target.value)}
                    placeholder={masterTypeLabelMap[inlineMasterType]}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Alias Name*</label>
                  <input
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineMasterAliasName}
                    onChange={(event) => setInlineMasterAliasName(event.target.value)}
                    placeholder="Alias Name"
                    required
                  />
                </div>
              </div>
            ) : null}

            {inlineMasterType === 'METAL_CARATAGE' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Metal Name*</label>
                  <select
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineMetalName}
                    onChange={(event) => setInlineMetalName(event.target.value)}
                    required
                  >
                    <option value="">Select Metal Name</option>
                    {masterOptions.metalNames.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.aliasName || option.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Metal Purity*</label>
                  <select
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineMetalPurity}
                    onChange={(event) => setInlineMetalPurity(event.target.value)}
                    required
                  >
                    <option value="">Select Metal Purity</option>
                    {inlineMetalPurityOptions.map((option) => (
                      <option key={option.id} value={option.value}>
                        {getMetalPurityDisplay(option)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Metal Color*</label>
                  <select
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineMetalColor}
                    onChange={(event) => setInlineMetalColor(event.target.value)}
                    required
                  >
                    <option value="">Select Metal Color</option>
                    {inlineMetalColorOptions.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.aliasName || option.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Metal Caratage Name*</label>
                  <input
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineMasterAliasName}
                    onChange={(event) => setInlineMasterAliasName(event.target.value)}
                    placeholder="Metal Caratage Name"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Wastage</label>
                  <div className="flex">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-l border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={inlineDefaultWastagePercent}
                      onChange={(event) => setInlineDefaultWastagePercent(event.target.value)}
                      placeholder="0.00"
                    />
                    <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-600">%</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Price/Gms</label>
                  <div className="flex">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-l border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={inlinePricePerUnit}
                      onChange={(event) => setInlinePricePerUnit(event.target.value)}
                      placeholder="Auto calculated (editable)"
                    />
                    <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-600">USD</span>
                  </div>
                </div>
              </div>
            ) : null}

            {inlineMasterType === 'FINDING_HEAD' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Metal Caratage*</label>
                  <input
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineMetalCaratage}
                    onChange={(event) => setInlineMetalCaratage(event.target.value)}
                    placeholder="Metal Caratage"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Price In*</label>
                  <div className="flex flex-wrap items-center gap-4 rounded border border-slate-300 px-3 py-2 text-sm">
                    {(['PIECES', 'GRAM', 'PAIR', 'INCHES'] as Array<'PIECES' | 'GRAM' | 'PAIR' | 'INCHES'>).map((option) => (
                      <label key={option} className="inline-flex items-center gap-1.5 text-slate-700">
                        <input
                          type="radio"
                          name="inline-finding-price-in"
                          value={option}
                          checked={inlinePriceIn === option}
                          onChange={(event) => setInlinePriceIn(event.target.value as 'PIECES' | 'GRAM' | 'PAIR' | 'INCHES')}
                        />
                        <span>
                          {option === 'PIECES'
                            ? 'Pieces'
                            : option === 'GRAM'
                              ? 'Gram'
                              : option === 'PAIR'
                                ? 'Pair'
                                : 'Inches'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Price/Unit*</label>
                  <div className="flex">
                    <input
                      className="w-full rounded-l border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={inlinePricePerUnit}
                      onChange={(event) => setInlinePricePerUnit(event.target.value)}
                      placeholder="Price/Unit"
                      required
                    />
                    <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-600">USD</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Dimensions</label>
                  <input
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineDimensions}
                    onChange={(event) => setInlineDimensions(event.target.value)}
                    placeholder="Dimensions"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Weight/Unit*</label>
                  <input
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineWeightPerUnit}
                    onChange={(event) => setInlineWeightPerUnit(event.target.value)}
                    placeholder="Weight/Unit"
                    required
                  />
                </div>
              </div>
            ) : null}

            {inlineMasterType === 'METAL_CARATAGE' ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  className="h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={inlineMasterDescription}
                  onChange={(event) => setInlineMasterDescription(event.target.value)}
                  placeholder="Description"
                />
              </div>
            ) : null}

            {inlineMasterType !== 'FINDING_HEAD' && inlineMasterType !== 'METAL_CARATAGE' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    className="h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineMasterDescription}
                    onChange={(event) => setInlineMasterDescription(event.target.value)}
                    placeholder="Description"
                  />
                </div>
                {inlineMasterType === 'GOLD_COLOUR' ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Default Wastage (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={inlinePricePerUnit}
                      onChange={(event) => setInlinePricePerUnit(event.target.value)}
                      placeholder="Default Wastage %"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <Button type="submit" size="sm" disabled={creatingMasterType === inlineMasterType}>
                {creatingMasterType === inlineMasterType ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={closeInlineMasterModal}>
                Close
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {showPacketMasterModal && (
        <Modal title="ADD PACKET" onClose={() => { setShowPacketMasterModal(false); setPacketForm(defaultPacketForm); setPacketNameManuallyEdited(false); }} size="max-w-6xl">
          <div className="space-y-4">
            <p className="text-sm font-medium text-rose-700">* Required fields</p>
            <div className="rounded border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-800">Basic Info</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Stone*</label>
                  <div className="flex items-center gap-2">
                    <select
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={packetForm.stone}
                      onChange={(event) => updatePacketFormField('stone', event.target.value)}
                    >
                      <option value="">Select Stone</option>
                      {!masterOptions.packetStones.some((option) => option.value === packetForm.stone) && packetForm.stone ? (
                        <option value={packetForm.stone}>{packetForm.stone}</option>
                      ) : null}
                      {masterOptions.packetStones.map((option) => (
                        <option key={option.id} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={inlineMasterAddButtonClass}
                      disabled={creatingMasterType === 'PACKET_STONE'}
                      onClick={() => addMasterFromDesign('PACKET_STONE')}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Shape*</label>
                  <div className="flex items-center gap-2">
                    <select
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={packetForm.shape}
                      onChange={(event) => updatePacketFormField('shape', event.target.value)}
                    >
                      <option value="">Select Shape</option>
                      {!masterOptions.packetShapes.some((option) => option.value === packetForm.shape) && packetForm.shape ? (
                        <option value={packetForm.shape}>{packetForm.shape}</option>
                      ) : null}
                      {masterOptions.packetShapes.map((option) => (
                        <option key={option.id} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={inlineMasterAddButtonClass}
                      disabled={creatingMasterType === 'PACKET_SHAPE'}
                      onClick={() => addMasterFromDesign('PACKET_SHAPE')}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Size*</label>
                  <div className="flex items-center gap-2">
                    <select
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={packetForm.size}
                      onChange={(event) => updatePacketFormField('size', event.target.value)}
                    >
                      <option value="">Select Size</option>
                      {!masterOptions.packetSizes.some((option) => option.value === packetForm.size) && packetForm.size ? (
                        <option value={packetForm.size}>{packetForm.size}</option>
                      ) : null}
                      {masterOptions.packetSizes.map((option) => (
                        <option key={option.id} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={inlineMasterAddButtonClass}
                      disabled={creatingMasterType === 'PACKET_SIZE'}
                      onClick={() => addMasterFromDesign('PACKET_SIZE')}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Cut*</label>
                  <div className="flex items-center gap-2">
                    <select
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={packetForm.cut}
                      onChange={(event) => updatePacketFormField('cut', event.target.value)}
                    >
                      <option value="">Select Cut</option>
                      {!masterOptions.packetCuts.some((option) => option.value === packetForm.cut) && packetForm.cut ? (
                        <option value={packetForm.cut}>{packetForm.cut}</option>
                      ) : null}
                      {masterOptions.packetCuts.map((option) => (
                        <option key={option.id} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={inlineMasterAddButtonClass}
                      disabled={creatingMasterType === 'PACKET_CUT'}
                      onClick={() => addMasterFromDesign('PACKET_CUT')}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Color*</label>
                  <div className="flex items-center gap-2">
                    <select
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={packetForm.color}
                      onChange={(event) => updatePacketFormField('color', event.target.value)}
                    >
                      <option value="">Select Color</option>
                      {!masterOptions.packetColors.some((option) => option.value === packetForm.color) && packetForm.color ? (
                        <option value={packetForm.color}>{packetForm.color}</option>
                      ) : null}
                      {masterOptions.packetColors.map((option) => (
                        <option key={option.id} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={inlineMasterAddButtonClass}
                      disabled={creatingMasterType === 'PACKET_COLOR'}
                      onClick={() => addMasterFromDesign('PACKET_COLOR')}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Quality*</label>
                  <div className="flex items-center gap-2">
                    <select
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={packetForm.quality}
                      onChange={(event) => updatePacketFormField('quality', event.target.value)}
                    >
                      <option value="">Select Quality</option>
                      {!masterOptions.packetQualities.some((option) => option.value === packetForm.quality) && packetForm.quality ? (
                        <option value={packetForm.quality}>{packetForm.quality}</option>
                      ) : null}
                      {masterOptions.packetQualities.map((option) => (
                        <option key={option.id} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={inlineMasterAddButtonClass}
                      disabled={creatingMasterType === 'PACKET_QUALITY'}
                      onClick={() => addMasterFromDesign('PACKET_QUALITY')}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Packet Name*</label>
                  <div className="flex items-center gap-2">
                    <input
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={packetForm.packetName}
                      onChange={(event) => updatePacketFormField('packetName', event.target.value)}
                      placeholder="Packet Name"
                    />
                    <button
                      type="button"
                      className={inlineMasterAddButtonClass}
                      title="Regenerate packet name"
                      onClick={regeneratePacketName}
                    >
                      R
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-800">Purchase Weight & Price (Optional)</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Price In</label>
                  <div className="flex items-center gap-3 rounded border border-gray-300 bg-white px-3 py-2 text-sm">
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="packet-price-in"
                        value="WT"
                        checked={packetForm.priceIn === 'WT'}
                        onChange={(event) => updatePacketFormField('priceIn', event.target.value)}
                      />
                      <span>Wt</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="packet-price-in"
                        value="PCS"
                        checked={packetForm.priceIn === 'PCS'}
                        onChange={(event) => updatePacketFormField('priceIn', event.target.value)}
                      />
                      <span>Pcs</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Weight In</label>
                  <div className="flex items-center gap-3 rounded border border-gray-300 bg-white px-3 py-2 text-sm">
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="packet-weight-in"
                        value="CTS"
                        checked={packetForm.weightIn === 'CTS'}
                        onChange={(event) => updatePacketFormField('weightIn', event.target.value)}
                      />
                      <span>Cts</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="packet-weight-in"
                        value="GRAM"
                        checked={packetForm.weightIn === 'GRAM'}
                        onChange={(event) => updatePacketFormField('weightIn', event.target.value)}
                      />
                      <span>Gram</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Selling Price*</label>
                  <div className="flex">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-l border border-gray-300 px-2 py-2 text-sm"
                      value={packetForm.sellingPrice}
                      onChange={(event) => updatePacketFormField('sellingPrice', event.target.value)}
                      placeholder="Price"
                    />
                    <span className="inline-flex items-center rounded-r border border-l-0 border-gray-300 bg-slate-100 px-3 text-xs font-semibold text-slate-600">USD</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Weight/Pc.</label>
                  <div className="flex">
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      className="w-full rounded-l border border-gray-300 px-2 py-2 text-sm"
                      value={packetForm.weightPerPc}
                      onChange={(event) => updatePacketFormField('weightPerPc', event.target.value)}
                      placeholder="Weight/Pc."
                    />
                    <span className="inline-flex items-center rounded-r border border-l-0 border-gray-300 bg-slate-100 px-3 text-xs font-semibold text-slate-600">
                      {packetForm.weightIn === 'GRAM' ? 'GMS' : 'CTS'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={savePacketMaster} disabled={packetSaving}>
                {packetSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => { setShowPacketMasterModal(false); setPacketForm(defaultPacketForm); setPacketNameManuallyEdited(false); }}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'info' && selected && (
        <Modal title={`DESIGN DETAILS (${selected.designNo})`} onClose={() => setModal(null)} size="max-w-7xl">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="rounded border border-gray-200">
                <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Design Information</div>
                <table className="min-w-full text-sm">
                  <tbody>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Design No</td><td className="px-3 py-2">{selected.designNo}</td><td className="px-3 py-2 font-medium">Version</td><td className="px-3 py-2">{selected.version}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Stage</td><td className="px-3 py-2">{selected.stage}</td><td className="px-3 py-2 font-medium">Jewelry Group</td><td className="px-3 py-2">{selected.jewelryGroup}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Diamond Type</td><td className="px-3 py-2">{selected.diamondType || '-'}</td><td className="px-3 py-2 font-medium">Diamond Spread</td><td className="px-3 py-2">{selected.diamondSpread || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Collection</td><td className="px-3 py-2">{selected.collection}</td><td className="px-3 py-2 font-medium">Tags</td><td className="px-3 py-2">{selected.tags.join(', ') || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Jewelry Size</td><td className="px-3 py-2">{selected.jewelrySize}</td><td className="px-3 py-2 font-medium">Design Status</td><td className="px-3 py-2">{selected.status}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Total Value</td><td className="px-3 py-2">{formatMoney(selected.price)}</td><td className="px-3 py-2 font-medium">Description</td><td className="px-3 py-2">{selected.remarks || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Created</td><td className="px-3 py-2">{selected.createdAt}</td><td className="px-3 py-2 font-medium">Modified</td><td className="px-3 py-2">{selected.modifiedAt}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="rounded border border-gray-200">
                <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Gallery Data</div>
                <div className="p-3">
                  {selected.imageUrls?.length ? (
                    <div className="space-y-3">
                      <img
                        src={selected.imageUrls[0]}
                        alt={`${selected.designNo} primary`}
                        className="h-44 w-full rounded border border-gray-300 object-cover"
                      />
                      {selected.imageUrls.length > 1 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {selected.imageUrls.slice(1).map((url, index) => (
                            <img
                              key={`${url}-${index}`}
                              src={url}
                              alt={`${selected.designNo} gallery ${index + 2}`}
                              className="h-16 w-full rounded border border-gray-200 object-cover"
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex h-36 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-xs font-semibold text-gray-500">
                      No gallery images
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Metal Value</p><p className="font-semibold">{costTotals.metal.toFixed(2)}</p></div>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Gem Value</p><p className="font-semibold">{costTotals.gem.toFixed(2)}</p></div>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Labor Value</p><p className="font-semibold">{costTotals.labor.toFixed(2)}</p></div>
              {FINDING_FEATURE_ENABLED ? (
                <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Finding Value</p><p className="font-semibold">{costTotals.finding.toFixed(2)}</p></div>
              ) : null}
              <div className="rounded border border-green-200 bg-green-50 p-2 text-sm"><p className="text-xs text-gray-600">Total Value</p><p className="font-semibold">{costTotals.total.toFixed(2)}</p></div>
            </div>
            <div className="rounded border border-gray-200 p-3 text-sm text-gray-700"><p className="font-semibold">Pricing Tier</p><p className="mt-1">Design pricing tier detail is not available for this view.</p></div>
          </div>
        </Modal>
      )}

      {modal === 'relevant' && selected && (
        <Modal title={`RELEVANT DESIGN (${selected.designNo})`} onClose={() => setModal(null)} size="max-w-3xl">
          <div className="space-y-3">
            <label className="mb-1 block text-sm font-semibold text-gray-700">Select Design *</label>
            <div className="max-h-64 overflow-y-auto rounded border border-gray-300">
              {rows.filter((item) => item.id !== selected.id).map((item) => (
                <label key={item.id} className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 text-sm">
                  <input type="checkbox" checked={relevantSelection.includes(item.designNo)} onChange={() => setRelevantSelection((prev) => prev.includes(item.designNo) ? prev.filter((id) => id !== item.designNo) : [...prev, item.designNo])} />
                  <span>{item.designNo} ({item.version})</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2"><Button type="button" onClick={() => setModal(null)}>Save</Button><Button type="button" variant="secondary" onClick={() => setModal(null)}>Close</Button></div>
          </div>
        </Modal>
      )}

      {modal === 'stl' && selected && (
        <Modal title={`STL FILE (${selected.designNo})`} onClose={() => setModal(null)} size="max-w-3xl">
          <div className="rounded border border-gray-200 bg-gray-50 p-6 text-2xl font-medium text-gray-600">Coming soon...</div>
        </Modal>
      )}

      {modal === 'process' && selected && (
        <Modal title={`PROCESS (${selected.designNo})`} onClose={() => setModal(null)} size="max-w-5xl">
          <div className="space-y-3">
            <div className="overflow-x-auto scrollbar-top rounded border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-left text-xs uppercase text-gray-600"><tr><th className="px-3 py-2">Process Stage</th><th className="px-3 py-2">Net Weight</th><th className="px-3 py-2">Duration (Min)</th><th className="px-3 py-2">Remarks</th><th className="px-3 py-2">Action</th></tr></thead>
                <tbody>
                  {processRows.map((item) => (
                    <tr key={item.id} className="border-t border-gray-200">
                      <td className="px-3 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.stage} onChange={(event) => setProcessRows((prev) => prev.map((row) => row.id === item.id ? { ...row, stage: event.target.value } : row))} /></td>
                      <td className="px-3 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.netWeight} onChange={(event) => setProcessRows((prev) => prev.map((row) => row.id === item.id ? { ...row, netWeight: event.target.value } : row))} /></td>
                      <td className="px-3 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.duration} onChange={(event) => setProcessRows((prev) => prev.map((row) => row.id === item.id ? { ...row, duration: event.target.value } : row))} /></td>
                      <td className="px-3 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.remarks} onChange={(event) => setProcessRows((prev) => prev.map((row) => row.id === item.id ? { ...row, remarks: event.target.value } : row))} /></td>
                      <td className="px-3 py-2"><button type="button" className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700" onClick={() => setProcessRows((prev) => prev.filter((row) => row.id !== item.id))}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between"><button type="button" className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700" onClick={() => setProcessRows((prev) => [...prev, { id: makeId(), stage: '', netWeight: '', duration: '', remarks: '' }])}>+ Add Line</button><Button type="button" onClick={() => setModal(null)}>Save</Button></div>
          </div>
        </Modal>
      )}

      {modal === 'history' && selected && (
        <Modal title={`ACTIONS HISTORY (${selected.designNo})`} onClose={() => setModal(null)} size="max-w-4xl">
          <div className="overflow-x-auto scrollbar-top rounded border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left text-xs uppercase text-gray-600"><tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Remarks</th><th className="px-3 py-2">User</th><th className="px-3 py-2">Date Time</th></tr></thead>
              <tbody>{historyRows.map((row, idx) => <tr key={`${row[0]}-${idx}`} className="border-t border-gray-200"><td className="px-3 py-2">{idx + 1}</td><td className="px-3 py-2">{row[0]}</td><td className="px-3 py-2">{row[1]}</td><td className="px-3 py-2">{row[2]}</td></tr>)}</tbody>
            </table>
          </div>
        </Modal>
      )}

      {modal === 'pricing' && selected && (
        <Modal title={`PRICING TIER (${selected.designNo})`} onClose={() => setModal(null)} size="max-w-6xl">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Design Cost Price</p><p className="font-semibold">{formatMoney(selected.price)}</p></div>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Gross Weight</p><p className="font-semibold">{costTotals.grossWeight.toFixed(3)}</p></div>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Net Weight</p><p className="font-semibold">{metalRows.reduce((sum, row) => sum + parseNum(row.netWt), 0).toFixed(3)}</p></div>
            </div>
            <div className="overflow-x-auto scrollbar-top rounded border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-left text-xs uppercase text-gray-600"><tr><th className="px-3 py-2">Tier Name</th><th className="px-3 py-2">Increment %</th><th className="px-3 py-2">Selling Price</th><th className="px-3 py-2">Action</th></tr></thead>
                <tbody>
                  {pricingRows.map((item) => (
                    <tr key={item.id} className="border-t border-gray-200">
                      <td className="px-3 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.title} onChange={(event) => updateCostRow(setPricingRows, item.id, 'title', event.target.value)} /></td>
                      <td className="px-3 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.qty} onChange={(event) => updateCostRow(setPricingRows, item.id, 'qty', event.target.value)} /></td>
                      <td className="px-3 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.rate} onChange={(event) => updateCostRow(setPricingRows, item.id, 'rate', event.target.value)} /></td>
                      <td className="px-3 py-2"><button type="button" className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700" onClick={() => setPricingRows((prev) => prev.filter((row) => row.id !== item.id))}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between"><button type="button" className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700" onClick={() => setPricingRows((prev) => [...prev, { id: makeId(), title: '', qty: '', rate: '' }])}>+ Add Line</button><Button type="button" onClick={() => setModal(null)}>Save</Button></div>
          </div>
        </Modal>
      )}

      {modal === 'vendor' && selected && (
        <Modal title={`VENDOR NO. (${selected.designNo})`} onClose={() => setModal(null)} size="max-w-5xl">
          <div className="space-y-3">
            <div className="overflow-x-auto scrollbar-top rounded border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-left text-xs uppercase text-gray-600"><tr><th className="px-3 py-2">Supplier</th><th className="px-3 py-2">Stock Type</th><th className="px-3 py-2">Supplier Style No.</th><th className="px-3 py-2">Action</th></tr></thead>
                <tbody>
                  {vendorRows.map((item) => (
                    <tr key={item.id} className="border-t border-gray-200">
                      <td className="px-3 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.supplier} onChange={(event) => setVendorRows((prev) => prev.map((row) => row.id === item.id ? { ...row, supplier: event.target.value } : row))} /></td>
                      <td className="px-3 py-2"><select className="w-full rounded border border-gray-300 px-2 py-1" value={item.stockType} onChange={(event) => setVendorRows((prev) => prev.map((row) => row.id === item.id ? { ...row, stockType: event.target.value } : row))}><option>Completed</option><option>In Progress</option></select></td>
                      <td className="px-3 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.supplierStyleNo} onChange={(event) => setVendorRows((prev) => prev.map((row) => row.id === item.id ? { ...row, supplierStyleNo: event.target.value } : row))} /></td>
                      <td className="px-3 py-2"><button type="button" className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700" onClick={() => setVendorRows((prev) => prev.filter((row) => row.id !== item.id))}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between"><button type="button" className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700" onClick={() => setVendorRows((prev) => [...prev, { id: makeId(), supplier: '', stockType: 'Completed', supplierStyleNo: '' }])}>+ Add New Line</button><Button type="button" onClick={() => setModal(null)}>Save</Button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

