import { ReactNode } from 'react';
import ProductsModal from './ProductsModal';

export interface VersionBuilderSelections {
  metals: string[];
  coverages: string[];
  diamondQualities: string[];
  caratWeights: string[];
  sizes: string[];
}

export interface VersionBuilderOptionGroup {
  id: keyof VersionBuilderSelections;
  label: string;
  helper: string;
  values: string[];
}

export type VersionBuilderImageMode = 'INHERIT_PARENT' | 'MAP_BY_METAL' | 'MANUAL_AFTER_CREATE';
export type VersionBuilderGemMode = 'INHERIT_BASE' | 'OVERRIDE_BLOCK';
export type VersionBuilderGemApplyScope = 'ALL_COMBINATIONS' | 'FILTERED_COMBINATIONS';
export type VersionBuilderWorkflowStep =
  | 'INFO'
  | 'DIMENSIONS'
  | 'GEMSTONES'
  | 'SIZE_CHART'
  | 'IMAGES'
  | 'LABOR_OVERHEAD'
  | 'BOM'
  | 'PREVIEW';

export interface VersionBuilderBomSelection {
  size: string;
  metal: string;
  diamondQuality: string;
  coverage: string;
  caratWeight: string;
}

export interface VersionBuilderGeneratedFilterState {
  size: string;
  coverage: string;
  search: string;
}

export interface VersionBuilderGeneratedRow {
  resultKey: string;
  designNo: string;
  version: string;
  metal: string;
  coverage: string;
  diamondQuality: string;
  caratWeight: string;
  size: string;
  metalPurity: string;
  metalWeight: string;
  stoneSummary: string;
  imageInfo: string;
  gemstoneInfo: string;
  composition: string;
  bomCost: number;
}

export interface VersionBuilderCreateResult {
  status: 'created' | 'failed' | 'skipped';
  message?: string;
}

export interface VersionBuilderUploadedMediaItem {
  previewUrl: string;
  file: File;
}

export interface VersionBuilderSizeChartGroupCell {
  count: string;
  ctPerStone: string;
}

export interface VersionBuilderSizeChartRowState {
  metalWeights: Record<string, string>;
  groups: Record<string, VersionBuilderSizeChartGroupCell>;
}

export type VersionBuilderSizeChartState = Record<string, Record<string, VersionBuilderSizeChartRowState>>;

export interface VersionBuilderMetalRow {
  id: string;
  metalCaratage: string;
  netWt: string;
  wastagePercent: string;
  wastageWt: string;
  totalWt: string;
  pricePerGm: string;
  value: string;
}

