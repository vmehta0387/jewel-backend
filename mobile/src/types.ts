export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'BRANCH_MANAGER' | 'SALES_REP' | 'INTERNAL_REP';

export type AuthUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  companyId?: string | null;
  branchId?: string | null;
  photoUrl?: string | null;
  taskPermissions?: string[];
  companyName?: string | null;
  branchName?: string | null;
};

export type Design = {
  id: string;
  designNo: string;
  designName?: string | null;
  version: string;
  isPrimary?: boolean;
  jewelryGroup: string;
  collection?: string | null;
  jewelrySize?: string | null;
  stage?: string | null;
  diamondSpread?: string | null;
  diamondType?: string | null;
  diamondWeight?: string | null;
  diamondQuality?: string | null;
  goldColour?: string | null;
  totalValue?: number;
  displayPrice?: number;
  grossWeight?: number;
  imageUrls?: string[];
  ijewelModelId?: string | null;
  ijewelBaseName?: string | null;
  metals?: Array<{
    metalCaratage?: string;
    goldColour?: string;
    netWt?: number;
    totalWt?: number;
    value?: number;
  }>;
  gemstones?: Array<{
    packetId?: string;
    stone?: string;
    shape?: string;
    size?: string;
    color?: string;
    quality?: string;
    stoneType?: string;
    wtInCts?: number;
  }>;
};

export type DesignListResponse = {
  data: Design[];
  total: number;
  page: number;
  totalPages: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  isActive?: boolean;
  designId?: string | null;
  designNo?: string | null;
  designVersion?: string | null;
  designImageUrl?: string | null;
  salesRepId?: string | null;
  salesRepName?: string | null;
  salesRepEmail?: string | null;
  branchManagerName?: string | null;
  status: string;
  price: number;
  quantity: number;
  deliveryDate?: string | null;
  shortDescription?: string | null;
  notes?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  purchaseOrderNumber?: string | null;
  companyName?: string | null;
  branchName?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type OrdersResponse = {
  data: Order[];
  total: number;
  page: number;
  totalPages: number;
};

export type BranchEmployee = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  role: UserRole;
  phone?: string | null;
  isActive: boolean;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  branch?: {
    id: string;
    name: string;
    code: string;
  } | null;
};

export type BranchOption = {
  id: string;
  name: string;
  code: string;
  streetAddress?: string | null;
  streetAddress2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type MasterOption = {
  id: string;
  value: string;
  aliasName?: string | null;
  jewelryGroupId?: string | null;
};
