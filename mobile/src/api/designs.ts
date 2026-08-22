import { apiRequest } from './client';
import type { Design, DesignListResponse } from '../types';

export type MobileTrendingDesign = Pick<
  Design,
  | 'id'
  | 'designNo'
  | 'designName'
  | 'jewelryGroup'
  | 'collection'
  | 'version'
  | 'totalValue'
  | 'displayPrice'
  | 'imageUrls'
> & {
  createdAt?: string;
};

export type MobileCatalogDesign = Pick<
  Design,
  | 'id'
  | 'designNo'
  | 'designName'
  | 'jewelryGroup'
  | 'collection'
  | 'version'
  | 'jewelrySize'
  | 'diamondSpread'
  | 'diamondType'
  | 'diamondWeight'
  | 'diamondQuality'
  | 'metalCaratage'
  | 'totalValue'
  | 'displayPrice'
  | 'imageUrls'
  | 'isPrimary'
> & {
  createdAt?: string;
};

export type MobileCatalogQuery = {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  collection?: string;
  diamondType?: string;
  stone?: string;
  shape?: string;
  jewelrySize?: string;
  metalCaratage?: string;
  priceBand?: 'ALL' | 'UNDER_2000' | 'BETWEEN_2000_5000' | 'ABOVE_5000';
  sort?: 'recent' | 'priceAsc' | 'priceDesc' | 'designAsc' | 'designDesc';
};

export type MobileConfiguratorOption = {
  id: number | null;
  label: string;
};

export type MobileConfiguratorOptions = {
  diamondType: string;
  shape: string;
  style: string;
  metalCaratage: string;
  weight: string;
  quality: string;
  ringSize: string;
};

export type MobileConfiguratorKey = keyof MobileConfiguratorOptions;
export type MobileConfiguratorOptionGroups = Record<MobileConfiguratorKey, MobileConfiguratorOption[]>;
export type MobileConfiguratorSelectedOptions = Record<MobileConfiguratorKey, MobileConfiguratorOption>;

export type MobileConfiguratorResolveQuery = Partial<Record<MobileConfiguratorKey, string | number>> & {
  selectedKey?: MobileConfiguratorKey;
};

export type MobileConfiguratorResponse = {
  selectedDesign: Design;
  selectedOptions: MobileConfiguratorSelectedOptions;
  optionGroups: MobileConfiguratorOptionGroups;
  selectedOptionLabels: MobileConfiguratorOptions;
  optionGroupLabels: Record<MobileConfiguratorKey, string[]>;
};

type LegacyMobileConfiguratorOptions = Partial<Record<keyof MobileConfiguratorOptions | 'stone', string | MobileConfiguratorOption>> & {
  metalColor?: string | MobileConfiguratorOption;
};

type LegacyMobileConfiguratorResponse = {
  selectedDesign: Design;
  selectedOptions?: LegacyMobileConfiguratorOptions;
  optionGroups?: Partial<Record<keyof MobileConfiguratorOptions | 'stone' | 'metalColor', string[] | MobileConfiguratorOption[]>>;
};

const toOption = (raw: unknown): MobileConfiguratorOption => {
  if (raw && typeof raw === 'object') {
    const value = raw as any;
    const rawId = value.id ?? null;
    const id = rawId !== null && rawId !== undefined && rawId !== '' && Number.isFinite(Number(rawId)) ? Number(rawId) : null;
    const label = String(value.label ?? value.name ?? value.value ?? '').trim();
    return { id, label };
  }
  return { id: null, label: String(raw || '').trim() };
};

const toOptionLabel = (raw: unknown): string => toOption(raw).label;

const toOptionArray = (raw: unknown[]): MobileConfiguratorOption[] => {
  const byKey = new Map<string, MobileConfiguratorOption>();
  (raw || []).forEach((item) => {
    const option = toOption(item);
    if (!option.label) return;
    const key = option.id !== null ? `id:${option.id}` : `label:${option.label.toLowerCase()}`;
    if (!byKey.has(key)) byKey.set(key, option);
  });
  return Array.from(byKey.values());
};

const toLabelArray = (raw: MobileConfiguratorOption[]): string[] => raw.map((option) => option.label).filter(Boolean);

const optionValueForQuery = (option: string | MobileConfiguratorOption | undefined): string | number | undefined => {
  if (!option) return undefined;
  if (typeof option === 'string') return option.trim() || undefined;
  return option.id !== null ? option.id : option.label || undefined;
};

