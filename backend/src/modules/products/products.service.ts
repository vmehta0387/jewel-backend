import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import * as XLSX from 'xlsx';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import {
  CreateProductDto,
  GetNextDesignNoQueryDto,
  GetNextDesignVersionQueryDto,
  DesignFindingDto,
  DesignGemstoneDto,
  DesignLaborDto,
  DesignMetalDto,
  DesignOverheadDto,
  FindDesignMediaLibraryQueryDto,
  DesignPricingTierDto,
  DesignProcessStageDto,
  DesignVendorDto,
  FindMobileCatalogProductsQueryDto,
  FindMobileTrendingProductsQueryDto,
  FindProductsQueryDto,
  MobileCatalogCategory,
  PricingIncrementBy,
  ProductDurationType,
  ResolveMobileDesignConfiguratorQueryDto,
  UpdateProductDto,
  UploadStlFileDto,
} from './dto/product.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../../common/enums/user-role.enum';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { Design } from './entities/design.entity';
import { DesignFinding } from './entities/design-finding.entity';
import { DesignGemstone } from './entities/design-gemstone.entity';
import { DesignTag } from './entities/design-tag.entity';
import { DesignHistory } from './entities/design-history.entity';
import { MetalPriceHistory } from './entities/metal-price-history.entity';
import { DesignLabor } from './entities/design-labor.entity';
import { DesignOverhead } from './entities/design-overhead.entity';
import { DesignMetal } from './entities/design-metal.entity';
import { DesignPricingIncrementBy, DesignPricingTier } from './entities/design-pricing-tier.entity';
import { DesignDurationType, DesignProcessStage } from './entities/design-process-stage.entity';
import { DesignRelevant } from './entities/design-relevant.entity';
import { DesignStlFile } from './entities/design-stl-file.entity';
import { DesignVendor } from './entities/design-vendor.entity';
import { StonePacket, StonePacketPriceIn, StoneWeightUnit } from './entities/stone-packet.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { DesignMasterType } from './entities/design-master-tables.entity';
import { GlobalBasePrice, GlobalBasePriceCategory } from '../pricing/entities/global-base-price.entity';
import { User } from '../users/entities/user.entity';
import { DesignMediaLibrary, DesignMediaType } from './entities/design-media-library.entity';
import { NotificationEventsService } from '../notification-events/notification-events.service';
import { NotificationPriority } from '../notifications/entities/notification.entity';
import { PricingService } from '../pricing/pricing.service';
import { MasterTablesService } from './master-tables.service';
import { JEWELRY_GROUP_IDS } from './constants/product-master.constants';


interface ScopeResult {
  companyId: number | null;
  branchId: number | null;
}

type MobileConfiguratorKey =
  | 'diamondType'
  | 'stone'
  | 'shape'
  | 'style'
  | 'metalCaratage'
  | 'weight'
  | 'quality'
  | 'ringSize';

interface MobileConfiguratorOption {
  id: number | null;
  label: string;
}

interface NormalizedMetalRow {
  metalCaratageId: number | null;
  metalCaratage: string | null;
  netWt: number;
  wastagePercent: number;
  wastageWt: number;
  totalWt: number;
  pricePerGm: number;
  value: number;
  components: number;
}

interface NormalizedGemstoneRow {
  packetId: number | null;
  stoneId: number | null;
  stone: string | null;
  shapeId: number | null;
  shape: string | null;
  sizeId: number | null;
  size: string | null;
  cutId: number | null;
  cut: string | null;
  colorId: number | null;
  color: string | null;
  qualityId: number | null;
  quality: string | null;
  stoneTypeId: number | null;
  stoneType: string | null;
  wtPerPcs: number;
  pcs: number;
  wtInCts: number;
  pricePerCt: number;
  amount: number;
}

interface NormalizedLaborRow {
  laborHeadId: number | null;
  laborHead: string | null;
  laborRuleId: number | null;
  laborRule: string | null;
  laborPerUnit: number;
  unitQty: number;
  laborValue: number;
}

interface NormalizedOverheadRow {
  overheadRuleId: number | null;
  overheadHead: string | null;
  overheadApplyMode: string | null;
  ratePercent: number | null;
  flatAmount: number | null;
  overheadValue: number;
}

interface NormalizedFindingRow {
  findingHeadId: number | null;
  findingHead: string | null;
  pricePerUnit: number;
  units: number;
  totalWeight: number;
  findingValue: number;
}

interface SummaryBreakdown {
  metalValue: number;
  gemValue: number;
  laborValue: number;
  overheadValue: number;
  findingValue: number;
  totalValue: number;
  grossWeight: number;
}

interface GlobalRateMaps {
  metalRates: Map<string, number>;
  diamondRatesByType: Map<string, number>;
  diamondRatesByTypeAndSize: Map<string, number>;
}

interface MasterRef {
  id: number | null;
  value: string | null;
  aliasName: string | null;
}

type ProductMasterRow = Record<string, any> & {
  id: number;
  value: string;
  aliasName?: string | null;
};

interface PacketMasterSummary {
  id: number;
  name: string;
  value: string;
}

type CompactPacketResponse = Omit<
  StonePacket,
  'stoneMaster' | 'shapeMaster' | 'sizeMaster' | 'cutMaster' | 'colorMaster' | 'qualityMaster'
> & {
  stoneMaster: PacketMasterSummary | null;
  shapeMaster: PacketMasterSummary | null;
  sizeMaster: PacketMasterSummary | null;
  cutMaster: PacketMasterSummary | null;
  colorMaster: PacketMasterSummary | null;
  qualityMaster: PacketMasterSummary | null;
};

interface DesignMasterRefs {
  jewelryGroup: MasterRef;
  collection: MasterRef;
  jewelrySize: MasterRef;
  stage: MasterRef;
  diamondSpread: MasterRef;
  diamondType: MasterRef;
  diamondWeight: MasterRef;
  diamondQuality: MasterRef;
  designStatus: MasterRef;
  metalCaratage: MasterRef;
}

interface MasterImportRow {
  value: string;
  aliasName?: string;
  description?: string;
  jewelryGroup?: string;
  findingNo?: string;
  metalCaratage?: string;
  priceIn?: string;
  pricePerUnit?: string | number;
  dimensions?: string;
  weightPerUnit?: string | number;
  metalName?: string;
  metalColor?: string;
  metalPurity?: string;
  purityPercentage?: string | number;
  marketPricePerOunce?: string | number;
  marketPricePerGm?: string | number;
  livePricePerGm?: string | number;
  defaultWastagePercent?: string | number;
  laborApplyMode?: string;
  flatCost?: string | number;
  ratePerStone?: string | number;
  ratePerGram?: string | number;
  ratePerGroup?: string | number;
  overheadApplyMode?: string;
  ratePercent?: string | number;
  flatAmount?: string | number;
  isActive?: string;
}

interface PacketImportRow {
  barcode?: string;
  packetName: string;
  stone?: string;
  shape?: string;
  size?: string;
  cut?: string;
  color?: string;
  quality?: string;
  priceIn?: string;
  sellingPrice?: string | number;
  weightPerPc?: string | number;
  pieces?: string | number;
  weight?: string | number;
  weightUnit?: string;
  isActive?: string;
}

interface DesignImportRow {
  designNo: string;
  designName?: string;
  version?: string;
  companyCode?: string;
  branchCode?: string;
  jewelryGroup?: string;
  collection?: string;
  jewelrySize?: string;
  stage?: string;
  diamondSpread?: string;
  diamondType?: string;
  diamondWeight?: string;
  diamondQuality?: string;
  designStatus?: string;
  tags?: string;
  drawerLocation?: string;
  otherWeight?: string | number;
  imageKeys?: string;
  stlKey?: string;
  designDescription?: string;
  remarks?: string;
  isActive?: string;
}

interface DesignMetalImportRow {
  designNo: string;
  version?: string;
  metalCaratage?: string;
  netWt?: string | number;
  wastagePercent?: string | number;
  wastageWt?: string | number;
  totalWt?: string | number;
  pricePerGm?: string | number;
  value?: string | number;
}

interface DesignGemstoneImportRow {
  designNo: string;
  version?: string;
  packetBarcode?: string;
  packetName?: string;
  stone?: string;
  shape?: string;
  size?: string;
  cut?: string;
  color?: string;
  quality?: string;
  stoneType?: string;
  wtPerPcs?: string | number;
  pcs?: string | number;
  wtInCts?: string | number;
  pricePerCt?: string | number;
  amount?: string | number;
}

interface DesignLaborImportRow {
  designNo: string;
  version?: string;
  laborHead?: string;
  laborPerUnit?: string | number;
  unitQty?: string | number;
  laborValue?: string | number;
}

interface DesignFindingImportRow {
  designNo: string;
  version?: string;
  findingHead?: string;
  pricePerUnit?: string | number;
  units?: string | number;
  totalWeight?: string | number;
  findingValue?: string | number;
}

@Injectable()
export class ProductsService {
  private readonly galleryImageMaxBytes = 5 * 1024 * 1024;
  private readonly galleryVideoMaxBytes = 50 * 1024 * 1024;

  private s3Client: S3Client | null = null;
  private signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
  private signedUrlInflightCache = new Map<string, Promise<string>>();
  private mobileConfiguratorFamilyCache = new Map<string, { family: Design[]; expiresAt: number }>();
  private readonly mobileConfiguratorFamilyCacheTtlMs = 30 * 1000;
  private metalNameSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly signedUrlCacheSkewMs = 2 * 60 * 1000;
  private readonly masterImportHeaders = [
    'Value',
    'Alias Name',
    'Description',
    'Category',
    'Finding No',
    'Metal Caratage',
    'Price In',
    'Price Per Unit',
    'Dimensions',
    'Weight Per Unit',
    'Metal Name',
    'Metal Color',
    'Metal Purity',
    'Purity Percentage',
    'Market Price Per Ounce',
    'Market Price Per Gm',
    'Live Price Per Gm',
    'Default Wastage Percent',
    'Labor Apply Mode',
    'Flat Cost',
    'Rate Per Stone',
    'Rate Per Gram',
    'Rate Per Group',
    'Overhead Apply Mode',
    'Rate Percent',
    'Flat Amount',
    'Status',
  ] as const;

