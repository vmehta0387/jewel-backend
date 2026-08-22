import { apiRequest } from './client';
import type { GroupedMastersResponse, MasterOption } from '../types';

export const fetchMasters = (
  token: string,
  type: string,
  status: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ACTIVE',
) => {
  const params = new URLSearchParams({ type, status });
  return apiRequest<{ data: MasterOption[] }>(`/products/lookup/masters?${params.toString()}`, { method: 'GET' }, token);
};

export const fetchAllGroupedMasters = (
  token: string,
  status: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ACTIVE',
) => {
  const params = new URLSearchParams({ status });
  return apiRequest<GroupedMastersResponse>(`/products/lookup/masters?${params.toString()}`, { method: 'GET' }, token);
};
type MasterTableDropdownOption = MasterOption & {
  id: string | number;
  name?: string;
  label?: string;
  alias?: string | null;
  jewelryGroupId?: string | number | null;
  jewelryGroup?: string | null;
  metalName?: string | null;
  metalColor?: string | null;
  metalPurity?: string | null;
  purityPercentage?: number;
  defaultWastagePercent?: number;
  livePricePerGm?: number;
};

const fetchMasterDropdown = (
  token: string,
  type: string,
  status: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ACTIVE',
) => {
  const params = new URLSearchParams({ status });
  return apiRequest<MasterTableDropdownOption[]>(`/products/master-tables/${type}/dropdown?${params.toString()}`, { method: 'GET' }, token);
};

const normalizeMasterOption = (option: MasterTableDropdownOption): MasterOption => ({
  ...option,
  id: String(option.id),
  value: String(option.value || option.name || option.label || '').trim(),
  aliasName: option.aliasName ?? option.alias ?? null,
});

const normalizeLinkedMasterOption = (option: MasterTableDropdownOption) => ({
  ...normalizeMasterOption(option),
  jewelryGroupId: option.jewelryGroupId != null ? String(option.jewelryGroupId) : undefined,
  jewelryGroup: option.jewelryGroup || undefined,
});

export const fetchMobileFilterMasters = async (
  token: string,
  status: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ACTIVE',
): Promise<GroupedMastersResponse> => {
  const [
    jewelryGroups,
    collections,
    jewelrySizes,
    metalCaratages,
    diamondTypes,
    packetShapes,
  ] = await Promise.all([
    fetchMasterDropdown(token, 'JEWELRY_GROUP', status),
    fetchMasterDropdown(token, 'COLLECTION', status),
    fetchMasterDropdown(token, 'JEWELRY_SIZE', status),
    fetchMasterDropdown(token, 'METAL_CARATAGE', status),
    fetchMasterDropdown(token, 'DIAMOND_TYPE', status),
    fetchMasterDropdown(token, 'PACKET_SHAPE', status),
  ]);

  return {
    jewelryGroups: jewelryGroups.map(normalizeMasterOption),
    collections: collections.map(normalizeLinkedMasterOption),
    jewelrySizes: jewelrySizes.map(normalizeLinkedMasterOption),
    tags: [],
    designStatuses: [],
    stages: [],
    metalNames: [],
    metalColors: [],
    metalPurities: [],
    metalCaratages: metalCaratages.map((option) => ({
      ...normalizeMasterOption(option),
      metalName: option.metalName || undefined,
      metalColor: option.metalColor || undefined,
      metalPurity: option.metalPurity || undefined,
      purityPercentage: option.purityPercentage,
      defaultWastagePercent: option.defaultWastagePercent,
      livePricePerGm: option.livePricePerGm,
    })),
    diamondTypes: diamondTypes.map(normalizeMasterOption),
    diamondSpreads: [],
    diamondWeights: [],
    diamondQualities: [],
    vendorNames: [],
    laborHeads: [],
    packetStones: [],
    packetShapes: packetShapes.map(normalizeMasterOption),
    packetSizes: [],
    packetCuts: [],
    packetColors: [],
    packetQualities: [],
  };
};

