import { ChangeEvent, FocusEvent, FormEvent, Fragment, MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../components/common/Button';
import SearchableSelect from '../../components/common/SearchableSelect';
import Card from '../../components/common/Card';
import Pagination from '../../components/common/Pagination';
import StlViewer from '../../components/common/StlViewer';
import Avatar from '../../components/common/Avatar';
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
  | 'DIAMOND_WEIGHT'
  | 'DIAMOND_QUALITY'
  | 'VENDOR_NAME'
  | 'LABOR_HEAD'
  | 'LABOR_RULE'
  | 'OVERHEAD_RULE'
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
  laborApplyMode?: 'FLAT' | 'PER_STONE' | 'PER_GRAM' | 'PER_GROUP';
  flatCost?: number;
  ratePerStone?: number;
  ratePerGram?: number;
  ratePerGroup?: number;
  overheadApplyMode?: 'PERCENT_MATERIALS' | 'PERCENT_BOM_SUBTOTAL' | 'FLAT';
  ratePercent?: number;
  flatAmount?: number;
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
  diamondWeight?: string;
  diamondQuality?: string;
  goldColour: string;
  collection: string;
  stoneInfo: string;
  price: number;
  tags: string[];
  stage: string;
  status: string;
  remarks: string;
  isActive: boolean;
  isPrimary?: boolean;
  imageUrls?: string[];
  imageKeys?: string[];
  ijewelModelId?: string | null;
  ijewelBaseName?: string | null;
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
  diamondWeight?: string | null;
  diamondQuality?: string | null;
  goldColour?: string | null;
  collection?: string | null;
  stoneInfo?: string | null;
  totalValue?: number | string | null;
  tags?: unknown;
  stage?: string | null;
  designStatus?: string | null;
  otherWeight?: number | string | null;
  remarks?: string | null;
  imageUrls?: unknown;
  imageKeys?: unknown;
  ijewelModelId?: string | null;
  ijewelBaseName?: string | null;
  isActive?: boolean;
  isPrimary?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  updatedByName?: string | null;
}

interface GalleryItem {
  key: string;
  url: string;
}

type MediaLibraryTypeFilter = 'ALL' | 'IMAGE' | 'VIDEO' | 'STL';

interface MediaLibraryItem {
  id: string;
  mediaType: MediaLibraryTypeFilter;
  fileName: string;
  fileKey: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  url: string;
  uploadedBy?: string | null;
  createdAt?: string | null;
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
  coverageCustom: string;
  diamondWeight: string;
  diamondQuality: string;
  diamondQualityCustom: string;
  jewelrySize: string;
  otherWeight: string;
  tags: string;
  designStatus: string;
  drawerLocation: string;
  designDescription: string;
  remarks: string;
  ijewelModelId: string;
  ijewelBaseName: string;
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

interface OverheadRow {
  id: string;
  overheadHead: string;
  ruleId: string;
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

interface VersionBuilderSelections {
  metals: string[];
  coverages: string[];
  diamondQualities: string[];
  caratWeights: string[];
  sizes: string[];
}

interface VersionBuilderOptionGroup {
  id: keyof VersionBuilderSelections;
  label: string;
  helper: string;
  values: string[];
}

type VersionBuilderImageMode = 'INHERIT_PARENT' | 'MAP_BY_METAL' | 'MANUAL_AFTER_CREATE';
type VersionBuilderGemMode = 'INHERIT_BASE' | 'OVERRIDE_BLOCK';
type VersionBuilderGemApplyScope = 'ALL_COMBINATIONS' | 'FILTERED_COMBINATIONS';
type VersionBuilderWorkflowStep =
  | 'INFO'
  | 'DIMENSIONS'
  | 'GEMSTONES'
  | 'SIZE_CHART'
  | 'IMAGES'
  | 'LABOR_OVERHEAD'
  | 'BOM'
  | 'PREVIEW';

interface VersionBuilderBomSelection {
  size: string;
  metal: string;
  diamondQuality: string;
  coverage: string;
  caratWeight: string;
}

interface VersionBuilderGeneratedFilterState {
  size: string;
  coverage: string;
  search: string;
}

interface VersionBuilderGeneratedRow {
  designNo: string;
  version: string;
  metal: string;
  coverage: string;
  diamondQuality: string;
  caratWeight: string;
  size: string;
  imageInfo: string;
  gemstoneInfo: string;
  composition: string;
  bomCost: number;
}

interface VersionBuilderCreateResult {
  status: 'created' | 'failed';
  message?: string;
}

interface VersionBuilderUploadedMediaItem {
  previewUrl: string;
  file: File;
}

interface VersionBuilderSizeChartGroupCell {
  count: string;
  ctPerStone: string;
}

interface VersionBuilderSizeChartRowState {
  metalWeights: Record<string, string>;
  groups: Record<string, VersionBuilderSizeChartGroupCell>;
}

type VersionBuilderSizeChartState = Record<string, Record<string, VersionBuilderSizeChartRowState>>;

const DESIGN_LIST_COLUMNS: DesignListColumn[] = [
  { key: 'media', label: 'Media' },
  { key: 'designNo', label: 'Design No.' },
  { key: 'jewelryGroup', label: 'Category' },
  { key: 'jewelrySize', label: 'Jewelry Size' },
  { key: 'metalInfo', label: 'Metal Info' },
  { key: 'collection', label: 'Sub Category' },
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
  barcode: string | null;
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
  barcode: string;
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
const parseSizeNumber = (value: string | null | undefined): number | null => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  const match = normalized.match(/\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};
const calculateVersionBuilderGemRowForSize = (
  row: GemRow,
  mode: 'varies' | 'fixed',
  baseSize: string,
  targetSize: string,
): { pcs: number; wtPerPcs: number; wtInCts: number } => {
  const basePcs = Math.max(0, Math.round(parseNum(row.pcs)));
  const baseWtPerPcs = Math.max(0, parseNum(row.wtPerPcs));
  const explicitWtInCts = Math.max(0, parseNum(row.wtInCts));
  const baseSizeValue = parseSizeNumber(baseSize);
  const targetSizeValue = parseSizeNumber(targetSize);

  let pcs = basePcs;
  if (
    mode === 'varies' &&
    basePcs > 0 &&
    baseSizeValue != null &&
    targetSizeValue != null &&
    baseSizeValue > 0
  ) {
    pcs = Math.max(1, Math.round(basePcs * (targetSizeValue / baseSizeValue)));
  }

  let wtInCts = 0;
  if (baseWtPerPcs > 0 && pcs > 0) {
    wtInCts = baseWtPerPcs * pcs;
  } else if (explicitWtInCts > 0) {
    wtInCts =
      mode === 'varies' && basePcs > 0 && pcs > 0 ? explicitWtInCts * (pcs / basePcs) : explicitWtInCts;
  }

  return {
    pcs,
    wtPerPcs: baseWtPerPcs,
    wtInCts,
  };
};
const buildVersionBuilderSizeChartSizes = (): string[] => {
  const sizes: string[] = [];
  for (let size = 3; size <= 11.0001; size += 0.25) {
    sizes.push(size.toFixed(2));
  }
  return sizes;
};
const getMetalPurityBucket = (value: string | null | undefined): string => {
  const raw = String(value ?? '').trim();
  const normalized = normalizeLookupKey(raw);
  if (!normalized) return '';
  if (normalized === 'pt' || normalized.includes('platinum')) return 'PT';
  const karatMatch = raw.match(/(\d{2})/);
  if (karatMatch?.[1]) return `${karatMatch[1]}K`;
  if (normalized.includes('silver')) return 'Silver';
  return raw.toUpperCase();
};
const getCoverageChartRatio = (coverage: string): number => {
  const normalized = normalizeLookupKey(coverage);
  if (normalized.includes('1/2') || normalized.includes('half')) return 0.5;
  if (normalized.includes('3/4')) return 0.75;
  if (normalized.includes('full')) return 1;
  return 1;
};
const normalizeSizeChartKey = (value: string): string => {
  const parsed = parseSizeNumber(value);
  return parsed != null ? parsed.toFixed(2) : String(value ?? '').trim();
};
const buildBaseMetalWeightByPurity = (rows: MetalRow[]): Record<string, string> => {
  return rows.reduce<Record<string, string>>((acc, row) => {
    const purity = getMetalPurityBucket(row.goldColour);
    if (!purity || acc[purity]) return acc;
    const preferredWeight = row.netWt.trim() || row.totalWt.trim() || '0';
    acc[purity] = preferredWeight;
    return acc;
  }, {});
};
const buildDefaultMetalWeightsForPurities = (
  purities: string[],
  baseWeightMap: Record<string, string>,
): Record<string, string> => {
  return purities.reduce<Record<string, string>>((acc, purity) => {
    acc[purity] = baseWeightMap[purity] || '0';
    return acc;
  }, {});
};
const getDefaultSizeChartGroupCell = (
  row: GemRow,
  mode: 'varies' | 'fixed',
  baseSize: string,
  targetSize: string,
  coverage: string,
): VersionBuilderSizeChartGroupCell => {
  const computed = calculateVersionBuilderGemRowForSize(row, mode, baseSize, targetSize);
  const coverageRatio = getCoverageChartRatio(coverage);
  const adjustedCount =
    computed.pcs > 0
      ? mode === 'fixed' ? Math.max(1, Math.round(computed.pcs * coverageRatio))
        : Math.max(1, Math.round(computed.pcs * coverageRatio))
      : 0;
  const ctPerStone =
    computed.wtPerPcs > 0
      ? computed.wtPerPcs
      : computed.pcs > 0 && computed.wtInCts > 0
        ? computed.wtInCts / computed.pcs
        : 0;
  return {
    count: adjustedCount > 0 ? String(adjustedCount) : '',
    ctPerStone: ctPerStone > 0 ? ctPerStone.toFixed(3) : '',
  };
};
const summarizeVersionBuilderGemPlan = (
  rows: GemRow[],
  groupModes: Record<string, 'varies' | 'fixed'>,
  baseSize: string,
  targetSize: string,
): string => {
  const totalRows = rows.length;
  const varyingGroups = rows.filter((row) => (groupModes[row.id] || 'varies') === 'varies').length;
  const fixedGroups = Math.max(0, totalRows - varyingGroups);
  const computed = rows.map((row) =>
    calculateVersionBuilderGemRowForSize(row, groupModes[row.id] || 'varies', baseSize, targetSize),
  );
  const totalPcs = computed.reduce((sum, row) => sum + row.pcs, 0);
  const totalWeight = computed.reduce((sum, row) => sum + row.wtInCts, 0);
  const parts = [`${totalRows} rows`];

  if (totalPcs > 0) parts.push(`${totalPcs} pcs`);
  if (totalWeight > 0) parts.push(`${totalWeight.toFixed(2)} ctw`);

  if (varyingGroups > 0 && fixedGroups > 0) {
    parts.push(`${varyingGroups} vary`);
  } else if (varyingGroups === totalRows && totalRows > 0) {
    parts.push('size-based');
  } else if (fixedGroups === totalRows && totalRows > 0) {
    parts.push('fixed');
  }

  return `Configured (${parts.join(' - ')})`;
};
const uniqueNonEmptyValues = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    const lookup = normalized.toLowerCase();
    if (seen.has(lookup)) return;
    seen.add(lookup);
    result.push(normalized);
  });
  return result;
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
const getMetalCaratageDisplay = (value: string, options: MasterOption[] = []): string => {
  const normalized = normalizeLookupKey(value);
  if (!normalized) return '';
  const match = options.find((option) => normalizeLookupKey(option.value) === normalized);
  return (match?.aliasName || match?.value || value || '').trim();
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
const stripUrlSuffix = (url: string): string => url.split('#')[0].split('-')[0].toLowerCase();
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
    diamondWeight: design.diamondWeight || '',
    diamondQuality: design.diamondQuality || '',
    goldColour: design.goldColour || 'N/A',
    collection: design.collection || 'General',
    stoneInfo: design.stoneInfo || 'N/A',
    price: parseNumericValue(design.totalValue),
    tags,
    stage: design.stage || '',
    status: design.designStatus || '',
    remarks: design.remarks || '',
    isActive: design.isActive !== false,
    isPrimary: design.isPrimary === true,
    imageUrls,
    imageKeys,
    ijewelModelId: design.ijewelModelId ?? null,
    ijewelBaseName: design.ijewelBaseName ?? null,
    createdAt: normalizeDateTimeValue(design.createdAt) || '',
    modifiedAt: normalizeDateTimeValue(design.updatedAt) || '',
    updatedByName: design.updatedByName || '',
  };
};
const formatMoney = (value: number): string => `USD ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const getOverheadRuleConfiguredDisplay = (rule: MasterOption | null): string => {
  if (!rule) return '-';
  if (rule.overheadApplyMode === 'FLAT') {
    return formatMoney(Math.max(0, rule.flatAmount || 0));
  }
  return `${Math.max(0, rule.ratePercent || 0).toFixed(2)}%`;
};
const escapeRegex = (value: string): string => value.replace(/[.*+-^${}()|[\]\\]/g, '\\$&');
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
  if (!jewelryGroup.trim()) return 'DSN';
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

const getVersionDisplayValue = (value: string): string => {
  const normalized = normalizeVersionInput(value);
  const match = normalized.match(/^V(\d+)$/i);
  return match ? match[1] : normalized.replace(/^V/i, '');
};

const getBaseDesignNo = (designNo: string): string => designNo.trim().toUpperCase().replace(/-V\d+$/i, '');

const buildVersionedDesignNo = (designNo: string, version: string): string => {
  const base = getBaseDesignNo(designNo);
  const normalizedVersion = normalizeVersionInput(version);
  if (normalizedVersion === 'V1') return base;
  return `${base}-${normalizedVersion}`;
};

const isAutoGeneratedDesignName = (designName: string, _jewelryGroup: string, designNo: string): boolean => {
  const normalizedName = normalizeLookupKey(designName);
  if (!normalizedName) return true;
  return normalizedName === normalizeLookupKey(designNo);
};

const STRUCTURED_COVERAGE_OPTIONS = [
  { value: 'Full Eternity', label: 'F ? Full Eternity' },
  { value: '1/2 Way', label: '1/2 Way' },
  { value: '3/4 Way', label: '3/4 Way' },
  { value: 'Custom', label: 'C - Custom' },
] as const;

const STRUCTURED_DIAMOND_QUALITY_OPTIONS = [
  { value: 'LAB', label: 'LAB' },
  { value: 'GH/VS', label: 'GH/VS' },
  { value: 'HI/SI', label: 'HI/SI' },
  { value: 'Custom', label: 'C - Custom' },
] as const;

const sanitizeStructuredToken = (value: string, options?: { preserveSlash?: boolean }): string => {
  const preserveSlash = options?.preserveSlash === true;
  const matcher = preserveSlash ? /[^A-Z0-9/]+/g : /[^A-Z0-9]+/g;
  return value.trim().toUpperCase().replace(matcher, '');
};

const resolveCoverageCode = (coverage: string, customCoverage: string): string => {
  const normalized = normalizeLookupKey(coverage);
  if (!normalized) return '';
  if (normalized === 'custom') {
    return sanitizeStructuredToken(customCoverage, { preserveSlash: true });
  }
  if (normalized.includes('full')) return 'F';
  if (normalized.includes('1/2') || normalized.includes('half')) return '1/2';
  if (normalized.includes('3/4')) return '3/4';
  return sanitizeStructuredToken(coverage, { preserveSlash: true });
};

const resolveDiamondQualityCode = (diamondQuality: string, customDiamondQuality: string): string => {
  const normalized = normalizeLookupKey(diamondQuality);
  const rawValue = normalized === 'custom' ? customDiamondQuality : diamondQuality;
  return sanitizeStructuredToken(rawValue, { preserveSlash: true }).replace(/\//g, '-');
};

const resolveSizeCode = (size: string): string => {
  const trimmed = size.trim();
  if (!trimmed) return '';
  const numeric = Number.parseFloat(trimmed);
  if (Number.isFinite(numeric) && /^\d+(\.\d+)?$/.test(trimmed)) {
    return numeric.toFixed(2);
  }
  return sanitizeStructuredToken(trimmed, { preserveSlash: true });
};

const resolveMetalCode = (metal: string, metalOptions: MasterOption[]): string => {
  const trimmed = metal.trim();
  if (!trimmed) return '';
  const match = metalOptions.find((option) => normalizeLookupKey(option.value) === normalizeLookupKey(trimmed));
  const alias = sanitizeStructuredToken(match?.aliasName || '');
  if (alias) return alias;

  const normalized = normalizeLookupKey(trimmed);
  if (normalized === 'pt' || normalized.includes('platinum')) return 'PT';

  const karatMatch = trimmed.match(/(\d{2})/);
  const karat = karatMatch?.[1] || '';
  if (normalized.includes('white')) return `${karat || ''}KW`;
  if (normalized.includes('yellow')) return `${karat || ''}KY`;
  if (normalized.includes('rose') || normalized.includes('pink')) return `${karat || ''}KR`;

  return sanitizeStructuredToken(trimmed);
};

const getNextStructuredDesignSerial = (
  jewelryGroup: string,
  existingRows: DesignRow[],
  aliasName?: string,
): string => {
  const prefix = buildDesignNoPrefix(jewelryGroup, aliasName);
  if (!prefix) return '1';

  const matcher = new RegExp(`^${escapeRegex(prefix)}-(\\d+)(?:-|$)`, 'i');
  let maxSerial = 0;

  existingRows.forEach((row) => {
    const baseDesignNo = getBaseDesignNo(row.designNo || '');
    const match = matcher.exec(baseDesignNo);
    if (!match) return;
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed > maxSerial) {
      maxSerial = parsed;
    }
  });

  return String(maxSerial + 1);
};

const buildStructuredDesignNo = ({
  categoryCode,
  serialCode,
  coverageCode,
  metalCode,
  diamondQualityCode,
  sizeCode,
}: {
  categoryCode: string;
  serialCode: string;
  coverageCode: string;
  metalCode: string;
  diamondQualityCode: string;
  sizeCode: string;
}): string => {
  const safeSerialCode = sanitizeStructuredToken(serialCode);
  const segments = [categoryCode, safeSerialCode, coverageCode, metalCode, diamondQualityCode, sizeCode].filter(Boolean);
  return segments.join('-');
};

const getStructuredDesignFamilyParts = (designNo: string): { categoryCode: string; serialCode: string } => {
  const base = getBaseDesignNo(designNo);
  const parts = base.split('-').filter(Boolean);
  return {
    categoryCode: parts[0] || '',
    serialCode: parts[1] || '',
  };
};

const getDesignFamilyKey = (designNo: string, fallback = ''): string => {
  const base = getBaseDesignNo(designNo);
  if (!base) return fallback;

  const family = getStructuredDesignFamilyParts(base);
  if (family.categoryCode && family.serialCode) {
    return `${family.categoryCode}-${family.serialCode}`.toUpperCase();
  }

  return base.toUpperCase();
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

const getVersionNumber = (version: string): number => {
  const match = /V(\d+)/i.exec((version || '').trim());
  if (!match) return 0;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolvePrimaryVersionId = (versions: DesignRow[]): string => {
  if (!versions.length) {
    return '';
  }
  const explicitPrimary = versions.find((row) => row.isPrimary);
  if (explicitPrimary) {
    return explicitPrimary.id;
  }
  return (
    [...versions].sort((a, b) => {
      const versionDiff = getVersionNumber(a.version) - getVersionNumber(b.version);
      if (versionDiff !== 0) return versionDiff;
      const timeA = new Date(a.createdAt || a.modifiedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.modifiedAt || 0).getTime();
      return timeA - timeB;
    })[0]?.id || versions[0].id
  );
};

const pickPrimaryDesignRow = (versions: DesignRow[]): DesignRow => {
  if (!versions.length) {
    return versions[0] as DesignRow;
  }
  const primaryId = resolvePrimaryVersionId(versions);
  return versions.find((row) => row.id === primaryId) || versions[0];
};

const buildIjewelEmbedUrl = (modelId?: string | null, baseName?: string | null): string | null => {
  const trimmedId = String(modelId || '').trim();
  if (!trimmedId) return null;
  if (/^https?:\/\//i.test(trimmedId)) {
    return trimmedId;
  }
  const trimmedBase = String(baseName || '').trim() || 'drive';
  if (trimmedBase.includes('.')) {
    return `https://${trimmedBase}/drive/files/${trimmedId}/embedded`;
  }
  return `https://${trimmedBase}.ijewel3d.com/${trimmedBase}/files/${trimmedId}/embedded`;
};

const designSeed: DesignRow[] = [
  { id: '1', designNo: 'RING-0006', designName: 'Ring RING-0006', version: 'V1', jewelryGroup: 'Ring', jewelrySize: 'US 6', diamondType: 'Lab Diamonds ? EF/VVS-VS', diamondSpread: '1/2 Way', goldColour: '22 karat-Rose-Gold', collection: 'Silver', stoneInfo: 'Diamond 0', price: 1586.77, tags: ['Diamond Ring'], stage: 'Sketch', status: 'Mold', remarks: 'Primary hero ring', isActive: true, isPrimary: true, createdAt: '2025-12-17 12:23', modifiedAt: '2026-02-21 14:07', updatedByName: '' },
  { id: '2', designNo: 'BL-0001', designName: 'Bracelet BL-0001', version: 'V1', jewelryGroup: 'Bracelet', jewelrySize: '15.5 CM', diamondType: 'Natural Diamonds ? GH/VS', diamondSpread: '3/4 Way', goldColour: '90-silver-Silver', collection: 'Silver Fortune', stoneInfo: 'Diamond 0', price: 9.6, tags: ['Silver Bracelet'], stage: 'Approved', status: 'Active', remarks: 'Starter collection item', isActive: true, isPrimary: true, createdAt: '2025-11-09 10:00', modifiedAt: '2026-02-16 15:42', updatedByName: '' },
  { id: '3', designNo: 'RING-0005', designName: 'Ring RING-0005', version: 'V1', jewelryGroup: 'Ring', jewelrySize: 'US 6', diamondType: 'Natural Diamonds ? GH/VS', diamondSpread: 'Full Eternity', goldColour: '18 Karat-White-Gold', collection: 'Gold', stoneInfo: 'Diamond 0', price: 775.75, tags: ['Diamond Ring', 'Wedding'], stage: 'Production', status: 'Active', remarks: 'Wedding bestseller', isActive: true, isPrimary: true, createdAt: '2025-10-19 11:40', modifiedAt: '2026-02-18 10:51', updatedByName: '' },
  { id: '4', designNo: 'RING-0004', designName: 'Ring RING-0004', version: 'V2', jewelryGroup: 'Ring', jewelrySize: 'US 6', diamondType: 'Lab Diamonds ? EF/VVS-VS', diamondSpread: '3/4 Way', goldColour: '18 Karat-White-Gold', collection: 'Gold', stoneInfo: 'Diamond 0', price: 1954.25, tags: ['Diamond Ring'], stage: 'Polish', status: 'Active', remarks: 'Premium edition', isActive: true, isPrimary: false, createdAt: '2025-10-01 09:15', modifiedAt: '2026-02-20 17:05', updatedByName: '' },
  { id: '5', designNo: 'NP-0001', designName: 'Nose Pin NP-0001', version: 'V1', jewelryGroup: 'Nose Pin', jewelrySize: 'N/A', diamondType: 'Lab Diamonds ? EF/VVS-VS', diamondSpread: '1/2 Way', goldColour: '22 karat-Rose-Gold', collection: 'Hermione', stoneInfo: 'None', price: 1951.6, tags: ['Minimal'], stage: 'Sketch', status: 'Inactive', remarks: 'Paused for revision', isActive: false, isPrimary: true, createdAt: '2025-08-07 13:20', modifiedAt: '2026-01-25 11:35', updatedByName: '' },
  { id: '6', designNo: 'RING-0003', designName: 'Ring RING-0003', version: 'V1', jewelryGroup: 'Ring', jewelrySize: 'US 6', diamondType: 'Natural Diamonds ? GH/VS', diamondSpread: 'Full Eternity', goldColour: '22 karat-White-Gold', collection: 'Gold', stoneInfo: 'Diamond 0', price: 2871.74, tags: ['Diamond Ring', 'Gold Pendant'], stage: 'Production', status: 'Active', remarks: 'High-value custom request', isActive: true, isPrimary: true, createdAt: '2025-07-28 08:40', modifiedAt: '2026-02-22 09:05', updatedByName: '' },
  { id: '7', designNo: 'RING-0002', designName: 'Ring RING-0002', version: 'V2', jewelryGroup: 'Ring', jewelrySize: 'US 8', diamondType: 'Natural Diamonds ? GH/VS', diamondSpread: '3/4 Way', goldColour: '18 K-Yellow-Gold', collection: 'Casual', stoneInfo: 'Aquamarine 0', price: 3247.69, tags: ['Diamond Ring'], stage: 'Quality Check', status: 'Active', remarks: 'Awaiting bulk order', isActive: true, isPrimary: false, createdAt: '2025-07-11 16:25', modifiedAt: '2026-02-23 10:45', updatedByName: '' },
  { id: '8', designNo: 'E-0001', designName: 'Earring E-0001', version: 'V1', jewelryGroup: 'Earring', jewelrySize: '6 Inches', diamondType: 'Lab Diamonds ? EF/VVS-VS', diamondSpread: '1/2 Way', goldColour: '22 karat-Rose-Gold', collection: 'Gold', stoneInfo: 'Diamond 0', price: 3555.63, tags: ['Gold Earring'], stage: 'Dispatch', status: 'Active', remarks: 'Ready for handoff', isActive: true, isPrimary: true, createdAt: '2025-06-15 09:00', modifiedAt: '2026-02-24 19:15', updatedByName: '' },
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
  coverageCustom: '',
  diamondWeight: '',
  diamondQuality: '',
  diamondQualityCustom: '',
  jewelrySize: '',
  otherWeight: '',
  tags: '',
  designStatus: 'Mold',
  drawerLocation: '',
  designDescription: '',
  remarks: '',
  ijewelModelId: '',
  ijewelBaseName: '',
};

const defaultPacketForm: PacketForm = {
  barcode: '',
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

const createEmptyGemRow = (): GemRow => ({
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
});

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
  diamondWeights: [] as MasterOption[],
  diamondQualities: [] as MasterOption[],
  vendorNames: [] as MasterOption[],
  laborHeads: [] as MasterOption[],
  laborRules: [] as MasterOption[],
  overheadRules: [] as MasterOption[],
  findingHeads: [] as MasterOption[],
  packetStones: [] as MasterOption[],
  packetShapes: [] as MasterOption[],
  packetSizes: [] as MasterOption[],
  packetColors: [] as MasterOption[],
  packetQualities: [] as MasterOption[],
};

const masterTypeLabelMap: Record<DesignMasterType, string> = {
  JEWELRY_GROUP: 'Category',
  COLLECTION: 'Sub Category',
  JEWELRY_SIZE: 'Jewelry Size',
  TAG: 'Tag',
  DESIGN_STATUS: 'Design Status',
  STAGE: 'Stage',
  METAL_CARATAGE: 'Metal Caratage',
  GOLD_COLOUR: 'Metal Caratage',
  DIAMOND_TYPE: 'Diamond Type',
  DIAMOND_SPREAD: 'Diamond Spread',
  DIAMOND_WEIGHT: 'Diamond Wt',
  DIAMOND_QUALITY: 'Diamond Quality',
  VENDOR_NAME: 'Vendor Name',
  LABOR_HEAD: 'Labor Head',
  LABOR_RULE: 'Labor Master',
  OVERHEAD_RULE: 'Overhead Master',
  FINDING_HEAD: 'Finding Head',
  PACKET_STONE: 'Stone',
  PACKET_SHAPE: 'Shape',
  PACKET_SIZE: 'Size',
  PACKET_CUT: 'Cut',
  PACKET_COLOR: 'Color',
  PACKET_QUALITY: 'Quality',
};

const inlineMasterAddButtonClass =
  'inline-flex h-9 min-w-[2.25rem] shrink-0 items-center justify-center rounded-lg border border-[#d9ccbc] bg-[#fbf8f3] px-2 text-sm font-semibold leading-none text-[#8f6a2c] transition-colors hover:border-[#cdb58d] hover:bg-[#f6ecda] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8d3ad] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60';
const FINDING_FEATURE_ENABLED = false;
const VERSION_BUILDER_DIMENSION_CONFIG: Array<{ id: keyof VersionBuilderSelections; label: string; helper: string }> = [
  { id: 'metals', label: 'Metal', helper: 'Creates one version per selected metal.' },
  { id: 'coverages', label: 'Coverage', helper: 'Use all coverage variants for this design.' },
  { id: 'diamondQualities', label: 'Diamond Quality', helper: 'Useful when pricing differs by quality.' },
  { id: 'caratWeights', label: 'Carat Weight', helper: 'Optional if your design supports multiple carat weights.' },
  { id: 'sizes', label: 'Jewelry Size', helper: 'Select one or many sizes for this version batch.' },
];

const EMPTY_VERSION_BUILDER_SELECTIONS: VersionBuilderSelections = {
  metals: [],
  coverages: [],
  diamondQualities: [],
  caratWeights: [],
  sizes: [],
};