  private readonly packetImportHeaders = [
    'Barcode',
    'Packet Name',
    'Stone',
    'Shape',
    'Cut',
    'Size',
    'Color',
    'Quality',
    'Price In',
    'Selling Price',
    'Weight Per Pc',
    'Pieces',
    'Weight',
    'Weight Unit',
    'Status',
  ] as const;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Design)
    private readonly designRepo: Repository<Design>,
    @InjectRepository(DesignMetal)
    private readonly metalRepo: Repository<DesignMetal>,
    @InjectRepository(DesignGemstone)
    private readonly gemstoneRepo: Repository<DesignGemstone>,
    @InjectRepository(DesignTag)
    private readonly designTagRepo: Repository<DesignTag>,
    @InjectRepository(DesignLabor)
    private readonly laborRepo: Repository<DesignLabor>,
    @InjectRepository(DesignOverhead)
    private readonly overheadRepo: Repository<DesignOverhead>,
    @InjectRepository(DesignFinding)
    private readonly findingRepo: Repository<DesignFinding>,
    @InjectRepository(DesignProcessStage)
    private readonly processStageRepo: Repository<DesignProcessStage>,
    @InjectRepository(DesignPricingTier)
    private readonly pricingTierRepo: Repository<DesignPricingTier>,
    @InjectRepository(DesignVendor)
    private readonly vendorRepo: Repository<DesignVendor>,
    @InjectRepository(DesignRelevant)
    private readonly relevantRepo: Repository<DesignRelevant>,
    @InjectRepository(DesignStlFile)
    private readonly stlFileRepo: Repository<DesignStlFile>,
    @InjectRepository(DesignHistory)
    private readonly historyRepo: Repository<DesignHistory>,
    @InjectRepository(MetalPriceHistory)
    private readonly metalPriceHistoryRepo: Repository<MetalPriceHistory>,
    @InjectRepository(StonePacket)
    private readonly packetRepo: Repository<StonePacket>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(GlobalBasePrice)
    private readonly globalBasePriceRepo: Repository<GlobalBasePrice>,
    @InjectRepository(DesignMediaLibrary)
    private readonly designMediaLibraryRepo: Repository<DesignMediaLibrary>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationEventsService: NotificationEventsService,
    private readonly pricingService: PricingService,
    private readonly masterTablesService: MasterTablesService,
  ) { }

  private compactPacketMaster(master: { id: number; value: string } | null | undefined): PacketMasterSummary | null {
    if (!master) {
      return null;
    }

    return {
      id: master.id,
      name: master.value,
      value: master.value,
    };
  }

  private toCompactPacketResponse(packet: StonePacket): CompactPacketResponse {
    return {
      ...packet,
      stoneMaster: this.compactPacketMaster(packet.stoneMaster),
      shapeMaster: this.compactPacketMaster(packet.shapeMaster),
      sizeMaster: this.compactPacketMaster(packet.sizeMaster),
      cutMaster: this.compactPacketMaster(packet.cutMaster),
      colorMaster: this.compactPacketMaster(packet.colorMaster),
      qualityMaster: this.compactPacketMaster(packet.qualityMaster),
    };
  }

  private joinPacketMasters<T extends { leftJoin: (property: string, alias: string) => T }>(qb: T): T {
    return qb
      .leftJoin('packet.stoneMaster', 'stoneMaster')
      .leftJoin('packet.shapeMaster', 'shapeMaster')
      .leftJoin('packet.sizeMaster', 'sizeMaster')
      .leftJoin('packet.cutMaster', 'cutMaster')
      .leftJoin('packet.colorMaster', 'colorMaster')
      .leftJoin('packet.qualityMaster', 'qualityMaster');
  }

  private selectPacketMasters<T extends { addSelect: (selection: string[]) => T }>(qb: T): T {
    return qb.addSelect([
      'stoneMaster.id',
      'stoneMaster.value',
      'shapeMaster.id',
      'shapeMaster.value',
      'sizeMaster.id',
      'sizeMaster.value',
      'cutMaster.id',
      'cutMaster.value',
      'colorMaster.id',
      'colorMaster.value',
      'qualityMaster.id',
      'qualityMaster.value',
    ]);
  }

  async create(dto: CreateProductDto, requester: AuthUser): Promise<any> {
    this.assertDesignCreateAccess(requester);
    const designMasterRefs = await this.resolveDesignMasterRefs(dto);
    const jewelryGroup = designMasterRefs.jewelryGroup.value;
    if (!this.isRingJewelryGroup(designMasterRefs.jewelryGroup.id)) {
      designMasterRefs.diamondSpread = { id: null, value: null, aliasName: null };
    }
    if (!jewelryGroup || !designMasterRefs.jewelryGroup.id) {
      throw new BadRequestException('jewelryGroup is required');
    }

    const scope = await this.resolveScope(dto.companyId, dto.branchId, requester);
    const version = this.normalizeVersion(dto.version);
    const requestedDesignNo = dto.designNo?.trim();

    const aliasIdentity = this.buildAliasDesignIdentity(designMasterRefs, dto.designName);
    const prefix = aliasIdentity.designNoPrefix || (await this.resolveJewelryGroupPrefix(jewelryGroup));

    let designNo: string;
    if (requestedDesignNo) {
      designNo = this.applyVersionToDesignNo(requestedDesignNo, version, designMasterRefs.jewelrySize.value);
      await this.assertUniqueDesign(designNo, version, scope.companyId, undefined);
    } else {
      designNo = await this.withDesignNoLock(scope.companyId, prefix, async () => {
        const generatedDesignNo = await this.generateNextDesignNo(prefix, scope.companyId);
        const versioned = this.applyVersionToDesignNo(generatedDesignNo, version, designMasterRefs.jewelrySize.value);
        await this.assertUniqueDesign(versioned, version, scope.companyId, undefined);
        return versioned;
      });
    }

    const baseDesignNo = this.normalizeBaseDesignNo(designNo);
    const familyDesignId = await this.resolveFamilyDesignId(dto.familyDesignId, designNo, scope);
    await this.assertUniqueFamilyVariantCombination(familyDesignId, designMasterRefs);
    const isPrimary = await this.resolvePrimaryVersionFlag(familyDesignId, baseDesignNo, version, scope);
    const resolvedDesignName = this.optionalText(dto.designName) || this.buildDefaultDesignName(jewelryGroup, designNo);
    await this.assertUniqueDesignName(resolvedDesignName, undefined, familyDesignId);

    const globalRateMaps = await this.getGlobalRateMaps();
    const metalCaratageRates = await this.getMetalCaratageRateMap();
    const normalizedMetals = await this.resolveNormalizedMetalRows(this.normalizeMetals(dto.metals || [], metalCaratageRates));
    const normalizedGemstones = await this.resolveNormalizedGemstoneRows(this.normalizeGemstones(
      dto.gemstones || [],
      designMasterRefs.diamondType.value,
      globalRateMaps,
    ));
    const normalizedLabors = await this.resolveNormalizedLaborRows(this.normalizeLabors(dto.labors || []));
    const normalizedOverheads = (
      await this.resolveNormalizedOverheadRows(this.normalizeOverheads(dto.overheads || []))
    ).concat(this.normalizeLegacyOverheadsFromLabors(dto.labors || []));
    const normalizedFindings = await this.resolveNormalizedFindingRows(this.normalizeFindings(dto.findings || []));
    await this.validateDesignRelationRefs(
      {
        processStages: dto.processStages || [],
        vendors: dto.vendors || [],
        relevantDesignIds: dto.relevantDesignIds || [],
      },
      {
        id: null,
        companyId: scope.companyId,
      },
      requester,
    );
    const summary = this.calculateSummary(
      normalizedMetals,
      normalizedGemstones,
      normalizedLabors,
      normalizedOverheads,
      normalizedFindings,
    );

    const ijewelModelId = this.optionalText(dto.ijewelModelId);
    const ijewelBaseName = this.optionalText(dto.ijewelBaseName);
    const resolvedIjewelBase =
      ijewelModelId && /^https?:\/\//i.test(ijewelModelId) ? null : ijewelBaseName;
    const barcode = await this.resolveDesignBarcode();

    const stlFileUrl = this.normalizePersistentStlFileUrl(dto.stlFileUrl);
    const design = this.designRepo.create({
      designNo,
      familyDesignId,
      barcode,
      designName: resolvedDesignName,
      version,
      companyId: scope.companyId,
      branchId: scope.branchId,
      jewelryGroupId: designMasterRefs.jewelryGroup.id,
      collectionId: designMasterRefs.collection.id,
      jewelrySizeId: designMasterRefs.jewelrySize.id,
      stageId: designMasterRefs.stage.id,
      diamondSpreadId: designMasterRefs.diamondSpread.id,
      diamondTypeId: designMasterRefs.diamondType.id,
      diamondWeightId: designMasterRefs.diamondWeight.id,
      diamondQualityId: designMasterRefs.diamondQuality.id,
      designStatusId: designMasterRefs.designStatus.id,
      metalCaratageId: designMasterRefs.metalCaratage.id,
      stoneInfo: this.summarizeGemstoneRows(normalizedGemstones),
      drawerLocation: this.optionalText(dto.drawerLocation),
      otherWeight: dto.otherWeight ?? null,
      designDescription: this.optionalText(dto.designDescription),
      remarks: this.optionalText(dto.remarks),
      metalValue: summary.metalValue,
      gemValue: summary.gemValue,
      laborValue: summary.laborValue + summary.overheadValue,
      findingValue: summary.findingValue,
      totalValue: summary.totalValue,
      grossWeight: summary.grossWeight,
      livePrice: summary.totalValue,
      stlFileUrl,
      imageUrls: this.normalizeGalleryUrls(dto.imageUrls),
      ijewelModelId,
      ijewelBaseName: resolvedIjewelBase,
      isActive: dto.isActive ?? true,
      isPrimary,
      createdBy: requester.id,
      updatedBy: requester.id,
    });

    const saved = await this.dataSource.transaction(async (manager) => {
      const designRepo = manager.getRepository(Design);
      const stlFileRepo = manager.getRepository(DesignStlFile);
      const parentBeforeCreate = familyDesignId
        ? await designRepo.findOne({
            where: { id: familyDesignId },
            select: ['id', 'jewelrySizeId'],
            lock: { mode: 'pessimistic_write' },
          })
        : null;
      const parentJewelrySizeId = parentBeforeCreate?.jewelrySizeId ?? null;

      let transactionSaved = await this.saveDesignWithUniqueBarcode(design, undefined, designRepo);
      if (!transactionSaved.familyDesignId) {
        transactionSaved.familyDesignId = Number(transactionSaved.id);
        transactionSaved = await this.saveDesignWithUniqueBarcode(transactionSaved, transactionSaved.id, designRepo);
      }

      if (parentBeforeCreate) {
        const parentAfterCreate = await designRepo.findOne({
          where: { id: parentBeforeCreate.id },
          select: ['id', 'jewelrySizeId'],
        });
        if (!parentAfterCreate || parentAfterCreate.jewelrySizeId !== parentJewelrySizeId) {
          throw new ConflictException('Base design Jewelry Size changed during version creation.');
        }
      }

      await this.syncDesignStlFileRecord(transactionSaved.id, transactionSaved.stlFileUrl, null, requester.id, stlFileRepo);
      return transactionSaved;
    });

    await this.replaceMetalRows(saved.id, normalizedMetals);
    await this.replaceGemstoneRows(saved.id, normalizedGemstones);
    await this.replaceDesignTags(saved.id, await this.resolveDesignTagIds(dto));
    await this.replaceLaborRows(saved.id, normalizedLabors);
    await this.replaceOverheadRows(saved.id, normalizedOverheads);
    await this.replaceFindingRows(saved.id, normalizedFindings);
    await this.replaceProcessStageRows(saved.id, dto.processStages || []);
    await this.replacePricingTierRows(saved.id, dto.pricingTiers || []);
    await this.replaceVendorRows(saved.id, dto.vendors || []);
    await this.setRelevantDesignLinks(saved, dto.relevantDesignIds || [], requester);

    await this.addHistory(saved.id, 'CREATED', 'Design added successfully.', requester.id);
    return this.findOne(saved.id, requester);
  }

  async exportDesignTemplate(): Promise<{ buffer: Buffer; fileName: string }> {
    const workbook = XLSX.utils.book_new();
    const designHeaders = [
      'Design No',
      'Design Name',
      'Version',
      'Company Code',
      'Branch Code',
      'Category',
      'Sub Category',
      'Jewelry Size',
      'Stage',
      'Diamond Spread',
      'Diamond Type',
      'Diamond Wt',
      'Diamond Quality',
      'Design Status',
      'Tags',
      'Drawer Location',
      'Other Wt',
      'Image Keys',
      'STL Key',
      'Design Description',
      'Remarks',
      'Status',
    ] as const;
    const metalHeaders = [
      'Design No',
      'Version',
      'Sort Order',
      'Metal Caratage',
      'Net Wt',
      'Wastage %',
      'Wastage Wt',
      'Total Wt',
      '@ Per Gm',
      'Value',
    ] as const;
    const gemstoneHeaders = [
      'Design No',
      'Version',
      'Sort Order',
      'Packet Barcode',
      'Packet',
      'Stone',
      'Shape',
      'Size',
      'Cut',
      'Color',
      'Quality',
      'Stone Type',
      'Wt/Pcs',
      'Pcs',
      'Wt (Cts)',
      '@ (P/Ct)',
      'Amount',
    ] as const;
    const laborHeaders = [
      'Design No',
      'Version',
      'Sort Order',
      'Labor Head',
      'Labor/Unit',
      'Unit Qty',
      'Labor Value',
    ] as const;
    const findingHeaders = [
      'Design No',
      'Version',
      'Sort Order',
      'Finding Head',
      'Price/Unit',
      'Units',
      'Total Weight',
      'Finding Value',
    ] as const;
    const designRows = [
      {
        'Design No': 'RING-0001',
        'Design Name': 'Classic Eternity Ring',
        Version: 'V1',
        'Company Code': '',
        'Branch Code': '',
        Category: 'Ring',
        'Sub Category': 'Eternity Bands',
        'Jewelry Size': 'US 6',
        Stage: 'Admin',
        'Diamond Spread': 'Full',
        'Diamond Type': 'Lab Diamonds',
        'Diamond Wt': '1.00 CT',
        'Diamond Quality': 'VVS',
        'Design Status': 'Active',
        Tags: 'eternity,classic',
        'Drawer Location': '',
        'Other Wt': '',
        'Image Keys': 's3://your-bucket/design-gallery/2026/04/03/ring-v1-front.jpg, s3://your-bucket/design-gallery/2026/04/03/ring-v1-side.jpg',
        'STL Key': 's3://your-bucket/design-stl/2026/04/03/ring-v1.stl',
        'Design Description': 'Imported from Excel',
        Remarks: '',
        Status: 'ACTIVE',
      },
    ];
    const metalRows = [
      {
        'Design No': 'RING-0001',
        Version: 'V1',
        'Sort Order': 1,
        'Metal Caratage': '18-Rose-Gold',
        'Net Wt': 5,
        'Wastage %': 10,
        'Wastage Wt': 0.5,
        'Total Wt': 5.5,
        '@ Per Gm': 125.39,
        Value: 689.65,
      },
      {
        'Design No': 'RING-0001',
        Version: 'V2',
        'Sort Order': 1,
        'Metal Caratage': '14-Rose-Gold',
        'Net Wt': 4.7,
        'Wastage %': 9,
        'Wastage Wt': '',
        'Total Wt': '',
        '@ Per Gm': '',
        Value: '',
      },
    ];
    const gemstoneRows = [
      {
        'Design No': 'RING-0001',
        Version: 'V1',
        'Sort Order': 1,
        'Packet Barcode': '1000000001',
        Packet: 'LD-ROU-400-DF-VV',
        Stone: 'Lab Diamonds',
        Shape: 'Round',
        Size: '4.00MM',
        Cut: '',
        Color: 'D-F',
        Quality: 'VS-VVS',
        'Stone Type': '',
        'Wt/Pcs': 0.24,
        Pcs: 10,
        'Wt (Cts)': 2.4,
        '@ (P/Ct)': 500,
        Amount: 1200,
      },
      {
        'Design No': 'RING-0001',
        Version: 'V2',
        'Sort Order': 1,
        'Packet Barcode': '1000000002',
        Packet: 'LD-EMR-200-DF-VV',
        Stone: '',
        Shape: '',
        Size: '',
        Cut: '',
        Color: '',
        Quality: '',
        'Stone Type': '',
        'Wt/Pcs': 0.18,
        Pcs: 12,
        'Wt (Cts)': '',
        '@ (P/Ct)': '',
        Amount: '',
      },
    ];
    const laborRows = [
      {
        'Design No': 'RING-0001',
        Version: 'V1',
        'Sort Order': 1,
        'Labor Head': 'Setting',
        'Labor/Unit': 100,
        'Unit Qty': 1,
        'Labor Value': 100,
      },
      {
        'Design No': 'RING-0001',
        Version: 'V1',
        'Sort Order': 2,
        'Labor Head': 'Polish',
        'Labor/Unit': 45,
        'Unit Qty': 1,
        'Labor Value': '',
      },
    ];
    const findingRows = [
      {
        'Design No': 'RING-0001',
        Version: 'V1',
        'Sort Order': 1,
        'Finding Head': 'Hook',
        'Price/Unit': 10,
        Units: 1,
        'Total Weight': 0.2,
        'Finding Value': 10,
      },
    ];
    const referenceRows = [
      { Field: 'How to use this file', AllowedValues: 'Fill all relevant sheets', Notes: 'Use Designs + Metals + Gemstones + Labors (+ Findings if needed). Multiple rows per version are supported.' },
      { Field: 'Status', AllowedValues: 'ACTIVE, INACTIVE', Notes: 'Optional. Defaults to ACTIVE.' },
      { Field: 'Version', AllowedValues: 'V1, V2, V3...', Notes: 'Required. Import is matched by Design No + Version.' },
      { Field: 'Design No', AllowedValues: 'One base design number per import', Notes: 'Use same Design No with different versions (V1, V2, V3...) to bulk-import versions.' },
      { Field: 'Company Code', AllowedValues: 'Existing company code', Notes: 'Optional. Leave blank for global designs.' },
      { Field: 'Branch Code', AllowedValues: 'Existing branch code', Notes: 'Optional. Must match company when provided.' },
      { Field: 'Packet Barcode', AllowedValues: 'Existing numeric packet barcode', Notes: 'Recommended for gemstone rows. If present, barcode match is used first.' },
      { Field: 'Packet', AllowedValues: 'Existing stone packet name', Notes: 'Used if barcode is empty.' },
      { Field: 'Image Keys', AllowedValues: 'Comma-separated media keys from Media Library', Notes: 'Example: s3://bucket/path/a.jpg, s3://bucket/path/b.mp4' },
      { Field: 'STL Key', AllowedValues: 'One STL key from Media Library', Notes: 'Example: s3://bucket/path/model.stl' },
      { Field: 'Unsupported in phase 1', AllowedValues: 'vendors, process stages, pricing tiers', Notes: 'These are not imported from Excel yet.' },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(designRows, { header: [...designHeaders] }),
      'Designs',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(metalRows, { header: [...metalHeaders] }),
      'Metals',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(gemstoneRows, { header: [...gemstoneHeaders] }),
      'Gemstones',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(laborRows, { header: [...laborHeaders] }),
      'Labors',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(findingRows, { header: [...findingHeaders] }),
      'Findings',
    );
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(referenceRows), 'Reference');

    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: 'designs-import-template.xlsx',
    };
  }

  async exportDesigns(
    query: FindProductsQueryDto,
    requester: AuthUser,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const result = await this.findAll({ ...query, page: 1, limit: 5000 }, requester);
    const ids = (result.data || []).map((item: { id: string }) => item.id);
    return this.exportDesignsByIds(ids, requester);
  }

  async exportDesignsByIds(
    ids: number[],
    requester: AuthUser,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const workbook = XLSX.utils.book_new();
    if (!ids.length) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([]), 'Designs');
      return {
        buffer: this.workbookToBuffer(workbook),
        fileName: `designs-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
      };
    }

    const designs = await this.designRepo.find({
      where: { id: In(ids) },
      relations: ['company', 'branch', 'metals', 'gemstones', 'labors', 'findings'],
      order: { createdAt: 'DESC' },
    });
    designs.forEach((design) => this.assertReadScope(design, requester));

    const packetIds = Array.from(
      new Set(
        designs.flatMap((design) =>
          (design.gemstones || [])
            .map((row) => row.packetId)
            .filter((value): value is number => Boolean(value)),
        ),
      ),
    );
    const packets = packetIds.length ? await this.packetRepo.find({ where: { id: In(packetIds) } }) : [];
    const packetByIdMap = new Map(packets.map((packet) => [packet.id, packet]));

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        designs.map((design) => ({
          'Design No': design.designNo,
          Barcode: design.barcode || '',
          'Design Name': design.designName || '',
          Version: design.version,
          'Company Code': design.company?.companyCode || '',
          'Branch Code': design.branch?.code || '',
          Category: design.jewelryGroup || '',
          'Sub Category': design.collection || '',
          'Jewelry Size': design.jewelrySize || '',
          Stage: design.stage || '',
          'Diamond Spread': design.diamondSpread || '',
          'Diamond Type': design.diamondType || '',
          'Diamond Wt': design.diamondWeight || '',
          'Diamond Quality': design.diamondQuality || '',
          'Design Status': design.designStatus || '',
          Tags: Array.isArray(design.tags) ? design.tags.join(',') : '',
          'Drawer Location': design.drawerLocation || '',
          'Other Wt':
            design.otherWeight !== null && design.otherWeight !== undefined
              ? this.toNumber(design.otherWeight)
              : '',
          'Image Keys': Array.isArray(design.imageUrls) ? design.imageUrls.join(', ') : '',
          'STL Key': design.stlFileUrl || '',
          'Design Description': design.designDescription || '',
          Remarks: design.remarks || '',
          Status: design.isActive ? 'ACTIVE' : 'INACTIVE',
        })),
      ),
      'Designs',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        designs.flatMap((design) =>
          this.sortByOrder(design.metals || []).map((row, index) => ({
            'Design No': design.designNo,
            Version: design.version,
            'Sort Order': index + 1,
            'Metal Caratage': row.metalCaratage || '',
            'Net Wt': this.toNumber(row.netWt),
            'Wastage %': this.toNumber(row.wastagePercent),
            'Wastage Wt': this.toNumber(row.wastageWt),
            'Total Wt': this.toNumber(row.totalWt),
            '@ Per Gm': this.toNumber(row.pricePerGm),
            Value: this.toNumber(row.value),
          })),
        ),
      ),
      'Metals',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        designs.flatMap((design) =>
          this.sortByOrder(design.gemstones || []).map((row, index) => ({
            'Design No': design.designNo,
            Version: design.version,
            'Sort Order': index + 1,
            'Packet Barcode': row.packetId ? packetByIdMap.get(row.packetId)?.barcode || '' : '',
            Packet: row.packetId ? packetByIdMap.get(row.packetId)?.packetName || '' : '',
            Stone: row.stone || '',
            Shape: row.shape || '',
            Size: row.size || '',
            Cut: row.cut || '',
            Color: row.color || '',
            Quality: row.quality || '',
            'Stone Type': row.stoneType || '',
            'Wt/Pcs': this.toNumber(row.wtPerPcs),
            Pcs: row.pcs,
            'Wt (Cts)': this.toNumber(row.wtInCts),
            '@ (P/Ct)': this.toNumber(row.pricePerCt),
            Amount: this.toNumber(row.amount),
          })),
        ),
      ),
      'Gemstones',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        designs.flatMap((design) =>
          this.sortByOrder(design.labors || []).map((row, index) => ({
            'Design No': design.designNo,
            Version: design.version,
            'Sort Order': index + 1,
            'Labor Head': row.laborHead || '',
            'Labor/Unit': this.toNumber(row.laborPerUnit),
            'Unit Qty': this.toNumber(row.unitQty),
            'Labor Value': this.toNumber(row.laborValue),
          })),
        ),
      ),
      'Labors',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        designs.flatMap((design) =>
          this.sortByOrder(design.findings || []).map((row, index) => ({
            'Design No': design.designNo,
            Version: design.version,
            'Sort Order': index + 1,
            'Finding Head': row.findingHead || '',
            'Price/Unit': this.toNumber(row.pricePerUnit),
            Units: this.toNumber(row.units),
            'Total Weight': this.toNumber(row.totalWeight),
            'Finding Value': this.toNumber(row.findingValue),
          })),
        ),
      ),
      'Findings',
    );

    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: `designs-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
    };
  }

  async importDesigns(
    file: { buffer?: Buffer; originalname?: string } | undefined,
    requester: AuthUser,
  ): Promise<{
    totalRows: number;
    created: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    this.assertDesignWriteAccess(requester);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Excel file is required');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const designSheet = workbook.Sheets.Designs || workbook.Sheets[workbook.SheetNames[0]];
    if (!designSheet) {
      throw new BadRequestException('Designs sheet is required');
    }

    const designRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(designSheet, {
      defval: '',
      raw: false,
    });
    if (designRows.length === 0) {
      throw new BadRequestException('The Designs sheet does not contain any rows');
    }

    const uniqueBaseDesignNos = Array.from(
      new Set(
        designRows
          .map((row) => this.normalizeBaseDesignNo(this.normalizeDesignNo(this.getImportCell(row, 'Design No', 'designNo'))))
          .filter(Boolean),
      ),
    );
    if (uniqueBaseDesignNos.length > 1) {
      throw new BadRequestException(
        'Bulk version import supports one base Design No per file. Split multiple design families into separate imports.',
      );
    }

    const metalRows = this.readSheetRows(workbook, 'Metals');
    const gemstoneRows = this.readSheetRows(workbook, 'Gemstones');
    const laborRows = this.readSheetRows(workbook, 'Labors');
    const findingRows = this.readSheetRows(workbook, 'Findings');

    const companyMap = await this.getProductCompanyCodeMap();
    const branchMap = await this.getProductBranchCodeMap();
    const packetNameMap = await this.getPacketNameMap();
    const packetBarcodeMap = await this.getPacketBarcodeMap();

    const metalMap = this.groupRowsByDesignKey(metalRows, (row) => this.getDesignImportKey(row));
    const gemstoneMap = this.groupRowsByDesignKey(gemstoneRows, (row) => this.getDesignImportKey(row));
    const laborMap = this.groupRowsByDesignKey(laborRows, (row) => this.getDesignImportKey(row));
    const findingMap = this.groupRowsByDesignKey(findingRows, (row) => this.getDesignImportKey(row));

    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (let index = 0; index < designRows.length; index += 1) {
      const line = index + 2;
      try {
        const designRow = this.normalizeDesignImportRow(designRows[index]);
        const version = this.normalizeVersion(designRow.version || 'V1');
        const scoped = await this.resolveImportDesignScope(designRow, companyMap, branchMap);
        const finalDesignNo = this.applyVersionToDesignNo(designRow.designNo, version, designRow.jewelrySize);
        // Keep the import lookup key based on the spreadsheet value. Supporting
        // detail sheets may still contain the pre-size Design No.
        const designKey = this.createImportDesignKey(designRow.designNo, version);

        const payload: CreateProductDto = {
          designNo: finalDesignNo,
          designName: designRow.designName?.trim() || undefined,
          version,
          companyId: scoped.companyId || undefined,
          branchId: scoped.branchId || undefined,
          jewelryGroup: designRow.jewelryGroup?.trim() || '',
          collection: designRow.collection?.trim() || undefined,
          jewelrySize: designRow.jewelrySize?.trim() || undefined,
          stage: designRow.stage?.trim() || undefined,
          diamondSpread: designRow.diamondSpread?.trim() || undefined,
          diamondType: designRow.diamondType?.trim() || undefined,
          diamondWeight: designRow.diamondWeight?.trim() || undefined,
          diamondQuality: designRow.diamondQuality?.trim() || undefined,
          designStatus: designRow.designStatus?.trim() || undefined,
          tags: this.parseDesignImportTags(designRow.tags),
          drawerLocation: designRow.drawerLocation?.trim() || undefined,
          otherWeight:
            designRow.otherWeight !== undefined && String(designRow.otherWeight).trim().length > 0
              ? this.optionalNonNegativeNumber(designRow.otherWeight, 'otherWeight') ?? undefined
              : undefined,
          imageUrls: this.parseImportMediaKeys(designRow.imageKeys),
          stlFileUrl: this.optionalText(designRow.stlKey),
          designDescription: designRow.designDescription?.trim() || undefined,
          remarks: designRow.remarks?.trim() || undefined,
          isActive: this.parseImportStatus(designRow.isActive),
          metals: (metalMap.get(designKey) || []).map((row) => this.toImportedMetalDto(this.normalizeDesignMetalImportRow(row))),
          gemstones: (gemstoneMap.get(designKey) || []).map((row) =>
            this.toImportedGemstoneDto(
              this.normalizeDesignGemstoneImportRow(row),
              packetNameMap,
              packetBarcodeMap,
            ),
          ),
          labors: (laborMap.get(designKey) || []).map((row) => this.toImportedLaborDto(this.normalizeDesignLaborImportRow(row))),
          findings: (findingMap.get(designKey) || []).map((row) => this.toImportedFindingDto(this.normalizeDesignFindingImportRow(row))),
        };

        if (!payload.jewelryGroup) {
          throw new BadRequestException('Category is required');
        }

        const existing = await this.designRepo.findOne({
          where: {
            designNo: finalDesignNo,
            ...(scoped.companyId ? { companyId: scoped.companyId } : { companyId: null }),
          },
        });

        if (existing) {
          const updatePayload: UpdateProductDto = { ...payload };
          await this.update(existing.id, updatePayload, requester);
          updated += 1;
        } else {
          await this.create(payload, requester);
          created += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${line}: ${message}`);
      }
    }

    const result = {
      totalRows: designRows.length,
      created,
      updated,
      failed: errors.length,
      errors,
    };

    if (errors.length > 0) {
    }

    return result;
  }

  async getNextDesignNo(
    query: GetNextDesignNoQueryDto,
    requester: AuthUser,
  ): Promise<{ designNo: string; prefix: string; serial?: string }> {
    this.assertDesignCreateAccess(requester);
    const jewelryGroup = query.jewelryGroup?.trim();
    if (!jewelryGroup) {
      throw new BadRequestException('jewelryGroup is required');
    }

    const scope = await this.resolveScope(query.companyId, query.branchId, requester);
    const prefix = await this.resolveJewelryGroupPrefix(jewelryGroup);

    if (query.structured) {
      const rows = await this.designRepo
        .createQueryBuilder('design')
        .select(['design.designNo'])
        .where('design.company_id <=> :companyId', { companyId: scope.companyId })
        .andWhere('design.design_no LIKE :prefixPattern', { prefixPattern: `${prefix}-%` })
        .getMany();

      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matcher = new RegExp(`^${escapedPrefix}-(\\d+)(?:-|$)`, 'i');
      let maxSerial = 0;

      for (const row of rows) {
        const designNoValue = String(row.designNo || '').trim();
        const match = matcher.exec(designNoValue);
        if (!match) continue;
        const parsed = Number.parseInt(match[1], 10);
        if (Number.isFinite(parsed) && parsed > maxSerial) {
          maxSerial = parsed;
        }
      }

      const nextSerial = String(maxSerial + 1);
      return {
        designNo: `${prefix}-${nextSerial}`,
        prefix,
        serial: nextSerial,
      };
    }

    const designNo = await this.generateNextDesignNo(prefix, scope.companyId);

    return {
      designNo,
      prefix,
    };
  }

  async getNextDesignVersion(
    query: GetNextDesignVersionQueryDto,
    requester: AuthUser,
  ): Promise<{ version: string }> {
    const designNo = this.normalizeDesignNo(query.designNo?.trim() || '');
    const baseDesignNo = this.normalizeBaseDesignNo(designNo);
    const scope = await this.resolveScope(query.companyId, query.branchId, requester);

    const rows = await this.designRepo
      .createQueryBuilder('design')
      .select(['design.version'])
      .where('design.company_id <=> :companyId', { companyId: scope.companyId })
      .andWhere(
        '(design.design_no = :baseDesignNo OR design.design_no LIKE :versionedDesignNo)',
        { baseDesignNo, versionedDesignNo: `${baseDesignNo}-V%` },
      )
      .getMany();

    let maxVersion = 0;
    for (const row of rows) {
      const match = /V(\d+)/i.exec((row.version || '').trim());
      if (!match) continue;
      const parsed = Number.parseInt(match[1], 10);
      if (Number.isFinite(parsed) && parsed > maxVersion) {
        maxVersion = parsed;
      }
    }

    const nextVersion = `V${Math.max(1, maxVersion + 1)}`;
    return { version: nextVersion };
  }

  async findAll(query: FindProductsQueryDto, requester: AuthUser): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    if (query.summaryOnly && query.familyDesignId?.trim()) {
      return this.findFamilyVersionSummaries(query, requester, page, limit, skip);
    }

    if (query.selectorOnly) {
      return this.findDesignSelectorOptions(query, requester, page, limit, skip);
    }

    const qb = this.designRepo
      .createQueryBuilder('design')
      .leftJoinAndSelect('design.company', 'company')
      .leftJoinAndSelect('design.branch', 'branch')
      .leftJoinAndSelect('design.jewelryGroupMaster', 'jewelryGroupMaster')
      .leftJoinAndSelect('design.collectionMaster', 'collectionMaster')
      .leftJoinAndSelect('design.jewelrySizeMaster', 'jewelrySizeMaster')
      .leftJoinAndSelect('design.stageMaster', 'stageMaster')
      .leftJoinAndSelect('design.diamondSpreadMaster', 'diamondSpreadMaster')
      .leftJoinAndSelect('design.diamondTypeMaster', 'diamondTypeMaster')
      .leftJoinAndSelect('design.diamondWeightMaster', 'diamondWeightMaster')
      .leftJoinAndSelect('design.diamondQualityMaster', 'diamondQualityMaster')
      .leftJoinAndSelect('design.designStatusMaster', 'designStatusMaster')
      .leftJoinAndSelect('design.designTags', 'designTags')
      .leftJoinAndSelect('designTags.tagMaster', 'tagMaster')
      .leftJoinAndSelect('design.metalCaratageMaster', 'metalCaratageMaster')
      .addSelect(
        `(SELECT GROUP_CONCAT(NULLIF(TRIM(mcm.value), '') ORDER BY dm.sort_order SEPARATOR ', ')
          FROM design_metals dm
          LEFT JOIN metal_caratages mcm ON mcm.id = dm.metal_caratage_id
          WHERE dm.design_id = design.id)`,
        'metalInfo',
      )
      .addSelect(
        `(SELECT GROUP_CONCAT(
            NULLIF(TRIM(ps.value), '')
            ORDER BY dg.sort_order SEPARATOR ', '
          )
          FROM design_gemstones dg
          LEFT JOIN packet_stones ps ON ps.id = dg.stone_id
          WHERE dg.design_id = design.id)`,
        'stoneInfoAgg',
      )
      .addSelect(
        `(SELECT COUNT(1)
          FROM designs family_design
          WHERE family_design.company_id <=> design.company_id
            AND (family_design.branch_id <=> design.branch_id OR (family_design.branch_id IS NULL AND design.branch_id IS NULL))
            AND (
              COALESCE(family_design.family_design_id, family_design.id)
                = COALESCE(design.family_design_id, design.id)
              OR family_design.family_design_id = design.id
              OR family_design.id = design.family_design_id
              OR REGEXP_REPLACE(family_design.design_no, '-V[0-9]+$', '') = REGEXP_REPLACE(design.design_no, '-V[0-9]+$', '')
              OR REGEXP_REPLACE(family_design.design_no, '-V[0-9]+$', '') LIKE CONCAT(REGEXP_REPLACE(design.design_no, '-V[0-9]+$', ''), '-%')
              OR REGEXP_REPLACE(design.design_no, '-V[0-9]+$', '') LIKE CONCAT(REGEXP_REPLACE(family_design.design_no, '-V[0-9]+$', ''), '-%')
            ))`,
        'versionCount',
      )
      .orderBy('design.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    this.applyScopeFilter(qb, requester, query.companyId, query.branchId);

    const status = query.status || 'ACTIVE';
    if (status === 'ACTIVE') {
      qb.andWhere('design.isActive = :isActive', { isActive: true });
    } else if (status === 'INACTIVE') {
      qb.andWhere('design.isActive = :isActive', { isActive: false });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((sqb) => {
          sqb
            .where('design.designNo LIKE :search', { search })
            .orWhere('design.barcode LIKE :search', { search })
            .orWhere('design.designName LIKE :search', { search })
            .orWhere('design.version LIKE :search', { search })
            .orWhere('jewelryGroupMaster.value LIKE :search', { search })
            .orWhere('collectionMaster.value LIKE :search', { search })
            .orWhere('jewelrySizeMaster.value LIKE :search', { search })
            .orWhere('stageMaster.value LIKE :search', { search })
            .orWhere('diamondSpreadMaster.value LIKE :search', { search })
            .orWhere('diamondTypeMaster.value LIKE :search', { search })
            .orWhere('diamondWeightMaster.value LIKE :search', { search })
            .orWhere('diamondQualityMaster.value LIKE :search', { search })
            .orWhere('designStatusMaster.value LIKE :search', { search })
            .orWhere('tagMaster.value LIKE :search', { search })
            .orWhere('metalCaratageMaster.value LIKE :search', { search })
            .orWhere('design.stoneInfo LIKE :search', { search })
            .orWhere(
              `EXISTS (
                SELECT 1
                FROM design_metals dm_search
                LEFT JOIN metal_caratages mcm_search ON mcm_search.id = dm_search.metal_caratage_id
                WHERE dm_search.design_id = design.id AND mcm_search.value LIKE :search
              )`,
              { search },
            )
            .orWhere(
              `EXISTS (
                SELECT 1
                FROM design_gemstones dg_search
                LEFT JOIN stone_packets sp_search ON sp_search.id = dg_search.packet_id
                LEFT JOIN packet_stones ps_search ON ps_search.id = dg_search.stone_id
                LEFT JOIN diamond_types dt_search ON dt_search.id = dg_search.stone_type_id
                WHERE dg_search.design_id = design.id
                  AND (
                    sp_search.packet_name LIKE :search
                    OR ps_search.value LIKE :search
                    OR dt_search.value LIKE :search
                  )
              )`,
              { search },
            )
            .orWhere('tagMaster.value LIKE :search', { search });
        }),
      );
    }

    if (query.familyDesignId?.trim()) {
      const familyDesignId = query.familyDesignId.trim();
      qb.andWhere(
        '(design.family_design_id = :familyDesignId OR design.id = :familyDesignId)',
        { familyDesignId },
      );
    }

    if (query.jewelryGroup?.trim()) {
      qb.andWhere('jewelryGroupMaster.value LIKE :jewelryGroup', {
        jewelryGroup: `%${query.jewelryGroup.trim()}%`,
      });
    }

    qb.andWhere('design.isPrimary = :isPrimary', { isPrimary: true });

    if (query.collection?.trim()) {
      qb.andWhere('collectionMaster.value LIKE :collection', {
        collection: `%${query.collection.trim()}%`,
      });
    }

    if (query.jewelrySize?.trim()) {
      qb.andWhere('jewelrySizeMaster.value LIKE :jewelrySize', {
        jewelrySize: `%${query.jewelrySize.trim()}%`,
      });
    }

    if (query.tags?.trim()) {
      qb.andWhere('tagMaster.value LIKE :tags', { tags: `%${query.tags.trim()}%` });
    }

    if (query.stage?.trim()) {
      qb.andWhere('stageMaster.value LIKE :stage', { stage: `%${query.stage.trim()}%` });
    }

    if (query.designStatus?.trim()) {
      qb.andWhere('designStatusMaster.value LIKE :designStatus', {
        designStatus: `%${query.designStatus.trim()}%`,
      });
    }

    if (query.metalCaratage?.trim()) {
      qb.andWhere(
        `(metalCaratageMaster.value LIKE :metalCaratage OR EXISTS (
          SELECT 1
          FROM design_metals dm
          LEFT JOIN metal_caratages mcm_filter ON mcm_filter.id = dm.metal_caratage_id
          WHERE dm.design_id = design.id AND mcm_filter.value LIKE :metalCaratage
        ))`,
        { metalCaratage: `%${query.metalCaratage.trim()}%` },
      );
    }

    if (query.stone?.trim() || query.shape?.trim() || query.cut?.trim() || query.color?.trim() || query.quality?.trim()) {
      const stone = query.stone?.trim() ? `%${query.stone.trim()}%` : null;
      const shape = query.shape?.trim() ? `%${query.shape.trim()}%` : null;
      const cut = query.cut?.trim() ? `%${query.cut.trim()}%` : null;
      const color = query.color?.trim() ? `%${query.color.trim()}%` : null;
      const quality = query.quality?.trim() ? `%${query.quality.trim()}%` : null;
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM design_gemstones dg
          WHERE dg.design_id = design.id
            AND (:stone IS NULL OR dg.stone LIKE :stone)
            AND (:shape IS NULL OR dg.shape LIKE :shape)
            AND (:cut IS NULL OR dg.cut LIKE :cut)
            AND (:color IS NULL OR dg.color LIKE :color)
            AND (:quality IS NULL OR dg.quality LIKE :quality)
        )`,
        { stone, shape, cut, color, quality },
      );
    }

    if (query.supplierName?.trim()) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM design_vendors dv WHERE dv.design_id = design.id AND dv.supplier_name LIKE :supplierName)',
        { supplierName: `%${query.supplierName.trim()}%` },
      );
    }

    if (query.process?.trim()) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM design_process_stages dps WHERE dps.design_id = design.id AND dps.process_stage LIKE :process)',
        { process: `%${query.process.trim()}%` },
      );
    }

    if (query.pricingTier?.trim()) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM design_pricing_tiers dpt WHERE dpt.design_id = design.id AND dpt.name LIKE :pricingTier)',
        { pricingTier: `%${query.pricingTier.trim()}%` },
      );
    }

    if (query.creationFrom?.trim()) {
      qb.andWhere('DATE(design.createdAt) >= :creationFrom', { creationFrom: query.creationFrom.trim() });
    }

    if (query.creationTo?.trim()) {
      qb.andWhere('DATE(design.createdAt) <= :creationTo', { creationTo: query.creationTo.trim() });
    }

    if (query.modificationFrom?.trim()) {
      qb.andWhere('DATE(design.updatedAt) >= :modificationFrom', {
        modificationFrom: query.modificationFrom.trim(),
      });
    }

    if (query.modificationTo?.trim()) {
      qb.andWhere('DATE(design.updatedAt) <= :modificationTo', {
        modificationTo: query.modificationTo.trim(),
      });
    }

    const total = await qb.getCount();
    const { entities: data, raw } = await qb.getRawAndEntities();
    await this.ensureDesignBarcodes(data);
    const listSummariesByDesign = new Map<string, { metalInfo: string | null; stoneInfo: string | null; versionCount: number }>();
    raw.forEach((row) => {
      const designId = this.optionalText(row.design_id || row.designId || row.design_id_0);
      if (!designId) {
        return;
      }
      listSummariesByDesign.set(designId, {
        metalInfo: this.optionalText(row.metalInfo),
        stoneInfo: this.optionalText(row.stoneInfoAgg),
        versionCount: Math.max(1, Math.trunc(this.toNumber(row.versionCount))),
      });
    });
    if (query.summaryOnly) {
      const updatedByMap = await this.resolveUserNames(
        data.map((design) => design.updatedBy).filter((value): value is number => Boolean(value)),
      );
      const summaryData = await Promise.all(
        data.map(async (design) => {
          const designKey = String(design.id);
          const listSummary = listSummariesByDesign.get(designKey);
          return this.toCompactDesignListRow(
            design,
            listSummary,
            requester,
            design.updatedBy ? updatedByMap.get(design.updatedBy) ?? null : null,
          );
        }),
      );

      return {
        data: summaryData,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }

    const updatedByMap = await this.resolveUserNames(
      data.map((design) => design.updatedBy).filter((value): value is number => Boolean(value)),
    );
    const enrichedData = await Promise.all(
      data.map(async (design) => {
        const designKey = String(design.id);
        const listSummary = listSummariesByDesign.get(designKey);
        return this.toCompactDesignListRow(
          design,
          listSummary,
          requester,
          design.updatedBy ? updatedByMap.get(design.updatedBy) ?? null : null,
        );
      }),
    );

    return {
      data: enrichedData,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Compact payload for table/dropdown lists. Full nested children belong to findOne(). */
  private async toCompactDesignListRow(
    design: Design,
    summary: { metalInfo: string | null; stoneInfo: string | null; versionCount: number } | undefined,
    requester: AuthUser,
    updatedByName: string | null,
  ): Promise<Record<string, unknown>> {
    this.hydrateDesignDisplayLabels(design);

    return {
      id: design.id,
      designNo: design.designNo,
      barcode: design.barcode,
      familyDesignId: design.familyDesignId || design.id,
      designName: design.designName,
      version: design.version,
      jewelryGroup: design.jewelryGroup,
      jewelryGroupId: design.jewelryGroupId,
      jewelrySize: design.jewelrySize,
      jewelrySizeId: design.jewelrySizeId,
      collection: design.collection,
      stage: design.stage,
      diamondSpread: design.diamondSpread,
      diamondSpreadId: design.diamondSpreadId,
      diamondType: design.diamondType,
      diamondTypeId: design.diamondTypeId,
      diamondWeight: design.diamondWeight,
      diamondWeightId: design.diamondWeightId,
      diamondQuality: design.diamondQuality,
      diamondQualityId: design.diamondQualityId,
      metalCaratageId: design.metalCaratageId,
      designStatus: design.designStatus,
      tags: Array.isArray(design.tags) ? design.tags : [],
      metalCaratage: summary?.metalInfo || design.metalCaratage || null,
      stoneInfo: summary?.stoneInfo || design.stoneInfo || null,
      totalValue: design.totalValue,
      imageKeys: Array.isArray(design.imageUrls) ? design.imageUrls : [],
      imageUrls: await this.resolveGalleryUrls(design.imageUrls || []),
      ijewelModelId: design.ijewelModelId,
      ijewelBaseName: design.ijewelBaseName,
      isActive: design.isActive,
      isPrimary: design.isPrimary,
      versionCount: summary?.versionCount || 1,
      createdAt: design.createdAt,
      updatedAt: design.updatedAt,
      updatedByName,
      ...(await this.resolveDesignVisiblePrices(design, requester)),
    };
  }

  async getDashboardSummary(
    query: Pick<FindProductsQueryDto, 'status' | 'companyId' | 'branchId'>,
    requester: AuthUser,
  ): Promise<{ designs: number; versions: number }> {
    const status = query.status || 'ACTIVE';

    const buildCountQuery = (primaryOnly: boolean) => {
      const qb = this.designRepo.createQueryBuilder('design').select('COUNT(1)', 'count');
      this.applyScopeFilter(qb, requester, query.companyId, query.branchId);

      if (status === 'ACTIVE') {
        qb.andWhere('design.isActive = :isActive', { isActive: true });
      } else if (status === 'INACTIVE') {
        qb.andWhere('design.isActive = :isActive', { isActive: false });
      }

      if (primaryOnly) {
        qb.andWhere('design.isPrimary = :isPrimary', { isPrimary: true });
      }

      return qb;
    };

    const [primaryRow, totalRow] = await Promise.all([
      buildCountQuery(true).getRawOne<{ count?: string | number }>(),
      buildCountQuery(false).getRawOne<{ count?: string | number }>(),
    ]);

    const designs = Math.max(0, Math.trunc(this.toNumber(primaryRow?.count || 0)));
    const total = Math.max(0, Math.trunc(this.toNumber(totalRow?.count || 0)));

    return {
      designs,
      versions: Math.max(total - designs, 0),
    };
  }

  async findMobileTrending(
    query: FindMobileTrendingProductsQueryDto,
    requester: AuthUser,
  ): Promise<{
    data: Array<{
      id: string | number;
      designNo: string;
      designName: string | null;
      jewelryGroup: string;
      collection: string | null;
      version: string;
      totalValue: number;
      displayPrice?: number;
      imageUrls: string[];
      createdAt: Date;
    }>;
  }> {
    const limit = Math.min(Math.max(query.limit || 3, 1), 10);
    const qb = this.designRepo
      .createQueryBuilder('design')
      .leftJoinAndSelect('design.jewelryGroupMaster', 'mobileTrendingJewelryGroupMaster')
      .leftJoinAndSelect('design.collectionMaster', 'mobileTrendingCollectionMaster')
      .select([
        'design.id',
        'design.designNo',
        'design.barcode',
        'design.designName',
        'design.familyDesignId',
        'design.version',
        'design.totalValue',
        'design.imageUrls',
        'design.createdAt',
        'mobileTrendingJewelryGroupMaster.id',
        'mobileTrendingJewelryGroupMaster.value',
        'mobileTrendingCollectionMaster.id',
        'mobileTrendingCollectionMaster.value',
      ])
      .where('design.isActive = :isActive', { isActive: true })
      .andWhere('design.isPrimary = :isPrimary', { isPrimary: true })
      .orderBy('design.createdAt', 'DESC')
      .take(limit);

    this.applyScopeFilter(qb, requester);

    const rawDesigns = (await qb.getMany()).map((design) => this.hydrateDesignDisplayLabels(design));
    const designs = await this.applyMobileCatalogRetailPricing(rawDesigns, requester);
    const data = await Promise.all(
      designs.map(async (design) => ({
        id: design.id,
        designNo: design.designNo,
        designName: design.designName,
        familyDesignId: design.familyDesignId || design.id,
        jewelryGroup: design.jewelryGroup,
        collection: design.collection,
        version: design.version,
        totalValue: Number(design.totalValue || 0),
        displayPrice: design.displayPrice,
        imageUrls: await this.resolveGalleryUrls(design.imageUrls || []),
        createdAt: design.createdAt,
      })),
    );

    return { data };
  }

  private parseMobileCatalogFilterId(value?: string | null): number | null {
    const text = String(value || '').trim();
    if (!/^\d+$/.test(text)) return null;
    const id = Number(text);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  async findMobileCatalog(
    query: FindMobileCatalogProductsQueryDto,
    requester: AuthUser,
  ): Promise<{
    data: Array<{
      id: string | number;
      designNo: string;
      designName: string | null;
      jewelryGroup: string;
      collection: string | null;
      version: string;
      jewelrySize: string | null;
      diamondSpread: string | null;
      diamondType: string | null;
      diamondWeight: string | null;
      diamondQuality: string | null;
      metalCaratage: string | null;
      totalValue: number;
      displayPrice?: number;
      imageUrls: string[];
      isPrimary: boolean;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Math.trunc(query.page || 1));
    const limit = Math.min(Math.max(1, Math.trunc(query.limit || 20)), 50);
    const qb = this.designRepo
      .createQueryBuilder('design')
      .leftJoinAndSelect('design.jewelryGroupMaster', 'mobileCatalogJewelryGroupMaster')
      .leftJoinAndSelect('design.collectionMaster', 'mobileCatalogCollectionMaster')
      .leftJoinAndSelect('design.jewelrySizeMaster', 'mobileCatalogJewelrySizeMaster')
      .leftJoinAndSelect('design.diamondSpreadMaster', 'mobileCatalogDiamondSpreadMaster')
      .leftJoinAndSelect('design.diamondTypeMaster', 'mobileCatalogDiamondTypeMaster')
      .leftJoinAndSelect('design.diamondWeightMaster', 'mobileCatalogDiamondWeightMaster')
      .leftJoinAndSelect('design.diamondQualityMaster', 'mobileCatalogDiamondQualityMaster')
      .leftJoinAndSelect('design.metalCaratageMaster', 'mobileCatalogMetalCaratageMaster')
      .where('design.isActive = :isActive', { isActive: true })
      .andWhere('design.isPrimary = :isPrimary', { isPrimary: true });
    this.applyScopeFilter(qb, requester);
    const categoryId = this.parseMobileCatalogFilterId(query.category);
    if (categoryId) {
      qb.andWhere('design.jewelryGroupId = :categoryId', { categoryId });
    } else {
      this.applyMobileCategoryFilter(qb, query.category);
    }

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        new Brackets((sqb) => {
          sqb
            .where('design.designNo LIKE :search', { search: `%${search}%` })
            .orWhere('design.barcode LIKE :search', { search: `%${search}%` })
            .orWhere('design.designName LIKE :search', { search: `%${search}%` })
            .orWhere('mobileCatalogJewelryGroupMaster.value LIKE :search', { search: `%${search}%` })
            .orWhere('mobileCatalogCollectionMaster.value LIKE :search', { search: `%${search}%` })
            .orWhere('mobileCatalogDiamondTypeMaster.value LIKE :search', { search: `%${search}%` })
            .orWhere('mobileCatalogDiamondSpreadMaster.value LIKE :search', { search: `%${search}%` })
            .orWhere('mobileCatalogDiamondQualityMaster.value LIKE :search', { search: `%${search}%` });
        }),
      );
    }

    if (query.collection?.trim()) {
      const collectionId = this.parseMobileCatalogFilterId(query.collection);
      if (collectionId) qb.andWhere('design.collectionId = :collectionId', { collectionId });
      else qb.andWhere('mobileCatalogCollectionMaster.value = :collection', { collection: query.collection.trim() });
    }

    if (query.diamondType?.trim()) {
      const diamondTypeId = this.parseMobileCatalogFilterId(query.diamondType);
      if (diamondTypeId) qb.andWhere('design.diamondTypeId = :diamondTypeId', { diamondTypeId });
      else qb.andWhere('mobileCatalogDiamondTypeMaster.value = :diamondType', { diamondType: query.diamondType.trim() });
    }

    if (query.jewelrySize?.trim()) {
      const jewelrySizeId = this.parseMobileCatalogFilterId(query.jewelrySize);
      if (jewelrySizeId) qb.andWhere('design.jewelrySizeId = :jewelrySizeId', { jewelrySizeId });
      else qb.andWhere('mobileCatalogJewelrySizeMaster.value = :jewelrySize', { jewelrySize: query.jewelrySize.trim() });
    }

    if (query.metalCaratage?.trim()) {
      const metalCaratageId = this.parseMobileCatalogFilterId(query.metalCaratage);
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM design_metals dm_metal
          LEFT JOIN metal_caratages mc_metal ON mc_metal.id = dm_metal.metal_caratage_id
          WHERE dm_metal.design_id = design.id
            AND (
              (:metalCaratageId IS NOT NULL AND dm_metal.metal_caratage_id = :metalCaratageId)
              OR (:metalCaratageId IS NULL AND LOWER(mc_metal.value) = LOWER(:metalCaratage))
              OR (:metalCaratageId IS NULL AND LOWER(mc_metal.alias_name) = LOWER(:metalCaratage))
            )
        )`,
        { metalCaratageId, metalCaratage: query.metalCaratage.trim() },
      );
    }

    if (query.shape?.trim()) {
      const shapeId = this.parseMobileCatalogFilterId(query.shape);
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM design_gemstones dg_shape
          LEFT JOIN packet_shapes ps_shape ON ps_shape.id = dg_shape.shape_id
          WHERE dg_shape.design_id = design.id
            AND (
              (:shapeId IS NOT NULL AND dg_shape.shape_id = :shapeId)
              OR (:shapeId IS NULL AND LOWER(ps_shape.value) = LOWER(:shape))
              OR (:shapeId IS NULL AND LOWER(ps_shape.alias_name) = LOWER(:shape))
            )
        )`,
        { shapeId, shape: query.shape.trim() },
      );
    }
    const useRetailPricing = this.shouldApplyMobileCatalogRetailPricing(requester);
    const priceBand = query.priceBand || 'ALL';
    if (!useRetailPricing && priceBand === 'UNDER_2000') {
      qb.andWhere('design.totalValue < :priceMax', { priceMax: 2000 });
    } else if (!useRetailPricing && priceBand === 'BETWEEN_2000_5000') {
      qb.andWhere('design.totalValue BETWEEN :priceMin AND :priceMax', { priceMin: 2000, priceMax: 5000 });
    } else if (!useRetailPricing && priceBand === 'ABOVE_5000') {
      qb.andWhere('design.totalValue > :priceMin', { priceMin: 5000 });
    }

    const sort = query.sort || 'recent';
    if (!useRetailPricing && sort === 'priceAsc') {
      qb.orderBy('design.totalValue', 'ASC').addOrderBy('design.createdAt', 'DESC');
    } else if (!useRetailPricing && sort === 'priceDesc') {
      qb.orderBy('design.totalValue', 'DESC').addOrderBy('design.createdAt', 'DESC');
    } else if (sort === 'designAsc') {
      qb.orderBy('design.designNo', 'ASC');
    } else if (sort === 'designDesc') {
      qb.orderBy('design.designNo', 'DESC');
    } else {
      qb.orderBy('design.createdAt', 'DESC');
    }

    let total = 0;
    let rows: Array<Design & { displayPrice?: number }>;
    if (useRetailPricing) {
      const pricedRows = await this.applyMobileCatalogRetailPricing(await qb.getMany(), requester);
      const filteredRows = this.filterMobileCatalogPriceBand(pricedRows, priceBand);
      const sortedRows = this.sortMobileCatalogRetailRows(filteredRows, sort);
      total = sortedRows.length;
      rows = sortedRows.slice((page - 1) * limit, page * limit);
    } else {
      total = await qb.getCount();
      rows = await qb.skip((page - 1) * limit).take(limit).getMany();
    }

    const data = await Promise.all(
      rows.map(async (design) => {
        this.hydrateDesignDisplayLabels(design);
        return {
        id: design.id,
        designNo: design.designNo,
        designName: design.designName,
        familyDesignId: design.familyDesignId || design.id,
        jewelryGroup: design.jewelryGroup,
        collection: design.collection,
        version: design.version,
        jewelrySize: design.jewelrySize,
        diamondSpread: design.diamondSpread,
        diamondType: design.diamondType,
        diamondWeight: design.diamondWeight,
        diamondQuality: design.diamondQuality,
        metalCaratage: design.metalCaratage,
        totalValue: Number(design.totalValue || 0),
        displayPrice: design.displayPrice,
        imageUrls: await this.resolveGalleryUrls(design.imageUrls || []),
        isPrimary: design.isPrimary,
        createdAt: design.createdAt,
        };
      }),
    );

    return {
      data,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private shouldApplyMobileCatalogRetailPricing(requester: AuthUser): boolean {
    if (requester.role === UserRole.COMPANY_ADMIN) {
      return Boolean(requester.companyId);
    }

    return (
      (requester.role === UserRole.BRANCH_MANAGER || requester.role === UserRole.SALES_REP) &&
      Boolean(requester.companyId) &&
      Boolean(requester.branchId)
    );
  }

  private async applyMobileCatalogRetailPricing(
    rows: Design[],
    requester: AuthUser,
  ): Promise<Array<Design & { displayPrice?: number }>> {
    if (!this.shouldApplyMobileCatalogRetailPricing(requester)) {
      return rows;
    }

    return Promise.all(
      rows.map(async (design) => {
        const displayPrice = await this.resolveMobileRetailDisplayPrice(design, requester);
        return Object.assign(design, { displayPrice });
      }),
    );
  }

  private async resolveMobileRetailDisplayPrice(design: Design, requester: AuthUser): Promise<number> {
    const branchId =
      requester.role === UserRole.BRANCH_MANAGER || requester.role === UserRole.SALES_REP
        ? requester.branchId || undefined
        : undefined;

    try {
      const preview = await this.pricingService.calculateDesignRetailPrice({
        design,
        companyId: requester.companyId as number,
        branchId,
      });
      return preview.finalPrice;
    } catch {
      return Number(design.totalValue || 0);
    }
  }

  private async resolveDesignRetailDisplayPrice(design: Design, requester: AuthUser): Promise<number | undefined> {
    if (!this.shouldApplyMobileCatalogRetailPricing(requester)) {
      return undefined;
    }

    return this.resolveMobileRetailDisplayPrice(design, requester);
  }

  private async resolveDesignVisiblePrices(
    design: Design,
    requester: AuthUser,
  ): Promise<{ displayCostPrice: number }> {
    const baseCost = Number(design.totalValue || 0);

    if (requester.role === UserRole.COMPANY_ADMIN && requester.companyId) {
      try {
        const preview = await this.pricingService.calculateDesignRetailPrice({
          design,
          companyId: requester.companyId,
          branchId: design.branchId || undefined,
        });
        return {
          displayCostPrice: preview.companyPrice,
        };
      } catch {
        return {
          displayCostPrice: baseCost,
        };
      }
    }

    if (requester.role === UserRole.BRANCH_MANAGER && requester.companyId && requester.branchId) {
      try {
        const preview = await this.pricingService.calculateDesignRetailPrice({
          design,
          companyId: requester.companyId,
          branchId: requester.branchId,
        });
        return {
          displayCostPrice: preview.finalPrice,
        };
      } catch {
        return {
          displayCostPrice: baseCost,
        };
      }
    }

    return { displayCostPrice: baseCost };
  }

  private filterMobileCatalogPriceBand(
    rows: Array<Design & { displayPrice?: number }>,
    priceBand: FindMobileCatalogProductsQueryDto['priceBand'] = 'ALL',
  ): Array<Design & { displayPrice?: number }> {
    if (!priceBand || priceBand === 'ALL') return rows;

    return rows.filter((design) => {
      const price = Number(design.displayPrice ?? design.totalValue ?? 0);
      if (priceBand === 'UNDER_2000') return price < 2000;
      if (priceBand === 'BETWEEN_2000_5000') return price >= 2000 && price <= 5000;
      if (priceBand === 'ABOVE_5000') return price > 5000;
      return true;
    });
  }

  private sortMobileCatalogRetailRows(
    rows: Array<Design & { displayPrice?: number }>,
    sort: FindMobileCatalogProductsQueryDto['sort'] = 'recent',
  ): Array<Design & { displayPrice?: number }> {
    if (sort !== 'priceAsc' && sort !== 'priceDesc') return rows;

    return [...rows].sort((a, b) => {
      const first = Number(a.displayPrice ?? a.totalValue ?? 0);
      const second = Number(b.displayPrice ?? b.totalValue ?? 0);
      return sort === 'priceAsc' ? first - second : second - first;
    });
  }

  private readonly mobileCatalogCategories = [
    { id: MobileCatalogCategory.RINGS, label: 'Rings', hints: ['ring'] },
    { id: MobileCatalogCategory.BRACELETS, label: 'Bracelets', hints: ['bracelet', 'bangle'] },
    { id: MobileCatalogCategory.STUDS, label: 'Studs', hints: ['stud', 'earring'] },
    { id: MobileCatalogCategory.NECKLACES, label: 'Necklaces', hints: ['necklace', 'pendant', 'chain'] },
  ] as const;

  async findMobileCategories(
    requester: AuthUser,
  ): Promise<{
    data: Array<{
      id: MobileCatalogCategory;
      label: string;
      designs: number;
      versions: number;
    }>;
  }> {
    const counts = await this.getMobileCategoryCounts(requester);
    return {
      data: this.mobileCatalogCategories
        .map((category) => ({
          id: category.id,
          label: category.label,
          designs: counts[category.id]?.designs || 0,
          versions: counts[category.id]?.versions || 0,
        }))
        .filter((category) => category.designs > 0 || category.versions > 0),
    };
  }

  async findMobileCategoryCounts(
    requester: AuthUser,
  ): Promise<{
    data: Record<MobileCatalogCategory, { designs: number; versions: number }>;
  }> {
    return { data: await this.getMobileCategoryCounts(requester) };
  }

  private async getMobileCategoryCounts(
    requester: AuthUser,
  ): Promise<Record<MobileCatalogCategory, { designs: number; versions: number }>> {
    const result = this.mobileCatalogCategories.reduce(
      (acc, category) => {
        acc[category.id] = { designs: 0, versions: 0 };
        return acc;
      },
      {} as Record<MobileCatalogCategory, { designs: number; versions: number }>,
    );

    await Promise.all(
      this.mobileCatalogCategories.map(async (category) => {
        const qb = this.designRepo
          .createQueryBuilder('design')
          .leftJoin('design.jewelryGroupMaster', 'mobileCategoryJewelryGroupMaster')
          .leftJoin('design.collectionMaster', 'mobileCategoryCollectionMaster')
          .innerJoin(
            Design,
            'familyPrimary',
            [
              'familyPrimary.isPrimary = :isPrimary',
              'familyPrimary.isActive = :isActive',
              "COALESCE(NULLIF(REGEXP_REPLACE(familyPrimary.designNo, '-V[0-9]+$', ''), ''), familyPrimary.designNo) = COALESCE(NULLIF(REGEXP_REPLACE(design.designNo, '-V[0-9]+$', ''), ''), design.designNo)",
            ].join(' AND '),
          )
          .select('COUNT(1)', 'versions')
          .addSelect(
            `COUNT(DISTINCT CASE
              WHEN design.isPrimary = :isPrimary
              THEN COALESCE(NULLIF(REGEXP_REPLACE(design.designNo, '-V[0-9]+$', ''), ''), design.id)
              ELSE NULL
            END)`,
            'designs',
          )
          .where('design.isActive = :isActive', { isActive: true, isPrimary: true });

        this.applyScopeFilter(qb, requester);

        qb.andWhere(
          new Brackets((sqb) => {
            category.hints.forEach((hint, index) => {
              const param = `${category.id}Hint${index}`;
              const condition = [
                `LOWER(mobileCategoryJewelryGroupMaster.value) LIKE :${param}`,
                `LOWER(mobileCategoryCollectionMaster.value) LIKE :${param}`,
                `LOWER(design.designName) LIKE :${param}`,
                `LOWER(design.designNo) LIKE :${param}`,
              ].join(' OR ');

              if (index === 0) {
                sqb.where(`(${condition})`, { [param]: `%${hint}%` });
              } else {
                sqb.orWhere(`(${condition})`, { [param]: `%${hint}%` });
              }
            });
          }),
        );

        const row = await qb.getRawOne<{ designs?: string | number; versions?: string | number }>();
        result[category.id] = {
          designs: Math.trunc(this.toNumber(row?.designs || 0)),
          versions: Math.trunc(this.toNumber(row?.versions || 0)),
        };
      }),
    );

    return result;
  }

  async findMobileConfigurator(id: number, requester: AuthUser): Promise<any> {
    const family = await this.loadMobileConfiguratorFamily(id, requester);
    if (!family.length) {
      throw new NotFoundException('No active configurable variants found');
    }
    const selected = family.find((design) => design.isPrimary) || family.find((design) => design.id === id) || family[0];
    return this.toMobileConfiguratorResponse(family, selected, {}, requester);
  }

  async resolveMobileConfigurator(
    id: number,
    query: ResolveMobileDesignConfiguratorQueryDto,
    requester: AuthUser,
  ): Promise<any> {
    const selectedSeed = await this.loadMobileConfiguratorSeed(id, requester);
    const familyDesignId = selectedSeed.familyDesignId || selectedSeed.id;
    const [family, selectedId] = await Promise.all([
      this.loadMobileConfiguratorFamily(id, requester, selectedSeed, familyDesignId),
      this.fetchMobileConfiguratorMatchIdFromDb(id, familyDesignId, query, requester),
    ]);
    if (!family.length) {
      throw new NotFoundException('No active configurable variants found');
    }
    const selected = family.find((design) => Number(design.id) === Number(selectedId))
      || family.find((design) => design.isPrimary)
      || family.find((design) => Number(design.id) === Number(id))
      || family[0];
    return this.toMobileConfiguratorResponse(family, selected, query, requester);
  }

  private async fetchMobileConfiguratorMatchIdFromDb(
    requestedId: number,
    familyDesignId: number,
    query: ResolveMobileDesignConfiguratorQueryDto,
    requester: AuthUser,
  ): Promise<number | null> {
    const qb = this.designRepo.createQueryBuilder('design')
      .select('design.id', 'id')
      .leftJoin('design.gemstones', 'gemstone')
      .leftJoin('design.metals', 'metal')
      .leftJoin('design.jewelrySizeMaster', 'matchJewelrySizeMaster')
      .leftJoin('design.diamondSpreadMaster', 'matchDiamondSpreadMaster')
      .leftJoin('design.diamondWeightMaster', 'matchDiamondWeightMaster')
      .leftJoin('design.diamondQualityMaster', 'matchDiamondQualityMaster')
      .leftJoin('design.metalCaratageMaster', 'matchDesignMetalCaratageMaster')
      .leftJoin('metal.metalCaratageMaster', 'matchMetalCaratageMaster')
      .where('(design.familyDesignId = :familyDesignId OR design.id = :familyDesignId)', { familyDesignId })
      .andWhere('design.isActive = :isActive', { isActive: true })
      .andWhere('(design.jewelrySizeId IS NULL OR matchJewelrySizeMaster.isActive = :isActive)')
      .andWhere('(design.diamondSpreadId IS NULL OR matchDiamondSpreadMaster.isActive = :isActive)')
      .andWhere('(design.diamondWeightId IS NULL OR matchDiamondWeightMaster.isActive = :isActive)')
      .andWhere('(design.diamondQualityId IS NULL OR matchDiamondQualityMaster.isActive = :isActive)')
      .andWhere('(design.metalCaratageId IS NULL OR matchDesignMetalCaratageMaster.isActive = :isActive)')
      .andWhere('(metal.id IS NULL OR metal.metalCaratageId IS NULL OR matchMetalCaratageMaster.isActive = :isActive)');

    this.applyScopeFilter(qb, requester);

    const scoreCases: string[] = [];
    const params: any = {};

    const diamondTypeId = undefined;
    const styleId = query.styleId ?? (query.style && !isNaN(Number(query.style)) ? Number(query.style) : undefined);
    const weightId = query.weightId ?? (query.weight && !isNaN(Number(query.weight)) ? Number(query.weight) : undefined);
    const qualityId = query.qualityId ?? (query.quality && !isNaN(Number(query.quality)) ? Number(query.quality) : undefined);
    const ringSizeId = query.ringSizeId ?? (query.ringSize && !isNaN(Number(query.ringSize)) ? Number(query.ringSize) : undefined);
    const shapeId = query.shapeId ?? (query.shape && !isNaN(Number(query.shape)) ? Number(query.shape) : undefined);
    const stoneId = undefined;
    const metalCaratageId = query.metalCaratageId ?? (query.metalCaratage && !isNaN(Number(query.metalCaratage)) ? Number(query.metalCaratage) : undefined);

    if (diamondTypeId !== undefined && diamondTypeId !== null) {
      const boost = query.selectedKey === 'diamondType' ? 1000 : 1;
      scoreCases.push(`(CASE WHEN design.diamond_type_id = :diamondTypeId THEN ${boost} ELSE 0 END)`);
      params.diamondTypeId = diamondTypeId;
    }
    if (styleId !== undefined && styleId !== null) {
      const boost = query.selectedKey === 'style' ? 1000 : 1;
      scoreCases.push(`(CASE WHEN design.diamond_spread_id = :styleId AND matchDiamondSpreadMaster.is_active = true THEN ${boost} ELSE 0 END)`);
      params.styleId = styleId;
    }
    if (weightId !== undefined && weightId !== null) {
      const boost = query.selectedKey === 'weight' ? 1000 : 1;
      scoreCases.push(`(CASE WHEN design.diamond_weight_id = :weightId AND matchDiamondWeightMaster.is_active = true THEN ${boost} ELSE 0 END)`);
      params.weightId = weightId;
    }
    if (qualityId !== undefined && qualityId !== null) {
      const boost = query.selectedKey === 'quality' ? 1000 : 1;
      scoreCases.push(`(CASE WHEN design.diamond_quality_id = :qualityId AND matchDiamondQualityMaster.is_active = true THEN ${boost} ELSE 0 END)`);
      params.qualityId = qualityId;
    }
    if (ringSizeId !== undefined && ringSizeId !== null) {
      const boost = query.selectedKey === 'ringSize' ? 1000 : 1;
      scoreCases.push(`(CASE WHEN design.jewelry_size_id = :ringSizeId AND matchJewelrySizeMaster.is_active = true THEN ${boost} ELSE 0 END)`);
      params.ringSizeId = ringSizeId;
    }
    if (shapeId !== undefined && shapeId !== null) {
      const boost = query.selectedKey === 'shape' ? 1000 : 1;
      scoreCases.push(`(CASE WHEN gemstone.shape_id = :shapeId THEN ${boost} ELSE 0 END)`);
      params.shapeId = shapeId;
    }
    if (stoneId !== undefined && stoneId !== null) {
      const boost = query.selectedKey === 'stone' || query.selectedKey === 'shape' ? 1000 : 1;
      scoreCases.push(`(CASE WHEN gemstone.stone_id = :stoneId OR gemstone.stone_type_id = :stoneId THEN ${boost} ELSE 0 END)`);
      params.stoneId = stoneId;
    }
    if (metalCaratageId !== undefined && metalCaratageId !== null) {
      const boost = query.selectedKey === 'metalCaratage' ? 1000 : 1;
      scoreCases.push(`(CASE WHEN metal.metal_caratage_id = :metalCaratageId AND matchMetalCaratageMaster.is_active = true THEN ${boost} ELSE 0 END)`);
      params.metalCaratageId = metalCaratageId;
    }

    if (scoreCases.length > 0) {
      qb.addSelect(`MAX(${scoreCases.join(' + ')})`, 'match_score');
      qb.orderBy('match_score', 'DESC');
    }

    qb.addSelect('(CASE WHEN design.id = :requestedId THEN 1 ELSE 0 END)', 'requested_score');
    params.requestedId = Number(requestedId);
    if (scoreCases.length > 0) {
      qb.addOrderBy('requested_score', 'DESC');
    } else {
      qb.orderBy('requested_score', 'DESC');
    }
    qb.addOrderBy('design.isPrimary', 'DESC');
    qb.addOrderBy("CAST(REPLACE(UPPER(design.version), 'V', '') AS UNSIGNED)", 'ASC');
    qb.groupBy('design.id');
    qb.addGroupBy('design.isPrimary');
    qb.addGroupBy('design.version');
    qb.take(1);
    qb.setParameters(params);

    const row = await qb.getRawOne<{ id: number | string }>();
    return row?.id !== undefined && row?.id !== null ? Number(row.id) : null;
  }
  private async loadMobileConfiguratorSeed(id: number, requester: AuthUser): Promise<Design> {
    const selected = await this.designRepo.findOne({
      where: { id },
      select: ['id', 'familyDesignId', 'companyId', 'branchId'],
    });

    if (!selected) {
      throw new NotFoundException('Product design not found');
    }

    this.assertReadScope(selected, requester);
    return selected;
  }

  private async loadMobileConfiguratorFamily(id: number, requester: AuthUser, selectedSeed?: Design, knownFamilyDesignId?: number): Promise<Design[]> {
    const selected = selectedSeed || await this.loadMobileConfiguratorSeed(id, requester);
    const familyDesignId = knownFamilyDesignId || selected.familyDesignId || selected.id;
    const cacheKey = this.getMobileConfiguratorFamilyCacheKey(familyDesignId, requester);
    const cached = this.getCachedMobileConfiguratorFamily(cacheKey);
    if (cached) {
      return cached;
    }
    const qb = this.designRepo
      .createQueryBuilder('design')
      .leftJoinAndSelect('design.jewelryGroupMaster', 'configJewelryGroupMaster')
      .leftJoinAndSelect('design.collectionMaster', 'configCollectionMaster')
      .leftJoinAndSelect('design.jewelrySizeMaster', 'configJewelrySizeMaster')
      .leftJoinAndSelect('design.stageMaster', 'configStageMaster')
      .leftJoinAndSelect('design.diamondSpreadMaster', 'configDiamondSpreadMaster')
      .leftJoinAndSelect('design.diamondTypeMaster', 'configDiamondTypeMaster')
      .leftJoinAndSelect('design.diamondWeightMaster', 'configDiamondWeightMaster')
      .leftJoinAndSelect('design.diamondQualityMaster', 'configDiamondQualityMaster')
      .leftJoinAndSelect('design.designStatusMaster', 'configDesignStatusMaster')
      .leftJoinAndSelect('design.metalCaratageMaster', 'configMetalCaratageMaster')
      .where('design.isActive = :isActive', { isActive: true })
      .andWhere('(design.jewelrySizeId IS NULL OR configJewelrySizeMaster.isActive = :isActive)')
      .andWhere('(design.diamondSpreadId IS NULL OR configDiamondSpreadMaster.isActive = :isActive)')
      .andWhere('(design.diamondWeightId IS NULL OR configDiamondWeightMaster.isActive = :isActive)')
      .andWhere('(design.diamondQualityId IS NULL OR configDiamondQualityMaster.isActive = :isActive)')
      .andWhere('(design.metalCaratageId IS NULL OR configMetalCaratageMaster.isActive = :isActive)')
      .orderBy('design.isPrimary', 'DESC')
      .addOrderBy("CAST(REPLACE(UPPER(design.version), 'V', '') AS UNSIGNED)", 'ASC')
      .addOrderBy('design.createdAt', 'ASC');

    qb.andWhere('(design.familyDesignId = :familyDesignId OR design.id = :familyDesignId)', { familyDesignId });

    this.applyScopeFilter(qb, requester);

    // console.log('=== MOBILE CONFIGURATOR SQL ===');
    // console.log(qb.getSql());
    // console.log('PARAMETERS:', qb.getParameters());
    // console.log('===============================');

    const rows = await qb.getMany();
    const family = rows;
    family.forEach((design) => this.hydrateDesignDisplayLabels(design));
    const designIds = family.map((design) => design.id);
    // Stone names and quantities are needed for configurator matching and the total
    // stone count, but gemstone row details remain hidden from the mobile response.
    const [metals, gemstones] = designIds.length
      ? await Promise.all([
        this.metalRepo
          .createQueryBuilder('metal')
          .innerJoinAndSelect('metal.metalCaratageMaster', 'mobileMetalCaratageMaster', 'mobileMetalCaratageMaster.isActive = :isActive', { isActive: true })
          .leftJoinAndSelect('mobileMetalCaratageMaster.metalColorMaster', 'mobileMetalColorMaster')
          .where('metal.designId IN (:...designIds)', { designIds })
          .orderBy('metal.sortOrder', 'ASC')
          .addOrderBy('metal.createdAt', 'ASC')
          .getMany(),
        this.gemstoneRepo.find({
          where: { designId: In(designIds) },
          relations: ['stoneMaster', 'stoneTypeMaster'],
          order: { sortOrder: 'ASC', createdAt: 'ASC' },
        }),
      ])
      : [[], []];
    const metalsByDesign = this.groupByDesignId(metals);
    const gemstonesByDesign = this.groupByDesignId(gemstones);
    for (const design of family) {
      const designKey = String(design.id);
      design.metals = (metalsByDesign.get(designKey) || []).map((metal) => this.hydrateMetalDisplayLabels(metal));
      design.gemstones = (gemstonesByDesign.get(designKey) || []).map((gemstone) => this.hydrateGemstoneDisplayLabels(gemstone));
    }
    this.setCachedMobileConfiguratorFamily(cacheKey, family);
    return family;
  }

  private getMobileConfiguratorFamilyCacheKey(familyDesignId: number, requester: AuthUser): string {
    return [
      familyDesignId,
      requester.role || '',
      requester.companyId || '',
      requester.branchId || '',
      requester.id || '',
      this.masterTablesService.getActiveStatusVersion(),
    ].join(':');
  }

  private invalidateMobileConfiguratorFamilyCache(familyDesignId: number): void {
    const familyPrefix = `${familyDesignId}:`;
    for (const cacheKey of this.mobileConfiguratorFamilyCache.keys()) {
      if (cacheKey.startsWith(familyPrefix)) {
        this.mobileConfiguratorFamilyCache.delete(cacheKey);
      }
    }
  }

  private getCachedMobileConfiguratorFamily(cacheKey: string): Design[] | null {
    const cached = this.mobileConfiguratorFamilyCache.get(cacheKey);
    if (!cached) return null;
    if (Date.now() >= cached.expiresAt) {
      this.mobileConfiguratorFamilyCache.delete(cacheKey);
      return null;
    }
    return cached.family;
  }

  private setCachedMobileConfiguratorFamily(cacheKey: string, family: Design[]): void {
    this.mobileConfiguratorFamilyCache.set(cacheKey, {
      family,
      expiresAt: Date.now() + this.mobileConfiguratorFamilyCacheTtlMs,
    });
    if (this.mobileConfiguratorFamilyCache.size > 500) {
      const now = Date.now();
      for (const [key, entry] of this.mobileConfiguratorFamilyCache.entries()) {
        if (entry.expiresAt <= now || this.mobileConfiguratorFamilyCache.size > 400) {
          this.mobileConfiguratorFamilyCache.delete(key);
        }
      }
    }
  }

  private async toMobileConfiguratorResponse(
    family: Design[],
    selected: Design,
    query: ResolveMobileDesignConfiguratorQueryDto = {},
    requester?: AuthUser,
  ): Promise<any> {
    const wantedIds: Partial<Record<MobileConfiguratorKey, number>> = {};
    if (query.shapeId !== undefined && query.shapeId !== null) wantedIds.shape = Number(query.shapeId);
    if (query.shape && !isNaN(Number(query.shape))) wantedIds.shape = Number(query.shape);
    if (query.styleId !== undefined && query.styleId !== null) wantedIds.style = Number(query.styleId);
    if (query.style && !isNaN(Number(query.style))) wantedIds.style = Number(query.style);
    if (query.metalCaratageId !== undefined && query.metalCaratageId !== null) wantedIds.metalCaratage = Number(query.metalCaratageId);
    if (query.metalCaratage && !isNaN(Number(query.metalCaratage))) wantedIds.metalCaratage = Number(query.metalCaratage);
    if (query.weightId !== undefined && query.weightId !== null) wantedIds.weight = Number(query.weightId);
    if (query.weight && !isNaN(Number(query.weight))) wantedIds.weight = Number(query.weight);
    if (query.qualityId !== undefined && query.qualityId !== null) wantedIds.quality = Number(query.qualityId);
    if (query.quality && !isNaN(Number(query.quality))) wantedIds.quality = Number(query.quality);
    if (query.ringSizeId !== undefined && query.ringSizeId !== null) wantedIds.ringSize = Number(query.ringSizeId);
    if (query.ringSize && !isNaN(Number(query.ringSize))) wantedIds.ringSize = Number(query.ringSize);

    const wantedLabels = this.normalizeMobileConfiguratorQuery(query);
    const optionGroups = this.getMobileConfiguratorOptionGroups(family);
    const designOptions = this.getMobileConfiguratorOptions(selected);

    const selectedOptions: Record<string, { id: number | null; label: string }> = {};
    (Object.keys(optionGroups) as MobileConfiguratorKey[]).forEach((key) => {
      const wantedId = wantedIds[key];
      const wantedLabel = wantedLabels[key];

      let opt: MobileConfiguratorOption | undefined;
      if (wantedId !== undefined && wantedId !== null) {
        opt = designOptions[key]?.find((o) => o.id !== null && Number(o.id) === Number(wantedId));
      }
      if (!opt && wantedLabel) {
        opt = designOptions[key]?.find((o) => this.mobileConfiguratorOptionKey(key, o.label) === this.mobileConfiguratorOptionKey(key, wantedLabel));
      }
      if (!opt && wantedId !== undefined && wantedId !== null) {
        opt = optionGroups[key]?.find((o) => o.id !== null && Number(o.id) === Number(wantedId));
      }
      if (!opt && wantedLabel) {
        opt = optionGroups[key]?.find((o) => this.mobileConfiguratorOptionKey(key, o.label) === this.mobileConfiguratorOptionKey(key, wantedLabel));
      }
      if (!opt) {
        opt = designOptions[key]?.[0] || optionGroups[key]?.[0];
      }

      selectedOptions[key] = opt
        ? { id: opt.id, label: opt.label }
        : { id: null, label: '' };
    });

    return {
      selectedDesign: await this.toMobileConfiguratorDesign(selected, selectedOptions, requester),
      selectedOptions,
      optionGroups,
    };
  }

  private groupByDesignId<T extends { designId: string | number }>(rows: T[]): Map<string, T[]> {
    const grouped = new Map<string, T[]>();
    for (const row of rows) {
      const designKey = String(row.designId);
      const items = grouped.get(designKey);
      if (items) items.push(row);
      else grouped.set(designKey, [row]);
    }
    return grouped;
  }

  private async withGemstonePacketNames<T extends { packetId?: string | number | null }>(
    gemstones: T[],
  ): Promise<Array<T & { packetName: string | null }>> {
    const packetRefs = Array.from(
      new Set(
        gemstones
          .map((gem) => gem.packetId)
          .map((value) => (value === undefined || value === null ? '' : String(value).trim()))
          .filter((value): value is string => value.length > 0),
      ),
    );
    const packetIdRefs = packetRefs
      .map((value) => this.optionalInt(value))
      .filter((value): value is number => value !== null);
    const packets = packetRefs.length
      ? await this.packetRepo.find({
        where: [
          ...(packetIdRefs.length ? [{ id: In(packetIdRefs) }] : []),
          { barcode: In(packetRefs) },
          { packetName: In(packetRefs) },
        ],
      })
      : [];
    const packetNameById = new Map(packets.map((packet) => [packet.id, packet.packetName]));
    const packetNameByBarcode = new Map(
      packets
        .filter((packet) => Boolean((packet.barcode || '').trim()))
        .map((packet) => [packet.barcode!.trim(), packet.packetName]),
    );
    const packetNameByName = new Map(
      packets.map((packet) => [packet.packetName.trim().toUpperCase(), packet.packetName]),
    );

    return gemstones.map((gem) => ({
      ...gem,
      packetName: (() => {
        const packetRef = gem.packetId === undefined || gem.packetId === null ? '' : String(gem.packetId).trim();
        if (!packetRef) return null;
        const packetId = this.optionalInt(packetRef);
        return (
          (packetId !== null ? packetNameById.get(packetId) : undefined) ||
          packetNameByBarcode.get(packetRef) ||
          packetNameByName.get(packetRef.toUpperCase()) ||
          null
        );
      })(),
    }));
  }

  private async toMobileConfiguratorDesign(
    design: Design,
    selectedOptions?: Record<string, { id: number | null; label: string }>,
    requester?: AuthUser,
  ): Promise<any> {
    const [displayPrice, imageUrls] = await Promise.all([
      requester ? this.resolveMobileConfiguratorDisplayPrice(design, requester) : Promise.resolve(undefined),
      this.resolveGalleryUrls(design.imageUrls || []),
    ]);
    const selectedMetalCaratage = selectedOptions?.metalCaratage?.label || design.metalCaratage;
    const selectedDiamondWeight = selectedOptions?.weight?.label || design.diamondWeight;
    const selectedDiamondType = selectedOptions?.diamondType?.label || this.resolveMobileConfiguratorDiamondType(design);
    const selectedDiamondQuality = selectedOptions?.quality?.label || design.diamondQuality;
    const selectedSpread = selectedOptions?.style?.label || design.diamondSpread;
    const selectedRingSize = design.jewelrySize
      ? selectedOptions?.ringSize?.label || design.jewelrySize
      : null;

    return {
      id: design.id,
      designNo: design.designNo,
      barcode: design.barcode,
      designName: design.designName,
      version: design.version,
      isPrimary: design.isPrimary,
      familyDesignId: design.familyDesignId || design.id,
      jewelryGroup: design.jewelryGroup,
      collection: design.collection,
      jewelrySize: selectedRingSize,
      stage: design.stage,
      diamondSpread: selectedSpread,
      diamondType: selectedDiamondType,
      diamondWeight: selectedDiamondWeight,
      diamondQuality: selectedDiamondQuality,
      metalCaratage: selectedMetalCaratage,
      tags: Array.isArray(design.tags) ? design.tags : [],
      designDescription: design.designDescription,
      remarks: design.remarks,
      totalValue: Number(design.totalValue || 0),
      displayPrice,
      grossWeight: Number(design.grossWeight || 0),
      imageUrls,
      ijewelModelId: design.ijewelModelId,
      ijewelBaseName: design.ijewelBaseName,
      stoneCount: (design.gemstones || []).reduce(
        (total, gemstone) => total + Math.max(0, Math.trunc(Number(gemstone.pcs) || 0)),
        0,
      ),
      totalStoneWeight: this.resolveTotalStoneWeight(design),
      metals: (design.metals || []).map((metal) => ({
        metalCaratage: this.mobileConfiguratorDisplayValue('metalCaratage', metal.metalCaratage),
        metalColor: metal.metalColor || null,
        netWt: Number(metal.netWt || 0),
        totalWt: Number(metal.totalWt || 0),
      })),
    };
  }

  private async resolveMobileConfiguratorDisplayPrice(
    design: Design,
    requester: AuthUser,
  ): Promise<number | undefined> {
    if (!this.shouldApplyMobileCatalogRetailPricing(requester)) {
      return undefined;
    }

    return this.resolveMobileRetailDisplayPrice(design, requester);
  }

  private getMobileConfiguratorOptionGroups(family: Design[]) {
    const groups: Record<MobileConfiguratorKey, Map<string, MobileConfiguratorOption>> = {
      diamondType: new Map(),
      stone: new Map(),
      shape: new Map(),
      style: new Map(),
      metalCaratage: new Map(),
      weight: new Map(),
      quality: new Map(),
      ringSize: new Map(),
    };

    for (const design of family) {
      const options = this.getMobileConfiguratorOptions(design);
      (Object.keys(options) as MobileConfiguratorKey[]).forEach((key) => {
        for (const opt of options[key]) {
          const normalized = opt.label.replace(/\s+/g, ' ').trim().toLowerCase();
          if (normalized && !groups[key].has(normalized)) {
            groups[key].set(normalized, opt);
          }
        }
      });
    }

    return Object.fromEntries(
      Object.entries(groups).map(([key, map]) => [
        key,
        Array.from(map.values()).sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { numeric: key !== 'ringSize', sensitivity: 'base' }),
        ),
      ]),
    ) as Record<MobileConfiguratorKey, MobileConfiguratorOption[]>;
  }

  private resolveMobileConfiguratorDiamondType(design: Design): string {
    const designDiamondType = this.mobileConfiguratorDisplayValue('diamondType', design.diamondType);
    if (designDiamondType) {
      return designDiamondType;
    }

    for (const gem of design.gemstones || []) {
      const stoneType = this.mobileConfiguratorDisplayValue('diamondType', gem.stoneType);
      if (stoneType && this.isMobileConfiguratorDiamondTypeLike(stoneType)) {
        return stoneType;
      }
    }

    for (const gem of design.gemstones || []) {
      const stone = this.mobileConfiguratorDisplayValue('diamondType', gem.stone);
      if (stone && this.isMobileConfiguratorDiamondTypeLike(stone)) {
        return stone;
      }
    }

    return '';
  }

  private isMobileConfiguratorDiamondTypeLike(value?: string | null): boolean {
    const normalized = this.mobileConfiguratorText(value).toLowerCase();
    if (!normalized) {
      return false;
    }
    return /\b(lab|grown|hpht|cvd|natural|synthetic|earth[-\s]?mined)\b/.test(normalized);
  }

  private isMobileConfiguratorActiveMaster(
    masterId: number | null | undefined,
    master: { isActive?: boolean | null } | null | undefined,
  ): boolean {
    return !masterId || master?.isActive === true;
  }
  private getMobileConfiguratorOptions(design: Design): Record<MobileConfiguratorKey, MobileConfiguratorOption[]> {
    const addOpt = (id: number | null, label: string): MobileConfiguratorOption | null => {
      const text = label.replace(/\s+/g, ' ').trim();
      return text ? { id, label: text } : null;
    };

    const diamondType: MobileConfiguratorOption[] = [];
    const dtLabel = this.resolveMobileConfiguratorDiamondType(design);
    const dtId = design.diamondTypeMaster?.id ?? design.diamondTypeId ?? null;
    if (dtLabel) diamondType.push({ id: dtId, label: dtLabel });

    const stone: MobileConfiguratorOption[] = [];
    const shape: MobileConfiguratorOption[] = [];
    for (const gem of design.gemstones || []) {
      const stoneLabel = this.optionalText(gem.stone) || this.optionalText(gem.stoneType);
      const gemStoneId = gem.stoneMaster?.id ?? gem.stoneId ?? gem.stoneTypeMaster?.id ?? gem.stoneTypeId ?? null;
      if (stoneLabel) {
        stoneLabel.split(',').forEach((part) => {
          const opt = addOpt(gemStoneId, part.trim());
          if (opt && !stone.some((s) => (opt.id !== null && s.id === opt.id) || s.label.toLowerCase() === opt.label.toLowerCase())) {
            stone.push(opt);
          }
        });
      }

      const shapeLabel = this.optionalText(gem.shape);
      const gemShapeId = gem.shapeMaster?.id ?? gem.shapeId ?? null;
      if (shapeLabel) {
        shapeLabel.split(',').forEach((part) => {
          const opt = addOpt(gemShapeId, part.trim());
          if (opt && !shape.some((s) => (opt.id !== null && s.id === opt.id) || s.label.toLowerCase() === opt.label.toLowerCase())) {
            shape.push(opt);
          }
        });
      }
    }

    const style: MobileConfiguratorOption[] = [];
    const styleLabel = this.mobileConfiguratorDisplayValue('style', design.diamondSpread);
    const styleId = design.diamondSpreadMaster?.id ?? design.diamondSpreadId ?? null;
    if (styleLabel && this.isMobileConfiguratorActiveMaster(design.diamondSpreadId, design.diamondSpreadMaster)) {
      style.push({ id: styleId, label: styleLabel });
    }

    const metalCaratage: MobileConfiguratorOption[] = [];
    for (const metal of design.metals || []) {
      const caratLabel = this.mobileConfiguratorText(metal.metalCaratage);
      const metalCaratId = metal.metalCaratageMaster?.id ?? metal.metalCaratageId ?? null;
      if (caratLabel && this.isMobileConfiguratorActiveMaster(metal.metalCaratageId, metal.metalCaratageMaster)) {
        caratLabel.split(',').forEach((part) => {
          const trimmed = part.trim();
          if (trimmed && !metalCaratage.some((m) => (metalCaratId !== null && m.id === metalCaratId) || m.label.toLowerCase() === trimmed.toLowerCase())) {
            metalCaratage.push({ id: metalCaratId, label: trimmed });
          }
        });
      }
    }
    if (!metalCaratage.length) {
      const fallback = this.mobileConfiguratorText(design.metalCaratage);
      const designMetalCaratId = design.metalCaratageMaster?.id ?? design.metalCaratageId ?? null;
      if (fallback && this.isMobileConfiguratorActiveMaster(design.metalCaratageId, design.metalCaratageMaster)) {
        fallback.split(',').forEach((part) => {
          const trimmed = part.trim();
          if (trimmed) metalCaratage.push({ id: designMetalCaratId, label: trimmed });
        });
      }
    }

    const weight: MobileConfiguratorOption[] = [];
    const weightLabel = this.mobileConfiguratorDisplayValue('weight', design.diamondWeight);
    const weightId = design.diamondWeightMaster?.id ?? design.diamondWeightId ?? null;
    if (weightLabel && this.isMobileConfiguratorActiveMaster(design.diamondWeightId, design.diamondWeightMaster)) {
      weight.push({ id: weightId, label: weightLabel });
    }

    const quality: MobileConfiguratorOption[] = [];
    const qualityLabel = this.mobileConfiguratorDisplayValue('quality', design.diamondQuality);
    const qualityId = design.diamondQualityMaster?.id ?? design.diamondQualityId ?? null;
    if (qualityLabel && this.isMobileConfiguratorActiveMaster(design.diamondQualityId, design.diamondQualityMaster)) {
      quality.push({ id: qualityId, label: qualityLabel });
    }

    const ringSize: MobileConfiguratorOption[] = [];
    const ringSizeLabel = this.mobileConfiguratorDisplayValue('ringSize', design.jewelrySize);
    const ringSizeId = design.jewelrySizeMaster?.id ?? design.jewelrySizeId ?? null;
    if (ringSizeLabel && this.isMobileConfiguratorActiveMaster(design.jewelrySizeId, design.jewelrySizeMaster)) {
      ringSize.push({ id: ringSizeId, label: ringSizeLabel });
    }

    return { diamondType, stone, shape, style, metalCaratage, weight, quality, ringSize };
  }

  private normalizeMobileConfiguratorQuery(query: ResolveMobileDesignConfiguratorQueryDto) {
    const wanted: Partial<Record<MobileConfiguratorKey, string>> = {};
    (['shape', 'style', 'metalCaratage', 'weight', 'quality', 'ringSize'] as const).forEach((key) => {
      const rawValue = key === 'shape' || key === 'metalCaratage' ? String(query[key] || '').split(',')[0] : query[key];
      const text = key === 'weight' ? this.toMobileCaratLabel(rawValue) : this.mobileConfiguratorText(rawValue);
      if (text && !Number.isFinite(Number(text))) wanted[key] = this.mobileConfiguratorDisplayValue(key, text);
    });
    return wanted;
  }

  private mobileConfiguratorOptionKey(key: MobileConfiguratorKey, value?: string | number | null): string {
    const display = this.mobileConfiguratorDisplayValue(key, value);
    return display.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private mobileConfiguratorDisplayValue(
    key: MobileConfiguratorKey,
    value?: string | number | null,
  ): string {
    const text = key === 'weight' ? this.toMobileCaratLabel(value) : this.mobileConfiguratorText(value);
    return text.replace(/\s+/g, ' ').trim();
  }

  private resolveTotalStoneWeight(design: Design): number {
    const gemTotal = (design.gemstones || []).reduce((sum, gem) => {
      const wt = Number(gem.wtInCts) || (Number(gem.wtPerPcs || 0) * Number(gem.pcs || 0));
      return sum + (Number.isFinite(wt) && wt > 0 ? wt : 0);
    }, 0);
    if (gemTotal > 0) {
      return Number(gemTotal.toFixed(3));
    }
    const parsed = Number.parseFloat(String(design.diamondWeight || '').replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(3)) : 0;
  }

  private mobileConfiguratorText(value?: string | number | null): string {
    return String(value ?? '').trim();
  }

  private toMobileCaratLabel(value?: string | number | null): string {
    const text = this.mobileConfiguratorText(value);
    if (!text) return '';
    if (/ct|cts|carat/i.test(text)) return text;
    const numeric = Number(text);
    return Number.isFinite(numeric) ? `${this.formatMobileOptionNumber(numeric)} ct` : text;
  }

  private formatMobileOptionNumber(value: number): string {
    return Number.isInteger(value) ? value.toFixed(2) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  private parseVersionNumber(version?: string | null): number {
    const match = /V(\d+)/i.exec(String(version || '').trim());
    const parsed = match ? Number.parseInt(match[1], 10) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
  }

  private applyMobileCategoryFilter(qb: any, category?: string) {
    if (!category) return;
    const lower = category.trim().toLowerCase();
    const categoryConfig = this.mobileCatalogCategories.find(
      (item) => item.id === lower || item.label.toLowerCase() === lower,
    );

    if (!categoryConfig) {
      qb.andWhere('LOWER(mobileCatalogJewelryGroupMaster.value) = :category', { category: lower });
      return;
    }

    qb.andWhere(
      new Brackets((sqb) => {
        categoryConfig.hints.forEach((hint, index) => {
          const param = `mobileCategoryHint${index}`;
          const condition = [
            `LOWER(mobileCatalogJewelryGroupMaster.value) LIKE :${param}`,
            `LOWER(mobileCatalogCollectionMaster.value) LIKE :${param}`,
            `LOWER(design.designName) LIKE :${param}`,
            `LOWER(design.designNo) LIKE :${param}`,
          ].join(' OR ');
          const parameters = { [param]: `%${hint}%` };
          if (index === 0) sqb.where(`(${condition})`, parameters);
          else sqb.orWhere(`(${condition})`, parameters);
        });
      }),
    );
  }

  private async findFamilyVersionSummaries(
    query: FindProductsQueryDto,
    requester: AuthUser,
    page: number,
    limit: number,
    skip: number,
  ): Promise<any> {
    const requestedFamilyDesignId = query.familyDesignId?.trim();
    if (!requestedFamilyDesignId) {
      return { data: [], total: 0, page, totalPages: 1 };
    }

    const familySeedQb = this.designRepo
      .createQueryBuilder('design')
      .select(['design.id', 'design.familyDesignId'])
      .where('design.id = :requestedFamilyDesignId', { requestedFamilyDesignId });
    this.applyScopeFilter(familySeedQb, requester, query.companyId, query.branchId);
    const familySeed = await familySeedQb.getOne();
    if (!familySeed) {
      return { data: [], total: 0, page, totalPages: 1 };
    }
    const familyDesignId = familySeed.familyDesignId || familySeed.id;

    const familyStatsQb = this.designRepo
      .createQueryBuilder('design')
      .select('COUNT(*)', 'familyVersionCount')
      .addSelect(
        `MAX(CASE
          WHEN UPPER(TRIM(design.version)) REGEXP '^V[0-9]+$'
          THEN CAST(SUBSTRING(UPPER(TRIM(design.version)), 2) AS UNSIGNED)
          ELSE NULL
        END)`,
        'latestVersionNumber',
      )
      .where('(design.familyDesignId = :familyDesignId OR design.id = :familyDesignId)', { familyDesignId });
    this.applyScopeFilter(familyStatsQb, requester, query.companyId, query.branchId);
    const familyStatsPromise = familyStatsQb.getRawOne<{
      familyVersionCount?: string | number;
      latestVersionNumber?: string | number;
    }>();

    const qb = this.designRepo
      .createQueryBuilder('design')
      .leftJoinAndSelect('design.jewelryGroupMaster', 'familyJewelryGroupMaster')
      .leftJoinAndSelect('design.collectionMaster', 'familyCollectionMaster')
      .leftJoinAndSelect('design.jewelrySizeMaster', 'familyJewelrySizeMaster')
      .leftJoinAndSelect('design.stageMaster', 'familyStageMaster')
      .leftJoinAndSelect('design.diamondSpreadMaster', 'familyDiamondSpreadMaster')
      .leftJoinAndSelect('design.diamondTypeMaster', 'familyDiamondTypeMaster')
      .leftJoinAndSelect('design.diamondWeightMaster', 'familyDiamondWeightMaster')
      .leftJoinAndSelect('design.diamondQualityMaster', 'familyDiamondQualityMaster')
      .leftJoinAndSelect('design.designStatusMaster', 'familyDesignStatusMaster')
      .leftJoinAndSelect('design.metalCaratageMaster', 'familyMetalCaratageMaster')
      .addSelect(
        `(SELECT GROUP_CONCAT(NULLIF(TRIM(mcm.value), '') ORDER BY dm.sort_order SEPARATOR ', ')
          FROM design_metals dm
          LEFT JOIN metal_caratages mcm ON mcm.id = dm.metal_caratage_id
          WHERE dm.design_id = design.id)`,
        'metalInfo',
      )
      .addSelect("CAST(REPLACE(UPPER(design.version), 'V', '') AS UNSIGNED)", 'versionSort')
      .where('(design.familyDesignId = :familyDesignId OR design.id = :familyDesignId)', { familyDesignId })
      .orderBy('versionSort', 'ASC')
      .addOrderBy('design.createdAt', 'ASC')
      .skip(skip)
      .take(limit);

    this.applyScopeFilter(qb, requester, query.companyId, query.branchId);

    const status = query.status || 'ACTIVE';
    if (status === 'ACTIVE') {
      qb.andWhere('design.isActive = :isActive', { isActive: true });
    } else if (status === 'INACTIVE') {
      qb.andWhere('design.isActive = :isActive', { isActive: false });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((sqb) => {
          sqb
            .where('design.designNo LIKE :search', { search })
            .orWhere('design.barcode LIKE :search', { search })
            .orWhere('design.designName LIKE :search', { search })
            .orWhere('design.version LIKE :search', { search })
            .orWhere('familyJewelryGroupMaster.value LIKE :search', { search })
            .orWhere('familyCollectionMaster.value LIKE :search', { search })
            .orWhere('familyJewelrySizeMaster.value LIKE :search', { search })
            .orWhere('familyStageMaster.value LIKE :search', { search })
            .orWhere('familyDiamondSpreadMaster.value LIKE :search', { search })
            .orWhere('familyDiamondTypeMaster.value LIKE :search', { search })
            .orWhere('familyDiamondWeightMaster.value LIKE :search', { search })
            .orWhere('familyDiamondQualityMaster.value LIKE :search', { search })
            .orWhere('familyDesignStatusMaster.value LIKE :search', { search })
            .orWhere('familyMetalCaratageMaster.value LIKE :search', { search })
            .orWhere('design.stoneInfo LIKE :search', { search });
        }),
      );
    }

    if (query.jewelryGroup?.trim()) {
      qb.andWhere('familyJewelryGroupMaster.value LIKE :jewelryGroup', {
        jewelryGroup: `%${query.jewelryGroup.trim()}%`,
      });
    }

    if (query.collection?.trim()) {
      qb.andWhere('familyCollectionMaster.value LIKE :collection', {
        collection: `%${query.collection.trim()}%`,
      });
    }

    if (query.jewelrySize?.trim()) {
      qb.andWhere('familyJewelrySizeMaster.value LIKE :jewelrySize', {
        jewelrySize: `%${query.jewelrySize.trim()}%`,
      });
    }

    if (query.jewelrySizeId) {
      qb.andWhere('design.jewelrySizeId = :jewelrySizeId', {
        jewelrySizeId: query.jewelrySizeId,
      });
    }

    if (query.metalCaratageId) {
      qb.andWhere(
        `(design.metalCaratageId = :metalCaratageId OR EXISTS (
          SELECT 1
          FROM design_metals family_filter_dm
          WHERE family_filter_dm.design_id = design.id
            AND family_filter_dm.metal_caratage_id = :metalCaratageId
        ))`,
        { metalCaratageId: query.metalCaratageId },
      );
    }

    if (query.diamondSpreadId) {
      qb.andWhere('design.diamondSpreadId = :diamondSpreadId', {
        diamondSpreadId: query.diamondSpreadId,
      });
    }

    if (query.diamondQualityId) {
      qb.andWhere('design.diamondQualityId = :diamondQualityId', {
        diamondQualityId: query.diamondQualityId,
      });
    }

    if (query.designStatus?.trim()) {
      qb.andWhere('familyDesignStatusMaster.value LIKE :designStatus', {
        designStatus: `%${query.designStatus.trim()}%`,
      });
    }

    if (query.metalCaratage?.trim()) {
      qb.andWhere(
        `(familyMetalCaratageMaster.value LIKE :metalCaratage OR EXISTS (
          SELECT 1
          FROM design_metals family_dm
          LEFT JOIN metal_caratages family_mcm ON family_mcm.id = family_dm.metal_caratage_id
          WHERE family_dm.design_id = design.id AND family_mcm.value LIKE :metalCaratage
        ))`,
        { metalCaratage: `%${query.metalCaratage.trim()}%` },
      );
    }

    if (query.shape?.trim()) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM design_gemstones family_dg
          LEFT JOIN packet_shapes family_shape ON family_shape.id = family_dg.shape_id
          WHERE family_dg.design_id = design.id AND family_shape.value LIKE :shape
        )`,
        { shape: `%${query.shape.trim()}%` },
      );
    }

    const total = await qb.getCount();
    const { entities: data, raw } = await qb.getRawAndEntities();
    await this.ensureDesignBarcodes(data);
    const metalInfoByDesign = new Map<string, string | null>();
    raw.forEach((row) => {
      const designId = this.optionalText(row.design_id || row.designId || row.design_id_0);
      if (designId) metalInfoByDesign.set(designId, this.optionalText(row.metalInfo));
    });
    const updatedByMap = await this.resolveUserNames(
      data.map((design) => design.updatedBy).filter((value): value is number => Boolean(value)),
    );
    const summaryData = await Promise.all(
      data.map((design) => this.toCompactDesignListRow(
        design,
        {
          metalInfo: metalInfoByDesign.get(String(design.id)) || null,
          stoneInfo: design.stoneInfo || null,
          versionCount: total,
        },
        requester,
        design.updatedBy ? updatedByMap.get(design.updatedBy) ?? null : null,
      )),
    );

    const familyStats = await familyStatsPromise;
    return {
      data: summaryData,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      familyVersionCount: Math.max(0, Math.trunc(this.toNumber(familyStats?.familyVersionCount))),
      latestVersionNumber: Math.max(0, Math.trunc(this.toNumber(familyStats?.latestVersionNumber))),
    };
  }

  private async findDesignSelectorOptions(
    query: FindProductsQueryDto,
    requester: AuthUser,
    page: number,
    limit: number,
    skip: number,
  ): Promise<any> {
    const qb = this.designRepo
      .createQueryBuilder('design')
      .leftJoinAndSelect('design.jewelryGroupMaster', 'selectorJewelryGroupMaster')
      .leftJoinAndSelect('design.collectionMaster', 'selectorCollectionMaster')
      .leftJoinAndSelect('design.jewelrySizeMaster', 'selectorJewelrySizeMaster')
      .leftJoinAndSelect('design.designStatusMaster', 'selectorDesignStatusMaster')
      .leftJoinAndSelect('design.metalCaratageMaster', 'selectorMetalCaratageMaster')
      .addSelect(
        `(SELECT GROUP_CONCAT(NULLIF(TRIM(selector_mcm.value), '') ORDER BY selector_dm.sort_order SEPARATOR ', ')
          FROM design_metals selector_dm
          LEFT JOIN metal_caratages selector_mcm ON selector_mcm.id = selector_dm.metal_caratage_id
          WHERE selector_dm.design_id = design.id)`,
        'selectorMetalInfo',
      )
      .orderBy('design.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    this.applyScopeFilter(qb, requester, query.companyId, query.branchId);

    const status = query.status || 'ACTIVE';
    if (status === 'ACTIVE') {
      qb.andWhere('design.isActive = :isActive', { isActive: true });
    } else if (status === 'INACTIVE') {
      qb.andWhere('design.isActive = :isActive', { isActive: false });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((sqb) => {
          sqb
            .where('design.designNo LIKE :search', { search })
            .orWhere('design.barcode LIKE :search', { search })
            .orWhere('design.designName LIKE :search', { search })
            .orWhere('design.version LIKE :search', { search })
            .orWhere('selectorJewelryGroupMaster.value LIKE :search', { search })
            .orWhere('selectorCollectionMaster.value LIKE :search', { search })
            .orWhere('selectorJewelrySizeMaster.value LIKE :search', { search })
            .orWhere('selectorDesignStatusMaster.value LIKE :search', { search })
            .orWhere('selectorMetalCaratageMaster.value LIKE :search', { search })
            .orWhere(
              `EXISTS (
                SELECT 1 FROM design_metals selector_search_dm
                INNER JOIN metal_caratages selector_search_mcm ON selector_search_mcm.id = selector_search_dm.metal_caratage_id
                WHERE selector_search_dm.design_id = design.id AND selector_search_mcm.value LIKE :search
              )`,
            )
            .orWhere('design.stoneInfo LIKE :search', { search });
        }),
      );
    }

    if (query.jewelryGroup?.trim()) {
      qb.andWhere('selectorJewelryGroupMaster.value LIKE :jewelryGroup', {
        jewelryGroup: `%${query.jewelryGroup.trim()}%`,
      });
    }

    qb.andWhere('design.isPrimary = :isPrimary', { isPrimary: true });

    if (query.collection?.trim()) {
      qb.andWhere('selectorCollectionMaster.value LIKE :collection', {
        collection: `%${query.collection.trim()}%`,
      });
    }

    if (query.jewelrySize?.trim()) {
      qb.andWhere('selectorJewelrySizeMaster.value LIKE :jewelrySize', {
        jewelrySize: `%${query.jewelrySize.trim()}%`,
      });
    }

    if (query.designStatus?.trim()) {
      qb.andWhere('selectorDesignStatusMaster.value LIKE :designStatus', {
        designStatus: `%${query.designStatus.trim()}%`,
      });
    }

    if (query.metalCaratage?.trim()) {
      qb.andWhere(
        `(selectorMetalCaratageMaster.value LIKE :metalCaratage OR EXISTS (
          SELECT 1 FROM design_metals selector_filter_dm
          INNER JOIN metal_caratages selector_filter_mcm ON selector_filter_mcm.id = selector_filter_dm.metal_caratage_id
          WHERE selector_filter_dm.design_id = design.id AND selector_filter_mcm.value LIKE :metalCaratage
        ))`,
        { metalCaratage: `%${query.metalCaratage.trim()}%` },
      );
    }

    const total = await qb.getCount();
    const { entities, raw } = await qb.getRawAndEntities();
    await this.ensureDesignBarcodes(entities);
    const metalInfoByDesign = new Map<string, string | null>();
    raw.forEach((row) => {
      const designId = this.optionalText(row.design_id || row.designId || row.design_id_0);
      if (designId) metalInfoByDesign.set(designId, this.optionalText(row.selectorMetalInfo));
    });
    const data = await Promise.all(entities.map(async (design) => {
      this.hydrateDesignDisplayLabels(design);
      return {
        id: design.id,
        designNo: design.designNo,
        barcode: design.barcode,
        version: design.version,
        designName: design.designName,
        familyDesignId: design.familyDesignId || design.id,
        jewelryGroup: design.jewelryGroup,
        collection: design.collection,
        jewelrySize: design.jewelrySize,
        metalCaratage: metalInfoByDesign.get(String(design.id)) || design.metalCaratage || null,
        designStatus: design.designStatus,
        stoneInfo: design.stoneInfo,
        isPrimary: design.isPrimary,
        createdAt: design.createdAt,
        imageKeys: Array.isArray(design.imageUrls) ? design.imageUrls : [],
        imageUrls: await this.resolveGalleryUrls(design.imageUrls || []),
      };
    }));

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, requester: AuthUser): Promise<any> {
    const design = await this.designRepo.findOne({
      where: { id },
      relations: [
        'company',
        'branch',
        'jewelryGroupMaster',
        'collectionMaster',
        'jewelrySizeMaster',
        'stageMaster',
        'diamondSpreadMaster',
        'diamondTypeMaster',
        'diamondWeightMaster',
        'diamondQualityMaster',
        'designStatusMaster',
        'designTags',
        'designTags.tagMaster',
        'metalCaratageMaster',
        'metals',
        'metals.metalCaratageMaster',
        'metals.metalCaratageMaster.metalMaster',
        'metals.metalCaratageMaster.metalColorMaster',
        'metals.metalCaratageMaster.metalPurityMaster',
        'gemstones',
        'gemstones.packet',
        'gemstones.packet.stoneMaster',
        'gemstones.packet.shapeMaster',
        'gemstones.packet.sizeMaster',
        'gemstones.packet.cutMaster',
        'gemstones.packet.colorMaster',
        'gemstones.packet.qualityMaster',
        'gemstones.stoneMaster',
        'gemstones.shapeMaster',
        'gemstones.sizeMaster',
        'gemstones.cutMaster',
        'gemstones.colorMaster',
        'gemstones.qualityMaster',
        'gemstones.stoneTypeMaster',
        'labors',
        'labors.laborHeadMaster',
        'labors.laborRuleMaster',
        'overheads',
        'overheads.overheadRuleMaster',
        'findings',
        'findings.findingHeadMaster',
        'processStages',
        'processStages.processStageMaster',
        'pricingTiers',
        'vendors',
        'vendors.vendorNameMaster',
        'relevantDesignLinks',
        'relevantDesignLinks.relatedDesign',
        'stlFiles',
      ],
    });

    if (!design) {
      throw new NotFoundException('Product design not found');
    }

    this.assertReadScope(design, requester);
    await this.ensureDesignBarcodes([design]);
    this.hydrateDesignDisplayLabels(design);

    const history = await this.historyRepo.find({
      where: { designId: id },
      relations: ['performedByUser'],
      order: { performedAt: 'DESC' },
    });

    design.metals = this.sortByOrder(design.metals);
    design.gemstones = this.sortByOrder(design.gemstones);
    design.labors = this.sortByOrder(design.labors);
    design.overheads = this.sortByOrder(design.overheads);
    design.findings = this.sortByOrder(design.findings);
    design.processStages = this.sortByOrder(design.processStages);
    design.pricingTiers = this.sortByOrder(design.pricingTiers);
    design.vendors = this.sortByOrder(design.vendors);
    const updatedByMap = await this.resolveUserNames(
      design.updatedBy ? [design.updatedBy] : [],
    );
    const updatedByName = design.updatedBy ? updatedByMap.get(design.updatedBy) ?? null : null;
    const resolvedImageUrls = await this.resolveGalleryUrls(design.imageUrls || []);
    const resolvedStlFileUrl = await this.resolveAssetUrl(design.stlFileUrl);
    const gemstones = await this.withGemstonePacketNames(design.gemstones || []);

    return {
      ...design,
      metals: this.serializeMetalRows(design.metals || []),
      gemstones: this.serializeGemstoneRows(gemstones),
      labors: this.serializeLaborRows(design.labors || []),
      overheads: this.serializeOverheadRows(design.overheads || []),
      findings: this.serializeFindingRows(design.findings || []),
      processStages: this.serializeProcessStageRows(design.processStages || []),
      vendors: this.serializeVendorRows(design.vendors || []),
      imageKeys: Array.isArray(design.imageUrls) ? design.imageUrls : [],
      imageUrls: resolvedImageUrls,
      stlFileUrl: resolvedStlFileUrl,
      ...(await this.resolveDesignVisiblePrices(design, requester)),
      updatedByName,
      relevantDesigns: (design.relevantDesignLinks || []).map((link) => ({
        id: link.relatedDesign?.id,
        designNo: link.relatedDesign?.designNo,
        version: link.relatedDesign?.version,
        jewelryGroup: link.relatedDesign?.jewelryGroup,
      })),
      history,
    };
  }

  async update(id: number, dto: UpdateProductDto, requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
    const design = await this.getDesignForWrite(id, requester);
    const designMasterRefs = await this.resolveDesignMasterRefs(dto, design);
    const designJewelryGroup = designMasterRefs.jewelryGroup.value || 'Design';
    const isRingJewelryGroup = this.isRingJewelryGroup(designMasterRefs.jewelryGroup.id);
    if (!isRingJewelryGroup) {
      designMasterRefs.diamondSpread = { id: null, value: null, aliasName: null };
    }

    const targetCompanyId = dto.companyId !== undefined ? dto.companyId : design.companyId || undefined;
    const targetBranchId = dto.branchId !== undefined ? dto.branchId : design.branchId || undefined;
    const scope = await this.resolveScope(targetCompanyId, targetBranchId, requester);

    const version = this.normalizeVersion(dto.version || design.version);
    const designNo = this.applyVersionToDesignNo(
      dto.designNo || design.designNo,
      version,
      designMasterRefs.jewelrySize.value,
      design.jewelrySize,
    );

    await this.assertUniqueDesign(designNo, version, scope.companyId, id);

    const existingRows = await this.getExistingRows(id);
    const globalRateMaps = await this.getGlobalRateMaps();
    const metalCaratageRates = await this.getMetalCaratageRateMap();
    const normalizedMetals = await this.resolveNormalizedMetalRows(this.normalizeMetals(
      dto.metals !== undefined ? dto.metals : this.toMetalDtos(existingRows.metals),
      metalCaratageRates,
    ));
    const effectiveDiamondType = designMasterRefs.diamondType.value;
    const normalizedGemstones = await this.resolveNormalizedGemstoneRows(this.normalizeGemstones(
      dto.gemstones !== undefined ? dto.gemstones : this.toGemstoneDtos(existingRows.gemstones),
      effectiveDiamondType,
      globalRateMaps,
    ));
    const normalizedLabors = await this.resolveNormalizedLaborRows(this.normalizeLabors(
      dto.labors !== undefined ? dto.labors : this.toLaborDtos(existingRows.labors),
    ));
    const normalizedOverheads =
      dto.overheads !== undefined
        ? (await this.resolveNormalizedOverheadRows(this.normalizeOverheads(dto.overheads))).concat(this.normalizeLegacyOverheadsFromLabors(dto.labors || []))
        : dto.labors !== undefined
          ? this.normalizeLegacyOverheadsFromLabors(dto.labors)
          : this.toOverheadDtos(existingRows.overheads).map((row) => ({
            overheadRuleId: this.optionalInt(row.overheadRuleId),
            overheadHead: this.optionalText(row.overheadHead),
            overheadApplyMode: this.optionalText(row.overheadApplyMode),
            ratePercent: row.ratePercent ?? null,
            flatAmount: row.flatAmount ?? null,
            overheadValue: this.toNumber(row.overheadValue),
          }));
    const normalizedFindings = await this.resolveNormalizedFindingRows(this.normalizeFindings(
      dto.findings !== undefined ? dto.findings : this.toFindingDtos(existingRows.findings),
    ));
    await this.validateDesignRelationRefs(
      {
        processStages: dto.processStages,
        vendors: dto.vendors,
        relevantDesignIds: dto.relevantDesignIds,
      },
      design,
      requester,
    );

    const summary = this.calculateSummary(
      normalizedMetals,
      normalizedGemstones,
      normalizedLabors,
      normalizedOverheads,
      normalizedFindings,
    );

    design.designNo = designNo;
    if (!this.optionalText(design.barcode)) {
      design.barcode = await this.resolveDesignBarcode(undefined, id);
    }
    design.version = version;
    const resolvedFamilyId = await this.resolveFamilyDesignId(undefined, designNo, scope);
    design.familyDesignId = design.familyDesignId || (resolvedFamilyId !== null ? resolvedFamilyId : Number(design.id));
    const nextRequestedDesignName = dto.designName !== undefined ? this.optionalText(dto.designName) : undefined;
    if (dto.designName !== undefined) {
      if (nextRequestedDesignName) {
        await this.assertUniqueDesignName(nextRequestedDesignName, id, design.familyDesignId || design.id);
      }
      design.designName = nextRequestedDesignName;
    } else if (!this.optionalText(design.designName)) {
      const fallbackDesignName = this.buildDefaultDesignName(designJewelryGroup, designNo);
      await this.assertUniqueDesignName(fallbackDesignName, id, design.familyDesignId || design.id);
      design.designName = fallbackDesignName;
    }
    design.companyId = scope.companyId;
    design.branchId = scope.branchId;
    design.jewelryGroupId = designMasterRefs.jewelryGroup.id!;
    design.collectionId = designMasterRefs.collection.id;
    design.jewelrySizeId = designMasterRefs.jewelrySize.id;
    design.stageId = designMasterRefs.stage.id;
    if (isRingJewelryGroup) {
      design.diamondSpreadId = designMasterRefs.diamondSpread.id;
    }
    design.diamondTypeId = designMasterRefs.diamondType.id;
    design.diamondWeightId = designMasterRefs.diamondWeight.id;
    design.diamondQualityId = designMasterRefs.diamondQuality.id;
    design.designStatusId = designMasterRefs.designStatus.id;
    design.metalCaratageId = designMasterRefs.metalCaratage.id;
    design.stoneInfo = this.summarizeGemstoneRows(normalizedGemstones);
    if (dto.drawerLocation !== undefined) design.drawerLocation = this.optionalText(dto.drawerLocation);
    if (dto.otherWeight !== undefined) design.otherWeight = dto.otherWeight ?? null;
    if (dto.designDescription !== undefined) {
      design.designDescription = this.optionalText(dto.designDescription);
    }
    if (dto.remarks !== undefined) design.remarks = this.optionalText(dto.remarks);
    if (dto.imageUrls !== undefined) design.imageUrls = this.normalizeGalleryUrls(dto.imageUrls);
    const previousStlFileUrl = design.stlFileUrl;
    if (dto.stlFileUrl !== undefined) design.stlFileUrl = this.normalizePersistentStlFileUrl(dto.stlFileUrl);
    if (dto.ijewelModelId !== undefined) {
      design.ijewelModelId = this.optionalText(dto.ijewelModelId);
      if (design.ijewelModelId && /^https?:\/\//i.test(design.ijewelModelId)) {
        design.ijewelBaseName = null;
      }
    }
    if (dto.ijewelBaseName !== undefined && !(design.ijewelModelId && /^https?:\/\//i.test(design.ijewelModelId))) {
      design.ijewelBaseName = this.optionalText(dto.ijewelBaseName);
    }
    if (dto.isActive !== undefined) design.isActive = dto.isActive;
    design.metalValue = summary.metalValue;
    design.gemValue = summary.gemValue;
    design.laborValue = summary.laborValue + summary.overheadValue;
    design.findingValue = summary.findingValue;
    design.totalValue = summary.totalValue;
    design.grossWeight = summary.grossWeight;
    design.livePrice = summary.totalValue;
    design.updatedBy = requester.id;

    await this.dataSource.transaction(async (manager) => {
      await this.saveDesignWithUniqueBarcode(design, id, manager.getRepository(Design));
      if (dto.stlFileUrl !== undefined) {
        await this.syncDesignStlFileRecord(
          id,
          design.stlFileUrl,
          previousStlFileUrl,
          requester.id,
          manager.getRepository(DesignStlFile),
        );
      }
    });

    if (dto.metals !== undefined) {
      await this.replaceMetalRows(id, normalizedMetals);
    }

    if (dto.gemstones !== undefined) {
      await this.replaceGemstoneRows(id, normalizedGemstones);
    }

    if (dto.tags !== undefined || dto.tagIds !== undefined || dto.tagsId !== undefined) {
      await this.replaceDesignTags(id, await this.resolveDesignTagIds(dto));
    }

    if (dto.labors !== undefined) {
      await this.replaceLaborRows(id, normalizedLabors);
    }

    if (dto.overheads !== undefined || dto.labors !== undefined) {
      await this.replaceOverheadRows(id, normalizedOverheads);
    }

    if (dto.findings !== undefined) {
      await this.replaceFindingRows(id, normalizedFindings);
    }

    if (dto.processStages !== undefined) {
      await this.replaceProcessStageRows(id, dto.processStages);
    }

    if (dto.pricingTiers !== undefined) {
      await this.replacePricingTierRows(id, dto.pricingTiers);
    }

    if (dto.vendors !== undefined) {
      await this.replaceVendorRows(id, dto.vendors);
    }

    if (dto.relevantDesignIds !== undefined) {
      await this.setRelevantDesignLinks(design, dto.relevantDesignIds, requester);
    }

    await this.addHistory(id, 'UPDATED', 'Design updated successfully.', requester.id);
    return this.findOne(id, requester);
  }

  async setPrimaryVersion(id: number, requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
    const design = await this.getDesignForWrite(id, requester);
    const familyDesignId = design.familyDesignId || design.id;
    const companyId = design.companyId;
    const branchId = design.branchId;

    await this.dataSource.transaction(async (manager) => {
      const resetQuery = manager
        .createQueryBuilder()
        .update(Design)
        .set({ isPrimary: false })
        .where('(familyDesignId = :familyDesignId OR id = :familyDesignId)', { familyDesignId });

      if (companyId) {
        resetQuery.andWhere('companyId = :companyId', { companyId });
      } else {
        resetQuery.andWhere('companyId IS NULL');
      }

      if (branchId) {
        resetQuery.andWhere('branchId = :branchId', { branchId });
      } else {
        resetQuery.andWhere('branchId IS NULL');
      }

      await resetQuery.execute();
      await manager.getRepository(Design).update(
        { id: design.id },
        { isPrimary: true, updatedBy: requester.id },
      );
    });
    this.invalidateMobileConfiguratorFamilyCache(familyDesignId);

    await this.addHistory(id, 'PRIMARY_UPDATED', 'Design version set as primary.', requester.id);
    return this.findOne(id, requester);
  }

  async updateStatus(id: number, isActive: boolean, requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
    if (isActive && requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can activate inactive designs.');
    }
    const design = await this.getDesignForWrite(id, requester);
    await this.designRepo.update({ id }, { isActive, updatedBy: requester.id });
    design.isActive = isActive;
    design.updatedBy = requester.id;

    try {
      await this.addHistory(
        id,
        'STATUS_CHANGED',
        `Design marked as ${isActive ? 'active' : 'inactive'}.`,
        requester.id,
      );
    } catch (error) {
      console.error('Failed to add design status history', error);
    }

    return {
      id: design.id,
      isActive: design.isActive,
      updatedBy: design.updatedBy,
      updatedAt: new Date(),
    };
  }

  async remove(id: number, requester: AuthUser): Promise<{ deleted: boolean }> {
    this.assertDesignWriteAccess(requester);
    const design = await this.getDesignForWrite(id, requester);
    if (!design.isActive) {
      return { deleted: false };
    }
    design.isActive = false;
    design.updatedBy = requester.id;
    await this.designRepo.update({ id }, { isActive: false, updatedBy: requester.id });
    await this.addHistory(id, 'DISABLED', 'Design disabled.', requester.id);
    return { deleted: false };
  }

  async replaceRelevantDesigns(
    id: number,
    designIds: number[],
    requester: AuthUser,
    options?: { logHistory?: boolean },
  ): Promise<any> {
    this.assertDesignWriteAccess(requester);
    const design = await this.getDesignForWrite(id, requester);
    await this.setRelevantDesignLinks(design, designIds, requester);

    if (options?.logHistory !== false) {
      await this.addHistory(id, 'RELEVANT_UPDATED', 'Relevant designs updated successfully.', requester.id);
    }
    return this.findOne(id, requester);
  }

  async replaceProcessStages(id: number, rows: DesignProcessStageDto[], requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
    await this.getDesignForWrite(id, requester);
    await this.replaceProcessStageRows(id, rows || []);
    await this.addHistory(id, 'PROCESS_UPDATED', 'Process stages updated successfully.', requester.id);
    return this.findOne(id, requester);
  }

  async replacePricingTiers(id: number, rows: DesignPricingTierDto[], requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
    await this.getDesignForWrite(id, requester);
    await this.replacePricingTierRows(id, rows || []);
    await this.addHistory(id, 'PRICING_UPDATED', 'Pricing tiers updated successfully.', requester.id);
    return this.findOne(id, requester);
  }

  async replaceVendors(id: number, rows: DesignVendorDto[], requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
    await this.getDesignForWrite(id, requester);
    await this.replaceVendorRows(id, rows || []);
    await this.addHistory(id, 'VENDOR_UPDATED', 'Vendor list updated successfully.', requester.id);
    return this.findOne(id, requester);
  }

  async uploadStlFile(id: number, dto: UploadStlFileDto, requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
    const design = await this.getDesignForWrite(id, requester);
    const fileUrl = this.normalizePersistentStlFileUrl(dto.fileUrl);

    design.stlFileUrl = fileUrl;
    design.updatedBy = requester.id;
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Design).save(design);
      await this.syncDesignStlFileRecord(
        id,
        fileUrl,
        null,
        requester.id,
        manager.getRepository(DesignStlFile),
        dto.fileName,
      );
      const notes = this.optionalText(dto.notes);
      if (notes) {
        await manager.getRepository(DesignStlFile).update({ designId: id, fileUrl }, { notes });
      }
    });

    await this.addHistory(id, 'STL_UPLOADED', 'STL file uploaded successfully.', requester.id);
    return this.findOne(id, requester);
  }

  async getStlFileContent(
    id: number,
    requester: AuthUser,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const design = await this.getDesignForRead(id, requester);
    const stlFileUrl = this.optionalText(design.stlFileUrl);
    if (!stlFileUrl) {
      throw new NotFoundException('No STL file uploaded for this design');
    }

    const buffer = await this.resolveAssetBuffer(stlFileUrl);
    return {
      buffer,
      fileName: this.deriveFileNameFromUrl(stlFileUrl),
    };
  }

  async uploadGalleryFiles(
    files: Array<{ originalname?: string; mimetype?: string; buffer?: Buffer }>,
    request: any,
  ): Promise<{ files: Array<{ fileName: string; url: string; key?: string }> }> {
    const requester: AuthUser | undefined = request?.user;
    if (requester) {
      this.assertDesignCreateAccess(requester);
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image or video file is required.');
    }

    const uploaded: Array<{ fileName: string; url: string; key?: string }> = [];
    const s3Config = this.getS3Client();

    if (s3Config) {
      const { client, bucket } = s3Config;
      const now = new Date();
      const prefix = `design-gallery/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(
        now.getDate(),
      ).padStart(2, '0')}`;

      for (const file of files) {
        if (!file?.buffer || !file.originalname) continue;

        if (!this.isGalleryMimeType(file.mimetype)) {
          throw new BadRequestException(
            `Unsupported file type: ${file.originalname}. Only image and video files are allowed.`,
          );
        }
        this.assertGalleryFileSize(file);

        const extension = this.resolveGalleryExtension(file.originalname, file.mimetype);
        const fileName = `${Date.now()}-${randomUUID()}${extension}`;
        const key = `${prefix}/${fileName}`;

        const upload = new Upload({
          client,
          params: {
            Bucket: bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype || 'application/octet-stream',
          },
        });

        await upload.done();

        const signedUrl = await this.createSignedUrl(client, bucket, key);
        const fileKey = `s3://${bucket}/${key}`;
        await this.saveMediaLibraryEntry({
          fileName,
          fileKey,
          mediaType: this.resolveGalleryMediaType(file.originalname, file.mimetype),
          mimeType: file.mimetype || null,
          fileSizeBytes: file.buffer.length,
          uploadedBy: requester?.id || null,
        });
        uploaded.push({
          fileName,
          url: signedUrl,
          key: fileKey,
        });
      }

      if (uploaded.length === 0) {
        throw new BadRequestException('No valid image or video files uploaded.');
      }

      return { files: uploaded };
    }

    const uploadsRoot = process.env.UPLOADS_ROOT || join(process.cwd(), 'uploads');
    const uploadDir = join(uploadsRoot, 'design-gallery');
    await mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      if (!file?.buffer || !file.originalname) continue;

      if (!this.isGalleryMimeType(file.mimetype)) {
        throw new BadRequestException(
          `Unsupported file type: ${file.originalname}. Only image and video files are allowed.`,
        );
      }
      this.assertGalleryFileSize(file);

      const extension = this.resolveGalleryExtension(file.originalname, file.mimetype);
      const fileName = `${Date.now()}-${randomUUID()}${extension}`;
      const outputPath = join(uploadDir, fileName);
      const fileKey = `/uploads/design-gallery/${fileName}`;

      await writeFile(outputPath, file.buffer);
      await this.saveMediaLibraryEntry({
        fileName,
        fileKey,
        mediaType: this.resolveGalleryMediaType(file.originalname, file.mimetype),
        mimeType: file.mimetype || null,
        fileSizeBytes: file.buffer.length,
        uploadedBy: requester?.id || null,
      });

      uploaded.push({
        fileName,
        url: this.buildPublicAssetUrl(request, fileKey),
        key: fileKey,
      });
    }

    if (uploaded.length === 0) {
      throw new BadRequestException('No valid image or video files uploaded.');
    }

    return { files: uploaded };
  }

  async uploadStlFiles(
    files: Array<{ originalname?: string; mimetype?: string; buffer?: Buffer }>,
    request: any,
  ): Promise<{ files: Array<{ fileName: string; url: string; key?: string }> }> {
    const requester: AuthUser | undefined = request?.user;
    if (requester) {
      this.assertDesignCreateAccess(requester);
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one STL file is required.');
    }

    const uploaded: Array<{ fileName: string; url: string; key?: string }> = [];
    const s3Config = this.getS3Client();

    if (s3Config) {
      const { client, bucket } = s3Config;
      const now = new Date();
      const prefix = `design-stl/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(
        now.getDate(),
      ).padStart(2, '0')}`;

      for (const file of files) {
        if (!file?.buffer || !file.originalname) continue;
        if (!this.isStlFile(file.originalname, file.mimetype)) {
          throw new BadRequestException(
            `Unsupported file type: ${file.originalname}. Only STL files are allowed.`,
          );
        }

        const fileName = `${Date.now()}-${randomUUID()}${this.resolveStlExtension(file.originalname)}`;
        const key = `${prefix}/${fileName}`;

        const upload = new Upload({
          client,
          params: {
            Bucket: bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype || 'model/stl',
          },
        });

        await upload.done();

        const signedUrl = await this.createSignedUrl(client, bucket, key);
        const fileKey = `s3://${bucket}/${key}`;
        await this.saveMediaLibraryEntry({
          fileName,
          fileKey,
          mediaType: DesignMediaType.STL,
          mimeType: file.mimetype || null,
          fileSizeBytes: file.buffer.length,
          uploadedBy: requester?.id || null,
        });
        uploaded.push({
          fileName,
          url: signedUrl,
          key: fileKey,
        });
      }

      if (uploaded.length === 0) {
        throw new BadRequestException('No valid STL files uploaded.');
      }

      return { files: uploaded };
    }

    const uploadsRoot = process.env.UPLOADS_ROOT || join(process.cwd(), 'uploads');
    const uploadDir = join(uploadsRoot, 'design-stl');
    await mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      if (!file?.buffer || !file.originalname) continue;
      if (!this.isStlFile(file.originalname, file.mimetype)) {
        throw new BadRequestException(
          `Unsupported file type: ${file.originalname}. Only STL files are allowed.`,
        );
      }

      const fileName = `${Date.now()}-${randomUUID()}${this.resolveStlExtension(file.originalname)}`;
      const outputPath = join(uploadDir, fileName);
      const fileKey = `/uploads/design-stl/${fileName}`;
      await writeFile(outputPath, file.buffer);
      await this.saveMediaLibraryEntry({
        fileName,
        fileKey,
        mediaType: DesignMediaType.STL,
        mimeType: file.mimetype || null,
        fileSizeBytes: file.buffer.length,
        uploadedBy: requester?.id || null,
      });

      uploaded.push({
        fileName,
        url: this.buildPublicAssetUrl(request, fileKey),
        key: fileKey,
      });
    }

    if (uploaded.length === 0) {
      throw new BadRequestException('No valid STL files uploaded.');
    }

    return { files: uploaded };
  }

  async getHistory(id: number, requester: AuthUser): Promise<any[]> {
    if (requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can view design history');
    }

    await this.getDesignForRead(id, requester);

    const history = await this.historyRepo.find({
      where: { designId: id },
      relations: ['performedByUser'],
      order: { performedAt: 'DESC' },
    });

    return history.map((entry) => ({
      id: entry.id,
      actionType: entry.actionType,
      remarks: entry.remarks,
      user: entry.performedByUser
        ? `${entry.performedByUser.firstName} ${entry.performedByUser.lastName}`.trim()
        : null,
      dateTime: entry.performedAt,
      metadata: entry.metadata,
    }));
  }

  async findMediaLibrary(query: FindDesignMediaLibraryQueryDto): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 30;
    const skip = (page - 1) * limit;

    const qb = this.designMediaLibraryRepo
      .createQueryBuilder('media')
      .where('media.status != :removedStatus', { removedStatus: -1 })
      .orderBy('media.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const type = (query.type || 'ALL').trim().toUpperCase();
    if (type === 'GALLERY') {
      qb.andWhere('media.mediaType IN (:...galleryTypes)', {
        galleryTypes: [DesignMediaType.IMAGE, DesignMediaType.VIDEO],
      });
    } else if (type !== 'ALL') {
      qb.andWhere('media.mediaType = :type', { type });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('media.fileName LIKE :search', { search })
            .orWhere('media.fileKey LIKE :search', { search });
        }),
      );
    }

    const [rows, total] = await qb.getManyAndCount();
    const uploadedByIds = rows
      .map((row) => this.optionalInt(row.uploadedBy))
      .filter((value): value is number => Boolean(value));
    const uploadedByMap = await this.resolveUserNames(uploadedByIds);
    const data = await Promise.all(
      rows.map(async (row) => {
        const uploadedById = this.optionalInt(row.uploadedBy);
        const resolvedUrl = await this.resolveAssetUrl(row.fileKey).catch(() => row.fileKey);
        return {
          id: row.id,
          mediaType: row.mediaType,
          fileName: row.fileName,
          fileKey: row.fileKey,
          mimeType: row.mimeType,
          fileSizeBytes: row.fileSizeBytes ? Number(row.fileSizeBytes) : null,
          url: resolvedUrl || row.fileKey,
          uploadedBy: uploadedById ? uploadedByMap.get(uploadedById) || null : null,
          createdAt: row.createdAt,
        };
      }),
    );

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async removeMediaLibraryItem(
    id: number,
    requester: AuthUser,
  ): Promise<{ removed: boolean; usageCount?: number; usedBy?: Array<{ id: string; designNo: string; version: string }> }> {
    this.assertDesignCreateAccess(requester);

    const media = await this.designMediaLibraryRepo.findOne({ where: { id } });
    if (!media || media.status === -1) {
      throw new NotFoundException('Media library item not found');
    }

    const usageQuery = this.designRepo
      .createQueryBuilder('design')
      .select(['design.id', 'design.designNo', 'design.version'])
      .where('design.stlFileUrl = :fileKey', { fileKey: media.fileKey })
      .orWhere('JSON_SEARCH(design.imageUrls, :searchMode, :fileKey) IS NOT NULL', {
        searchMode: 'one',
        fileKey: media.fileKey,
      });

    const [usedBy, usageCount] = await usageQuery.take(5).getManyAndCount();
    if (usageCount > 0) {
      throw new BadRequestException({
        message: `This media is currently used by ${usageCount} design${usageCount === 1 ? '' : 's'}. Remove it from those designs before deleting.`,
        usageCount,
        usedBy: usedBy.map((design) => ({
          id: design.id,
          designNo: design.designNo,
          version: design.version,
        })),
      });
    }

    media.status = -1;
    await this.designMediaLibraryRepo.save(media);
    return { removed: true };
  }

  async findActiveGlobalBasePrices(): Promise<any> {
    const rows = await this.globalBasePriceRepo.find({
      where: { isActive: true },
      order: { category: 'ASC', referenceValue: 'ASC', subValue: 'ASC', effectiveFrom: 'DESC' },
    });

    return {
      data: rows.map((row) => ({
        id: row.id,
        category: row.category,
        referenceValue: row.referenceValue,
        subValue: row.subValue,
        pricePerUnit: this.toNumber(row.pricePerUnit),
        unit: row.unit,
        currency: row.currency,
        effectiveFrom: row.effectiveFrom,
      })),
      total: rows.length,
    };
  }

  private async getDesignForWrite(id: number, requester: AuthUser): Promise<Design> {
    this.assertDesignWriteAccess(requester);
    const design = await this.designRepo.findOne({ where: { id } });
    if (!design) {
      throw new NotFoundException('Product design not found');
    }
    this.assertReadScope(design, requester);
    return design;
  }

  private async getDesignForRead(id: number, requester: AuthUser): Promise<Design> {
    const design = await this.designRepo.findOne({ where: { id } });
    if (!design) {
      throw new NotFoundException('Product design not found');
    }
    this.assertReadScope(design, requester);
    return design;
  }

  private assertReadScope(design: Design, requester: AuthUser): void {
    if (requester.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (this.isDesignReadOnlyUser(requester)) {
      return;
    }

    if (!requester.companyId) {
      throw new ForbiddenException('User is not assigned to a company');
    }

    if (design.companyId && design.companyId !== requester.companyId) {
      throw new NotFoundException('Product design not found');
    }

    if (requester.branchId && design.branchId && design.branchId !== requester.branchId) {
      throw new NotFoundException('Product design not found');
    }
  }

  private async resolveScope(
    inputCompanyId: number | undefined,
    inputBranchId: number | undefined,
    requester: AuthUser,
  ): Promise<ScopeResult> {
    let companyId = inputCompanyId || null;
    let branchId = inputBranchId || null;

    if (branchId) {
      const branch = await this.branchRepo.findOne({ where: { id: branchId } });
      if (!branch) {
        throw new NotFoundException('Branch not found');
      }

      if (companyId && companyId !== branch.companyId) {
        throw new BadRequestException('Branch does not belong to selected company');
      }

      companyId = branch.companyId;
    }

    if (companyId) {
      const company = await this.companyRepo.findOne({ where: { id: companyId } });
      if (!company) {
        throw new NotFoundException('Company not found');
      }
    }

    if (requester.role === UserRole.SUPER_ADMIN) {
      return { companyId, branchId };
    }

    if (!requester.companyId) {
      throw new ForbiddenException('User is not assigned to a company');
    }

    if (companyId && companyId !== requester.companyId) {
      throw new ForbiddenException('You cannot manage products for another company');
    }

    companyId = requester.companyId;

    if (requester.branchId) {
      if (branchId && branchId !== requester.branchId) {
        throw new ForbiddenException('You cannot manage products for another branch');
      }
      branchId = requester.branchId;
    }

    return { companyId, branchId };
  }

  private applyScopeFilter(
    qb: any,
    requester: AuthUser,
    companyId?: number,
    branchId?: number,
  ): void {
    const normalizedCompanyId = companyId;
    const normalizedBranchId = branchId;

    if (requester.role === UserRole.SUPER_ADMIN) {
      if (normalizedCompanyId) {
        qb.andWhere('design.companyId = :companyId', { companyId: normalizedCompanyId });
      }
      if (normalizedBranchId) {
        qb.andWhere('design.branchId = :branchId', { branchId: normalizedBranchId });
      }
      return;
    }

    if (this.isDesignReadOnlyUser(requester)) {
      if (normalizedCompanyId) {
        qb.andWhere('design.companyId = :companyId', { companyId: normalizedCompanyId });
      }
      if (normalizedBranchId) {
        qb.andWhere('design.branchId = :branchId', { branchId: normalizedBranchId });
      }
      return;
    }

    if (!requester.companyId) {
      throw new ForbiddenException('User is not assigned to a company');
    }

    if (normalizedCompanyId && normalizedCompanyId !== requester.companyId) {
      throw new ForbiddenException('You cannot access another company data');
    }

    qb.andWhere('(design.companyId = :scopeCompanyId OR design.companyId IS NULL)', {
      scopeCompanyId: requester.companyId,
    });

    if (requester.branchId) {
      if (normalizedBranchId && normalizedBranchId !== requester.branchId) {
        throw new ForbiddenException('You cannot access another branch data');
      }

      qb.andWhere('(design.branchId = :scopeBranchId OR design.branchId IS NULL)', {
        scopeBranchId: requester.branchId,
      });
      return;
    }

    if (normalizedBranchId) {
      qb.andWhere('design.branchId = :scopeBranchId', { scopeBranchId: normalizedBranchId });
    }
  }

  private isDesignWriteUser(requester: AuthUser): boolean {
    return requester.role === UserRole.SUPER_ADMIN;
  }

  private canCreateDesign(requester: AuthUser): boolean {
    return requester.role === UserRole.SUPER_ADMIN;
  }

  private hasDesignEntriesPermission(requester: AuthUser): boolean {
    if (requester.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    return (requester.taskPermissions || []).includes(TaskPermission.DESIGN_ENTRIES);
  }

  private isDesignReadOnlyUser(requester: AuthUser): boolean {
    return !this.isDesignWriteUser(requester);
  }

  private assertDesignWriteAccess(requester: AuthUser): void {
    if (!this.isDesignWriteUser(requester)) {
      throw new ForbiddenException('You have read-only access for designs');
    }
  }

  private assertDesignCreateAccess(requester: AuthUser): void {
    if (!this.canCreateDesign(requester)) {
      throw new ForbiddenException('You do not have permission to add designs');
    }
  }

  private async assertUniqueDesign(
    designNo: string,
    _version: string,
    _companyId: number | null,
    excludeId?: string | number,
  ): Promise<void> {
    const normalizedDesignNo = this.normalizeDesignNo(designNo);
    const qb = this.designRepo
      .createQueryBuilder('design')
      .select('design.id')
      .where('UPPER(TRIM(design.designNo)) = :designNo', { designNo: normalizedDesignNo });

    if (excludeId !== undefined && excludeId !== null) {
      qb.andWhere('design.id != :excludeId', { excludeId: Number(excludeId) });
    }

    const existing = await qb.getRawOne<{ id: string | number }>();
    if (existing) {
      throw new BadRequestException('Design No already exists.');
    }
  }

  private async assertUniqueDesignName(
    designName: string | null,
    excludeId?: string | number,
    familyDesignId?: string | number | null,
  ): Promise<void> {
    const normalizedDesignName = this.optionalText(designName);
    if (!normalizedDesignName) {
      return;
    }

    const qb = this.designRepo
      .createQueryBuilder('design')
      .select('design.id')
      .where('LOWER(TRIM(design.designName)) = LOWER(TRIM(:designName))', { designName: normalizedDesignName });

    if (excludeId !== undefined && excludeId !== null) {
      qb.andWhere('design.id != :excludeId', { excludeId: Number(excludeId) });
    }

    if (familyDesignId !== undefined && familyDesignId !== null) {
      qb.andWhere('COALESCE(design.familyDesignId, design.id) != :familyDesignId', {
        familyDesignId: Number(familyDesignId),
      });
    }

    const existing = await qb.getRawOne<{ id: string | number }>();
    if (existing) {
      throw new BadRequestException('Design Name already exists.');
    }
  }

  /**
   * A version is a unique configuration within a design family. Master IDs are
   * used rather than display text so aliases, casing, and spacing cannot create
   * a second copy of the same variant.
   */
  private async assertUniqueFamilyVariantCombination(
    familyDesignId: number | null,
    refs: DesignMasterRefs,
  ): Promise<void> {
    if (!familyDesignId) {
      return;
    }

    const existing = await this.designRepo
      .createQueryBuilder('design')
      .select('design.id')
      .where('(design.familyDesignId = :familyDesignId OR design.id = :familyDesignId)', { familyDesignId })
      .andWhere('design.metalCaratageId <=> :metalCaratageId', { metalCaratageId: refs.metalCaratage.id })
      .andWhere(
        this.isRingJewelryGroup(refs.jewelryGroup.id)
          ? 'design.diamondSpreadId <=> :diamondSpreadId'
          : '1 = 1',
        { diamondSpreadId: refs.diamondSpread.id },
      )
      .andWhere('design.diamondTypeId <=> :diamondTypeId', { diamondTypeId: refs.diamondType.id })
      .andWhere('design.diamondWeightId <=> :diamondWeightId', { diamondWeightId: refs.diamondWeight.id })
      .andWhere('design.diamondQualityId <=> :diamondQualityId', { diamondQualityId: refs.diamondQuality.id })
      .andWhere('design.jewelrySizeId <=> :jewelrySizeId', { jewelrySizeId: refs.jewelrySize.id })
      .getRawOne<{ id: string | number }>();

    if (existing) {
      throw new BadRequestException('This variant combination already exists for this base design.');
    }
  }

  private async resolvePrimaryVersionFlag(
    familyDesignId: number | null,
    baseDesignNo: string,
    version: string,
    scope: ScopeResult,
  ): Promise<boolean> {
    if (!familyDesignId && version !== 'V1') {
      return false;
    }

    const qb = this.designRepo
      .createQueryBuilder('design')
      .select('design.id');

    if (familyDesignId) {
      qb.where('(design.familyDesignId = :familyDesignId OR design.id = :familyDesignId)', { familyDesignId });
    } else {
      qb.where(
        '(design.designNo = :baseDesignNo OR design.designNo LIKE :versionedDesignNo)',
        { baseDesignNo, versionedDesignNo: `${baseDesignNo}-V%` },
      );
    }
    qb.andWhere('design.isPrimary = :isPrimary', { isPrimary: true });

    if (scope.companyId) {
      qb.andWhere('design.companyId = :companyId', { companyId: scope.companyId });
    } else {
      qb.andWhere('design.companyId IS NULL');
    }

    if (scope.branchId) {
      qb.andWhere('design.branchId = :branchId', { branchId: scope.branchId });
    } else {
      qb.andWhere('design.branchId IS NULL');
    }

    const existingPrimaryCount = await qb.getCount();
    return existingPrimaryCount === 0;
  }

  private buildDesignNoPrefix(jewelryGroup: string): string {
    const token = jewelryGroup
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)[0];

    return (token || 'DSN').slice(0, 5);
  }

  private isRingJewelryGroup(jewelryGroupId: number | null | undefined): boolean {
    return Number(jewelryGroupId) === JEWELRY_GROUP_IDS.RING;
  }

  private async resolveJewelryGroupPrefix(jewelryGroup: string): Promise<string> {
    const normalizedGroup = jewelryGroup.trim();
    if (!normalizedGroup) {
      return 'DSN';
    }

    const groupMaster = await this.masterTablesService.findOne(
      DesignMasterType.JEWELRY_GROUP,
      { search: normalizedGroup },
    );

    const alias = (groupMaster?.aliasName || '').trim();
    if (alias) {
      return this.buildDesignNoPrefix(alias);
    }

    return this.buildDesignNoPrefix(normalizedGroup);
  }

  private normalizeDesignIdentityToken(value: string | null | undefined): string {
    return (value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '');
  }

  private getDesignIdentityToken(ref: MasterRef): string {
    return this.normalizeDesignIdentityToken(ref.aliasName || ref.value);
  }

  private buildAliasDesignIdentity(refs: DesignMasterRefs, designName?: string | null): { designNoPrefix: string; designName: string } {
    const requestedDesignName = this.optionalText(designName);
    const nameCode = this.normalizeDesignIdentityToken(requestedDesignName);
    const diamondSpread = this.getDesignIdentityToken(refs.diamondSpread);
    const metal = this.getDesignIdentityToken(refs.metalCaratage);
    const diamondWeight = this.getDesignIdentityToken(refs.diamondWeight);
    const diamondQuality = this.getDesignIdentityToken(refs.diamondQuality);
    const segments = [nameCode, diamondSpread, metal, diamondWeight, diamondQuality].filter(Boolean);

    return {
      designNoPrefix: segments.join('-'),
      designName: requestedDesignName || '',
    };
  }
  private async generateNextDesignNo(prefix: string, companyId: number | null): Promise<string> {
    const regex = `^${prefix}-[0-9]+$`;
    const qb = this.designRepo
      .createQueryBuilder('design')
      .select(
        "MAX(CAST(SUBSTRING_INDEX(design.designNo, '-', -1) AS UNSIGNED))",
        'maxSequence',
      )
      .where('design.designNo REGEXP :regex', { regex });

    const result = await qb.getRawOne<{ maxSequence?: number | string | null }>();
    const maxSequence = Number(result?.maxSequence ?? 0);
    const nextSequence = Number.isFinite(maxSequence) ? maxSequence + 1 : 1;
    return `${prefix}-${String(nextSequence).padStart(4, '0')}`;
  }

  private async withDesignNoLock<T>(
    companyId: number | null,
    prefix: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    const lockKey = `design-no:${companyId || 'global'}:${prefix}`;
    const acquireResult: Array<Record<string, unknown>> = await this.dataSource.query(
      'SELECT GET_LOCK(?, 10) AS acquired',
      [lockKey],
    );

    const acquired = Number(acquireResult?.[0]?.acquired ?? 0) === 1;
    if (!acquired) {
      throw new BadRequestException('Unable to reserve design number. Please retry.');
    }

    try {
      return await callback();
    } finally {
      await this.dataSource.query('SELECT RELEASE_LOCK(?)', [lockKey]);
    }
  }

  private normalizeMetals(
    rows: DesignMetalDto[],
    metalCaratageRates?: Map<string, number>,
  ): NormalizedMetalRow[] {
    return rows.map((row, index) => {
      const rowNo = index + 1;
      const netWt = this.toNumber(row.netWt);
      const components = Math.max(0, Math.trunc(this.toNumber(row.components)));

      if (netWt <= 0) {
        throw new BadRequestException(
          `Net Weight is required and must be greater than 0 for Metal row ${rowNo}`,
        );
      }

      const metalCaratage = this.optionalText(row.metalCaratage);
      if (!metalCaratage) {
        throw new BadRequestException(
          `Metal is required for Metal row ${rowNo}`,
        );
      }
      const wastagePercent = this.toNumber(row.wastagePercent);
      if (wastagePercent < 0) {
        throw new BadRequestException(
          `Wastage Percent cannot be negative for Metal row ${rowNo}`,
        );
      }

      const wastageWt = (netWt * wastagePercent) / 100;
      const totalWt = netWt + wastageWt;
      const enteredPricePerGm = this.toNumber(row.pricePerGm);
      if (enteredPricePerGm < 0) {
        throw new BadRequestException(
          `Price Per Gram cannot be negative for Metal row ${rowNo}`,
        );
      }
      const masterPricePerGm = this.resolveMetalCaratageRate(metalCaratageRates, metalCaratage);
      const pricePerGm =
        enteredPricePerGm > 0
          ? enteredPricePerGm
          : masterPricePerGm !== undefined
            ? masterPricePerGm
            : enteredPricePerGm;
      if (pricePerGm < 0) {
        throw new BadRequestException(
          `Price Per Gram cannot be negative for Metal row ${rowNo}`,
        );
      }
      if (pricePerGm <= 0) {
        throw new BadRequestException(
          `Price Per Gram must be greater than 0 for Metal row ${rowNo}. Select Metal with a valid master Price/Gms or enter manually.`,
        );
      }
      const computedValue = totalWt * pricePerGm;
      const value =
        row.value !== undefined && row.value !== null ? this.toNumber(row.value) : computedValue;
      if (value < 0) {
        throw new BadRequestException(`Value cannot be negative for Metal row ${rowNo}`);
      }

      return {
        metalCaratageId: this.optionalInt(row.metalCaratageId),
        metalCaratage,
        netWt,
        wastagePercent,
        wastageWt,
        totalWt,
        pricePerGm,
        value,
        components,
      };
    });
  }

  private async getMetalCaratageRateMap(): Promise<Map<string, number>> {
    const rows = await this.masterTablesService.list(DesignMasterType.METAL_CARATAGE, {
      status: 'ACTIVE',
    }) as ProductMasterRow[];

    const map = new Map<string, number>();
    rows.forEach((row) => {
      const rate = this.toNumber(row.livePricePerGm);
      if (rate <= 0) return;

      const keys = [(row.value || '').trim().toLowerCase(), (row.aliasName || '').trim().toLowerCase()].filter(Boolean);
      keys.forEach((key) => {
        if (!map.has(key)) {
          map.set(key, rate);
        }
      });
    });
    return map;
  }

  private async syncMetalCaratageRatesForMetalName(
    metalName: string,
    updatedBy?: number | null,
  ): Promise<string[]> {
    const normalizedMetalName = this.optionalText(metalName);
    if (!normalizedMetalName) {
      return [];
    }

    const metalMaster = await this.masterTablesService.findOne(
      DesignMasterType.METAL_NAME,
      { value: normalizedMetalName },
    ) as ProductMasterRow | null;

    if (metalMaster?.marketPricePerGm === null || metalMaster?.marketPricePerGm === undefined) {
      return [];
    }

    const baseMarketPricePerGm = this.toNumber(metalMaster.marketPricePerGm);
    const metalCaratages = await this.masterTablesService.list(DesignMasterType.METAL_CARATAGE, {
      metalId: metalMaster.id,
      status: 'ALL',
    }) as ProductMasterRow[];

    const affectedValues = new Set<string>();

    for (const metalCaratage of metalCaratages) {
      let purityPercentage =
        metalCaratage.purityPercentage !== null && metalCaratage.purityPercentage !== undefined
          ? this.toNumber(metalCaratage.purityPercentage)
          : null;

      const joinedPurity = metalCaratage.metalPurity as ProductMasterRow | null | undefined;
      if (
        purityPercentage === null &&
        joinedPurity?.purityPercentage !== null &&
        joinedPurity?.purityPercentage !== undefined
      ) {
        purityPercentage = this.toNumber(joinedPurity.purityPercentage);
      }

      if (purityPercentage === null) {
        continue;
      }

      const nextLivePricePerGm = this.roundTo2((baseMarketPricePerGm * purityPercentage) / 100);
      if (this.toNumber(metalCaratage.livePricePerGm) !== nextLivePricePerGm) {
        await this.masterTablesService.update(
          DesignMasterType.METAL_CARATAGE,
          metalCaratage.id,
          {
            livePricePerGm: nextLivePricePerGm,
            purityPercentage,
          },
          this.systemMasterRequester(updatedBy),
        );
      }

      if (metalCaratage.value) {
        affectedValues.add(metalCaratage.value);
      }
    }

    return Array.from(affectedValues);
  }

  private async safeSaveMetalPriceHistory(master: ProductMasterRow, changedBy: number): Promise<void> {
    try {
      await this.metalPriceHistoryRepo.save(
        this.metalPriceHistoryRepo.create({
          metalNameId: master.id,
          marketPricePerOunce: this.toNumber(master.marketPricePerOunce) || 0,
          marketPricePerGm: this.toNumber(master.marketPricePerGm) || 0,
          livePricePerGm: this.toNumber(master.livePricePerGm) || 0,
          changedBy,
        }),
      );
    } catch (error) {
      console.error('Failed to save metal price history', error);
    }
  }

  private systemMasterRequester(userId?: number | null): AuthUser {
    return {
      id: userId || 0,
      email: 'system@local',
      firstName: 'System',
      lastName: '',
      role: UserRole.SUPER_ADMIN,
      companyId: null,
      branchId: null,
      photoUrl: null,
      taskPermissions: [],
    };
  }

  private scheduleMetalNameDependentsSync(master: ProductMasterRow, updatedBy: number): void {
    const key = this.normalizeLookupKey(master.value) || String(master.id);
    const existingTimer = this.metalNameSyncTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.metalNameSyncTimers.delete(key);
      void this.safeSyncMetalNameDependents(master, updatedBy);
    }, 5000);
    this.metalNameSyncTimers.set(key, timer);
  }

  private async safeSyncMetalNameDependents(master: ProductMasterRow, updatedBy: number): Promise<void> {
    try {
      const affectedMetalCaratages = await this.syncMetalCaratageRatesForMetalName(
        master.value,
        updatedBy,
      );
      await this.recalculateDesignsForDependencies({ metalCaratages: affectedMetalCaratages });
    } catch (error) {
      console.error('Failed to sync dependent metal prices', error);
    }
  }

  private async recalculateDesignsForDependencies(input: {
    metalCaratages?: string[];
    packetIds?: Array<string | number>;
  }): Promise<{ updatedDesigns: number; totalDesigns: number }> {
    const metalCaratageKeys = new Set(
      (input.metalCaratages || [])
        .map((value) => this.normalizeLookupKey(value))
        .filter(Boolean),
    );
    const packetIds = new Set(
      (input.packetIds || [])
        .map((value) => this.optionalInt(value))
        .filter((value): value is number => value !== null),
    );

    if (metalCaratageKeys.size === 0 && packetIds.size === 0) {
      return { updatedDesigns: 0, totalDesigns: 0 };
    }

    const matchingDesignIds = new Set<string | number>();

    if (packetIds.size > 0) {
      const gemstones = await this.gemstoneRepo.find({
        select: ['designId'],
        where: {
          packetId: In(Array.from(packetIds)),
        },
      });
      for (const g of gemstones) {
        if (g.designId) {
          matchingDesignIds.add(g.designId);
        }
      }
    }

    if (metalCaratageKeys.size > 0) {
      const metals = await this.metalRepo.find({
        select: ['designId'],
        where: {
          metalCaratage: In(Array.from(metalCaratageKeys)),
        },
      });
      for (const m of metals) {
        if (m.designId) {
          matchingDesignIds.add(m.designId);
        }
      }
    }

    if (matchingDesignIds.size === 0) {
      return { updatedDesigns: 0, totalDesigns: 0 };
    }

    const metalRateMap = await this.getMetalCaratageRateMap();
    const packetRows = packetIds.size
      ? await this.packetRepo.find({
        where: {
          id: In(Array.from(packetIds)),
        },
      })
      : [];
    const packetRateMap = new Map(
      packetRows.map((row) => [row.id, this.toNumber(row.sellingPrice)]),
    );

    const designIds = Array.from(matchingDesignIds);
    const chunkSize = 25;
    let updatedDesigns = 0;

    for (let offset = 0; offset < designIds.length; offset += chunkSize) {
      const chunkIds = designIds.slice(offset, offset + chunkSize);
      const designs = await this.designRepo.find({
        where: {
          id: In(chunkIds),
        },
        relations: ['metals', 'gemstones', 'labors', 'overheads', 'findings'],
      });

      for (const design of designs) {
        const metals = design.metals || [];
        const gemstones = design.gemstones || [];

        const touchesMetalDependency =
          metalCaratageKeys.size > 0 &&
          metals.some((row) => metalCaratageKeys.has(this.normalizeLookupKey(row.metalCaratage)));
        const touchesPacketDependency =
          packetIds.size > 0 &&
          gemstones.some((row) => row.packetId && packetIds.has(row.packetId));

        if (!touchesMetalDependency && !touchesPacketDependency) {
          continue;
        }

        let metalsChanged = false;
        let gemstonesChanged = false;

        for (const metal of metals) {
          const lookup = this.normalizeLookupKey(metal.metalCaratage);
          if (!lookup || (metalCaratageKeys.size > 0 && !metalCaratageKeys.has(lookup))) {
            continue;
          }

          const rate = metalRateMap.get(lookup);
          if (rate === undefined) {
            continue;
          }

          const nextValue = this.roundTo2(this.toNumber(metal.totalWt) * rate);
          if (this.toNumber(metal.pricePerGm) !== rate || this.toNumber(metal.value) !== nextValue) {
            metal.pricePerGm = rate;
            metal.value = nextValue;
            metalsChanged = true;
          }
        }

        for (const gemstone of gemstones) {
          const packetId = gemstone.packetId || null;
          if (!packetId || (packetIds.size > 0 && !packetIds.has(packetId))) {
            continue;
          }

          const rate = packetRateMap.get(packetId);
          if (rate === undefined) {
            continue;
          }

          const computedWeight = this.roundTo3(
            this.toNumber(gemstone.wtPerPcs) * Math.max(0, Math.trunc(this.toNumber(gemstone.pcs))),
          );
          const currentWtInCts = this.toNumber(gemstone.wtInCts);
          const nextWtInCts = currentWtInCts > 0 ? currentWtInCts : computedWeight;
          const nextAmount = this.roundTo2(nextWtInCts * rate);

          if (
            this.toNumber(gemstone.pricePerCt) !== rate ||
            this.toNumber(gemstone.amount) !== nextAmount ||
            this.toNumber(gemstone.wtInCts) !== nextWtInCts
          ) {
            gemstone.pricePerCt = rate;
            gemstone.amount = nextAmount;
            gemstone.wtInCts = nextWtInCts;
            gemstonesChanged = true;
          }
        }

        if (metalsChanged) {
          await this.metalRepo.save(metals);
        }

        if (gemstonesChanged) {
          await this.gemstoneRepo.save(gemstones);
        }

        if (!metalsChanged && !gemstonesChanged) {
          continue;
        }

        const summary = this.calculateSummary(
          metals.map((row) => ({
            metalCaratageId: row.metalCaratageId || null,
            metalCaratage: row.metalCaratage || null,
            netWt: this.toNumber(row.netWt),
            wastagePercent: this.toNumber(row.wastagePercent),
            wastageWt: this.toNumber(row.wastageWt),
            totalWt: this.toNumber(row.totalWt),
            pricePerGm: this.toNumber(row.pricePerGm),
            value: this.toNumber(row.value),
            components: this.toNumber(row.components),
          })),
          gemstones.map((row) => ({
            packetId: row.packetId || null,
            stoneId: row.stoneId || null,
            stone: row.stone || null,
            shapeId: row.shapeId || null,
            shape: row.shape || null,
            sizeId: row.sizeId || null,
            size: row.size || null,
            cutId: row.cutId || null,
            cut: row.cut || null,
            colorId: row.colorId || null,
            color: row.color || null,
            qualityId: row.qualityId || null,
            quality: row.quality || null,
            stoneTypeId: row.stoneTypeId || null,
            stoneType: row.stoneType || null,
            wtPerPcs: this.toNumber(row.wtPerPcs),
            pcs: Math.max(0, Math.trunc(this.toNumber(row.pcs))),
            wtInCts: this.toNumber(row.wtInCts),
            pricePerCt: this.toNumber(row.pricePerCt),
            amount: this.toNumber(row.amount),
          })),
          (design.labors || []).map((row) => ({
            laborHeadId: row.laborHeadId || null,
            laborHead: row.laborHead || null,
            laborRuleId: row.laborRuleId || null,
            laborRule: row.laborRuleMaster?.value || null,
            laborPerUnit: this.toNumber(row.laborPerUnit),
            unitQty: this.toNumber(row.unitQty),
            laborValue: this.toNumber(row.laborValue),
          })),
          (design.overheads || []).map((row) => ({
            overheadRuleId: row.overheadRuleId || null,
            overheadHead: row.overheadHead || null,
            overheadApplyMode: row.overheadApplyMode || null,
            ratePercent: row.ratePercent !== null && row.ratePercent !== undefined ? this.toNumber(row.ratePercent) : null,
            flatAmount: row.flatAmount !== null && row.flatAmount !== undefined ? this.toNumber(row.flatAmount) : null,
            overheadValue: this.toNumber(row.overheadValue),
          })),
          (design.findings || []).map((row) => ({
            findingHeadId: row.findingHeadId || null,
            findingHead: row.findingHead || null,
            pricePerUnit: this.toNumber(row.pricePerUnit),
            units: this.toNumber(row.units),
            totalWeight: this.toNumber(row.totalWeight),
            findingValue: this.toNumber(row.findingValue),
          })),
        );

        design.metalValue = summary.metalValue;
        design.gemValue = summary.gemValue;
        design.laborValue = summary.laborValue + summary.overheadValue;
        design.findingValue = summary.findingValue;
        design.totalValue = summary.totalValue;
        design.grossWeight = summary.grossWeight;
        design.livePrice = summary.totalValue;
        design.metalCaratage = this.summarizeMetalRows(metals);
        design.stoneInfo = this.summarizeGemstoneRows(gemstones);

        await this.designRepo.save(design);
        updatedDesigns += 1;
      }

      if (offset + chunkSize < designIds.length) {
        await this.sleep(100);
      }
    }

    return { updatedDesigns, totalDesigns: designIds.length };
  }

  private normalizeGemstones(
    rows: DesignGemstoneDto[],
    designDiamondType: string | null,
    globalRateMaps?: GlobalRateMaps,
  ): NormalizedGemstoneRow[] {
    return rows.map((row, index) => {
      const rowNo = index + 1;
      const stoneType = this.optionalText(row.stoneType);
      const effectiveDiamondType = stoneType || designDiamondType;
      const wtPerPcs = this.toNumber(row.wtPerPcs);
      const rawPcs = this.toNumber(row.pcs);
      const pcs = Math.max(0, Math.trunc(rawPcs));
      if (wtPerPcs < 0) {
        throw new BadRequestException(`Wt Per Pcs cannot be negative for Stone row ${rowNo}`);
      }
      if (rawPcs < 0) {
        throw new BadRequestException(`Number of Pcs cannot be negative for Stone row ${rowNo}`);
      }

      const wtInCts = wtPerPcs * pcs;
      const globalPricePerCt = this.resolveDiamondRate(globalRateMaps, effectiveDiamondType, row.size || null);
      const enteredPricePerCt = this.toNumber(row.pricePerCt);
      if (globalPricePerCt === undefined && enteredPricePerCt < 0) {
        throw new BadRequestException(`Price Per Ct cannot be negative for Stone row ${rowNo}`);
      }
      const pricePerCt =
        globalPricePerCt !== undefined ? globalPricePerCt : enteredPricePerCt;
      if (pricePerCt < 0) {
        throw new BadRequestException(`Price Per Ct cannot be negative for Stone row ${rowNo}`);
      }
      const computedAmount = wtInCts * pricePerCt;
      const amount =
        row.amount !== undefined && row.amount !== null
          ? this.toNumber(row.amount)
          : computedAmount;
      if (amount < 0) {
        throw new BadRequestException(`Amount cannot be negative for Stone row ${rowNo}`);
      }

      return {
        packetId: this.optionalInt(row.packetId),
        stoneId: this.optionalInt(row.stoneId),
        stone: this.optionalText(row.stone),
        shapeId: this.optionalInt(row.shapeId),
        shape: this.optionalText(row.shape),
        sizeId: this.optionalInt(row.sizeId),
        size: this.optionalText(row.size),
        cutId: this.optionalInt(row.cutId),
        cut: this.optionalText(row.cut),
        colorId: this.optionalInt(row.colorId),
        color: this.optionalText(row.color),
        qualityId: this.optionalInt(row.qualityId),
        quality: this.optionalText(row.quality),
        stoneTypeId: this.optionalInt((row as any).stoneTypeId),
        stoneType,
        wtPerPcs,
        pcs,
        wtInCts,
        pricePerCt,
        amount,
      };
    });
  }

  private normalizeLabors(rows: DesignLaborDto[]): NormalizedLaborRow[] {
    return rows
      .filter((row) => !this.isLegacyOverheadLaborRow(row))
      .map((row) => {
        const laborPerUnit = this.toNumber(row.laborPerUnit);
        const unitQty = this.toNumber(row.unitQty);
        const laborValue = laborPerUnit * unitQty;

        return {
          laborHeadId: this.optionalInt(row.laborHeadId),
          laborHead: this.optionalText(row.laborHead),
          laborRuleId: this.optionalInt(row.laborRuleId),
          laborRule: this.optionalText(row.laborRule),
          laborPerUnit,
          unitQty,
          laborValue,
        };
      });
  }

  private normalizeOverheads(rows: DesignOverheadDto[]): NormalizedOverheadRow[] {
    return rows.map((row) => ({
      overheadRuleId: this.optionalInt(row.overheadRuleId),
      overheadHead: this.optionalText(row.overheadHead),
      overheadApplyMode: this.optionalText(row.overheadApplyMode),
      ratePercent: row.ratePercent !== undefined && row.ratePercent !== null ? this.toNumber(row.ratePercent) : null,
      flatAmount: row.flatAmount !== undefined && row.flatAmount !== null ? this.toNumber(row.flatAmount) : null,
      overheadValue: this.toNumber(row.overheadValue),
    }));
  }

  private normalizeLegacyOverheadsFromLabors(rows: DesignLaborDto[]): NormalizedOverheadRow[] {
    return rows
      .filter((row) => this.isLegacyOverheadLaborRow(row))
      .map((row) => ({
        overheadRuleId: null,
        overheadHead: this.optionalText(String(row.laborHead || '').replace(/^Overhead\s*-\s*/i, '')),
        overheadApplyMode: null,
        ratePercent: null,
        flatAmount: null,
        overheadValue: row.laborValue !== undefined && row.laborValue !== null
          ? this.toNumber(row.laborValue)
          : this.toNumber(row.laborPerUnit) * this.toNumber(row.unitQty),
      }));
  }

  private isLegacyOverheadLaborRow(row: Pick<DesignLaborDto, 'laborHead'>): boolean {
    return String(row.laborHead || '').trim().toLowerCase().startsWith('overhead -');
  }

  private normalizeFindings(rows: DesignFindingDto[]): NormalizedFindingRow[] {
    return rows.map((row) => {
      const pricePerUnit = this.toNumber(row.pricePerUnit);
      const units = this.toNumber(row.units);
      const findingValue =
        row.findingValue !== undefined ? this.toNumber(row.findingValue) : pricePerUnit * units;

      return {
        findingHeadId: this.optionalInt(row.findingHeadId),
        findingHead: this.optionalText(row.findingHead),
        pricePerUnit,
        units,
        totalWeight: this.toNumber(row.totalWeight),
        findingValue,
      };
    });
  }

  private calculateSummary(
    metals: NormalizedMetalRow[],
    gemstones: NormalizedGemstoneRow[],
    labors: NormalizedLaborRow[],
    overheads: NormalizedOverheadRow[],
    findings: NormalizedFindingRow[],
  ): SummaryBreakdown {
    const metalValue = metals.reduce((sum, row) => sum + row.value, 0);
    const gemValue = gemstones.reduce((sum, row) => sum + row.amount, 0);
    const laborValue = labors.reduce((sum, row) => sum + row.laborValue, 0);
    const overheadValue = overheads.reduce((sum, row) => sum + row.overheadValue, 0);
    const findingValue = findings.reduce((sum, row) => sum + row.findingValue, 0);
    const totalValue = metalValue + gemValue + laborValue + overheadValue + findingValue;
    const grossWeight = metals.reduce((sum, row) => sum + row.totalWt, 0);

    return { metalValue, gemValue, laborValue, overheadValue, findingValue, totalValue, grossWeight };
  }

  private summarizeMetalRows(rows: Array<{ metalCaratage?: string | null }>): string | null {
    const values = rows
      .map((row) => this.optionalText(row.metalCaratage))
      .filter((value): value is string => Boolean(value));

    return values.length > 0 ? Array.from(new Set(values)).join(', ') : null;
  }

  private summarizeGemstoneRows(rows: Array<{ stone?: string | null; stoneType?: string | null }>): string | null {
    const values = rows
      .map((row) => this.optionalText(row.stone) || this.optionalText(row.stoneType))
      .filter((value): value is string => Boolean(value));

    return values.length > 0 ? values.join(', ') : null;
  }

  private async replaceMetalRows(designId: number, rows: NormalizedMetalRow[]): Promise<void> {
    await this.metalRepo.delete({ designId });

    if (rows.length === 0) {
      return;
    }

    const entities = rows.map((row, index) =>
      this.metalRepo.create({
        designId,
        sortOrder: index,
        ...row,
      }),
    );

    await this.metalRepo
      .createQueryBuilder()
      .insert()
      .into(DesignMetal)
      .values(entities as any[])
      .updateEntity(false)
      .execute();
  }

  private async replaceGemstoneRows(designId: number, rows: NormalizedGemstoneRow[]): Promise<void> {
    await this.gemstoneRepo.delete({ designId });

    if (rows.length === 0) {
      return;
    }

    const entities = rows.map((row, index) =>
      this.gemstoneRepo.create({
        designId,
        sortOrder: index,
        ...row,
      }),
    );

    await this.gemstoneRepo
      .createQueryBuilder()
      .insert()
      .into(DesignGemstone)
      .values(entities as any[])
      .updateEntity(false)
      .execute();
  }

  private async replaceDesignTags(designId: number, tagIds: number[]): Promise<void> {
    await this.designTagRepo.delete({ designId });
    if (!tagIds.length) return;
    await this.designTagRepo.save(
      tagIds.map((tagId) => this.designTagRepo.create({ designId, tagId })),
    );
  }

  private async replaceLaborRows(designId: number, rows: NormalizedLaborRow[]): Promise<void> {
    await this.laborRepo.delete({ designId });

    if (rows.length === 0) {
      return;
    }

    const entities = rows.map((row, index) =>
      this.laborRepo.create({
        designId,
        sortOrder: index,
        ...row,
      }),
    );

    await this.laborRepo
      .createQueryBuilder()
      .insert()
      .into(DesignLabor)
      .values(entities as any[])
      .updateEntity(false)
      .execute();
  }

  private async replaceOverheadRows(designId: number, rows: NormalizedOverheadRow[]): Promise<void> {
    await this.overheadRepo.delete({ designId });

    if (rows.length === 0) {
      return;
    }

    const entities = rows.map((row, index) =>
      this.overheadRepo.create({
        designId,
        sortOrder: index,
        ...row,
      }),
    );

    await this.overheadRepo
      .createQueryBuilder()
      .insert()
      .into(DesignOverhead)
      .values(entities as any[])
      .updateEntity(false)
      .execute();
  }

  private async replaceFindingRows(designId: number, rows: NormalizedFindingRow[]): Promise<void> {
    await this.findingRepo.delete({ designId });

    if (rows.length === 0) {
      return;
    }

    const entities = rows.map((row, index) =>
      this.findingRepo.create({
        designId,
        sortOrder: index,
        ...row,
      }),
    );

    await this.findingRepo
      .createQueryBuilder()
      .insert()
      .into(DesignFinding)
      .values(entities as any[])
      .updateEntity(false)
      .execute();
  }

  private async validateDesignRelationRefs(
    input: {
      processStages?: DesignProcessStageDto[];
      vendors?: DesignVendorDto[];
      relevantDesignIds?: Array<number>;
    },
    design: Pick<Design, 'id' | 'companyId'> & { id: number | null },
    requester: AuthUser,
  ): Promise<void> {
    if (input.processStages !== undefined) {
      await Promise.all(
        (input.processStages || []).map((row) =>
          this.resolveMasterRef('design_stages', row.processStageId, row.processStage, 'processStage', true),
        ),
      );
    }

    if (input.vendors !== undefined) {
      await Promise.all(
        (input.vendors || []).map((row) =>
          this.resolveMasterRef('vendor_names', row.vendorNameId, row.supplierName, 'supplierName', true),
        ),
      );
    }

    if (input.relevantDesignIds === undefined) {
      return;
    }

    const selfId = design.id === null ? null : design.id;
    const deduplicated = Array.from(
      new Set((input.relevantDesignIds || []).filter((entry) => !!entry && entry !== selfId)),
    );

    if (deduplicated.length === 0) {
      return;
    }

    const relatedDesigns = await this.designRepo.find({ where: { id: In(deduplicated) } });
    if (relatedDesigns.length !== deduplicated.length) {
      throw new NotFoundException('One or more related designs were not found');
    }

    for (const related of relatedDesigns) {
      this.assertReadScope(related, requester);
      if (design.companyId && related.companyId && design.companyId !== related.companyId) {
        throw new BadRequestException('Related designs must belong to the same company');
      }
    }
  }

  private async replaceProcessStageRows(
    designId: number,
    rows: DesignProcessStageDto[],
  ): Promise<void> {
    if (!rows || rows.length === 0) {
      await this.processStageRepo.delete({ designId });
      return;
    }

    const resolvedRows = await Promise.all(rows.map(async (row) => {
      const ref = await this.resolveMasterRef('design_stages', row.processStageId, row.processStage, 'processStage', true);
      return { ...row, processStageId: ref.id!, processStage: ref.value || undefined };
    }));

    await this.processStageRepo.delete({ designId });

    const entities = resolvedRows.map((row, index) =>
      this.processStageRepo.create({
        designId,
        processStageId: row.processStageId,
        netWeight: this.toNumber(row.netWeight),
        duration: this.toNumber(row.duration),
        durationType: this.mapDurationType(row.durationType),
        remarks: this.optionalText(row.remarks),
        sortOrder: index,
      }),
    );

    await this.processStageRepo.save(entities);
  }

  private async replacePricingTierRows(
    designId: number,
    rows: DesignPricingTierDto[],
  ): Promise<void> {
    await this.pricingTierRepo.delete({ designId });

    if (!rows || rows.length === 0) {
      return;
    }

    const entities = rows.map((row, index) =>
      this.pricingTierRepo.create({
        designId,
        name: row.name.trim(),
        incrementBy: this.mapIncrementType(row.incrementBy),
        unit: this.optionalText(row.unit),
        weightBy: this.optionalText(row.weightBy),
        value: this.toNumber(row.value),
        sellingPrice: this.toNumber(row.sellingPrice),
        code: this.optionalText(row.code),
        sortOrder: index,
      }),
    );

    await this.pricingTierRepo.save(entities);
  }

  private async replaceVendorRows(designId: number, rows: DesignVendorDto[]): Promise<void> {
    if (!rows || rows.length === 0) {
      await this.vendorRepo.delete({ designId });
      return;
    }

    const resolvedRows = await Promise.all(rows.map(async (row) => {
      const ref = await this.resolveMasterRef('vendor_names', row.vendorNameId, row.supplierName, 'supplierName', true);
      return { ...row, vendorNameId: ref.id!, supplierName: ref.value || undefined };
    }));

    await this.vendorRepo.delete({ designId });

    const entities = resolvedRows.map((row, index) =>
      this.vendorRepo.create({
        designId,
        vendorNameId: row.vendorNameId,
        stockType: this.optionalText(row.stockType),
        supplierStyleNo: this.optionalText(row.supplierStyleNo),
        sortOrder: index,
      }),
    );

    await this.vendorRepo.save(entities);
  }

  private async resolveUserNames(userIds: number[]): Promise<Map<number, string>> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const users = await this.userRepo.find({
      where: { id: In(uniqueIds) },
      select: ['id', 'firstName', 'lastName', 'email'],
    });
    const map = new Map<number, string>();
    users.forEach((user) => {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
      map.set(user.id, fullName || user.email || user.id.toString());
    });
    return map;
  }

  private async setRelevantDesignLinks(
    design: Design,
    designIds: Array<number>,
    requester: AuthUser,
  ): Promise<void> {
    const deduplicated = Array.from(
      new Set((designIds || []).filter((entry) => !!entry && entry !== design.id)),
    );

    if (deduplicated.length === 0) {
      await this.relevantRepo.delete({ designId: design.id });
      return;
    }

    const relatedDesigns = await this.designRepo.find({ where: { id: In(deduplicated) } });
    if (relatedDesigns.length !== deduplicated.length) {
      throw new NotFoundException('One or more related designs were not found');
    }

    for (const related of relatedDesigns) {
      this.assertReadScope(related, requester);
      if (design.companyId && related.companyId && design.companyId !== related.companyId) {
        throw new BadRequestException('Related designs must belong to the same company');
      }
    }

    await this.relevantRepo.delete({ designId: design.id });

    const links = deduplicated.map((relatedDesignId) =>
      this.relevantRepo.create({
        designId: design.id,
        relatedDesignId,
      }),
    );

    await this.relevantRepo.save(links);
  }

  private async addHistory(
    designId: number,
    actionType: string,
    remarks: string,
    userId?: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.historyRepo.save(
        this.historyRepo.create({
          designId,
          actionType,
          remarks,
          performedBy: userId || null,
          metadata: metadata || null,
        }),
      );
    } catch (error) {
      console.warn('Design history logging failed after design save', {
        designId,
        actionType,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async getExistingRows(designId: number): Promise<{
    metals: DesignMetal[];
    gemstones: DesignGemstone[];
    labors: DesignLabor[];
    overheads: DesignOverhead[];
    findings: DesignFinding[];
  }> {
    const [metals, gemstones, labors, overheads, findings] = await Promise.all([
      this.metalRepo.find({ where: { designId }, relations: ['metalCaratageMaster'], order: { sortOrder: 'ASC' } }),
      this.gemstoneRepo.find({
        where: { designId },
        relations: ['stoneMaster', 'shapeMaster', 'sizeMaster', 'cutMaster', 'colorMaster', 'qualityMaster', 'stoneTypeMaster'],
        order: { sortOrder: 'ASC' },
      }),
      this.laborRepo.find({
        where: { designId },
        relations: ['laborHeadMaster', 'laborRuleMaster'],
        order: { sortOrder: 'ASC' },
      }),
      this.overheadRepo.find({ where: { designId }, relations: ['overheadRuleMaster'], order: { sortOrder: 'ASC' } }),
      this.findingRepo.find({ where: { designId }, relations: ['findingHeadMaster'], order: { sortOrder: 'ASC' } }),
    ]);

    return { metals, gemstones, labors, overheads, findings };
  }

  private toMetalDtos(rows: DesignMetal[]): DesignMetalDto[] {
    return rows.map((row) => ({
      metalCaratageId: row.metalCaratageId || undefined,
      metalCaratage: row.metalCaratageMaster?.value || row.metalCaratage || undefined,
      netWt: this.toNumber(row.netWt),
      wastagePercent: this.toNumber(row.wastagePercent),
      wastageWt: this.toNumber(row.wastageWt),
      totalWt: this.toNumber(row.totalWt),
      pricePerGm: this.toNumber(row.pricePerGm),
      value: this.toNumber(row.value),
      components: row.components,
    }));
  }

  private toGemstoneDtos(rows: DesignGemstone[]): DesignGemstoneDto[] {
    return rows.map((row) => ({
      packetId: row.packetId || undefined,
      stoneId: row.stoneId || undefined,
      stone: row.stoneMaster?.value || row.stone || undefined,
      shapeId: row.shapeId || undefined,
      shape: row.shapeMaster?.value || row.shape || undefined,
      sizeId: row.sizeId || undefined,
      size: row.sizeMaster?.value || row.size || undefined,
      cutId: row.cutId || undefined,
      cut: row.cutMaster?.value || row.cut || undefined,
      colorId: row.colorId || undefined,
      color: row.colorMaster?.value || row.color || undefined,
      qualityId: row.qualityId || undefined,
      quality: row.qualityMaster?.value || row.quality || undefined,
      stoneTypeId: row.stoneTypeId || undefined,
      stoneType: row.stoneTypeMaster?.value || row.stoneType || undefined,
      wtPerPcs: this.toNumber(row.wtPerPcs),
      pcs: row.pcs,
      wtInCts: this.toNumber(row.wtInCts),
      pricePerCt: this.toNumber(row.pricePerCt),
      amount: this.toNumber(row.amount),
    }));
  }

  private toLaborDtos(rows: DesignLabor[]): DesignLaborDto[] {
    return rows.map((row) => ({
      laborHeadId: row.laborHeadId || undefined,
      laborHead: row.laborHeadMaster?.value || row.laborHead || undefined,
      laborRuleId: row.laborRuleId || undefined,
      laborRule: row.laborRuleMaster?.value || undefined,
      laborPerUnit: this.toNumber(row.laborPerUnit),
      unitQty: this.toNumber(row.unitQty),
      laborValue: this.toNumber(row.laborValue),
    }));
  }

  private toOverheadDtos(rows: DesignOverhead[]): DesignOverheadDto[] {
    return rows.map((row) => ({
      overheadRuleId: row.overheadRuleId || undefined,
      overheadHead: row.overheadRuleMaster?.value || row.overheadHead || undefined,
      overheadApplyMode: row.overheadApplyMode || row.overheadRuleMaster?.overheadApplyMode || undefined,
      ratePercent: row.ratePercent !== null && row.ratePercent !== undefined
        ? this.toNumber(row.ratePercent)
        : row.overheadRuleMaster?.ratePercent !== null && row.overheadRuleMaster?.ratePercent !== undefined
          ? this.toNumber(row.overheadRuleMaster.ratePercent)
          : undefined,
      flatAmount: row.flatAmount !== null && row.flatAmount !== undefined
        ? this.toNumber(row.flatAmount)
        : row.overheadRuleMaster?.flatAmount !== null && row.overheadRuleMaster?.flatAmount !== undefined
          ? this.toNumber(row.overheadRuleMaster.flatAmount)
          : undefined,
      overheadValue: this.toNumber(row.overheadValue),
    }));
  }

  private toFindingDtos(rows: DesignFinding[]): DesignFindingDto[] {
    return rows.map((row) => ({
      findingHeadId: row.findingHeadId || undefined,
      findingHead: row.findingHeadMaster?.value || row.findingHead || undefined,
      pricePerUnit: this.toNumber(row.pricePerUnit),
      units: this.toNumber(row.units),
      totalWeight: this.toNumber(row.totalWeight),
      findingValue: this.toNumber(row.findingValue),
    }));
  }

  private mapDurationType(input?: ProductDurationType): DesignDurationType {
    if (!input) {
      return DesignDurationType.MINUTES;
    }

    if (input === ProductDurationType.HOURS) {
      return DesignDurationType.HOURS;
    }

    if (input === ProductDurationType.DAYS) {
      return DesignDurationType.DAYS;
    }

    return DesignDurationType.MINUTES;
  }

  private mapIncrementType(input?: PricingIncrementBy): DesignPricingIncrementBy {
    if (input === PricingIncrementBy.FLAT) {
      return DesignPricingIncrementBy.FLAT;
    }

    return DesignPricingIncrementBy.PERCENTAGE;
  }

  private normalizeDesignNo(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('designNo is required');
    }
    return normalized;
  }

  private normalizeBaseDesignNo(value: string): string {
    const normalized = this.normalizeDesignNo(value);
    return normalized.replace(/-V\d+$/i, '');
  }

  private getDesignFamilyKey(value: string): string {
    const base = this.normalizeBaseDesignNo(value);
    return base;
  }

  private async resolveFamilyDesignId(
    inputId: string | number | undefined,
    designNo: string,
    scope: ScopeResult,
  ): Promise<number | null> {
    const rawInputId = Number(inputId);
    if (Number.isFinite(rawInputId) && rawInputId > 0) {
      const familySeedQuery = this.designRepo
        .createQueryBuilder('design')
        .select(['design.id', 'design.familyDesignId'])
        .where('design.id = :inputId', { inputId: rawInputId });

      if (scope.companyId) {
        familySeedQuery.andWhere('design.companyId = :companyId', { companyId: scope.companyId });
      } else {
        familySeedQuery.andWhere('design.companyId IS NULL');
      }

      if (scope.branchId) {
        familySeedQuery.andWhere('design.branchId = :branchId', { branchId: scope.branchId });
      } else {
        familySeedQuery.andWhere('design.branchId IS NULL');
      }

      const familySeed = await familySeedQuery.getOne();
      if (!familySeed) {
        throw new BadRequestException('Base design not found');
      }

      return Number(familySeed.familyDesignId || familySeed.id);
    }

    const baseDesignNo = this.normalizeBaseDesignNo(designNo);
    const qb = this.designRepo
      .createQueryBuilder('design')
      .select('design.id')
      .where('REGEXP_REPLACE(design.designNo, :versionSuffix, :empty) = :baseDesignNo', {
        versionSuffix: '-V[0-9]+$',
        empty: '',
        baseDesignNo,
      })
      .orderBy('design.isPrimary', 'DESC')
      .addOrderBy("design.version = 'V1'", 'DESC')
      .addOrderBy('design.createdAt', 'ASC');

    if (scope.companyId) {
      qb.andWhere('design.companyId = :companyId', { companyId: scope.companyId });
    } else {
      qb.andWhere('design.companyId IS NULL');
    }

    if (scope.branchId) {
      qb.andWhere('design.branchId = :branchId', { branchId: scope.branchId });
    } else {
      qb.andWhere('design.branchId IS NULL');
    }

    const parent = await qb.getOne();
    return parent?.id ? Number(parent.id) : null;
  }

  private async syncFamilyDesignName(
    design: Design,
    designName: string | null,
    requesterId: number,
  ): Promise<void> {
    const normalizedName = this.optionalText(designName);
    const familyKey = this.getDesignFamilyKey(design.designNo);
    const baseDesignNo = this.normalizeBaseDesignNo(design.designNo);

    const familyRowsQuery = this.designRepo
      .createQueryBuilder('design')
      .where('design.id != :id', { id: design.id });

    if (familyKey !== baseDesignNo) {
      familyRowsQuery.andWhere('UPPER(design.designNo) LIKE :familyPattern', {
        familyPattern: `${familyKey}-%`,
      });
    } else {
      familyRowsQuery.andWhere(
        new Brackets((where) => {
          where
            .where('UPPER(design.designNo) = :baseDesignNo', { baseDesignNo })
            .orWhere('UPPER(design.designNo) LIKE :versionedPattern', {
              versionedPattern: `${baseDesignNo}-V%`,
            });
        }),
      );
    }

    if (design.companyId) {
      familyRowsQuery.andWhere('design.companyId = :companyId', { companyId: design.companyId });
    } else {
      familyRowsQuery.andWhere('design.companyId IS NULL');
    }

    if (design.branchId) {
      familyRowsQuery.andWhere('design.branchId = :branchId', { branchId: design.branchId });
    } else {
      familyRowsQuery.andWhere('design.branchId IS NULL');
    }

    const familyRows = await familyRowsQuery.getMany();
    if (!familyRows.length) {
      return;
    }

    familyRows.forEach((row) => {
      row.designName = normalizedName;
      row.updatedBy = requesterId;
    });

    await this.designRepo.save(familyRows);
  }

  private applyVersionToDesignNo(
    designNo: string,
    version: string,
    jewelrySize?: string | null,
    previousJewelrySize?: string | null,
  ): string {
    let base = this.normalizeBaseDesignNo(designNo);
    const previousSize = this.optionalText(previousJewelrySize)?.toUpperCase();
    const normalizedSize = this.optionalText(jewelrySize)?.toUpperCase();
    if (previousSize && base.endsWith(`-${previousSize}`)) {
      base = base.slice(0, -(previousSize.length + 1));
    } else if (previousSize && normalizedSize && previousSize !== normalizedSize && base.endsWith(`-${previousSize}-${normalizedSize}`)) {
      // The web form may already have appended the newly selected size. Remove
      // the old size first so changing 7.00 to 7.50 never produces both.
      base = `${base.slice(0, -(previousSize.length + normalizedSize.length + 2))}-${normalizedSize}`;
    }

    if (normalizedSize && !base.endsWith(`-${normalizedSize}`)) {
      base = `${base}-${normalizedSize}`;
    }

    const normalizedVersion = this.normalizeVersion(version);
    return `${base}-${normalizedVersion}`;
  }

  private normalizeVersion(value?: string): string {
    const normalized = (value || 'V1').trim().toUpperCase();
    return normalized || 'V1';
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!tags || tags.length === 0) {
      return [];
    }
    return Array.from(
      new Set(
        tags
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      ),
    );
  }

  private workbookToBuffer(workbook: XLSX.WorkBook): Buffer {
    const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.isBuffer(output) ? output : Buffer.from(output);
  }

  private readExcelRows(
    file?: { buffer?: Buffer; originalname?: string },
  ): Record<string, unknown>[] {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Excel file is required');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('The uploaded workbook is empty');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });

    if (rows.length === 0) {
      throw new BadRequestException('The uploaded sheet does not contain any rows');
    }

    return rows;
  }

  private readSheetRows(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return [];
    }
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });
  }

  private normalizeDesignImportRow(row: Record<string, unknown>): DesignImportRow {
    return {
      designNo: this.getImportCell(row, 'Design No', 'designNo'),
      designName: this.getImportCell(row, 'Design Name', 'designName'),
      version: this.getImportCell(row, 'Version', 'version'),
      companyCode: this.getImportCell(row, 'Company Code', 'companyCode'),
      branchCode: this.getImportCell(row, 'Branch Code', 'branchCode'),
      jewelryGroup: this.getImportCell(row, 'Category', 'category', 'Jewelry Group', 'jewelryGroup'),
      collection: this.getImportCell(row, 'Sub Category', 'subCategory', 'Collection', 'collection'),
      jewelrySize: this.getImportCell(row, 'Jewelry Size', 'jewelrySize'),
      stage: this.getImportCell(row, 'Stage', 'stage'),
      diamondSpread: this.getImportCell(row, 'Diamond Spread', 'diamondSpread'),
      diamondType: this.getImportCell(row, 'Diamond Type', 'diamondType'),
      diamondWeight: this.getImportCell(row, 'Diamond Wt', 'diamondWeight', 'Diamond Weight', 'diamondWt'),
      diamondQuality: this.getImportCell(row, 'Diamond Quality', 'diamondQuality'),
      designStatus: this.getImportCell(row, 'Design Status', 'designStatus'),
      tags: this.getImportCell(row, 'Tags', 'tags'),
      drawerLocation: this.getImportCell(row, 'Drawer Location', 'drawerLocation'),
      otherWeight: this.getImportCell(row, 'Other Wt', 'otherWeight'),
      imageKeys: this.getImportCell(row, 'Image Keys', 'imageKeys', 'Image Key', 'imageKey', 'Images'),
      stlKey: this.getImportCell(row, 'STL Key', 'stlKey', 'STL', 'stlFileUrl'),
      designDescription: this.getImportCell(row, 'Design Description', 'designDescription'),
      remarks: this.getImportCell(row, 'Remarks', 'remarks'),
      isActive: this.getImportCell(row, 'Status', 'status', 'isActive'),
    };
  }

  private normalizeDesignMetalImportRow(row: Record<string, unknown>): DesignMetalImportRow {
    return {
      designNo: this.getImportCell(row, 'Design No', 'designNo'),
      version: this.getImportCell(row, 'Version', 'version'),
      metalCaratage: this.getImportCell(row, 'Metal Caratage', 'metalCaratage', 'Metal'),
      netWt: this.getImportCell(row, 'Net Wt', 'netWt'),
      wastagePercent: this.getImportCell(row, 'Wastage %', 'wastagePercent'),
      wastageWt: this.getImportCell(row, 'Wastage Wt', 'wastageWt'),
      totalWt: this.getImportCell(row, 'Total Wt', 'totalWt'),
      pricePerGm: this.getImportCell(row, '@ Per Gm', 'pricePerGm'),
      value: this.getImportCell(row, 'Value', 'value'),
    };
  }

  private normalizeDesignGemstoneImportRow(row: Record<string, unknown>): DesignGemstoneImportRow {
    return {
      designNo: this.getImportCell(row, 'Design No', 'designNo'),
      version: this.getImportCell(row, 'Version', 'version'),
      packetBarcode: this.getImportCell(row, 'Packet Barcode', 'packetBarcode', 'Barcode', 'barcode'),
      packetName: this.getImportCell(row, 'Packet', 'packetName'),
      stone: this.getImportCell(row, 'Stone', 'stone'),
      shape: this.getImportCell(row, 'Shape', 'shape'),
      size: this.getImportCell(row, 'Size', 'size'),
      cut: this.getImportCell(row, 'Cut', 'cut'),
      color: this.getImportCell(row, 'Color', 'color'),
      quality: this.getImportCell(row, 'Quality', 'quality'),
      stoneType: this.getImportCell(row, 'Stone Type', 'stoneType'),
      wtPerPcs: this.getImportCell(row, 'Wt/Pcs', 'wtPerPcs'),
      pcs: this.getImportCell(row, 'Pcs', 'pcs'),
      wtInCts: this.getImportCell(row, 'Wt (Cts)', 'wtInCts'),
      pricePerCt: this.getImportCell(row, '@ (P/Ct)', 'pricePerCt'),
      amount: this.getImportCell(row, 'Amount', 'amount'),
    };
  }

  private normalizeDesignLaborImportRow(row: Record<string, unknown>): DesignLaborImportRow {
    return {
      designNo: this.getImportCell(row, 'Design No', 'designNo'),
      version: this.getImportCell(row, 'Version', 'version'),
      laborHead: this.getImportCell(row, 'Labor Head', 'laborHead'),
      laborPerUnit: this.getImportCell(row, 'Labor/Unit', 'laborPerUnit'),
      unitQty: this.getImportCell(row, 'Unit Qty', 'unitQty'),
      laborValue: this.getImportCell(row, 'Labor Value', 'laborValue'),
    };
  }

  private normalizeDesignFindingImportRow(row: Record<string, unknown>): DesignFindingImportRow {
    return {
      designNo: this.getImportCell(row, 'Design No', 'designNo'),
      version: this.getImportCell(row, 'Version', 'version'),
      findingHead: this.getImportCell(row, 'Finding Head', 'findingHead'),
      pricePerUnit: this.getImportCell(row, 'Price/Unit', 'pricePerUnit'),
      units: this.getImportCell(row, 'Units', 'units'),
      totalWeight: this.getImportCell(row, 'Total Weight', 'totalWeight'),
      findingValue: this.getImportCell(row, 'Finding Value', 'findingValue'),
    };
  }

  private createImportDesignKey(designNo: string, version?: string): string {
    const normalizedVersion = this.normalizeVersion(version || 'V1');
    const normalizedDesignNo = this.applyVersionToDesignNo(designNo, normalizedVersion);
    return `${normalizedDesignNo}__${normalizedVersion}`;
  }

  private getDesignImportKey(row: Record<string, unknown>): string {
    const designNo = this.getImportCell(row, 'Design No', 'designNo');
    const version = this.getImportCell(row, 'Version', 'version') || 'V1';
    return this.createImportDesignKey(designNo, version);
  }

  private groupRowsByDesignKey(
    rows: Record<string, unknown>[],
    keyResolver: (row: Record<string, unknown>) => string,
  ): Map<string, Record<string, unknown>[]> {
    const grouped = new Map<string, Record<string, unknown>[]>();
    rows.forEach((row) => {
      const key = keyResolver(row);
      if (!key.trim()) {
        return;
      }
      const bucket = grouped.get(key) || [];
      bucket.push(row);
      grouped.set(key, bucket);
    });
    return grouped;
  }

  private parseDesignImportTags(value?: string): string[] | undefined {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return undefined;
    }
    return normalized
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private parseImportMediaKeys(value?: string): string[] | undefined {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return undefined;
    }

    const keys = normalized
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (keys.length === 0) {
      return undefined;
    }

    const deduped = Array.from(new Set(keys));
    return this.normalizeGalleryUrls(deduped);
  }

  private async getProductCompanyCodeMap(): Promise<Map<string, Company>> {
    const companies = await this.companyRepo.find();
    return new Map(companies.map((company) => [company.companyCode.trim().toUpperCase(), company]));
  }

  private async getProductBranchCodeMap(): Promise<Map<string, Branch[]>> {
    const branches = await this.branchRepo.find();
    const map = new Map<string, Branch[]>();
    branches.forEach((branch) => {
      const key = branch.code.trim().toUpperCase();
      const bucket = map.get(key) || [];
      bucket.push(branch);
      map.set(key, bucket);
    });
    return map;
  }

  private async getPacketNameMap(): Promise<Map<string, StonePacket>> {
    const packets = await this.packetRepo.find();
    return new Map(packets.map((packet) => [packet.packetName.trim().toUpperCase(), packet]));
  }

  private async getPacketBarcodeMap(): Promise<Map<string, StonePacket>> {
    const packets = await this.packetRepo.find();
    return new Map(
      packets
        .filter((packet) => Boolean((packet.barcode || '').trim()))
        .map((packet) => [packet.barcode!.trim(), packet]),
    );
  }

  private async resolveImportDesignScope(
    row: DesignImportRow,
    companyMap: Map<string, Company>,
    branchMap: Map<string, Branch[]>,
  ): Promise<{ companyId: number | null; branchId: number | null }> {
    const companyCode = String(row.companyCode || '').trim().toUpperCase();
    const branchCode = String(row.branchCode || '').trim().toUpperCase();

    let companyId: number | null = null;
    let branchId: number | null = null;

    if (companyCode) {
      const company = companyMap.get(companyCode);
      if (!company) {
        throw new BadRequestException(`Company Code "${companyCode}" not found`);
      }
      companyId = company.id;
    }

    if (branchCode) {
      const matches = branchMap.get(branchCode) || [];
      if (matches.length === 0) {
        throw new BadRequestException(`Branch Code "${branchCode}" not found`);
      }
      const branch =
        companyId !== null
          ? matches.find((item) => item.companyId === companyId)
          : matches.length === 1
            ? matches[0]
            : null;
      if (!branch) {
        throw new BadRequestException(
          companyId
            ? `Branch Code "${branchCode}" does not belong to Company Code "${companyCode}"`
            : `Branch Code "${branchCode}" matches multiple companies. Provide Company Code as well.`,
        );
      }
      branchId = branch.id;
      companyId = branch.companyId;
    }

    return { companyId, branchId };
  }

  private toImportedMetalDto(row: DesignMetalImportRow): DesignMetalDto {
    return {
      metalCaratage: row.metalCaratage?.trim() || undefined,
      netWt: this.optionalNonNegativeNumber(row.netWt, 'netWt') ?? undefined,
      wastagePercent: this.optionalNonNegativeNumber(row.wastagePercent, 'wastagePercent') ?? undefined,
      wastageWt: this.optionalNonNegativeNumber(row.wastageWt, 'wastageWt') ?? undefined,
      totalWt: this.optionalNonNegativeNumber(row.totalWt, 'totalWt') ?? undefined,
      pricePerGm: this.optionalNonNegativeNumber(row.pricePerGm, 'pricePerGm') ?? undefined,
      value: this.optionalNonNegativeNumber(row.value, 'value') ?? undefined,
    };
  }

  private toImportedGemstoneDto(
    row: DesignGemstoneImportRow,
    packetNameMap: Map<string, StonePacket>,
    packetBarcodeMap: Map<string, StonePacket>,
  ): DesignGemstoneDto {
    const packetBarcode = row.packetBarcode?.trim();
    const packetName = row.packetName?.trim();
    const packetByBarcode = packetBarcode ? packetBarcodeMap.get(packetBarcode) : undefined;
    const packetByName = packetName ? packetNameMap.get(packetName.toUpperCase()) : undefined;
    const packet = packetByBarcode || packetByName;

    if (packetBarcode && !packetByBarcode) {
      throw new BadRequestException(`Packet barcode "${packetBarcode}" not found`);
    }
    if (!packet && packetName) {
      throw new BadRequestException(`Packet "${packetName}" not found`);
    }
    const normalizedWtPerPcs = this.optionalNonNegativeNumber(row.wtPerPcs, 'wtPerPcs');
    const normalizedPcs = this.optionalNonNegativeNumber(row.pcs, 'pcs');
    const normalizedPricePerCt = this.optionalNonNegativeNumber(row.pricePerCt, 'pricePerCt');
    const normalizedAmount = this.optionalNonNegativeNumber(row.amount, 'amount');

    const fallbackWtPerPcs =
      packet && packet.weightPerPc !== null && packet.weightPerPc !== undefined
        ? this.toNumber(packet.weightPerPc)
        : undefined;
    const fallbackPcs =
      packet && packet.pieces !== null && packet.pieces !== undefined ? this.toNumber(packet.pieces) : undefined;
    const fallbackPricePerCt =
      packet && packet.sellingPrice !== null && packet.sellingPrice !== undefined
        ? this.toNumber(packet.sellingPrice)
        : undefined;

    return {
      packetId: packet?.id,
      stone: row.stone?.trim() || undefined,
      shape: row.shape?.trim() || undefined,
      size: row.size?.trim() || undefined,
      cut: row.cut?.trim() || undefined,
      color: row.color?.trim() || undefined,
      quality: row.quality?.trim() || undefined,
      stoneType: row.stoneType?.trim() || undefined,
      wtPerPcs: normalizedWtPerPcs ?? fallbackWtPerPcs ?? undefined,
      pcs: normalizedPcs ?? fallbackPcs ?? undefined,
      wtInCts: this.optionalNonNegativeNumber(row.wtInCts, 'wtInCts') ?? undefined,
      pricePerCt: normalizedPricePerCt ?? fallbackPricePerCt ?? undefined,
      amount: normalizedAmount ?? undefined,
    };
  }

  private toImportedLaborDto(row: DesignLaborImportRow): DesignLaborDto {
    return {
      laborHead: row.laborHead?.trim() || undefined,
      laborPerUnit: this.optionalNonNegativeNumber(row.laborPerUnit, 'laborPerUnit') ?? undefined,
      unitQty: this.optionalNonNegativeNumber(row.unitQty, 'unitQty') ?? undefined,
      laborValue: this.optionalNonNegativeNumber(row.laborValue, 'laborValue') ?? undefined,
    };
  }

  private toImportedFindingDto(row: DesignFindingImportRow): DesignFindingDto {
    return {
      findingHead: row.findingHead?.trim() || undefined,
      pricePerUnit: this.optionalNonNegativeNumber(row.pricePerUnit, 'pricePerUnit') ?? undefined,
      units: this.optionalNonNegativeNumber(row.units, 'units') ?? undefined,
      totalWeight: this.optionalNonNegativeNumber(row.totalWeight, 'totalWeight') ?? undefined,
      findingValue: this.optionalNonNegativeNumber(row.findingValue, 'findingValue') ?? undefined,
    };
  }

  private getImportCell(row: Record<string, unknown>, ...keys: string[]): string {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) {
        return String(row[key]).trim();
      }
    }

    return '';
  }

  private parseImportStatus(value?: string): boolean {
    const normalized = String(value || '').trim().toUpperCase();
    if (!normalized || normalized === 'ACTIVE' || normalized === 'TRUE' || normalized === 'YES') {
      return true;
    }
    if (normalized === 'INACTIVE' || normalized === 'FALSE' || normalized === 'NO') {
      return false;
    }
    throw new BadRequestException(`Invalid status "${value}"`);
  }

  private optionalNonNegativeNumber(
    value: number | string | null | undefined,
    field: string,
  ): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException(`${field} must be a valid number`);
    }
    return parsed;
  }

  private getS3Config(): {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  } | null {
    const bucket = this.optionalText(process.env.AWS_S3_BUCKET);
    const region = this.optionalText(process.env.AWS_REGION);
    const accessKeyId = this.optionalText(process.env.AWS_ACCESS_KEY_ID) || this.optionalText(process.env.AWS_ACCESS_KEY);
    const secretAccessKey =
      this.optionalText(process.env.AWS_SECRET_ACCESS_KEY) || this.optionalText(process.env.AWS_SECRET_KEY);

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      return null;
    }

    return { bucket, region, accessKeyId, secretAccessKey };
  }

  private getS3Client(): { client: S3Client; bucket: string; region: string } | null {
    const config = this.getS3Config();
    if (!config) {
      return null;
    }
    if (!this.s3Client) {
      const endpoint = this.optionalText(process.env.AWS_S3_ENDPOINT);
      this.s3Client = new S3Client({
        region: config.region,
        endpoint: endpoint || undefined,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
    }
    return { client: this.s3Client, bucket: config.bucket, region: config.region };
  }

  private buildS3PublicUrl(bucket: string, region: string, key: string): string {
    const base = this.optionalText(process.env.AWS_S3_PUBLIC_BASE_URL);
    if (base) {
      return `${base.replace(/\/+$/, '')}/${key}`;
    }
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  private getSignedUrlExpiresIn(): number {
    const raw = this.optionalText(process.env.AWS_S3_SIGNED_URL_EXPIRES);
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return 21600;
  }

  private parseS3KeyFromUrl(value: string, bucket: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('s3://')) {
      const withoutScheme = trimmed.slice(5);
      const [bucketName, ...rest] = withoutScheme.split('/');
      if (!bucketName || rest.length === 0) return null;
      if (bucketName !== bucket) return null;
      return rest.join('/');
    }

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      return null;
    }

    const host = parsedUrl.hostname;
    const path = parsedUrl.pathname.replace(/^\/+/, '');

    if (host.startsWith(`${bucket}.s3`)) {
      return path || null;
    }

    if (host.startsWith('s3') && path.startsWith(`${bucket}/`)) {
      return path.slice(bucket.length + 1) || null;
    }

    return null;
  }

  private normalizeGalleryUrls(urls: string[] | null | undefined): string[] {
    if (!Array.isArray(urls)) {
      return [];
    }

    const s3Config = this.getS3Client();
    if (!s3Config) {
      return urls.filter((url) => typeof url === 'string').map((url) => url.trim()).filter(Boolean);
    }

    const { bucket } = s3Config;
    return urls
      .filter((url): url is string => typeof url === 'string')
      .map((url) => url.trim())
      .filter(Boolean)
      .map((url) => {
        const key = this.parseS3KeyFromUrl(url, bucket);
        return key ? `s3://${bucket}/${key}` : url;
      });
  }

  private normalizePersistentStlFileUrl(value?: string | null): string | null {
    const normalized = this.optionalText(value);
    if (!normalized) {
      return null;
    }

    const s3Config = this.getS3Client();
    if (s3Config) {
      const key = this.parseS3KeyFromUrl(normalized, s3Config.bucket);
      if (key?.startsWith('design-stl/')) {
        return `s3://${s3Config.bucket}/${key}`;
      }
    }

    const localUploadPath = this.extractLocalUploadPath(normalized);
    if (localUploadPath?.startsWith('design-stl/')) {
      return `/uploads/${localUploadPath}`;
    }

    if (/^\/?uploads\/design-stl\//i.test(normalized)) {
      return normalized.startsWith('/') ? normalized : `/${normalized}`;
    }

    if (/^s3:\/\/[^/]+\/design-stl\//i.test(normalized)) {
      return normalized;
    }

    throw new BadRequestException('Invalid STL file reference. Please upload the STL file again.');
  }

  private async syncDesignStlFileRecord(
    designId: number,
    nextFileUrl: string | null | undefined,
    previousFileUrl: string | null | undefined,
    uploadedBy?: number | null,
    repository: Repository<DesignStlFile> = this.stlFileRepo,
    preferredFileName?: string | null,
  ): Promise<void> {
    const nextUrl = this.optionalText(nextFileUrl);
    const previousUrl = this.optionalText(previousFileUrl);

    if (!nextUrl) {
      await repository.delete({ designId });
      return;
    }

    const existingRows = await repository.find({ where: { designId } });
    if (nextUrl === previousUrl) {
      const matchingRows = existingRows.filter((row) => row.fileUrl === nextUrl);
      if (existingRows.length === 1 && matchingRows.length === 1) {
        return;
      }
    }

    await repository.delete({ designId });
    await repository.save(
      repository.create({
        designId,
        fileName: this.optionalText(preferredFileName) || this.deriveFileNameFromUrl(nextUrl),
        fileUrl: nextUrl,
        uploadedBy: uploadedBy || null,
      }),
    );
  }

  private async resolveGalleryUrls(urls: string[] | null | undefined): Promise<string[]> {
    if (!Array.isArray(urls) || urls.length === 0) {
      return [];
    }

    const s3Config = this.getS3Client();
    if (!s3Config) {
      return urls;
    }

    const { client, bucket } = s3Config;

    return Promise.all(
      urls.map(async (url) => {
        if (typeof url !== 'string') return '';
        const trimmed = url.trim();
        if (!trimmed) return '';
        const key = this.parseS3KeyFromUrl(trimmed, bucket);
        if (!key) return trimmed;

        return this.createSignedUrl(client, bucket, key);
      }),
    ).then((items) => items.filter(Boolean));
  }

  private async resolveAssetUrl(url: string | null | undefined): Promise<string | null> {
    if (typeof url !== 'string') {
      return null;
    }

    const trimmed = url.trim();
    if (!trimmed) {
      return null;
    }

    const s3Config = this.getS3Client();
    if (!s3Config) {
      return trimmed;
    }

    const { client, bucket } = s3Config;
    const key = this.parseS3KeyFromUrl(trimmed, bucket);
    if (!key) {
      return trimmed;
    }

    return this.createSignedUrl(client, bucket, key);
  }

  private async resolveAssetBuffer(url: string): Promise<Buffer> {
    const trimmed = url.trim();
    const s3Config = this.getS3Client();
    if (s3Config) {
      const { client, bucket } = s3Config;
      const key = this.parseS3KeyFromUrl(trimmed, bucket);
      if (key) {
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        const response = await client.send(command);
        const body = response.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined;
        if (!body?.transformToByteArray) {
          throw new NotFoundException('Unable to read STL file from storage');
        }
        const bytes = await body.transformToByteArray();
        return Buffer.from(bytes);
      }
    }

    const uploadsRoot = process.env.UPLOADS_ROOT || join(process.cwd(), 'uploads');
    const localRelativePath = this.extractLocalUploadPath(trimmed);
    if (localRelativePath) {
      return readFile(join(uploadsRoot, localRelativePath));
    }

    const response = await fetch(trimmed);
    if (!response.ok) {
      throw new NotFoundException('Unable to fetch STL file');
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private extractLocalUploadPath(value: string): string | null {
    const normalized = (value || '').trim();
    if (!normalized) {
      return null;
    }

    const mapUploadPath = (pathValue: string): string | null => {
      const cleanPath = pathValue.replace(/\\/g, '/');
      const marker = '/uploads/';
      const markerIndex = cleanPath.indexOf(marker);
      if (markerIndex >= 0) {
        return cleanPath.slice(markerIndex + marker.length) || null;
      }
      if (cleanPath.startsWith('uploads/')) {
        return cleanPath.slice('uploads/'.length) || null;
      }
      return null;
    };

    if (/^https?:\/\//i.test(normalized)) {
      try {
        const parsed = new URL(normalized);
        return mapUploadPath(parsed.pathname);
      } catch {
        return null;
      }
    }

    return mapUploadPath(normalized);
  }

  private async createSignedUrl(client: S3Client, bucket: string, key: string): Promise<string> {
    const expiresIn = this.getSignedUrlExpiresIn();
    const cached = this.getCachedSignedUrl(bucket, key);
    if (cached) {
      return cached;
    }

    const cacheKey = this.getSignedUrlCacheKey(bucket, key);
    const inflight = this.signedUrlInflightCache.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const pending = getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn })
      .then((url) => {
        this.setCachedSignedUrl(bucket, key, url, expiresIn);
        return url;
      })
      .finally(() => {
        this.signedUrlInflightCache.delete(cacheKey);
      });

    this.signedUrlInflightCache.set(cacheKey, pending);
    return pending;
  }

  private isGalleryMimeType(mimeType?: string | null): boolean {
    if (typeof mimeType !== 'string') return false;
    const normalized = mimeType.trim().toLowerCase();
    return normalized.startsWith('image/') || normalized.startsWith('video/');
  }

  private assertGalleryFileSize(file: { originalname?: string; mimetype?: string; buffer?: Buffer }): void {
    const size = file.buffer?.length || 0;
    const mimeType = (file.mimetype || '').trim().toLowerCase();
    const maxBytes = mimeType.startsWith('video/') ? this.galleryVideoMaxBytes : this.galleryImageMaxBytes;
    if (size <= maxBytes) {
      return;
    }

    const maxMb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
    throw new BadRequestException(`${file.originalname || 'Media file'} exceeds the ${maxMb} MB upload limit.`);
  }

  private isStlFile(originalName?: string | null, mimeType?: string | null): boolean {
    const extension = extname(originalName || '').toLowerCase();
    if (extension === '.stl') {
      return true;
    }

    const normalized = (mimeType || '').trim().toLowerCase();
    return ['model/stl', 'application/sla', 'model/x.stl-ascii', 'application/octet-stream'].includes(
      normalized,
    );
  }

  private resolveGalleryExtension(originalName: string, mimeType?: string | null): string {
    const ext = extname(originalName || '').toLowerCase();
    const allowed = new Set([
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.gif',
      '.bmp',
      '.svg',
      '.avif',
      '.mp4',
      '.webm',
      '.mov',
      '.m4v',
      '.ogv',
      '.ogg',
    ]);
    if (allowed.has(ext)) {
      return ext;
    }

    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/bmp': '.bmp',
      'image/svg+xml': '.svg',
      'image/avif': '.avif',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
      'video/x-m4v': '.m4v',
      'video/ogg': '.ogv',
      'audio/ogg': '.ogg',
    };

    const normalizedMime = (mimeType || '').toLowerCase();
    if (mimeMap[normalizedMime]) {
      return mimeMap[normalizedMime];
    }
    return normalizedMime.startsWith('video/') ? '.mp4' : '.jpg';
  }

  private resolveStlExtension(originalName: string): string {
    const extension = extname(originalName || '').toLowerCase();
    return extension === '.stl' ? extension : '.stl';
  }

  private resolveGalleryMediaType(originalName?: string | null, mimeType?: string | null): DesignMediaType {
    const normalizedMime = (mimeType || '').trim().toLowerCase();
    if (normalizedMime.startsWith('video/')) {
      return DesignMediaType.VIDEO;
    }
    if (normalizedMime.startsWith('image/')) {
      return DesignMediaType.IMAGE;
    }

    const normalizedExt = extname(originalName || '').toLowerCase();
    const videoExt = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogv', '.ogg']);
    if (videoExt.has(normalizedExt)) {
      return DesignMediaType.VIDEO;
    }
    return DesignMediaType.IMAGE;
  }

  private async saveMediaLibraryEntry(input: {
    fileName: string;
    fileKey: string;
    mediaType: DesignMediaType;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
    uploadedBy?: number | null;
  }): Promise<void> {
    const fileName = (input.fileName || '').trim();
    const fileKey = (input.fileKey || '').trim();
    if (!fileName || !fileKey) {
      return;
    }

    const existing = await this.designMediaLibraryRepo.findOne({ where: { fileKey } });
    if (existing) {
      existing.fileName = fileName;
      existing.mediaType = input.mediaType;
      existing.mimeType = this.optionalText(input.mimeType || null);
      existing.fileSizeBytes =
        input.fileSizeBytes !== null && input.fileSizeBytes !== undefined
          ? String(Math.max(0, Math.floor(input.fileSizeBytes)))
          : null;
      existing.uploadedBy = input.uploadedBy || existing.uploadedBy || null;
      await this.designMediaLibraryRepo.save(existing);
      return;
    }

    await this.designMediaLibraryRepo.save(
      this.designMediaLibraryRepo.create({
        fileName,
        fileKey,
        mediaType: input.mediaType,
        mimeType: this.optionalText(input.mimeType || null),
        fileSizeBytes:
          input.fileSizeBytes !== null && input.fileSizeBytes !== undefined
            ? String(Math.max(0, Math.floor(input.fileSizeBytes)))
            : null,
        uploadedBy: input.uploadedBy || null,
      }),
    );
  }

  private buildPublicAssetUrl(request: any, assetPath: string): string {
    const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
    const configuredBaseUrl = this.optionalText(process.env.PUBLIC_BASE_URL);
    if (configuredBaseUrl) {
      return `${configuredBaseUrl.replace(/\/+$/, '')}${normalizedPath}`;
    }

    const forwardedProtoRaw = request?.headers?.['x-forwarded-proto'];
    const forwardedHostRaw = request?.headers?.['x-forwarded-host'];
    const protocol =
      (Array.isArray(forwardedProtoRaw) ? forwardedProtoRaw[0] : forwardedProtoRaw) ||
      request?.protocol ||
      'http';
    const host =
      (Array.isArray(forwardedHostRaw) ? forwardedHostRaw[0] : forwardedHostRaw) ||
      request?.get?.('host') ||
      request?.headers?.host ||
      'localhost:3000';

    return `${protocol}://${host}${normalizedPath}`;
  }

  private optionalText(value?: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private toNumber(value: number | string | undefined | null): number {
    if (value === undefined || value === null) {
      return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private roundTo2(value: number): number {
    return Number(value.toFixed(2));
  }

  private roundTo3(value: number): number {
    return Number(value.toFixed(3));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private toInt(value: number | string | undefined | null): number {
    if (value === undefined || value === null) {
      return 0;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.floor(parsed);
  }

  private async resolveMasterRef(
    tableName: string,
    id: number | string | null | undefined,
    value: string | null | undefined,
    fieldLabel: string,
    required = false,
  ): Promise<MasterRef> {
    const numericId = this.optionalInt(id);
    if (numericId) {
      const rows = await this.dataSource.query(
        `SELECT id, value, alias_name AS aliasName FROM ${tableName} WHERE id = ? LIMIT 1`,
        [numericId],
      );
      if (!rows?.[0]) {
        throw new BadRequestException(`${fieldLabel} master id "${numericId}" not found`);
      }
      return { id: Number(rows[0].id), value: this.optionalText(rows[0].value), aliasName: this.optionalText(rows[0].aliasName) };
    }

    const normalizedValue = this.optionalText(value);
    const hasRealValue = Boolean(normalizedValue && normalizedValue !== '-');
    if (!hasRealValue) {
      if (required) {
        throw new BadRequestException(`${fieldLabel} is required`);
      }
      return { id: null, value: null, aliasName: null };
    }

    const rows = await this.dataSource.query(
      `SELECT id, value, alias_name AS aliasName FROM ${tableName}
       WHERE normalized_value = LOWER(TRIM(?))
          OR normalized_alias = LOWER(TRIM(?))
          OR value = ?
          OR alias_name = ?
       ORDER BY is_active DESC, id ASC
       LIMIT 1`,
      [normalizedValue, normalizedValue, normalizedValue, normalizedValue],
    );
    if (!rows?.[0]) {
      throw new BadRequestException(`${fieldLabel} "${normalizedValue}" not found in master table`);
    }
    return { id: Number(rows[0].id), value: this.optionalText(rows[0].value), aliasName: this.optionalText(rows[0].aliasName) };
  }

  private async resolveDesignMasterRefs(dto: CreateProductDto | UpdateProductDto, existing?: Design): Promise<DesignMasterRefs> {
    const jewelrySizeProvided = dto.jewelrySizeId !== undefined || dto.jewelrySize !== undefined;
    const diamondSpreadProvided = dto.diamondSpreadId !== undefined || dto.diamondSpread !== undefined;
    const diamondTypeProvided = dto.diamondTypeId !== undefined || dto.diamondType !== undefined;
    const stageProvided = dto.stageId !== undefined || dto.stage !== undefined;
    const diamondWeightProvided = dto.diamondWeightId !== undefined || dto.diamondWeight !== undefined;
    const diamondQualityProvided = dto.diamondQualityId !== undefined || dto.diamondQuality !== undefined;
    const designStatusProvided = dto.designStatusId !== undefined || dto.designStatus !== undefined;

    return {
      jewelryGroup: await this.resolveMasterRef(
        'jewelry_groups',
        dto.jewelryGroupId ?? existing?.jewelryGroupId,
        dto.jewelryGroup ?? existing?.jewelryGroup,
        'jewelryGroup',
        true,
      ),
      collection: await this.resolveMasterRef('collections', dto.collectionId ?? existing?.collectionId, dto.collection ?? existing?.collection, 'collection'),
      jewelrySize: await this.resolveMasterRef(
        'jewelry_sizes',
        jewelrySizeProvided ? dto.jewelrySizeId : existing?.jewelrySizeId,
        jewelrySizeProvided ? dto.jewelrySize : existing?.jewelrySize,
        'jewelrySize',
      ),
      stage: await this.resolveMasterRef(
        'design_stages',
        stageProvided ? dto.stageId : existing?.stageId,
        stageProvided ? dto.stage : existing?.stage,
        'stage',
      ),
      diamondSpread: await this.resolveMasterRef(
        'diamond_spreads',
        diamondSpreadProvided ? dto.diamondSpreadId : existing?.diamondSpreadId,
        diamondSpreadProvided ? dto.diamondSpread : existing?.diamondSpread,
        'diamondSpread',
      ),
      diamondType: await this.resolveMasterRef(
        'diamond_types',
        diamondTypeProvided ? dto.diamondTypeId : existing?.diamondTypeId,
        diamondTypeProvided ? dto.diamondType : existing?.diamondType,
        'diamondType',
      ),
      diamondWeight: await this.resolveMasterRef(
        'diamond_weights',
        diamondWeightProvided ? dto.diamondWeightId : existing?.diamondWeightId,
        diamondWeightProvided ? dto.diamondWeight : existing?.diamondWeight,
        'diamondWeight',
      ),
      diamondQuality: await this.resolveMasterRef(
        'diamond_qualities',
        diamondQualityProvided ? dto.diamondQualityId : existing?.diamondQualityId,
        diamondQualityProvided ? dto.diamondQuality : existing?.diamondQuality,
        'diamondQuality',
      ),
      designStatus: await this.resolveMasterRef(
        'design_statuses',
        designStatusProvided ? dto.designStatusId : existing?.designStatusId,
        designStatusProvided ? dto.designStatus : existing?.designStatus,
        'designStatus',
      ),
      metalCaratage: await this.resolveMasterRef(
        'metal_caratages',
        dto.metalCaratageId ?? existing?.metalCaratageId,
        undefined,
        'metalCaratage',
      ),
    };
  }

  private async resolveDesignTagIds(dto: CreateProductDto | UpdateProductDto): Promise<number[]> {
    const requestedIds = dto.tagIds ?? (dto.tagsId ? [dto.tagsId] : []);
    const requestedValues = dto.tags ?? [];
    const resolved = await Promise.all([
      ...requestedIds.map((id) => this.resolveMasterRef('tags', id, undefined, 'tag', true)),
      ...requestedValues.map((value) => this.resolveMasterRef('tags', undefined, value, 'tag', true)),
    ]);
    return Array.from(new Set(resolved.map((tag) => tag.id).filter((id): id is number => id !== null)));
  }

  private async resolveNormalizedMetalRows(rows: NormalizedMetalRow[]): Promise<NormalizedMetalRow[]> {
    return Promise.all(rows.map(async (row) => {
      const ref = await this.resolveMasterRef('metal_caratages', row.metalCaratageId, row.metalCaratage, 'metalCaratage', true);
      return { ...row, metalCaratageId: ref.id, metalCaratage: ref.value };
    }));
  }

  private async resolveNormalizedGemstoneRows(rows: NormalizedGemstoneRow[]): Promise<NormalizedGemstoneRow[]> {
    return Promise.all(rows.map(async (row) => ({
      ...row,
      ...(await this.resolveGemstoneMasterRefs(row)),
    })));
  }

  private async resolveGemstoneMasterRefs(row: NormalizedGemstoneRow): Promise<Partial<NormalizedGemstoneRow>> {
    const [stone, shape, size, cut, color, quality, stoneType] = await Promise.all([
      this.resolveMasterRef('packet_stones', row.stoneId, row.stone, 'stone'),
      this.resolveMasterRef('packet_shapes', row.shapeId, row.shape, 'shape'),
      this.resolveMasterRef('packet_sizes', row.sizeId, row.size, 'size'),
      this.resolveMasterRef('packet_cuts', row.cutId, row.cut, 'cut'),
      this.resolveMasterRef('packet_colors', row.colorId, row.color, 'color'),
      this.resolveMasterRef('packet_qualities', row.qualityId, row.quality, 'quality'),
      this.resolveMasterRef('diamond_types', row.stoneTypeId, row.stoneType, 'stoneType'),
    ]);
    return {
      stoneId: stone.id,
      stone: stone.value,
      shapeId: shape.id,
      shape: shape.value,
      sizeId: size.id,
      size: size.value,
      cutId: cut.id,
      cut: cut.value,
      colorId: color.id,
      color: color.value,
      qualityId: quality.id,
      quality: quality.value,
      stoneTypeId: stoneType.id,
      stoneType: stoneType.value,
    };
  }

  private async resolveNormalizedLaborRows(rows: NormalizedLaborRow[]): Promise<NormalizedLaborRow[]> {
    return Promise.all(rows.map(async (row) => {
      const [head, rule] = await Promise.all([
        this.resolveMasterRef('labor_heads', row.laborHeadId, row.laborHead, 'laborHead'),
        this.resolveMasterRef('labor_rules', row.laborRuleId, row.laborRule, 'laborRule'),
      ]);
      return {
        ...row,
        laborHeadId: head.id,
        laborHead: head.value,
        laborRuleId: rule.id,
        laborRule: rule.value,
      };
    }));
  }

  private async resolveNormalizedOverheadRows(rows: NormalizedOverheadRow[]): Promise<NormalizedOverheadRow[]> {
    return Promise.all(rows.map(async (row) => {
      const ref = await this.resolveMasterRef('overhead_rules', row.overheadRuleId, row.overheadHead, 'overheadHead');
      return { ...row, overheadRuleId: ref.id, overheadHead: ref.value };
    }));
  }

  private async resolveNormalizedFindingRows(rows: NormalizedFindingRow[]): Promise<NormalizedFindingRow[]> {
    return Promise.all(rows.map(async (row) => {
      const ref = await this.resolveMasterRef('finding_heads', row.findingHeadId, row.findingHead, 'findingHead');
      return { ...row, findingHeadId: ref.id, findingHead: ref.value };
    }));
  }

  private hydrateDesignDisplayLabels(design: Design): Design {
    design.jewelryGroup = design.jewelryGroupMaster?.value || design.jewelryGroup || '';
    design.collection = design.collectionMaster?.value || design.collection || null;
    design.jewelrySize = design.jewelrySizeMaster?.value || design.jewelrySize || null;
    design.stage = design.stageMaster?.value || design.stage || null;
    design.diamondSpread = design.diamondSpreadMaster?.value || design.diamondSpread || null;
    design.diamondType = design.diamondTypeMaster?.value || design.diamondType || null;
    design.diamondWeight = design.diamondWeightMaster?.value || design.diamondWeight || null;
    design.diamondQuality = design.diamondQualityMaster?.value || design.diamondQuality || null;
    design.designStatus = design.designStatusMaster?.value || design.designStatus || null;
    design.tags = (design.designTags || [])
      .map((designTag) => designTag.tagMaster?.value)
      .filter((value): value is string => Boolean(value));
    design.metalCaratage = design.metalCaratageMaster?.value || design.metalCaratage || null;
    design.metalColor = design.metalCaratageMaster?.metalColorMaster?.value || null;
    design.metals = (design.metals || []).map((row) => this.hydrateMetalDisplayLabels(row));
    design.gemstones = (design.gemstones || []).map((row) => this.hydrateGemstoneDisplayLabels(row));
    design.labors = (design.labors || []).map((row) => this.hydrateLaborDisplayLabels(row));
    design.overheads = (design.overheads || []).map((row) => this.hydrateOverheadDisplayLabels(row));
    design.findings = (design.findings || []).map((row) => this.hydrateFindingDisplayLabels(row));
    design.processStages = (design.processStages || []).map((row) => this.hydrateProcessStageDisplayLabels(row));
    design.vendors = (design.vendors || []).map((row) => this.hydrateVendorDisplayLabels(row));
    return design;
  }

  private hydrateMetalDisplayLabels(row: DesignMetal): DesignMetal {
    row.metalCaratage = row.metalCaratageMaster?.value || row.metalCaratage || null;
    row.metalColor = row.metalCaratageMaster?.metalColorMaster?.value || null;
    return row;
  }

  private hydrateGemstoneDisplayLabels(row: DesignGemstone): DesignGemstone {
    row.stone = row.stoneMaster?.value || row.stone || null;
    row.shape = row.shapeMaster?.value || row.shape || null;
    row.size = row.sizeMaster?.value || row.size || null;
    row.cut = row.cutMaster?.value || row.cut || null;
    row.color = row.colorMaster?.value || row.color || null;
    row.quality = row.qualityMaster?.value || row.quality || null;
    row.stoneType = row.stoneTypeMaster?.value || row.stoneType || null;
    return row;
  }

  private hydrateLaborDisplayLabels(row: DesignLabor): DesignLabor {
    row.laborHead = row.laborHeadMaster?.value || row.laborHead || null;
    return row;
  }

  private hydrateOverheadDisplayLabels(row: DesignOverhead): DesignOverhead {
    row.overheadHead = row.overheadRuleMaster?.value || row.overheadHead || null;
    row.overheadApplyMode = row.overheadApplyMode || row.overheadRuleMaster?.overheadApplyMode || null;
    row.ratePercent = row.ratePercent ?? row.overheadRuleMaster?.ratePercent ?? null;
    row.flatAmount = row.flatAmount ?? row.overheadRuleMaster?.flatAmount ?? null;
    return row;
  }

  private hydrateFindingDisplayLabels(row: DesignFinding): DesignFinding {
    row.findingHead = row.findingHeadMaster?.value || row.findingHead || null;
    return row;
  }

  private hydrateProcessStageDisplayLabels(row: DesignProcessStage): DesignProcessStage {
    row.processStage = row.processStageMaster?.value || row.processStage || '';
    return row;
  }

  private hydrateVendorDisplayLabels(row: DesignVendor): DesignVendor {
    row.supplierName = row.vendorNameMaster?.value || row.supplierName || '';
    return row;
  }

  private serializeMetalRows(rows: DesignMetal[]): Array<Record<string, unknown>> {
    return rows.map((row) => ({
      ...row,
      metalCaratageId: row.metalCaratageMaster?.id ?? row.metalCaratageId ?? null,
      metalCaratage: row.metalCaratageMaster?.value || row.metalCaratage || null,
      metalName: row.metalCaratageMaster?.metalMaster?.value || null,
      metalColor: row.metalCaratageMaster?.metalColorMaster?.value || null,
      metalPurity: row.metalCaratageMaster?.metalPurityMaster?.value || null,
      pricePerGm: row.pricePerGm,
    }));
  }

  private serializeGemstoneRows(
    rows: Array<DesignGemstone & { packetName?: string | null }>,
  ): Array<Record<string, unknown>> {
    return rows.map((row) => ({
      ...row,
      stoneId: row.stoneMaster?.id ?? row.stoneId ?? null,
      stone: row.stoneMaster?.value || row.stone || null,
      shapeId: row.shapeMaster?.id ?? row.shapeId ?? null,
      shape: row.shapeMaster?.value || row.shape || null,
      sizeId: row.sizeMaster?.id ?? row.sizeId ?? null,
      size: row.sizeMaster?.value || row.size || null,
      cutId: row.cutMaster?.id ?? row.cutId ?? null,
      cut: row.cutMaster?.value || row.cut || null,
      colorId: row.colorMaster?.id ?? row.colorId ?? null,
      color: row.colorMaster?.value || row.color || null,
      qualityId: row.qualityMaster?.id ?? row.qualityId ?? null,
      quality: row.qualityMaster?.value || row.quality || null,
      stoneTypeId: row.stoneTypeMaster?.id ?? row.stoneTypeId ?? null,
      stoneType: row.stoneTypeMaster?.value || row.stoneType || null,
      packet: row.packet ? this.toCompactPacketResponse(row.packet) : null,
      packetName: row.packet?.packetName || row.packetName || null,
    }));
  }

  private serializeLaborRows(rows: DesignLabor[]): Array<Record<string, unknown>> {
    return rows.map((row) => ({
      ...row,
      laborHeadId: row.laborHeadMaster?.id ?? row.laborHeadId ?? null,
      laborHead: row.laborHeadMaster?.value || row.laborHead || null,
      laborRuleId: row.laborRuleMaster?.id ?? row.laborRuleId ?? null,
      laborRule: row.laborRuleMaster?.value || null,
    }));
  }

  private serializeOverheadRows(rows: DesignOverhead[]): Array<Record<string, unknown>> {
    return rows.map((row) => ({
      ...row,
      overheadRuleId: row.overheadRuleMaster?.id ?? row.overheadRuleId ?? null,
      overheadHead: row.overheadRuleMaster?.value || row.overheadHead || null,
      overheadApplyMode: row.overheadApplyMode || row.overheadRuleMaster?.overheadApplyMode || null,
      ratePercent: row.ratePercent ?? row.overheadRuleMaster?.ratePercent ?? null,
      flatAmount: row.flatAmount ?? row.overheadRuleMaster?.flatAmount ?? null,
    }));
  }

  private serializeFindingRows(rows: DesignFinding[]): Array<Record<string, unknown>> {
    return rows.map((row) => ({
      ...row,
      findingHeadId: row.findingHeadMaster?.id ?? row.findingHeadId ?? null,
      findingHead: row.findingHeadMaster?.value || row.findingHead || null,
    }));
  }

  private serializeProcessStageRows(rows: DesignProcessStage[]): Array<Record<string, unknown>> {
    return rows.map((row) => ({
      ...row,
      processStageId: row.processStageMaster?.id ?? row.processStageId,
      processStage: row.processStageMaster?.value || row.processStage || '',
    }));
  }

  private serializeVendorRows(rows: DesignVendor[]): Array<Record<string, unknown>> {
    return rows.map((row) => ({
      ...row,
      vendorNameId: row.vendorNameMaster?.id ?? row.vendorNameId,
      supplierName: row.vendorNameMaster?.value || row.supplierName || '',
      supplierEmail: row.vendorNameMaster?.email || null,
    }));
  }

  private async getGlobalRateMaps(): Promise<GlobalRateMaps> {
    const rows = await this.globalBasePriceRepo.find({
      where: { isActive: true },
      order: { effectiveFrom: 'DESC', updatedAt: 'DESC' },
    });
    return this.buildGlobalRateMaps(rows);
  }

  private buildGlobalRateMaps(rows: GlobalBasePrice[]): GlobalRateMaps {
    const metalRates = new Map<string, number>();
    const diamondRatesByType = new Map<string, number>();
    const diamondRatesByTypeAndSize = new Map<string, number>();

    rows.forEach((row) => {
      const referenceKey = this.normalizeLookupKey(row.referenceValue);
      if (!referenceKey) return;

      const rate = this.toNumber(row.pricePerUnit);
      if (row.category === GlobalBasePriceCategory.METAL) {
        if (!metalRates.has(referenceKey)) {
          metalRates.set(referenceKey, rate);
        }
        return;
      }

      if (row.category === GlobalBasePriceCategory.DIAMOND) {
        const sizeKey = this.normalizeLookupKey(row.subValue);
        if (sizeKey) {
          const key = `${referenceKey}::${sizeKey}`;
          if (!diamondRatesByTypeAndSize.has(key)) {
            diamondRatesByTypeAndSize.set(key, rate);
          }
        }

        if (!diamondRatesByType.has(referenceKey)) {
          diamondRatesByType.set(referenceKey, rate);
        }
      }
    });

    return {
      metalRates,
      diamondRatesByType,
      diamondRatesByTypeAndSize,
    };
  }

  private resolveMetalCaratageRate(
    metalCaratageRates: Map<string, number> | undefined,
    metalCaratage: string | null,
  ): number | undefined {
    if (!metalCaratageRates || !metalCaratage) {
      return undefined;
    }

    const lookupKey = this.normalizeLookupKey(metalCaratage);
    if (!lookupKey) {
      return undefined;
    }

    return metalCaratageRates.get(lookupKey);
  }

  private resolveDiamondRate(
    globalRateMaps: GlobalRateMaps | undefined,
    diamondType: string | null,
    size: string | null,
  ): number | undefined {
    if (!globalRateMaps || !diamondType) {
      return undefined;
    }

    const diamondTypeKey = this.normalizeLookupKey(diamondType);
    if (!diamondTypeKey) {
      return undefined;
    }

    const sizeKey = this.normalizeLookupKey(size);
    if (sizeKey) {
      const sizeSpecificRate = globalRateMaps.diamondRatesByTypeAndSize.get(
        `${diamondTypeKey}::${sizeKey}`,
      );
      if (sizeSpecificRate !== undefined) {
        return sizeSpecificRate;
      }
    }

    return globalRateMaps.diamondRatesByType.get(diamondTypeKey);
  }

  private normalizeLookupKey(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }


  private isDesignBarcode(value?: string | null): boolean {
    return /^\d{7}$/.test(String(value || '').trim());
  }

  private async ensureDesignBarcodes(designs: Design[]): Promise<void> {
    for (const design of designs || []) {
      if (!design?.id || this.isDesignBarcode(design.barcode)) {
        continue;
      }
      design.barcode = await this.resolveDesignBarcode(undefined, design.id);
      await this.saveDesignWithUniqueBarcode(design, design.id);
    }
  }

  private async saveDesignWithUniqueBarcode(
    design: Design,
    excludeDesignId?: string | number,
    repository: Repository<Design> = this.designRepo,
  ): Promise<Design> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (!this.isDesignBarcode(design.barcode)) {
        design.barcode = await this.resolveDesignBarcode(undefined, excludeDesignId || design.id);
      }

      try {
        return await repository.save(design);
      } catch (error) {
        if (this.isDuplicateDesignNameError(error)) {
          throw new BadRequestException('Design Name already exists.');
        }
        if (!this.isDuplicateDesignBarcodeError(error) || attempt === 19) {
          throw error;
        }
        design.barcode = await this.resolveDesignBarcode(undefined, excludeDesignId || design.id);
      }
    }

    throw new BadRequestException('Unable to save design with a unique barcode');
  }

  private isDuplicateDesignBarcodeError(error: unknown): boolean {
    const code = (error as { code?: string })?.code || '';
    const message = String((error as { message?: string })?.message || '').toLowerCase();
    return (
      code === 'ER_DUP_ENTRY' &&
      (message.includes('ux_designs_barcode') || message.includes('barcode'))
    );
  }

  private isDuplicateDesignNameError(error: unknown): boolean {
    const code = (error as { code?: string })?.code || '';
    const message = String((error as { message?: string })?.message || '').toLowerCase();
    return (
      code === 'ER_DUP_ENTRY' &&
      (message.includes('uq_designs_design_name') ||
        message.includes('uq_designs_primary_design_name') ||
        message.includes('design_name_unique_key') ||
        message.includes('design_name'))
    );
  }

  private normalizeDesignBarcode(value?: string | null): string | null {
    const normalized = String(value || '').trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    if (!this.isDesignBarcode(normalized)) {
      throw new BadRequestException('Design barcode must contain digits only');
    }
    return normalized;
  }

  private async generateDesignBarcode(): Promise<string> {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const candidate = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
      const existing = await this.designRepo.findOne({ where: { barcode: candidate } });
      if (!existing) {
        return candidate;
      }
    }
    throw new BadRequestException('Unable to generate a unique design barcode');
  }

  private async resolveDesignBarcode(value?: string | null, excludeDesignId?: string | number): Promise<string> {
    const normalized = this.normalizeDesignBarcode(value);
    if (!normalized) {
      return this.generateDesignBarcode();
    }

    const existing = await this.designRepo.findOne({ where: { barcode: normalized } });
    if (existing && existing.id !== excludeDesignId) {
      throw new BadRequestException('Design barcode already exists');
    }
    return normalized;
  }

  private optionalInt(value: string | number | null | undefined): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private buildDefaultDesignName(jewelryGroup: string | null | undefined, designNo: string): string {
    const normalizedDesignNo = this.normalizeDesignNo(designNo);
    const normalizedGroup = this.optionalText(jewelryGroup);
    return normalizedDesignNo || normalizedGroup || 'Design';
  }

  private deriveFileNameFromUrl(fileUrl: string): string {
    const normalized = fileUrl.trim();
    const segments = normalized.split('/');
    return segments[segments.length - 1] || 'stl-file';
  }

  private getSignedUrlCacheKey(bucket: string, key: string): string {
    return `${bucket}/${key}`;
  }

  private getCachedSignedUrl(bucket: string, key: string): string | null {
    const cacheKey = this.getSignedUrlCacheKey(bucket, key);
    const cached = this.signedUrlCache.get(cacheKey);
    if (!cached) return null;
    if (Date.now() >= cached.expiresAt - this.signedUrlCacheSkewMs) {
      this.signedUrlCache.delete(cacheKey);
      return null;
    }
    return cached.url;
  }

  private setCachedSignedUrl(bucket: string, key: string, url: string, expiresInSeconds: number): void {
    const cacheKey = this.getSignedUrlCacheKey(bucket, key);
    this.signedUrlCache.set(cacheKey, {
      url,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    });

    if (this.signedUrlCache.size > 6000) {
      const now = Date.now();
      for (const [entryKey, entry] of this.signedUrlCache.entries()) {
        if (entry.expiresAt <= now || this.signedUrlCache.size > 5000) {
          this.signedUrlCache.delete(entryKey);
        }
      }
    }
  }

  private sortByOrder<T extends { sortOrder?: number; createdAt?: Date }>(rows: T[]): T[] {
    return [...(rows || [])].sort((left, right) => {
      const leftOrder = left.sortOrder ?? 0;
      const rightOrder = right.sortOrder ?? 0;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      if (left.createdAt && right.createdAt) {
        return left.createdAt.getTime() - right.createdAt.getTime();
      }

      return 0;
    });
  }

}
