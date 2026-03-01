import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ShipToType {
  MAIN_ADDRESS = 'MAIN_ADDRESS',
  MAIN_BRANCH = 'MAIN_BRANCH',
  CUSTOM = 'CUSTOM',
}

export class PricingSlabDto {
  @IsNumber()
  minCost: number;

  @IsNumber()
  maxCost: number;

  @IsNumber()
  multiplier: number;
}

export class CollectionOverrideDto {
  @IsString()
  collectionType: string;

  @IsNumber()
  multiplier: number;
}

export class CreateCompanyDto {
  @IsString()
  companyName: string;

  @IsString()
  companyCode: string;

  @IsOptional()
  @IsString()
  accountManagerId?: string;

  @IsOptional()
  newAccountManager?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };

  @IsOptional()
  @IsString()
  streetAddress?: string;

  @IsOptional()
  @IsString()
  streetAddress2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  stateProvince?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  primaryEmail?: string;

  @IsOptional()
  @IsString()
  primaryPhone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsEnum(ShipToType)
  shipToType: ShipToType;

  @IsOptional()
  @IsString()
  shipStreetAddress?: string;

  @IsOptional()
  @IsString()
  shipCity?: string;

  @IsOptional()
  @IsString()
  shipStateProvince?: string;

  @IsOptional()
  @IsString()
  shipPostalCode?: string;

  @IsOptional()
  @IsString()
  shipCountry?: string;

  @IsNumber()
  defaultMultiplier: number;

  @IsOptional()
  @IsBoolean()
  enableSlabPricing?: boolean;

  @IsOptional()
  @IsBoolean()
  enableCollectionPricing?: boolean;

  @IsOptional()
  @IsBoolean()
  createMainBranch?: boolean;

  @IsOptional()
  @IsString()
  mainBranchName?: string;

  @IsOptional()
  @IsString()
  mainBranchCode?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingSlabDto)
  pricingSlabs?: PricingSlabDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectionOverrideDto)
  collectionOverrides?: CollectionOverrideDto[];
}

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  accountManagerId?: string;

  @IsOptional()
  @IsString()
  streetAddress?: string;

  @IsOptional()
  @IsString()
  streetAddress2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  stateProvince?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  primaryEmail?: string;

  @IsOptional()
  @IsString()
  primaryPhone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsEnum(ShipToType)
  shipToType?: ShipToType;

  @IsOptional()
  @IsNumber()
  defaultMultiplier?: number;

  @IsOptional()
  @IsBoolean()
  enableSlabPricing?: boolean;

  @IsOptional()
  @IsBoolean()
  enableCollectionPricing?: boolean;

  @IsOptional()
  @IsArray()
  pricingSlabs?: PricingSlabDto[];

  @IsOptional()
  @IsArray()
  collectionOverrides?: CollectionOverrideDto[];
}

export class UpdateCompanyStatusDto {
  @IsBoolean()
  isActive: boolean;
}
