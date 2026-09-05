import { IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  DesignMasterType,
  FindingPriceIn,
  LaborApplyMode,
  OverheadRuleApplyMode,
} from '../entities/design-master-tables.entity';

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

  @IsOptional()
  @IsString()
  stockType?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  stone?: string;

  @IsOptional()
  @IsString()
  shape?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  cut?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  quality?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;
}

export class FindOneMasterTableDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsString()
  aliasName?: string;

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  metalCaratageId?: number;

  @IsOptional()
  @IsString()
  findingNo?: string;

  @IsOptional()
  @IsEnum(OverheadRuleApplyMode)
  overheadApplyMode?: OverheadRuleApplyMode;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'ALL'])
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
}

export class SaveMasterTableDto {
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'displayColor must be a 6-digit HEX color' })
  displayColor?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  value?: string;

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  metalCaratageId?: number;

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
  @IsIn([...Object.values(FindingPriceIn), 'WT', 'PCS'])
  priceIn?: FindingPriceIn | 'WT' | 'PCS';

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

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  packetName?: string;

  @IsOptional()
  @IsString()
  stockType?: string;

  @IsOptional()
  @IsString()
  stone?: string;

  @IsOptional()
  @IsString()
  shape?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  cut?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  quality?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stoneId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shapeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cutId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  colorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qualityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sellingPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weightPerPc?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pieces?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsIn(['CTS', 'GMS'])
  weightUnit?: 'CTS' | 'GMS';
}
