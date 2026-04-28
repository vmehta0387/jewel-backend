import { apiRequest } from './client';

export type PricingSlab = {
  id?: string;
  minCost: number;
  maxCost: number;
  multiplier: number;
};

export type BranchPricingSettings = {
  id: string;
  name: string;
  code: string;
  branchMultiplier: number;
  enableSlabPricing: boolean;
  pricingSlabs: PricingSlab[];
};

export type CompanyPricingSettings = {
  id: string;
  name: string;
  defaultMultiplier: number;
  enableSlabPricing: boolean;
  pricingSlabs: PricingSlab[];
};

export type CompanyAdminPricingSettingsResponse = {
  company: CompanyPricingSettings;
  branches: BranchPricingSettings[];
};

export const fetchCompanyAdminPricingSettings = (token: string) =>
  apiRequest<CompanyAdminPricingSettingsResponse>('/pricing/company-admin/settings', { method: 'GET' }, token);

export const updateCompanyAdminCompanyPricing = (
  token: string,
  payload: {
    defaultMultiplier: number;
    enableSlabPricing?: boolean;
    pricingSlabs?: PricingSlab[];
  },
) =>
  apiRequest<CompanyAdminPricingSettingsResponse>('/pricing/company-admin/company', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);

export const updateCompanyAdminBranchPricing = (
  token: string,
  branchId: string,
  payload: {
    branchMultiplier: number;
    enableSlabPricing?: boolean;
    pricingSlabs?: PricingSlab[];
  },
) =>
  apiRequest<CompanyAdminPricingSettingsResponse>(`/pricing/company-admin/branches/${branchId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
