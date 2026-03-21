import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Pagination from '../../components/common/Pagination';
import StlViewer from '../../components/common/StlViewer';
import api from '../../services/api';
import { getStoredUser } from '../../utils/auth';

type ModalType = 'info' | 'relevant' | 'process' | 'history' | 'pricing' | 'vendor' | null;

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
  jewelryGroupId?: string;
  jewelryGroup?: string;
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
  designName: string;
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
  isActive: boolean;
  imageUrls?: string[];
  imageKeys?: string[];
  createdAt: string;
  modifiedAt: string;
  updatedByName: string;
}

type DesignListColumnKey =
  | 'media'
  | 'designNo'
  | 'jewelryGroup'
  | 'jewelrySize'
  | 'metalInfo'
  | 'collection'
  | 'stoneInfo'
  | 'price'
  | 'tags'
  | 'stage'
  | 'status'
  | 'updatedBy'
  | 'modifiedAt';

interface DesignListColumn {
  key: DesignListColumnKey;
  label: string;
}

interface ApiDesignRow {
  id: string;
  designNo?: string;
  designName?: string | null;
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
  imageKeys?: unknown;
  isActive?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  updatedByName?: string | null;
}

interface GalleryItem {
  key: string;
  url: string;
}

interface ListMediaViewerState {
  title: string;
  items: GalleryItem[];
  activeIndex: number;
}

interface StlItem {
  url: string;
  key: string;
  fileName: string;
}

interface DesignForm {
  designNo: string;
  designName: string;
  version: string;
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

const DESIGN_LIST_COLUMNS: DesignListColumn[] = [
  { key: 'media', label: 'Media' },
  { key: 'designNo', label: 'Design No.' },
  { key: 'jewelryGroup', label: 'Jewelry Group' },
  { key: 'jewelrySize', label: 'Jewelry Size' },
  { key: 'metalInfo', label: 'Metal Info' },
  { key: 'collection', label: 'Collection' },
  { key: 'stoneInfo', label: 'Stone Info' },
  { key: 'price', label: 'Price' },
  { key: 'tags', label: 'Tags' },
  { key: 'stage', label: 'Stage' },
  { key: 'status', label: 'Status' },
  { key: 'updatedBy', label: 'Updated By' },
  { key: 'modifiedAt', label: 'Modified' },
];

const DEFAULT_DESIGN_LIST_COLUMNS: DesignListColumnKey[] = [
  'media',
  'designNo',
  'jewelryGroup',
  'jewelrySize',
  'metalInfo',
  'collection',
  'stoneInfo',
  'price',
];

const DESIGN_LIST_COLUMNS_STORAGE_KEY = 'design-list-visible-columns-v2';

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
  color: string;
  quality: string;
  priceIn: 'WT' | 'PCS';
  sellingPrice: string;
  weightPerPc: string;
  weightIn: 'CTS' | 'GRAM';
}

interface DesignHistoryRow {
  id: string;
  actionType: string;
  remarks: string;
  user: string;
  dateTime: string;
}