export interface VersionBuilderGemRow {
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

const numberFromText = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const lookupKey = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const sizeNumber = (value: string | null | undefined): number | null => {
  const match = String(value ?? '').trim().match(/\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

export const calculateVersionBuilderGemRowForSize = (
  row: VersionBuilderGemRow,
  mode: 'varies' | 'fixed',
  baseSize: string,
  targetSize: string,
): { pcs: number; wtPerPcs: number; wtInCts: number } => {
  const basePcs = Math.max(0, Math.round(numberFromText(row.pcs)));
  const baseWtPerPcs = Math.max(0, numberFromText(row.wtPerPcs));
  const explicitWtInCts = Math.max(0, numberFromText(row.wtInCts));
  const baseSizeValue = sizeNumber(baseSize);
  const targetSizeValue = sizeNumber(targetSize);
  let pcs = basePcs;

  if (mode === 'varies' && basePcs > 0 && baseSizeValue != null && targetSizeValue != null && baseSizeValue > 0) {
    pcs = Math.max(1, Math.round(basePcs * (targetSizeValue / baseSizeValue)));
  }

  const wtInCts = baseWtPerPcs > 0 && pcs > 0
    ? baseWtPerPcs * pcs
    : explicitWtInCts > 0
      ? mode === 'varies' && basePcs > 0 && pcs > 0 ? explicitWtInCts * (pcs / basePcs) : explicitWtInCts
      : 0;
  return { pcs, wtPerPcs: baseWtPerPcs, wtInCts };
};

export const buildVersionBuilderSizeChartSizes = (): string[] => {
  const sizes: string[] = [];
  for (let size = 3; size <= 11.0001; size += 0.25) sizes.push(size.toFixed(2));
  return sizes;
};

export const getMetalPurityBucket = (value: string | null | undefined): string => {
  const raw = String(value ?? '').trim();
  const normalized = lookupKey(raw);
  if (!normalized) return '';
  if (normalized === 'pt' || normalized.includes('platinum')) return 'PT';
  const karatMatch = raw.match(/(\d{2})/);
  if (karatMatch?.[1]) return `${karatMatch[1]}K`;
  if (normalized.includes('silver')) return 'Silver';
  return raw.toUpperCase();
};

export const normalizeSizeChartKey = (value: string): string => {
  const parsed = sizeNumber(value);
  return parsed != null ? parsed.toFixed(2) : String(value ?? '').trim();
};

export const buildBaseMetalWeightByPurity = (rows: VersionBuilderMetalRow[]): Record<string, string> =>
  rows.reduce<Record<string, string>>((acc, row) => {
    const purity = getMetalPurityBucket(row.metalCaratage);
    if (purity && !acc[purity]) acc[purity] = row.netWt.trim() || row.totalWt.trim() || '0';
    return acc;
  }, {});

export const buildDefaultMetalWeightsForPurities = (
  purities: string[],
  baseWeightMap: Record<string, string>,
): Record<string, string> => purities.reduce<Record<string, string>>((acc, purity) => {
  acc[purity] = baseWeightMap[purity] || '0';
  return acc;
}, {});

export const getDefaultSizeChartGroupCell = (
  row: VersionBuilderGemRow,
  mode: 'varies' | 'fixed',
  baseSize: string,
  targetSize: string,
  coverage: string,
): VersionBuilderSizeChartGroupCell => {
  const computed = calculateVersionBuilderGemRowForSize(row, mode, baseSize, targetSize);
  const normalizedCoverage = lookupKey(coverage);
  const ratio = normalizedCoverage.includes('1/2') || normalizedCoverage.includes('half')
    ? 0.5
    : normalizedCoverage.includes('3/4') ? 0.75 : 1;
  const count = computed.pcs > 0 ? Math.max(1, Math.round(computed.pcs * ratio)) : 0;
  const ctPerStone = computed.wtPerPcs > 0
    ? computed.wtPerPcs
    : computed.pcs > 0 && computed.wtInCts > 0 ? computed.wtInCts / computed.pcs : 0;
  return { count: count > 0 ? String(count) : '', ctPerStone: ctPerStone > 0 ? ctPerStone.toFixed(3) : '' };
};

export const summarizeVersionBuilderGemPlan = (
  rows: VersionBuilderGemRow[],
  groupModes: Record<string, 'varies' | 'fixed'>,
  baseSize: string,
  targetSize: string,
): string => {
  const varyingGroups = rows.filter((row) => (groupModes[row.id] || 'varies') === 'varies').length;
  const fixedGroups = Math.max(0, rows.length - varyingGroups);
  const computed = rows.map((row) => calculateVersionBuilderGemRowForSize(row, groupModes[row.id] || 'varies', baseSize, targetSize));
  const totalPcs = computed.reduce((sum, row) => sum + row.pcs, 0);
  const totalWeight = computed.reduce((sum, row) => sum + row.wtInCts, 0);
  const parts = [`${rows.length} rows`];
  if (totalPcs > 0) parts.push(`${totalPcs} pcs`);
  if (totalWeight > 0) parts.push(`${totalWeight.toFixed(2)} ctw`);
  if (varyingGroups > 0 && fixedGroups > 0) parts.push(`${varyingGroups} vary`);
  else if (varyingGroups === rows.length && rows.length > 0) parts.push('size-based');
  else if (fixedGroups === rows.length && rows.length > 0) parts.push('fixed');
  return `Configured (${parts.join(' - ')})`;
};

export const sortJewelrySizeValues = (values: string[]): string[] => [...values].sort((left, right) => {
  const leftSize = sizeNumber(left);
  const rightSize = sizeNumber(right);
  if (leftSize != null && rightSize != null) return leftSize - rightSize || left.localeCompare(right, undefined, { numeric: true });
  if (leftSize != null) return -1;
  if (rightSize != null) return 1;
  return left.localeCompare(right, undefined, { numeric: true });
});

export type JewelrySizeStep = 'FULL' | 'HALF' | 'QUARTER';
export const getJewelrySizesByStep = (values: string[], step: JewelrySizeStep): string[] => values.filter((value) => {
  const size = sizeNumber(value);
  if (size == null) return false;
  const quarterSteps = Math.round(size * 4);
  if (Math.abs(size * 4 - quarterSteps) > 0.0001) return false;
  const remainder = ((quarterSteps % 4) + 4) % 4;
  return step === 'FULL' ? remainder === 0 : step === 'HALF' ? remainder === 2 : remainder === 1 || remainder === 3;
});

export const VERSION_BUILDER_DIMENSION_CONFIG: Array<{
  id: keyof VersionBuilderSelections;
  label: string;
  helper: string;
}> = [
  { id: 'metals', label: 'Metal', helper: 'Creates one version per selected metal.' },
  { id: 'coverages', label: 'Diamond Spread', helper: 'Use all diamond spread variants for this design.' },
  { id: 'diamondQualities', label: 'Diamond Quality', helper: 'Useful when pricing differs by quality.' },
  { id: 'caratWeights', label: 'Diamond Weight', helper: 'Optional if your design supports multiple carat weights.' },
  { id: 'sizes', label: 'Jewelry Size', helper: 'Select one or many sizes for this version batch.' },
];

export const VERSION_BUILDER_REQUIRED_DIMENSION_LABELS: Partial<
  Record<keyof VersionBuilderSelections, string>
> = {
  metals: 'Metal',
  coverages: 'Diamond Spread',
  diamondQualities: 'Diamond Quality',
  sizes: 'Jewelry Size',
};

export const EMPTY_VERSION_BUILDER_SELECTIONS: VersionBuilderSelections = {
  metals: [],
  coverages: [],
  diamondQualities: [],
  caratWeights: [],
  sizes: [],
};

export const VERSION_BUILDER_GROUP_COLORS = ['#c7983f', '#3f6db3', '#2f8f67', '#9a5ed0', '#c46b3d', '#6f7b87'];

export const VERSION_BUILDER_GENERATED_COLUMNS = [
  { key: 'sku', label: 'SKU', width: 220, minWidth: 150 },
  { key: 'metal', label: 'Metal', width: 180, minWidth: 130 },
  { key: 'purity', label: 'Purity', width: 110, minWidth: 80 },
  { key: 'quality', label: 'Quality', width: 120, minWidth: 90 },
  { key: 'caratWeight', label: 'Diamond Wt', width: 130, minWidth: 100 },
  { key: 'coverage', label: 'Diamond Spread', width: 140, minWidth: 110 },
  { key: 'size', label: 'Size', width: 100, minWidth: 80 },
  { key: 'metalWeight', label: 'Metal Weight', width: 140, minWidth: 110 },
  { key: 'stoneWt', label: 'Stone Wt', width: 150, minWidth: 120 },
  { key: 'bomCost', label: 'BOM Cost', width: 130, minWidth: 110 },
  { key: 'status', label: 'Status', width: 170, minWidth: 140 },
] as const;

export type VersionBuilderGeneratedColumnKey = (typeof VERSION_BUILDER_GENERATED_COLUMNS)[number]['key'];

export const DEFAULT_VERSION_BUILDER_GENERATED_COLUMN_WIDTHS =
  VERSION_BUILDER_GENERATED_COLUMNS.reduce<Record<VersionBuilderGeneratedColumnKey, number>>((acc, column) => {
    acc[column.key] = column.width;
    return acc;
  }, {} as Record<VersionBuilderGeneratedColumnKey, number>);

export const VERSION_BUILDER_WORKFLOW: Array<{
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

interface VersionBuilderModalProps {
  title: string;
  footer: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

export default function VersionBuilderModal({ title, footer, onClose, children }: VersionBuilderModalProps) {
  return (
    <ProductsModal title={title} size="max-w-6xl" onClose={onClose} footer={footer}>
      {children}
    </ProductsModal>
  );
}