const VERSION_BUILDER_GROUP_COLORS = ['#c7983f', '#3f6db3', '#2f8f67', '#9a5ed0', '#c46b3d', '#6f7b87'];
const VERSION_BUILDER_SIZE_CHART_SIZES = buildVersionBuilderSizeChartSizes();
const ZERO_LIKE_NUMERIC_VALUE = /^0(?:\.0+)?$/;
const VERSION_BUILDER_WORKFLOW: Array<{
  id: VersionBuilderWorkflowStep;
  title: string;
  subtitle: string;
}> = [
  { id: 'INFO', title: '1 - Style Info', subtitle: 'Base style and general info.' },
  { id: 'DIMENSIONS', title: '2 - Variant Axes', subtitle: 'Toggle values on and off for version generation.' },
  { id: 'GEMSTONES', title: '3a - Stone Layout', subtitle: 'Copy or override gemstone rows.' },
  { id: 'SIZE_CHART', title: '3b - Composition Size Chart', subtitle: 'Edit counts and carat per stone by size.' },
  { id: 'IMAGES', title: '4 - Media Rules', subtitle: 'Set media behavior for new versions.' },
  { id: 'LABOR_OVERHEAD', title: '5 - Labor & Overhead', subtitle: 'Add labor rows and overhead rules before BOM.' },
  { id: 'BOM', title: '6 - BOM', subtitle: 'Live cost breakdown for a sample variant.' },
  { id: 'PREVIEW', title: '7 - Generated', subtitle: 'Review generated version rows.' },
];

function shouldReplaceZeroLikeNumericValue(value: string) {
  return ZERO_LIKE_NUMERIC_VALUE.test(value.trim());
}

function handleNumericFieldFocus(event: FocusEvent<HTMLInputElement>) {
  if (!shouldReplaceZeroLikeNumericValue(event.currentTarget.value)) {
    return;
  }

  requestAnimationFrame(() => {
    try {
      event.currentTarget.select();
    } catch {
      // Ignore select failures on browser-managed read-only states.
    }
  });
}

function handleNumericFieldMouseUp(event: ReactMouseEvent<HTMLInputElement>) {
  if (shouldReplaceZeroLikeNumericValue(event.currentTarget.value)) {
    event.preventDefault();
  }
}

function sanitizeNumericTextInput(value: string, mode: 'decimal' | 'integer' = 'decimal') {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (mode === 'integer') {
    const digitsOnly = trimmed.replace(/\D+/g, '');
    if (!digitsOnly) return '';
    const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
    return normalized || '0';
  }

  const cleaned = trimmed.replace(/[^0-9.]+/g, '');
  if (!cleaned) return '';

  const firstDotIndex = cleaned.indexOf('.');
  const normalizedRaw =
    firstDotIndex === -1
      ? cleaned
      : `${cleaned.slice(0, firstDotIndex)}.${cleaned
          .slice(firstDotIndex + 1)
          .replace(/\./g, '')}`;

  if (normalizedRaw.endsWith('.')) {
    const whole = normalizedRaw.slice(0, -1).replace(/^0+(?=\d)/, '');
    return `${whole || '0'}.`;
  }

  if (normalizedRaw.includes('.')) {
    const [wholePart, decimalPart] = normalizedRaw.split('.', 2);
    const normalizedWhole = wholePart.replace(/^0+(?=\d)/, '');
    return `${normalizedWhole || '0'}.${decimalPart || ''}`;
  }

  const normalized = normalizedRaw.replace(/^0+(?=\d)/, '');
  return normalized || '0';
}

function handleNumericFieldKeyDown(
  event: React.KeyboardEvent<HTMLInputElement>,
  mode: 'decimal' | 'integer' = 'decimal',
) {
  const allowedControlKeys = new Set([
    'Backspace',
    'Delete',
    'Tab',
    'Enter',
    'Escape',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
  ]);

  if (event.ctrlKey || event.metaKey) {
    return;
  }

  if (allowedControlKeys.has(event.key)) {
    return;
  }

  if (/^\d$/.test(event.key)) {
    return;
  }

  if (mode === 'decimal' && event.key === '.' && !event.currentTarget.value.includes('.')) {
    return;
  }

  event.preventDefault();
}

function handleNumericFieldPaste(
  event: React.ClipboardEvent<HTMLInputElement>,
  mode: 'decimal' | 'integer' = 'decimal',
) {
  const pasted = event.clipboardData.getData('text');
  const sanitized = sanitizeNumericTextInput(pasted, mode);
  if (sanitized === pasted.trim()) {
    return;
  }
  event.preventDefault();
}