const makeId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const parseNum = (value: string): number => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};
const isPartialDecimal = (value: string): boolean => value.trim().endsWith('.');
const parseNumericValue = (value: number | string | null | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const toPacketAbbreviation = (value: string): string => {
  const normalized = (value || '').trim();
  if (!normalized) return '';

  const compact = normalized.replace(/[^a-zA-Z0-9]/g, '');
  const words = normalized
    .replace(/[^a-zA-Z0-9\\s/-]/g, ' ')
    .split(/[\\s/-]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (words.length <= 1) {
    return compact.slice(0, 3).toUpperCase();
  }

  return words
    .slice(0, 3)
    .map((entry) => entry.charAt(0).toUpperCase())
    .join('');
};
const buildPacketNameFromForm = (packet: Pick<PacketForm, 'stone' | 'shape' | 'size' | 'color' | 'quality'>): string => {
  const parts = [packet.stone, packet.shape, packet.size, packet.color, packet.quality]
    .map((entry) => toPacketAbbreviation((entry || '').trim()))
    .filter((entry) => entry.length > 0);
  return parts.join('-');
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
const formatDetailDateTime = (value: string | null | undefined): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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
const isVideoUrl = (url: string): boolean => {
  const normalized = (url || '').trim();
  if (!normalized) return false;
  if (/^data:video\//i.test(normalized)) return true;
  const clean = stripUrlSuffix(normalized);
  return ['.mp4', '.webm', '.mov', '.m4v', '.ogv', '.ogg'].some((ext) => clean.endsWith(ext));
};
const isGalleryUploadFile = (file: File): boolean =>
  Boolean(file.type) && (file.type.startsWith('image/') || file.type.startsWith('video/'));
const isStlUploadFile = (file: File): boolean => {
  const name = (file.name || '').trim().toLowerCase();
  const type = (file.type || '').trim().toLowerCase();
  return name.endsWith('.stl') || ['model/stl', 'application/sla', 'model/x.stl-ascii'].includes(type);
};
const getFileNameFromUrl = (url: string): string => {
  const clean = stripUrlSuffix(url || '').trim();
  if (!clean) return 'design.stl';
  const parts = clean.split('/');
  return parts[parts.length - 1] || 'design.stl';
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
  const imageKeys = normalizeStringArray(design.imageKeys ?? design.imageUrls);
  const tags = normalizeStringArray(design.tags);
  return {
    id: design.id,
    designNo: design.designNo || '',
    designName: design.designName || design.designNo || '',
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
    isActive: design.isActive !== false,
    imageUrls,
    imageKeys,
    createdAt: normalizeDateTimeValue(design.createdAt) || '',
    modifiedAt: normalizeDateTimeValue(design.updatedAt) || '',
    updatedByName: design.updatedByName || '',
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
const sanitizeDesignPrefix = (value: string): string =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .trim();

const buildDesignNoPrefix = (jewelryGroup: string, aliasName?: string): string => {
  const alias = aliasName?.trim();
  if (alias) {
    const normalizedAlias = sanitizeDesignPrefix(alias);
    if (normalizedAlias) return normalizedAlias.slice(0, 5);
  }
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
const getNextDesignNo = (
  jewelryGroup: string,
  existingRows: DesignRow[],
  aliasName?: string,
): string => {
  const prefix = buildDesignNoPrefix(jewelryGroup, aliasName);
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

const normalizeVersionInput = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return 'V1';
  const upper = trimmed.toUpperCase();
  return upper.startsWith('V') ? upper : `V${upper}`;
};

const getBaseDesignNo = (designNo: string): string => designNo.trim().toUpperCase().replace(/-V\d+$/i, '');

const buildVersionedDesignNo = (designNo: string, version: string): string => {
  const base = getBaseDesignNo(designNo);
  const normalizedVersion = normalizeVersionInput(version);
  if (normalizedVersion === 'V1') return base;
  return `${base}-${normalizedVersion}`;
};

const getNextDesignVersion = (designNo: string, existingRows: DesignRow[]): string => {
  const target = getBaseDesignNo(designNo);
  if (!target) return 'V1';
  let maxVersion = 0;
  existingRows.forEach((row) => {
    if (getBaseDesignNo(row.designNo || '') !== target) return;
    const match = /V(\d+)/i.exec((row.version || '').trim());
    if (!match) return;
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed > maxVersion) {
      maxVersion = parsed;
    }
  });
  return `V${Math.max(1, maxVersion + 1)}`;
};

const designSeed: DesignRow[] = [
  { id: '1', designNo: 'RING-0006', designName: 'Ring RING-0006', version: 'V1', jewelryGroup: 'Ring', jewelrySize: 'US 6', diamondType: 'Lab Diamonds - EF/VVS-VS', diamondSpread: '1/2 Way', goldColour: '22 karat-Rose-Gold', collection: 'Silver', stoneInfo: 'Diamond 0', price: 1586.77, tags: ['Diamond Ring'], stage: 'Sketch', status: 'Mold', remarks: 'Primary hero ring', isActive: true, createdAt: '2025-12-17 12:23', modifiedAt: '2026-02-21 14:07', updatedByName: '' },
  { id: '2', designNo: 'BL-0001', designName: 'Bracelet BL-0001', version: 'V1', jewelryGroup: 'Bracelet', jewelrySize: '15.5 CM', diamondType: 'Natural Diamonds - GH/VS', diamondSpread: '3/4 Way', goldColour: '90-silver-Silver', collection: 'Silver Fortune', stoneInfo: 'Diamond 0', price: 9.6, tags: ['Silver Bracelet'], stage: 'Approved', status: 'Active', remarks: 'Starter collection item', isActive: true, createdAt: '2025-11-09 10:00', modifiedAt: '2026-02-16 15:42', updatedByName: '' },
  { id: '3', designNo: 'RING-0005', designName: 'Ring RING-0005', version: 'V1', jewelryGroup: 'Ring', jewelrySize: 'US 6', diamondType: 'Natural Diamonds - GH/VS', diamondSpread: 'Full Eternity', goldColour: '18 Karat-White-Gold', collection: 'Gold', stoneInfo: 'Diamond 0', price: 775.75, tags: ['Diamond Ring', 'Wedding'], stage: 'Production', status: 'Active', remarks: 'Wedding bestseller', isActive: true, createdAt: '2025-10-19 11:40', modifiedAt: '2026-02-18 10:51', updatedByName: '' },
  { id: '4', designNo: 'RING-0004', designName: 'Ring RING-0004', version: 'V2', jewelryGroup: 'Ring', jewelrySize: 'US 6', diamondType: 'Lab Diamonds - EF/VVS-VS', diamondSpread: '3/4 Way', goldColour: '18 Karat-White-Gold', collection: 'Gold', stoneInfo: 'Diamond 0', price: 1954.25, tags: ['Diamond Ring'], stage: 'Polish', status: 'Active', remarks: 'Premium edition', isActive: true, createdAt: '2025-10-01 09:15', modifiedAt: '2026-02-20 17:05', updatedByName: '' },
  { id: '5', designNo: 'NP-0001', designName: 'Nose Pin NP-0001', version: 'V1', jewelryGroup: 'Nose Pin', jewelrySize: 'N/A', diamondType: 'Lab Diamonds - EF/VVS-VS', diamondSpread: '1/2 Way', goldColour: '22 karat-Rose-Gold', collection: 'Hermione', stoneInfo: 'None', price: 1951.6, tags: ['Minimal'], stage: 'Sketch', status: 'Inactive', remarks: 'Paused for revision', isActive: false, createdAt: '2025-08-07 13:20', modifiedAt: '2026-01-25 11:35', updatedByName: '' },
  { id: '6', designNo: 'RING-0003', designName: 'Ring RING-0003', version: 'V1', jewelryGroup: 'Ring', jewelrySize: 'US 6', diamondType: 'Natural Diamonds - GH/VS', diamondSpread: 'Full Eternity', goldColour: '22 karat-White-Gold', collection: 'Gold', stoneInfo: 'Diamond 0', price: 2871.74, tags: ['Diamond Ring', 'Gold Pendant'], stage: 'Production', status: 'Active', remarks: 'High-value custom request', isActive: true, createdAt: '2025-07-28 08:40', modifiedAt: '2026-02-22 09:05', updatedByName: '' },
  { id: '7', designNo: 'RING-0002', designName: 'Ring RING-0002', version: 'V2', jewelryGroup: 'Ring', jewelrySize: 'US 8', diamondType: 'Natural Diamonds - GH/VS', diamondSpread: '3/4 Way', goldColour: '18 K-Yellow-Gold', collection: 'Casual', stoneInfo: 'Aquamarine 0', price: 3247.69, tags: ['Diamond Ring'], stage: 'Quality Check', status: 'Active', remarks: 'Awaiting bulk order', isActive: true, createdAt: '2025-07-11 16:25', modifiedAt: '2026-02-23 10:45', updatedByName: '' },
  { id: '8', designNo: 'E-0001', designName: 'Earring E-0001', version: 'V1', jewelryGroup: 'Earring', jewelrySize: '6 Inches', diamondType: 'Lab Diamonds - EF/VVS-VS', diamondSpread: '1/2 Way', goldColour: '22 karat-Rose-Gold', collection: 'Gold', stoneInfo: 'Diamond 0', price: 3555.63, tags: ['Gold Earring'], stage: 'Dispatch', status: 'Active', remarks: 'Ready for handoff', isActive: true, createdAt: '2025-06-15 09:00', modifiedAt: '2026-02-24 19:15', updatedByName: '' },
];

const defaultForm: DesignForm = {
  designNo: '',
  designName: '',
  version: 'V1',
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
  color: '',
  quality: '',
  priceIn: 'WT',
  sellingPrice: '',
  weightPerPc: '',
  weightIn: 'CTS',
};

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
  return (
    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      {text}
    </span>
  );
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
    ) : label === 'New Version' ? (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="12" height="12" rx="2" />
        <path d="M8 8h4M8 12h6" />
        <path d="M16 8h4v12a2 2 0 0 1-2 2H8" />
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
      className="app-table-icon-action"
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

function MediaPreview({
  url,
  alt,
  className,
  controls = false,
}: {
  url: string;
  alt: string;
  className: string;
  controls?: boolean;
}) {
  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        className={className}
        controls={controls}
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return <img src={url} alt={alt} className={className} />;
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
  const [importingDesigns, setImportingDesigns] = useState(false);
  const [savingDesign, setSavingDesign] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDesignIds, setSelectedDesignIds] = useState<string[]>([]);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<DesignListColumnKey[]>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_DESIGN_LIST_COLUMNS;
    }

    try {
      const raw = window.localStorage.getItem(DESIGN_LIST_COLUMNS_STORAGE_KEY);
      if (!raw) {
        return DEFAULT_DESIGN_LIST_COLUMNS;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return DEFAULT_DESIGN_LIST_COLUMNS;
      }

      const sanitized = parsed.filter((item): item is DesignListColumnKey =>
        DESIGN_LIST_COLUMNS.some((column) => column.key === item),
      );

      return sanitized.length > 0 ? sanitized : DEFAULT_DESIGN_LIST_COLUMNS;
    } catch {
      return DEFAULT_DESIGN_LIST_COLUMNS;
    }
  });
  const [isDesignNoManual, setIsDesignNoManual] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DesignForm>(defaultForm);
  const [filters, setFilters] = useState({
    jewelryGroup: '',
    collection: '',
    jewelrySize: '',
    tags: '',
    status: '',
    goldColour: '',
    stonePacket: '',
  });
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
    laborHead: '',
    laborPerUnit: '',
    unitQty: '',
    laborValue: '',
  }]);
  const [findingRows, setFindingRows] = useState<FindingRow[]>([]);
  const [processRows, setProcessRows] = useState<ProcessRow[]>([
    { id: makeId(), stage: 'CAD', netWeight: '5', duration: '45', remarks: 'Initial modeling' },
    { id: makeId(), stage: 'Casting', netWeight: '5', duration: '90', remarks: 'Primary cast run' },
  ]);
  const [pricingRows, setPricingRows] = useState<PricingRow[]>([{ id: makeId(), title: 'Retail Tier', qty: '10', rate: '1745.45' }]);
  const [vendorRows, setVendorRows] = useState<VendorRow[]>([{ id: makeId(), supplier: '', stockType: 'Production', supplierStyleNo: '' }]);
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
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [stlItem, setStlItem] = useState<StlItem | null>(null);
  const [stlUploading, setStlUploading] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [showInlineMasterModal, setShowInlineMasterModal] = useState(false);
  const [inlineMasterType, setInlineMasterType] = useState<DesignMasterType | null>(null);
  const [inlineMasterValue, setInlineMasterValue] = useState('');
  const [inlineMasterAliasName, setInlineMasterAliasName] = useState('');
  const [inlineMasterDescription, setInlineMasterDescription] = useState('');
  const [inlineFindingNo, setInlineFindingNo] = useState('');
  const [inlineJewelryGroupId, setInlineJewelryGroupId] = useState('');
  const [inlineMetalCaratage, setInlineMetalCaratage] = useState('');
  const [inlineMetalName, setInlineMetalName] = useState('');
  const [inlineMetalColor, setInlineMetalColor] = useState('');
  const [inlineMetalPurity, setInlineMetalPurity] = useState('');
  const [inlineDefaultWastagePercent, setInlineDefaultWastagePercent] = useState('');
  const [inlinePriceIn, setInlinePriceIn] = useState<'PIECES' | 'GRAM' | 'PAIR' | 'INCHES'>('PIECES');
  const [inlinePricePerUnit, setInlinePricePerUnit] = useState('');
  const [inlineDimensions, setInlineDimensions] = useState('');
  const [inlineWeightPerUnit, setInlineWeightPerUnit] = useState('');
  const [historyRows, setHistoryRows] = useState<DesignHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [detailDesign, setDetailDesign] = useState<any | null>(null);
  const [detailDesignLoading, setDetailDesignLoading] = useState(false);
  const [detailDesignError, setDetailDesignError] = useState<string | null>(null);
  const [showStlViewerModal, setShowStlViewerModal] = useState(false);
  const [listMediaViewer, setListMediaViewer] = useState<ListMediaViewerState | null>(null);
  const designImportInputRef = useRef<HTMLInputElement | null>(null);
  const columnPickerRef = useRef<HTMLDivElement | null>(null);
  const [sourceDesignNo, setSourceDesignNo] = useState('');
  const inlineMasterCreatedHandlerRef = useRef<((masterValue: string) => void) | null>(null);
  const galleryUploadInputRef = useRef<HTMLInputElement | null>(null);
  const stlUploadInputRef = useRef<HTMLInputElement | null>(null);
  const selectAllVisibleCheckboxRef = useRef<HTMLInputElement | null>(null);
  const designNoRequestSeqRef = useRef(0);

  const selected = useMemo(() => rows.find((item) => item.id === selectedId) ?? rows[0] ?? null, [rows, selectedId]);
  const detailInfo = detailDesign ?? selected;
  const detailGalleryUrls = useMemo(
    () => normalizeStringArray(detailInfo?.imageUrls).map(resolvePublicAssetUrl),
    [detailInfo],
  );
  const detailStlUrl = useMemo(
    () => (detailInfo?.stlFileUrl ? resolvePublicAssetUrl(detailInfo.stlFileUrl) : ''),
    [detailInfo],
  );
  const detailMetals = useMemo(
    () => (Array.isArray(detailDesign?.metals) ? detailDesign.metals : []),
    [detailDesign],
  );
  const detailGemstones = useMemo(
    () => (Array.isArray(detailDesign?.gemstones) ? detailDesign.gemstones : []),
    [detailDesign],
  );
  const detailLabors = useMemo(
    () => (Array.isArray(detailDesign?.labors) ? detailDesign.labors : []),
    [detailDesign],
  );
  const detailSummary = useMemo(() => {
    return {
      metalValue: parseNumericValue(detailDesign?.metalValue),
      gemValue: parseNumericValue(detailDesign?.gemValue),
      laborValue: parseNumericValue(detailDesign?.laborValue),
      findingValue: parseNumericValue(detailDesign?.findingValue),
      totalValue: parseNumericValue(detailDesign?.totalValue),
    };
  }, [detailDesign]);
  const detailPacketNameMap = useMemo(() => {
    const next = new Map<string, string>();
    packetOptions.forEach((packet) => {
      if (packet.id) {
        next.set(packet.id, packet.packetName);
      }
    });
    return next;
  }, [packetOptions]);
  const resolveDetailPacketName = (gem: any): string => {
    const packetId = String(gem?.packetId || '').trim();
    if (packetId && detailPacketNameMap.has(packetId)) {
      return detailPacketNameMap.get(packetId) || packetId;
    }

    const match = packetOptions.find((packet) =>
      normalizeLookupKey(packet.stone) === normalizeLookupKey(gem?.stone) &&
      normalizeLookupKey(packet.shape) === normalizeLookupKey(gem?.shape) &&
      normalizeLookupKey(packet.size) === normalizeLookupKey(gem?.size) &&
      normalizeLookupKey(packet.color) === normalizeLookupKey(gem?.color) &&
      normalizeLookupKey(packet.quality) === normalizeLookupKey(gem?.quality),
    );
    return match?.packetName || packetId || '-';
  };
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
  const filteredJewelrySizeOptions = useMemo(() => {
    const selectedGroup = normalizeLookupKey(form.jewelryGroup);
    if (!selectedGroup) {
      return [];
    }
    return masterOptions.jewelrySizes.filter(
      (option) => normalizeLookupKey(option.jewelryGroup) === selectedGroup,
    );
  }, [form.jewelryGroup, masterOptions.jewelrySizes]);
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
    if (modal !== 'info' || !selectedId) {
      setDetailDesign(null);
      setDetailDesignLoading(false);
      setDetailDesignError(null);
      return;
    }

    let active = true;
    setDetailDesignLoading(true);
    setDetailDesignError(null);
    void (async () => {
      try {
        const response = await api.get(`/products/${selectedId}`);
        if (!active) return;
        setDetailDesign(response.data);
      } catch (error: any) {
        if (!active) return;
        setDetailDesignError(String(error?.response?.data?.message || 'Unable to load design details.'));
      } finally {
        if (active) setDetailDesignLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [modal, selectedId]);
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
  const galleryLibraryItems = useMemo(() => {
    const seen = new Set<string>();
    const items: GalleryItem[] = [];

    rows.forEach((row) => {
      const urls = row.imageUrls || [];
      const keys = row.imageKeys && row.imageKeys.length ? row.imageKeys : urls;
      urls.forEach((url, index) => {
        const key = keys[index] || url;
        if (!key || seen.has(key)) return;
        seen.add(key);
        items.push({ url, key });
      });
    });

    return items;
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

  const getJewelryGroupAlias = (jewelryGroup: string): string => {
    const match = masterOptions.jewelryGroups.find(
      (option) => normalizeLookupKey(option.value) === normalizeLookupKey(jewelryGroup),
    );
    return match?.aliasName || '';
  };

  const suggestNextDesignNo = (jewelryGroup: string): string =>
    getNextDesignNo(jewelryGroup, rows, getJewelryGroupAlias(jewelryGroup));

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
    const nextJewelrySizeOptions = masterOptions.jewelrySizes.filter(
      (option) => normalizeLookupKey(option.jewelryGroup) === normalizeLookupKey(jewelryGroup),
    );
    setForm((prev) => ({
      ...prev,
      jewelryGroup,
      jewelrySize: nextJewelrySizeOptions.some(
        (option) => normalizeLookupKey(option.value) === normalizeLookupKey(prev.jewelrySize),
      )
        ? prev.jewelrySize
        : '',
      designNo: isDesignNoManual ? prev.designNo : suggestNextDesignNo(jewelryGroup),
    }));

    if (!isDesignNoManual) {
      syncDesignNoFromServer(jewelryGroup);
    }
  };

  const galleryKeys = useMemo(() => galleryItems.map((item) => item.key), [galleryItems]);

  const buildGalleryItems = (urls: string[], keys?: string[]): GalleryItem[] => {
    const normalizedUrls = urls.filter(Boolean);
    const normalizedKeys = (keys && keys.length ? keys : urls).filter(Boolean);
    return normalizedUrls.map((url, index) => ({
      url,
      key: normalizedKeys[index] || url,
    }));
  };

  const addGalleryItems = (items: Array<{ url: string; key?: string }>) => {
    setGalleryItems((prev) => {
      const next = [...prev];
      const seen = new Set(next.map((item) => item.key));
      items.forEach((item) => {
        const url = item.url?.trim();
        if (!url) return;
        const key = (item.key || url).trim();
        if (!key || seen.has(key)) return;
        seen.add(key);
        next.push({ url, key });
      });
      return next;
    });
  };

  const removeGalleryItem = (index: number) => {
    setGalleryItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const setPrimaryGalleryItem = (index: number) => {
    setGalleryItems((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      return [item, ...next];
    });
  };

  const moveGalleryItem = (index: number, step: -1 | 1) => {
    setGalleryItems((prev) => {
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

    const mediaFiles = files.filter(isGalleryUploadFile);
    if (mediaFiles.length === 0) {
      window.alert('Please select image or video files only.');
      return;
    }

    const formData = new FormData();
    mediaFiles.forEach((file) => formData.append('files', file));

    setGalleryUploading(true);
    try {
      const response = await api.post('/products/gallery-files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const items = (response.data?.files || [])
        .map((file: { url?: string; key?: string }) => ({
          url: file?.url || '',
          key: file?.key || file?.url || '',
        }))
        .filter((item: { url: string; key: string }) => Boolean(item.url));

      if (items.length === 0) {
        window.alert('No media files were uploaded.');
      } else {
        addGalleryItems(items);
      }

      if (mediaFiles.length !== files.length) {
        window.alert('Only image/video files were uploaded. Unsupported files were skipped.');
      }
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to upload media.');
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleStlUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    const stlFiles = files.filter(isStlUploadFile);
    if (stlFiles.length === 0) {
      window.alert('Please select STL files only.');
      return;
    }

    const formData = new FormData();
    stlFiles.forEach((file) => formData.append('files', file));

    setStlUploading(true);
    try {
      const response = await api.post('/products/stl-files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploaded = (response.data?.files || [])
        .map((file: { url?: string; key?: string; fileName?: string }) => ({
          url: file?.url || '',
          key: file?.key || file?.url || '',
          fileName: file?.fileName || getFileNameFromUrl(file?.url || ''),
        }))
        .filter((item: StlItem) => Boolean(item.url));

      if (uploaded.length === 0) {
        window.alert('No STL files were uploaded.');
      } else {
        setStlItem(uploaded[0]);
      }

      if (stlFiles.length !== files.length) {
        window.alert('Only STL files were uploaded. Unsupported files were skipped.');
      }
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to upload STL file.');
    } finally {
      setStlUploading(false);
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

  const fetchDesignHistory = async (designId: string) => {
    if (!designId) {
      setHistoryRows([]);
      setHistoryError(null);
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await api.get(`/products/${designId}/history`);
      const mapped = (Array.isArray(response.data) ? response.data : []).map((entry: any) => ({
        id: entry?.id || makeId(),
        actionType: String(entry?.actionType || '').trim(),
        remarks: String(entry?.remarks || '').trim(),
        user: String(entry?.user || '').trim() || 'System',
        dateTime: entry?.dateTime ? new Date(entry.dateTime).toLocaleString() : '-',
      })) as DesignHistoryRow[];
      setHistoryRows(mapped);
    } catch (error: any) {
      setHistoryRows([]);
      setHistoryError(error?.response?.data?.message || 'Unable to load history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const applyPacketToGemRow = (rowId: string, packetId: string) => {
    const packet = packetOptions.find((entry) => entry.id === packetId);
    setGemRows((prev) => {
      if (packet) {
        const packetAlreadyUsed = prev.some((row) => row.id !== rowId && row.packetId === packet.id);
        if (packetAlreadyUsed) {
          window.alert('This packet is already used in another line.');
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
            pricePerCt: '',
            amount: '',
          };
        }

        const pieces = Math.max(0, Number(packet.pieces || 0));
        const explicitWeightPerPc = Math.max(0, Number(packet.weightPerPc || 0));
        const totalWeight = Math.max(0, Number(packet.weight || 0));
        const wtPerPcs = explicitWeightPerPc > 0 ? explicitWeightPerPc : pieces > 0 ? totalWeight / pieces : 0;
        const wtInCts = wtPerPcs * pieces;
        const rate = Math.max(0, Number(packet.sellingPrice || 0));
        const amount = wtInCts * rate;

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
          pricePerCt: rate > 0 ? rate.toFixed(2) : '',
          amount: amount > 0 ? amount.toFixed(2) : '',
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
    setInlineJewelryGroupId('');
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
    const selectedJewelryGroupId =
      masterType === 'JEWELRY_SIZE'
        ? masterOptions.jewelryGroups.find(
            (option) => normalizeLookupKey(option.value) === normalizeLookupKey(form.jewelryGroup),
          )?.id || ''
        : '';
    setInlineMasterType(masterType);
    setInlineMasterValue('');
    setInlineMasterAliasName('');
    setInlineMasterDescription('');
    setInlineFindingNo('');
    setInlineJewelryGroupId(selectedJewelryGroupId);
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
    const jewelrySizePayload =
      inlineMasterType === 'JEWELRY_SIZE'
        ? {
            jewelryGroupId: inlineJewelryGroupId,
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
    if (inlineMasterType === 'JEWELRY_SIZE' && !inlineJewelryGroupId.trim()) {
      window.alert('Jewelry Group is required.');
      return;
    }

    setCreatingMasterType(inlineMasterType);
    try {
      const response = await api.post('/products/masters', {
        masterType: inlineMasterType,
        value,
        aliasName,
        description: descriptionPayload,
        ...(jewelrySizePayload || {}),
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
      color: packetForm.color.trim(),
      quality: packetForm.quality.trim(),
      priceIn: packetForm.priceIn,
      sellingPrice: parseNum(packetForm.sellingPrice),
      weightPerPc: parseNum(packetForm.weightPerPc),
      pieces: 1,
      weight: parseNum(packetForm.weightPerPc),
      weightUnit: packetForm.weightIn === 'GRAM' ? 'GMS' : 'CTS',
    };

    if (!payload.packetName || !payload.stone || !payload.shape || !payload.size || !payload.color || !payload.quality) {
      window.alert('Packet Name, Stone, Shape, Size, Color and Quality are required.');
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
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(
      DESIGN_LIST_COLUMNS_STORAGE_KEY,
      JSON.stringify(visibleColumns),
    );
  }, [visibleColumns]);

  useEffect(() => {
    if (!showColumnPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!columnPickerRef.current?.contains(event.target as Node)) {
        setShowColumnPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnPicker]);

  useEffect(() => {
    if (!packetOptions.length) return;
    setGemRows((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        if (row.packetId) return row;
        if (!row.stone && !row.shape && !row.size && !row.color && !row.quality) {
          return row;
        }
        const match = packetOptions.find((packet) =>
          normalizeLookupKey(packet.stone) === normalizeLookupKey(row.stone) &&
          normalizeLookupKey(packet.shape) === normalizeLookupKey(row.shape) &&
          normalizeLookupKey(packet.size) === normalizeLookupKey(row.size) &&
          normalizeLookupKey(packet.color) === normalizeLookupKey(row.color) &&
          normalizeLookupKey(packet.quality) === normalizeLookupKey(row.quality),
        );
        if (!match) return row;
        changed = true;
        return { ...row, packetId: match.id };
      });
      return changed ? next : prev;
    });
  }, [packetOptions, gemRows]);

  useEffect(() => {
    if (modal !== 'history' || !selectedId) return;
    fetchDesignHistory(selectedId);
  }, [modal, selectedId]);

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

        let nextRow = row;
        let changed = false;
        if (nextPricePerGm !== row.pricePerGm) {
          nextRow = { ...nextRow, pricePerGm: nextPricePerGm };
          changed = true;
        }
        if (nextWastagePercent !== row.wastagePercent) {
          nextRow = { ...nextRow, wastagePercent: nextWastagePercent };
          changed = true;
        }

        if (!changed) {
          return row;
        }

        nextRow = applyMetalWeightFromPercent(nextRow);
        nextRow = applyMetalValueFromRate(nextRow);
        return nextRow;
      }),
    );
  }, [masterOptions.metalCaratages, masterOptions.goldColours]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((item) => {
      if (showInactive ? item.isActive : !item.isActive) return false;
      const hay = [item.designNo, item.designName, item.version, item.jewelryGroup, item.jewelrySize, item.diamondType, item.diamondSpread, item.goldColour, item.collection, item.stoneInfo, item.tags.join(' '), item.stage, item.status].join(' ').toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (filters.jewelryGroup && item.jewelryGroup !== filters.jewelryGroup) return false;
      if (filters.collection && item.collection !== filters.collection) return false;
      if (filters.jewelrySize && item.jewelrySize !== filters.jewelrySize) return false;
      if (filters.tags && !item.tags.join(' ').toLowerCase().includes(filters.tags.toLowerCase())) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.goldColour && !item.goldColour.toLowerCase().includes(filters.goldColour.toLowerCase())) return false;
      if (filters.stonePacket && !item.stoneInfo.toLowerCase().includes(filters.stonePacket.toLowerCase())) return false;
      return true;
    });
  }, [filters, rows, search, showInactive]);

  const isColumnVisible = (key: DesignListColumnKey) => visibleColumns.includes(key);

  const toggleColumnVisibility = (key: DesignListColumnKey) => {
    setVisibleColumns((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((item) => item !== key);
        return next.length > 0 ? next : prev;
      }
      const next = [...prev, key];
      return DESIGN_LIST_COLUMNS.filter((column) => next.includes(column.key)).map((column) => column.key);
    });
  };

  const resetVisibleColumns = () => {
    setVisibleColumns(DEFAULT_DESIGN_LIST_COLUMNS);
  };

  const showAllColumns = () => {
    setVisibleColumns(DESIGN_LIST_COLUMNS.map((column) => column.key));
  };

  const openListMediaViewer = (row: DesignRow, startIndex = 0) => {
    const items = (row.imageUrls || []).map((url, index) => ({
      key: row.imageKeys?.[index] || `${row.id}-${index}`,
      url,
    }));

    if (!items.length) {
      return;
    }

    const safeIndex = Math.min(Math.max(startIndex, 0), items.length - 1);
    setListMediaViewer({
      title: row.designNo || 'DESIGN MEDIA',
      items,
      activeIndex: safeIndex,
    });
  };

  const pageSize = 15;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRows.length / pageSize)),
    [filteredRows.length],
  );
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);
  const showingFrom = filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, filteredRows.length);

  const visibleRowIds = useMemo(() => pagedRows.map((row) => row.id), [pagedRows]);
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

  useEffect(() => {
    setPage(1);
  }, [search, showInactive, filters]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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

  const applyMetalWeightFromPercent = (row: MetalRow): MetalRow => {
    const hasAnyInput = row.netWt.trim().length > 0 || row.wastagePercent.trim().length > 0;
    if (!hasAnyInput) {
      return { ...row, wastageWt: '', totalWt: '' };
    }
    const netWt = Math.max(0, parseNum(row.netWt));
    const wastagePercent = Math.max(0, parseNum(row.wastagePercent));
    const wastageWt = (netWt * wastagePercent) / 100;
    const totalWt = netWt + wastageWt;
    return {
      ...row,
      wastageWt: wastageWt.toFixed(3),
      totalWt: totalWt.toFixed(3),
    };
  };

  const applyMetalWeightFromWastageWt = (row: MetalRow): MetalRow => {
    const hasAnyInput = row.netWt.trim().length > 0 || row.wastageWt.trim().length > 0;
    if (!hasAnyInput) {
      return { ...row, wastagePercent: '', totalWt: '' };
    }
    const netWt = Math.max(0, parseNum(row.netWt));
    const wastageWt = Math.max(0, parseNum(row.wastageWt));
    const wastagePercent = netWt > 0 ? (wastageWt * 100) / netWt : 0;
    const totalWt = netWt + wastageWt;
    return {
      ...row,
      wastagePercent: wastagePercent.toFixed(2),
      totalWt: totalWt.toFixed(3),
    };
  };

  const applyMetalValueFromRate = (row: MetalRow): MetalRow => {
    const totalWt = Math.max(0, parseNum(row.totalWt));
    const rate = Math.max(0, parseNum(row.pricePerGm));
    if (row.pricePerGm.trim().length === 0 || totalWt <= 0) {
      return { ...row, value: '' };
    }
    return { ...row, value: (totalWt * rate).toFixed(2) };
  };

  const applyMetalRateFromValue = (row: MetalRow): MetalRow => {
    const totalWt = Math.max(0, parseNum(row.totalWt));
    const value = Math.max(0, parseNum(row.value));
    if (row.value.trim().length === 0 || totalWt <= 0) {
      return row;
    }
    return { ...row, pricePerGm: (value / totalWt).toFixed(2) };
  };

  const getGemWeight = (row: GemRow): number =>
    row.wtInCts.trim().length > 0
      ? Math.max(0, parseNum(row.wtInCts))
      : Math.max(0, parseNum(row.wtPerPcs)) * Math.max(0, parseNum(row.pcs));
  const getGemValue = (row: GemRow): number =>
    row.amount.trim().length > 0
      ? Math.max(0, parseNum(row.amount))
      : getGemWeight(row) * Math.max(0, parseNum(row.pricePerCt));

  const applyGemWeightFromPcs = (row: GemRow): GemRow => {
    const hasAnyInput = row.wtPerPcs.trim().length > 0 || row.pcs.trim().length > 0;
    if (!hasAnyInput) {
      return { ...row, wtInCts: '' };
    }
    const wtPerPcs = Math.max(0, parseNum(row.wtPerPcs));
    const pcs = Math.max(0, parseNum(row.pcs));
    return { ...row, wtInCts: (wtPerPcs * pcs).toFixed(3) };
  };

  const applyGemWtPerPcsFromWeight = (row: GemRow): GemRow => {
    const hasAnyInput = row.wtInCts.trim().length > 0 || row.pcs.trim().length > 0;
    if (!hasAnyInput) {
      return { ...row, wtPerPcs: '' };
    }
    const wtInCts = Math.max(0, parseNum(row.wtInCts));
    const pcs = Math.max(0, parseNum(row.pcs));
    if (pcs <= 0) {
      return { ...row, wtPerPcs: '' };
    }
    return { ...row, wtPerPcs: (wtInCts / pcs).toFixed(3) };
  };

  const applyGemAmountFromRate = (row: GemRow): GemRow => {
    const wt = Math.max(0, parseNum(row.wtInCts));
    const rate = Math.max(0, parseNum(row.pricePerCt));
    if (row.pricePerCt.trim().length === 0 || wt <= 0) {
      return { ...row, amount: '' };
    }
    return { ...row, amount: (wt * rate).toFixed(2) };
  };

  const applyGemRateFromAmount = (row: GemRow): GemRow => {
    const wt = Math.max(0, parseNum(row.wtInCts));
    const amount = Math.max(0, parseNum(row.amount));
    if (row.amount.trim().length === 0 || wt <= 0) {
      return row;
    }
    return { ...row, pricePerCt: (amount / wt).toFixed(2) };
  };

  const getLaborValue = (row: LaborRow): number =>
    parseNum(row.unitQty) * parseNum(row.laborPerUnit);
const getFindingValue = (row: FindingRow): number => {
  const manual = parseNum(row.findingValue);
  if (manual > 0) return manual;
  return parseNum(row.units) * parseNum(row.pricePerUnit);
};
const createDefaultVendorRow = (): VendorRow => ({
  id: makeId(),
  supplier: '',
  stockType: 'Production',
  supplierStyleNo: '',
});

  const costTotals = useMemo(() => {
    const metal = metalRows.reduce((sum, row) => sum + getMetalValue(row), 0);
    const gem = gemRows.reduce((sum, row) => sum + getGemValue(row), 0);
    const labor = laborRows.reduce((sum, row) => sum + getLaborValue(row), 0);
    const finding = findingRows.reduce((sum, row) => sum + getFindingValue(row), 0);
    const totalMetalNetWt = metalRows.reduce((sum, row) => sum + Math.max(0, parseNum(row.netWt)), 0);
    const totalGemWtInCts = gemRows.reduce((sum, row) => sum + getGemWeight(row), 0);
    const grossWeight = totalMetalNetWt + totalGemWtInCts / 5;
    return { metal, gem, labor, finding, grossWeight, total: metal + gem + labor + finding };
  }, [findingRows, gemRows, laborRows, metalRows]);

  const openAdd = () => {
    if (!canCreateDesign) {
      window.alert('You do not have permission to add designs.');
      return;
    }
    setEditingId(null);
    setIsDesignNoManual(false);
    setSourceDesignNo('');
    designNoRequestSeqRef.current += 1;
    const initialJewelryGroup = masterOptions.jewelryGroups[0]?.value || defaultForm.jewelryGroup;
    const autoDesignNo = suggestNextDesignNo(initialJewelryGroup);
    setForm({
      ...defaultForm,
      designNo: autoDesignNo,
      designName: `${initialJewelryGroup} ${autoDesignNo}`.trim(),
      version: defaultForm.version,
      jewelryGroup: initialJewelryGroup,
      stage: masterOptions.stages[0]?.value || defaultForm.stage,
      diamondType: masterOptions.diamondTypes[0]?.value || defaultForm.diamondType,
      diamondSpread: masterOptions.diamondSpreads[0]?.value || defaultForm.diamondSpread,
      designStatus: masterOptions.designStatuses[0]?.value || defaultForm.designStatus,
    });
    syncDesignNoFromServer(initialJewelryGroup);
    setTagPicker('');
    setGalleryItems([]);
    setStlItem(null);
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
      laborHead: '',
      laborPerUnit: '',
      unitQty: '',
      laborValue: '',
    }]);
    setFindingRows([]);
    setVendorRows([createDefaultVendorRow()]);
    setShowAddModal(true);
  };

  const fetchNextVersionFromServer = async (designNo: string): Promise<string> => {
    const trimmed = designNo.trim();
    if (!trimmed) return 'V1';
    const baseDesignNo = getBaseDesignNo(trimmed);
    try {
      const response = await api.get('/products/next-version', { params: { designNo: baseDesignNo } });
      const serverVersion = String(response.data?.version || '').trim();
      if (serverVersion) {
        return normalizeVersionInput(serverVersion);
      }
    } catch {
      // fall back to local calculation
    }
    return getNextDesignVersion(trimmed, rows);
  };

  const loadDesignDetail = async (row: DesignRow, overrides?: Partial<DesignForm>) => {
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
      const imageKeys = normalizeStringArray(detail.imageKeys ?? detail.imageUrls);
      const metals = Array.isArray(detail.metals) ? detail.metals : [];
      const gemstones = Array.isArray(detail.gemstones) ? detail.gemstones : [];
      const labors = Array.isArray(detail.labors) ? detail.labors : [];
      const findings = Array.isArray(detail.findings) ? detail.findings : [];
      const processStages = Array.isArray(detail.processStages) ? detail.processStages : [];
      const pricingTiers = Array.isArray(detail.pricingTiers) ? detail.pricingTiers : [];
      const vendors = Array.isArray(detail.vendors) ? detail.vendors : [];
      setSourceDesignNo(getBaseDesignNo(detail.designNo || row.designNo));

      const baseForm: DesignForm = {
        designNo: detail.designNo || row.designNo,
        designName: detail.designName || row.designName || detail.designNo || row.designNo,
        version: normalizeVersionInput(detail.version || row.version || 'V1'),
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
      };

      setForm({ ...baseForm, ...(overrides || {}) });

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
              laborHead: '',
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
          : [createDefaultVendorRow()],
      );

      setTagPicker('');
      setGalleryItems(buildGalleryItems(imageUrls, imageKeys));
      setStlItem(
        detail.stlFileUrl
          ? {
              url: resolvePublicAssetUrl(detail.stlFileUrl),
              key: String(detail.stlFileUrl),
              fileName:
                typeof detail.stlFiles?.[0]?.fileName === 'string' && detail.stlFiles[0].fileName.trim()
                  ? detail.stlFiles[0].fileName.trim()
                  : getFileNameFromUrl(String(detail.stlFileUrl)),
            }
          : null,
      );
      setShowGalleryPicker(false);
      setShowAddModal(true);
    } catch {
      const fallbackForm: DesignForm = {
        designNo: row.designNo,
        designName: row.designName || row.designNo,
        version: normalizeVersionInput(row.version || 'V1'),
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
      };
      setSourceDesignNo(getBaseDesignNo(row.designNo));
      setForm({ ...fallbackForm, ...(overrides || {}) });
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
      setGalleryItems(buildGalleryItems(row.imageUrls || [], row.imageKeys || row.imageUrls || []));
      setStlItem(null);
      setVendorRows([createDefaultVendorRow()]);
      setShowGalleryPicker(false);
      setShowAddModal(true);
    }
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

    await loadDesignDetail(row);
  };

  const openNewVersion = async (row: DesignRow) => {
    if (!canCreateDesign) {
      window.alert('You do not have permission to add designs.');
      return;
    }
    setEditingId(null);
    setIsDesignNoManual(true);
    designNoRequestSeqRef.current += 1;
    setSelectedId(row.id);
    const baseDesignNo = getBaseDesignNo(row.designNo);
    setSourceDesignNo(baseDesignNo);
    const nextVersion = await fetchNextVersionFromServer(baseDesignNo);
    const versionedDesignNo = buildVersionedDesignNo(baseDesignNo, nextVersion);
    await loadDesignDetail(row, { version: nextVersion, designNo: versionedDesignNo });
  };

  const saveDesign = async (options?: { forceCreate?: boolean; overrideVersion?: string; selectAfterCreate?: boolean; overrideDesignNo?: string }) => {
    const forceCreate = Boolean(options?.forceCreate);
    const isUpdate = Boolean(editingId) && !forceCreate;
    if (isUpdate) {
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

    const overrideDesignNo = options?.overrideDesignNo?.trim();
    const baseDesignNo =
      overrideDesignNo ||
      (forceCreate && sourceDesignNo ? sourceDesignNo : '') ||
      form.designNo.trim() ||
      (!isUpdate ? suggestNextDesignNo(form.jewelryGroup) : '');
    const resolvedDesignNo = baseDesignNo;
    const shouldSendDesignNo = isUpdate || isDesignNoManual || forceCreate;
    if (shouldSendDesignNo && !resolvedDesignNo) {
      window.alert('Design No is required.');
      return;
    }
    const resolvedVersion = normalizeVersionInput(options?.overrideVersion ?? form.version);
    const versionedDesignNo = buildVersionedDesignNo(resolvedDesignNo, resolvedVersion);

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

    const usedPacketIds = new Set<string>();
    for (let index = 0; index < gemRows.length; index += 1) {
      const row = gemRows[index];
      const wtPerPcs = parseNum(row.wtPerPcs);
      const pcs = parseNum(row.pcs);
      const wtInCts = parseNum(row.wtInCts);
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
      if (wtInCts < 0) {
        window.alert(`Wt(In Cts) cannot be negative in Stone row ${index + 1}.`);
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

      const packetKey = normalizeLookupKey(row.packetId);
      if (!packetKey) continue;
      if (usedPacketIds.has(packetKey)) {
        window.alert('Each Packet can be used only once.');
        return;
      }
      usedPacketIds.add(packetKey);
    }

    const basePayload = {
      designNo: shouldSendDesignNo ? versionedDesignNo : undefined,
      designName: form.designName.trim() || undefined,
      version: resolvedVersion,
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
      imageUrls: galleryKeys,
      stlFileUrl: stlItem?.key || stlItem?.url || undefined,
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
        laborValue: getLaborValue(row),
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
      if (isUpdate) {
        const canUpdate = /^[0-9a-fA-F-]{36}$/.test(editingId || '');
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
            if (options?.selectAfterCreate) {
              setEditingId(saved.id);
              setIsDesignNoManual(true);
              setForm((prev) => ({ ...prev, version: saved.version || resolvedVersion }));
            }
          }
        } else {
          const response = await api.post('/products', createPayload);
          const saved = mapApiDesignToRow(response.data as ApiDesignRow);
          setRows((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
          setSelectedId(saved.id);
          if (options?.selectAfterCreate) {
            setEditingId(saved.id);
            setIsDesignNoManual(true);
            setForm((prev) => ({ ...prev, version: saved.version || resolvedVersion }));
          }
        }
      } else {
        const response = await api.post('/products', createPayload);
        const saved = mapApiDesignToRow(response.data as ApiDesignRow);
        setRows((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
        setSelectedId(saved.id);
        if (options?.selectAfterCreate) {
          setEditingId(saved.id);
          setIsDesignNoManual(true);
          setForm((prev) => ({ ...prev, version: saved.version || resolvedVersion }));
        }
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

  const setDesignActiveStatus = async (id: string, nextActive: boolean) => {
    if (!canModifyExistingDesigns) {
      window.alert('You have read-only access for designs.');
      return;
    }

    if (deletingId) return;
    const confirmed = window.confirm(
      nextActive ? 'Activate this design? It will be marked active.' : 'Disable this design? It will be marked inactive.',
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await api.patch(`/products/${id}/status`, { isActive: nextActive });
      setRows((prev) => prev.map((item) => (item.id === id ? { ...item, isActive: nextActive } : item)));
      if ((showInactive && nextActive) || (!showInactive && !nextActive)) {
        setSelectedId((current) => (current === id ? '' : current));
      }
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to update design status.');
    } finally {
      setDeletingId(null);
    }
  };

  const updateMetalRow = (id: string, key: keyof Omit<MetalRow, 'id'>, value: string) => {
    setMetalRows((prev) => {
      if (['netWt', 'wastagePercent', 'wastageWt', 'pricePerGm', 'value'].includes(key) && isPartialDecimal(value)) {
        return prev.map((item) => (item.id === id ? { ...item, [key]: value } : item));
      }

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

        let updated: MetalRow = { ...item, [key]: value };
        if (key === 'goldColour') {
          const rate = getMetalRate(value);
          const defaultWastage = getMetalDefaultWastage(value);
          updated = {
            ...updated,
            wastagePercent: defaultWastage,
            pricePerGm: rate !== undefined ? rate.toFixed(2) : '',
          };
          updated = applyMetalWeightFromPercent(updated);
          return applyMetalValueFromRate(updated);
        }

        if (key === 'netWt' || key === 'wastagePercent') {
          updated = applyMetalWeightFromPercent(updated);
          return applyMetalValueFromRate(updated);
        }

        if (key === 'wastageWt') {
          updated = applyMetalWeightFromWastageWt(updated);
          return applyMetalValueFromRate(updated);
        }

        if (key === 'pricePerGm') {
          return applyMetalValueFromRate(updated);
        }

        if (key === 'value') {
          return applyMetalRateFromValue(updated);
        }

        return updated;
      });
    });
  };

  const updateGemRow = (id: string, key: keyof Omit<GemRow, 'id'>, value: string) => {
    setGemRows((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        let updated: GemRow = { ...item, [key]: value };

        if (['wtPerPcs', 'pcs', 'wtInCts', 'pricePerCt', 'amount'].includes(key) && isPartialDecimal(value)) {
          return updated;
        }

        if (key === 'wtPerPcs' || key === 'pcs') {
          updated = applyGemWeightFromPcs(updated);
          return applyGemAmountFromRate(updated);
        }

        if (key === 'wtInCts') {
          updated = applyGemWtPerPcsFromWeight(updated);
          return applyGemAmountFromRate(updated);
        }

        if (key === 'pricePerCt') {
          return applyGemAmountFromRate(updated);
        }

        if (key === 'amount') {
          return applyGemRateFromAmount(updated);
        }

        return updated;
      }),
    );
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

  const downloadBlob = (blob: Blob, fileName: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const exportExcel = async () => {
    try {
      const exportIds = filteredRows.map((item) => item.id);
      const response = await api.post(
        '/products/export/by-ids',
        { ids: exportIds },
        { responseType: 'blob' },
      );
      downloadBlob(
        new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        'designs-export.xlsx',
      );
    } catch (error) {
      console.error(error);
      window.alert('Failed to export designs.');
    }
  };

  const downloadDesignTemplate = async () => {
    try {
      const response = await api.get('/products/export/template', {
        responseType: 'blob',
      });
      downloadBlob(
        new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        'designs-import-template.xlsx',
      );
    } catch (error) {
      console.error(error);
      window.alert('Failed to download design import template.');
    }
  };

  const handleImportDesigns = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setImportingDesigns(true);
    try {
      const response = await api.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const summary = response.data as {
        totalRows: number;
        created: number;
        updated: number;
        failed: number;
        errors: string[];
      };
      const errorPreview =
        summary.errors.length > 0 ? `\n\nErrors:\n${summary.errors.slice(0, 10).join('\n')}` : '';
      window.alert(
        `Import completed.\nTotal Rows: ${summary.totalRows}\nCreated: ${summary.created}\nUpdated: ${summary.updated}\nFailed: ${summary.failed}${errorPreview}`,
      );
      await fetchDesignRows();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message;
      window.alert(Array.isArray(message) ? message.join(', ') : message || 'Failed to import designs.');
    } finally {
      setImportingDesigns(false);
    }
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

  const exportActionButtonClass =
    'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.35)] transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#AACDDC] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Design List</h1>
          <p className="text-sm text-gray-600">Design entries module for super admin review.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative" ref={columnPickerRef}>
            <button
              type="button"
              className={exportActionButtonClass}
              onClick={() => setShowColumnPicker((prev) => !prev)}
              title="Choose visible columns"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-[9px] font-bold text-slate-700">COL</span>
              <span>Columns</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {visibleColumns.length}
              </span>
            </button>
            {showColumnPicker ? (
              <div className="absolute left-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Visible Columns</p>
                    <p className="text-xs text-slate-500">
                      {visibleColumns.length} of {DESIGN_LIST_COLUMNS.length} shown in the list view
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                      onClick={showAllColumns}
                    >
                      Show all
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                      onClick={resetVisibleColumns}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DESIGN_LIST_COLUMNS.map((column) => (
                    <label
                      key={column.key}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={isColumnVisible(column.key)}
                        onChange={() => toggleColumnVisibility(column.key)}
                      />
                      <span>{column.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <Button type="button" size="sm" variant="secondary" className="shadow-[0_8px_20px_-16px_rgba(15,23,42,0.35)]" onClick={() => setShowFilters((prev) => !prev)}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shadow-[0_8px_20px_-16px_rgba(15,23,42,0.35)]"
            onClick={() => setShowInactive((prev) => !prev)}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
              <path d="M4 4l16 16" />
            </svg>
            {showInactive ? 'View Active' : 'View Inactive'}
          </Button>
          {canCreateDesign ? (
            <Button type="button" size="sm" className="shadow-[0_8px_20px_-16px_rgba(15,23,42,0.35)]" onClick={openAdd}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add New
            </Button>
          ) : null}
          <button
            type="button"
            className={exportActionButtonClass}
            onClick={downloadDesignTemplate}
            title="Download design import template"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-[9px] font-bold text-slate-700">TPL</span>
            <span>Template</span>
          </button>
          <button
            type="button"
            className={exportActionButtonClass}
            onClick={() => designImportInputRef.current?.click()}
            disabled={importingDesigns}
            title="Import designs from Excel workbook"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-sky-100 text-[9px] font-bold text-sky-700">IMP</span>
            <span>{importingDesigns ? 'Importing...' : 'Import Excel'}</span>
          </button>
          <button
            type="button"
            className={exportActionButtonClass}
            onClick={exportPdf}
            title="Export selected rows to PDF"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-red-100 text-[9px] font-bold text-red-700">PDF</span>
            <span>PDF file</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {selectedDesignIds.length}
            </span>
          </button>
          <button
            type="button"
            className={exportActionButtonClass}
            onClick={exportExcel}
            title="Export design list to Excel workbook"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-100 text-[9px] font-bold text-emerald-700">XLS</span>
            <span>Excel file</span>
          </button>
        </div>
        <input
          ref={designImportInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImportDesigns}
        />
      </div>

      <Card>
        {showFilters && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="mb-3 text-sm font-semibold text-gray-800">Filters</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Jewelry Group</label>
                <select
                  className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                  value={filters.jewelryGroup}
                  onChange={(event) => setFilters((prev) => ({ ...prev, jewelryGroup: event.target.value }))}
                >
                  <option value="">All</option>
                  {masterOptions.jewelryGroups.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Collection</label>
                <select
                  className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                  value={filters.collection}
                  onChange={(event) => setFilters((prev) => ({ ...prev, collection: event.target.value }))}
                >
                  <option value="">All</option>
                  {masterOptions.collections.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Jewelry Size</label>
                <select
                  className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                  value={filters.jewelrySize}
                  onChange={(event) => setFilters((prev) => ({ ...prev, jewelrySize: event.target.value }))}
                >
                  <option value="">All</option>
                  {masterOptions.jewelrySizes.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Tags</label>
                <select
                  className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                  value={filters.tags}
                  onChange={(event) => setFilters((prev) => ({ ...prev, tags: event.target.value }))}
                >
                  <option value="">All</option>
                  {masterOptions.tags.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Stone Packet</label>
                <select
                  className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                  value={filters.stonePacket}
                  onChange={(event) => setFilters((prev) => ({ ...prev, stonePacket: event.target.value }))}
                >
                  <option value="">All</option>
                  {packetOptions.map((option) => (
                    <option key={option.id} value={option.packetName}>
                      {option.packetName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Metal Caratage</label>
                <select
                  className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                  value={filters.goldColour}
                  onChange={(event) => setFilters((prev) => ({ ...prev, goldColour: event.target.value }))}
                >
                  <option value="">All</option>
                  {masterOptions.metalCaratages.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.value}
                    </option>
                  ))}
                </select>
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

        <div className="app-table-shell">
          <div className="app-table-scroll scrollbar-top">
            <table className="app-table app-table-compact">
              <thead>
              <tr>
                <th className="app-table-head-cell">
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
                {isColumnVisible('media') ? <th className="app-table-head-cell">Media</th> : null}
                {isColumnVisible('designNo') ? <th className="app-table-head-cell">Design No.</th> : null}
                {isColumnVisible('jewelryGroup') ? <th className="app-table-head-cell">Jewelry Group</th> : null}
                {isColumnVisible('jewelrySize') ? <th className="app-table-head-cell">Jewelry Size</th> : null}
                {isColumnVisible('metalInfo') ? <th className="app-table-head-cell">Metal Info</th> : null}
                {isColumnVisible('collection') ? <th className="app-table-head-cell">Collection</th> : null}
                {isColumnVisible('stoneInfo') ? <th className="app-table-head-cell">Stone Info</th> : null}
                {isColumnVisible('price') ? <th className="app-table-head-cell">Price</th> : null}
                {isColumnVisible('tags') ? <th className="app-table-head-cell">Tags</th> : null}
                {isColumnVisible('stage') ? <th className="app-table-head-cell">Stage</th> : null}
                {isColumnVisible('status') ? <th className="app-table-head-cell">Status</th> : null}
                {isColumnVisible('updatedBy') ? <th className="app-table-head-cell">Updated By</th> : null}
                {isColumnVisible('modifiedAt') ? <th className="app-table-head-cell">Modified</th> : null}
                <th className="app-table-head-cell">Action</th>
              </tr>
              </thead>
              <tbody>
              {pagedRows.map((row, idx) => (
                <tr key={row.id} className="app-table-row">
                  <td className="app-table-cell text-sm text-slate-600">
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
                  {isColumnVisible('media') ? (
                  <td className="app-table-cell">
                    {row.imageUrls?.[0] ? (
                      <button
                        type="button"
                        className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#AACDDC] focus-visible:ring-offset-2"
                        onClick={() => openListMediaViewer(row)}
                        title="Open media viewer"
                      >
                        <MediaPreview
                          url={row.imageUrls[0]}
                          alt={`${row.designNo} preview`}
                          className="h-10 w-10 rounded-xl border border-slate-200 object-cover shadow-sm transition group-hover:border-slate-300 group-hover:shadow-md"
                        />
                      </button>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-semibold tracking-[0.12em] text-slate-400">N/A</div>
                    )}
                  </td>
                  ) : null}
                  {isColumnVisible('designNo') ? (
                  <td className="app-table-cell text-left text-sm font-semibold whitespace-nowrap">
                    <button
                      type="button"
                      className="whitespace-nowrap text-slate-900 underline-offset-4 transition hover:text-primary-700 hover:underline"
                      onClick={() => openEdit(row)}
                      title={row.designName ? `${row.designNo} - ${row.designName}` : 'Edit design'}
                    >
                      {row.designNo}
                    </button>
                  </td>
                  ) : null}
                  {isColumnVisible('jewelryGroup') ? <td className="app-table-cell whitespace-nowrap text-sm text-slate-700">{row.jewelryGroup}</td> : null}
                  {isColumnVisible('jewelrySize') ? <td className="app-table-cell whitespace-nowrap text-sm text-slate-700">{row.jewelrySize}</td> : null}
                  {isColumnVisible('metalInfo') ? <td className="app-table-cell whitespace-nowrap text-sm text-slate-700">{row.goldColour || '-'}</td> : null}
                  {isColumnVisible('collection') ? <td className="app-table-cell whitespace-nowrap text-sm text-slate-700">{row.collection}</td> : null}
                  {isColumnVisible('stoneInfo') ? (
                  <td className="app-table-cell text-sm text-slate-700">
                    <span className="inline-flex whitespace-nowrap rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">
                      {row.stoneInfo}
                    </span>
                  </td>
                  ) : null}
                  {isColumnVisible('price') ? <td className="app-table-cell whitespace-nowrap text-sm font-semibold text-slate-800">{formatMoney(row.price)}</td> : null}
                  {isColumnVisible('tags') ? (
                  <td className="app-table-cell">
                    <div className="flex flex-nowrap gap-1.5 overflow-hidden">{row.tags.map((tag) => <Tag key={`${row.id}-${tag}`} text={tag} />)}</div>
                  </td>
                  ) : null}
                  {isColumnVisible('stage') ? <td className="app-table-cell whitespace-nowrap text-sm text-slate-700">{row.stage || '-'}</td> : null}
                  {isColumnVisible('status') ? <td className="app-table-cell whitespace-nowrap text-sm text-slate-700">{row.status || (row.isActive ? 'Active' : 'Inactive')}</td> : null}
                  {isColumnVisible('updatedBy') ? <td className="app-table-cell whitespace-nowrap text-sm text-slate-700">{row.updatedByName || '-'}</td> : null}
                  {isColumnVisible('modifiedAt') ? <td className="app-table-cell whitespace-nowrap text-sm text-slate-700">{row.modifiedAt || '-'}</td> : null}
                  <td className="app-table-cell">
                    <div className="flex flex-nowrap gap-1">
                      <Action label="View" onClick={() => { setSelectedId(row.id); setModal('info'); }} />
                      <Action label="History" onClick={() => { setSelectedId(row.id); setModal('history'); }} />
                      {canCreateDesign ? (
                        <Action label="New Version" onClick={() => openNewVersion(row)} />
                      ) : null}
                      {canModifyExistingDesigns ? (
                        <>
                          <Action label="Edit" onClick={() => openEdit(row)} />
                          {row.isActive ? (
                            <button
                              type="button"
                              title="Disable"
                              aria-label="Disable"
                              className="app-table-icon-action border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => setDesignActiveStatus(row.id, false)}
                              disabled={deletingId === row.id}
                            >
                              {deletingId === row.id ? (
                                '...'
                              ) : (
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="9" />
                                  <path d="M5 5l14 14" />
                                </svg>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              title="Activate"
                              aria-label="Activate"
                              className="app-table-icon-action border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => setDesignActiveStatus(row.id, true)}
                              disabled={deletingId === row.id}
                            >
                              {deletingId === row.id ? (
                                '...'
                              ) : (
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                            </button>
                          )}
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 space-y-1 text-sm text-gray-600">
          <p>Showing {showingFrom}-{showingTo} of {filteredRows.length} entries</p>
          <p className="text-xs text-blue-700">
            {canModifyExistingDesigns
              ? 'Tip: Click a Design No or use the Edit button in Action to edit an existing design.'
              : 'Tip: Click View to inspect an existing design.'}
          </p>
          <p className="text-xs text-gray-500">
            Selected rows for PDF export: {selectedDesignIds.length}
          </p>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </Card>

      {showAddModal && (
        <Modal title="ADD NEW DESIGN" size="max-w-[98vw]" onClose={() => { setShowGalleryPicker(false); setShowStlViewerModal(false); setShowAddModal(false); setEditingId(null); }}>
          <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 [&_input]:rounded-md [&_input]:border-slate-300 [&_input]:bg-white [&_input]:text-slate-800 [&_input]:placeholder:text-slate-400 [&_select]:rounded-md [&_select]:border-slate-300 [&_select]:bg-white [&_select]:text-slate-800 [&_textarea]:rounded-md [&_textarea]:border-slate-300 [&_textarea]:bg-white [&_textarea]:text-slate-800 [&_textarea]:placeholder:text-slate-400 [&_th]:normal-case [&_th]:tracking-normal">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <p className="font-semibold text-red-600">*Required fields</p>
              <p className="font-semibold text-slate-700">Version: {normalizeVersionInput(form.version || 'V1')}</p>
            </div>
            {mastersLoading && <p className="text-xs text-gray-500">Loading master dropdowns...</p>}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="rounded-xl border border-sky-200 bg-white shadow-sm [&_input]:py-1 [&_select]:py-1 [&_textarea]:py-1">
                <div className="border-b border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">General Information</div>
                <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Design No *</label>
                    <input
                      className="w-full rounded border border-gray-300 bg-slate-50 px-2 py-2 text-sm text-slate-700"
                      value={form.designNo}
                      readOnly
                      placeholder="Design No"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Version</label>
                    <input
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={form.version}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, version: event.target.value }))
                      }
                      placeholder="V1"
                      disabled={Boolean(editingId)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Design Name</label>
                    <input
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={form.designName}
                      onChange={(event) => setForm((prev) => ({ ...prev, designName: event.target.value }))}
                      placeholder="Design Name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Jewelry Group *</label>
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
                    <label className="mb-1 block text-sm font-medium text-slate-700">Collection</label>
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
                    <label className="mb-1 block text-sm font-medium text-slate-700">Stage</label>
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
                    <label className="mb-1 block text-sm font-medium text-slate-700">Jewelry Size</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.jewelrySize}
                        onChange={(event) => setForm((prev) => ({ ...prev, jewelrySize: event.target.value }))}
                        disabled={!form.jewelryGroup}
                      >
                        <option value="">Select Jewelry Size</option>
                        {!filteredJewelrySizeOptions.some(
                          (option) => normalizeLookupKey(option.value) === normalizeLookupKey(form.jewelrySize),
                        ) && form.jewelrySize ? (
                          <option value={form.jewelrySize}>{form.jewelrySize}</option>
                        ) : null}
                        {filteredJewelrySizeOptions.map((option) => (
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
                    <label className="mb-1 block text-sm font-medium text-slate-700">Diamond Type</label>
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
                    <label className="mb-1 block text-sm font-medium text-slate-700">Diamond Spread</label>
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
                    <label className="mb-1 block text-sm font-medium text-slate-700">Design Status</label>
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
                    <label className="mb-1 block text-sm font-medium text-slate-700">Drawer Location</label>
                    <input className="w-full rounded border border-gray-300 px-2 py-2 text-sm" value={form.drawerLocation} onChange={(event) => setForm((prev) => ({ ...prev, drawerLocation: event.target.value }))} placeholder="Drawer location" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Other Weight</label>
                    <input className="w-full rounded border border-gray-300 px-2 py-2 text-sm" value={form.otherWeight} onChange={(event) => setForm((prev) => ({ ...prev, otherWeight: event.target.value }))} placeholder="Other Weight" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Production / Purchase</label>
                    <select
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={vendorRows[0]?.stockType || 'Production'}
                      onChange={(event) => {
                        const value = event.target.value;
                        setVendorRows((prev) => {
                          const base = prev.length > 0 ? prev : [createDefaultVendorRow()];
                          const [first, ...rest] = base;
                          return [{ ...first, stockType: value }, ...rest];
                        });
                      }}
                    >
                      <option value="Production">Production</option>
                      <option value="Purchase">Purchase</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Vendor</label>
                    <input
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={vendorRows[0]?.supplier || ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setVendorRows((prev) => {
                          const base = prev.length > 0 ? prev : [createDefaultVendorRow()];
                          const [first, ...rest] = base;
                          return [{ ...first, supplier: value }, ...rest];
                        });
                      }}
                      placeholder="Vendor name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Vendor SKU</label>
                    <input
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={vendorRows[0]?.supplierStyleNo || ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setVendorRows((prev) => {
                          const base = prev.length > 0 ? prev : [createDefaultVendorRow()];
                          const [first, ...rest] = base;
                          return [{ ...first, supplierStyleNo: value }, ...rest];
                        });
                      }}
                      placeholder="Vendor SKU"
                    />
                  </div>
                  <div className="md:col-span-2 xl:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Tags</label>
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
                    <label className="mb-1 block text-sm font-medium text-slate-700">Design Description</label>
                    <textarea className="h-20 w-full rounded border border-gray-300 px-2 py-2 text-sm" value={form.designDescription} onChange={(event) => setForm((prev) => ({ ...prev, designDescription: event.target.value }))} placeholder="Design Description" />
                  </div>
                  <div className="xl:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
                    <textarea className="h-20 w-full rounded border border-gray-300 px-2 py-2 text-sm" value={form.remarks} onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))} placeholder="Design Remarks" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="h-fit rounded-xl border border-violet-200 bg-white shadow-sm">
                <div className="border-b border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800">Media Gallery</div>
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
                      {galleryUploading ? 'Uploading...' : 'Add Media'}
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => stlUploadInputRef.current?.click()}
                      disabled={stlUploading}
                    >
                      {stlUploading ? 'Uploading STL...' : 'Add STL'}
                    </button>
                  </div>
                  <input
                    ref={galleryUploadInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={handleGalleryUploadChange}
                  />
                  <input
                    ref={stlUploadInputRef}
                    type="file"
                    accept=".stl,model/stl,application/sla"
                    multiple={false}
                    className="hidden"
                    onChange={handleStlUploadChange}
                  />
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">STL File</p>
                        <p className="text-sm text-slate-700">
                          {stlItem ? stlItem.fileName : 'No STL uploaded for this design version yet.'}
                        </p>
                      </div>
                      {stlItem ? (
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={resolvePublicAssetUrl(stlItem.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border border-emerald-300 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            Open STL
                          </a>
                          <button
                            type="button"
                            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                            onClick={() => setStlItem(null)}
                          >
                            Remove STL
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {galleryItems.length === 0 ? (
                    <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-xs text-gray-500">
                      No media added yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-violet-700">
                        {galleryItems.length} media item{galleryItems.length > 1 ? 's' : ''} selected
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {galleryItems.map((item, index) => (
                          <div key={`${item.key}-${index}`} className="rounded border border-gray-200 bg-gray-50 p-1.5">
                            <div className="relative">
                              <MediaPreview
                                url={item.url}
                                alt={`Design media ${index + 1}`}
                                className="h-24 w-full rounded object-cover"
                              />
                              {isVideoUrl(item.url) ? (
                                <span className="absolute left-1.5 top-1.5 rounded-full bg-slate-900/75 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white">
                                  Video
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {index > 0 ? (
                                <button
                                  type="button"
                                  className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100"
                                  onClick={() => setPrimaryGalleryItem(index)}
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
                                onClick={() => moveGalleryItem(index, -1)}
                                disabled={index === 0}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                                onClick={() => moveGalleryItem(index, 1)}
                                disabled={index === galleryItems.length - 1}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                                onClick={() => removeGalleryItem(index)}
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
                <div className="h-fit rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-semibold tracking-wide text-slate-800">Summary</h3>
                    <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      USD
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5">
                      <span>Metal Value</span>
                      <span className="font-semibold text-slate-900">{costTotals.metal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5">
                      <span>Stone Value</span>
                      <span className="font-semibold text-slate-900">{costTotals.gem.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5">
                      <span>Labor Value</span>
                      <span className="font-semibold text-slate-900">{costTotals.labor.toFixed(2)}</span>
                    </div>
                    {FINDING_FEATURE_ENABLED ? (
                      <div className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5">
                        <span>Finding Value</span>
                        <span className="font-semibold text-slate-900">{costTotals.finding.toFixed(2)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">Total Value</span>
                      <span className="text-base font-bold text-slate-900">{costTotals.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-600">Gross Wt.</span>
                      <span className="font-semibold text-slate-900">{costTotals.grossWeight.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Metal Information</div>
                  <div className="overflow-x-auto scrollbar-top">
                    <table className="w-full min-w-[1020px] text-sm">
                      <thead className="border-b border-gray-200 bg-white text-left text-[11px] font-semibold text-slate-900">
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
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-28 rounded border border-gray-300 px-2 py-1" value={item.netWt} onChange={(event) => updateMetalRow(item.id, 'netWt', event.target.value)} placeholder="Net Wt" /></td>
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-24 rounded border border-gray-300 px-2 py-1" value={item.wastagePercent} onChange={(event) => updateMetalRow(item.id, 'wastagePercent', event.target.value)} placeholder="Wastage %" /></td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-28 rounded border border-gray-300 px-2 py-1 text-gray-900"
                                value={item.wastageWt}
                                onChange={(event) => updateMetalRow(item.id, 'wastageWt', event.target.value)}
                                placeholder="Wastage Wt"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                className="w-28 rounded border border-gray-300 bg-gray-50 px-2 py-1 text-gray-700"
                                value={item.totalWt}
                                placeholder="Total Wt"
                                readOnly
                              />
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1">
                                <input type="text" inputMode="decimal" className="w-28 rounded border border-gray-300 px-2 py-1" value={item.pricePerGm} onChange={(event) => updateMetalRow(item.id, 'pricePerGm', event.target.value)} placeholder="Price" />
                                <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">USD</span>
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-28 rounded border border-gray-300 px-2 py-1 font-semibold text-slate-900"
                                value={item.value}
                                onChange={(event) => updateMetalRow(item.id, 'value', event.target.value)}
                                placeholder={getMetalValue(item).toFixed(2)}
                              />
                            </td>
                            <td className="px-2 py-2"><button type="button" className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100" onClick={() => setMetalRows((prev) => prev.filter((row) => row.id !== item.id))}>Remove</button></td>
                          </tr>
                        ))}
                        <tr className="bg-slate-100 text-sm font-bold text-slate-900">
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
                    <table className="w-full min-w-[920px] text-sm">
                      <thead className="border-b border-gray-200 bg-white text-left text-[11px] font-semibold text-slate-900">
                        <tr>
                          <th className="px-2 py-2">Packet</th>
                          <th className="px-2 py-2">Info</th>
                          <th className="px-2 py-2">Wt/Per Pcs.</th>
                          <th className="px-2 py-2">Pcs</th>
                          <th className="px-2 py-2">Wt(In Cts)</th>
                          <th className="px-2 py-2">@(P/C/In USD)</th>
                          <th className="px-2 py-2">Amount</th>
                          <th className="px-2 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {gemRows.map((item) => (
                          <tr key={item.id}>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-2">
                                <select
                                  className="w-36 rounded border border-gray-300 px-2 py-1"
                                  value={item.packetId}
                                  onChange={(event) => applyPacketToGemRow(item.id, event.target.value)}
                                >
                                  <option value="">Select Packet</option>
                                  {packetOptions.map((packet) => {
                                    const isCurrentPacket = item.packetId === packet.id;
                                    const packetUsedByOtherRow = gemRows.some(
                                      (row) => row.id !== item.id && row.packetId === packet.id,
                                    );
                                    const isDisabled = !isCurrentPacket && packetUsedByOtherRow;

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
                            <td className="px-2 py-2">
                              <div className="max-w-[14rem] whitespace-normal text-[11px] leading-4 text-gray-700">
                                <p>
                                  <span className="font-semibold text-gray-900">S:</span> {item.stone || '-'}
                                  {' | '}
                                  <span className="font-semibold text-gray-900">Sh:</span> {item.shape || '-'}
                                  {' | '}
                                  <span className="font-semibold text-gray-900">Sz:</span> {item.size || '-'}
                                </p>
                                <p>
                                  <span className="font-semibold text-gray-900">C:</span> {item.cut || '-'}
                                  {' | '}
                                  <span className="font-semibold text-gray-900">Clr:</span> {item.color || '-'}
                                  {' | '}
                                  <span className="font-semibold text-gray-900">Q:</span> {item.quality || '-'}
                                </p>
                              </div>
                            </td>
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-20 rounded border border-gray-300 px-2 py-1" value={item.wtPerPcs} onChange={(event) => updateGemRow(item.id, 'wtPerPcs', event.target.value)} placeholder="0.000" /></td>
                            <td className="px-2 py-2"><input type="text" inputMode="numeric" className="w-16 rounded border border-gray-300 px-2 py-1" value={item.pcs} onChange={(event) => updateGemRow(item.id, 'pcs', event.target.value)} placeholder="Pcs" /></td>
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-20 rounded border border-gray-300 px-2 py-1" value={item.wtInCts} onChange={(event) => updateGemRow(item.id, 'wtInCts', event.target.value)} placeholder="0.000" /></td>
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-20 rounded border border-gray-300 px-2 py-1" value={item.pricePerCt} onChange={(event) => updateGemRow(item.id, 'pricePerCt', event.target.value)} placeholder="0.00" /></td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-20 rounded border border-gray-300 px-2 py-1"
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

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                <div className="rounded-xl border border-rose-200 bg-white shadow-sm">
                  <div className="border-b border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">Labor Information</div>
                  <div className="overflow-x-auto scrollbar-top">
                    <table className="min-w-full text-sm">
                      <thead className="border-b border-gray-200 bg-white text-left text-[11px] font-semibold text-slate-900">
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
                    <button type="button" className="rounded-md bg-blue-700 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-800" onClick={() => setLaborRows((prev) => [...prev, { id: makeId(), laborHead: '', laborPerUnit: '', unitQty: '', laborValue: '' }])}>+ Add Line</button>
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

              <div className="hidden xl:block" aria-hidden="true" />
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white/95 pt-3 shadow-[0_-6px_18px_rgba(15,23,42,0.08)]">
              <Button type="button" onClick={() => saveDesign()} disabled={savingDesign}>
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
            {galleryLibraryItems.length === 0 ? (
              <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
                No media found in existing designs yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {galleryLibraryItems.map((item, index) => {
                  const selectedInCurrent = galleryKeys.includes(item.key);
                  return (
                    <div key={`${item.key}-${index}`} className="rounded border border-gray-200 bg-white p-2 shadow-sm">
                      <div className="relative">
                        <MediaPreview
                          url={item.url}
                          alt={`Gallery ${index + 1}`}
                          className="h-28 w-full rounded object-cover"
                        />
                        {isVideoUrl(item.url) ? (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-slate-900/75 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white">
                            Video
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className={`mt-2 w-full rounded px-2 py-1 text-xs font-semibold ${
                          selectedInCurrent
                            ? 'cursor-default border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                        onClick={() => {
                          if (selectedInCurrent) return;
                          addGalleryItems([{ url: item.url, key: item.key }]);
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

            {inlineMasterType === 'JEWELRY_SIZE' ? (
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
                  <label className="mb-1 block text-sm font-medium text-slate-700">Jewelry Group*</label>
                  <select
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineJewelryGroupId}
                    onChange={(event) => setInlineJewelryGroupId(event.target.value)}
                    required
                  >
                    <option value="">Select Jewelry Group</option>
                    {masterOptions.jewelryGroups.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.aliasName || option.value}
                      </option>
                    ))}
                  </select>
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
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    className="h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineMasterDescription}
                    onChange={(event) => setInlineMasterDescription(event.target.value)}
                    placeholder="Description"
                  />
                </div>
              </div>
            ) : null}

            {inlineMasterType !== 'FINDING_HEAD' && inlineMasterType !== 'METAL_CARATAGE' && inlineMasterType !== 'JEWELRY_SIZE' ? (
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

            {inlineMasterType !== 'FINDING_HEAD' &&
            inlineMasterType !== 'METAL_CARATAGE' &&
            inlineMasterType !== 'JEWELRY_SIZE' ? (
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

      {modal === 'info' && detailInfo && (
        <Modal title={`DESIGN DETAILS (${detailInfo.designNo || ''})`} onClose={() => { setShowStlViewerModal(false); setModal(null); }} size="max-w-7xl">
          <div className="space-y-4">
            {detailDesignLoading ? (
              <p className="text-sm text-blue-700">Loading design details...</p>
            ) : null}
            {detailDesignError ? (
              <p className="text-sm text-red-600">{detailDesignError}</p>
            ) : null}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="rounded border border-gray-200">
                <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Design Information</div>
                <table className="min-w-full text-sm">
                  <tbody>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Design No</td><td className="px-3 py-2">{detailInfo.designNo}</td><td className="px-3 py-2 font-medium">Version</td><td className="px-3 py-2">{detailInfo.version || 'V1'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Design Name</td><td className="px-3 py-2">{detailInfo.designName || '-'}</td><td className="px-3 py-2 font-medium">Stage</td><td className="px-3 py-2">{detailInfo.stage || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Jewelry Group</td><td className="px-3 py-2">{detailInfo.jewelryGroup || '-'}</td><td className="px-3 py-2 font-medium">Diamond Type</td><td className="px-3 py-2">{detailInfo.diamondType || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Diamond Spread</td><td className="px-3 py-2">{detailInfo.diamondSpread || '-'}</td><td className="px-3 py-2 font-medium">Collection</td><td className="px-3 py-2">{detailInfo.collection || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Tags</td><td className="px-3 py-2">{normalizeStringArray(detailInfo.tags).join(', ') || '-'}</td><td className="px-3 py-2 font-medium">Jewelry Size</td><td className="px-3 py-2">{detailInfo.jewelrySize || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Design Status</td><td className="px-3 py-2">{detailInfo.designStatus || detailInfo.status || '-'}</td><td className="px-3 py-2 font-medium">Description</td><td className="px-3 py-2">{detailInfo.designDescription || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Total Value</td><td className="px-3 py-2">{formatMoney(detailSummary.totalValue || parseNumericValue(detailInfo.price))}</td><td className="px-3 py-2 font-medium">Remarks</td><td className="px-3 py-2">{detailInfo.remarks || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Created</td><td className="px-3 py-2">{formatDetailDateTime(detailInfo.createdAt)}</td><td className="px-3 py-2 font-medium">Modified</td><td className="px-3 py-2">{formatDetailDateTime(detailInfo.updatedAt || detailInfo.modifiedAt)}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Last Updated By</td><td className="px-3 py-2" colSpan={3}>{detailInfo.updatedByName || '-'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="space-y-4">
                <div className="rounded border border-gray-200">
                  <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Gallery Media</div>
                  <div className="p-3">
                    {detailGalleryUrls.length ? (
                      <div className="space-y-3">
                        <MediaPreview
                          url={detailGalleryUrls[0]}
                          alt={`${detailInfo.designNo} primary`}
                          className="h-44 w-full rounded border border-gray-300 object-cover"
                          controls={isVideoUrl(detailGalleryUrls[0])}
                        />
                        {detailGalleryUrls.length > 1 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {detailGalleryUrls.slice(1).map((url, index) => (
                              <MediaPreview
                                key={`${url}-${index}`}
                                url={url}
                                alt={`${detailInfo.designNo} gallery ${index + 2}`}
                                className="h-16 w-full rounded border border-gray-200 object-cover"
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex h-36 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-xs font-semibold text-gray-500">
                        No gallery media
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded border border-gray-200">
                  <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
                    <span className="text-sm font-semibold text-gray-800">3D STL Model</span>
                    {detailStlUrl ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#81A6C6] hover:text-[#6f93b0]"
                        onClick={() => setShowStlViewerModal(true)}
                      >
                        Expand Viewer
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-3 p-3">
                    {detailStlUrl ? (
                      <>
                        <StlViewer designId={detailInfo.id} className="h-72" />
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {getFileNameFromUrl(detailStlUrl)}
                            </p>
                            <p className="text-xs text-slate-500">Interactive STL preview for this design version.</p>
                          </div>
                          <a
                            href={detailStlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-[#D2C4B4] bg-[#F3E3D0] px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-[#e9d8c4]"
                          >
                            Open File
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-48 flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 px-4 text-center">
                        <p className="text-sm font-semibold text-slate-700">No STL uploaded</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Upload an STL in the design gallery section to preview the 3D model here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Metal Value</p><p className="font-semibold">{detailSummary.metalValue.toFixed(2)}</p></div>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Gem Value</p><p className="font-semibold">{detailSummary.gemValue.toFixed(2)}</p></div>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Labor Value</p><p className="font-semibold">{detailSummary.laborValue.toFixed(2)}</p></div>
              {FINDING_FEATURE_ENABLED ? (
                <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Finding Value</p><p className="font-semibold">{detailSummary.findingValue.toFixed(2)}</p></div>
              ) : null}
              <div className="rounded border border-green-200 bg-green-50 p-2 text-sm"><p className="text-xs text-gray-600">Total Value</p><p className="font-semibold">{detailSummary.totalValue.toFixed(2)}</p></div>
            </div>
            <div className="rounded border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">Metal Information</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-200 bg-white text-left text-xs font-semibold text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Metal Caratage</th>
                      <th className="px-3 py-2">Net Wt.</th>
                      <th className="px-3 py-2">Wastage %</th>
                      <th className="px-3 py-2">Wastage Wt.</th>
                      <th className="px-3 py-2">Total Wt.</th>
                      <th className="px-3 py-2">@(Per Gm)</th>
                      <th className="px-3 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {detailMetals.length === 0 ? (
                      <tr><td className="px-3 py-3 text-sm text-slate-500" colSpan={7}>No metal details available.</td></tr>
                    ) : (
                      detailMetals.map((metal: any) => (
                        <tr key={metal.id || `${metal.goldColour}-${metal.sortOrder}`}>
                          <td className="px-3 py-2">{metal.metalCaratage || metal.goldColour || '-'}</td>
                          <td className="px-3 py-2">{parseNumericValue(metal.netWt).toFixed(3)}</td>
                          <td className="px-3 py-2">{parseNumericValue(metal.wastagePercent).toFixed(2)}</td>
                          <td className="px-3 py-2">{parseNumericValue(metal.wastageWt).toFixed(3)}</td>
                          <td className="px-3 py-2">{parseNumericValue(metal.totalWt).toFixed(3)}</td>
                          <td className="px-3 py-2">{parseNumericValue(metal.pricePerGm).toFixed(2)}</td>
                          <td className="px-3 py-2">{parseNumericValue(metal.value).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">Gemstone Information</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-200 bg-white text-left text-xs font-semibold text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Packet</th>
                      <th className="px-3 py-2">Stone</th>
                      <th className="px-3 py-2">Shape</th>
                      <th className="px-3 py-2">Size</th>
                      <th className="px-3 py-2">Color</th>
                      <th className="px-3 py-2">Quality</th>
                      <th className="px-3 py-2">Wt/Pcs</th>
                      <th className="px-3 py-2">Pcs</th>
                      <th className="px-3 py-2">Wt (Cts)</th>
                      <th className="px-3 py-2">@(P/Ct)</th>
                      <th className="px-3 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {detailGemstones.length === 0 ? (
                      <tr><td className="px-3 py-3 text-sm text-slate-500" colSpan={11}>No gemstone details available.</td></tr>
                    ) : (
                      detailGemstones.map((gem: any) => (
                        <tr key={gem.id || `${gem.stone}-${gem.sortOrder}`}>
                          <td className="px-3 py-2">{resolveDetailPacketName(gem)}</td>
                          <td className="px-3 py-2">{gem.stone || '-'}</td>
                          <td className="px-3 py-2">{gem.shape || '-'}</td>
                          <td className="px-3 py-2">{gem.size || '-'}</td>
                          <td className="px-3 py-2">{gem.color || '-'}</td>
                          <td className="px-3 py-2">{gem.quality || '-'}</td>
                          <td className="px-3 py-2">{parseNumericValue(gem.wtPerPcs).toFixed(3)}</td>
                          <td className="px-3 py-2">{parseNumericValue(gem.pcs).toFixed(0)}</td>
                          <td className="px-3 py-2">{parseNumericValue(gem.wtInCts).toFixed(3)}</td>
                          <td className="px-3 py-2">{parseNumericValue(gem.pricePerCt).toFixed(2)}</td>
                          <td className="px-3 py-2">{parseNumericValue(gem.amount).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">Labor Information</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-200 bg-white text-left text-xs font-semibold text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Labor Head</th>
                      <th className="px-3 py-2">Labor/Unit</th>
                      <th className="px-3 py-2">Unit/Qty</th>
                      <th className="px-3 py-2">Labor Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {detailLabors.length === 0 ? (
                      <tr><td className="px-3 py-3 text-sm text-slate-500" colSpan={4}>No labor details available.</td></tr>
                    ) : (
                      detailLabors.map((labor: any) => (
                        <tr key={labor.id || `${labor.laborHead}-${labor.sortOrder}`}>
                          <td className="px-3 py-2">{labor.laborHead || '-'}</td>
                          <td className="px-3 py-2">{parseNumericValue(labor.laborPerUnit).toFixed(2)}</td>
                          <td className="px-3 py-2">{parseNumericValue(labor.unitQty).toFixed(2)}</td>
                          <td className="px-3 py-2">{parseNumericValue(labor.laborValue).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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

      {showStlViewerModal && detailInfo && (
        <Modal
          title={`STL FILE (${detailInfo.designNo})`}
          onClose={() => setShowStlViewerModal(false)}
          size="max-w-6xl"
          zIndexClass="z-[80]"
        >
          <div className="space-y-4">
            {detailStlUrl ? (
              <>
                <StlViewer designId={detailInfo.id} className="h-[32rem]" />
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{getFileNameFromUrl(detailStlUrl)}</p>
                    <p className="text-xs text-slate-500">Rotate, zoom, and inspect the STL model before production.</p>
                  </div>
                  <a
                    href={detailStlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-[#D2C4B4] bg-[#F3E3D0] px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-[#e9d8c4]"
                  >
                    Open STL
                  </a>
                </div>
              </>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
                <p className="text-base font-semibold text-slate-700">No STL uploaded for this design</p>
                <p className="mt-2 text-sm text-slate-500">
                  Add the STL from the gallery section in the design form to preview it here.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {listMediaViewer ? (
        <Modal
          title={`MEDIA (${listMediaViewer.title})`}
          onClose={() => setListMediaViewer(null)}
          size="max-w-5xl"
          zIndexClass="z-[80]"
        >
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950/95 p-4">
              <MediaPreview
                url={listMediaViewer.items[listMediaViewer.activeIndex].url}
                alt={`${listMediaViewer.title} media ${listMediaViewer.activeIndex + 1}`}
                className="h-[26rem] w-full rounded-xl object-contain"
                controls
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {getFileNameFromUrl(listMediaViewer.items[listMediaViewer.activeIndex].url)}
                </p>
                <p className="text-xs text-slate-500">
                  Media {listMediaViewer.activeIndex + 1} of {listMediaViewer.items.length}
                </p>
              </div>
              <a
                href={listMediaViewer.items[listMediaViewer.activeIndex].url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-[#D2C4B4] bg-[#F3E3D0] px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-[#e9d8c4]"
              >
                Open File
              </a>
            </div>

            {listMediaViewer.items.length > 1 ? (
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {listMediaViewer.items.map((item, index) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`overflow-hidden rounded-xl border p-1 transition ${
                      index === listMediaViewer.activeIndex
                        ? 'border-[#81A6C6] bg-[#AACDDC]/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                    onClick={() =>
                      setListMediaViewer((prev) => (prev ? { ...prev, activeIndex: index } : prev))
                    }
                    title={`Open media ${index + 1}`}
                  >
                    <MediaPreview
                      url={item.url}
                      alt={`${listMediaViewer.title} thumbnail ${index + 1}`}
                      className="h-16 w-full rounded-lg object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}

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
              <tbody>
                {historyLoading ? (
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-4 text-center text-sm text-gray-600" colSpan={4}>
                      Loading history...
                    </td>
                  </tr>
                ) : historyError ? (
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-4 text-center text-sm text-red-600" colSpan={4}>
                      {historyError}
                    </td>
                  </tr>
                ) : historyRows.length === 0 ? (
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-4 text-center text-sm text-gray-500" colSpan={4}>
                      No history entries found.
                    </td>
                  </tr>
                ) : (
                  historyRows.map((row, idx) => (
                    <tr key={row.id || `${row.actionType}-${idx}`} className="border-t border-gray-200">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">
                        {row.actionType ? `${row.actionType}: ` : ''}
                        {row.remarks || '-'}
                      </td>
                      <td className="px-3 py-2">{row.user || 'System'}</td>
                      <td className="px-3 py-2">{row.dateTime || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
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
                      <td className="px-3 py-2">
                        <select
                          className="w-full rounded border border-gray-300 px-2 py-1"
                          value={item.stockType}
                          onChange={(event) =>
                            setVendorRows((prev) =>
                              prev.map((row) => row.id === item.id ? { ...row, stockType: event.target.value } : row),
                            )
                          }
                        >
                          <option value="Production">Production</option>
                          <option value="Purchase">Purchase</option>
                          {item.stockType && !['Production', 'Purchase'].includes(item.stockType) ? (
                            <option value={item.stockType}>{item.stockType}</option>
                          ) : null}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.supplierStyleNo} onChange={(event) => setVendorRows((prev) => prev.map((row) => row.id === item.id ? { ...row, supplierStyleNo: event.target.value } : row))} /></td>
                      <td className="px-3 py-2"><button type="button" className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700" onClick={() => setVendorRows((prev) => prev.filter((row) => row.id !== item.id))}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between"><button type="button" className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700" onClick={() => setVendorRows((prev) => [...prev, { id: makeId(), supplier: '', stockType: 'Production', supplierStyleNo: '' }])}>+ Add New Line</button><Button type="button" onClick={() => setModal(null)}>Save</Button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}


