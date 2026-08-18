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
  shape?: string;
  priceBand?: 'ALL' | 'UNDER_2000' | 'BETWEEN_2000_5000' | 'ABOVE_5000';
  sort?: 'recent' | 'priceAsc' | 'priceDesc' | 'designAsc' | 'designDesc';
};

export type MobileConfiguratorOption = {
  id: number | null;
  label: string;
};

export type MobileConfiguratorOptions = {
  diamondType: MobileConfiguratorOption;
  shape: MobileConfiguratorOption;
  style: MobileConfiguratorOption;
  metalCaratage: MobileConfiguratorOption;
  weight: MobileConfiguratorOption;
  quality: MobileConfiguratorOption;
  ringSize: MobileConfiguratorOption;
};

export type MobileConfiguratorResolveQuery = {
  selectedKey?: keyof MobileConfiguratorOptions;
  // ID-based (preferred)
  diamondTypeId?: number;
  shapeId?: number;
  styleId?: number;
  metalCaratageId?: number;
  weightId?: number;
  qualityId?: number;
  ringSizeId?: number;
  // Label-based (legacy fallback)
  diamondType?: string;
  shape?: string;
  style?: string;
  metalCaratage?: string;
  weight?: string;
  quality?: string;
  ringSize?: string;
};

export type MobileConfiguratorResponse = {
  selectedDesign: Design;
  selectedOptions: MobileConfiguratorOptions;
  optionGroups: Record<keyof MobileConfiguratorOptions, MobileConfiguratorOption[]>;
};

type LegacyMobileConfiguratorOptions = Partial<Record<keyof MobileConfiguratorOptions, string>> & {
  metalColor?: string;
};

type LegacyMobileConfiguratorResponse = {
  selectedDesign: Design;
  selectedOptions?: LegacyMobileConfiguratorOptions | Record<string, { id: number | null; label: string }>;
  optionGroups?: Partial<Record<keyof MobileConfiguratorOptions | 'metalColor', string[] | MobileConfiguratorOption[]>>;
};

const emptyMobileConfiguratorOption = (): MobileConfiguratorOption => ({ id: null, label: '' });

const emptyMobileConfiguratorOptions = (): MobileConfiguratorOptions => ({
  diamondType: emptyMobileConfiguratorOption(),
  shape: emptyMobileConfiguratorOption(),
  style: emptyMobileConfiguratorOption(),
  metalCaratage: emptyMobileConfiguratorOption(),
  weight: emptyMobileConfiguratorOption(),
  quality: emptyMobileConfiguratorOption(),
  ringSize: emptyMobileConfiguratorOption(),
});

const toOption = (raw: unknown): MobileConfiguratorOption => {
  if (raw && typeof raw === 'object' && 'label' in raw) {
    return { id: (raw as any).id ?? null, label: String((raw as any).label || '') };
  }
  return { id: null, label: String(raw || '') };
};

const toOptionArray = (raw: unknown[]): MobileConfiguratorOption[] =>
  Array.from(
    new Map(
      (raw || [])
        .map(toOption)
        .filter((opt) => opt.label)
        .map((opt) => [opt.label.toLowerCase(), opt]),
    ).values(),
  );

const normalizeMobileConfiguratorResponse = (
  response: LegacyMobileConfiguratorResponse,
): MobileConfiguratorResponse => {
  const rawSelected = response.selectedOptions || {};
  const rawGroups = response.optionGroups || {};

  const resolveOption = (key: keyof MobileConfiguratorOptions, legacyKey?: string): MobileConfiguratorOption => {
    const val = (rawSelected as any)[key] ?? (legacyKey ? (rawSelected as any)[legacyKey] : undefined);
    return toOption(val);
  };

  const metalOpt = resolveOption('metalCaratage', 'metalColor');
  const firstMetal: MobileConfiguratorOption = {
    id: metalOpt.id,
    label: metalOpt.label.split(',')[0]?.trim() || '',
  };

  return {
    selectedDesign: response.selectedDesign,
    selectedOptions: {
      diamondType: resolveOption('diamondType'),
      shape: resolveOption('shape'),
      style: resolveOption('style'),
      metalCaratage: firstMetal,
      weight: resolveOption('weight'),
      quality: resolveOption('quality'),
      ringSize: resolveOption('ringSize'),
    },
    optionGroups: {
      diamondType: toOptionArray((rawGroups.diamondType || []) as any[]),
      shape: toOptionArray((rawGroups.shape || []) as any[]),
      style: toOptionArray((rawGroups.style || []) as any[]),
      metalCaratage: toOptionArray([
        ...((rawGroups.metalCaratage || rawGroups.metalColor || []) as any[]),
      ]),
      weight: toOptionArray((rawGroups.weight || []) as any[]),
      quality: toOptionArray((rawGroups.quality || []) as any[]),
      ringSize: toOptionArray((rawGroups.ringSize || []) as any[]),
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
  key: keyof MobileConfiguratorOptions,
  option: MobileConfiguratorOption,
  current: MobileConfiguratorOptions,
): MobileConfiguratorResolveQuery => {
  const query: MobileConfiguratorResolveQuery = { selectedKey: key };
  const idKey = `${key}Id` as keyof MobileConfiguratorResolveQuery;
  const labelKey = key as keyof MobileConfiguratorResolveQuery;

  // Set the changed key
  if (option.id !== null) {
    (query as any)[idKey] = option.id;
  } else {
    (query as any)[labelKey] = option.label;
  }

  // Carry over other current selections using IDs where available
  (Object.keys(current) as (keyof MobileConfiguratorOptions)[]).forEach((k) => {
    if (k === key) return;
    const cur = current[k];
    if (!cur?.label) return;
    const curIdKey = `${k}Id` as keyof MobileConfiguratorResolveQuery;
    const curLabelKey = k as keyof MobileConfiguratorResolveQuery;
    if (cur.id !== null) {
      (query as any)[curIdKey] = cur.id;
    } else {
      (query as any)[curLabelKey] = cur.label;
    }
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
