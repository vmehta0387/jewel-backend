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

export type MobileConfiguratorResolveQuery = {
  selectedKey?: keyof MobileConfiguratorOptions;
  diamondTypeId?: number;
  stoneId?: number;
  shapeId?: number;
  styleId?: number;
  metalCaratageId?: number;
  weightId?: number;
  qualityId?: number;
  ringSizeId?: number;
  diamondType?: string;
  stone?: string;
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
  optionGroups: Record<keyof MobileConfiguratorOptions, string[]>;
};

type LegacyMobileConfiguratorOptions = Partial<Record<keyof MobileConfiguratorOptions | 'stone', string | MobileConfiguratorOption>> & {
  metalColor?: string | MobileConfiguratorOption;
};

type LegacyMobileConfiguratorResponse = {
  selectedDesign: Design;
  selectedOptions?: LegacyMobileConfiguratorOptions;
  optionGroups?: Partial<Record<keyof MobileConfiguratorOptions | 'stone' | 'metalColor', string[] | MobileConfiguratorOption[]>>;
};

const toOptionLabel = (raw: unknown): string => {
  if (raw && typeof raw === 'object' && 'label' in raw) return String((raw as any).label || '');
  return String(raw || '');
};

const toLabelArray = (raw: unknown[]): string[] =>
  Array.from(
    new Set(
      (raw || [])
        .map(toOptionLabel)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

const normalizeMobileConfiguratorResponse = (
  response: LegacyMobileConfiguratorResponse,
): MobileConfiguratorResponse => {
  const rawSelected = response.selectedOptions || {};
  const rawGroups = response.optionGroups || {};

  const resolveLabel = (key: keyof MobileConfiguratorOptions | 'stone', legacyKey?: string): string =>
    toOptionLabel((rawSelected as any)[key] ?? (legacyKey ? (rawSelected as any)[legacyKey] : undefined));

  const metalLabel = resolveLabel('metalCaratage', 'metalColor').split(',')[0]?.trim() || '';
  const stoneLabel = resolveLabel('stone') || resolveLabel('shape');

  return {
    selectedDesign: response.selectedDesign,
    selectedOptions: {
      diamondType: resolveLabel('diamondType'),
      shape: stoneLabel,
      style: resolveLabel('style'),
      metalCaratage: metalLabel,
      weight: resolveLabel('weight'),
      quality: resolveLabel('quality'),
      ringSize: resolveLabel('ringSize'),
    },
    optionGroups: {
      diamondType: toLabelArray((rawGroups.diamondType || []) as any[]),
      shape: toLabelArray(((rawGroups.stone || rawGroups.shape || []) as any[])),
      style: toLabelArray((rawGroups.style || []) as any[]),
      metalCaratage: toLabelArray([ ...((rawGroups.metalCaratage || rawGroups.metalColor || []) as any[]) ]),
      weight: toLabelArray((rawGroups.weight || []) as any[]),
      quality: toLabelArray((rawGroups.quality || []) as any[]),
      ringSize: toLabelArray((rawGroups.ringSize || []) as any[]),
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
  option: string | MobileConfiguratorOption,
  current: MobileConfiguratorOptions,
): MobileConfiguratorResolveQuery => {
  const query: MobileConfiguratorResolveQuery = { selectedKey: key };
  const idKey = `${key}Id` as keyof MobileConfiguratorResolveQuery;
  const labelKey = key as keyof MobileConfiguratorResolveQuery;

  // Set the changed key.
  if (typeof option === 'string') {
    (query as any)[labelKey] = option;
  } else if (option.id !== null) {
    (query as any)[idKey] = option.id;
  } else {
    (query as any)[labelKey] = option.label;
  }

  // Carry over other current selections as labels for existing string-based screens.
  (Object.keys(current) as (keyof MobileConfiguratorOptions)[]).forEach((k) => {
    if (k === key) return;
    const cur = current[k];
    if (!cur) return;
    (query as any)[k] = cur;
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
