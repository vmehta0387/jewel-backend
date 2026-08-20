import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
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

export enum MobileCatalogCategory {
  RINGS = 'rings',
  BRACELETS = 'bracelets',
  STUDS = 'studs',
  NECKLACES = 'necklaces',
}

export class DesignMetalDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  metalCaratageId?: number;

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  packetId?: number;

  @IsString()
  @IsOptional()
  stone?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  stoneId?: number;

  @IsString()
  @IsOptional()
  shape?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  shapeId?: number;

  @IsString()
  @IsOptional()
  size?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  sizeId?: number;

  @IsString()
  @IsOptional()
  cut?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  cutId?: number;

  @IsString()
  @IsOptional()
  color?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  colorId?: number;

  @IsString()
  @IsOptional()
  quality?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  qualityId?: number;

  @IsString()
  @IsOptional()
  stoneType?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  stoneTypeId?: number;

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  laborHeadId?: number;

  @IsString()
  @IsOptional()
  laborHead?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  laborRuleId?: number;

  @IsString()
  @IsOptional()
  laborRule?: string;

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

export class DesignOverheadDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  overheadRuleId?: number;

  @IsString()
  @IsOptional()
  overheadHead?: string;

  @IsString()
  @IsOptional()
  overheadApplyMode?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  ratePercent?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  flatAmount?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  overheadValue?: number;
}

export class DesignFindingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  findingHeadId?: number;

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  processStageId?: number;

  @IsString()
  @IsOptional()
  processStage?: string;

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  vendorNameId?: number;

  @IsString()
  @IsOptional()
  supplierName?: string;

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

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  familyDesignId?: number;

  @IsString()
  @IsOptional()
  designName?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  companyId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  branchId?: number;

  @IsString()
  @IsOptional()
  jewelryGroup?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  jewelryGroupId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  collectionId?: number;

  @IsString()
  @IsOptional()
  collection?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  jewelrySizeId?: number;

  @IsString()
  @IsOptional()
  jewelrySize?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  stageId?: number;

  @IsString()
  @IsOptional()
  stage?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  diamondSpreadId?: number;

  @IsString()
  @IsOptional()
  diamondSpread?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  diamondTypeId?: number;

  @IsString()
  @IsOptional()
  diamondType?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  diamondWeightId?: number;

  @IsString()
  @IsOptional()
  diamondWeight?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  diamondQualityId?: number;

  @IsString()
  @IsOptional()
  diamondQuality?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  designStatusId?: number;

  @IsString()
  @IsOptional()
  designStatus?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  metalCaratageId?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @IsOptional()
  tagIds?: number[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  tagsId?: number;

  @IsString()
  @IsOptional()
  drawerLocation?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  otherWeight?: number;

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
  ijewelModelId?: string;

  @IsString()
  @IsOptional()
  ijewelBaseName?: string;

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
  @Type(() => DesignOverheadDto)
  @IsOptional()
  overheads?: DesignOverheadDto[];

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
  @IsNumber({}, { each: true })
  @IsOptional()
  relevantDesignIds?: number[];

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class GetNextDesignNoQueryDto {
  @IsString()
  jewelryGroup: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  companyId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  branchId?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.trim().toLowerCase() === 'true';
    }
    return false;
  })
  structured?: boolean;
}

export class GetNextDesignVersionQueryDto {
  @IsString()
  designNo: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  companyId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  branchId?: number;
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

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  companyId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  branchId?: number;

  @IsString()
  @IsOptional()
  jewelryGroup?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  jewelryGroupId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  collectionId?: number;

  @IsString()
  @IsOptional()
  collection?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  jewelrySizeId?: number;

  @IsString()
  @IsOptional()
  jewelrySize?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  stageId?: number;

  @IsString()
  @IsOptional()
  stage?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  diamondSpreadId?: number;

  @IsString()
  @IsOptional()
  diamondSpread?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  diamondTypeId?: number;

  @IsString()
  @IsOptional()
  diamondType?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  diamondWeightId?: number;

