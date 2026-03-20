import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export enum ProductDurationType {
  MINUTES = 'MINUTES',
  HOURS = 'HOURS',
  DAYS = 'DAYS',
}

export enum PricingIncrementBy {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export class DesignMetalDto {
  @IsString()
  @IsOptional()
  goldColour?: string;

  @IsString()
  @IsOptional()
  metalCaratage?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  netWt?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  wastagePercent?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  wastageWt?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalWt?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerGm?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  components?: number;
}

export class DesignGemstoneDto {
  @IsUUID()
  @IsOptional()
  packetId?: string;

  @IsString()
  @IsOptional()
  stone?: string;

  @IsString()
  @IsOptional()
  shape?: string;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  cut?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  quality?: string;

  @IsString()
  @IsOptional()
  stoneType?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  wtPerPcs?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  pcs?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  wtInCts?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerCt?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;
}

export class DesignLaborDto {
  @IsString()
  @IsOptional()
  laborHead?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  laborPerUnit?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  unitQty?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  laborValue?: number;
}

export class DesignFindingDto {
  @IsString()
  @IsOptional()
  findingHead?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  pricePerUnit?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  units?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  totalWeight?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  findingValue?: number;
}

export class DesignProcessStageDto {
  @IsString()
  processStage: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  netWeight?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;

  @IsEnum(ProductDurationType)
  @IsOptional()
  durationType?: ProductDurationType;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class DesignPricingTierDto {
  @IsString()
  name: string;

  @IsEnum(PricingIncrementBy)
  @IsOptional()
  incrementBy?: PricingIncrementBy;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  weightBy?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  value?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  sellingPrice?: number;

  @IsString()
  @IsOptional()
  code?: string;
}

export class DesignVendorDto {
  @IsString()
  supplierName: string;

  @IsString()
  @IsOptional()
  stockType?: string;

  @IsString()
  @IsOptional()
  supplierStyleNo?: string;
}

export class UploadStlFileDto {
  @IsString()
  fileName: string;

  @IsUrl({ require_tld: false }, { message: 'fileUrl must be a valid URL' })
  fileUrl: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateProductDto {
  @IsString()
  @IsOptional()
  designNo?: string;

  @IsString()
  @IsOptional()
  designName?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  jewelryGroup: string;

  @IsString()
  @IsOptional()
  collection?: string;

  @IsString()
  @IsOptional()
  jewelrySize?: string;

  @IsString()
  @IsOptional()
  stage?: string;

  @IsString()
  @IsOptional()
  diamondSpread?: string;

  @IsString()
  @IsOptional()
  diamondType?: string;

  @IsString()
  @IsOptional()
  designStatus?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  drawerLocation?: string;

  @IsString()
  @IsOptional()
  designDescription?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @IsString()
  @IsOptional()
  stlFileUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignMetalDto)
  @IsOptional()
  metals?: DesignMetalDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignGemstoneDto)
  @IsOptional()
  gemstones?: DesignGemstoneDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignLaborDto)
  @IsOptional()
  labors?: DesignLaborDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignFindingDto)
  @IsOptional()
  findings?: DesignFindingDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignProcessStageDto)
  @IsOptional()
  processStages?: DesignProcessStageDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignPricingTierDto)
  @IsOptional()
  pricingTiers?: DesignPricingTierDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignVendorDto)
  @IsOptional()
  vendors?: DesignVendorDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  relevantDesignIds?: string[];

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class GetNextDesignNoQueryDto {
  @IsString()
  jewelryGroup: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  branchId?: string;
}

export class GetNextDesignVersionQueryDto {
  @IsString()
  designNo: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  branchId?: string;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  designNo?: string;

  @IsString()
  @IsOptional()
  designName?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  jewelryGroup?: string;

  @IsString()
  @IsOptional()
  collection?: string;

  @IsString()
  @IsOptional()
  jewelrySize?: string;

  @IsString()
  @IsOptional()
  stage?: string;

  @IsString()
  @IsOptional()
  diamondSpread?: string;

