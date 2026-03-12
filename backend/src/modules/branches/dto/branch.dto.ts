import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { BranchShipToType } from '../enums/branch-ship-to-type.enum';

export class BranchPricingSlabDto {
  @IsNumber()
  minCost: number;

  @IsNumber()
  maxCost: number;

  @IsNumber()
  multiplier: number;
}

export class NewBranchManagerDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateBranchDto {
  @IsString()
  companyId: string;

  @IsString()
  name: string;

  @IsString()
  code: string;

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
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(BranchShipToType)
  shipToType?: BranchShipToType;

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

  @IsOptional()
  @IsString()
  branchManagerId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewBranchManagerDto)
  newBranchManager?: NewBranchManagerDto;

  @IsOptional()
  @IsBoolean()
  enableSlabPricing?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchPricingSlabDto)
  pricingSlabs?: BranchPricingSlabDto[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  branchMultiplier?: number;
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

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
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(BranchShipToType)
  shipToType?: BranchShipToType;

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

  @IsOptional()
  @IsString()
  branchManagerId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewBranchManagerDto)
  newBranchManager?: NewBranchManagerDto;

  @IsOptional()
  @IsBoolean()
  enableSlabPricing?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchPricingSlabDto)
  pricingSlabs?: BranchPricingSlabDto[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  branchMultiplier?: number;
}

export class UpdateBranchStatusDto {
  @IsBoolean()
  isActive: boolean;
}
