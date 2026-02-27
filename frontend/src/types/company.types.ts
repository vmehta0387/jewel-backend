export interface Company {
  id: number;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  basicMultiplier: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyDto {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  basicMultiplier?: number;
}