const normalizeMobileConfiguratorResponse = (
  response: LegacyMobileConfiguratorResponse,
): MobileConfiguratorResponse => {
  const rawSelected = response.selectedOptions || {};
  const rawGroups = response.optionGroups || {};

  const resolveOption = (key: keyof MobileConfiguratorOptions | 'stone', legacyKey?: string): MobileConfiguratorOption =>
    toOption((rawSelected as any)[key] ?? (legacyKey ? (rawSelected as any)[legacyKey] : undefined));

  const metalOption = resolveOption('metalCaratage', 'metalColor');
  const stoneOption = resolveOption('stone').label ? resolveOption('stone') : resolveOption('shape');
  const selectedOptions: MobileConfiguratorSelectedOptions = {
    diamondType: resolveOption('diamondType'),
    shape: stoneOption,
    style: resolveOption('style'),
    metalCaratage: metalOption.label.includes(',') ? { ...metalOption, label: metalOption.label.split(',')[0]?.trim() || '' } : metalOption,
    weight: resolveOption('weight'),
    quality: resolveOption('quality'),
    ringSize: resolveOption('ringSize'),
  };
  const optionGroups: MobileConfiguratorOptionGroups = {
    diamondType: toOptionArray((rawGroups.diamondType || []) as any[]),
    shape: toOptionArray(((rawGroups.stone || rawGroups.shape || []) as any[])),
    style: toOptionArray((rawGroups.style || []) as any[]),
    metalCaratage: toOptionArray([ ...((rawGroups.metalCaratage || rawGroups.metalColor || []) as any[]) ]),
    weight: toOptionArray((rawGroups.weight || []) as any[]),
    quality: toOptionArray((rawGroups.quality || []) as any[]),
    ringSize: toOptionArray((rawGroups.ringSize || []) as any[]),
  };

  return {
    selectedDesign: response.selectedDesign,
    selectedOptions,
    optionGroups,
    selectedOptionLabels: {
      diamondType: selectedOptions.diamondType.label,
      shape: selectedOptions.shape.label,
      style: selectedOptions.style.label,
      metalCaratage: selectedOptions.metalCaratage.label,
      weight: selectedOptions.weight.label,
      quality: selectedOptions.quality.label,
      ringSize: selectedOptions.ringSize.label,
    },
    optionGroupLabels: {
      diamondType: toLabelArray(optionGroups.diamondType),
      shape: toLabelArray(optionGroups.shape),
      style: toLabelArray(optionGroups.style),
      metalCaratage: toLabelArray(optionGroups.metalCaratage),
      weight: toLabelArray(optionGroups.weight),
      quality: toLabelArray(optionGroups.quality),
      ringSize: toLabelArray(optionGroups.ringSize),
    },
  };
};
export const fetchDesigns = (token: string, page = 1, limit = 25) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status: 'ACTIVE',
  });
  return apiRequest<DesignListResponse>(`/products?${params.toString()}`, { method: 'GET' }, token);
};

export const fetchDesign = (token: string, id: string) =>
  apiRequest<Design>(`/products/${id}`, { method: 'GET' }, token);

export const fetchMobileTrendingDesigns = (token: string, limit = 3) =>
  apiRequest<{ data: MobileTrendingDesign[] }>(
    `/products/mobile/trending?limit=${encodeURIComponent(String(limit))}`,
    { method: 'GET' },
    token,
  );

export const fetchMobileCatalogDesigns = (token: string, query: MobileCatalogQuery = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'ALL') return;
    params.set(key, String(value));
  });

  return apiRequest<DesignListResponse & { data: MobileCatalogDesign[] }>(
    `/products/mobile/catalog?${params.toString()}`,
    { method: 'GET' },
    token,
  );
};

export type CatalogCategoryOption = {
  id: string;
  label: string;
  designs: number;
  versions: number;
};

export const fetchCatalogCategoryCounts = (token: string) =>
  apiRequest<{ data: Record<string, { designs: number; versions: number }> }>(
    '/products/mobile/category-counts',
    { method: 'GET' },
    token,
  );

export const fetchCatalogCategories = (token: string) =>
  apiRequest<{ data: CatalogCategoryOption[] }>(
    '/products/mobile/categories',
    { method: 'GET' },
    token,
  );

export const fetchMobileDesignConfigurator = (token: string, id: string) =>
  apiRequest<LegacyMobileConfiguratorResponse>(
    `/products/mobile/configurator/${encodeURIComponent(id)}`,
    { method: 'GET' },
    token,
  ).then(normalizeMobileConfiguratorResponse);

export const resolveMobileDesignConfigurator = (
  token: string,
  id: string,
  options: MobileConfiguratorResolveQuery,
) => {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (key === 'diamondType' || key === 'stone' || key.endsWith('Id')) return;
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const qs = params.toString();
  const path = `/products/mobile/configurator/${encodeURIComponent(id)}/resolve${qs ? `?${qs}` : ''}`;
  return apiRequest<LegacyMobileConfiguratorResponse>(path, { method: 'GET' }, token)
    .then(normalizeMobileConfiguratorResponse);
};

// Helper: build a resolve query from a selected option, preferring ID over label
export const buildConfiguratorResolveQuery = (
  key: MobileConfiguratorKey,
  option: string | MobileConfiguratorOption,
  current: Partial<Record<MobileConfiguratorKey, string | MobileConfiguratorOption>>,
): MobileConfiguratorResolveQuery => {
  const query: MobileConfiguratorResolveQuery = { selectedKey: key };
  const selectedValue = optionValueForQuery(option);
  if (selectedValue !== undefined) query[key] = selectedValue;

  (Object.keys(current) as MobileConfiguratorKey[]).forEach((currentKey) => {
    if (currentKey === key || currentKey === 'diamondType' || currentKey === 'shape') return;
    const value = optionValueForQuery(current[currentKey]);
    if (value !== undefined) query[currentKey] = value;
  });

  return query;
};

export const fetchAllDesigns = async (token: string, limit = 500) => {
  let page = 1;
  let totalPages = 1;
  const rows: Design[] = [];

  do {
    const response = await fetchDesigns(token, page, limit);
    rows.push(...(response.data || []));
    totalPages = response.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return rows;
};