function StatusBadge({ status, type }: { status: string; type: 'primary' | 'info' | 'success' | 'danger' }) {
  let bgColor = 'bg-slate-50/80';
  let borderColor = 'border-slate-200/80';
  let textColor = 'text-slate-700';
  let ringColor = 'ring-slate-500/10';

  if (type === 'primary') {
    bgColor = 'bg-blue-50/80';
    borderColor = 'border-blue-200/80';
    textColor = 'text-blue-700';
    ringColor = 'ring-blue-500/10';
  } else if (type === 'info') {
    bgColor = 'bg-cyan-50/80';
    borderColor = 'border-cyan-200/80';
    textColor = 'text-cyan-700';
    ringColor = 'ring-cyan-500/10';
  } else if (type === 'success') {
    bgColor = 'bg-emerald-50/80';
    borderColor = 'border-emerald-200/80';
    textColor = 'text-emerald-700';
    ringColor = 'ring-emerald-500/10';
  } else if (type === 'danger') {
    bgColor = 'bg-rose-50/80';
    borderColor = 'border-rose-200/80';
    textColor = 'text-rose-700';
    ringColor = 'ring-rose-500/10';
  }

  return (
    <span className={`inline-flex shrink-0 resize-none items-center justify-center whitespace-nowrap rounded-full ${borderColor} ${bgColor} px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wider ${textColor} shadow-sm ring-1 ${ringColor}`}>
      {status}
    </span>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <span className="inline-flex shrink-0 resize-none items-center justify-center whitespace-nowrap rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wider text-amber-700 shadow-sm ring-1 ring-amber-500/10">
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
    ) : label === 'Versions' || label === 'Hide Versions' ? (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="5" width="12" height="12" rx="2" />
        <path d="M8 9h4M8 13h6" />
        <path d="M14 3h6v14a2 2 0 0 1-2 2H8" />
      </svg>
    ) : label === 'Set Primary' ? (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.8l-5.4 2.9 1-6.1-4.4-4.3 6.1?.9L12 3Z" />
      </svg>
    ) : label === 'Version Builder' ? (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="6" height="6" rx="1.5" />
        <rect x="3" y="14" width="6" height="6" rx="1.5" />
        <rect x="13" y="4" width="8" height="8" rx="2" />
        <path d="m16 9 1.8 1.8L21 7.6" />
        <path d="M13 17h8M17 13v8" />
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
  zIndexClass = 'z-[100]',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: string;
  zIndexClass?: string;
}) {
  return createPortal(
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-slate-900/60 p-4 sm:p-6 backdrop-blur-sm transition-all duration-300`}>
      <div className={`relative flex w-full ${size} max-h-full flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl`}>
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
        <div className="flex-1 overflow-y-auto bg-slate-50/30 p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
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
  const [isDesignNameManual, setIsDesignNameManual] = useState(false);
  const [structuredSerialOverride, setStructuredSerialOverride] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showMediaLibraryModal, setShowMediaLibraryModal] = useState(false);
  const [showVersionBuilderModal, setShowVersionBuilderModal] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDesignIsPrimary, setEditingDesignIsPrimary] = useState(false);
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
  const [overheadRows, setOverheadRows] = useState<OverheadRow[]>([]);
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
  const [inlineOverheadApplyMode, setInlineOverheadApplyMode] = useState<'PERCENT_MATERIALS' | 'PERCENT_BOM_SUBTOTAL' | 'FLAT'>('PERCENT_MATERIALS');
  const [inlineRatePercent, setInlineRatePercent] = useState('');
  const [inlineFlatAmount, setInlineFlatAmount] = useState('');
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
  const [versionBuilderBaseDesign, setVersionBuilderBaseDesign] = useState<DesignRow | null>(null);
  const [versionBuilderSelections, setVersionBuilderSelections] = useState<VersionBuilderSelections>(
    EMPTY_VERSION_BUILDER_SELECTIONS,
  );
  const [versionBuilderImageMode, setVersionBuilderImageMode] = useState<VersionBuilderImageMode>('INHERIT_PARENT');
  const [versionBuilderGemMode, setVersionBuilderGemMode] = useState<VersionBuilderGemMode>('OVERRIDE_BLOCK');
  const [, setVersionBuilderGemApplyScope] = useState<VersionBuilderGemApplyScope>('ALL_COMBINATIONS');
  const [versionBuilderWorkflowStep, setVersionBuilderWorkflowStep] = useState<VersionBuilderWorkflowStep>('INFO');
  const [versionBuilderMetalImageMap, setVersionBuilderMetalImageMap] = useState<Record<string, string[]>>({});
  const [versionBuilderActiveMetal, setVersionBuilderActiveMetal] = useState('');
  const [versionBuilderUploadedImageUrls, setVersionBuilderUploadedImageUrls] = useState<string[]>([]);
  const [versionBuilderUploadedMediaItems, setVersionBuilderUploadedMediaItems] = useState<
    VersionBuilderUploadedMediaItem[]
  >([]);
  const [versionBuilderGemRows, setVersionBuilderGemRows] = useState<GemRow[]>([]);
  const [versionBuilderGemLoading, setVersionBuilderGemLoading] = useState(false);
  const [versionBuilderGemError, setVersionBuilderGemError] = useState<string | null>(null);
  const [versionBuilderGemGroupModes, setVersionBuilderGemGroupModes] = useState<Record<string, 'varies' | 'fixed'>>({});
  const [versionBuilderBaseMetalRows, setVersionBuilderBaseMetalRows] = useState<MetalRow[]>([]);
  const [versionBuilderChartCoverage, setVersionBuilderChartCoverage] = useState('');
  const [versionBuilderSizeChart, setVersionBuilderSizeChart] = useState<VersionBuilderSizeChartState>({});
  const [versionBuilderLaborRows, setVersionBuilderLaborRows] = useState<LaborRow[]>([
    { id: makeId(), laborHead: '', laborPerUnit: '', unitQty: '', laborValue: '' },
  ]);
  const [versionBuilderOverheadRows, setVersionBuilderOverheadRows] = useState<OverheadRow[]>([]);
  const [versionBuilderBomSelection, setVersionBuilderBomSelection] = useState<VersionBuilderBomSelection>({
    size: '',
    metal: '',
    diamondQuality: '',
    coverage: '',
    caratWeight: '',
  });
  const [versionBuilderGeneratedFilters, setVersionBuilderGeneratedFilters] =
    useState<VersionBuilderGeneratedFilterState>({
      size: 'ALL',
      coverage: 'ALL',
      search: '',
    });
  const [creatingVersions, setCreatingVersions] = useState(false);
  const [versionCreateProgress, setVersionCreateProgress] = useState({ done: 0, total: 0 });
  const [versionBuilderCreateResults, setVersionBuilderCreateResults] = useState<
    Record<string, VersionBuilderCreateResult>
  >({});
  const [expandedBaseDesigns, setExpandedBaseDesigns] = useState<string[]>([]);
  const [mediaLibraryType, setMediaLibraryType] = useState<MediaLibraryTypeFilter>('ALL');
  const [mediaLibrarySearch, setMediaLibrarySearch] = useState('');
  const [mediaLibraryRows, setMediaLibraryRows] = useState<MediaLibraryItem[]>([]);
  const [mediaLibraryLoading, setMediaLibraryLoading] = useState(false);
  const [mediaLibraryUploading, setMediaLibraryUploading] = useState(false);
  const designImportInputRef = useRef<HTMLInputElement | null>(null);
  const columnPickerRef = useRef<HTMLDivElement | null>(null);
  const [sourceDesignNo, setSourceDesignNo] = useState('');
  const inlineMasterCreatedHandlerRef = useRef<((masterValue: string, createdMaster?: { id?: string; value?: string }) => void) | null>(null);
  const galleryUploadInputRef = useRef<HTMLInputElement | null>(null);
  const stlUploadInputRef = useRef<HTMLInputElement | null>(null);
  const mediaLibraryGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const mediaLibraryStlInputRef = useRef<HTMLInputElement | null>(null);
  const versionBuilderUploadInputRef = useRef<HTMLInputElement | null>(null);
  const selectAllVisibleCheckboxRef = useRef<HTMLInputElement | null>(null);
  const designNoRequestSeqRef = useRef(0);
  const designSaveNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [designSaveNotice, setDesignSaveNotice] = useState<string | null>(null);

  const selected = useMemo(() => rows.find((item) => item.id === selectedId) ?? rows[0] ?? null, [rows, selectedId]);
  const detailInfo = detailDesign ?? selected;
  const primaryMetalValue = metalRows[0]?.goldColour || '';
  const structuredMetalOptions = useMemo(
    () => (masterOptions.metalCaratages.length > 0 ? masterOptions.metalCaratages : masterOptions.goldColours),
    [masterOptions.goldColours, masterOptions.metalCaratages],
  );
  const structuredCategoryCode = useMemo(() => {
    const match = masterOptions.jewelryGroups.find(
      (option) => normalizeLookupKey(option.value) === normalizeLookupKey(form.jewelryGroup),
    );
    return sanitizeStructuredToken(match?.aliasName || form.jewelryGroup).slice(0, 5);
  }, [form.jewelryGroup, masterOptions.jewelryGroups]);
  const structuredCoverageCode = useMemo(
    () => resolveCoverageCode(form.diamondSpread, form.coverageCustom),
    [form.coverageCustom, form.diamondSpread],
  );
  const structuredDiamondQualityCode = useMemo(
    () => resolveDiamondQualityCode(form.diamondQuality, form.diamondQualityCustom),
    [form.diamondQuality, form.diamondQualityCustom],
  );
  const structuredSerialCode = useMemo(() => {
    if (structuredSerialOverride.trim()) {
      return structuredSerialOverride.trim();
    }
    const categoryAlias =
      masterOptions.jewelryGroups.find(
        (option) => normalizeLookupKey(option.value) === normalizeLookupKey(form.jewelryGroup),
      )?.aliasName || '';
    return getNextStructuredDesignSerial(form.jewelryGroup, rows, categoryAlias);
  }, [form.jewelryGroup, masterOptions.jewelryGroups, rows, structuredSerialOverride]);

  const showDesignSaveNotice = useCallback((message: string) => {
    setDesignSaveNotice(message);
    if (designSaveNoticeTimeoutRef.current) {
      clearTimeout(designSaveNoticeTimeoutRef.current);
    }
    designSaveNoticeTimeoutRef.current = setTimeout(() => {
      setDesignSaveNotice(null);
      designSaveNoticeTimeoutRef.current = null;
    }, 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (designSaveNoticeTimeoutRef.current) {
        clearTimeout(designSaveNoticeTimeoutRef.current);
      }
    };
  }, []);
  const structuredMetalCode = useMemo(
    () => resolveMetalCode(primaryMetalValue, structuredMetalOptions),
    [primaryMetalValue, structuredMetalOptions],
  );
  const structuredSizeCode = useMemo(() => resolveSizeCode(form.jewelrySize), [form.jewelrySize]);
  const structuredDesignNo = useMemo(
    () =>
      buildStructuredDesignNo({
        categoryCode: structuredCategoryCode,
        serialCode: structuredSerialCode,
        coverageCode: structuredCoverageCode,
        metalCode: structuredMetalCode,
        diamondQualityCode: structuredDiamondQualityCode,
        sizeCode: structuredSizeCode,
      }),
    [
      structuredCategoryCode,
      structuredCoverageCode,
      structuredDiamondQualityCode,
      structuredMetalCode,
      structuredSerialCode,
      structuredSizeCode,
    ],
  );
  const detailGalleryUrls = useMemo(
    () => normalizeStringArray(detailInfo?.imageUrls).map(resolvePublicAssetUrl),
    [detailInfo],
  );
  const filteredSubCategoryOptions = useMemo(() => {
    if (!form.jewelryGroup.trim()) {
      return [];
    }
    const normalizedCategory = normalizeLookupKey(form.jewelryGroup);
    return masterOptions.collections.filter(
      (option) => normalizeLookupKey(option.jewelryGroup || '') === normalizedCategory,
    );
  }, [form.jewelryGroup, masterOptions.collections]);
  const filteredJewelrySizeOptions = useMemo(() => {
    if (!form.jewelryGroup.trim()) {
      return [];
    }
    const normalizedCategory = form.jewelryGroup.trim().toLowerCase();
    return masterOptions.jewelrySizes.filter(
      (option) => (option.jewelryGroup || '').trim().toLowerCase() === normalizedCategory,
    );
  }, [form.jewelryGroup, masterOptions.jewelrySizes]);
  const singleDesignOverheadRules = useMemo(() => {
    const categoryKey = normalizeLookupKey(form.jewelryGroup);
    return masterOptions.overheadRules.filter((rule) => {
      const ruleCategory = normalizeLookupKey(rule.jewelryGroup);
      return !categoryKey || !ruleCategory || ruleCategory === categoryKey;
    });
  }, [form.jewelryGroup, masterOptions.overheadRules]);

  useEffect(() => {
    if (editingId || sourceDesignNo) {
      return;
    }

    setForm((prev) => {
      if (prev.designNo === structuredDesignNo && (isDesignNameManual || prev.designName === structuredDesignNo)) {
        return prev;
      }

      return {
        ...prev,
        designNo: structuredDesignNo,
        designName: isDesignNameManual ? prev.designName : structuredDesignNo,
      };
    });
  }, [editingId, isDesignNameManual, sourceDesignNo, structuredDesignNo]);

  useEffect(() => {
    setVersionBuilderGemGroupModes((prev) => {
      const next: Record<string, 'varies' | 'fixed'> = {};
      versionBuilderGemRows.forEach((row) => {
        next[row.id] = prev[row.id] || 'varies';
      });
      const keysChanged =
        Object.keys(next).length !== Object.keys(prev).length ||
        Object.keys(next).some((key) => next[key] !== prev[key]);
      return keysChanged ? next : prev;
    });
  }, [versionBuilderGemRows]);
  const filteredSubCategoryFilterOptions = useMemo(() => {
    if (!filters.jewelryGroup.trim()) {
      return masterOptions.collections;
    }
    const normalizedCategory = normalizeLookupKey(filters.jewelryGroup);
    return masterOptions.collections.filter(
      (option) => normalizeLookupKey(option.jewelryGroup || '') === normalizedCategory,
    );
  }, [filters.jewelryGroup, masterOptions.collections]);
  const filteredJewelrySizeFilterOptions = useMemo(() => {
    if (!filters.jewelryGroup.trim()) {
      return masterOptions.jewelrySizes;
    }
    const normalizedCategory = filters.jewelryGroup.trim().toLowerCase();
    return masterOptions.jewelrySizes.filter(
      (option) => (option.jewelryGroup || '').trim().toLowerCase() === normalizedCategory,
    );
  }, [filters.jewelryGroup, masterOptions.jewelrySizes]);
  const detailStlUrl = useMemo(
    () => (detailInfo?.stlFileUrl ? resolvePublicAssetUrl(detailInfo.stlFileUrl) : ''),
    [detailInfo],
  );
  const ijewelPreviewUrl = useMemo(
    () => buildIjewelEmbedUrl(detailInfo?.ijewelModelId, detailInfo?.ijewelBaseName),
    [detailInfo?.ijewelModelId, detailInfo?.ijewelBaseName],
  );
  const ijewelIframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const frame = ijewelIframeRef.current;
    if (!frame || !ijewelPreviewUrl) return;
    frame.setAttribute('allow', 'autoplay; fullscreen; xr-spatial-tracking; web-share');
    frame.setAttribute('xr-spatial-tracking', '');
    frame.setAttribute('execution-while-out-of-viewport', '');
    frame.setAttribute('execution-while-not-rendered', '');
    frame.setAttribute('web-share', '');
    frame.style.width = '100%';
    frame.style.height = '340px';
  }, [ijewelPreviewUrl]);
  const detailMetals = useMemo(
    () => (Array.isArray(detailDesign?.metals) ? detailDesign.metals : []),
    [detailDesign],
  );
  const detailGemstones = useMemo(
    () => (Array.isArray(detailDesign?.gemstones) ? detailDesign.gemstones : []),
    [detailDesign],
  );
  const detailAllLabors = useMemo(
    () => (Array.isArray(detailDesign?.labors) ? detailDesign.labors : []),
    [detailDesign],
  );
  const detailLabors = useMemo(
    () =>
      detailAllLabors.filter(
        (labor: any) => !String(labor?.laborHead || '').trim().toLowerCase().startsWith('overhead -'),
      ),
    [detailAllLabors],
  );
  const detailOverheadRows = useMemo(
    () =>
      detailAllLabors.filter((labor: any) =>
        String(labor?.laborHead || '').trim().toLowerCase().startsWith('overhead -'),
      ),
    [detailAllLabors],
  );
  const detailSummary = useMemo(() => {
    const computedLaborValue = detailLabors.reduce(
      (sum: number, labor: any) => sum + parseNumericValue(labor?.laborValue),
      0,
    );
    const computedOverheadValue = detailOverheadRows.reduce(
      (sum: number, labor: any) => sum + parseNumericValue(labor?.laborValue),
      0,
    );
    return {
      metalValue: parseNumericValue(detailDesign?.metalValue),
      gemValue: parseNumericValue(detailDesign?.gemValue),
      laborValue: detailAllLabors.length ? computedLaborValue : parseNumericValue(detailDesign?.laborValue),
      overheadValue: detailAllLabors.length ? computedOverheadValue : 0,
      findingValue: parseNumericValue(detailDesign?.findingValue),
      totalValue: parseNumericValue(detailDesign?.totalValue),
    };
  }, [detailAllLabors.length, detailDesign, detailLabors, detailOverheadRows]);
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

  const syncDesignNoFromServer = (jewelryGroup: string, options?: { structured?: boolean }) => {
    const group = jewelryGroup.trim();
    if (!group || isDesignNoManual) return;

    const requestSeq = ++designNoRequestSeqRef.current;
    void (async () => {
      try {
        const response = await api.get('/products/next-design-no', {
          params: { jewelryGroup: group, structured: options?.structured === true },
        });
        const suggestedDesignNo = String(response.data?.designNo || '').trim();
        if (!suggestedDesignNo) return;
        const suggestedSerial = String(response.data?.serial || '').trim();
        if (options?.structured && suggestedSerial) {
          setStructuredSerialOverride(suggestedSerial);
        }

        setForm((prev) => {
          if (designNoRequestSeqRef.current !== requestSeq) return prev;
          const previousAutoName = isAutoGeneratedDesignName(prev.designName, prev.jewelryGroup, prev.designNo);
          if (options?.structured) {
            return {
              ...prev,
              designNo: prev.designNo,
              designName: previousAutoName ? prev.designNo : prev.designName,
            };
          }
          return {
            ...prev,
            designNo: suggestedDesignNo,
            designName: previousAutoName ? suggestedDesignNo : prev.designName,
          };
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
    const isStructuredNewDesignMode = !editingId && !sourceDesignNo;
    setStructuredSerialOverride('');
    const nextDesignNo = isDesignNoManual || isStructuredNewDesignMode ? '' : suggestNextDesignNo(jewelryGroup);
    setForm((prev) => {
      const previousAutoName = isAutoGeneratedDesignName(prev.designName, prev.jewelryGroup, prev.designNo);
      return {
        ...prev,
        jewelryGroup,
        jewelrySize: nextJewelrySizeOptions.some(
          (option) => normalizeLookupKey(option.value) === normalizeLookupKey(prev.jewelrySize),
        )
          ? prev.jewelrySize
          : '',
        designNo: isDesignNoManual ? prev.designNo : nextDesignNo,
        designName: previousAutoName && !isDesignNoManual ? nextDesignNo : prev.designName,
      };
    });

    if (!isDesignNoManual) {
      syncDesignNoFromServer(jewelryGroup, { structured: isStructuredNewDesignMode });
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
      const limit = 200;
      let currentPage = 1;
      let totalPages = 1;
      const allRows: ApiDesignRow[] = [];

      do {
        const response = await api.get('/products', {
          params: {
            page: currentPage,
            limit,
            status: 'ALL',
          },
        });
        const pageRows = (response.data?.data || []) as ApiDesignRow[];
        allRows.push(...pageRows);
        totalPages = Number(response.data?.totalPages || 1);
        currentPage += 1;
      } while (currentPage <= totalPages);

      const mappedRows = allRows.map(mapApiDesignToRow);
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
        diamondWeights: response.data?.diamondWeights || [],
        diamondQualities: response.data?.diamondQualities || [],
        vendorNames: response.data?.vendorNames || [],
        laborHeads: response.data?.laborHeads || [],
        laborRules: response.data?.laborRules || [],
        overheadRules: response.data?.overheadRules || [],
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

  const fetchMediaLibrary = async () => {
    setMediaLibraryLoading(true);
    try {
      const response = await api.get('/products/media-library', {
        params: {
          page: 1,
          limit: 200,
          type: mediaLibraryType,
          search: mediaLibrarySearch.trim() || undefined,
        },
      });

      const rows = (response.data?.data || []) as Array<Record<string, unknown>>;
      const mapped = rows.map((entry) => ({
        id: String(entry.id || ''),
        mediaType: String(entry.mediaType || 'IMAGE').toUpperCase() as MediaLibraryTypeFilter,
        fileName: String(entry.fileName || ''),
        fileKey: String(entry.fileKey || ''),
        mimeType: entry.mimeType ? String(entry.mimeType) : null,
        fileSizeBytes:
          entry.fileSizeBytes !== undefined && entry.fileSizeBytes !== null
            ? Number(entry.fileSizeBytes)
            : null,
        url: resolvePublicAssetUrl(String(entry.url || entry.fileKey || '')),
        uploadedBy: entry.uploadedBy ? String(entry.uploadedBy) : null,
        createdAt: entry.createdAt ? String(entry.createdAt) : null,
      }));
      setMediaLibraryRows(mapped.filter((item) => item.id && item.fileKey));
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to load media library.');
      setMediaLibraryRows([]);
    } finally {
      setMediaLibraryLoading(false);
    }
  };

  const handleMediaLibraryGalleryUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
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

    setMediaLibraryUploading(true);
    try {
      await api.post('/products/gallery-files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchMediaLibrary();
      window.alert('Media uploaded and added to library.');
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to upload media.');
    } finally {
      setMediaLibraryUploading(false);
    }
  };

  const handleMediaLibraryStlUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
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

    setMediaLibraryUploading(true);
    try {
      await api.post('/products/stl-files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchMediaLibrary();
      window.alert('STL uploaded and added to library.');
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to upload STL files.');
    } finally {
      setMediaLibraryUploading(false);
    }
  };

  const copyMediaLibraryKey = async (key: string) => {
    const value = (key || '').trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      window.alert('Unable to copy key. Please copy manually.');
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

  const buildPacketSearchOptions = (rowId: string) =>
    packetOptions.map((packet) => {
      const isCurrentPacket = gemRows.find((row) => row.id === rowId)?.packetId === packet.id;
      const packetUsedByOtherRow = gemRows.some((row) => row.id !== rowId && row.packetId === packet.id);
      const barcodeLabel = packet.barcode ? ` (${packet.barcode})` : '';
      return {
        value: packet.id,
        label: `${packet.packetName}${barcodeLabel}`,
        disabled: !isCurrentPacket && packetUsedByOtherRow,
      };
    });

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
    setInlineOverheadApplyMode('PERCENT_MATERIALS');
    setInlineRatePercent('');
    setInlineFlatAmount('');
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
    } else if (masterType === 'DIAMOND_WEIGHT') {
      setForm((prev) => ({ ...prev, diamondWeight: masterValue }));
    } else if (masterType === 'DIAMOND_QUALITY') {
      setForm((prev) => ({ ...prev, diamondQuality: masterValue }));
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
    } else if (masterType === 'VENDOR_NAME') {
      setVendorRows((prev) => {
        const base = prev.length > 0 ? prev : [createDefaultVendorRow()];
        const [first, ...rest] = base;
        return [{ ...first, supplier: masterValue }, ...rest];
      });
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
    onCreated?: (masterValue: string, createdMaster?: { id?: string; value?: string }) => void,
  ) => {
    const scopedJewelryGroupValue =
      masterType === 'OVERHEAD_RULE' && showVersionBuilderModal && versionBuilderBaseDesign?.jewelryGroup
        ? versionBuilderBaseDesign.jewelryGroup
        : form.jewelryGroup;
    const selectedJewelryGroupId =
      masterType === 'JEWELRY_SIZE' || masterType === 'COLLECTION' || masterType === 'OVERHEAD_RULE'
        ? masterOptions.jewelryGroups.find(
            (option) => normalizeLookupKey(option.value) === normalizeLookupKey(scopedJewelryGroupValue),
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
    setInlineOverheadApplyMode('PERCENT_MATERIALS');
    setInlineRatePercent('');
    setInlineFlatAmount('');
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
    const categoryScopedPayload =
      inlineMasterType === 'JEWELRY_SIZE' || inlineMasterType === 'COLLECTION' || inlineMasterType === 'OVERHEAD_RULE'
        ? {
            jewelryGroupId: inlineJewelryGroupId,
          }
        : null;
    const overheadRulePayload =
      inlineMasterType === 'OVERHEAD_RULE'
        ? {
            overheadApplyMode: inlineOverheadApplyMode,
            ratePercent:
              inlineOverheadApplyMode !== 'FLAT' && inlineRatePercent.trim().length > 0
                ? parseNum(inlineRatePercent)
                : undefined,
            flatAmount:
              inlineOverheadApplyMode === 'FLAT' && inlineFlatAmount.trim().length > 0
                ? parseNum(inlineFlatAmount)
                : undefined,
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
    if (
      (inlineMasterType === 'JEWELRY_SIZE' || inlineMasterType === 'COLLECTION' || inlineMasterType === 'OVERHEAD_RULE') &&
      !inlineJewelryGroupId.trim()
    ) {
      window.alert('Category is required.');
      return;
    }
    if (inlineMasterType === 'OVERHEAD_RULE') {
      if (inlineOverheadApplyMode === 'FLAT' && inlineFlatAmount.trim().length === 0) {
        window.alert('Flat Amount is required for flat overhead mode.');
        return;
      }
      if (inlineOverheadApplyMode !== 'FLAT' && inlineRatePercent.trim().length === 0) {
        window.alert('Rate % is required for percentage overhead mode.');
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
        ...(categoryScopedPayload || {}),
        ...(findingPayload || {}),
        ...(defaultWastagePayload || {}),
        ...(metalCaratagePayload || {}),
        ...(overheadRulePayload || {}),
      });

      const masterValue = response.data?.value || value;
      await fetchMasterOptions();

      if (inlineMasterCreatedHandlerRef.current) {
        inlineMasterCreatedHandlerRef.current(masterValue, {
          id: response.data?.id,
          value: response.data?.value || masterValue,
        });
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
        key !== 'barcode' &&
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
      barcode: packetForm.barcode.trim() || undefined,
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
    if (!showMediaLibraryModal) {
      return;
    }
    void fetchMediaLibrary();
  }, [showMediaLibraryModal, mediaLibraryType, mediaLibrarySearch]);

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
    if (!showActionsDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!actionsDropdownRef.current?.contains(event.target as Node)) {
        setShowActionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionsDropdown]);

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
    if (!form.collection.trim()) return;
    const exists = filteredSubCategoryOptions.some((option) => option.value === form.collection);
    if (!exists) {
      setForm((prev) => ({ ...prev, collection: '' }));
    }
  }, [filteredSubCategoryOptions, form.collection]);

  useEffect(() => {
    if (!form.jewelrySize.trim()) return;
    const exists = filteredJewelrySizeOptions.some((option) => option.value === form.jewelrySize);
    if (!exists) {
      setForm((prev) => ({ ...prev, jewelrySize: '' }));
    }
  }, [filteredJewelrySizeOptions, form.jewelrySize]);

  useEffect(() => {
    if (!filters.collection.trim()) return;
    const exists = filteredSubCategoryFilterOptions.some((option) => option.value === filters.collection);
    if (!exists) {
      setFilters((prev) => ({ ...prev, collection: '' }));
    }
  }, [filteredSubCategoryFilterOptions, filters.collection]);

  useEffect(() => {
    if (!filters.jewelrySize.trim()) return;
    const exists = filteredJewelrySizeFilterOptions.some((option) => option.value === filters.jewelrySize);
    if (!exists) {
      setFilters((prev) => ({ ...prev, jewelrySize: '' }));
    }
  }, [filteredJewelrySizeFilterOptions, filters.jewelrySize]);

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

  const versionsByBaseDesign = useMemo(() => {
    const map = new Map<string, DesignRow[]>();
    rows.forEach((row) => {
      const key = getDesignFamilyKey(row.designNo || '', row.designNo || row.id);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(row);
    });
    map.forEach((list, key) => {
      map.set(
        key,
        [...list].sort((a, b) => getVersionNumber(b.version) - getVersionNumber(a.version)),
      );
    });
    return map;
  }, [rows]);

  const filteredBaseRows = useMemo(() => {
    const map = new Map<string, DesignRow>();
    filteredRows.forEach((row) => {
      const key = getDesignFamilyKey(row.designNo || '', row.designNo || row.id);
      if (map.has(key)) return;
      const versions = versionsByBaseDesign.get(key) || [row];
      map.set(key, pickPrimaryDesignRow(versions));
    });
    return Array.from(map.values());
  }, [filteredRows, versionsByBaseDesign]);

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

  const toggleVersionsForDesign = (designNo: string) => {
    const base = getDesignFamilyKey(designNo || '');
    if (!base) return;
    setExpandedBaseDesigns((prev) =>
      prev.includes(base) ? prev.filter((item) => item !== base) : [...prev, base],
    );
  };

  const isVersionsExpanded = (designNo: string) => {
    const base = getDesignFamilyKey(designNo || '');
    return base ? expandedBaseDesigns.includes(base) : false;
  };

  const getVersionsForDesign = (designNo: string): DesignRow[] => {
    const base = getDesignFamilyKey(designNo || '');
    if (!base) return [];
    return versionsByBaseDesign.get(base) || [];
  };

  const versionBuilderVersionRows = useMemo(
    () => (versionBuilderBaseDesign ? getVersionsForDesign(versionBuilderBaseDesign.designNo) : []),
    [versionBuilderBaseDesign, versionsByBaseDesign],
  );

  const versionBuilderOptionGroups = useMemo<VersionBuilderOptionGroup[]>(() => {
    if (!versionBuilderBaseDesign) {
      return [];
    }

    const normalizedGroup = versionBuilderBaseDesign.jewelryGroup.trim().toLowerCase();
    const filteredSizeOptions =
      masterOptions.jewelrySizes
        .filter((option) => {
          const optionGroup = (option.jewelryGroup || '').trim().toLowerCase();
          return !normalizedGroup || optionGroup === normalizedGroup;
        })
        .map((option) => option.value) || [];

    const metals = uniqueNonEmptyValues([
      ...masterOptions.metalCaratages.map((option) => option.aliasName || option.value),
      ...masterOptions.goldColours.map((option) => option.aliasName || option.value),
      versionBuilderBaseDesign.goldColour,
    ]);
    const coverages = uniqueNonEmptyValues([
      ...masterOptions.diamondSpreads.map((option) => option.value),
      versionBuilderBaseDesign.diamondSpread,
    ]);
    const diamondQualities = uniqueNonEmptyValues(masterOptions.diamondQualities.map((option) => option.value));
    const caratWeights = uniqueNonEmptyValues(masterOptions.diamondWeights.map((option) => option.value));
    const sizes = uniqueNonEmptyValues([...filteredSizeOptions, versionBuilderBaseDesign.jewelrySize]);

    return VERSION_BUILDER_DIMENSION_CONFIG.map((dimension) => {
      if (dimension.id === 'metals') {
        return { ...dimension, values: metals };
      }
      if (dimension.id === 'coverages') {
        return { ...dimension, values: coverages };
      }
      if (dimension.id === 'diamondQualities') {
        return { ...dimension, values: diamondQualities };
      }
      if (dimension.id === 'caratWeights') {
        return { ...dimension, values: caratWeights };
      }
      return { ...dimension, values: sizes };
    });
  }, [masterOptions, versionBuilderBaseDesign]);

  const openVersionBuilder = (row: DesignRow) => {
    setVersionBuilderBaseDesign(row);

    setVersionBuilderSelections({
      metals: [],
      coverages: [],
      diamondQualities: [],
      caratWeights: [],
      sizes: [],
    });
    setVersionBuilderImageMode('INHERIT_PARENT');
    setVersionBuilderGemMode('OVERRIDE_BLOCK');
    setVersionBuilderGemApplyScope('ALL_COMBINATIONS');
    setVersionBuilderWorkflowStep('INFO');
    setVersionBuilderMetalImageMap({});
    setVersionBuilderActiveMetal(uniqueNonEmptyValues([row.goldColour])[0] || '');
    setVersionBuilderUploadedImageUrls([]);
    setVersionBuilderUploadedMediaItems([]);
    setVersionBuilderCreateResults({});
    setVersionCreateProgress({ done: 0, total: 0 });
    setVersionBuilderGemRows([]);
    setVersionBuilderBaseMetalRows([]);
    setVersionBuilderLaborRows([{ id: makeId(), laborHead: '', laborPerUnit: '', unitQty: '', laborValue: '' }]);
    setVersionBuilderOverheadRows([]);
    setVersionBuilderGemError(null);
    setShowVersionBuilderModal(true);
    void loadVersionBuilderGemstoneTemplate(row);
  };

  const closeVersionBuilderModal = () => {
    versionBuilderUploadedImageUrls.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    setVersionBuilderUploadedImageUrls([]);
    setVersionBuilderUploadedMediaItems([]);
    setVersionBuilderCreateResults({});
    setCreatingVersions(false);
    setVersionCreateProgress({ done: 0, total: 0 });
    setVersionBuilderLaborRows([{ id: makeId(), laborHead: '', laborPerUnit: '', unitQty: '', laborValue: '' }]);
    setVersionBuilderOverheadRows([]);
    setShowVersionBuilderModal(false);
  };

  const loadVersionBuilderGemstoneTemplate = async (row: DesignRow) => {
    const canLoadDetails = /^[0-9a-fA-F-]{36}$/.test(row.id);
    if (!canLoadDetails) {
      setVersionBuilderGemRows([createEmptyGemRow()]);
      return;
    }

    setVersionBuilderGemLoading(true);
    setVersionBuilderGemError(null);
    try {
      const detail = (await api.get(`/products/${row.id}`)).data;
      const gemstones = Array.isArray(detail?.gemstones) ? detail.gemstones : [];
      const metals = Array.isArray(detail?.metals) ? detail.metals : [];
      const labors = Array.isArray(detail?.labors) ? detail.labors : [];
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

      const rowsFromDesign: GemRow[] =
        gemstones.length > 0
          ? gemstones.map((item: any) => ({
              id: item.id || makeId(),
              packetId: resolvePacketForGem(item),
              stone: String(item.stone || ''),
              shape: String(item.shape || ''),
              size: String(item.size || ''),
              cut: String(item.cut || ''),
              color: String(item.color || ''),
              quality: String(item.quality || ''),
              settingType: String(item.stoneType || ''),
              wtPerPcs: String(item.wtPerPcs ?? ''),
              pcs: String(item.pcs ?? ''),
              wtInCts: String(item.wtInCts ?? ''),
              pricePerCt: String(item.pricePerCt ?? ''),
              amount: String(item.amount ?? ''),
            }))
          : [createEmptyGemRow()];

      setVersionBuilderGemRows(rowsFromDesign);
      setVersionBuilderBaseMetalRows(
        metals.length > 0
          ? metals.map((item: any) => ({
              id: item.id || makeId(),
              goldColour: String(item.metalCaratage || item.goldColour || ''),
              netWt: String(item.netWt ?? ''),
              wastagePercent: String(item.wastagePercent ?? ''),
              wastageWt: String(item.wastageWt ?? ''),
              totalWt: String(item.totalWt ?? ''),
              pricePerGm: String(item.pricePerGm ?? ''),
              value: String(item.value ?? ''),
            }))
          : [],
      );
      const visibleLabors = labors.filter(
        (item: any) =>
          !String(item?.laborHead || '').trim().toLowerCase().startsWith('overhead -'),
      );
      setVersionBuilderLaborRows(
        visibleLabors.length > 0
          ? visibleLabors.map((item: any) => ({
              id: item.id || makeId(),
              laborHead: String(item.laborHead || ''),
              laborPerUnit: String(item.laborPerUnit ?? ''),
              unitQty: String(item.unitQty ?? ''),
              laborValue: String(item.laborValue ?? ''),
            }))
          : [{ id: makeId(), laborHead: '', laborPerUnit: '', unitQty: '', laborValue: '' }],
      );
      setVersionBuilderOverheadRows(
        labors
          .filter((item: any) => String(item?.laborHead || '').trim().toLowerCase().startsWith('overhead -'))
          .map((item: any) => {
            const overheadLabel = String(item?.laborHead || '').replace(/^Overhead\s*-\s*/i, '').trim();
            const matchedOverheadRule = masterOptions.overheadRules.find(
              (rule) => normalizeLookupKey(rule.value) === normalizeLookupKey(overheadLabel),
            );
            return {
              id: item.id || makeId(),
              overheadHead: overheadLabel,
              ruleId: matchedOverheadRule?.id || '',
            };
          }),
      );
    } catch (error: any) {
      setVersionBuilderGemRows([createEmptyGemRow()]);
      setVersionBuilderBaseMetalRows([]);
      setVersionBuilderLaborRows([{ id: makeId(), laborHead: '', laborPerUnit: '', unitQty: '', laborValue: '' }]);
      setVersionBuilderOverheadRows([]);
      setVersionBuilderGemError(error?.response?.data?.message || 'Unable to load gemstone template from base design.');
    } finally {
      setVersionBuilderGemLoading(false);
    }
  };

  const resolveVersionBuilderPersistedImages = (
    detail: any,
    metal: string,
    uploadedAssetMap: Record<string, string>,
  ): string[] => {
    const detailImageUrls = normalizeStringArray(detail?.imageUrls).map(resolvePublicAssetUrl);
    const detailImageKeys = normalizeStringArray(detail?.imageKeys ?? detail?.imageUrls);
    const detailPairs = detailImageUrls.map((url, index) => ({
      url,
      key: detailImageKeys[index] || detailImageUrls[index] || url,
    }));
    const safeUploaded = uniqueNonEmptyValues([
      ...Object.values(uploadedAssetMap),
      ...versionBuilderUploadedImageUrls.filter((url) => url && !url.startsWith('blob:')),
    ]);

    if (versionBuilderImageMode === 'MANUAL_AFTER_CREATE') {
      return safeUploaded;
    }

    if (versionBuilderImageMode === 'MAP_BY_METAL') {
      const selectedUrls = versionBuilderMetalImageMap[metal] || [];
      const mapped = selectedUrls
        .map((selectedUrl) => {
          if (uploadedAssetMap[selectedUrl]) {
            return uploadedAssetMap[selectedUrl];
          }
          const normalizedSelected = resolvePublicAssetUrl(selectedUrl);
          const match = detailPairs.find((pair) => pair.url === normalizedSelected || pair.key === selectedUrl);
          return match?.key || (selectedUrl.startsWith('blob:') ? '' : selectedUrl);
        })
        .filter(Boolean);
      return uniqueNonEmptyValues([...mapped, ...safeUploaded]);
    }

    return uniqueNonEmptyValues([...(detailImageKeys.length ? detailImageKeys : detailImageUrls), ...safeUploaded]);
  };

  const createVersionBuilderVariants = async () => {
    if (!versionBuilderBaseDesign) {
      window.alert('No base design selected.');
      return;
    }
    if (!canCreateDesign) {
      window.alert('You do not have permission to add designs.');
      return;
    }
    if (creatingVersions) {
      return;
    }
    const rowsToCreate = versionBuilderGeneratedRows.filter(
      (row) => versionBuilderCreateResults[row.designNo]?.status !== 'created',
    );
    if (!rowsToCreate.length) {
      window.alert('No generated variants available to create.');
      return;
    }

    const confirmed = window.confirm(
      `Create ${rowsToCreate.length} versions from ${versionBuilderBaseDesign.designNo}- This will create actual design records.`,
    );
    if (!confirmed) {
      return;
    }

    setCreatingVersions(true);
    setVersionCreateProgress({ done: 0, total: rowsToCreate.length });

    try {
      const detail = (await api.get(`/products/${versionBuilderBaseDesign.id}`)).data;
      const relevantDesignIds = (Array.isArray(detail?.relevantDesigns) ? detail.relevantDesigns : [])
        .map((item: any) => String(item?.id || '').trim())
        .filter(Boolean);
      let uploadedAssetMap: Record<string, string> = {};

      if (versionBuilderUploadedMediaItems.length > 0) {
        const formData = new FormData();
        versionBuilderUploadedMediaItems.forEach((item) => formData.append('files', item.file));
        const uploadResponse = await api.post('/products/gallery-files', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const uploadedFiles = Array.isArray(uploadResponse.data?.files) ? uploadResponse.data.files : [];
        uploadedAssetMap = versionBuilderUploadedMediaItems.reduce<Record<string, string>>((acc, item, index) => {
          const uploaded = uploadedFiles[index];
          const key = String(uploaded?.key || uploaded?.url || '').trim();
          if (key) {
            acc[item.previewUrl] = key;
          }
          return acc;
        }, {});
      }

      const createdRows: DesignRow[] = [];
      const failures: string[] = [];

      for (let index = 0; index < rowsToCreate.length; index += 1) {
        const row = rowsToCreate[index];
        const selection: VersionBuilderBomSelection = {
          size: row.size,
          metal: row.metal,
          diamondQuality: row.diamondQuality,
          coverage: row.coverage,
          caratWeight: row.caratWeight,
        };
        const breakdown = getVersionBuilderBomBreakdownForSelection(selection, row.version);
        const chartByCoverage = versionBuilderSizeChart[row.coverage] || {};
        const chartRow = chartByCoverage[normalizeSizeChartKey(row.size)];

        if (!chartRow) {
          failures.push(`${row.designNo}: size chart missing`);
          setVersionBuilderCreateResults((prev) => ({
            ...prev,
            [row.designNo]: { status: 'failed', message: 'Size chart missing' },
          }));
          setVersionCreateProgress({ done: index + 1, total: rowsToCreate.length });
          continue;
        }

        const metalPurity = getMetalPurityBucket(row.metal);
        const metalNetWt = Math.max(0, parseNum(chartRow.metalWeights?.[metalPurity] || '0'));
        const metalWastageWt = Math.max(0, breakdown.metal.totalWeight - breakdown.metal.netWeight);

        const gemstones = versionBuilderGemRows
          .map((baseRow) => {
            const cell = chartRow.groups?.[baseRow.id];
            const pcs = Math.max(0, parseNum(cell?.count || '0'));
            const wtPerPcs = Math.max(0, parseNum(cell?.ctPerStone || '0'));
            const wtInCts = pcs * wtPerPcs;
            const pricePerCt = Math.max(0, parseNum(baseRow.pricePerCt || '0'));
            const amount = wtInCts * pricePerCt;
            return {
              packetId: baseRow.packetId || undefined,
              stone: baseRow.stone.trim() || undefined,
              shape: baseRow.shape.trim() || undefined,
              size: baseRow.size.trim() || undefined,
              cut: baseRow.cut.trim() || undefined,
              color: baseRow.color.trim() || undefined,
              quality: row.diamondQuality || baseRow.quality.trim() || undefined,
              stoneType: baseRow.settingType.trim() || undefined,
              wtPerPcs,
              pcs,
              wtInCts,
              pricePerCt,
              amount,
            };
          })
          .filter((gem) => gem.pcs > 0 || gem.wtInCts > 0);

        const laborRowsPayload = [
          ...versionBuilderLaborRows
            .filter((laborRow) => laborRow.laborHead.trim() || parseNum(laborRow.laborPerUnit) > 0 || parseNum(laborRow.unitQty) > 0)
            .map((laborRow) => ({
              laborHead: laborRow.laborHead.trim() || undefined,
              laborPerUnit: parseNum(laborRow.laborPerUnit),
              unitQty: parseNum(laborRow.unitQty),
              laborValue: getLaborValue(laborRow),
            })),
          ...versionBuilderOverheadRows
            .map((overheadRow) => {
              const rule = getVersionBuilderOverheadRuleForRow(overheadRow);
              const label = overheadRow.overheadHead.trim() || rule?.value || '';
              if (!label) return null;
              const mode = rule?.overheadApplyMode || '';
              const ratePercent = Math.max(0, rule?.ratePercent || 0);
              const flatAmount = Math.max(0, rule?.flatAmount || 0);
              const value =
                mode === 'FLAT'
                  ? flatAmount
                  : ((breakdown.metal.cost + breakdown.totalStoneCost + breakdown.labor.cost) * ratePercent) / 100;
              return {
                laborHead: `Overhead - ${label}`,
                laborPerUnit: value,
                unitQty: 1,
                laborValue: value,
              };
            })
            .filter(Boolean),
        ].filter(Boolean);

        const payload = {
          designNo: row.designNo,
          designName: String(detail?.designName || versionBuilderBaseDesign.designName || row.designNo || '').trim() || row.designNo,
          version: row.version,
          companyId: detail?.companyId || undefined,
          branchId: detail?.branchId || undefined,
          jewelryGroup: String(detail?.jewelryGroup || versionBuilderBaseDesign.jewelryGroup || '').trim(),
          collection: String(detail?.collection || '').trim() || undefined,
          jewelrySize: row.size,
          stage: String(detail?.stage || '').trim() || undefined,
          diamondSpread: row.coverage || undefined,
          diamondType: String(detail?.diamondType || '').trim() || undefined,
          diamondWeight: row.caratWeight || undefined,
          diamondQuality: row.diamondQuality || undefined,
          designStatus: String(detail?.designStatus || '').trim() || undefined,
          tags: Array.isArray(detail?.tags) ? detail.tags : [],
          drawerLocation: String(detail?.drawerLocation || '').trim() || undefined,
          otherWeight:
            detail?.otherWeight !== undefined && detail?.otherWeight !== null
              ? parseNum(String(detail.otherWeight))
              : undefined,
          designDescription: String(detail?.designDescription || '').trim() || undefined,
          remarks: String(detail?.remarks || '').trim() || undefined,
          imageUrls: resolveVersionBuilderPersistedImages(detail, row.metal, uploadedAssetMap),
          stlFileUrl: String(detail?.stlFileUrl || '').trim() || undefined,
          ijewelModelId: String(detail?.ijewelModelId || '').trim() || undefined,
          ijewelBaseName: String(detail?.ijewelBaseName || '').trim() || undefined,
          metals: [
            {
              metalCaratage: row.metal,
              goldColour: row.metal,
              netWt: metalNetWt,
              wastagePercent: breakdown.metal.wastagePercent,
              wastageWt: metalWastageWt,
              totalWt: breakdown.metal.totalWeight,
              pricePerGm: breakdown.metal.rate,
              value: breakdown.metal.cost,
            },
          ],
          gemstones,
          labors: laborRowsPayload,
          findings: [],
          processStages: (Array.isArray(detail?.processStages) ? detail.processStages : [])
            .filter((item: any) => String(item?.processStage || '').trim())
            .map((item: any) => ({
              processStage: String(item.processStage || '').trim(),
              netWeight: parseNum(String(item.netWeight ?? '0')),
              duration: parseNum(String(item.duration ?? '0')),
              durationType: String(item.durationType || 'MINUTES'),
              remarks: String(item.remarks || '').trim() || undefined,
            })),
          pricingTiers: (Array.isArray(detail?.pricingTiers) ? detail.pricingTiers : [])
            .filter((item: any) => String(item?.name || '').trim())
            .map((item: any) => ({
              name: String(item.name || '').trim(),
              incrementBy: String(item.incrementBy || 'PERCENTAGE'),
              value: parseNum(String(item.value ?? '0')),
              sellingPrice: parseNum(String(item.sellingPrice ?? item.value ?? '0')),
              unit: String(item.unit || 'PCS'),
              weightBy: String(item.weightBy || 'TOTAL'),
            })),
          vendors: (Array.isArray(detail?.vendors) ? detail.vendors : [])
            .filter((item: any) => String(item?.supplierName || '').trim())
            .map((item: any) => ({
              supplierName: String(item.supplierName || '').trim(),
              stockType: String(item.stockType || '').trim() || undefined,
              supplierStyleNo: String(item.supplierStyleNo || '').trim() || undefined,
            })),
          relevantDesignIds,
          isActive: detail?.isActive !== false,
        };

        try {
          const response = await api.post('/products', payload);
          createdRows.push(mapApiDesignToRow(response.data as ApiDesignRow));
          setVersionBuilderCreateResults((prev) => ({
            ...prev,
            [row.designNo]: { status: 'created', message: 'Version created successfully' },
          }));
        } catch (error: any) {
          const message = String(error?.response?.data?.message || error?.message || 'Create failed');
          failures.push(`${row.designNo}: ${message}`);
          setVersionBuilderCreateResults((prev) => ({
            ...prev,
            [row.designNo]: { status: 'failed', message },
          }));
        } finally {
          setVersionCreateProgress({ done: index + 1, total: rowsToCreate.length });
        }
      }

      if (createdRows.length > 0) {
        setRows((prev) => [...createdRows, ...prev]);
        setSelectedId(createdRows[0].id);
      }

      if (failures.length > 0) {
        window.alert(
          `Created ${createdRows.length} version(s). ${failures.length} failed.\n\n${failures.slice(0, 8).join('\n')}${
            failures.length > 8 ? '\n...' : ''
          }`,
        );
      } else {
        window.alert(`Created ${createdRows.length} version(s) successfully.`);
        closeVersionBuilderModal();
      }
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to create versions.');
    } finally {
      setCreatingVersions(false);
      setVersionCreateProgress({ done: 0, total: 0 });
    }
  };

  const updateVersionBuilderGemRow = (rowId: string, field: keyof GemRow, value: string) => {
    const numericFieldMode: Partial<Record<keyof GemRow, 'decimal' | 'integer'>> = {
      wtPerPcs: 'decimal',
      pcs: 'integer',
      wtInCts: 'decimal',
      pricePerCt: 'decimal',
      amount: 'decimal',
    };
    const nextValue = numericFieldMode[field] ? sanitizeNumericTextInput(value, numericFieldMode[field]!) : value;

    setVersionBuilderGemRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: nextValue } : row)),
    );
  };

  const removeVersionBuilderGemRow = (rowId: string) => {
    setVersionBuilderGemRows((prev) => {
      const next = prev.filter((row) => row.id !== rowId);
      return next.length > 0 ? next : [createEmptyGemRow()];
    });
  };

  const addVersionBuilderGemRow = () => {
    setVersionBuilderGemRows((prev) => [...prev, createEmptyGemRow()]);
  };

  const applyPacketToVersionBuilderGemRow = (rowId: string, packetId: string) => {
    const packet = packetOptions.find((entry) => entry.id === packetId);
    if (!packet) {
      updateVersionBuilderGemRow(rowId, 'packetId', '');
      return;
    }

    const packetWeightPerPc = packet.weightPerPc != null ? String(packet.weightPerPc) : '';
    const packetPieces = packet.pieces != null ? String(packet.pieces) : '';
    const packetWtInCts = packet.weightUnit === 'CTS' && packet.weight != null ? String(packet.weight) : '';
    const packetRate = packet.sellingPrice != null ? String(packet.sellingPrice) : '';

    setVersionBuilderGemRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              packetId: packet.id,
              stone: packet.stone || row.stone,
              shape: packet.shape || row.shape,
              size: packet.size || row.size,
              color: packet.color || row.color,
              quality: packet.quality || row.quality,
              wtPerPcs: packetWeightPerPc || row.wtPerPcs,
              pcs: packetPieces || row.pcs,
              wtInCts: packetWtInCts || row.wtInCts,
              pricePerCt: packetRate || row.pricePerCt,
            }
          : row,
      ),
    );
  };

  const toggleVersionBuilderValue = (groupId: keyof VersionBuilderSelections, value: string) => {
    setVersionBuilderSelections((prev) => {
      const current = prev[groupId];
      const exists = current.includes(value);
      return {
        ...prev,
        [groupId]: exists ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  };

  const setAllVersionBuilderValues = (groupId: keyof VersionBuilderSelections, values: string[]) => {
    setVersionBuilderSelections((prev) => ({
      ...prev,
      [groupId]: values,
    }));
  };

  const toggleVersionBuilderMetalImageMap = (metal: string, imageUrl: string) => {
    setVersionBuilderMetalImageMap((prev) => {
      const current = prev[metal] || [];
      const exists = current.includes(imageUrl);
      return {
        ...prev,
        [metal]: exists ? current.filter((url) => url !== imageUrl) : [...current, imageUrl],
      };
    });
  };

  const removeVersionBuilderMetalImage = (metal: string, imageUrl: string) => {
    setVersionBuilderMetalImageMap((prev) => ({
      ...prev,
      [metal]: (prev[metal] || []).filter((url) => url !== imageUrl),
    }));
  };

  const handleVersionBuilderImageUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    const uploadedItems = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setVersionBuilderUploadedMediaItems((prev) => [...prev, ...uploadedItems]);
    setVersionBuilderUploadedImageUrls((prev) => [...prev, ...uploadedItems.map((item) => item.previewUrl)]);
  };
  const updateVersionBuilderSizeChartCell = (
    coverage: string,
    sizeKey: string,
    rowId: string,
    field: keyof VersionBuilderSizeChartGroupCell,
    value: string,
  ) => {
    const nextValue = sanitizeNumericTextInput(value, field === 'count' ? 'integer' : 'decimal');
    setVersionBuilderSizeChart((prev) => {
      const coverageState = { ...(prev[coverage] || {}) };
      const sizeState = coverageState[sizeKey] || {
        metalWeights: buildDefaultMetalWeightsForPurities(
          versionBuilderMetalPurityColumns,
          versionBuilderBaseMetalWeightMap,
        ),
        groups: {},
      };
      const currentCell = sizeState.groups[rowId] || { count: '', ctPerStone: '' };
      const mode = versionBuilderGemGroupModes[rowId] || 'varies';

      if (mode === 'fixed') {
        const nextCoverageState = { ...coverageState };
        versionBuilderSizeChartSizes.forEach((chartSizeKey) => {
          const chartSizeState = nextCoverageState[chartSizeKey] || {
            metalWeights: buildDefaultMetalWeightsForPurities(
              versionBuilderMetalPurityColumns,
              versionBuilderBaseMetalWeightMap,
            ),
            groups: {},
          };
          nextCoverageState[chartSizeKey] = {
            ...chartSizeState,
            groups: {
              ...chartSizeState.groups,
              [rowId]: {
                ...((chartSizeState.groups && chartSizeState.groups[rowId]) || currentCell),
                [field]: nextValue,
              },
            },
          };
        });
        return {
          ...prev,
          [coverage]: nextCoverageState,
        };
      }

      return {
        ...prev,
        [coverage]: {
          ...coverageState,
          [sizeKey]: {
            ...sizeState,
            groups: {
              ...sizeState.groups,
              [rowId]: {
                ...currentCell,
                [field]: nextValue,
              },
            },
          },
        },
      };
    });
  };
  const updateVersionBuilderSizeChartMetalWeight = (
    coverage: string,
    sizeKey: string,
    purity: string,
    value: string,
  ) => {
    const nextValue = sanitizeNumericTextInput(value, 'decimal');
    setVersionBuilderSizeChart((prev) => {
      const coverageState = { ...(prev[coverage] || {}) };
      const sizeState = coverageState[sizeKey] || {
        metalWeights: buildDefaultMetalWeightsForPurities(
          versionBuilderMetalPurityColumns,
          versionBuilderBaseMetalWeightMap,
        ),
        groups: {},
      };
      return {
        ...prev,
        [coverage]: {
          ...coverageState,
          [sizeKey]: {
            ...sizeState,
            metalWeights: {
              ...sizeState.metalWeights,
              [purity]: nextValue,
            },
          },
        },
      };
    });
  };

  const versionBuilderCombinationCount = useMemo(() => {
    const groups = versionBuilderOptionGroups.map((group) => versionBuilderSelections[group.id].length);
    if (!groups.length || groups.some((count) => count === 0)) {
      return 0;
    }

    return groups.reduce((total, count) => total * count, 1);
  }, [versionBuilderOptionGroups, versionBuilderSelections]);

  const versionBuilderHighestVersion = useMemo(() => {
    if (!versionBuilderVersionRows.length) {
      return 0;
    }

    return versionBuilderVersionRows.reduce((max, row) => Math.max(max, getVersionNumber(row.version)), 0);
  }, [versionBuilderVersionRows]);
  const versionBuilderStepOrder = useMemo(
    () => VERSION_BUILDER_WORKFLOW.map((step) => step.id),
    [],
  );
  const versionBuilderCurrentStepIndex = useMemo(
    () => versionBuilderStepOrder.indexOf(versionBuilderWorkflowStep),
    [versionBuilderStepOrder, versionBuilderWorkflowStep],
  );
  const versionBuilderSizeChartCoverages = useMemo(
    () =>
      uniqueNonEmptyValues([
        ...versionBuilderSelections.coverages,
        versionBuilderBaseDesign?.diamondSpread,
      ]),
    [versionBuilderBaseDesign?.diamondSpread, versionBuilderSelections.coverages],
  );
  const versionBuilderMetalPurityColumns = useMemo(
    () =>
      uniqueNonEmptyValues(
        (versionBuilderSelections.metals.length > 0
          ? versionBuilderSelections.metals
          : uniqueNonEmptyValues([versionBuilderBaseDesign?.goldColour || ''])
        )
          .map((metal) => getMetalPurityBucket(metal))
          .filter(Boolean),
      ),
    [versionBuilderBaseDesign?.goldColour, versionBuilderSelections.metals],
  );
  const versionBuilderBaseMetalWeightMap = useMemo(
    () => buildBaseMetalWeightByPurity(versionBuilderBaseMetalRows),
    [versionBuilderBaseMetalRows],
  );
  const versionBuilderSizeChartSizes = useMemo(() => {
    const selectedSizes = uniqueNonEmptyValues(
      versionBuilderSelections.sizes
        .map((size) => normalizeSizeChartKey(size))
        .filter(Boolean),
    );
    if (selectedSizes.length) {
      return selectedSizes;
    }

    const baseSize = normalizeSizeChartKey(versionBuilderBaseDesign?.jewelrySize || '');
    if (baseSize) {
      return [baseSize];
    }

    return VERSION_BUILDER_SIZE_CHART_SIZES;
  }, [versionBuilderBaseDesign?.jewelrySize, versionBuilderSelections.sizes]);

  useEffect(() => {
    if (!versionBuilderSizeChartCoverages.length) {
      setVersionBuilderChartCoverage('');
      return;
    }
    if (!versionBuilderSizeChartCoverages.includes(versionBuilderChartCoverage)) {
      setVersionBuilderChartCoverage(versionBuilderSizeChartCoverages[0]);
    }
  }, [versionBuilderChartCoverage, versionBuilderSizeChartCoverages]);

  useEffect(() => {
    if (!versionBuilderBaseDesign || !versionBuilderGemRows.length || !versionBuilderSizeChartCoverages.length) {
      return;
    }

    setVersionBuilderSizeChart((prev) => {
      const next: VersionBuilderSizeChartState = { ...prev };
      versionBuilderSizeChartCoverages.forEach((coverage) => {
        const coverageState = { ...(next[coverage] || {}) };
        versionBuilderSizeChartSizes.forEach((sizeKey) => {
          const existingRow = coverageState[sizeKey];
          const groups: Record<string, VersionBuilderSizeChartGroupCell> = {};
          versionBuilderGemRows.forEach((row) => {
            groups[row.id] =
              existingRow?.groups?.[row.id] ||
              getDefaultSizeChartGroupCell(
                row,
                versionBuilderGemGroupModes[row.id] || 'varies',
                versionBuilderBaseDesign.jewelrySize,
                sizeKey,
                coverage,
              );
          });
          coverageState[sizeKey] = {
            metalWeights:
              existingRow?.metalWeights ||
              buildDefaultMetalWeightsForPurities(versionBuilderMetalPurityColumns, versionBuilderBaseMetalWeightMap),
            groups,
          };
        });
        next[coverage] = coverageState;
      });
      return next;
    });
  }, [
    versionBuilderBaseDesign,
    versionBuilderBaseMetalWeightMap,
    versionBuilderGemGroupModes,
    versionBuilderGemRows,
    versionBuilderMetalPurityColumns,
    versionBuilderSizeChartCoverages,
    versionBuilderSizeChartSizes,
  ]);

  const activeVersionBuilderSizeChartRows = useMemo(
    () => (versionBuilderChartCoverage ? versionBuilderSizeChart[versionBuilderChartCoverage] || {} : {}),
    [versionBuilderChartCoverage, versionBuilderSizeChart],
  );

  const activeVersionBuilderSizeChartGroupSummaries = useMemo(() => {
    return versionBuilderGemRows.map((row) => {
      let totalCount = 0;
      let totalCarat = 0;
      let estCost = 0;
      versionBuilderSizeChartSizes.forEach((sizeKey) => {
        const groupCell = activeVersionBuilderSizeChartRows[sizeKey]?.groups?.[row.id];
        const count = Math.max(0, parseNum(groupCell?.count || '0'));
        const ctPerStone = Math.max(0, parseNum(groupCell?.ctPerStone || '0'));
        totalCount += count;
        totalCarat += count * ctPerStone;
        estCost += count * Math.max(0, parseNum(row.pricePerCt || '0'));
      });
      return {
        row,
        totalCount,
        totalCarat,
        estCost,
      };
    });
  }, [activeVersionBuilderSizeChartRows, versionBuilderGemRows, versionBuilderSizeChartSizes]);

  const versionBuilderCategoryRuleFiltered = useMemo(() => {
    const categoryKey = normalizeLookupKey(versionBuilderBaseDesign?.jewelryGroup);
    const laborRules = masterOptions.laborRules.filter((rule) => {
      const ruleCategory = normalizeLookupKey(rule.jewelryGroup);
      return !categoryKey || !ruleCategory || ruleCategory === categoryKey;
    });
    const overheadRules = masterOptions.overheadRules.filter((rule) => {
      const ruleCategory = normalizeLookupKey(rule.jewelryGroup);
      return !categoryKey || !ruleCategory || ruleCategory === categoryKey;
    });
    return { laborRules, overheadRules };
  }, [masterOptions.laborRules, masterOptions.overheadRules, versionBuilderBaseDesign]);

  const buildVersionBuilderVariantSku = useCallback(
    (selection: VersionBuilderBomSelection, versionLabel: string) => {
      if (!versionBuilderBaseDesign) return '';
      const family = getStructuredDesignFamilyParts(versionBuilderBaseDesign.designNo || '');
      const fallbackBase = getBaseDesignNo(versionBuilderBaseDesign.designNo) || versionBuilderBaseDesign.designNo;
      if (!family.categoryCode || !family.serialCode) {
        return buildVersionedDesignNo(fallbackBase, versionLabel);
      }

      const structuredBase = buildStructuredDesignNo({
        categoryCode: family.categoryCode,
        serialCode: family.serialCode,
        coverageCode: resolveCoverageCode(selection.coverage || '', ''),
        metalCode: resolveMetalCode(selection.metal || '', masterOptions.metalCaratages),
        diamondQualityCode: resolveDiamondQualityCode(selection.diamondQuality || '', ''),
        sizeCode: resolveSizeCode(selection.size || ''),
      });

      return buildVersionedDesignNo(structuredBase || fallbackBase, versionLabel);
    },
    [masterOptions.metalCaratages, versionBuilderBaseDesign],
  );

  const getVersionBuilderOverheadRuleForRow = (row: OverheadRow): MasterOption | null => {
    if (!row.ruleId && !row.overheadHead.trim()) return null;
    return (
      versionBuilderCategoryRuleFiltered.overheadRules.find(
        (rule) =>
          rule.id === row.ruleId ||
          normalizeLookupKey(rule.value) === normalizeLookupKey(row.overheadHead),
      ) || null
    );
  };

  const getVersionBuilderBomBreakdownForSelection = (
    selection: VersionBuilderBomSelection,
    versionLabel = `V${versionBuilderHighestVersion + 1}`,
  ) => {
    const empty = {
      metalLabel: '',
      variantSku: '',
      metal: { netWeight: 0, wastagePercent: 0, totalWeight: 0, rate: 0, cost: 0, formula: '-', source: '-' },
      stones: [] as Array<{
        id: string;
        label: string;
        subtitle: string;
        count: number;
        totalCarat: number;
        rate: number;
        cost: number;
        formula: string;
        source: string;
      }>,
      labor: { cost: 0, formula: '-', source: '-' },
      overhead: { cost: 0, formula: '-', source: '-' },
      totalStoneCost: 0,
      totalStoneCount: 0,
      total: 0,
    };
    if (!versionBuilderBaseDesign) return empty;

    const selectedCoverage = selection.coverage || versionBuilderChartCoverage;
    const chartByCoverage = versionBuilderSizeChart[selectedCoverage] || {};
    const selectedSizeKey = normalizeSizeChartKey(selection.size || '');
    const chartRow = chartByCoverage[selectedSizeKey];
    if (!chartRow) return empty;

    const selectedMetal = selection.metal;
    const selectedMetalPurity = getMetalPurityBucket(selectedMetal);
    const selectedMetalOption = getMetalMasterOption(selectedMetal);
    const metalNetWeight = Math.max(0, parseNum(chartRow.metalWeights?.[selectedMetalPurity] || '0'));
    const metalWastagePercent =
      selectedMetalOption?.defaultWastagePercent !== undefined && selectedMetalOption?.defaultWastagePercent !== null
        ? selectedMetalOption.defaultWastagePercent
        : selectedMetalOption?.wastagePercent || 0;
    const metalTotalWeight = metalNetWeight + (metalNetWeight * metalWastagePercent) / 100;
    const metalRate = getMetalRate(selectedMetal) || 0;
    const metalCost = metalTotalWeight * metalRate;

    const stoneLines = versionBuilderGemRows.map((row, index) => {
      const packet = packetOptions.find((entry) => entry.id === row.packetId);
      const cell = chartRow.groups?.[row.id];
      const count = Math.max(0, parseNum(cell?.count || '0'));
      const ctPerStone = Math.max(0, parseNum(cell?.ctPerStone || '0'));
      const totalCarat = count * ctPerStone;
      const rate = Math.max(0, parseNum(row.pricePerCt || '0'));
      const cost = totalCarat * rate;
      const groupLabel = `Group ${String.fromCharCode(65 + index)}`;
      return {
        id: row.id,
        label: `${groupLabel} - ${row.shape || packet?.shape || 'Stone group'}`,
        subtitle: `${row.stone || packet?.stone || 'Diamond'} ${row.size || packet?.size ? `- ${row.size || packet?.size} mm` : ''} - ${count} stones`,
        count,
        totalCarat,
        rate,
        cost,
        formula: `${count} x ${formatMoney(rate)}/ct x ${ctPerStone.toFixed(3)} ct`,
        source: packet?.packetName || packet?.id || 'Manual packet',
      };
    });

    const totalStoneCost = stoneLines.reduce((sum, line) => sum + line.cost, 0);
    const totalStoneCount = stoneLines.reduce((sum, line) => sum + line.count, 0);
    const materialsSubtotal = metalCost + totalStoneCost;
    const laborCost = versionBuilderLaborRows.reduce((sum, row) => sum + getLaborValue(row), 0);
    const laborFormulaParts = versionBuilderLaborRows
      .filter((row) => row.laborHead.trim() || parseNum(row.laborPerUnit) > 0 || parseNum(row.unitQty) > 0)
      .map((row) => `${parseNum(row.unitQty).toFixed(2)} x ${formatMoney(parseNum(row.laborPerUnit))}`);
    const laborSourceParts = versionBuilderLaborRows
      .map((row) => row.laborHead.trim())
      .filter(Boolean);
    const bomSubtotal = materialsSubtotal + laborCost;

    const overheadDetails = versionBuilderOverheadRows
      .map((row) => {
        const rule = getVersionBuilderOverheadRuleForRow(row);
        if (!rule) return null;
        const mode = rule.overheadApplyMode || '';
        const ratePercent = Math.max(0, rule.ratePercent || 0);
        const flatAmount = Math.max(0, rule.flatAmount || 0);
        const cost = mode === 'FLAT' ? flatAmount : (bomSubtotal * ratePercent) / 100;
        const formula =
          mode === 'FLAT'
            ? formatMoney(flatAmount)
            : `${ratePercent.toFixed(2)}% x (metal + stones + labor)`;
        return {
          label: row.overheadHead.trim() || rule.value || 'Overhead',
          cost,
          formula,
        };
      })
      .filter(Boolean) as Array<{ label: string; cost: number; formula: string }>;
    const overheadCost = overheadDetails.reduce((sum, row) => sum + row.cost, 0);
    const overheadFormula = overheadDetails.map((row) => row.formula).join(' + ') || '-';
    const overheadSource = overheadDetails.map((row) => row.label).join(', ');

    const variantSku = buildVersionBuilderVariantSku(selection, versionLabel);

    return {
      metalLabel: selectedMetal,
      variantSku,
      metal: {
        netWeight: metalNetWeight,
        wastagePercent: metalWastagePercent,
        totalWeight: metalTotalWeight,
        rate: metalRate,
        cost: metalCost,
        formula: `${metalTotalWeight.toFixed(2)}g x ${formatMoney(metalRate)}`,
        source: selectedMetal || 'No metal selected',
      },
      stones: stoneLines,
      labor: {
        cost: laborCost,
        formula: laborFormulaParts.join(' + ') || '-',
        source: laborSourceParts.join(', ') || 'No labor added',
      },
      overhead: {
        cost: overheadCost,
        formula: overheadFormula,
        source: overheadSource || 'No overhead added',
      },
      totalStoneCost,
      totalStoneCount,
      total: metalCost + totalStoneCost + laborCost + overheadCost,
    };
  };

  const versionBuilderBomBreakdown = useMemo(() => getVersionBuilderBomBreakdownForSelection(versionBuilderBomSelection), [
    versionBuilderBaseDesign,
    versionBuilderCategoryRuleFiltered,
    versionBuilderChartCoverage,
    versionBuilderGemRows,
    versionBuilderHighestVersion,
    packetOptions,
    masterOptions.goldColours,
    masterOptions.metalCaratages,
    versionBuilderLaborRows,
    versionBuilderOverheadRows,
    versionBuilderBomSelection,
    versionBuilderSizeChart,
  ]);

  const versionBuilderGeneratedRows = useMemo(() => {
    if (!versionBuilderBaseDesign) {
      return [] as VersionBuilderGeneratedRow[];
    }

    const metals = versionBuilderSelections.metals;
    const coverages = versionBuilderSelections.coverages;
    const qualities = versionBuilderSelections.diamondQualities;
    const weights = versionBuilderSelections.caratWeights.length
      ? versionBuilderSelections.caratWeights
      : [''];
    const sizes = versionBuilderSelections.sizes;
    if (!metals.length || !coverages.length || !qualities.length || !sizes.length) {
      return [] as VersionBuilderGeneratedRow[];
    }

    const rows: VersionBuilderGeneratedRow[] = [];
    const startVersion = versionBuilderHighestVersion + 1;
    let versionOffset = 0;

    for (const metal of metals) {
      for (const coverage of coverages) {
        for (const quality of qualities) {
          for (const weight of weights) {
            for (const size of sizes) {
              const version = `V${startVersion + versionOffset}`;
              const selection: VersionBuilderBomSelection = {
                size,
                metal,
                diamondQuality: quality,
                coverage,
                caratWeight: weight,
              };

              const breakdown = getVersionBuilderBomBreakdownForSelection(selection, version);
              const chartCoverage =
                versionBuilderSizeChart[coverage] ||
                versionBuilderSizeChart[versionBuilderChartCoverage] ||
                {};
              const chartRow = chartCoverage[normalizeSizeChartKey(size)];
              const chartGroupCells = chartRow?.groups || {};
              const totalGemRows = versionBuilderGemRows.length;
              const totalPcs = versionBuilderGemRows.reduce(
                (sum, row) => sum + Math.max(0, parseNum(chartGroupCells[row.id]?.count || '0')),
                0,
              );
              const totalGemWeight = versionBuilderGemRows.reduce(
                (sum, row) =>
                  sum +
                  Math.max(0, parseNum(chartGroupCells[row.id]?.count || '0')) *
                    Math.max(0, parseNum(chartGroupCells[row.id]?.ctPerStone || '0')),
                0,
              );
              const gemstoneInfo =
                chartRow
                  ? `Configured (${totalGemRows} rows - ${totalPcs} pcs - ${totalGemWeight.toFixed(2)} ctw)`
                  : summarizeVersionBuilderGemPlan(
                      versionBuilderGemRows,
                      versionBuilderGemGroupModes,
                      versionBuilderBaseDesign.jewelrySize,
                      size,
                    );
              const imageCount =
                versionBuilderImageMode === 'INHERIT_PARENT'
                  ? uniqueNonEmptyValues([
                      ...normalizeStringArray(versionBuilderBaseDesign.imageUrls).map(resolvePublicAssetUrl),
                      ...versionBuilderUploadedImageUrls,
                    ]).length
                  : versionBuilderImageMode === 'MAP_BY_METAL'
                    ? (versionBuilderMetalImageMap[metal] || []).length
                    : 0;
              const imageInfo =
                versionBuilderImageMode === 'MANUAL_AFTER_CREATE'
                  ? 'Set later'
                  : `${imageCount} image${imageCount === 1 ? '' : 's'}`;
              const composition = breakdown.stones
                .filter((stone) => stone.count > 0)
                .map((stone) => {
                  const shapeToken = sanitizeStructuredToken(stone.label.split(' ? ').pop() || 'S');
                  return `${stone.count}${shapeToken.charAt(0) || 'S'}`;
                })
                .join(' + ');

              rows.push({
                designNo: breakdown.variantSku || buildVersionedDesignNo(getBaseDesignNo(versionBuilderBaseDesign.designNo) || versionBuilderBaseDesign.designNo, version),
                version,
                metal,
                coverage,
                diamondQuality: quality,
                caratWeight: weight,
                size,
                imageInfo,
                gemstoneInfo,
                composition: composition || '-',
                bomCost: breakdown.total,
              });
              versionOffset += 1;
            }
          }
        }
      }
    }

    return rows;
  }, [
    getVersionBuilderBomBreakdownForSelection,
    versionBuilderBaseDesign,
    versionBuilderLaborRows,
    versionBuilderOverheadRows,
    versionBuilderGemGroupModes,
    versionBuilderGemRows,
    versionBuilderHighestVersion,
    versionBuilderImageMode,
    versionBuilderMetalImageMap,
    versionBuilderSelections,
    versionBuilderSizeChart,
    versionBuilderChartCoverage,
    versionBuilderUploadedImageUrls,
  ]);

  const versionBuilderFilteredGeneratedRows = useMemo(() => {
    const search = versionBuilderGeneratedFilters.search.trim().toLowerCase();
    return versionBuilderGeneratedRows.filter((row) => {
      if (versionBuilderGeneratedFilters.size !== 'ALL' && row.size !== versionBuilderGeneratedFilters.size) {
        return false;
      }
      if (
        versionBuilderGeneratedFilters.coverage !== 'ALL' &&
        row.coverage !== versionBuilderGeneratedFilters.coverage
      ) {
        return false;
      }
      if (!search) {
        return true;
      }
      return [
        row.designNo,
        row.metal,
        row.diamondQuality,
        row.coverage,
        row.size,
        row.composition,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }, [versionBuilderGeneratedFilters, versionBuilderGeneratedRows]);

  const versionBuilderPendingCreateCount = useMemo(
    () =>
      versionBuilderGeneratedRows.filter(
        (row) => versionBuilderCreateResults[row.designNo]?.status !== 'created',
      ).length,
    [versionBuilderCreateResults, versionBuilderGeneratedRows],
  );

  const versionBuilderCreateValidation = useMemo(() => {
    const missing: string[] = [];

    if (!versionBuilderBaseDesign) missing.push('base style');
    if (!versionBuilderSelections.metals.length) missing.push('metal');
    if (!versionBuilderSelections.coverages.length) missing.push('coverage');
    if (!versionBuilderSelections.diamondQualities.length) missing.push('diamond quality');
    if (!versionBuilderSelections.sizes.length) missing.push('size');
    if (!versionBuilderGemRows.length) missing.push('stone group');

    let missingMetalWeights = false;
    if (versionBuilderSelections.coverages.length && versionBuilderSelections.sizes.length && versionBuilderMetalPurityColumns.length) {
      for (const coverage of versionBuilderSelections.coverages) {
        const coverageChart = versionBuilderSizeChart[coverage] || {};
        for (const size of versionBuilderSelections.sizes) {
          const sizeKey = normalizeSizeChartKey(size);
          const rowState = coverageChart[sizeKey];
          for (const purity of versionBuilderMetalPurityColumns) {
            const weight = parseNum(rowState?.metalWeights?.[purity] || '0');
            if (weight <= 0) {
              missingMetalWeights = true;
              break;
            }
          }
          if (missingMetalWeights) break;
        }
        if (missingMetalWeights) break;
      }
    }

    if (missingMetalWeights) missing.push('size-chart metal weight');
    if (versionBuilderGeneratedRows.length === 0) missing.push('generated combinations');

    return {
      isValid: missing.length === 0,
      missing,
      message: missing.length ? `Complete: ${missing.join(', ')}` : '',
    };
  }, [
    versionBuilderBaseDesign,
    versionBuilderGemRows.length,
    versionBuilderGeneratedRows.length,
    versionBuilderMetalPurityColumns,
    versionBuilderSelections.coverages,
    versionBuilderSelections.diamondQualities.length,
    versionBuilderSelections.metals.length,
    versionBuilderSelections.sizes,
    versionBuilderSizeChart,
  ]);

  const versionBuilderCanCreateFromCurrentStep = versionBuilderWorkflowStep === 'PREVIEW';

  const versionBuilderParentImageUrls = useMemo(
    () => normalizeStringArray(versionBuilderBaseDesign?.imageUrls).map(resolvePublicAssetUrl),
    [versionBuilderBaseDesign],
  );

  const versionBuilderAllImageUrls = useMemo(
    () => uniqueNonEmptyValues([...versionBuilderParentImageUrls, ...versionBuilderUploadedImageUrls]),
    [versionBuilderParentImageUrls, versionBuilderUploadedImageUrls],
  );

  const versionBuilderActiveMetalImages = useMemo(
    () => (versionBuilderActiveMetal ? versionBuilderMetalImageMap[versionBuilderActiveMetal] || [] : []),
    [versionBuilderActiveMetal, versionBuilderMetalImageMap],
  );

  const versionBuilderMappedMetalsCount = useMemo(() => {
    const selectedMetals = versionBuilderSelections.metals;
    if (!selectedMetals.length) {
      return 0;
    }

    return selectedMetals.filter((metal) => (versionBuilderMetalImageMap[metal] || []).length > 0).length;
  }, [versionBuilderMetalImageMap, versionBuilderSelections.metals]);

  useEffect(() => {
    if (!versionBuilderSelections.metals.length) {
      setVersionBuilderActiveMetal('');
      return;
    }

    if (!versionBuilderSelections.metals.includes(versionBuilderActiveMetal)) {
      setVersionBuilderActiveMetal(versionBuilderSelections.metals[0]);
    }
  }, [versionBuilderActiveMetal, versionBuilderSelections.metals]);

  useEffect(() => {
    setVersionBuilderBomSelection((prev) => ({
      size:
        prev.size && versionBuilderSelections.sizes.includes(prev.size)
          ? prev.size
          : versionBuilderSelections.sizes[0] || '',
      metal:
        prev.metal && versionBuilderSelections.metals.includes(prev.metal)
          ? prev.metal
          : versionBuilderSelections.metals[0] || '',
      diamondQuality:
        prev.diamondQuality && versionBuilderSelections.diamondQualities.includes(prev.diamondQuality)
          ? prev.diamondQuality
          : versionBuilderSelections.diamondQualities[0] || '',
      coverage:
        prev.coverage && versionBuilderSizeChartCoverages.includes(prev.coverage)
          ? prev.coverage
          : versionBuilderSizeChartCoverages[0] || '',
      caratWeight:
        prev.caratWeight && versionBuilderSelections.caratWeights.includes(prev.caratWeight)
          ? prev.caratWeight
          : versionBuilderSelections.caratWeights[0] || versionBuilderBaseDesign?.diamondWeight || '',
    }));
  }, [
    versionBuilderBaseDesign?.diamondWeight,
    versionBuilderSelections.caratWeights,
    versionBuilderSelections.diamondQualities,
    versionBuilderSelections.metals,
    versionBuilderSelections.sizes,
    versionBuilderSizeChartCoverages,
  ]);

  const pageSize = 15;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredBaseRows.length / pageSize)),
    [filteredBaseRows.length],
  );
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBaseRows.slice(start, start + pageSize);
  }, [filteredBaseRows, page, pageSize]);
  const showingFrom = filteredBaseRows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, filteredBaseRows.length);

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

  function getLaborValue(row: LaborRow): number {
    return parseNum(row.unitQty) * parseNum(row.laborPerUnit);
  }

  function getFindingValue(row: FindingRow): number {
    const manual = parseNum(row.findingValue);
    if (manual > 0) return manual;
    return parseNum(row.units) * parseNum(row.pricePerUnit);
  }

const createDefaultVendorRow = (): VendorRow => ({
  id: makeId(),
  supplier: '',
  stockType: 'Production',
  supplierStyleNo: '',
});

  const getOverheadRuleForRow = (row: OverheadRow): MasterOption | null => {
    if (!row.ruleId && !row.overheadHead.trim()) return null;
    return (
      singleDesignOverheadRules.find(
        (rule) =>
          rule.id === row.ruleId ||
          normalizeLookupKey(rule.value) === normalizeLookupKey(row.overheadHead),
      ) || null
    );
  };

  const getSingleDesignOverheadContext = useMemo(() => {
    const metal = metalRows.reduce((sum, row) => sum + getMetalValue(row), 0);
    const gem = gemRows.reduce((sum, row) => sum + getGemValue(row), 0);
    const labor = laborRows.reduce((sum, row) => sum + getLaborValue(row), 0);
    const finding = findingRows.reduce((sum, row) => sum + getFindingValue(row), 0);
    const materialsSubtotal = metal + gem;
    const bomSubtotal = materialsSubtotal + labor;
    return { metal, gem, labor, finding, materialsSubtotal, bomSubtotal };
  }, [findingRows, gemRows, laborRows, metalRows]);

  const getOverheadRowValue = (row: OverheadRow): number => {
    const rule = getOverheadRuleForRow(row);
    if (!rule) return 0;
    const mode = rule.overheadApplyMode || '';
    const ratePercent = Math.max(0, rule.ratePercent || 0);
    const flatAmount = Math.max(0, rule.flatAmount || 0);
    if (mode === 'FLAT') return flatAmount;
    if (mode === 'PERCENT_BOM_SUBTOTAL' || mode === 'PERCENT_MATERIALS') {
      return (getSingleDesignOverheadContext.bomSubtotal * ratePercent) / 100;
    }
    return 0;
  };

  const costTotals = useMemo(() => {
    const metal = metalRows.reduce((sum, row) => sum + getMetalValue(row), 0);
    const gem = gemRows.reduce((sum, row) => sum + getGemValue(row), 0);
    const labor = laborRows.reduce((sum, row) => sum + getLaborValue(row), 0);
    const overhead = overheadRows.reduce((sum, row) => sum + getOverheadRowValue(row), 0);
    const finding = findingRows.reduce((sum, row) => sum + getFindingValue(row), 0);
    const totalMetalNetWt = metalRows.reduce((sum, row) => sum + Math.max(0, parseNum(row.netWt)), 0);
    const totalGemWtInCts = gemRows.reduce((sum, row) => sum + getGemWeight(row), 0);
    const grossWeight = totalMetalNetWt + totalGemWtInCts / 5;
    return { metal, gem, labor, overhead, finding, grossWeight, total: metal + gem + labor + overhead + finding };
  }, [
    findingRows,
    gemRows,
    laborRows,
    metalRows,
    overheadRows,
    getSingleDesignOverheadContext.bomSubtotal,
    getSingleDesignOverheadContext.materialsSubtotal,
  ]);

  const openAdd = () => {
    if (!canCreateDesign) {
      window.alert('You do not have permission to add designs.');
      return;
    }
    setEditingId(null);
    setEditingDesignIsPrimary(false);
    setIsDesignNoManual(false);
    setIsDesignNameManual(false);
    setStructuredSerialOverride('');
    setSourceDesignNo('');
    designNoRequestSeqRef.current += 1;
    setForm({
      ...defaultForm,
      designNo: '',
      designName: '',
      version: defaultForm.version,
      jewelryGroup: '',
      collection: '',
      stage: '',
      diamondType: '',
      diamondSpread: '',
      diamondWeight: '',
      diamondQuality: '',
      jewelrySize: '',
      designStatus: '',
      coverageCustom: '',
      diamondQualityCustom: '',
      ijewelModelId: '',
      ijewelBaseName: '',
    });
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
    setOverheadRows([]);
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
      const visibleLabors = labors.filter(
        (item: any) =>
          !String(item?.laborHead || '').trim().toLowerCase().startsWith('overhead -'),
      );
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
        coverageCustom: '',
        diamondWeight: detail.diamondWeight || '',
        diamondQuality: detail.diamondQuality || '',
        diamondQualityCustom: '',
        jewelrySize: detail.jewelrySize || row.jewelrySize || '',
        otherWeight: asInput(detail.otherWeight),
        tags: tags.join(', '),
        designStatus: detail.designStatus || row.status || '',
        drawerLocation: detail.drawerLocation || '',
        designDescription: detail.designDescription || '',
        remarks: detail.remarks || row.remarks || '',
        ijewelModelId: asInput(detail.ijewelModelId),
        ijewelBaseName: asInput(detail.ijewelBaseName),
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
        visibleLabors.length > 0
          ? visibleLabors.map((item: any) => ({
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
      setOverheadRows(
        labors
          .filter((item: any) => String(item?.laborHead || '').trim().toLowerCase().startsWith('overhead -'))
          .map((item: any) => {
            const overheadLabel = String(item?.laborHead || '').replace(/^Overhead\s*-\s*/i, '').trim();
            const matchedOverheadRule = masterOptions.overheadRules.find(
              (rule) => normalizeLookupKey(rule.value) === normalizeLookupKey(overheadLabel),
            );
            return {
              id: item.id || makeId(),
              overheadHead: overheadLabel,
              ruleId: matchedOverheadRule?.id || '',
            };
          }),
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
        coverageCustom: '',
        diamondWeight: '',
        diamondQuality: '',
        diamondQualityCustom: '',
        jewelrySize: row.jewelrySize,
        otherWeight: '',
        tags: row.tags.join(', '),
        designStatus: row.status,
        drawerLocation: '',
        designDescription: '',
        remarks: row.remarks,
        ijewelModelId: row.ijewelModelId ? String(row.ijewelModelId) : '',
        ijewelBaseName: row.ijewelBaseName ? String(row.ijewelBaseName) : '',
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
    setIsDesignNameManual(true);
    setEditingDesignIsPrimary(row.isPrimary === true);
    setStructuredSerialOverride('');
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
    setEditingDesignIsPrimary(false);
    setIsDesignNoManual(true);
    setIsDesignNameManual(true);
    setStructuredSerialOverride('');
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
    const isStructuredNewDesignMode = !isUpdate && !forceCreate && !sourceDesignNo;
    const originalDesignName = String(detailInfo?.designName || '').trim();
    const requestedDesignName = String(form.designName || '').trim();
    const shouldShowFamilyNameSyncNotice =
      isUpdate &&
      editingDesignIsPrimary &&
      requestedDesignName.length > 0 &&
      requestedDesignName !== originalDesignName;
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
      window.alert('Category is required.');
      return;
    }

    const overrideDesignNo = options?.overrideDesignNo?.trim();
    const baseDesignNo =
      overrideDesignNo ||
      (isStructuredNewDesignMode ? structuredDesignNo : '') ||
      (forceCreate && sourceDesignNo ? sourceDesignNo : '') ||
      form.designNo.trim() ||
      (!isUpdate ? suggestNextDesignNo(form.jewelryGroup) : '');
    const resolvedDesignNo = baseDesignNo;
    const shouldSendDesignNo = isStructuredNewDesignMode || isUpdate || isDesignNoManual || forceCreate;
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
      diamondWeight: form.diamondWeight.trim().length > 0 ? form.diamondWeight.trim() : null,
      diamondQuality: form.diamondQuality.trim() || undefined,
      jewelrySize: form.jewelrySize.trim() || undefined,
      designStatus: form.designStatus.trim() || undefined,
      drawerLocation: form.drawerLocation.trim() || undefined,
      otherWeight: form.otherWeight.trim().length > 0 ? parseNum(form.otherWeight) : undefined,
      designDescription: form.designDescription.trim() || undefined,
      remarks: form.remarks.trim() || undefined,
      tags: selectedTags,
      imageUrls: galleryKeys,
      stlFileUrl: stlItem?.key || stlItem?.url || undefined,
      ijewelModelId: form.ijewelModelId.trim(),
      ijewelBaseName: form.ijewelBaseName.trim(),
    };
    const overheadLaborPayload = overheadRows
      .map((row) => {
        const rule = getOverheadRuleForRow(row);
        const label = row.overheadHead.trim() || rule?.value || '';
        const value = getOverheadRowValue(row);
        if (!label) return null;
        return {
          laborHead: `Overhead - ${label}`,
          laborPerUnit: value,
          unitQty: 1,
          laborValue: value,
        };
      })
      .filter(Boolean);
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
      labors: [
        ...laborRows.map((row) => ({
          laborHead: row.laborHead.trim() || undefined,
          laborPerUnit: parseNum(row.laborPerUnit),
          unitQty: parseNum(row.unitQty),
          laborValue: getLaborValue(row),
        })),
        ...overheadLaborPayload,
      ],
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
            setDetailDesign(response.data);
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
            setDetailDesign(response.data);
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
          setDetailDesign(response.data);
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
        setDetailDesign(response.data);
        if (options?.selectAfterCreate) {
          setEditingId(saved.id);
          setIsDesignNoManual(true);
          setForm((prev) => ({ ...prev, version: saved.version || resolvedVersion }));
        }
      }

      setEditingId(null);
      setEditingDesignIsPrimary(false);
      setIsDesignNoManual(false);
      setShowGalleryPicker(false);
      setShowAddModal(false);
      if (shouldShowFamilyNameSyncNotice) {
        showDesignSaveNotice('Design name synced across all versions');
      }
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

    if (nextActive && currentUser?.role !== 'SUPER_ADMIN') {
      window.alert('Only Super Admin can activate inactive designs.');
      return;
    }

    if (deletingId) return;

    if (nextActive) {
      const typed = window.prompt('Type ACTIVATE to confirm design activation.', '');
      if ((typed || '').trim().toUpperCase() !== 'ACTIVATE') {
        return;
      }
    } else {
      const confirmed = window.confirm('Disable this design- It will be marked inactive.');
      if (!confirmed) return;
    }

    setDeletingId(id);
    try {
      await api.patch(`/products/${id}/status`, { isActive: nextActive });
      setRows((prev) => prev.map((item) => (item.id === id ? { ...item, isActive: nextActive } : item)));
      if ((showInactive && nextActive) || (!showInactive && !nextActive)) {
        setSelectedId((current) => (current === id ? '' : current));
      }
      const actor = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || currentUser?.email || 'Current user';
      const changedAt = new Date().toLocaleString();
      window.alert(
        `Design marked as ${nextActive ? 'active' : 'inactive'}.\nUpdated by: ${actor}\nTime: ${changedAt}`,
      );
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to update design status.');
    } finally {
      setDeletingId(null);
    }
  };

  const setPrimaryDesignVersion = async (row: DesignRow) => {
    if (!canModifyExistingDesigns) {
      window.alert('You have read-only access for designs.');
      return;
    }

    if (row.isPrimary) {
      return;
    }

    const confirmed = window.confirm(`Set ${row.designNo} as the primary version-`);
    if (!confirmed) return;

    try {
      await api.post(`/products/${row.id}/primary`);
      await fetchDesignRows(row.id);
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to set primary version.');
    }
  };

  const updateMetalRow = (id: string, key: keyof Omit<MetalRow, 'id'>, value: string) => {
    const numericFieldMode: Partial<Record<keyof Omit<MetalRow, 'id'>, 'decimal' | 'integer'>> = {
      netWt: 'decimal',
      wastagePercent: 'decimal',
      wastageWt: 'decimal',
      pricePerGm: 'decimal',
      value: 'decimal',
    };
    const nextValue = numericFieldMode[key] ? sanitizeNumericTextInput(value, numericFieldMode[key]!) : value;

    setMetalRows((prev) => {
      if (['netWt', 'wastagePercent', 'wastageWt', 'pricePerGm', 'value'].includes(key) && isPartialDecimal(nextValue)) {
        return prev.map((item) => (item.id === id ? { ...item, [key]: nextValue } : item));
      }

      if (key === 'goldColour') {
        const normalizedValue = normalizeLookupKey(nextValue);
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

        let updated: MetalRow = { ...item, [key]: nextValue };
        if (key === 'goldColour') {
          const rate = getMetalRate(nextValue);
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
    const numericFieldMode: Partial<Record<keyof Omit<GemRow, 'id'>, 'decimal' | 'integer'>> = {
      wtPerPcs: 'decimal',
      pcs: 'integer',
      wtInCts: 'decimal',
      pricePerCt: 'decimal',
      amount: 'decimal',
    };
    const nextValue = numericFieldMode[key] ? sanitizeNumericTextInput(value, numericFieldMode[key]!) : value;

    setGemRows((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        let updated: GemRow = { ...item, [key]: nextValue };

        if (['wtPerPcs', 'pcs', 'wtInCts', 'pricePerCt', 'amount'].includes(key) && isPartialDecimal(nextValue)) {
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
    const numericFieldMode: Partial<Record<keyof Omit<LaborRow, 'id'>, 'decimal' | 'integer'>> = {
      laborPerUnit: 'decimal',
      unitQty: 'decimal',
      laborValue: 'decimal',
    };
    const nextValue = numericFieldMode[key] ? sanitizeNumericTextInput(value, numericFieldMode[key]!) : value;
    setLaborRows((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: nextValue } : item)));
  };

  const updateVersionBuilderLaborRow = (id: string, key: keyof Omit<LaborRow, 'id'>, value: string) => {
    const numericFieldMode: Partial<Record<keyof Omit<LaborRow, 'id'>, 'decimal' | 'integer'>> = {
      laborPerUnit: 'decimal',
      unitQty: 'decimal',
      laborValue: 'decimal',
    };
    const nextValue = numericFieldMode[key] ? sanitizeNumericTextInput(value, numericFieldMode[key]!) : value;
    setVersionBuilderLaborRows((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: nextValue } : item)));
  };

  const updateFindingRow = (id: string, key: keyof Omit<FindingRow, 'id'>, value: string) => {
    const numericFieldMode: Partial<Record<keyof Omit<FindingRow, 'id'>, 'decimal' | 'integer'>> = {
      pricePerUnit: 'decimal',
      units: 'decimal',
      totalWeight: 'decimal',
      findingValue: 'decimal',
    };
    const nextValue = numericFieldMode[key] ? sanitizeNumericTextInput(value, numericFieldMode[key]!) : value;
    setFindingRows((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: nextValue } : item)));
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
    const exportIds = filteredBaseRows.flatMap((item) => {
      const versions = getVersionsForDesign(item.designNo);
      if (!versions.length) return [item.id];
      return versions.map((row) => row.id);
    });
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
              <th>Category</th>
              <th>Jewelry Size</th>
              <th>Diamond Type</th>
              <th>Diamond Spread</th>
              <th>Metal Caratage</th>
              <th>Sub Category</th>
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
    <div className="space-y-6">
      {designSaveNotice ? (
        <div className="fixed right-6 top-6 z-[120] pointer-events-none">
          <div className="rounded-xl border border-emerald-200 bg-white/95 px-4 py-3 shadow-lg ring-1 ring-emerald-500/10 backdrop-blur">
            <p className="text-sm font-semibold text-emerald-700">{designSaveNotice}</p>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Design List</h1>
          <p className="text-sm font-medium text-slate-500">Manage and review your jewelry design entries</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400"
                placeholder="Search designs number, name, category..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${
                showFilters 
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-500/10' 
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <svg className={`h-4.5 w-4.5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01?.293.707l-6.414 6.414a1 1 0 00?.293.707V17l-4 4v-6.586a1 1 0 00?.293?.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters</span>
            </button>

            <div className="relative" ref={columnPickerRef}>
              <button
                type="button"
                onClick={() => setShowColumnPicker(!showColumnPicker)}
                className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${
                  showColumnPicker 
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-500/10' 
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                <span>Columns</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 group-hover:bg-slate-200">
                  {visibleColumns.length}
                </span>
              </button>

              {showColumnPicker && (
                <div className="absolute left-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Table Columns</h4>
                      <p className="text-[11px] font-medium text-slate-500">{visibleColumns.length} of {DESIGN_LIST_COLUMNS.length} visible</p>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={showAllColumns} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800">Show all</button>
                      <button type="button" onClick={resetVisibleColumns} className="text-[11px] font-bold text-slate-400 hover:text-slate-600">Reset</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {DESIGN_LIST_COLUMNS.map((column) => (
                      <label 
                        key={column.key} 
                        className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                          isColumnVisible(column.key) ? 'bg-indigo-50/50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                          checked={isColumnVisible(column.key)}
                          onChange={() => toggleColumnVisibility(column.key)}
                        />
                        {column.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInactive(!showInactive)}
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-all ${
                showInactive ? 'border-amber-200 bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-500/10'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.076m10.725 10.725L21 21m-2.571-2.571L12 12m0 0L8.429 8.429M3 3l3.293 3.293m0 0l4.242 4.242M9.88 9.88l1.694 1.694" />
              </svg>
              <span>{showInactive ? 'Hide Inactive' : 'Show Inactive'}</span>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative" ref={actionsDropdownRef}>
              <button
                type="button"
                onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95"
              >
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
                <span>Actions</span>
              </button>

              {showActionsDropdown && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-slate-900/5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="mb-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Version Import</div>
                  <button 
                    onClick={() => { downloadDesignTemplate(); setShowActionsDropdown(false); }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-indigo-600"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-indigo-100 group-hover:text-indigo-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </div>
                    Download Version Template
                  </button>
                  <button 
                    onClick={() => { designImportInputRef.current?.click(); setShowActionsDropdown(false); }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-indigo-600"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    Import Versions Excel
                  </button>
                  <button
                    onClick={() => {
                      setShowMediaLibraryModal(true);
                      setShowActionsDropdown(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-indigo-600"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V7.5A2.25 2.25 0 0018.75 5.25h-3.879a1.125 1.125 0 01?.796?.33l-1.09-1.09a1.125 1.125 0 00?.795?.33H5.25A2.25 2.25 0 003 5.75v10.75Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12h9m-9 3h5.25" />
                      </svg>
                    </div>
                    Media Library
                  </button>

                  <div className="px-3 pb-2 pt-1 text-[10px] font-medium text-slate-500">
                    Use one base Design No per file with multiple versions (V1, V2, V3...).
                  </div>
                  <div className="my-1 border-t border-slate-100" />
                  <div className="mb-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Export Data</div>
                  <button 
                    onClick={() => { exportPdf(); setShowActionsDropdown(false); }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-rose-600"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c?.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125?.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    Export PDF ({selectedDesignIds.length})
                  </button>
                  <button 
                    onClick={() => { exportExcel(); setShowActionsDropdown(false); }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-emerald-600"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5V4.625c0?.621.504-1.125 1.125-1.125h15.75c.621 0 1.125.504 1.125 1.125v13.75c0 .621?.504 1.125-1.125 1.125m-17.25 0h17.25m-17.25 0h17.25M6.75 7.5h.008v.008H6.75V7.5zm0 4.5h.008v.008H6.75V12zm0 4.5h.008v.008H6.75V16.5zm3-9h.008v.008h?.008V7.5zm0 4.5h.008v.008h?.008V12zm0 4.5h.008v.008h?.008V16.5zm3-9h.008v.008h?.008V7.5zm0 4.5h.008v.008h?.008V12zm0 4.5h.008v.008h?.008V16.5zm3-9h.008v.008h?.008V7.5zm0 4.5h.008v.008h?.008V12zm0 4.5h.008v.008h?.008V16.5z" />
                      </svg>
                    </div>
                    Export Excel
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_15px_-3px_rgba(79,70,229,0.3)] transition-all hover:bg-indigo-700 hover:shadow-indigo-500/40 active:scale-95"
              onClick={openAdd}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Add New Design</span>
            </button>
          </div>
        </div>


        <input
          ref={designImportInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImportDesigns}
        />

        {showFilters && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white/50 p-5 backdrop-blur-sm shadow-sm ring-1 ring-slate-900/5 transition-all animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Advanced Filters</h3>
              <button 
                type="button"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                onClick={() => setFilters({
                  jewelryGroup: '',
                  collection: '',
                  jewelrySize: '',
                  tags: '',
                  status: '',
                  goldColour: '',
                  stonePacket: '',
                })}
              >
                Clear all filters
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Category</label>
                <SearchableSelect
                  value={filters.jewelryGroup}
                  onChange={(val) => setFilters((prev) => ({ ...prev, jewelryGroup: val }))}
                  options={[
                    { value: '', label: 'All Categories' },
                    ...masterOptions.jewelryGroups.map(o => ({ value: o.value, label: o.value }))
                  ]}
                  placeholder="All Categories"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Sub Category</label>
                <SearchableSelect
                  value={filters.collection}
                  onChange={(val) => setFilters((prev) => ({ ...prev, collection: val }))}
                  options={[
                    { value: '', label: 'All Sub Categories' },
                    ...filteredSubCategoryFilterOptions.map(o => ({ value: o.value, label: o.value }))
                  ]}
                  placeholder="All Sub Categories"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Jewelry Size</label>
                <SearchableSelect
                  value={filters.jewelrySize}
                  onChange={(val) => setFilters((prev) => ({ ...prev, jewelrySize: val }))}
                  options={[
                    { value: '', label: 'All Sizes' },
                    ...filteredJewelrySizeFilterOptions.map(o => ({ value: o.value, label: o.value }))
                  ]}
                  placeholder="All Sizes"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Metal Info</label>
                <SearchableSelect
                  value={filters.goldColour}
                  onChange={(val) => setFilters((prev) => ({ ...prev, goldColour: val }))}
                  options={[
                    { value: '', label: 'All Metals' },
                    ...masterOptions.metalCaratages.map(o => ({ value: o.value, label: o.aliasName || o.value }))
                  ]}
                  placeholder="All Metals"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Status</label>
                <SearchableSelect
                  value={filters.status}
                  onChange={(val) => setFilters((prev) => ({ ...prev, status: val }))}
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'Active', label: 'Active' },
                    { value: 'Inactive', label: 'Inactive' }
                  ]}
                  placeholder="All Statuses"
                />
              </div>
            </div>
          </div>
        )}
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
                {isColumnVisible('jewelryGroup') ? <th className="app-table-head-cell">Category</th> : null}
                {isColumnVisible('jewelrySize') ? <th className="app-table-head-cell">Jewelry Size</th> : null}
                {isColumnVisible('metalInfo') ? <th className="app-table-head-cell">Metal Info</th> : null}
                {isColumnVisible('collection') ? <th className="app-table-head-cell">Sub Category</th> : null}
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
              {pagedRows.map((row, idx) => {
                const versionRows = getVersionsForDesign(row.designNo);
                const versionCount = versionRows.length || 1;
                const versionsExpanded = isVersionsExpanded(row.designNo);
                const columnCount = 2 + DESIGN_LIST_COLUMNS.filter((column) => isColumnVisible(column.key)).length;
                const versionsLabel = versionsExpanded ? 'Hide Versions' : 'Versions';
                const primaryVersionId = resolvePrimaryVersionId(versionRows);
                return (
                <Fragment key={row.id}>
                <tr key={row.id} className="group border-b border-slate-100 transition-colors hover:bg-slate-50/50">
                  <td className="py-4 pl-4 pr-3 text-sm text-slate-500 font-medium">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                        checked={selectedDesignIds.includes(row.id)}
                        onChange={() => toggleDesignSelection(row.id)}
                        aria-label={`Select ${row.designNo || `design ${idx + 1}`}`}
                      />
                      <span className="tabular-nums">{idx + 1}</span>
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
                  <td className="py-4 px-3 text-left whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-sm font-bold text-slate-900 transition-colors hover:text-indigo-600 focus:outline-none"
                        onClick={() => openEdit(row)}
                        title={row.designName ? `${row.designNo} ? ${row.designName}` : 'Edit design'}
                      >
                        {row.designNo}
                      </button>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-inset ring-slate-500/10">
                        {versionCount} {versionCount === 1 ? 'Vers.' : 'Vers.'}
                      </span>
                    </div>
                  </td>
                  ) : null}
                  {isColumnVisible('jewelryGroup') ? <td className="py-4 px-3 whitespace-nowrap text-sm font-medium text-slate-700">{row.jewelryGroup}</td> : null}
                  {isColumnVisible('jewelrySize') ? <td className="py-4 px-3 whitespace-nowrap text-sm font-medium text-slate-700">{row.jewelrySize}</td> : null}
                  {isColumnVisible('metalInfo') ? (
                    <td className="py-4 px-3 whitespace-nowrap text-sm font-medium text-slate-700">
                      {getMetalCaratageDisplay(row.goldColour || '', masterOptions.metalCaratages) || row.goldColour || '-'}
                    </td>
                  ) : null}
                  {isColumnVisible('collection') ? <td className="py-4 px-3 whitespace-nowrap text-sm font-medium text-slate-700">{row.collection}</td> : null}
                  {isColumnVisible('stoneInfo') ? (
                    <td className="py-4 px-3">
                      <span className="inline-flex items-center rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-bold text-cyan-700 ring-1 ring-inset ring-cyan-700/10">
                        {row.stoneInfo}
                      </span>
                    </td>
                  ) : null}
                  {isColumnVisible('price') ? <td className="py-4 px-3 whitespace-nowrap text-sm font-bold text-slate-900">{formatMoney(row.price)}</td> : null}
                  {isColumnVisible('tags') ? (
                    <td className="py-4 px-3">
                      <div className="flex flex-nowrap gap-1.5 overflow-hidden">
                        {row.tags.map((tag) => <Tag key={`${row.id}-${tag}`} text={tag} />)}
                      </div>
                    </td>
                  ) : null}
                  {isColumnVisible('stage') ? (
                    <td className="py-4 px-3 whitespace-nowrap">
                      <StatusBadge
                        status={row.stage || '-'}
                        type={row.stage === 'Production' ? 'primary' : 'info'}
                      />
                    </td>
                  ) : null}
                  {isColumnVisible('status') ? (
                    <td className="py-4 px-3 whitespace-nowrap">
                      <StatusBadge
                        status={row.status || (row.isActive ? 'Active' : 'Inactive')}
                        type={row.isActive ? 'success' : 'danger'}
                      />
                    </td>
                  ) : null}
                  {isColumnVisible('updatedBy') ? (
                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.updatedByName || 'System'} size="xs" />
                        <span className="text-sm font-medium text-slate-700">{row.updatedByName || 'System'}</span>
                      </div>
                    </td>
                  ) : null}
                  {isColumnVisible('modifiedAt') ? (
                    <td className="py-4 px-3 whitespace-nowrap text-sm font-medium text-slate-500">
                      {row.modifiedAt || '-'}
                    </td>
                  ) : null}

                  <td className="py-4 px-3 text-left">
                    <div className="flex items-center justify-start gap-1.5">
                      <Action label="View" onClick={() => { setSelectedId(row.id); setModal('info'); }} />
                      <Action label="History" onClick={() => { setSelectedId(row.id); setModal('history'); }} />
                      <Action label={versionsLabel} onClick={() => toggleVersionsForDesign(row.designNo)} />
                      {canCreateDesign ? (
                        <Action label="Version Builder" onClick={() => openVersionBuilder(row)} />
                      ) : null}
                      {canCreateDesign ? (
                        <Action label="New Version" onClick={() => openNewVersion(row)} />
                      ) : null}
                      {canModifyExistingDesigns ? (
                        <>
                          <Action label="Edit" onClick={() => openEdit(row)} />
                          {showInactive ? (
                            <button
                              type="button"
                              title="Activate (Type ACTIVATE to confirm)"
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
                          ) : (
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
                          )}
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
                {versionsExpanded ? (
                  <tr className="bg-slate-50/70">
                    <td className="app-table-cell" colSpan={columnCount}>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        {versionRows.length <= 1 ? (
                          <p className="text-xs text-slate-500">No additional versions for this design.</p>
                        ) : (
                          <div className="space-y-2">
                            {versionRows.map((versionRow) => {
                              const isPrimaryVersion = versionRow.id === primaryVersionId;
                              return (
                              <div key={versionRow.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="font-semibold text-slate-900">{versionRow.designNo}</span>
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{versionRow.version || 'V1'}</span>
                                  {isPrimaryVersion ? (
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                      Primary
                                    </span>
                                  ) : null}
                                  <span className="text-slate-600">{versionRow.stage || '-'}</span>
                                  <span className="text-slate-600">{versionRow.status || (versionRow.isActive ? 'Active' : 'Inactive')}</span>
                                  <span className="text-slate-500">Updated: {versionRow.modifiedAt || '-'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Action label="View" onClick={() => { setSelectedId(versionRow.id); setModal('info'); }} />
                                  {canModifyExistingDesigns ? (
                                    <>
                                      <Action label="Edit" onClick={() => openEdit(versionRow)} />
                                      {!isPrimaryVersion ? (
                                        <Action label="Set Primary" onClick={() => setPrimaryDesignVersion(versionRow)} />
                                      ) : null}
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              );
              })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 space-y-1 text-sm text-gray-600">
          <p>Showing {showingFrom}-{showingTo} of {filteredBaseRows.length} entries</p>
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

      {showMediaLibraryModal ? (
        <Modal title="MEDIA LIBRARY (FOR EXCEL IMPORT KEYS)" size="max-w-6xl" onClose={() => setShowMediaLibraryModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto_auto_auto]">
              <input
                type="text"
                value={mediaLibrarySearch}
                onChange={(event) => setMediaLibrarySearch(event.target.value)}
                placeholder="Search by file name or key"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <select
                value={mediaLibraryType}
                onChange={(event) => setMediaLibraryType(event.target.value as MediaLibraryTypeFilter)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="ALL">All Types</option>
                <option value="IMAGE">Images</option>
                <option value="VIDEO">Videos</option>
                <option value="STL">STL</option>
              </select>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={() => void fetchMediaLibrary()}
              >
                Refresh
              </button>
              <button
                type="button"
                className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => mediaLibraryGalleryInputRef.current?.click()}
                disabled={mediaLibraryUploading}
              >
                Upload Image/Video
              </button>
              <button
                type="button"
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => mediaLibraryStlInputRef.current?.click()}
                disabled={mediaLibraryUploading}
              >
                Upload STL
              </button>
            </div>

            <input
              ref={mediaLibraryGalleryInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleMediaLibraryGalleryUploadChange}
            />
            <input
              ref={mediaLibraryStlInputRef}
              type="file"
              accept=".stl,model/stl,application/sla,model/x.stl-ascii"
              multiple
              className="hidden"
              onChange={handleMediaLibraryStlUploadChange}
            />

            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="app-table-scroll scrollbar-top">
                <table className="app-table app-table-compact">
                  <thead>
                    <tr>
                      <th className="app-table-head-cell">Preview</th>
                      <th className="app-table-head-cell">Type</th>
                      <th className="app-table-head-cell">File</th>
                      <th className="app-table-head-cell">Media Key (use in Excel)</th>
                      <th className="app-table-head-cell">Uploaded</th>
                      <th className="app-table-head-cell">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mediaLibraryLoading ? (
                      <tr>
                        <td className="app-table-cell text-sm text-slate-500" colSpan={6}>
                          Loading media library...
                        </td>
                      </tr>
                    ) : mediaLibraryRows.length === 0 ? (
                      <tr>
                        <td className="app-table-cell text-sm text-slate-500" colSpan={6}>
                          No media files found.
                        </td>
                      </tr>
                    ) : (
                      mediaLibraryRows.map((item) => (
                        <tr key={item.id}>
                          <td className="app-table-cell">
                            {item.mediaType === 'STL' ? (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500">
                                STL
                              </div>
                            ) : (
                              <MediaPreview
                                url={item.url}
                                alt={item.fileName}
                                className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                              />
                            )}
                          </td>
                          <td className="app-table-cell">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700">
                              {item.mediaType}
                            </span>
                          </td>
                          <td className="app-table-cell text-sm text-slate-700">{item.fileName}</td>
                          <td className="app-table-cell">
                            <code className="select-all break-all rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                              {item.fileKey}
                            </code>
                          </td>
                          <td className="app-table-cell text-xs text-slate-500">
                            <div>{item.uploadedBy || 'System'}</div>
                            <div>{formatDetailDateTime(item.createdAt || '')}</div>
                          </td>
                          <td className="app-table-cell">
                            <button
                              type="button"
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => void copyMediaLibraryKey(item.fileKey)}
                            >
                              Copy Key
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Tip: Use <span className="font-semibold">Image Keys</span> (comma separated) and <span className="font-semibold">STL Key</span> columns in Excel import for version media mapping.
            </p>
          </div>
        </Modal>
      ) : null}

      {showVersionBuilderModal && versionBuilderBaseDesign ? (
        <Modal
          title={`VERSION BUILDER (${getBaseDesignNo(versionBuilderBaseDesign.designNo) || versionBuilderBaseDesign.designNo})`}
          size="max-w-6xl"
          onClose={closeVersionBuilderModal}
        >
          <div className="space-y-5">
            <div className="overflow-x-auto">
              <div className="flex min-w-max items-end border-b border-[#e3d9cc]">
                {VERSION_BUILDER_WORKFLOW.map((step) => {
                  const active = versionBuilderWorkflowStep === step.id;
                  const badgeValue =
                    step.id === 'DIMENSIONS'
                      ? versionBuilderCombinationCount
                      : step.id === 'GEMSTONES'
                        ? versionBuilderGemRows.length
                        : step.id === 'SIZE_CHART'
                          ? versionBuilderGemRows.length
                        : step.id === 'PREVIEW'
                          ? versionBuilderCombinationCount
                          : null;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setVersionBuilderWorkflowStep(step.id)}
                      className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                        active ? 'border-[#bf944d] text-[#1f1914]'
                          : 'border-transparent text-[#8e8276] hover:text-[#4d433a]'
                      }`}
                    >
                      <span>{step.title}</span>
                      {badgeValue !== null ? (
                        <span className="rounded-full bg-[#f7ecd7] px-2 py-0.5 text-[11px] font-bold text-[#8f6a2c]">
                          {badgeValue}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {versionBuilderWorkflowStep === 'INFO' ? (
              <div className="rounded-[26px] border border-[#e4d8c9] bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6a2c]">Step 1 of 6</p>
                  <h3 className="mt-1 text-[1.35rem] font-bold text-[#2b241d]">Style info</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Base style and general info for the builder flow. Use this as the starting point before enabling variant axes.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e6ddd2] bg-[#fffdf9] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f6a2c]">Base Style</p>
                      <h3 className="mt-1 text-lg font-bold text-[#2b241d]">
                        {versionBuilderBaseDesign.designNo}
                        <span className="ml-2 text-sm font-semibold text-slate-500">({versionBuilderBaseDesign.version || 'V1'})</span>
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">{versionBuilderBaseDesign.designName || 'Unnamed design'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-xl border border-[#e6ddd2] bg-white px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Category</p>
                        <p className="text-sm font-semibold text-slate-900">{versionBuilderBaseDesign.jewelryGroup || '-'}</p>
                      </div>
                      <div className="rounded-xl border border-[#e6ddd2] bg-white px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Existing</p>
                        <p className="text-sm font-semibold text-slate-900">{versionBuilderVersionRows.length} versions</p>
                      </div>
                      <div className="rounded-xl border border-[#e6ddd2] bg-white px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Variant Count</p>
                        <p className="text-sm font-semibold text-slate-900">{versionBuilderCombinationCount}</p>
                      </div>
                      <div className="rounded-xl border border-[#d9b977] bg-[#faf4e6] px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">Next Version</p>
                        <p className="text-sm font-semibold text-amber-800">V{versionBuilderHighestVersion + 1}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {versionBuilderWorkflowStep === 'DIMENSIONS' ? (
              <div className="rounded-[26px] border border-[#e4d8c9] bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6a2c]">Step 2 of 6</p>
                  <h3 className="mt-1 text-[1.35rem] font-bold text-[#2b241d]">Variant axes</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Toggle values on or off. The variant count updates live, and so does what the rep sees in the configurator.
                  </p>
                </div>

                <div className="space-y-3">
                  {versionBuilderOptionGroups.map((group) => {
                    const selectedValues = versionBuilderSelections[group.id];
                    const hasValues = group.values.length > 0;
                    return (
                      <div key={group.id} className="rounded-2xl border border-[#e6ddd2] bg-[#fffdf9] px-5 py-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-bold text-[#2b241d]">{group.label}</p>
                            <span className="rounded-full bg-[#f4ede3] px-2.5 py-1 text-[10px] font-semibold tracking-[0.05em] text-[#7b6f61]">
                              {hasValues ? `${selectedValues.length} selected` : '0 selected'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              className="rounded-lg border border-[#ddd2c3] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#6f6358] transition hover:border-[#cdb58d] hover:bg-[#fbf8f3]"
                              onClick={() => setAllVersionBuilderValues(group.id, group.values)}
                              disabled={!hasValues}
                            >
                              All values
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-[#ddd2c3] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#6f6358] transition hover:border-[#cdb58d] hover:bg-[#fbf8f3]"
                              onClick={() => setAllVersionBuilderValues(group.id, [])}
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <p className="mb-3 text-[12px] text-slate-500">{group.helper}</p>

                        {!hasValues ? (
                          <div className="rounded-xl border border-dashed border-[#ddd2c3] bg-[#faf7f2] px-4 py-3 text-xs text-slate-500">
                            No options available in masters for this axis.
                          </div>
                        ) : (
                          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
                            {group.values.map((value) => {
                              const selected = selectedValues.includes(value);
                              return (
                                <button
                                  key={`${group.id}-${value}`}
                                  type="button"
                                  className={`rounded-[10px] border px-3 py-2 text-[12.5px] font-semibold transition ${
                                    selected
                                      ? 'border-[#d9b977] bg-[#f7ecd7] text-[#8f6a2c]'
                                      : 'border-[#e3d9cc] bg-white text-[#5b5147] hover:border-[#cdb58d] hover:bg-[#fbf8f3]'
                                  }`}
                                  onClick={() => toggleVersionBuilderValue(group.id, value)}
                                >
                                  {value}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#ebe2d6] pt-4">
                  <p className="text-xs text-slate-500">
                    Variant count is the cartesian product of selected values across all enabled axes.
                  </p>
                  <span className="rounded-full border border-[#e0d3bf] bg-[#faf5ec] px-3 py-1.5 text-xs font-semibold text-[#7b6132]">
                    {versionBuilderCombinationCount.toLocaleString('en-US')} combinations
                  </span>
                </div>
              </div>
            ) : null}

            {versionBuilderWorkflowStep === 'IMAGES' ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#e4d8c9] bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f6a2c]">Image Handling Strategy</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setVersionBuilderImageMode('INHERIT_PARENT')}
                      className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                        versionBuilderImageMode === 'INHERIT_PARENT'
                          ? 'border-[#bf944d] bg-[#f8f2e8] text-[#8f6a2c]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <p className="font-semibold">Use Parent Images</p>
                      <p className="mt-1 text-slate-500">All new versions inherit base design media.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVersionBuilderImageMode('MAP_BY_METAL')}
                      className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                        versionBuilderImageMode === 'MAP_BY_METAL'
                          ? 'border-[#bf944d] bg-[#f8f2e8] text-[#8f6a2c]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <p className="font-semibold">Map by Metal</p>
                      <p className="mt-1 text-slate-500">Choose specific image per selected metal.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVersionBuilderImageMode('MANUAL_AFTER_CREATE')}
                      className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                        versionBuilderImageMode === 'MANUAL_AFTER_CREATE'
                          ? 'border-[#bf944d] bg-[#f8f2e8] text-[#8f6a2c]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <p className="font-semibold">Set Later</p>
                      <p className="mt-1 text-slate-500">Create versions first, assign media after batch.</p>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e4d8c9] bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f6a2c]">Parent Media Gallery</p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {versionBuilderAllImageUrls.length} images
                      </span>
                      <button
                        type="button"
                        onClick={() => versionBuilderUploadInputRef.current?.click()}
                        className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100"
                      >
                        + Upload
                      </button>
                      <input
                        ref={versionBuilderUploadInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleVersionBuilderImageUploadChange}
                      />
                    </div>
                  </div>
                  {versionBuilderAllImageUrls.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                      No parent images found on this design. Mapping is disabled until media is uploaded.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {versionBuilderAllImageUrls.map((url, idx) => {
                        const isMapped =
                          versionBuilderImageMode === 'MAP_BY_METAL' &&
                          versionBuilderActiveMetalImages.includes(url);
                        return (
                        <button
                          key={`${url}-${idx}`}
                          type="button"
                          className={`overflow-hidden rounded-xl border bg-white ${isMapped ? 'border-[#bf944d] ring-2 ring-[#f0dfc2]' : 'border-slate-200 hover:border-[#bf944d]'}`}
                          onClick={() => {
                            if (versionBuilderImageMode === 'MAP_BY_METAL' && versionBuilderActiveMetal) {
                              toggleVersionBuilderMetalImageMap(versionBuilderActiveMetal, url);
                            }
                          }}
                          title={versionBuilderImageMode === 'MAP_BY_METAL' ? `Assign to ${versionBuilderActiveMetal || 'selected metal'}` : 'Parent gallery image'}
                        >
                          <img src={url} alt={`Parent media ${idx + 1}`} className="h-20 w-full object-cover" />
                          <div className="border-t border-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                            {versionBuilderImageMode === 'MAP_BY_METAL' && isMapped ? 'Selected' : `Image ${idx + 1}`}
                          </div>
                        </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {versionBuilderImageMode === 'MAP_BY_METAL' ? (
                  <div className="rounded-2xl border border-[#e4d8c9] bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f6a2c]">Metal Image Mapping</p>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {versionBuilderMappedMetalsCount}/{versionBuilderSelections.metals.length} mapped
                      </span>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {versionBuilderSelections.metals.map((metal) => {
                        const active = versionBuilderActiveMetal === metal;
                        const mapped = Boolean(versionBuilderMetalImageMap[metal]);
                        return (
                          <button
                            key={metal}
                            type="button"
                            onClick={() => setVersionBuilderActiveMetal(metal)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              active ? 'border-[#bf944d] bg-[#f8f2e8] text-[#8f6a2c]'
                                : mapped
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            {metal}
                          </button>
                        );
                      })}
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      Click a metal above, then click any parent image tile to assign it.
                    </div>
                    {versionBuilderActiveMetal ? (
                      <div className="mt-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Selected for {versionBuilderActiveMetal} ({versionBuilderActiveMetalImages.length})
                        </p>
                        {versionBuilderActiveMetalImages.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                            No images selected yet.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {versionBuilderActiveMetalImages.map((url) => (
                              <div key={`${versionBuilderActiveMetal}-${url}`} className="relative overflow-hidden rounded-lg border border-slate-200">
                                <img src={url} alt={`${versionBuilderActiveMetal} mapped`} className="h-14 w-14 object-cover" />
                                <button
                                  type="button"
                                  className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-[10px] font-bold text-white"
                                  onClick={() => removeVersionBuilderMetalImage(versionBuilderActiveMetal, url)}
                                >
                                    ?                                 </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {versionBuilderWorkflowStep === 'GEMSTONES' ? (
              <div className="space-y-4">
                <div className="rounded-[26px] border border-[#e4d8c9] bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6a2c]">Step 3a - Stone Layout</p>
                    <h3 className="mt-1 text-[1.15rem] font-bold text-[#2b241d]">Define stone groups</h3>
                    <p className="mt-1 text-[12px] leading-5 text-slate-500">
                      Each group links to a packet from inventory. Type/shape/mm/quality are inherited from the packet; price is too.
                    </p>
                  </div>

                  {versionBuilderGemLoading ? (
                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-[11px] text-slate-500">
                      Loading gemstone template from base design...
                    </p>
                  ) : null}
                  {versionBuilderGemError ? (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
                      {versionBuilderGemError}
                    </p>
                  ) : null}

                  {!versionBuilderGemLoading ? (
                    <div className="space-y-4">
                      {versionBuilderGemRows.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#ddd2c3] bg-[#faf7f2] px-4 py-3 text-[11px] text-slate-500">
                          No gemstone rows configured.
                        </div>
                      ) : (
                        versionBuilderGemRows.map((item, index) => {
                          const packet = packetOptions.find((entry) => entry.id === item.packetId);
                          const groupColor = VERSION_BUILDER_GROUP_COLORS[index % VERSION_BUILDER_GROUP_COLORS.length];
                          const groupLabel = String.fromCharCode(65 + index);
                          const groupMode = versionBuilderGemGroupModes[item.id] || 'varies';
                          const isPacketLinked = Boolean(packet);
                          return (
                            <div key={item.id} className="overflow-hidden rounded-2xl border border-[#e4d8c9] bg-white">
                              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#efe5d8] px-5 py-4">
                                <div className="flex items-center gap-4">
                                  <div
                                    className="grid h-11 w-11 place-items-center rounded-full text-base font-bold"
                                    style={{ backgroundColor: `${groupColor}22`, color: groupColor }}
                                  >
                                    {groupLabel}
                                  </div>
                                  <div>
                                    <p className="text-[14px] font-bold text-[#2b241d]">
                                      Group {groupLabel} ? {item.shape || packet?.shape || 'Stone group'}
                                    </p>
                                    <p className="text-[12px] text-slate-500">
                                      {groupMode === 'varies' ? 'Count varies per ring size' : 'Fixed per piece'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="rounded-lg bg-[#f5efe6] p-1">
                                    <button
                                      type="button"
                                      className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${
                                        groupMode === 'varies' ? 'bg-white text-[#1f1914] shadow-sm' : 'text-slate-500'
                                      }`}
                                      onClick={() =>
                                        setVersionBuilderGemGroupModes((prev) => ({ ...prev, [item.id]: 'varies' }))
                                      }
                                    >
                                      Varies per size
                                    </button>
                                    <button
                                      type="button"
                                      className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${
                                        groupMode === 'fixed' ? 'bg-white text-[#1f1914] shadow-sm' : 'text-slate-500'
                                      }`}
                                      onClick={() =>
                                        setVersionBuilderGemGroupModes((prev) => ({ ...prev, [item.id]: 'fixed' }))
                                      }
                                    >
                                      Fixed per piece
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    className="grid h-8 w-8 place-items-center rounded-lg border border-[#ece2d5] bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40"
                                    disabled={versionBuilderGemMode !== 'OVERRIDE_BLOCK' || versionBuilderGemRows.length <= 1}
                                    onClick={() => removeVersionBuilderGemRow(item.id)}
                                  >
                                    ?                                   </button>
                                </div>
                              </div>

                              <div className="px-5 py-4">
                                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f6a2c]">
                                  Diamond Packet
                                </label>
                                <select
                                  className="w-full rounded-xl border border-[#ddd2c3] bg-[#fbf8f3] px-4 py-2.5 text-[12px] font-semibold text-[#2b241d]"
                                  value={item.packetId}
                                  disabled={versionBuilderGemMode !== 'OVERRIDE_BLOCK'}
                                  onChange={(event) => applyPacketToVersionBuilderGemRow(item.id, event.target.value)}
                                >
                                  <option value="">-- Custom values (not from inventory) --</option>
                                  {packetOptions.map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                      {entry.packetName}
                                      {entry.sellingPrice != null ? ` - $${Number(entry.sellingPrice).toFixed(2)}/stone` : ''}
                                      {entry.pieces != null ? ` - qty ${entry.pieces}` : ''}
                                    </option>
                                  ))}
                                </select>
                                <p className="mt-2 text-[11px] text-slate-500">
                                  Selecting a packet sets type, shape, size and quality automatically.
                                </p>

                                {isPacketLinked ? (
                                  <div
                                    className="mt-4 grid gap-4 rounded-xl border bg-[#fbf7ef] px-4 py-3.5 md:grid-cols-3"
                                    style={{ borderLeftWidth: 4, borderLeftColor: groupColor, borderColor: '#eadfcf' }}
                                  >
                                    <div>
                                      <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-500">Packet</p>
                                      <p className="mt-1 text-[12px] font-semibold text-[#2b241d] break-words">{packet?.packetName || packet?.id || item.packetId}</p>
                                      <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Quality</p>
                                      <p className="mt-1 text-[12px] font-semibold text-[#2b241d]">{item.quality || packet?.quality || '-'} {item.color || packet?.color ? ` - ${item.color || packet?.color}` : ''}</p>
                                    </div>
                                    <div>
                                      <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-500">Type - Shape</p>
                                      <p className="mt-1 text-[12px] font-semibold text-[#2b241d]">
                                        {item.stone || packet?.stone || '-'} - {item.shape || packet?.shape || '-'}
                                      </p>
                                      <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Cost / Stone</p>
                                      <p className="mt-1 text-[12px] font-semibold text-[#2b241d]">${parseNum(item.pricePerCt || String(packet?.sellingPrice || 0)).toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-500">Size</p>
                                      <p className="mt-1 text-[12px] font-semibold text-[#2b241d]">{item.size || packet?.size || '-'} {item.size || packet?.size ? 'mm' : ''}</p>
                                      <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">On Hand</p>
                                      <p className="mt-1 text-[12px] font-semibold text-[#2b241d]">{packet?.pieces ?? '-'}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-4 rounded-xl border border-dashed border-[#ddd2c3] bg-[#faf7f2] px-4 py-3 text-[11px] text-slate-500">
                                    Custom - type, shape, size and quality entered below. Reorder will not be possible without a packet link.
                                  </div>
                                )}

                                <details className="mt-4" open={!isPacketLinked}>
                                  <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f6a2c]">
                                    {isPacketLinked ? 'Override Packet Values (Advanced)' : 'Custom values'}
                                  </summary>
                                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                                    <div>
                                      <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Stone Type</label>
                                      <input
                                        type="text"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[12px]"
                                        value={item.stone}
                                        disabled={versionBuilderGemMode !== 'OVERRIDE_BLOCK' || isPacketLinked}
                                        onChange={(event) => updateVersionBuilderGemRow(item.id, 'stone', event.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Shape</label>
                                      <input
                                        type="text"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[12px]"
                                        value={item.shape}
                                        disabled={versionBuilderGemMode !== 'OVERRIDE_BLOCK' || isPacketLinked}
                                        onChange={(event) => updateVersionBuilderGemRow(item.id, 'shape', event.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Diameter (mm)</label>
                                      <input
                                        type="text"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[12px]"
                                        value={item.size}
                                        disabled={versionBuilderGemMode !== 'OVERRIDE_BLOCK' || isPacketLinked}
                                        onChange={(event) => updateVersionBuilderGemRow(item.id, 'size', event.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Quality</label>
                                      <input
                                        type="text"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[12px]"
                                        value={item.quality}
                                        disabled={versionBuilderGemMode !== 'OVERRIDE_BLOCK' || isPacketLinked}
                                        onChange={(event) => updateVersionBuilderGemRow(item.id, 'quality', event.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Wt / Per Pcs.</label>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[12px]"
                                        value={item.wtPerPcs}
                                        onKeyDown={(event) => handleNumericFieldKeyDown(event, 'decimal')}
                                        onPaste={(event) => handleNumericFieldPaste(event, 'decimal')}
                                        disabled={versionBuilderGemMode !== 'OVERRIDE_BLOCK'}
                                        onChange={(event) => updateVersionBuilderGemRow(item.id, 'wtPerPcs', event.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Pcs</label>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[12px]"
                                        value={item.pcs}
                                        onKeyDown={(event) => handleNumericFieldKeyDown(event, 'integer')}
                                        onPaste={(event) => handleNumericFieldPaste(event, 'integer')}
                                        disabled={versionBuilderGemMode !== 'OVERRIDE_BLOCK'}
                                        onChange={(event) => updateVersionBuilderGemRow(item.id, 'pcs', event.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Wt(In Cts)</label>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[12px]"
                                        value={item.wtInCts}
                                        onKeyDown={(event) => handleNumericFieldKeyDown(event, 'decimal')}
                                        onPaste={(event) => handleNumericFieldPaste(event, 'decimal')}
                                        disabled={versionBuilderGemMode !== 'OVERRIDE_BLOCK'}
                                        onChange={(event) => updateVersionBuilderGemRow(item.id, 'wtInCts', event.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">@(P/C/In USD)</label>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[12px]"
                                        value={item.pricePerCt}
                                        onKeyDown={(event) => handleNumericFieldKeyDown(event, 'decimal')}
                                        onPaste={(event) => handleNumericFieldPaste(event, 'decimal')}
                                        disabled={versionBuilderGemMode !== 'OVERRIDE_BLOCK'}
                                        onChange={(event) => updateVersionBuilderGemRow(item.id, 'pricePerCt', event.target.value)}
                                      />
                                    </div>
                                  </div>
                                </details>
                              </div>
                            </div>
                          );
                        })
                      )}

                      <button
                        type="button"
                        onClick={addVersionBuilderGemRow}
                        disabled={versionBuilderGemMode !== 'OVERRIDE_BLOCK'}
                        className="mt-2 rounded-lg border border-transparent bg-transparent px-1 py-1 text-[15px] font-semibold text-[#1f1914] transition hover:text-[#8f6a2c] disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        + Add stone group
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {versionBuilderWorkflowStep === 'SIZE_CHART' ? (
              <div className="rounded-[26px] border border-[#e4d8c9] bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8f6a2c]">Step 3b - Composition Size Chart</p>
                  <h3 className="mt-1 text-[1.15rem] font-bold text-[#2b241d]">Each group gets its own count column - edit any cell</h3>
                  <p className="mt-1 text-[12px] leading-5 text-slate-500">
                    {versionBuilderSelections.sizes.length
                      ? 'Only the sizes selected in Variant Axes are shown here. Totals and BOM preview recalc live.'
                      : 'Sizes 3.00 to 11.00 at 0.25 increments. Totals and BOM preview recalc live.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e4d8c9] bg-[#fffdfa] p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {versionBuilderSizeChartCoverages.map((coverage) => {
                        const active = versionBuilderChartCoverage === coverage;
                        return (
                          <button
                            key={coverage}
                            type="button"
                            onClick={() => setVersionBuilderChartCoverage(coverage)}
                            className={`rounded-xl border px-4 py-1.5 text-[11px] font-semibold transition ${
                              active ? 'border-[#e0cfaf] bg-white text-[#1f1914] shadow-sm'
                                : 'border-transparent bg-[#f7f0e4] text-[#8c7b67] hover:text-[#5f5245]'
                            }`}
                          >
                            {coverage}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-[#8c7b67]">
                      {versionBuilderGemRows.length} group{versionBuilderGemRows.length === 1 ? '' : 's'} -{' '}
                      {versionBuilderChartCoverage || 'No coverage'} - {versionBuilderSizeChartSizes.length} selected size
                      {versionBuilderSizeChartSizes.length === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {activeVersionBuilderSizeChartGroupSummaries.map(({ row, totalCount, totalCarat, estCost }, index) => {
                      const packet = packetOptions.find((entry) => entry.id === row.packetId);
                      const groupLabel = String.fromCharCode(65 + index);
                      const groupColor = VERSION_BUILDER_GROUP_COLORS[index % VERSION_BUILDER_GROUP_COLORS.length];
                      return (
                        <div key={`chart-summary-${row.id}`} className="rounded-2xl border border-[#e4d8c9] bg-white px-4 py-3.5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: groupColor }}>
                                Group {groupLabel}
                              </p>
                              <p className="mt-2 text-[14px] font-semibold text-[#2b241d]">
                                {row.shape || packet?.shape || 'Stone group'} {row.size || packet?.size ? ` - ${row.size || packet?.size} mm` : ''}
                              </p>
                              <p className="mt-1 text-[11px] text-[#8c7b67]">
                                {row.stone || packet?.stone || 'Diamond'} - {row.quality || packet?.quality || '-'} - {row.color || packet?.color || '-'}
                              </p>
                            </div>
                            {packet?.packetName ? (
                              <span className="rounded-full border border-[#e0d3bf] bg-[#faf5ec] px-3 py-1 text-[10px] font-semibold text-[#9a8b76]">
                                {packet.packetName}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 grid grid-cols-1 gap-4 border-t border-dashed border-[#eadfcf] pt-3 md:grid-cols-3">
                            <div>
                              <p className="text-[20px] font-semibold leading-none text-[#2b241d]">{Math.round(totalCount)}</p>
                              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a8b76]">Stones - {versionBuilderChartCoverage || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[20px] font-semibold leading-none text-[#2b241d]">{totalCarat.toFixed(2)}<span className="ml-1 text-[11px]">ct</span></p>
                              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a8b76]">Total Carat</p>
                            </div>
                            <div>
                              <p className="text-[20px] font-semibold leading-none text-[#2b241d]">${estCost.toFixed(0)}</p>
                              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a8b76]">Est. Stone Cost</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-[#e4d8c9]">
                      <thead>
                        <tr className="bg-[#f8f1e6] text-[#9a8b76]">
                          <th className="border-b border-[#eadfcf] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em]">Size (US)</th>
                          {versionBuilderMetalPurityColumns.map((purity) => (
                            <th
                              key={`metal-head-${purity}`}
                              className="border-b border-[#eadfcf] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em]"
                            >
                              {purity} Weight Editable
                            </th>
                          ))}
                          {versionBuilderGemRows.map((row, index) => {
                            const groupLabel = String.fromCharCode(65 + index);
                            return (
                              <th key={`group-head-${row.id}`} colSpan={2} className="border-b border-[#eadfcf] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#c7983f]">
                                Group {groupLabel} - {(row.shape || 'Stone group').toUpperCase()}
                              </th>
                            );
                          })}
                          <th className="border-b border-[#eadfcf] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em]">Total Stones</th>
                          <th className="border-b border-[#eadfcf] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em]">TCW (S Count x Ct)</th>
                        </tr>
                        <tr className="bg-[#fbf7ef] text-[#9a8b76]">
                          {versionBuilderMetalPurityColumns.map((purity) => (
                            <th key={`metal-sub-${purity}`} className="border-b border-[#eadfcf] px-3 py-2.5"></th>
                          ))}
                          <th className="border-b border-[#eadfcf] px-3 py-2.5"></th>
                          {versionBuilderGemRows.map((row) => (
                            <Fragment key={`group-sub-${row.id}`}>
                              <th className="border-b border-[#eadfcf] px-3 py-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.12em]">Count</th>
                              <th className="border-b border-[#eadfcf] px-3 py-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.12em]">Ct / Stone</th>
                            </Fragment>
                          ))}
                          <th className="border-b border-[#eadfcf] px-3 py-2.5"></th>
                          <th className="border-b border-[#eadfcf] px-3 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {versionBuilderSizeChartSizes.map((sizeKey) => {
                          const rowState = activeVersionBuilderSizeChartRows[sizeKey] || {
                            metalWeights: buildDefaultMetalWeightsForPurities(
                              versionBuilderMetalPurityColumns,
                              versionBuilderBaseMetalWeightMap,
                            ),
                            groups: {},
                          };
                          const totalStones = versionBuilderGemRows.reduce(
                            (sum, row) => sum + Math.max(0, parseNum(rowState.groups[row.id]?.count || '0')),
                            0,
                          );
                          const totalTcw = versionBuilderGemRows.reduce(
                            (sum, row) =>
                              sum +
                              Math.max(0, parseNum(rowState.groups[row.id]?.count || '0')) *
                                Math.max(0, parseNum(rowState.groups[row.id]?.ctPerStone || '0')),
                            0,
                          );
                          const highlightBaseSize =
                            normalizeSizeChartKey(versionBuilderBaseDesign.jewelrySize) === normalizeSizeChartKey(sizeKey);
                          return (
                            <tr key={`chart-row-${sizeKey}`} className={highlightBaseSize ? 'bg-[#fbf7ef]' : 'bg-white'}>
                              <td className="border-b border-[#f0e7da] px-3 py-2 text-[12px] font-semibold text-[#2b241d]">{sizeKey}</td>
                              {versionBuilderMetalPurityColumns.map((purity) => (
                                <td key={`metal-cell-${sizeKey}-${purity}`} className="border-b border-[#f0e7da] px-3 py-2 text-center">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    className="mx-auto w-14 rounded-lg border border-[#ddd2c3] bg-[#fffdfa] px-2 py-1.5 text-center text-[11px] font-semibold text-[#2b241d]"
                                    value={rowState.metalWeights?.[purity] || '0'}
                                    onKeyDown={(event) => handleNumericFieldKeyDown(event, 'decimal')}
                                    onPaste={(event) => handleNumericFieldPaste(event, 'decimal')}
                                    onFocus={handleNumericFieldFocus}
                                    onMouseUp={handleNumericFieldMouseUp}
                                    onChange={(event) =>
                                      updateVersionBuilderSizeChartMetalWeight(
                                        versionBuilderChartCoverage,
                                        sizeKey,
                                        purity,
                                        event.target.value,
                                      )
                                    }
                                  />
                                </td>
                              ))}
                              {versionBuilderGemRows.map((row) => {
                                const cell = rowState.groups[row.id] || { count: '', ctPerStone: '' };
                                return (
                                  <Fragment key={`chart-cell-${sizeKey}-${row.id}`}>
                                    <td className="border-b border-[#f0e7da] px-3 py-2 text-center">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        className="mx-auto w-14 rounded-lg border border-[#ddd2c3] bg-[#fffdfa] px-2 py-1.5 text-center text-[11px] font-semibold text-[#2b241d]"
                                        value={cell.count}
                                        onKeyDown={(event) => handleNumericFieldKeyDown(event, 'integer')}
                                        onPaste={(event) => handleNumericFieldPaste(event, 'integer')}
                                        onFocus={handleNumericFieldFocus}
                                        onMouseUp={handleNumericFieldMouseUp}
                                        onChange={(event) =>
                                          updateVersionBuilderSizeChartCell(
                                            versionBuilderChartCoverage,
                                            sizeKey,
                                            row.id,
                                            'count',
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </td>
                                    <td className="border-b border-[#f0e7da] px-3 py-2 text-center">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        className="mx-auto w-14 rounded-lg border border-[#ddd2c3] bg-[#fffdfa] px-2 py-1.5 text-center text-[11px] font-semibold text-[#2b241d]"
                                        value={cell.ctPerStone}
                                        onKeyDown={(event) => handleNumericFieldKeyDown(event, 'decimal')}
                                        onPaste={(event) => handleNumericFieldPaste(event, 'decimal')}
                                        onFocus={handleNumericFieldFocus}
                                        onMouseUp={handleNumericFieldMouseUp}
                                        onChange={(event) =>
                                          updateVersionBuilderSizeChartCell(
                                            versionBuilderChartCoverage,
                                            sizeKey,
                                            row.id,
                                            'ctPerStone',
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </td>
                                  </Fragment>
                                );
                              })}
                              <td className="border-b border-[#f0e7da] px-3 py-2 text-center text-[12px] font-semibold text-[#2b241d]">{Math.round(totalStones)}</td>
                              <td className="border-b border-[#f0e7da] px-3 py-2 text-center text-[12px] font-semibold text-[#7b6f61]">{totalTcw.toFixed(2)} ct</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            {versionBuilderWorkflowStep === 'LABOR_OVERHEAD' ? (
              <div className="rounded-[26px] border border-[#e4d8c9] bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6a2c]">Step 5 of 7</p>
                    <h3 className="mt-1 text-[1.35rem] font-bold text-[#2b241d]">Labor &amp; Overhead</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Add manual labor rows and overhead rules here. BOM will use these values for every generated variant.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-[#e4d8c9] bg-white shadow-sm ring-1 ring-[#2b241d]/5">
                      <div className="border-b border-[#e4d8c9] bg-[#f8f2e8] px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[#8f6a2c]">Labor Information</div>
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
                            {versionBuilderLaborRows.map((item, idx) => (
                              <tr key={item.id}>
                                <td className="px-2 py-2 text-xs text-gray-600">{idx + 1}.</td>
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-2">
                                    <select
                                      className="w-full min-w-[10.5rem] rounded border border-gray-300 px-2 py-1"
                                      value={item.laborHead}
                                      onChange={(event) => updateVersionBuilderLaborRow(item.id, 'laborHead', event.target.value)}
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
                                        addMasterFromDesign('LABOR_HEAD', (masterValue) =>
                                          updateVersionBuilderLaborRow(item.id, 'laborHead', masterValue),
                                        )
                                      }
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    className="w-full rounded border border-gray-300 px-2 py-1"
                                    value={item.laborPerUnit}
                                    onKeyDown={(event) => handleNumericFieldKeyDown(event, 'decimal')}
                                    onPaste={(event) => handleNumericFieldPaste(event, 'decimal')}
                                    onChange={(event) => updateVersionBuilderLaborRow(item.id, 'laborPerUnit', event.target.value)}
                                    onFocus={handleNumericFieldFocus}
                                    onMouseUp={handleNumericFieldMouseUp}
                                    placeholder="Price Per Quantity"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    className="w-full rounded border border-gray-300 px-2 py-1"
                                    value={item.unitQty}
                                    onKeyDown={(event) => handleNumericFieldKeyDown(event, 'decimal')}
                                    onPaste={(event) => handleNumericFieldPaste(event, 'decimal')}
                                    onChange={(event) => updateVersionBuilderLaborRow(item.id, 'unitQty', event.target.value)}
                                    onFocus={handleNumericFieldFocus}
                                    onMouseUp={handleNumericFieldMouseUp}
                                    placeholder="0"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    className="w-full cursor-not-allowed rounded border border-gray-300 bg-gray-50 px-2 py-1 text-gray-700"
                                    value={getLaborValue(item).toFixed(2)}
                                    readOnly
                                    tabIndex={-1}
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <button
                                    type="button"
                                    className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                                    onClick={() => setVersionBuilderLaborRows((prev) => prev.filter((row) => row.id !== item.id))}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-gray-50 text-xs font-semibold text-gray-700">
                              <td className="px-2 py-2 text-right" colSpan={4}>Total</td>
                              <td className="px-2 py-2">
                                {versionBuilderLaborRows.reduce((sum, row) => sum + getLaborValue(row), 0).toFixed(2)}
                              </td>
                              <td className="px-2 py-2"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-end border-t border-rose-200 bg-white px-3 py-2">
                        <button
                          type="button"
                          className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                          onClick={() =>
                            setVersionBuilderLaborRows((prev) => [
                              ...prev,
                              { id: makeId(), laborHead: '', laborPerUnit: '', unitQty: '', laborValue: '' },
                            ])
                          }
                        >
                          + Add Line
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-[#e4d8c9] bg-white shadow-sm ring-1 ring-[#2b241d]/5">
                      <div className="border-b border-[#e4d8c9] bg-[#f8f2e8] px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[#8f6a2c]">Overhead Information</div>
                      <div className="overflow-x-auto scrollbar-top">
                        <table className="min-w-full text-sm">
                          <thead className="border-b border-gray-200 bg-white text-left text-[11px] font-semibold text-slate-900">
                            <tr>
                              <th className="px-2 py-2">##</th>
                              <th className="px-2 py-2">Overhead</th>
                              <th className="px-2 py-2">Mode</th>
                              <th className="px-2 py-2">Configured</th>
                              <th className="px-2 py-2">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {versionBuilderOverheadRows.length === 0 ? (
                              <tr>
                                <td className="px-3 py-4 text-xs text-slate-500" colSpan={5}>
                                  No overhead added yet.
                                </td>
                              </tr>
                            ) : (
                              versionBuilderOverheadRows.map((item, idx) => {
                                const selectedRule = getVersionBuilderOverheadRuleForRow(item);
                                const modeLabel =
                                  selectedRule?.overheadApplyMode === 'FLAT'
                                    ? 'Flat'
                                    : selectedRule?.overheadApplyMode === 'PERCENT_BOM_SUBTOTAL'
                                      ? '% of BOM'
                                      : selectedRule?.overheadApplyMode === 'PERCENT_MATERIALS'
                                        ? '% of Materials'
                                        : '-';
                                return (
                                  <tr key={item.id}>
                                    <td className="px-2 py-2 text-xs text-gray-600">{idx + 1}.</td>
                                    <td className="px-2 py-2">
                                      <div className="flex items-center gap-2">
                                        <select
                                          className="w-full min-w-[10.5rem] rounded border border-gray-300 px-2 py-1"
                                          value={item.ruleId}
                                          onChange={(event) => {
                                            const selectedRuleOption = versionBuilderCategoryRuleFiltered.overheadRules.find((rule) => rule.id === event.target.value);
                                            setVersionBuilderOverheadRows((prev) =>
                                              prev.map((row) =>
                                                row.id === item.id
                                                  ? {
                                                      ...row,
                                                      ruleId: event.target.value,
                                                      overheadHead: selectedRuleOption?.value || '',
                                                    }
                                                  : row,
                                              ),
                                            );
                                          }}
                                        >
                                          <option value="">Select Overhead</option>
                                          {!versionBuilderCategoryRuleFiltered.overheadRules.some((option) => option.id === item.ruleId) && item.overheadHead ? (
                                            <option value={item.ruleId}>{item.overheadHead}</option>
                                          ) : null}
                                          {versionBuilderCategoryRuleFiltered.overheadRules.map((option) => (
                                            <option key={option.id} value={option.id}>
                                              {option.value}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          type="button"
                                          className={inlineMasterAddButtonClass}
                                          disabled={creatingMasterType === 'OVERHEAD_RULE'}
                                          onClick={() =>
                                            addMasterFromDesign('OVERHEAD_RULE', (masterValue, createdMaster) =>
                                              setVersionBuilderOverheadRows((prev) =>
                                                prev.map((row) =>
                                                  row.id === item.id
                                                    ? {
                                                        ...row,
                                                        ruleId: createdMaster?.id || row.ruleId,
                                                        overheadHead: createdMaster?.value || masterValue,
                                                      }
                                                    : row,
                                                ),
                                              ),
                                            )
                                          }
                                        >
                                          +
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-2 py-2 text-xs font-medium text-slate-600">{modeLabel}</td>
                                    <td className="px-2 py-2 text-xs font-medium text-slate-600">{getOverheadRuleConfiguredDisplay(selectedRule)}</td>
                                    <td className="px-2 py-2">
                                      <button
                                        type="button"
                                        className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                                        onClick={() => setVersionBuilderOverheadRows((prev) => prev.filter((row) => row.id !== item.id))}
                                      >
                                        Remove
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-end border-t border-amber-200 bg-white px-3 py-2">
                        <button
                          type="button"
                          className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                          onClick={() => setVersionBuilderOverheadRows((prev) => [...prev, { id: makeId(), overheadHead: '', ruleId: '' }])}
                        >
                          + Add Line
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {versionBuilderWorkflowStep === 'BOM' ? (
              <div className="rounded-[26px] border border-[#e4d8c9] bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6a2c]">Step 6 of 7</p>
                    <h3 className="mt-1 text-[1.35rem] font-bold text-[#2b241d]">BOM - recomputes from your current config</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Uses the current size chart, metal rates, packet costs, and the labor and overhead rows configured in the previous step.
                    </p>
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f6a2c]">
                    Pick a sample variant - cost is live
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e4d8c9] bg-[#fffdf9] p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f6a2c]">Size</label>
                      <select
                        className="w-full rounded-lg border border-[#ddd2c3] bg-white px-3 py-2 text-sm text-[#2b241d]"
                        value={versionBuilderBomSelection.size}
                        onChange={(event) =>
                          setVersionBuilderBomSelection((prev) => ({ ...prev, size: event.target.value }))
                        }
                      >
                        {versionBuilderSizeChartSizes.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f6a2c]">Metal</label>
                      <select
                        className="w-full rounded-lg border border-[#ddd2c3] bg-white px-3 py-2 text-sm text-[#2b241d]"
                        value={versionBuilderBomSelection.metal}
                        onChange={(event) =>
                          setVersionBuilderBomSelection((prev) => ({ ...prev, metal: event.target.value }))
                        }
                      >
                        {versionBuilderSelections.metals.map((metal) => (
                          <option key={metal} value={metal}>
                            {metal}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f6a2c]">Quality</label>
                      <select
                        className="w-full rounded-lg border border-[#ddd2c3] bg-white px-3 py-2 text-sm text-[#2b241d]"
                        value={versionBuilderBomSelection.diamondQuality}
                        onChange={(event) =>
                          setVersionBuilderBomSelection((prev) => ({ ...prev, diamondQuality: event.target.value }))
                        }
                      >
                        {versionBuilderSelections.diamondQualities.map((quality) => (
                          <option key={quality} value={quality}>
                            {quality}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f6a2c]">Coverage</label>
                      <select
                        className="w-full rounded-lg border border-[#ddd2c3] bg-white px-3 py-2 text-sm text-[#2b241d]"
                        value={versionBuilderBomSelection.coverage}
                        onChange={(event) =>
                          setVersionBuilderBomSelection((prev) => ({ ...prev, coverage: event.target.value }))
                        }
                      >
                        {versionBuilderSizeChartCoverages.map((coverage) => (
                          <option key={coverage} value={coverage}>
                            {coverage}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f6a2c]">Carat Weight</label>
                      <select
                        className="w-full rounded-lg border border-[#ddd2c3] bg-white px-3 py-2 text-sm text-[#2b241d]"
                        value={versionBuilderBomSelection.caratWeight}
                        onChange={(event) =>
                          setVersionBuilderBomSelection((prev) => ({ ...prev, caratWeight: event.target.value }))
                        }
                      >
                        {versionBuilderSelections.caratWeights.map((weight) => (
                          <option key={weight} value={weight}>
                            {weight}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-[#e4d8c9] bg-white">
                  <table className="min-w-full">
                    <thead className="bg-[#f8f1e6]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c7b67]">Line</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c7b67]">Formula</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c7b67]">Source</th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c7b67]">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-[#efe4d6]">
                        <td className="px-4 py-3.5 align-top">
                          <p className="text-[13px] font-semibold text-[#2b241d]">Metal</p>
                          <p className="mt-1 text-[11px] text-[#8c7b67]">net wt + wastage</p>
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-[#7b6f61]">
                          {versionBuilderBomBreakdown.metal.netWeight.toFixed(2)}g + {versionBuilderBomBreakdown.metal.wastagePercent.toFixed(2)}% = {versionBuilderBomBreakdown.metal.totalWeight.toFixed(2)}g - {formatMoney(versionBuilderBomBreakdown.metal.rate)}
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-[#2b241d]">{versionBuilderBomBreakdown.metal.source}</td>
                        <td className="px-4 py-3.5 text-right text-[13px] font-semibold text-[#2b241d]">
                          {formatMoney(versionBuilderBomBreakdown.metal.cost)}
                        </td>
                      </tr>

                      {versionBuilderBomBreakdown.stones.map((stone) => (
                        <tr key={`bom-stone-${stone.id}`} className="border-t border-[#efe4d6]">
                          <td className="px-4 py-3.5 align-top">
                            <p className="text-[13px] font-semibold text-[#b37b1a]">{stone.label}</p>
                            <p className="mt-1 text-[11px] text-[#8c7b67]">{stone.subtitle}</p>
                          </td>
                          <td className="px-4 py-3.5 text-[11px] text-[#7b6f61]">
                            {stone.count} x {stone.totalCarat > 0 && stone.count > 0 ? `${(stone.totalCarat / stone.count).toFixed(3)} ct` : '0 ct'} x {formatMoney(stone.rate)}/ct
                          </td>
                          <td className="px-4 py-3.5 text-[11px] text-[#2b241d]">{stone.source}</td>
                          <td className="px-4 py-3.5 text-right text-[13px] font-semibold text-[#2b241d]">
                            {formatMoney(stone.cost)}
                          </td>
                        </tr>
                      ))}

                      <tr className="border-t border-[#efe4d6]">
                        <td className="px-4 py-3.5 align-top">
                          <p className="text-[13px] font-semibold text-[#2b241d]">Labor</p>
                          <p className="mt-1 text-[11px] text-[#8c7b67]">flat + variable rates</p>
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-[#7b6f61]">{versionBuilderBomBreakdown.labor.formula}</td>
                        <td className="px-4 py-3.5 text-[11px] text-[#2b241d]">{versionBuilderBomBreakdown.labor.source}</td>
                        <td className="px-4 py-3.5 text-right text-[13px] font-semibold text-[#2b241d]">
                          {formatMoney(versionBuilderBomBreakdown.labor.cost)}
                        </td>
                      </tr>

                      <tr className="border-t border-[#efe4d6]">
                        <td className="px-4 py-3.5 align-top">
                          <p className="text-[13px] font-semibold text-[#2b241d]">Overhead</p>
                          <p className="mt-1 text-[11px] text-[#8c7b67]">materials or subtotal based</p>
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-[#7b6f61]">{versionBuilderBomBreakdown.overhead.formula}</td>
                        <td className="px-4 py-3.5 text-[11px] text-[#2b241d]">{versionBuilderBomBreakdown.overhead.source}</td>
                        <td className="px-4 py-3.5 text-right text-[13px] font-semibold text-[#2b241d]">
                          {formatMoney(versionBuilderBomBreakdown.overhead.cost)}
                        </td>
                      </tr>

                      <tr className="bg-[#211a14]">
                        <td className="px-4 py-3 text-[13px] font-semibold text-white">BOM cost - this variant</td>
                        <td colSpan={2}></td>
                        <td className="px-4 py-3 text-right text-[14px] font-bold text-[#f0c979]">
                          {formatMoney(versionBuilderBomBreakdown.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 rounded-2xl border border-[#e0c98f] bg-[#f9f0db] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f6a2c]">SKU</p>
                  <p className="mt-2 text-[16px] font-bold text-[#2b241d]">{versionBuilderBomBreakdown.variantSku || '-'}</p>
                  <p className="mt-1 text-[11px] text-[#7b6f61]">
                    Sample variant: {versionBuilderBomSelection.metal || '-'} - {versionBuilderBomSelection.coverage || '-'} - {versionBuilderBomSelection.diamondQuality || '-'} - Size {versionBuilderBomSelection.size || '-'}
                  </p>
                </div>
              </div>
            ) : null}

            {versionBuilderWorkflowStep === 'PREVIEW' ? (
              <div className="rounded-[26px] border border-[#e4d8c9] bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6a2c]">Step 7 of 7</p>
                    <h3 className="mt-1 text-[1.35rem] font-bold text-[#2b241d]">Generated variants</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Every SKU this style produces. Filter the list and review BOM cost across all generated variants.
                    </p>
                  </div>
                  <span className="text-[12px] font-semibold text-[#8c7b67]">
                    {versionBuilderGeneratedRows.length.toLocaleString('en-US')} SKUs
                  </span>
                </div>

                <div className="rounded-2xl border border-[#e4d8c9] bg-[#fffdf9] p-4">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[140px_180px_minmax(220px,320px)_1fr]">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f6a2c]">Size</label>
                      <select
                        className="w-full rounded-lg border border-[#ddd2c3] bg-white px-3 py-2 text-sm text-[#2b241d]"
                        value={versionBuilderGeneratedFilters.size}
                        onChange={(event) =>
                          setVersionBuilderGeneratedFilters((prev) => ({ ...prev, size: event.target.value }))
                        }
                      >
                        <option value="ALL">All sizes</option>
                        {versionBuilderSelections.sizes.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f6a2c]">Coverage</label>
                      <select
                        className="w-full rounded-lg border border-[#ddd2c3] bg-white px-3 py-2 text-sm text-[#2b241d]"
                        value={versionBuilderGeneratedFilters.coverage}
                        onChange={(event) =>
                          setVersionBuilderGeneratedFilters((prev) => ({ ...prev, coverage: event.target.value }))
                        }
                      >
                        <option value="ALL">All coverages</option>
                        {versionBuilderSizeChartCoverages.map((coverage) => (
                          <option key={coverage} value={coverage}>
                            {coverage}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f6a2c]">Search SKU</label>
                      <input
                        className="w-full rounded-lg border border-[#ddd2c3] bg-white px-3 py-2 text-sm text-[#2b241d]"
                        value={versionBuilderGeneratedFilters.search}
                        onChange={(event) =>
                          setVersionBuilderGeneratedFilters((prev) => ({ ...prev, search: event.target.value }))
                        }
                        placeholder="e.g. 18KW or GHVS"
                      />
                    </div>
                    <div className="flex items-end justify-end">
                      <p className="text-[12px] text-[#8c7b67]">
                        <span className="font-semibold text-[#2b241d]">
                          {versionBuilderFilteredGeneratedRows.length.toLocaleString('en-US')}
                        </span>{' '}
                        matching - {versionBuilderGeneratedRows.length.toLocaleString('en-US')} total in style
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#e4d8c9] bg-[#fff7ea] px-4 py-3 text-[12px] text-[#7b6f61]">
                  Showing {versionBuilderFilteredGeneratedRows.length.toLocaleString('en-US')} of{' '}
                  {versionBuilderGeneratedRows.length.toLocaleString('en-US')} matched rows.
                </div>

                <div className="app-table-scroll scrollbar-top mt-4 rounded-2xl border border-[#e4d8c9] bg-white">
                  <table className="min-w-full">
                    <thead className="bg-[#f8f1e6]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c7b67]">SKU</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c7b67]">Metal</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c7b67]">Quality</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c7b67]">Coverage</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c7b67]">Size</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c7b67]">Composition</th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c7b67]">BOM Cost</th>
                        <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c7b67]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versionBuilderFilteredGeneratedRows.length === 0 ? (
                        <tr>
                          <td className="px-4 py-5 text-sm text-slate-500" colSpan={8}>
                            No generated variants match the current filters.
                          </td>
                        </tr>
                      ) : (
                        versionBuilderFilteredGeneratedRows.map((previewRow) => (
                          <tr key={`${previewRow.designNo}-${previewRow.version}`} className="border-t border-[#efe4d6]">
                            <td className="px-4 py-3 text-[13px] font-semibold text-[#2b241d]">{previewRow.designNo}</td>
                            <td className="px-4 py-3 text-[13px] text-[#2b241d]">{previewRow.metal}</td>
                            <td className="px-4 py-3 text-[13px] text-[#2b241d]">{previewRow.diamondQuality}</td>
                            <td className="px-4 py-3 text-[13px] text-[#2b241d]">{previewRow.coverage}</td>
                            <td className="px-4 py-3 text-[13px] text-[#2b241d]">{previewRow.size}</td>
                            <td className="px-4 py-3 text-[12px] text-[#7b6f61]">{previewRow.composition}</td>
                            <td className="px-4 py-3 text-right text-[13px] font-semibold text-[#2b241d]">
                              {formatMoney(previewRow.bomCost)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {versionBuilderCreateResults[previewRow.designNo]?.status === 'created' ? (
                                <span className="rounded-full border border-[#b9dec1] bg-[#eef9f0] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2f8f67]">
                                  Created
                                </span>
                              ) : versionBuilderCreateResults[previewRow.designNo]?.status === 'failed' ? (
                                <span
                                  className="rounded-full border border-[#f0c5c5] bg-[#fff1f1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#c45858]"
                                  title={versionBuilderCreateResults[previewRow.designNo]?.message || 'Create failed'}
                                >
                                  Failed
                                </span>
                              ) : (
                                <span className="rounded-full border border-[#e4d8c9] bg-[#faf5ec] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8c7b67]">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-2">
              <p className="text-xs text-slate-500">
                Generated variants now reflect the full selected combination set.
                {creatingVersions
                  ? ` Creating ${versionCreateProgress.done}/${versionCreateProgress.total}...`
                  : !versionBuilderCanCreateFromCurrentStep
                    ? ' Reach Generated after BOM to create versions.'
                    : versionBuilderCreateValidation.isValid
                      ? ' Use Create Versions to generate actual design records.'
                      : ` ${versionBuilderCreateValidation.message}`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const previousStep = versionBuilderStepOrder[versionBuilderCurrentStepIndex - 1];
                    if (previousStep) setVersionBuilderWorkflowStep(previousStep);
                  }}
                  disabled={versionBuilderCurrentStepIndex <= 0 || creatingVersions}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const nextStep = versionBuilderStepOrder[versionBuilderCurrentStepIndex + 1];
                    if (nextStep) setVersionBuilderWorkflowStep(nextStep);
                  }}
                  disabled={versionBuilderCurrentStepIndex >= versionBuilderStepOrder.length - 1 || creatingVersions}
                >
                  Next
                </Button>
                <Button type="button" variant="secondary" onClick={closeVersionBuilderModal} disabled={creatingVersions}>
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={createVersionBuilderVariants}
                  disabled={creatingVersions || !versionBuilderCanCreateFromCurrentStep || versionBuilderPendingCreateCount === 0 || !versionBuilderCreateValidation.isValid}
                  title={!versionBuilderCanCreateFromCurrentStep ? 'Reach Generated after BOM to create versions.' : versionBuilderCreateValidation.isValid ? '' : versionBuilderCreateValidation.message}
                >
                  {creatingVersions
                    ? `Creating ${versionCreateProgress.done}/${versionCreateProgress.total}`
                    : `Create Versions (${versionBuilderPendingCreateCount})`}
                </Button>
              </div>

            </div>
          </div>
        </Modal>
      ) : null}

      {showAddModal && (
        <Modal title={editingId ? "EDIT DESIGN" : "ADD NEW DESIGN"} size="max-w-7xl" onClose={() => { setShowGalleryPicker(false); setShowStlViewerModal(false); setShowAddModal(false); setEditingId(null); setEditingDesignIsPrimary(false); }}>
          <div className="space-y-6 [&_label]:text-[11px] [&_label]:font-semibold [&_label]:uppercase [&_label]:tracking-[0.13em] [&_label]:text-[#6f6358] [&_input]:h-10 [&_input]:rounded-lg [&_input]:border-[#d9ccbc] [&_input]:bg-white [&_input]:px-3 [&_input]:text-[13px] [&_input]:leading-5 [&_input]:text-[#2b241d] [&_input]:placeholder:text-[#9a8f83] [&_input]:shadow-none [&_input]:focus:border-[#bf944d] [&_input]:focus:ring-2 [&_input]:focus:ring-[#f0dfc2] [&_select]:h-10 [&_select]:rounded-lg [&_select]:border-[#d9ccbc] [&_select]:bg-white [&_select]:px-3 [&_select]:pr-8 [&_select]:text-[13px] [&_select]:leading-5 [&_select]:text-[#2b241d] [&_select]:shadow-none [&_select]:focus:border-[#bf944d] [&_select]:focus:ring-2 [&_select]:focus:ring-[#f0dfc2] [&_textarea]:rounded-lg [&_textarea]:border-[#d9ccbc] [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-[13px] [&_textarea]:leading-5 [&_textarea]:text-[#2b241d] [&_textarea]:placeholder:text-[#9a8f83] [&_textarea]:shadow-none [&_textarea]:focus:border-[#bf944d] [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-[#f0dfc2] [&_th]:normal-case [&_th]:tracking-normal">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <p className="font-semibold text-red-600">*Required fields</p>
              <p className="font-semibold text-slate-700">Version: {getVersionDisplayValue(form.version || 'V1')}</p>
            </div>
            {mastersLoading && <p className="text-xs text-gray-500">Loading master dropdowns...</p>}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="overflow-hidden rounded-2xl border border-[#e4d8c9] bg-white shadow-sm ring-1 ring-[#2b241d]/5 transition-all hover:shadow-md">
                <div className="border-b border-[#e4d8c9] bg-[#f8f2e8] px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[#8f6a2c] backdrop-blur-sm">General Information</div>
                <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-12">
                  <div className="xl:col-span-6">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Design Name</label>
                    <input
                      className={`w-full rounded border border-gray-300 px-2 py-2 text-sm ${
                        editingId && !editingDesignIsPrimary ? 'bg-slate-50 text-slate-500' : ''
                      }`}
                      value={form.designName}
                      onChange={(event) => {
                        setIsDesignNameManual(true);
                        setForm((prev) => ({ ...prev, designName: event.target.value }));
                      }}
                      readOnly={Boolean(editingId && !editingDesignIsPrimary)}
                      placeholder="Design Name"
                    />
                    {editingId && !editingDesignIsPrimary ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Design name is controlled by the parent design for this version family.
                      </p>
                    ) : null}
                  </div>
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Design No *</label>
                    <input
                      className="w-full rounded border border-gray-300 bg-slate-50 px-2 py-2 text-sm text-slate-700"
                      value={form.designNo}
                      readOnly
                      placeholder="Design No"
                    />
                  </div>
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Version</label>
                    <input
                      className="w-full rounded border border-gray-300 bg-slate-50 px-2 py-2 text-sm text-slate-700"
                      value={getVersionDisplayValue(form.version || 'V1')}
                      readOnly={Boolean(editingId || sourceDesignNo)}
                      onChange={(event) => {
                        const digitsOnly = event.target.value.replace(/[^0-9]/g, '');
                        setForm((prev) => ({ ...prev, version: digitsOnly || '1' }));
                      }}
                      placeholder="1"
                    />
                  </div>

                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Category *</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.jewelryGroup}
                        onChange={(event) => handleJewelryGroupChange(event.target.value)}
                      >
                        <option value="">Select Category</option>
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
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Sub Category</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.collection}
                        onChange={(event) => setForm((prev) => ({ ...prev, collection: event.target.value }))}
                        disabled={!form.jewelryGroup}
                      >
                        <option value="">Select Sub Category</option>
                        {filteredSubCategoryOptions.map((option) => (
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
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Coverage</label>
                    <select
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={form.diamondSpread}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          diamondSpread: event.target.value,
                          coverageCustom: event.target.value === 'Custom' ? prev.coverageCustom : '',
                        }))
                      }
                    >
                      <option value="">Select Coverage</option>
                      {STRUCTURED_COVERAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Dia Quality</label>
                    <select
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={form.diamondQuality}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          diamondQuality: event.target.value,
                          diamondQualityCustom: event.target.value === 'Custom' ? prev.diamondQualityCustom : '',
                        }))
                      }
                    >
                      <option value="">Select Dia Quality</option>
                      {STRUCTURED_DIAMOND_QUALITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.diamondSpread === 'Custom' ? (
                    <div className="xl:col-span-3">
                      <label className="mb-1 block text-sm font-medium text-slate-700">Coverage Custom Code</label>
                      <input
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.coverageCustom}
                        onChange={(event) => setForm((prev) => ({ ...prev, coverageCustom: event.target.value }))}
                        placeholder="C"
                      />
                    </div>
                  ) : null}
                  {form.diamondQuality === 'Custom' ? (
                    <div className="xl:col-span-3">
                      <label className="mb-1 block text-sm font-medium text-slate-700">Dia Quality Custom Code</label>
                      <input
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.diamondQualityCustom}
                        onChange={(event) => setForm((prev) => ({ ...prev, diamondQualityCustom: event.target.value }))}
                        placeholder="C"
                      />
                    </div>
                  ) : null}
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Size</label>
                    <select
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={form.jewelrySize}
                      onChange={(event) => setForm((prev) => ({ ...prev, jewelrySize: event.target.value }))}
                      disabled={!form.jewelryGroup}
                    >
                      <option value="">Select Size</option>
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
                  </div>
                  <div className="xl:col-span-3">
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

                  <div className="xl:col-span-3">
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
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Diamond Wt (Optional)</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.diamondWeight}
                        onChange={(event) => setForm((prev) => ({ ...prev, diamondWeight: event.target.value }))}
                      >
                        <option value="">Select Diamond Wt</option>
                        {masterOptions.diamondWeights.map((option) => (
                          <option key={option.id} value={option.value}>
                            {option.value}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={inlineMasterAddButtonClass}
                        disabled={creatingMasterType === 'DIAMOND_WEIGHT'}
                        onClick={() => addMasterFromDesign('DIAMOND_WEIGHT')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="xl:col-span-4">
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
                  <div className="xl:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Drawer Location</label>
                    <input
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={form.drawerLocation}
                      onChange={(event) => setForm((prev) => ({ ...prev, drawerLocation: event.target.value }))}
                      placeholder="Drawer Location"
                    />
                  </div>
                  <div className="xl:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Other Wt</label>
                    <input
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={form.otherWeight}
                      onChange={(event) => setForm((prev) => ({ ...prev, otherWeight: event.target.value }))}
                      placeholder="Other Wt"
                    />
                  </div>

                  <div className="xl:col-span-4">
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
                  <div className="xl:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Vendor Name</label>
                    <div className="flex gap-2">
                      <select
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
                      >
                        <option value="">Select Vendor Name</option>
                        {masterOptions.vendorNames.map((option) => (
                          <option key={option.id} value={option.value}>
                            {option.value}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={inlineMasterAddButtonClass}
                        disabled={creatingMasterType === 'VENDOR_NAME'}
                        onClick={() => addMasterFromDesign('VENDOR_NAME')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="xl:col-span-4">
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

                  <div className="xl:col-span-4">
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
                    <div className="mt-2 flex min-h-10 flex-wrap gap-1 rounded border border-dashed border-slate-200 bg-slate-50/70 px-2 py-2">
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
                  <div className="xl:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Design Description</label>
                    <textarea
                      className="h-24 w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={form.designDescription}
                      onChange={(event) => setForm((prev) => ({ ...prev, designDescription: event.target.value }))}
                      placeholder="Design Description"
                    />
                  </div>
                  <div className="xl:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
                    <textarea
                      className="h-24 w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={form.remarks}
                      onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))}
                      placeholder="Design Remarks"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-fit rounded-xl border border-[#e4d8c9] bg-white shadow-sm">
                <div className="border-b border-[#e4d8c9] bg-[#f8f2e8] px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[#8f6a2c] backdrop-blur-sm">Media Gallery</div>
                <div className="space-y-3 p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-[#171311] bg-[#171311] px-3 py-2 text-xs font-semibold text-white hover:bg-[#241d19]"
                      onClick={() => setShowGalleryPicker(true)}
                    >
                      Choose From Gallery
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-[#d8c5a4] bg-[#f7f2e9] px-3 py-2 text-xs font-semibold text-[#8f6a2c] hover:bg-[#f2e8d6] disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => galleryUploadInputRef.current?.click()}
                      disabled={galleryUploading}
                    >
                      {galleryUploading ? 'Uploading...' : 'Add Media'}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-[#d8c5a4] bg-[#f7f2e9] px-3 py-2 text-xs font-semibold text-[#8f6a2c] hover:bg-[#f2e8d6] disabled:cursor-not-allowed disabled:opacity-60"
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
                  <div className="rounded-lg border border-[#dfd0ba] bg-[#f9f3ea] px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a2c]">STL File</p>
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
                                ^
                              </button>
                              <button
                                type="button"
                                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                                onClick={() => moveGalleryItem(index, 1)}
                                disabled={index === galleryItems.length - 1}
                              >
                                v
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
                  <div className="rounded-lg border border-[#e4d8c9] bg-[#fbf8f3] px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                      iJewel 3D Embed
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Paste the iJewel embed URL (the iframe src) to show the 3D viewer in design details.
                    </p>
                    <div className="mt-3">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Embed URL</label>
                      <input
                        className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                        value={form.ijewelModelId}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, ijewelModelId: event.target.value }))
                        }
                        placeholder="https://ijewel.design/embedded-slug=..."
                      />
                    </div>
                    {form.ijewelModelId.trim() ? (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="text-xs text-slate-600">Preview link ready.</span>
                        <a
                          href={buildIjewelEmbedUrl(form.ijewelModelId, form.ijewelBaseName) || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Open iJewel Viewer
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
                </div>
                <div className="h-fit rounded-xl border border-[#e4d8c9] bg-gradient-to-b from-white to-[#f8f5f0] p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between border-b border-[#e4d8c9] pb-2">
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
                    <div className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5">
                      <span>Overhead Value</span>
                      <span className="font-semibold text-slate-900">{costTotals.overhead.toFixed(2)}</span>
                    </div>
                    {FINDING_FEATURE_ENABLED ? (
                      <div className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5">
                        <span>Finding Value</span>
                        <span className="font-semibold text-slate-900">{costTotals.finding.toFixed(2)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 rounded-lg border border-[#d8c5a4] bg-[#f8f2e8] px-3 py-2">
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
                <div className="overflow-hidden rounded-2xl border border-[#e4d8c9] bg-white shadow-sm ring-1 ring-[#2b241d]/5 transition-all hover:shadow-md overflow-hidden">
                  <div className="border-b border-[#e4d8c9] bg-[#f8f2e8] px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[#8f6a2c] backdrop-blur-sm">Metal Information</div>
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
                                  className="w-full min-w-[10.5rem] rounded border border-gray-300 px-2 py-1"
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
                                    <option value={item.goldColour}>
                                      {getMetalCaratageDisplay(
                                        item.goldColour,
                                        masterOptions.metalCaratages.length > 0 ? masterOptions.metalCaratages : masterOptions.goldColours,
                                      ) || item.goldColour}
                                    </option>
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
                                        {option.aliasName || option.value}
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
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-28 rounded border border-gray-300 px-2 py-1" value={item.netWt} onChange={(event) => updateMetalRow(item.id, 'netWt', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="Net Wt" /></td>
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-24 rounded border border-gray-300 px-2 py-1" value={item.wastagePercent} onChange={(event) => updateMetalRow(item.id, 'wastagePercent', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="Wastage %" /></td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-28 rounded border border-gray-300 px-2 py-1 text-gray-900"
                                value={item.wastageWt}
                                onFocus={handleNumericFieldFocus}
                                onMouseUp={handleNumericFieldMouseUp}
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
                                <input type="text" inputMode="decimal" className="w-28 rounded border border-gray-300 px-2 py-1" value={item.pricePerGm} onChange={(event) => updateMetalRow(item.id, 'pricePerGm', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="Price" />
                                <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">USD</span>
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-28 rounded border border-gray-300 px-2 py-1 font-semibold text-slate-900"
                                value={item.value}
                                onFocus={handleNumericFieldFocus}
                                onMouseUp={handleNumericFieldMouseUp}
                                onChange={(event) => updateMetalRow(item.id, 'value', event.target.value)}
                                placeholder={getMetalValue(item).toFixed(2)}
                              />
                            </td>
                            <td className="px-2 py-2"><button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40" onClick={() => setMetalRows((prev) => prev.filter((row) => row.id !== item.id))}>Remove</button></td>
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
                      className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      onClick={addMetalLine}
                    >
                      + Add Line
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e4d8c9] shadow-sm overflow-visible">
                  <div className="flex items-center justify-between border-b border-[#e4d8c9] bg-[#f8f2e8] px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[#8f6a2c] backdrop-blur-sm">
                    <span>Gemstone Information</span>
                    {packetLoading ? <span className="text-xs font-medium text-cyan-700">Loading packets...</span> : null}
                  </div>
                  <div className="overflow-x-auto overflow-y-visible scrollbar-top">
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
                                <SearchableSelect
                                  className="w-52"
                                  value={item.packetId}
                                  onChange={(value) => applyPacketToGemRow(item.id, value)}
                                  options={buildPacketSearchOptions(item.id)}
                                  placeholder="Select Packet"
                                />
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
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-20 rounded border border-gray-300 px-2 py-1" value={item.wtPerPcs} onChange={(event) => updateGemRow(item.id, 'wtPerPcs', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0.000" /></td>
                            <td className="px-2 py-2"><input type="text" inputMode="numeric" className="w-16 rounded border border-gray-300 px-2 py-1" value={item.pcs} onChange={(event) => updateGemRow(item.id, 'pcs', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="Pcs" /></td>
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-20 rounded border border-gray-300 px-2 py-1" value={item.wtInCts} onChange={(event) => updateGemRow(item.id, 'wtInCts', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0.000" /></td>
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-20 rounded border border-gray-300 px-2 py-1" value={item.pricePerCt} onChange={(event) => updateGemRow(item.id, 'pricePerCt', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0.00" /></td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-20 rounded border border-gray-300 px-2 py-1"
                                value={item.amount}
                                onFocus={handleNumericFieldFocus}
                                onMouseUp={handleNumericFieldMouseUp}
                                onChange={(event) => updateGemRow(item.id, 'amount', event.target.value)}
                                placeholder={getGemValue(item).toFixed(2)}
                              />
                            </td>
                            <td className="px-2 py-2"><button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40" onClick={() => setGemRows((prev) => prev.filter((row) => row.id !== item.id))}>Remove</button></td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 text-xs font-semibold text-gray-700">
                          <td className="px-2 py-2 text-right" colSpan={4}>Total</td>
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
                    <button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" onClick={() => setGemRows((prev) => [...prev, { id: makeId(), packetId: '', stone: '', shape: '', size: '', cut: '', color: '', quality: '', settingType: '', wtPerPcs: '', pcs: '', wtInCts: '', pricePerCt: '', amount: '' }])}>+ Add Line</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-[#e4d8c9] bg-white shadow-sm ring-1 ring-[#2b241d]/5 transition-all hover:shadow-md">
                  <div className="border-b border-[#e4d8c9] bg-[#f8f2e8] px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[#8f6a2c] backdrop-blur-sm">Labor Information</div>
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
                                  className="w-full min-w-[10.5rem] rounded border border-gray-300 px-2 py-1"
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
                            <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.laborPerUnit} onChange={(event) => updateLaborRow(item.id, 'laborPerUnit', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="Price Per Quantity" /></td>
                            <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.unitQty} onChange={(event) => updateLaborRow(item.id, 'unitQty', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0" /></td>
                            <td className="px-2 py-2">
                              <input
                                className="w-full cursor-not-allowed rounded border border-gray-300 bg-gray-50 px-2 py-1 text-gray-700"
                                value={getLaborValue(item).toFixed(2)}
                                readOnly
                                tabIndex={-1}
                              />
                            </td>
                            <td className="px-2 py-2"><button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40" onClick={() => setLaborRows((prev) => prev.filter((row) => row.id !== item.id))}>Remove</button></td>
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
                    <button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" onClick={() => setLaborRows((prev) => [...prev, { id: makeId(), laborHead: '', laborPerUnit: '', unitQty: '', laborValue: '' }])}>+ Add Line</button>
                  </div>
                </div>

                {FINDING_FEATURE_ENABLED ? (
                  <div className="overflow-hidden rounded-2xl border border-indigo-200/60 bg-white shadow-sm ring-1 ring-indigo-900/5 transition-all hover:shadow-md">
                    <div className="border-b border-indigo-200/60 bg-indigo-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-indigo-800 backdrop-blur-sm">Finding Information</div>
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
                                    className="w-full min-w-[10.5rem] rounded border border-gray-300 px-2 py-1"
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
                              <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.pricePerUnit} onChange={(event) => updateFindingRow(item.id, 'pricePerUnit', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0.00" /></td>
                              <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.units} onChange={(event) => updateFindingRow(item.id, 'units', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0" /></td>
                              <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.totalWeight} onChange={(event) => updateFindingRow(item.id, 'totalWeight', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0.000" /></td>
                              <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.findingValue} onChange={(event) => updateFindingRow(item.id, 'findingValue', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0.00" /></td>
                              <td className="px-2 py-2"><button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40" onClick={() => setFindingRows((prev) => prev.filter((row) => row.id !== item.id))}>Remove</button></td>
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
                      <button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" onClick={() => setFindingRows((prev) => [...prev, { id: makeId(), findingHead: masterOptions.findingHeads[0]?.value || '', pricePerUnit: '', units: '', totalWeight: '', findingValue: '' }])}>+ Add Line</button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-[#e4d8c9] bg-white shadow-sm ring-1 ring-[#2b241d]/5 transition-all hover:shadow-md">
                  <div className="border-b border-[#e4d8c9] bg-[#f8f2e8] px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[#8f6a2c] backdrop-blur-sm">Overhead Information</div>
                  <div className="overflow-x-auto scrollbar-top">
                    <table className="min-w-full text-sm">
                      <thead className="border-b border-gray-200 bg-white text-left text-[11px] font-semibold text-slate-900">
                        <tr>
                          <th className="px-2 py-2">##</th>
                          <th className="px-2 py-2">Overhead</th>
                          <th className="px-2 py-2">Mode</th>
                          <th className="px-2 py-2">Configured</th>
                          <th className="px-2 py-2">Overhead Value</th>
                          <th className="px-2 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {overheadRows.length === 0 ? (
                          <tr>
                            <td className="px-3 py-4 text-xs text-slate-500" colSpan={6}>
                              No overhead added yet.
                            </td>
                          </tr>
                        ) : (
                          overheadRows.map((item, idx) => {
                            const selectedRule = getOverheadRuleForRow(item);
                            const modeLabel =
                              selectedRule?.overheadApplyMode === 'FLAT'
                                ? 'Flat'
                                : selectedRule?.overheadApplyMode === 'PERCENT_BOM_SUBTOTAL'
                                  ? '% of BOM'
                                  : selectedRule?.overheadApplyMode === 'PERCENT_MATERIALS'
                                    ? '% of Materials'
                                    : '-';
                            return (
                              <tr key={item.id}>
                                <td className="px-2 py-2 text-xs text-gray-600">{idx + 1}.</td>
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-2">
                                    <select
                                      className="w-full min-w-[10.5rem] rounded border border-gray-300 px-2 py-1"
                                      value={item.ruleId}
                                      onChange={(event) => {
                                        const selectedRuleOption = singleDesignOverheadRules.find((rule) => rule.id === event.target.value);
                                        setOverheadRows((prev) =>
                                          prev.map((row) =>
                                            row.id === item.id
                                              ? {
                                                  ...row,
                                                  ruleId: event.target.value,
                                                  overheadHead: selectedRuleOption?.value || '',
                                                }
                                              : row,
                                          ),
                                        );
                                      }}
                                    >
                                      <option value="">Select Overhead</option>
                                      {!singleDesignOverheadRules.some((option) => option.id === item.ruleId) && item.overheadHead ? (
                                        <option value={item.ruleId}>{item.overheadHead}</option>
                                      ) : null}
                                      {singleDesignOverheadRules.map((option) => (
                                        <option key={option.id} value={option.id}>
                                          {option.value}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      className={inlineMasterAddButtonClass}
                                      disabled={creatingMasterType === 'OVERHEAD_RULE'}
                                      onClick={() =>
                                        addMasterFromDesign('OVERHEAD_RULE', (masterValue, createdMaster) =>
                                          setOverheadRows((prev) =>
                                            prev.map((row) =>
                                              row.id === item.id
                                                ? {
                                                    ...row,
                                                    ruleId: createdMaster?.id || row.ruleId,
                                                    overheadHead: createdMaster?.value || masterValue,
                                                  }
                                                : row,
                                            ),
                                          ),
                                        )
                                      }
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-xs font-medium text-slate-600">{modeLabel}</td>
                                <td className="px-2 py-2 text-xs font-medium text-slate-600">{getOverheadRuleConfiguredDisplay(selectedRule)}</td>
                                <td className="px-2 py-2">
                                  <input
                                    className="w-full cursor-not-allowed rounded border border-gray-300 bg-gray-50 px-2 py-1 text-gray-700"
                                    value={getOverheadRowValue(item).toFixed(2)}
                                    readOnly
                                    tabIndex={-1}
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <button
                                    type="button"
                                    className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                                    onClick={() => setOverheadRows((prev) => prev.filter((row) => row.id !== item.id))}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                        <tr className="bg-gray-50 text-xs font-semibold text-gray-700">
                          <td className="px-2 py-2 text-right" colSpan={3}>Total</td>
                          <td className="px-2 py-2">{costTotals.overhead.toFixed(2)}</td>
                          <td className="px-2 py-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end border-t border-amber-200 bg-white px-3 py-2">
                    <button
                      type="button"
                      className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      onClick={() => setOverheadRows((prev) => [...prev, { id: makeId(), overheadHead: '', ruleId: '' }])}
                    >
                      + Add Line
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 -mx-5 mt-2 flex justify-end gap-2 border-t border-[#dfd0be] bg-[#f7f2e9]/95 px-5 pb-1 pt-3 shadow-[0_-8px_16px_rgba(36,29,25,0.08)] sm:-mx-6 sm:px-6">
              <Button type="button" onClick={() => saveDesign()} disabled={savingDesign}>
                {savingDesign ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => { setShowGalleryPicker(false); setShowAddModal(false); setEditingId(null); setEditingDesignIsPrimary(false); }}>Close</Button>
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
        <Modal title={`ADD NEW ${masterTypeLabelMap[inlineMasterType].toUpperCase()}`} onClose={closeInlineMasterModal} size="max-w-3xl" zIndexClass="z-[130]">
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

            {inlineMasterType === 'JEWELRY_SIZE' || inlineMasterType === 'COLLECTION' ? (
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
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category*</label>
                  <select
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineJewelryGroupId}
                    onChange={(event) => setInlineJewelryGroupId(event.target.value)}
                    required
                  >
                    <option value="">Select Category</option>
                    {masterOptions.jewelryGroups.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.value}
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

            {inlineMasterType !== 'FINDING_HEAD' &&
            inlineMasterType !== 'METAL_CARATAGE' &&
            inlineMasterType !== 'JEWELRY_SIZE' &&
            inlineMasterType !== 'COLLECTION' ? (
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
                      onFocus={handleNumericFieldFocus}
                      onMouseUp={handleNumericFieldMouseUp}
                      onChange={(event) => setInlineDefaultWastagePercent(sanitizeNumericTextInput(event.target.value, 'decimal'))}
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
                      onFocus={handleNumericFieldFocus}
                      onMouseUp={handleNumericFieldMouseUp}
                      onChange={(event) => setInlinePricePerUnit(sanitizeNumericTextInput(event.target.value, 'decimal'))}
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
                      onChange={(event) => setInlinePricePerUnit(sanitizeNumericTextInput(event.target.value, 'decimal'))}
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

            {inlineMasterType === 'OVERHEAD_RULE' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category*</label>
                  <select
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineJewelryGroupId}
                    onChange={(event) => setInlineJewelryGroupId(event.target.value)}
                    required
                  >
                    <option value="">Select Category</option>
                    {masterOptions.jewelryGroups.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Apply Mode*</label>
                  <select
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={inlineOverheadApplyMode}
                    onChange={(event) =>
                      setInlineOverheadApplyMode(event.target.value as 'PERCENT_MATERIALS' | 'PERCENT_BOM_SUBTOTAL' | 'FLAT')
                    }
                    required
                  >
                    <option value="PERCENT_MATERIALS">% of Materials</option>
                    <option value="PERCENT_BOM_SUBTOTAL">% of BOM</option>
                    <option value="FLAT">Flat</option>
                  </select>
                </div>
                {inlineOverheadApplyMode === 'FLAT' ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Flat Amount*</label>
                    <div className="flex">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-l border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={inlineFlatAmount}
                        onFocus={handleNumericFieldFocus}
                        onMouseUp={handleNumericFieldMouseUp}
                        onChange={(event) => setInlineFlatAmount(sanitizeNumericTextInput(event.target.value, 'decimal'))}
                        placeholder="0.00"
                        required
                      />
                      <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-600">USD</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Rate %*</label>
                    <div className="flex">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-l border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={inlineRatePercent}
                        onFocus={handleNumericFieldFocus}
                        onMouseUp={handleNumericFieldMouseUp}
                        onChange={(event) => setInlineRatePercent(sanitizeNumericTextInput(event.target.value, 'decimal'))}
                        placeholder="0.00"
                        required
                      />
                      <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-600">%</span>
                    </div>
                  </div>
                )}
                <div className="md:col-span-2">
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
            inlineMasterType !== 'JEWELRY_SIZE' &&
            inlineMasterType !== 'OVERHEAD_RULE' ? (
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
                      onChange={(event) => setInlinePricePerUnit(sanitizeNumericTextInput(event.target.value, 'decimal'))}
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
        <Modal title="ADD PACKET" onClose={() => { setShowPacketMasterModal(false); setPacketForm(defaultPacketForm); setPacketNameManuallyEdited(false); }} size="max-w-6xl" zIndexClass="z-[130]">
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
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Barcode</label>
                  <input
                    className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                    value={packetForm.barcode}
                    onChange={(event) => updatePacketFormField('barcode', event.target.value.replace(/\D/g, ''))}
                    placeholder="Auto generated if blank"
                    inputMode="numeric"
                  />
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
                <div className="border-b border-gray-200/60 bg-gray-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-gray-800 backdrop-blur-sm">Design Information</div>
                <table className="min-w-full text-sm">
                  <tbody>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Design No</td><td className="px-3 py-2">{detailInfo.designNo}</td><td className="px-3 py-2 font-medium">Version</td><td className="px-3 py-2">{detailInfo.version || 'V1'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Design Name</td><td className="px-3 py-2">{detailInfo.designName || '-'}</td><td className="px-3 py-2 font-medium">Stage</td><td className="px-3 py-2">{detailInfo.stage || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Category</td><td className="px-3 py-2">{detailInfo.jewelryGroup || '-'}</td><td className="px-3 py-2 font-medium">Sub Category</td><td className="px-3 py-2">{detailInfo.collection || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Jewelry Size</td><td className="px-3 py-2">{detailInfo.jewelrySize || '-'}</td><td className="px-3 py-2 font-medium">Design Status</td><td className="px-3 py-2">{detailInfo.designStatus || detailInfo.status || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Diamond Type</td><td className="px-3 py-2">{detailInfo.diamondType || '-'}</td><td className="px-3 py-2 font-medium">Diamond Spread</td><td className="px-3 py-2">{detailInfo.diamondSpread || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Diamond Wt</td><td className="px-3 py-2">{detailInfo.diamondWeight || '-'}</td><td className="px-3 py-2 font-medium">Diamond Quality</td><td className="px-3 py-2">{detailInfo.diamondQuality || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Drawer Location</td><td className="px-3 py-2">{detailInfo.drawerLocation || '-'}</td><td className="px-3 py-2 font-medium">Other Wt</td><td className="px-3 py-2">{detailInfo.otherWeight || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Tags</td><td className="px-3 py-2">{normalizeStringArray(detailInfo.tags).join(', ') || '-'}</td><td className="px-3 py-2 font-medium">Description</td><td className="px-3 py-2">{detailInfo.designDescription || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Total Value</td><td className="px-3 py-2">{formatMoney(detailSummary.totalValue || parseNumericValue(detailInfo.price))}</td><td className="px-3 py-2 font-medium">Remarks</td><td className="px-3 py-2">{detailInfo.remarks || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Created</td><td className="px-3 py-2">{formatDetailDateTime(detailInfo.createdAt)}</td><td className="px-3 py-2 font-medium">Modified</td><td className="px-3 py-2">{formatDetailDateTime(detailInfo.updatedAt || detailInfo.modifiedAt)}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Last Updated By</td><td className="px-3 py-2" colSpan={3}>{detailInfo.updatedByName || '-'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="space-y-4">
                <div className="rounded border border-gray-200">
                  <div className="border-b border-gray-200/60 bg-gray-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-gray-800 backdrop-blur-sm">Gallery Media</div>
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
                  <div className="flex items-center justify-between border-b border-gray-200/60 bg-gray-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-gray-800 backdrop-blur-sm">
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
                <div className="rounded border border-gray-200">
                  <div className="flex items-center justify-between border-b border-gray-200/60 bg-gray-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-gray-800 backdrop-blur-sm">
                    <span className="text-sm font-semibold text-gray-800">iJewel 3D Model</span>
                    {ijewelPreviewUrl ? (
                      <a
                        href={ijewelPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#81A6C6] hover:text-[#6f93b0]"
                      >
                        Open Viewer
                      </a>
                    ) : null}
                  </div>
                  <div className="space-y-3 p-3">
                    {ijewelPreviewUrl ? (
                      <>
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <iframe
                            title={`iJewel ${detailInfo.designNo}`}
                            src={ijewelPreviewUrl}
                            className="w-full"
                            frameBorder={0}
                            allowFullScreen
                            allow="autoplay; fullscreen; xr-spatial-tracking; web-share"
                            ref={ijewelIframeRef}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            Embed URL: {detailInfo.ijewelModelId}
                          </p>
                            <p className="text-xs text-slate-500">
                              Embedded iJewel viewer for this design.
                            </p>
                          </div>
                          <a
                            href={ijewelPreviewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-[#D2C4B4] bg-[#F3E3D0] px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-[#e9d8c4]"
                          >
                            Open in New Tab
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-36 flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 px-4 text-center">
                        <p className="text-sm font-semibold text-slate-700">No iJewel model linked</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Add the iJewel model ID in the design gallery section to embed the viewer.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className={`grid grid-cols-1 gap-3 ${FINDING_FEATURE_ENABLED ? 'md:grid-cols-6' : 'md:grid-cols-5'}`}>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Metal Value</p><p className="font-semibold">{detailSummary.metalValue.toFixed(2)}</p></div>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Gem Value</p><p className="font-semibold">{detailSummary.gemValue.toFixed(2)}</p></div>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Labor Value</p><p className="font-semibold">{detailSummary.laborValue.toFixed(2)}</p></div>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Overhead Value</p><p className="font-semibold">{detailSummary.overheadValue.toFixed(2)}</p></div>
              {FINDING_FEATURE_ENABLED ? (
                <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Finding Value</p><p className="font-semibold">{detailSummary.findingValue.toFixed(2)}</p></div>
              ) : null}
              <div className="rounded border border-green-200 bg-green-50 p-2 text-sm"><p className="text-xs text-gray-600">Total Value</p><p className="font-semibold">{detailSummary.totalValue.toFixed(2)}</p></div>
            </div>
            <div className="rounded border border-slate-200">
              <div className="border-b border-slate-200/60 bg-slate-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-slate-800 backdrop-blur-sm">Metal Information</div>
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
                          <td className="px-3 py-2">
                            {getMetalCaratageDisplay(
                              String(metal.metalCaratage || metal.goldColour || ''),
                              masterOptions.metalCaratages,
                            ) || metal.metalCaratage || metal.goldColour || '-'}
                          </td>
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
              <div className="border-b border-slate-200/60 bg-slate-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-slate-800 backdrop-blur-sm">Gemstone Information</div>
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
              <div className="border-b border-slate-200/60 bg-slate-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-slate-800 backdrop-blur-sm">Labor Information</div>
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
            <div className="rounded border border-slate-200">
              <div className="border-b border-slate-200/60 bg-slate-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-slate-800 backdrop-blur-sm">Overhead Information</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-200 bg-white text-left text-xs font-semibold text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Overhead</th>
                      <th className="px-3 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {detailOverheadRows.length === 0 ? (
                      <tr><td className="px-3 py-3 text-sm text-slate-500" colSpan={2}>No overhead details available.</td></tr>
                    ) : (
                      detailOverheadRows.map((overhead: any) => (
                        <tr key={overhead.id || `${overhead.laborHead}-${overhead.sortOrder}`}>
                          <td className="px-3 py-2">{String(overhead.laborHead || '-').replace(/^Overhead\s*-\s*/i, '') || '-'}</td>
                          <td className="px-3 py-2">{parseNumericValue(overhead.laborValue).toFixed(2)}</td>
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
                      <td className="px-3 py-2"><button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40" onClick={() => setProcessRows((prev) => prev.filter((row) => row.id !== item.id))}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between"><button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" onClick={() => setProcessRows((prev) => [...prev, { id: makeId(), stage: '', netWeight: '', duration: '', remarks: '' }])}>+ Add Line</button><Button type="button" onClick={() => setModal(null)}>Save</Button></div>
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
                      <td className="px-3 py-2"><button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40" onClick={() => setPricingRows((prev) => prev.filter((row) => row.id !== item.id))}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between"><button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" onClick={() => setPricingRows((prev) => [...prev, { id: makeId(), title: '', qty: '', rate: '' }])}>+ Add Line</button><Button type="button" onClick={() => setModal(null)}>Save</Button></div>
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
                      <td className="px-3 py-2"><button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40" onClick={() => setVendorRows((prev) => prev.filter((row) => row.id !== item.id))}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between"><button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" onClick={() => setVendorRows((prev) => [...prev, { id: makeId(), supplier: '', stockType: 'Production', supplierStyleNo: '' }])}>+ Add New Line</button><Button type="button" onClick={() => setModal(null)}>Save</Button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}



