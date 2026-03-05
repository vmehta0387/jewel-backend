import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  GlobalBasePriceCategory,
  GlobalBasePriceUnit,
} from '../entities/global-base-price.entity';

export class FindGlobalBasePricesQueryDto {
  @IsEnum(GlobalBasePriceCategory)
  @IsOptional()
  category?: GlobalBasePriceCategory;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean;
}

export class FindGlobalBasePriceReferenceOptionsQueryDto {
  @IsEnum(GlobalBasePriceCategory)
  category: GlobalBasePriceCategory;

  @IsString()
  @MaxLength(36)
  @IsOptional()
  excludeId?: string;
}

export class CreateGlobalBasePriceDto {
  @IsEnum(GlobalBasePriceCategory)
  category: GlobalBasePriceCategory;

  @IsString()
  @MaxLength(255)
  referenceValue: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  subValue?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerUnit: number;

  @IsEnum(GlobalBasePriceUnit)
  @IsOptional()
  unit?: GlobalBasePriceUnit;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateGlobalBasePriceDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  referenceValue?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  subValue?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerUnit?: number;

  @IsEnum(GlobalBasePriceUnit)
  @IsOptional()
  unit?: GlobalBasePriceUnit;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateGlobalBasePriceStatusDto {
  @Type(() => Boolean)
  @IsBoolean()
  isActive: boolean;
}