  @IsString()
  @IsOptional()
  diamondType?: string;

  @IsString()
  @IsOptional()
  designStatus?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  drawerLocation?: string;

  @IsString()
  @IsOptional()
  designDescription?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @IsString()
  @IsOptional()
  stlFileUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignMetalDto)
  @IsOptional()
  metals?: DesignMetalDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignGemstoneDto)
  @IsOptional()
  gemstones?: DesignGemstoneDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignLaborDto)
  @IsOptional()
  labors?: DesignLaborDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignFindingDto)
  @IsOptional()
  findings?: DesignFindingDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignProcessStageDto)
  @IsOptional()
  processStages?: DesignProcessStageDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignPricingTierDto)
  @IsOptional()
  pricingTiers?: DesignPricingTierDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignVendorDto)
  @IsOptional()
  vendors?: DesignVendorDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  relevantDesignIds?: string[];

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateProductStatusDto {
  @Type(() => Boolean)
  @IsBoolean()
  isActive: boolean;
}

export class ReplaceRelevantDesignsDto {
  @IsArray()
  @IsString({ each: true })
  designIds: string[];
}

export class ReplaceProcessStagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignProcessStageDto)
  processStages: DesignProcessStageDto[];
}

export class ReplacePricingTiersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignPricingTierDto)
  pricingTiers: DesignPricingTierDto[];
}

export class ReplaceVendorsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignVendorDto)
  vendors: DesignVendorDto[];
}

