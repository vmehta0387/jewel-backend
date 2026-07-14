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
  | 'goldColour'
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
  category?: 'rings' | 'bracelets' | 'studs' | 'necklaces';
  search?: string;
  collection?: string;
  diamondType?: string;
  priceBand?: 'ALL' | 'UNDER_2000' | 'BETWEEN_2000_5000' | 'ABOVE_5000';
  sort?: 'recent' | 'priceAsc' | 'priceDesc' | 'designAsc' | 'designDesc';
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

export type MobileConfiguratorResolveQuery = Partial<MobileConfiguratorOptions> & {
  selectedKey?: keyof MobileConfiguratorOptions;
};

export type MobileConfiguratorResponse = {
  selectedDesign: Design;
  selectedOptions: MobileConfiguratorOptions;
  optionGroups: Record<keyof MobileConfiguratorOptions, string[]>;
};

type LegacyMobileConfiguratorOptions = Partial<MobileConfiguratorOptions> & {
  metalColor?: string;
};

type LegacyMobileConfiguratorResponse = {
  selectedDesign: Design;
  selectedOptions?: LegacyMobileConfiguratorOptions;
  optionGroups?: Partial<Record<keyof MobileConfiguratorOptions | 'metalColor', string[]>>;
};

const emptyMobileConfiguratorOptions = (): MobileConfiguratorOptions => ({
  diamondType: '',
  shape: '',
  style: '',
  metalCaratage: '',
  weight: '',
  quality: '',
  ringSize: '',
});

const normalizeMobileConfiguratorResponse = (
  response: LegacyMobileConfiguratorResponse,
): MobileConfiguratorResponse => {
  const selectedOptions = response.selectedOptions || {};
  const optionGroups = response.optionGroups || {};

  return {
    selectedDesign: response.selectedDesign,
    selectedOptions: {
      ...emptyMobileConfiguratorOptions(),
      ...selectedOptions,
      metalCaratage: selectedOptions.metalCaratage || selectedOptions.metalColor || '',
    },
    optionGroups: {
      diamondType: optionGroups.diamondType || [],
      shape: optionGroups.shape || [],
      style: optionGroups.style || [],
      metalCaratage: optionGroups.metalCaratage || optionGroups.metalColor || [],
      weight: optionGroups.weight || [],
      quality: optionGroups.quality || [],
      ringSize: optionGroups.ringSize || [],
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

export type CatalogCategoryCounts = Record<
  'rings' | 'bracelets' | 'studs' | 'necklaces',
  { designs: number; versions: number }
>;

export const fetchCatalogCategoryCounts = (token: string) =>
  apiRequest<{ data: CatalogCategoryCounts }>(
    '/products/mobile/category-counts',
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
  const buildPath = (useLegacyMetalKey = false) => {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (!value) return;
      if (useLegacyMetalKey && key === 'selectedKey' && value === 'metalCaratage') {
        params.set(key, 'metalColor');
        return;
      }
      if (useLegacyMetalKey && key === 'metalCaratage') {
        params.set('metalColor', String(value));
        return;
      }
      params.set(key, String(value));
    });
    const qs = params.toString();
    return `/products/mobile/configurator/${encodeURIComponent(id)}/resolve${qs ? `?${qs}` : ''}`;
  };

  const shouldRetryLegacy =
    options.selectedKey === 'metalCaratage' ||
    Boolean(options.metalCaratage);

  return apiRequest<LegacyMobileConfiguratorResponse>(
    buildPath(),
    { method: 'GET' },
    token,
  )
    .catch((error) => {
      if (!shouldRetryLegacy || error?.status !== 400) {
        throw error;
      }
      return apiRequest<LegacyMobileConfiguratorResponse>(
        buildPath(true),
        { method: 'GET' },
        token,
      );
    })
    .then(normalizeMobileConfiguratorResponse);
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
