import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';

export class CompanyAdminPricingSlabDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minCost: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxCost: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  multiplier: number;
}

export class UpdateCompanyAdminCompanyPricingDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  defaultMultiplier: number;

  @IsOptional()
  @IsBoolean()
  enableSlabPricing?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyAdminPricingSlabDto)
  pricingSlabs?: CompanyAdminPricingSlabDto[];
}

export class UpdateCompanyAdminBranchPricingDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  branchMultiplier: number;

  @IsOptional()
  @IsBoolean()
  enableSlabPricing?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyAdminPricingSlabDto)
  pricingSlabs?: CompanyAdminPricingSlabDto[];
}