export class FindProductsQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(['ACTIVE', 'INACTIVE', 'ALL'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  jewelryGroup?: string;

  @IsString()
  @IsOptional()
  collection?: string;

  @IsString()
  @IsOptional()
  jewelrySize?: string;

  @IsString()
  @IsOptional()
  tags?: string;

  @IsString()
  @IsOptional()
  stone?: string;

  @IsString()
  @IsOptional()
  shape?: string;

  @IsString()
  @IsOptional()
  cut?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  quality?: string;

  @IsString()
  @IsOptional()
  supplierName?: string;

  @IsString()
  @IsOptional()
  stage?: string;

  @IsString()
  @IsOptional()
  process?: string;

  @IsString()
  @IsOptional()
  goldColour?: string;

  @IsString()
  @IsOptional()
  pricingTier?: string;

  @IsString()
  @IsOptional()
  creationFrom?: string;

  @IsString()
  @IsOptional()
  creationTo?: string;

  @IsString()
  @IsOptional()
  modificationFrom?: string;

  @IsString()
  @IsOptional()
  modificationTo?: string;
}

export class FindPacketsQueryDto {
  @IsIn(['ACTIVE', 'INACTIVE', 'ALL'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';

  @IsString()
  @IsOptional()
  stockType?: string;

  @IsString()
  @IsOptional()
  stone?: string;

  @IsString()
  @IsOptional()
  shape?: string;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  cut?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  quality?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number;
}

export class CreateStonePacketDto {
  @IsString()
  packetName: string;

  @IsString()
  @IsOptional()
  stockType?: string;

  @IsString()
  @IsOptional()
  stone?: string;

  @IsString()
  @IsOptional()
  shape?: string;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  cut?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  quality?: string;

  @IsIn(['WT', 'PCS'])
  @IsOptional()
  priceIn?: 'WT' | 'PCS';

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  sellingPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  @IsOptional()
  weightPerPc?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  pieces?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  @IsOptional()
  weight?: number;

  @IsIn(['CTS', 'GMS'])
  @IsOptional()
  weightUnit?: 'CTS' | 'GMS';
}

export class UpdateStonePacketDto {
  @IsString()
  @IsOptional()
  packetName?: string;

  @IsString()
  @IsOptional()
  stockType?: string;

  @IsString()
  @IsOptional()
  stone?: string;

  @IsString()
  @IsOptional()
  shape?: string;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  cut?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  quality?: string;

  @IsIn(['WT', 'PCS'])
  @IsOptional()
  priceIn?: 'WT' | 'PCS';

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  sellingPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  @IsOptional()
  weightPerPc?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  pieces?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  @IsOptional()
  weight?: number;

  @IsIn(['CTS', 'GMS'])
  @IsOptional()
  weightUnit?: 'CTS' | 'GMS';
}

export class UpdateStonePacketStatusDto {
  @Type(() => Boolean)
  @IsBoolean()
  isActive: boolean;
}

export enum DesignMasterType {
  JEWELRY_GROUP = 'JEWELRY_GROUP',
  COLLECTION = 'COLLECTION',
  JEWELRY_SIZE = 'JEWELRY_SIZE',
  TAG = 'TAG',
  DESIGN_STATUS = 'DESIGN_STATUS',
  STAGE = 'STAGE',
  METAL_NAME = 'METAL_NAME',
  METAL_COLOR = 'METAL_COLOR',
  METAL_PURITY = 'METAL_PURITY',
  METAL_CARATAGE = 'METAL_CARATAGE',
  GOLD_COLOUR = 'GOLD_COLOUR',
  DIAMOND_TYPE = 'DIAMOND_TYPE',
  DIAMOND_SPREAD = 'DIAMOND_SPREAD',
  LABOR_HEAD = 'LABOR_HEAD',
  FINDING_HEAD = 'FINDING_HEAD',
  PACKET_STONE = 'PACKET_STONE',
  PACKET_SHAPE = 'PACKET_SHAPE',
  PACKET_SIZE = 'PACKET_SIZE',
  PACKET_CUT = 'PACKET_CUT',
  PACKET_COLOR = 'PACKET_COLOR',
  PACKET_QUALITY = 'PACKET_QUALITY',
}

export enum FindingPriceIn {
  PIECES = 'PIECES',
  GRAM = 'GRAM',
  PAIR = 'PAIR',
  INCHES = 'INCHES',
}

export class FindDesignMastersQueryDto {
  @IsEnum(DesignMasterType)
  @IsOptional()
  type?: DesignMasterType;

  @IsIn(['ACTIVE', 'INACTIVE', 'ALL'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';

  @IsString()
  @IsOptional()
  search?: string;
}

export class CreateDesignMasterDto {
  @IsEnum(DesignMasterType)
  masterType: DesignMasterType;

  @IsString()
  value: string;

  @IsString()
  @IsOptional()
  aliasName?: string;

  @IsString()
  @IsOptional()
  jewelryGroupId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  findingNo?: string;

  @IsString()
  @IsOptional()
  metalCaratage?: string;

  @IsEnum(FindingPriceIn)
  @IsOptional()
  priceIn?: FindingPriceIn;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerUnit?: number;

  @IsString()
  @IsOptional()
  dimensions?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  weightPerUnit?: number;

  @IsString()
  @IsOptional()
  metalName?: string;

  @IsString()
  @IsOptional()
  metalColor?: string;

  @IsString()
  @IsOptional()
  metalPurity?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  purityPercentage?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  marketPricePerOunce?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  marketPricePerGm?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  livePricePerGm?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultWastagePercent?: number;
}

export class UpdateDesignMasterDto {
  @IsString()
  @IsOptional()
  value?: string;

  @IsString()
  @IsOptional()
  aliasName?: string;

  @IsString()
  @IsOptional()
  jewelryGroupId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  findingNo?: string;

  @IsString()
  @IsOptional()
  metalCaratage?: string;

  @IsEnum(FindingPriceIn)
  @IsOptional()
  priceIn?: FindingPriceIn;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerUnit?: number;

  @IsString()
  @IsOptional()
  dimensions?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  weightPerUnit?: number;

  @IsString()
  @IsOptional()
  metalName?: string;

  @IsString()
  @IsOptional()
  metalColor?: string;

  @IsString()
  @IsOptional()
  metalPurity?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  purityPercentage?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  marketPricePerOunce?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  marketPricePerGm?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  livePricePerGm?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultWastagePercent?: number;
}

export class UpdateDesignMasterStatusDto {
  @Type(() => Boolean)
  @IsBoolean()
  isActive: boolean;
}
