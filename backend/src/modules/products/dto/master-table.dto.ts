import { IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DesignMasterType, FindingPriceIn, LaborApplyMode } from '../entities/design-master.entity';
import { OverheadRuleApplyMode } from '../entities/design-master-tables.entity';

export class MasterTableTypeParamDto {
  @IsEnum(DesignMasterType)
  masterType: DesignMasterType;
}

export class FindMasterTableQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jewelryGroupId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  metalId?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'ALL'])
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
}

export class SaveMasterTableDto {
  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  aliasName?: string;

  @IsOptional()
  @IsString()
  scopeKey?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jewelryGroupId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  metalId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  metalColorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  metalPurityId?: number;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  findingNo?: string;

  @IsOptional()
  @IsString()
  metalCaratage?: string;

  @IsOptional()
  @IsEnum(FindingPriceIn)
  priceIn?: FindingPriceIn;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pricePerUnit?: number;

  @IsOptional()
  @IsString()
  dimensions?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weightPerUnit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  purityPercentage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  marketPricePerOunce?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  marketPricePerGm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  livePricePerGm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  defaultWastagePercent?: number;

  @IsOptional()
  @IsEnum(LaborApplyMode)
  laborApplyMode?: LaborApplyMode;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  flatCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ratePerStone?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ratePerGram?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ratePerGroup?: number;

  @IsOptional()
  @IsEnum(OverheadRuleApplyMode)
  overheadApplyMode?: OverheadRuleApplyMode;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ratePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  flatAmount?: number;
}