  @IsString()
  @IsOptional()
  diamondWeight?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  diamondQualityId?: number;

  @IsString()
  @IsOptional()
  diamondQuality?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  designStatusId?: number;

  @IsString()
  @IsOptional()
  designStatus?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  metalCaratageId?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @IsOptional()
  tagIds?: number[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  tagsId?: number;

  @IsString()
  @IsOptional()
  drawerLocation?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  otherWeight?: number;

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
  ijewelModelId?: string;

  @IsString()
  @IsOptional()
  ijewelBaseName?: string;

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
  @Type(() => DesignOverheadDto)
  @IsOptional()
  overheads?: DesignOverheadDto[];

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
  @IsNumber({}, { each: true })
  @IsOptional()
  relevantDesignIds?: number[];

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

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  primaryOnly?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  summaryOnly?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  selectorOnly?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  familyDesignId?: string;

  @IsIn(['ACTIVE', 'INACTIVE', 'ALL'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  companyId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  branchId?: number;

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
  designStatus?: string;

  @IsString()
  @IsOptional()
  process?: string;

  @IsString()
  @IsOptional()
  metalCaratage?: string;

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

export class FindMobileTrendingProductsQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  @IsOptional()
  limit?: number;
}

export class FindMobileCatalogProductsQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  shape?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  collection?: string;

  @IsString()
  @IsOptional()
  diamondType?: string;

  @IsIn(['ALL', 'UNDER_2000', 'BETWEEN_2000_5000', 'ABOVE_5000'])
  @IsOptional()
  priceBand?: 'ALL' | 'UNDER_2000' | 'BETWEEN_2000_5000' | 'ABOVE_5000';

  @IsIn(['recent', 'priceAsc', 'priceDesc', 'designAsc', 'designDesc'])
  @IsOptional()
  sort?: 'recent' | 'priceAsc' | 'priceDesc' | 'designAsc' | 'designDesc';
}

export class ResolveMobileDesignConfiguratorQueryDto {
  @IsIn(['diamondType', 'shape', 'style', 'metalCaratage', 'weight', 'quality', 'ringSize'])
  @IsOptional()
  selectedKey?: 'diamondType' | 'shape' | 'style' | 'metalCaratage' | 'weight' | 'quality' | 'ringSize';

  // ID-based filters (preferred — exact match)
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  diamondTypeId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  shapeId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  styleId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  metalCaratageId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  weightId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  qualityId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  ringSizeId?: number;

  // Text-based filters (fallback for legacy clients)
  @IsString()
  @IsOptional()
  diamondType?: string;

  @IsString()
  @IsOptional()
  shape?: string;

  @IsString()
  @IsOptional()
  style?: string;

  @IsString()
  @IsOptional()
  metalCaratage?: string;

  @IsString()
  @IsOptional()
  weight?: string;

  @IsString()
  @IsOptional()
  quality?: string;

  @IsString()
  @IsOptional()
  ringSize?: string;
}

export class FindDesignMediaLibraryQueryDto {
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

  @IsIn(['ALL', 'IMAGE', 'VIDEO', 'STL', 'GALLERY'])
  @IsOptional()
  type?: 'ALL' | 'IMAGE' | 'VIDEO' | 'STL' | 'GALLERY';
}

export class FindPacketsQueryDto {
  @IsString()
  @IsOptional()
  barcode?: string;

  @IsIn(['ACTIVE', 'INACTIVE', 'ALL'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';

  @IsString()
  @IsOptional()
  stockType?: string;

  @IsString()
  @IsOptional()
  stone?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  stoneId?: number;

  @IsString()
  @IsOptional()
  shape?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  shapeId?: number;

  @IsString()
  @IsOptional()
  size?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  sizeId?: number;

  @IsString()
  @IsOptional()
  cut?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  cutId?: number;

  @IsString()
  @IsOptional()
  color?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  colorId?: number;

  @IsString()
  @IsOptional()
  quality?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  qualityId?: number;

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
  @IsOptional()
  barcode?: string;

  @IsString()
  packetName: string;

  @IsString()
  @IsOptional()
  stockType?: string;

  @IsString()
  @IsOptional()
  stone?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  stoneId?: number;

  @IsString()
  @IsOptional()
  shape?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  shapeId?: number;

  @IsString()
  @IsOptional()
  size?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  sizeId?: number;

  @IsString()
  @IsOptional()
  cut?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  cutId?: number;

  @IsString()
  @IsOptional()
  color?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  colorId?: number;

  @IsString()
  @IsOptional()
  quality?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  qualityId?: number;

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
  DIAMOND_TYPE = 'DIAMOND_TYPE',
  DIAMOND_SPREAD = 'DIAMOND_SPREAD',
  DIAMOND_WEIGHT = 'DIAMOND_WEIGHT',
  DIAMOND_QUALITY = 'DIAMOND_QUALITY',
  VENDOR_NAME = 'VENDOR_NAME',
  LABOR_HEAD = 'LABOR_HEAD',
  LABOR_RULE = 'LABOR_RULE',
  OVERHEAD_RULE = 'OVERHEAD_RULE',
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

export enum LaborApplyMode {
  FLAT = 'FLAT',
  PER_STONE = 'PER_STONE',
  PER_GRAM = 'PER_GRAM',
  PER_GROUP = 'PER_GROUP',
}

export enum OverheadApplyMode {
  PERCENT_MATERIALS = 'PERCENT_MATERIALS',
  PERCENT_BOM_SUBTOTAL = 'PERCENT_BOM_SUBTOTAL',
  FLAT = 'FLAT',
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

// export class CreateDesignMasterDto {
//   @IsEnum(DesignMasterType)
//   masterType: DesignMasterType;

//   @IsString()
//   value: string;

//   @IsString()
//   @IsOptional()
//   aliasName?: string;

//   @IsString()
//   @IsOptional()
//   jewelryGroupId?: string;

//   @IsString()
//   @IsOptional()
//   description?: string;

//   @IsString()
//   @IsOptional()
//   vendorEmail?: string;

//   @IsString()
//   @IsOptional()
//   findingNo?: string;

//   @IsString()
//   @IsOptional()
//   metalCaratage?: string;

//   @IsEnum(FindingPriceIn)
//   @IsOptional()
//   priceIn?: FindingPriceIn;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   pricePerUnit?: number;

//   @IsString()
//   @IsOptional()
//   dimensions?: string;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   weightPerUnit?: number;

//   @IsString()
//   @IsOptional()
//   metalName?: string;

//   @IsString()
//   @IsOptional()
//   metalColor?: string;

//   @IsString()
//   @IsOptional()
//   metalPurity?: string;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   purityPercentage?: number;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   marketPricePerOunce?: number;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   marketPricePerGm?: number;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   livePricePerGm?: number;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   defaultWastagePercent?: number;

//   @IsEnum(LaborApplyMode)
//   @IsOptional()
//   laborApplyMode?: LaborApplyMode;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   flatCost?: number;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   ratePerStone?: number;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   ratePerGram?: number;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   ratePerGroup?: number;

//   @IsEnum(OverheadApplyMode)
//   @IsOptional()
//   overheadApplyMode?: OverheadApplyMode;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   ratePercent?: number;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   flatAmount?: number;
// }

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
  vendorEmail?: string;

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

  @IsEnum(LaborApplyMode)
  @IsOptional()
  laborApplyMode?: LaborApplyMode;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  flatCost?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  ratePerStone?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  ratePerGram?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  ratePerGroup?: number;

  @IsEnum(OverheadApplyMode)
  @IsOptional()
  overheadApplyMode?: OverheadApplyMode;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  ratePercent?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  flatAmount?: number;
}

export class UpdateDesignMasterStatusDto {
  @Type(() => Boolean)
  @IsBoolean()
  isActive: boolean;
}
