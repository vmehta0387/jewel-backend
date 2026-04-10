import {
  BadRequestException,
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
  CreateStonePacketDto,
  CreateProductDto,
  CreateDesignMasterDto,
  GetNextDesignNoQueryDto,
  GetNextDesignVersionQueryDto,
  DesignFindingDto,
  DesignGemstoneDto,
  DesignLaborDto,
  DesignMetalDto,
  FindDesignMastersQueryDto,
  FindDesignMediaLibraryQueryDto,
  DesignPricingTierDto,
  DesignProcessStageDto,
  DesignVendorDto,
  FindPacketsQueryDto,
  FindProductsQueryDto,
  PricingIncrementBy,
  ProductDurationType,
  UpdateDesignMasterDto,
  UpdateStonePacketDto,
  UpdateProductDto,
  UploadStlFileDto,
} from './dto/product.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../../common/enums/user-role.enum';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { Design } from './entities/design.entity';
import { DesignFinding } from './entities/design-finding.entity';
import { DesignGemstone } from './entities/design-gemstone.entity';
import { DesignHistory } from './entities/design-history.entity';
import { DesignLabor } from './entities/design-labor.entity';
import { DesignMetal } from './entities/design-metal.entity';
import { DesignPricingIncrementBy, DesignPricingTier } from './entities/design-pricing-tier.entity';
import { DesignDurationType, DesignProcessStage } from './entities/design-process-stage.entity';
import { DesignRelevant } from './entities/design-relevant.entity';
import { DesignStlFile } from './entities/design-stl-file.entity';
import { DesignVendor } from './entities/design-vendor.entity';
import { StonePacket, StonePacketPriceIn, StoneWeightUnit } from './entities/stone-packet.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { DesignMaster, DesignMasterType, FindingPriceIn } from './entities/design-master.entity';
import { GlobalBasePrice, GlobalBasePriceCategory } from '../pricing/entities/global-base-price.entity';
import { User } from '../users/entities/user.entity';
import { DesignMediaLibrary, DesignMediaType } from './entities/design-media-library.entity';

interface ScopeResult {
  companyId: string | null;
  branchId: string | null;
}

interface NormalizedMetalRow {
  metalCaratage: string | null;
  goldColour: string | null;
  netWt: number;
  wastagePercent: number;
  wastageWt: number;
  totalWt: number;
  pricePerGm: number;
  value: number;
  components: number;
}

interface NormalizedGemstoneRow {
  packetId: string | null;
  stone: string | null;
  shape: string | null;
  size: string | null;
  cut: string | null;
  color: string | null;
  quality: string | null;
  stoneType: string | null;
  wtPerPcs: number;
  pcs: number;
  wtInCts: number;
  pricePerCt: number;
  amount: number;
}

interface NormalizedLaborRow {
  laborHead: string | null;
  laborPerUnit: number;
  unitQty: number;
  laborValue: number;
}

interface NormalizedFindingRow {
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
  findingValue: number;
  totalValue: number;
  grossWeight: number;
}

interface GlobalRateMaps {
  metalRates: Map<string, number>;
  diamondRatesByType: Map<string, number>;
  diamondRatesByTypeAndSize: Map<string, number>;
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
  goldColour?: string;
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
  private s3Client: S3Client | null = null;
  private signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
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
    @InjectRepository(DesignLabor)
    private readonly laborRepo: Repository<DesignLabor>,
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
    @InjectRepository(StonePacket)
    private readonly packetRepo: Repository<StonePacket>,
    @InjectRepository(DesignMaster)
    private readonly designMasterRepo: Repository<DesignMaster>,
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
  ) {}

  async create(dto: CreateProductDto, requester: AuthUser): Promise<any> {
    this.assertDesignCreateAccess(requester);
    const jewelryGroup = dto.jewelryGroup?.trim();
    if (!jewelryGroup) {
      throw new BadRequestException('jewelryGroup is required');
    }

    const scope = await this.resolveScope(dto.companyId, dto.branchId, requester);
    const version = this.normalizeVersion(dto.version);
    const requestedDesignNo = dto.designNo?.trim();

    const prefix = await this.resolveJewelryGroupPrefix(jewelryGroup);

    let designNo: string;
    if (requestedDesignNo) {
      designNo = this.applyVersionToDesignNo(requestedDesignNo, version);
      await this.assertUniqueDesign(designNo, version, scope.companyId, undefined);
    } else {
      designNo = await this.withDesignNoLock(scope.companyId, prefix, async () => {
        const generatedDesignNo = await this.generateNextDesignNo(prefix, scope.companyId);
        const versioned = this.applyVersionToDesignNo(generatedDesignNo, version);
        await this.assertUniqueDesign(versioned, version, scope.companyId, undefined);
        return versioned;
      });
    }

    const baseDesignNo = this.normalizeBaseDesignNo(designNo);
    const isPrimary = await this.resolvePrimaryVersionFlag(baseDesignNo, version, scope);

    const globalRateMaps = await this.getGlobalRateMaps();
    const metalCaratageRates = await this.getMetalCaratageRateMap();
    const normalizedMetals = this.normalizeMetals(dto.metals || [], metalCaratageRates);
    const normalizedGemstones = this.normalizeGemstones(
      dto.gemstones || [],
      this.optionalText(dto.diamondType),
      globalRateMaps,
    );
    const normalizedLabors = this.normalizeLabors(dto.labors || []);
    const normalizedFindings = this.normalizeFindings(dto.findings || []);
    const summary = this.calculateSummary(
      normalizedMetals,
      normalizedGemstones,
      normalizedLabors,
      normalizedFindings,
    );

    const design = this.designRepo.create({
      designNo,
      designName: this.optionalText(dto.designName) || this.buildDefaultDesignName(jewelryGroup, designNo),
      version,
      companyId: scope.companyId,
      branchId: scope.branchId,
      jewelryGroup,
      collection: this.optionalText(dto.collection),
      jewelrySize: this.optionalText(dto.jewelrySize),
      stage: this.optionalText(dto.stage),
      diamondSpread: this.optionalText(dto.diamondSpread),
      diamondType: this.optionalText(dto.diamondType),
      diamondWeight: this.optionalText(dto.diamondWeight),
      diamondQuality: this.optionalText(dto.diamondQuality),
      designStatus: this.optionalText(dto.designStatus),
      goldColour: normalizedMetals[0]?.goldColour || null,
      stoneInfo: normalizedGemstones[0]?.stone || null,
      tags: this.normalizeTags(dto.tags),
      drawerLocation: this.optionalText(dto.drawerLocation),
      otherWeight: dto.otherWeight ?? null,
      designDescription: this.optionalText(dto.designDescription),
      remarks: this.optionalText(dto.remarks),
      metalValue: summary.metalValue,
      gemValue: summary.gemValue,
      laborValue: summary.laborValue,
      findingValue: summary.findingValue,
      totalValue: summary.totalValue,
      grossWeight: summary.grossWeight,
      livePrice: summary.totalValue,
      stlFileUrl: this.optionalText(dto.stlFileUrl),
      imageUrls: this.normalizeGalleryUrls(dto.imageUrls),
      ijewelModelId: this.optionalText(dto.ijewelModelId),
      ijewelBaseName: this.optionalText(dto.ijewelBaseName),
      isActive: dto.isActive ?? true,
      isPrimary,
      createdBy: requester.id,
      updatedBy: requester.id,
    });

    const saved = await this.designRepo.save(design);

    await this.replaceMetalRows(saved.id, normalizedMetals);
    await this.replaceGemstoneRows(saved.id, normalizedGemstones);
    await this.replaceLaborRows(saved.id, normalizedLabors);
    await this.replaceFindingRows(saved.id, normalizedFindings);
    await this.replaceProcessStageRows(saved.id, dto.processStages || []);
    await this.replacePricingTierRows(saved.id, dto.pricingTiers || []);
    await this.replaceVendorRows(saved.id, dto.vendors || []);
    await this.setRelevantDesignLinks(saved, dto.relevantDesignIds || [], requester);

    if (dto.stlFileUrl) {
      await this.stlFileRepo.save(
        this.stlFileRepo.create({
          designId: saved.id,
          fileName: this.deriveFileNameFromUrl(dto.stlFileUrl),
          fileUrl: dto.stlFileUrl,
          uploadedBy: requester.id,
        }),
      );
    }

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
      'Gold Colour',
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
        'Gold Colour': 'Rose',
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
        'Gold Colour': 'Rose',
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
    ids: string[],
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
            .filter((value): value is string => Boolean(value)),
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
            'Metal Caratage': row.goldColour || '',
            'Gold Colour': row.goldColour || '',
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
        const finalDesignNo = this.applyVersionToDesignNo(designRow.designNo, version);
        const designKey = this.createImportDesignKey(finalDesignNo, version);

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

    return {
      totalRows: designRows.length,
      created,
      updated,
      failed: errors.length,
      errors,
    };
  }

  async getNextDesignNo(
    query: GetNextDesignNoQueryDto,
    requester: AuthUser,
  ): Promise<{ designNo: string; prefix: string }> {
    this.assertDesignCreateAccess(requester);
    const jewelryGroup = query.jewelryGroup?.trim();
    if (!jewelryGroup) {
      throw new BadRequestException('jewelryGroup is required');
    }

    const scope = await this.resolveScope(query.companyId, query.branchId, requester);
    const prefix = await this.resolveJewelryGroupPrefix(jewelryGroup);
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

    const qb = this.designRepo
      .createQueryBuilder('design')
      .leftJoinAndSelect('design.company', 'company')
      .leftJoinAndSelect('design.branch', 'branch')
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
            .orWhere('design.designName LIKE :search', { search })
            .orWhere('design.version LIKE :search', { search })
            .orWhere('design.jewelryGroup LIKE :search', { search })
            .orWhere('design.collection LIKE :search', { search })
            .orWhere('design.jewelrySize LIKE :search', { search })
            .orWhere('design.stage LIKE :search', { search })
            .orWhere('design.diamondSpread LIKE :search', { search })
            .orWhere('design.diamondType LIKE :search', { search })
            .orWhere('design.diamondWeight LIKE :search', { search })
            .orWhere('design.diamondQuality LIKE :search', { search })
            .orWhere('design.designStatus LIKE :search', { search })
            .orWhere('design.goldColour LIKE :search', { search })
            .orWhere('design.stoneInfo LIKE :search', { search })
            .orWhere('CAST(design.tags AS CHAR) LIKE :search', { search });
        }),
      );
    }

    if (query.jewelryGroup?.trim()) {
      qb.andWhere('design.jewelryGroup LIKE :jewelryGroup', {
        jewelryGroup: `%${query.jewelryGroup.trim()}%`,
      });
    }

    if (query.collection?.trim()) {
      qb.andWhere('design.collection LIKE :collection', {
        collection: `%${query.collection.trim()}%`,
      });
    }

    if (query.jewelrySize?.trim()) {
      qb.andWhere('design.jewelrySize LIKE :jewelrySize', {
        jewelrySize: `%${query.jewelrySize.trim()}%`,
      });
    }

    if (query.tags?.trim()) {
      qb.andWhere('CAST(design.tags AS CHAR) LIKE :tags', { tags: `%${query.tags.trim()}%` });
    }

    if (query.stage?.trim()) {
      qb.andWhere('design.stage LIKE :stage', { stage: `%${query.stage.trim()}%` });
    }

    if (query.goldColour?.trim()) {
      qb.andWhere(
        '(design.goldColour LIKE :goldColour OR EXISTS (SELECT 1 FROM design_metals dm WHERE dm.design_id = design.id AND dm.gold_colour LIKE :goldColour))',
        { goldColour: `%${query.goldColour.trim()}%` },
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

    const [data, total] = await qb.getManyAndCount();
    const updatedByMap = await this.resolveUserNames(
      data.map((design) => design.updatedBy).filter((value): value is string => Boolean(value)),
    );
    const enrichedData = await Promise.all(
      data.map(async (design) => ({
        ...design,
        imageKeys: Array.isArray(design.imageUrls) ? design.imageUrls : [],
        imageUrls: await this.resolveGalleryUrls(design.imageUrls || []),
        stlFileUrl: await this.resolveAssetUrl(design.stlFileUrl),
        updatedByName: design.updatedBy ? updatedByMap.get(design.updatedBy) ?? null : null,
      })),
    );

    return {
      data: enrichedData,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, requester: AuthUser): Promise<any> {
    const design = await this.designRepo.findOne({
      where: { id },
      relations: [
        'company',
        'branch',
        'metals',
        'gemstones',
        'labors',
        'findings',
        'processStages',
        'pricingTiers',
        'vendors',
        'relevantDesignLinks',
        'relevantDesignLinks.relatedDesign',
        'stlFiles',
      ],
    });

    if (!design) {
      throw new NotFoundException('Product design not found');
    }

    this.assertReadScope(design, requester);

    const history = await this.historyRepo.find({
      where: { designId: id },
      relations: ['performedByUser'],
      order: { performedAt: 'DESC' },
    });

    design.metals = this.sortByOrder(design.metals);
    design.gemstones = this.sortByOrder(design.gemstones);
    design.labors = this.sortByOrder(design.labors);
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

    return {
      ...design,
      imageKeys: Array.isArray(design.imageUrls) ? design.imageUrls : [],
      imageUrls: resolvedImageUrls,
      stlFileUrl: resolvedStlFileUrl,
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

  async update(id: string, dto: UpdateProductDto, requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
    const design = await this.getDesignForWrite(id, requester);

    const targetCompanyId = dto.companyId !== undefined ? dto.companyId : design.companyId || undefined;
    const targetBranchId = dto.branchId !== undefined ? dto.branchId : design.branchId || undefined;
    const scope = await this.resolveScope(targetCompanyId, targetBranchId, requester);

    const version = this.normalizeVersion(dto.version || design.version);
    const designNo = this.applyVersionToDesignNo(dto.designNo || design.designNo, version);

    await this.assertUniqueDesign(designNo, version, scope.companyId, id);

    const existingRows = await this.getExistingRows(id);
    const globalRateMaps = await this.getGlobalRateMaps();
    const metalCaratageRates = await this.getMetalCaratageRateMap();
    const normalizedMetals = this.normalizeMetals(
      dto.metals !== undefined ? dto.metals : this.toMetalDtos(existingRows.metals),
      metalCaratageRates,
    );
    const effectiveDiamondType =
      dto.diamondType !== undefined ? this.optionalText(dto.diamondType) : this.optionalText(design.diamondType);
    const normalizedGemstones = this.normalizeGemstones(
      dto.gemstones !== undefined ? dto.gemstones : this.toGemstoneDtos(existingRows.gemstones),
      effectiveDiamondType,
      globalRateMaps,
    );
    const normalizedLabors = this.normalizeLabors(
      dto.labors !== undefined ? dto.labors : this.toLaborDtos(existingRows.labors),
    );
    const normalizedFindings = this.normalizeFindings(
      dto.findings !== undefined ? dto.findings : this.toFindingDtos(existingRows.findings),
    );

    const summary = this.calculateSummary(
      normalizedMetals,
      normalizedGemstones,
      normalizedLabors,
      normalizedFindings,
    );

    design.designNo = designNo;
    design.version = version;
    design.designNo = designNo;
    if (dto.designName !== undefined) {
      design.designName = this.optionalText(dto.designName);
    } else if (!this.optionalText(design.designName)) {
      design.designName = this.buildDefaultDesignName(design.jewelryGroup, designNo);
    }
    design.companyId = scope.companyId;
    design.branchId = scope.branchId;
    if (dto.jewelryGroup !== undefined) design.jewelryGroup = dto.jewelryGroup.trim();
    if (dto.collection !== undefined) design.collection = this.optionalText(dto.collection);
    if (dto.jewelrySize !== undefined) design.jewelrySize = this.optionalText(dto.jewelrySize);
    if (dto.stage !== undefined) design.stage = this.optionalText(dto.stage);
    if (dto.diamondSpread !== undefined) {
      design.diamondSpread = this.optionalText(dto.diamondSpread);
    }
    if (dto.diamondType !== undefined) {
      design.diamondType = this.optionalText(dto.diamondType);
    }
    if (dto.diamondWeight !== undefined) {
      design.diamondWeight = this.optionalText(dto.diamondWeight);
    }
    if (dto.diamondQuality !== undefined) {
      design.diamondQuality = this.optionalText(dto.diamondQuality);
    }
    if (dto.designStatus !== undefined) design.designStatus = this.optionalText(dto.designStatus);
    design.goldColour = normalizedMetals[0]?.goldColour || null;
    design.stoneInfo = normalizedGemstones[0]?.stone || null;
    if (dto.tags !== undefined) design.tags = this.normalizeTags(dto.tags);
    if (dto.drawerLocation !== undefined) design.drawerLocation = this.optionalText(dto.drawerLocation);
    if (dto.otherWeight !== undefined) design.otherWeight = dto.otherWeight ?? null;
    if (dto.designDescription !== undefined) {
      design.designDescription = this.optionalText(dto.designDescription);
    }
    if (dto.remarks !== undefined) design.remarks = this.optionalText(dto.remarks);
    if (dto.imageUrls !== undefined) design.imageUrls = this.normalizeGalleryUrls(dto.imageUrls);
    if (dto.stlFileUrl !== undefined) design.stlFileUrl = this.optionalText(dto.stlFileUrl);
    if (dto.ijewelModelId !== undefined) design.ijewelModelId = this.optionalText(dto.ijewelModelId);
    if (dto.ijewelBaseName !== undefined) design.ijewelBaseName = this.optionalText(dto.ijewelBaseName);
    if (dto.isActive !== undefined) design.isActive = dto.isActive;
    design.metalValue = summary.metalValue;
    design.gemValue = summary.gemValue;
    design.laborValue = summary.laborValue;
    design.findingValue = summary.findingValue;
    design.totalValue = summary.totalValue;
    design.grossWeight = summary.grossWeight;
    design.livePrice = summary.totalValue;
    design.updatedBy = requester.id;

    await this.designRepo.save(design);

    if (dto.metals !== undefined) {
      await this.replaceMetalRows(id, normalizedMetals);
    }

    if (dto.gemstones !== undefined) {
      await this.replaceGemstoneRows(id, normalizedGemstones);
    }

    if (dto.labors !== undefined) {
      await this.replaceLaborRows(id, normalizedLabors);
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
      await this.replaceRelevantDesigns(id, dto.relevantDesignIds, requester);
    }

    if (dto.stlFileUrl) {
      await this.stlFileRepo.save(
        this.stlFileRepo.create({
          designId: id,
          fileName: this.deriveFileNameFromUrl(dto.stlFileUrl),
          fileUrl: dto.stlFileUrl,
          uploadedBy: requester.id,
        }),
      );
    }

    await this.addHistory(id, 'UPDATED', 'Design updated successfully.', requester.id);
    return this.findOne(id, requester);
  }

  async setPrimaryVersion(id: string, requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
    const design = await this.getDesignForWrite(id, requester);

    const baseDesignNo = this.normalizeBaseDesignNo(design.designNo);
    const versionedDesignNo = `${baseDesignNo}-V%`;
    const companyId = design.companyId;
    const branchId = design.branchId;

    const resetQuery = this.designRepo
      .createQueryBuilder()
      .update(Design)
      .set({ isPrimary: false })
      .where('(designNo = :baseDesignNo OR designNo LIKE :versionedDesignNo)', {
        baseDesignNo,
        versionedDesignNo,
      });

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
    design.isPrimary = true;
    design.updatedBy = requester.id;
    await this.designRepo.save(design);

    await this.addHistory(id, 'PRIMARY_UPDATED', 'Design version set as primary.', requester.id);
    return this.findOne(id, requester);
  }

  async updateStatus(id: string, isActive: boolean, requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
    if (isActive && requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can activate inactive designs.');
    }
    const design = await this.getDesignForWrite(id, requester);
    design.isActive = isActive;
    design.updatedBy = requester.id;
    await this.designRepo.save(design);

    await this.addHistory(
      id,
      'STATUS_CHANGED',
      `Design marked as ${isActive ? 'active' : 'inactive'}.`,
      requester.id,
    );

    return this.findOne(id, requester);
  }

  async remove(id: string, requester: AuthUser): Promise<{ deleted: boolean }> {
    this.assertDesignWriteAccess(requester);
    const design = await this.getDesignForWrite(id, requester);
    if (!design.isActive) {
      return { deleted: false };
    }
    design.isActive = false;
    design.updatedBy = requester.id;
    await this.designRepo.save(design);
    await this.addHistory(id, 'DISABLED', 'Design disabled.', requester.id);
    return { deleted: false };
  }

  async replaceRelevantDesigns(
    id: string,
    designIds: string[],
    requester: AuthUser,
  ): Promise<any> {
    this.assertDesignWriteAccess(requester);
    const design = await this.getDesignForWrite(id, requester);
    await this.setRelevantDesignLinks(design, designIds, requester);

    await this.addHistory(id, 'RELEVANT_UPDATED', 'Relevant designs updated successfully.', requester.id);
    return this.findOne(id, requester);
  }

  async replaceProcessStages(id: string, rows: DesignProcessStageDto[], requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
    await this.getDesignForWrite(id, requester);
    await this.replaceProcessStageRows(id, rows || []);
    await this.addHistory(id, 'PROCESS_UPDATED', 'Process stages updated successfully.', requester.id);
    return this.findOne(id, requester);
  }

  async replacePricingTiers(id: string, rows: DesignPricingTierDto[], requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
    await this.getDesignForWrite(id, requester);
    await this.replacePricingTierRows(id, rows || []);
    await this.addHistory(id, 'PRICING_UPDATED', 'Pricing tiers updated successfully.', requester.id);
    return this.findOne(id, requester);
  }

  async replaceVendors(id: string, rows: DesignVendorDto[], requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
    await this.getDesignForWrite(id, requester);
    await this.replaceVendorRows(id, rows || []);
    await this.addHistory(id, 'VENDOR_UPDATED', 'Vendor list updated successfully.', requester.id);
    return this.findOne(id, requester);
  }

  async uploadStlFile(id: string, dto: UploadStlFileDto, requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
    const design = await this.getDesignForWrite(id, requester);

    await this.stlFileRepo.save(
      this.stlFileRepo.create({
        designId: id,
        fileName: dto.fileName.trim(),
        fileUrl: dto.fileUrl.trim(),
        notes: this.optionalText(dto.notes),
        uploadedBy: requester.id,
      }),
    );

    design.stlFileUrl = dto.fileUrl.trim();
    design.updatedBy = requester.id;
    await this.designRepo.save(design);

    await this.addHistory(id, 'STL_UPLOADED', 'STL file uploaded successfully.', requester.id);
    return this.findOne(id, requester);
  }

  async getStlFileContent(
    id: string,
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

  async getHistory(id: string, requester: AuthUser): Promise<any[]> {
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

  async findPackets(query: FindPacketsQueryDto): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.packetRepo
      .createQueryBuilder('packet')
      .orderBy('packet.packetName', 'ASC')
      .skip(skip)
      .take(limit);

    const status = query.status || 'ACTIVE';
    if (status === 'ACTIVE') {
      qb.where('packet.isActive = :isActive', { isActive: true });
    } else if (status === 'INACTIVE') {
      qb.where('packet.isActive = :isActive', { isActive: false });
    }

    if (query.stockType?.trim()) {
      qb.andWhere('packet.stockType LIKE :stockType', { stockType: `%${query.stockType.trim()}%` });
    }

    if (query.barcode?.trim()) {
      qb.andWhere('packet.barcode LIKE :barcode', { barcode: `%${query.barcode.trim()}%` });
    }

    if (query.stone?.trim()) {
      qb.andWhere('packet.stone LIKE :stone', { stone: `%${query.stone.trim()}%` });
    }

    if (query.shape?.trim()) {
      qb.andWhere('packet.shape LIKE :shape', { shape: `%${query.shape.trim()}%` });
    }

    if (query.size?.trim()) {
      qb.andWhere('packet.size LIKE :size', { size: `%${query.size.trim()}%` });
    }

    if (query.cut?.trim()) {
      qb.andWhere('packet.cut LIKE :cut', { cut: `%${query.cut.trim()}%` });
    }

    if (query.color?.trim()) {
      qb.andWhere('packet.color LIKE :color', { color: `%${query.color.trim()}%` });
    }

    if (query.quality?.trim()) {
      qb.andWhere('packet.quality LIKE :quality', { quality: `%${query.quality.trim()}%` });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((sqb) => {
          sqb
            .where('packet.packetName LIKE :search', { search })
            .orWhere('packet.barcode LIKE :search', { search })
            .orWhere('packet.stone LIKE :search', { search })
            .orWhere('packet.shape LIKE :search', { search })
            .orWhere('packet.size LIKE :search', { search })
            .orWhere('packet.cut LIKE :search', { search })
            .orWhere('packet.color LIKE :search', { search })
            .orWhere('packet.quality LIKE :search', { search });
        }),
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findMediaLibrary(query: FindDesignMediaLibraryQueryDto): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 30;
    const skip = (page - 1) * limit;

    const qb = this.designMediaLibraryRepo
      .createQueryBuilder('media')
      .leftJoinAndSelect('media.uploadedByUser', 'uploadedByUser')
      .orderBy('media.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const type = (query.type || 'ALL').trim().toUpperCase();
    if (type !== 'ALL') {
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
    const data = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        mediaType: row.mediaType,
        fileName: row.fileName,
        fileKey: row.fileKey,
        mimeType: row.mimeType,
        fileSizeBytes: row.fileSizeBytes ? Number(row.fileSizeBytes) : null,
        url: (await this.resolveAssetUrl(row.fileKey)) || row.fileKey,
        uploadedBy: row.uploadedByUser
          ? `${row.uploadedByUser.firstName || ''} ${row.uploadedByUser.lastName || ''}`.trim() || row.uploadedByUser.email
          : null,
        createdAt: row.createdAt,
      })),
    );

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createPacket(dto: CreateStonePacketDto, requester: AuthUser): Promise<StonePacket> {
    this.assertDesignWriteAccess(requester);
    const packetName = this.normalizePacketName(dto.packetName);
    const existing = await this.packetRepo.findOne({ where: { packetName } });
    const pieces = this.resolvePacketPieces(dto.pieces, 1);
    const weightPerPc = this.resolvePacketWeightPerPc({
      weightPerPc: dto.weightPerPc,
      weight: dto.weight,
      pieces,
    });
    const totalWeight = this.roundTo3(weightPerPc * pieces);
    const priceIn = this.normalizePacketPriceIn(dto.priceIn);
    const sellingPrice = this.optionalNonNegativeNumber(dto.sellingPrice, 'sellingPrice');
    const weightUnit = this.normalizePacketWeightUnit(dto.weightUnit);
    const barcode = await this.resolveStonePacketBarcode(dto.barcode);

    if (existing) {
      if (!existing.isActive) {
        existing.barcode = barcode;
        existing.stockType = this.optionalText(dto.stockType) || existing.stockType || 'COMPLETED';
        existing.stone = this.optionalText(dto.stone);
        existing.shape = this.optionalText(dto.shape);
        existing.size = this.optionalText(dto.size);
        existing.cut = this.optionalText(dto.cut);
        existing.color = this.optionalText(dto.color);
        existing.quality = this.optionalText(dto.quality);
        existing.priceIn = priceIn;
        existing.sellingPrice = sellingPrice;
        existing.weightPerPc = this.roundTo3(weightPerPc);
        existing.pieces = pieces;
        existing.weight = totalWeight;
        existing.weightUnit = weightUnit;
        existing.isActive = true;
        return this.packetRepo.save(existing);
      }
      throw new BadRequestException('Packet name already exists');
    }

    const packet = this.packetRepo.create({
      barcode,
      packetName,
      stockType: this.optionalText(dto.stockType) || 'COMPLETED',
      stone: this.optionalText(dto.stone),
      shape: this.optionalText(dto.shape),
      size: this.optionalText(dto.size),
      cut: this.optionalText(dto.cut),
      color: this.optionalText(dto.color),
      quality: this.optionalText(dto.quality),
      priceIn,
      sellingPrice,
      weightPerPc: this.roundTo3(weightPerPc),
      pieces,
      weight: totalWeight,
      weightUnit,
      isActive: true,
    });

    return this.packetRepo.save(packet);
  }

  async updatePacket(id: string, dto: UpdateStonePacketDto, requester: AuthUser): Promise<StonePacket> {
    this.assertDesignWriteAccess(requester);
    const packet = await this.packetRepo.findOne({ where: { id } });
    if (!packet) {
      throw new NotFoundException('Packet not found');
    }

    if (dto.packetName !== undefined) {
      const nextPacketName = this.normalizePacketName(dto.packetName);
      if (nextPacketName !== packet.packetName) {
        const duplicate = await this.packetRepo.findOne({ where: { packetName: nextPacketName } });
        if (duplicate && duplicate.id !== packet.id) {
          throw new BadRequestException('Packet name already exists');
        }
      }
      packet.packetName = nextPacketName;
    }

    if (dto.barcode !== undefined) {
      packet.barcode = await this.resolveStonePacketBarcode(dto.barcode, packet.id);
    }

    const nextPieces = this.resolvePacketPieces(
      dto.pieces !== undefined ? dto.pieces : packet.pieces,
      packet.pieces || 1,
    );

    if (dto.stockType !== undefined) packet.stockType = this.optionalText(dto.stockType);
    if (dto.stone !== undefined) packet.stone = this.optionalText(dto.stone);
    if (dto.shape !== undefined) packet.shape = this.optionalText(dto.shape);
    if (dto.size !== undefined) packet.size = this.optionalText(dto.size);
    if (dto.cut !== undefined) packet.cut = this.optionalText(dto.cut);
    if (dto.color !== undefined) packet.color = this.optionalText(dto.color);
    if (dto.quality !== undefined) packet.quality = this.optionalText(dto.quality);
    if (dto.priceIn !== undefined) packet.priceIn = this.normalizePacketPriceIn(dto.priceIn);
    if (dto.sellingPrice !== undefined) {
      packet.sellingPrice = this.optionalNonNegativeNumber(dto.sellingPrice, 'sellingPrice');
    }

    const shouldRecalculateWeight =
      dto.weight !== undefined || dto.weightPerPc !== undefined || dto.pieces !== undefined;
    if (shouldRecalculateWeight) {
      const nextWeightPerPc = this.resolvePacketWeightPerPc({
        weightPerPc: dto.weightPerPc,
        weight: dto.weight,
        pieces: nextPieces,
        fallbackWeightPerPc: packet.weightPerPc,
        fallbackWeight: packet.weight,
      });
      packet.weightPerPc = this.roundTo3(nextWeightPerPc);
      packet.weight = this.roundTo3(nextWeightPerPc * nextPieces);
    }

    packet.pieces = nextPieces;
    if (dto.weightUnit !== undefined) packet.weightUnit = this.normalizePacketWeightUnit(dto.weightUnit);

    if (this.toNumber(packet.weightPerPc) <= 0) {
      throw new BadRequestException('Stone packet weight per pc must be greater than 0');
    }

    const savedPacket = await this.packetRepo.save(packet);
    await this.recalculateDesignsForDependencies({ packetIds: [savedPacket.id] });
    return savedPacket;
  }

  async updatePacketStatus(id: string, isActive: boolean, requester: AuthUser): Promise<StonePacket> {
    this.assertDesignWriteAccess(requester);
    const packet = await this.packetRepo.findOne({ where: { id } });
    if (!packet) {
      throw new NotFoundException('Packet not found');
    }

    packet.isActive = isActive;
    return this.packetRepo.save(packet);
  }

  async exportPacketTemplate(): Promise<{ buffer: Buffer; fileName: string }> {
    const workbook = XLSX.utils.book_new();
    const masters = await this.findMasters({});
    const templateRows = [
      {
        Barcode: '100000000001',
        'Packet Name': 'LD-ROU-400-DF-VV',
        Stone: masters.packetStones?.[0]?.value || 'Lab Diamonds',
        Shape: masters.packetShapes?.[0]?.value || 'Round',
        Cut: masters.packetCuts?.[0]?.value || '',
        Size: masters.packetSizes?.[0]?.value || '4.00MM',
        Color: masters.packetColors?.[0]?.value || 'D-F',
        Quality: masters.packetQualities?.[0]?.value || 'VS-VVS',
        'Price In': 'WT',
        'Selling Price': 500,
        'Weight Per Pc': 0.24,
        Pieces: 1,
        Weight: 0.24,
        'Weight Unit': 'CTS',
        Status: 'ACTIVE',
      },
    ];
    const referenceRows = [
      { Field: 'Price In', AllowedValues: Object.values(StonePacketPriceIn).join(', '), Notes: 'Optional, defaults to WT' },
      { Field: 'Weight Unit', AllowedValues: Object.values(StoneWeightUnit).join(', '), Notes: 'Optional, defaults to CTS' },
      { Field: 'Status', AllowedValues: 'ACTIVE, INACTIVE', Notes: 'Optional, defaults to ACTIVE' },
      { Field: 'Barcode', AllowedValues: 'Digits only', Notes: 'Optional; leave blank to auto-generate a numeric barcode.' },
      { Field: 'Packet Name', AllowedValues: 'Unique packet name', Notes: 'Required; existing packet name updates that row' },
    ];
    const lookupRows = this.buildPacketTemplateLookupRows(masters);

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(templateRows, { header: [...this.packetImportHeaders] }),
      'Packets',
    );
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(referenceRows), 'Reference');
    if (lookupRows.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(lookupRows), 'Lookups');
    }

    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: 'stone-packets-import-template.xlsx',
    };
  }

  async exportPackets(query: FindPacketsQueryDto = {}): Promise<{ buffer: Buffer; fileName: string }> {
    const result = await this.findPackets({
      ...query,
      limit: 5000,
      page: 1,
    });

    const workbook = XLSX.utils.book_new();
    const rows = (result.data || []).map((packet: StonePacket) => ({
      Barcode: packet.barcode || '',
      'Packet Name': packet.packetName,
      Stone: packet.stone || '',
      Shape: packet.shape || '',
      Cut: packet.cut || '',
      Size: packet.size || '',
      Color: packet.color || '',
      Quality: packet.quality || '',
      'Price In': packet.priceIn,
      'Selling Price':
        packet.sellingPrice !== null && packet.sellingPrice !== undefined
          ? this.toNumber(packet.sellingPrice)
          : '',
      'Weight Per Pc':
        packet.weightPerPc !== null && packet.weightPerPc !== undefined
          ? this.toNumber(packet.weightPerPc)
          : '',
      Pieces: packet.pieces,
      Weight: this.toNumber(packet.weight),
      'Weight Unit': packet.weightUnit,
      Status: packet.isActive ? 'ACTIVE' : 'INACTIVE',
      'Created At': packet.createdAt,
      'Updated At': packet.updatedAt,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Packets');

    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: `stone-packets-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
    };
  }

  async importPackets(
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
    const rows = this.readExcelRows(file);
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const line = index + 2;

      try {
        const row = this.normalizePacketImportRow(rows[index]);
        const packetName = this.normalizePacketName(row.packetName);
        const existing = await this.packetRepo.findOne({ where: { packetName } });
        const payload: CreateStonePacketDto = {
          barcode: await this.resolveStonePacketBarcode(row.barcode, existing?.id),
          packetName,
          stone: this.optionalText(row.stone) || undefined,
          shape: this.optionalText(row.shape) || undefined,
          cut: this.optionalText(row.cut) || undefined,
          size: this.optionalText(row.size) || undefined,
          color: this.optionalText(row.color) || undefined,
          quality: this.optionalText(row.quality) || undefined,
          priceIn: this.normalizePacketPriceIn(row.priceIn),
          sellingPrice: this.optionalNonNegativeNumber(row.sellingPrice, 'sellingPrice') ?? 0,
          weightPerPc: this.resolvePacketWeightPerPc({
            weightPerPc: row.weightPerPc,
            weight: row.weight,
            pieces: this.resolvePacketPieces(row.pieces, 1),
          }),
          pieces: this.resolvePacketPieces(row.pieces, 1),
          weight: this.optionalNonNegativeNumber(row.weight, 'weight') ?? undefined,
          weightUnit: this.normalizePacketWeightUnit(row.weightUnit),
          stockType: undefined,
        };

        let saved: StonePacket;
        if (existing) {
          const updatePayload: UpdateStonePacketDto = {
            barcode: payload.barcode,
            packetName: payload.packetName,
            stone: payload.stone,
            shape: payload.shape,
            cut: payload.cut,
            size: payload.size,
            color: payload.color,
            quality: payload.quality,
            priceIn: payload.priceIn,
            sellingPrice: payload.sellingPrice,
            weightPerPc: payload.weightPerPc,
            pieces: payload.pieces,
            weight: payload.weight,
            weightUnit: payload.weightUnit,
          };
          saved = await this.updatePacket(existing.id, updatePayload, requester);
          updated += 1;
        } else {
          saved = await this.createPacket(payload, requester);
          created += 1;
        }

        const isActive = this.parseImportStatus(row.isActive);
        if (saved.isActive !== isActive) {
          await this.updatePacketStatus(saved.id, isActive, requester);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${line}: ${message}`);
      }
    }

    return {
      totalRows: rows.length,
      created,
      updated,
      failed: errors.length,
      errors,
    };
  }

  async findMasters(query: FindDesignMastersQueryDto): Promise<any> {
    if (query.type) {
      if ((query.type as unknown as DesignMasterType) === DesignMasterType.FINDING_HEAD) {
        return { data: [], total: 0 };
      }

      const status = query.status || 'ALL';
      const qb = this.designMasterRepo
        .createQueryBuilder('master')
        .where('master.masterType = :type', { type: query.type });

      if (status === 'ACTIVE') {
        qb.andWhere('master.isActive = :isActive', { isActive: true });
      } else if (status === 'INACTIVE') {
        qb.andWhere('master.isActive = :isActive', { isActive: false });
      }

      if (query.search?.trim()) {
        qb.andWhere(
          new Brackets((where) => {
            where
              .where('master.value LIKE :search', { search: `%${query.search.trim()}%` })
              .orWhere('master.aliasName LIKE :search', { search: `%${query.search.trim()}%` })
              .orWhere('master.description LIKE :search', { search: `%${query.search.trim()}%` })
              .orWhere('master.jewelryGroup LIKE :search', { search: `%${query.search.trim()}%` });
          }),
        );
      }

      qb.orderBy('master.isActive', 'DESC');
      if ((query.type as unknown as DesignMasterType) === DesignMasterType.JEWELRY_SIZE) {
        qb.addOrderBy('master.jewelryGroup', 'ASC');
      }
      qb.addOrderBy('master.value', 'ASC');

      const data = await qb.getMany();
      return { data, total: data.length };
    }

    const data = await this.designMasterRepo.find({
      where: { isActive: true },
      order: { value: 'ASC' },
    });

    const grouped = {
      jewelryGroups: [] as Array<{ id: string; value: string }>,
      collections: [] as Array<{ id: string; value: string; jewelryGroupId?: string; jewelryGroup?: string }>,
      jewelrySizes: [] as Array<{
        id: string;
        value: string;
        jewelryGroupId?: string;
        jewelryGroup?: string;
      }>,
      tags: [] as Array<{ id: string; value: string }>,
      designStatuses: [] as Array<{ id: string; value: string }>,
      stages: [] as Array<{ id: string; value: string }>,
      metalNames: [] as Array<{
        id: string;
        value: string;
        marketPricePerOunce?: number;
        marketPricePerGm?: number;
        livePricePerGm?: number;
      }>,
      metalColors: [] as Array<{ id: string; value: string; metalName?: string }>,
      metalPurities: [] as Array<{
        id: string;
        value: string;
        metalName?: string;
        purityPercentage?: number;
      }>,
      metalCaratages: [] as Array<{
        id: string;
        value: string;
        metalName?: string;
        metalColor?: string;
        metalPurity?: string;
        purityPercentage?: number;
        defaultWastagePercent?: number;
        livePricePerGm?: number;
      }>,
      goldColours: [] as Array<{ id: string; value: string; wastagePercent?: number }>,
      diamondTypes: [] as Array<{ id: string; value: string }>,
      diamondSpreads: [] as Array<{ id: string; value: string }>,
      diamondWeights: [] as Array<{ id: string; value: string }>,
      diamondQualities: [] as Array<{ id: string; value: string }>,
      vendorNames: [] as Array<{ id: string; value: string }>,
      laborHeads: [] as Array<{ id: string; value: string }>,
      findingHeads: [] as Array<{ id: string; value: string }>,
      packetStones: [] as Array<{ id: string; value: string }>,
      packetShapes: [] as Array<{ id: string; value: string }>,
      packetSizes: [] as Array<{ id: string; value: string }>,
      packetCuts: [] as Array<{ id: string; value: string }>,
      packetColors: [] as Array<{ id: string; value: string }>,
      packetQualities: [] as Array<{ id: string; value: string }>,
    };

    for (const entry of data) {
      const option = { id: entry.id, value: entry.value, aliasName: entry.aliasName || undefined };
      if (entry.masterType === DesignMasterType.JEWELRY_GROUP) {
        grouped.jewelryGroups.push(option);
      } else if (entry.masterType === DesignMasterType.COLLECTION) {
        grouped.collections.push({
          ...option,
          jewelryGroupId: entry.jewelryGroupId || undefined,
          jewelryGroup: entry.jewelryGroup || undefined,
        });
      } else if (entry.masterType === DesignMasterType.JEWELRY_SIZE) {
        grouped.jewelrySizes.push({
          ...option,
          jewelryGroupId: entry.jewelryGroupId || undefined,
          jewelryGroup: entry.jewelryGroup || undefined,
        });
      } else if (entry.masterType === DesignMasterType.TAG) {
        grouped.tags.push(option);
      } else if (entry.masterType === DesignMasterType.DESIGN_STATUS) {
        grouped.designStatuses.push(option);
      } else if (entry.masterType === DesignMasterType.STAGE) {
        grouped.stages.push(option);
      } else if (entry.masterType === DesignMasterType.METAL_NAME) {
        grouped.metalNames.push({
          ...option,
          marketPricePerOunce:
            entry.marketPricePerOunce !== null && entry.marketPricePerOunce !== undefined
              ? this.toNumber(entry.marketPricePerOunce)
              : undefined,
          marketPricePerGm:
            entry.marketPricePerGm !== null && entry.marketPricePerGm !== undefined
              ? this.toNumber(entry.marketPricePerGm)
              : undefined,
          livePricePerGm:
            entry.livePricePerGm !== null && entry.livePricePerGm !== undefined
              ? this.toNumber(entry.livePricePerGm)
              : undefined,
        });
      } else if (entry.masterType === DesignMasterType.METAL_COLOR) {
        grouped.metalColors.push({
          ...option,
          metalName: entry.metalName || undefined,
        });
      } else if (entry.masterType === DesignMasterType.METAL_PURITY) {
        grouped.metalPurities.push({
          ...option,
          metalName: entry.metalName || undefined,
          purityPercentage:
            entry.purityPercentage !== null && entry.purityPercentage !== undefined
              ? this.toNumber(entry.purityPercentage)
              : undefined,
        });
      } else if (entry.masterType === DesignMasterType.METAL_CARATAGE) {
        grouped.metalCaratages.push({
          ...option,
          metalName: entry.metalName || undefined,
          metalColor: entry.metalColor || undefined,
          metalPurity: entry.metalPurity || undefined,
          purityPercentage:
            entry.purityPercentage !== null && entry.purityPercentage !== undefined
              ? this.toNumber(entry.purityPercentage)
              : undefined,
          defaultWastagePercent:
            entry.defaultWastagePercent !== null && entry.defaultWastagePercent !== undefined
              ? this.toNumber(entry.defaultWastagePercent)
              : undefined,
          livePricePerGm:
            entry.livePricePerGm !== null && entry.livePricePerGm !== undefined
              ? this.toNumber(entry.livePricePerGm)
              : undefined,
        });
      } else if (entry.masterType === DesignMasterType.GOLD_COLOUR) {
        grouped.goldColours.push({
          ...option,
          wastagePercent:
            entry.pricePerUnit !== null && entry.pricePerUnit !== undefined
              ? this.toNumber(entry.pricePerUnit)
              : undefined,
        });
      } else if (entry.masterType === DesignMasterType.DIAMOND_TYPE) {
        grouped.diamondTypes.push(option);
      } else if (entry.masterType === DesignMasterType.DIAMOND_SPREAD) {
        grouped.diamondSpreads.push(option);
      } else if (entry.masterType === DesignMasterType.DIAMOND_WEIGHT) {
        grouped.diamondWeights.push(option);
      } else if (entry.masterType === DesignMasterType.DIAMOND_QUALITY) {
        grouped.diamondQualities.push(option);
      } else if (entry.masterType === DesignMasterType.VENDOR_NAME) {
        grouped.vendorNames.push(option);
      } else if (entry.masterType === DesignMasterType.LABOR_HEAD) {
        grouped.laborHeads.push(option);
      } else if (entry.masterType === DesignMasterType.PACKET_STONE) {
        grouped.packetStones.push(option);
      } else if (entry.masterType === DesignMasterType.PACKET_SHAPE) {
        grouped.packetShapes.push(option);
      } else if (entry.masterType === DesignMasterType.PACKET_SIZE) {
        grouped.packetSizes.push(option);
      } else if (entry.masterType === DesignMasterType.PACKET_CUT) {
        grouped.packetCuts.push(option);
      } else if (entry.masterType === DesignMasterType.PACKET_COLOR) {
        grouped.packetColors.push(option);
      } else if (entry.masterType === DesignMasterType.PACKET_QUALITY) {
        grouped.packetQualities.push(option);
      }
    }

    return grouped;
  }

  async exportMasterTemplate(
    query: FindDesignMastersQueryDto,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const type = this.requireMasterType(query);
    const workbook = XLSX.utils.book_new();
    const templateRows = [this.buildMasterTemplateRow(type)];
    const referenceRows = await this.buildMasterTemplateReferenceRows(type);

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(templateRows, { header: [...this.masterImportHeaders] }),
      'Masters',
    );
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(referenceRows), 'Reference');

    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: `${type.toLowerCase()}-import-template.xlsx`,
    };
  }

  async exportMasters(
    query: FindDesignMastersQueryDto,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const type = this.requireMasterType(query);
    const result = await this.findMasters({
      ...query,
      status: query.status || 'ALL',
    });
    const rows = (result.data || []).map((master: DesignMaster) => this.toMasterExportRow(master, type));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Masters');

    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: `${type.toLowerCase()}-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
    };
  }

  async importMasters(
    file: { buffer?: Buffer; originalname?: string } | undefined,
    query: FindDesignMastersQueryDto,
    requester: AuthUser,
  ): Promise<{
    totalRows: number;
    created: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    this.assertDesignWriteAccess(requester);
    const type = this.requireMasterType(query);
    const rows = this.readExcelRows(file);
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const line = index + 2;
      try {
        const payload = await this.buildMasterImportPayload(
          type,
          this.normalizeMasterImportRow(rows[index]),
          line,
        );
        const existing = await this.findExistingMasterForImport(type, payload);
        let saved: DesignMaster;
        if (existing) {
          saved = await this.updateMaster(existing.id, payload, requester);
          updated += 1;
        } else {
          saved = await this.createMaster(
            {
              masterType: type,
              value: payload.value || '',
              aliasName: payload.aliasName,
              jewelryGroupId: payload.jewelryGroupId,
              description: payload.description,
              findingNo: payload.findingNo,
              metalCaratage: payload.metalCaratage,
              priceIn: payload.priceIn,
              pricePerUnit: payload.pricePerUnit,
              dimensions: payload.dimensions,
              weightPerUnit: payload.weightPerUnit,
              metalName: payload.metalName,
              metalColor: payload.metalColor,
              metalPurity: payload.metalPurity,
              purityPercentage: payload.purityPercentage,
              marketPricePerOunce: payload.marketPricePerOunce,
              marketPricePerGm: payload.marketPricePerGm,
              livePricePerGm: payload.livePricePerGm,
              defaultWastagePercent: payload.defaultWastagePercent,
            },
            requester,
          );
          created += 1;
        }

        const isActive = this.parseImportStatus(this.normalizeMasterImportRow(rows[index]).isActive);
        if (saved.isActive !== isActive) {
          await this.updateMasterStatus(saved.id, isActive, requester);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${line}: ${message}`);
      }
    }

    return {
      totalRows: rows.length,
      created,
      updated,
      failed: errors.length,
      errors,
    };
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

  async createMaster(dto: CreateDesignMasterDto, requester: AuthUser): Promise<DesignMaster> {
    this.assertDesignWriteAccess(requester);
    const value = this.normalizeMasterValue(dto.value);
    const aliasName = this.normalizeMasterAlias(dto.aliasName, value);
    const description = this.optionalText(dto.description);
    const masterType = dto.masterType as unknown as DesignMasterType;
    const normalizedValue = value.toLowerCase();
    const normalizedAlias = aliasName.toLowerCase();
    const findingFields =
      masterType === DesignMasterType.FINDING_HEAD
        ? this.normalizeFindingMasterFields({
            findingNo: dto.findingNo,
            metalCaratage: dto.metalCaratage,
            priceIn: dto.priceIn as FindingPriceIn | undefined,
            pricePerUnit: dto.pricePerUnit,
            dimensions: dto.dimensions,
            weightPerUnit: dto.weightPerUnit,
          })
        : this.emptyFindingMasterFields();
    const metalFields = await this.normalizeMetalMasterFields(
      masterType,
      {
        metalName: dto.metalName,
        metalColor: dto.metalColor,
        metalPurity: dto.metalPurity,
        purityPercentage: dto.purityPercentage,
        marketPricePerOunce: dto.marketPricePerOunce,
        marketPricePerGm: dto.marketPricePerGm,
        livePricePerGm: dto.livePricePerGm,
        defaultWastagePercent: dto.defaultWastagePercent,
      },
      undefined,
    );
    const jewelrySizeFields = await this.normalizeCategoryScopedMasterFields(
      masterType,
      {
        jewelryGroupId: dto.jewelryGroupId,
      },
      undefined,
    );
    const defaultWastagePercent =
      masterType === DesignMasterType.GOLD_COLOUR
        ? this.optionalNonNegativeNumber(dto.pricePerUnit, 'pricePerUnit')
        : null;
    const masterPricePerUnit =
      masterType === DesignMasterType.FINDING_HEAD
        ? findingFields.pricePerUnit
        : masterType === DesignMasterType.METAL_CARATAGE
          ? metalFields.defaultWastagePercent
        : masterType === DesignMasterType.GOLD_COLOUR
          ? defaultWastagePercent
          : null;

    const matches = await this.designMasterRepo
      .createQueryBuilder('master')
      .where('master.masterType = :masterType', { masterType })
      .andWhere('master.scopeKey = :scopeKey', { scopeKey: jewelrySizeFields.scopeKey })
      .andWhere(
        new Brackets((where) => {
          where
            .where('master.normalizedValue = :normalizedValue', { normalizedValue })
            .orWhere('master.normalizedAlias = :normalizedAlias', { normalizedAlias });
          if (findingFields.normalizedFindingNo) {
            where.orWhere('LOWER(master.finding_no) = :normalizedFindingNo', {
              normalizedFindingNo: findingFields.normalizedFindingNo,
            });
          }
        }),
      )
      .getMany();

    const valueMatch = matches.find((master) => master.normalizedValue === normalizedValue);
    if (valueMatch) {
      if (!valueMatch.isActive) {
        valueMatch.value = value;
        valueMatch.aliasName = aliasName;
        valueMatch.normalizedAlias = normalizedAlias;
        valueMatch.description = description;
        valueMatch.findingNo = findingFields.findingNo;
        valueMatch.metalCaratage = findingFields.metalCaratage;
        valueMatch.scopeKey = jewelrySizeFields.scopeKey;
        valueMatch.jewelryGroupId = jewelrySizeFields.jewelryGroupId;
        valueMatch.jewelryGroup = jewelrySizeFields.jewelryGroup;
        valueMatch.priceIn = findingFields.priceIn;
        valueMatch.pricePerUnit = masterPricePerUnit;
        valueMatch.dimensions = findingFields.dimensions;
        valueMatch.weightPerUnit = findingFields.weightPerUnit;
        valueMatch.metalName = metalFields.metalName;
        valueMatch.metalColor = metalFields.metalColor;
        valueMatch.metalPurity = metalFields.metalPurity;
        valueMatch.purityPercentage = metalFields.purityPercentage;
        valueMatch.marketPricePerOunce = metalFields.marketPricePerOunce;
        valueMatch.marketPricePerGm = metalFields.marketPricePerGm;
        valueMatch.livePricePerGm = metalFields.livePricePerGm;
        valueMatch.defaultWastagePercent = metalFields.defaultWastagePercent;
        valueMatch.isActive = true;
        valueMatch.updatedBy = requester.id;
        return this.designMasterRepo.save(valueMatch);
      }
      throw new BadRequestException('Master value already exists for selected type');
    }

    const aliasMatch = matches.find((master) => master.normalizedAlias === normalizedAlias);
    if (aliasMatch) {
      if (!aliasMatch.isActive) {
        aliasMatch.value = value;
        aliasMatch.normalizedValue = normalizedValue;
        aliasMatch.aliasName = aliasName;
        aliasMatch.description = description;
        aliasMatch.findingNo = findingFields.findingNo;
        aliasMatch.metalCaratage = findingFields.metalCaratage;
        aliasMatch.scopeKey = jewelrySizeFields.scopeKey;
        aliasMatch.jewelryGroupId = jewelrySizeFields.jewelryGroupId;
        aliasMatch.jewelryGroup = jewelrySizeFields.jewelryGroup;
        aliasMatch.priceIn = findingFields.priceIn;
        aliasMatch.pricePerUnit = masterPricePerUnit;
        aliasMatch.dimensions = findingFields.dimensions;
        aliasMatch.weightPerUnit = findingFields.weightPerUnit;
        aliasMatch.metalName = metalFields.metalName;
        aliasMatch.metalColor = metalFields.metalColor;
        aliasMatch.metalPurity = metalFields.metalPurity;
        aliasMatch.purityPercentage = metalFields.purityPercentage;
        aliasMatch.marketPricePerOunce = metalFields.marketPricePerOunce;
        aliasMatch.marketPricePerGm = metalFields.marketPricePerGm;
        aliasMatch.livePricePerGm = metalFields.livePricePerGm;
        aliasMatch.defaultWastagePercent = metalFields.defaultWastagePercent;
        aliasMatch.isActive = true;
        aliasMatch.updatedBy = requester.id;
        return this.designMasterRepo.save(aliasMatch);
      }
      throw new BadRequestException('Master alias already exists for selected type');
    }

    if (findingFields.normalizedFindingNo) {
      const findingNoMatch = matches.find(
        (master) => (master.findingNo || '').toLowerCase() === findingFields.normalizedFindingNo,
      );
      if (findingNoMatch) {
        if (!findingNoMatch.isActive) {
          findingNoMatch.value = value;
          findingNoMatch.normalizedValue = normalizedValue;
          findingNoMatch.aliasName = aliasName;
          findingNoMatch.normalizedAlias = normalizedAlias;
          findingNoMatch.description = description;
          findingNoMatch.findingNo = findingFields.findingNo;
          findingNoMatch.metalCaratage = findingFields.metalCaratage;
          findingNoMatch.scopeKey = jewelrySizeFields.scopeKey;
          findingNoMatch.jewelryGroupId = jewelrySizeFields.jewelryGroupId;
          findingNoMatch.jewelryGroup = jewelrySizeFields.jewelryGroup;
          findingNoMatch.priceIn = findingFields.priceIn;
          findingNoMatch.pricePerUnit = masterPricePerUnit;
          findingNoMatch.dimensions = findingFields.dimensions;
          findingNoMatch.weightPerUnit = findingFields.weightPerUnit;
          findingNoMatch.metalName = metalFields.metalName;
          findingNoMatch.metalColor = metalFields.metalColor;
          findingNoMatch.metalPurity = metalFields.metalPurity;
          findingNoMatch.purityPercentage = metalFields.purityPercentage;
          findingNoMatch.marketPricePerOunce = metalFields.marketPricePerOunce;
          findingNoMatch.marketPricePerGm = metalFields.marketPricePerGm;
          findingNoMatch.livePricePerGm = metalFields.livePricePerGm;
          findingNoMatch.defaultWastagePercent = metalFields.defaultWastagePercent;
          findingNoMatch.isActive = true;
          findingNoMatch.updatedBy = requester.id;
          return this.designMasterRepo.save(findingNoMatch);
        }
        throw new BadRequestException('Finding number already exists');
      }
    }

    const created = this.designMasterRepo.create({
      masterType,
      value,
      normalizedValue,
      aliasName,
      normalizedAlias,
      scopeKey: jewelrySizeFields.scopeKey,
      jewelryGroupId: jewelrySizeFields.jewelryGroupId,
      jewelryGroup: jewelrySizeFields.jewelryGroup,
      description,
      findingNo: findingFields.findingNo,
      metalCaratage: findingFields.metalCaratage,
      priceIn: findingFields.priceIn,
      pricePerUnit: masterPricePerUnit,
      dimensions: findingFields.dimensions,
      weightPerUnit: findingFields.weightPerUnit,
      metalName: metalFields.metalName,
      metalColor: metalFields.metalColor,
      metalPurity: metalFields.metalPurity,
      purityPercentage: metalFields.purityPercentage,
      marketPricePerOunce: metalFields.marketPricePerOunce,
      marketPricePerGm: metalFields.marketPricePerGm,
      livePricePerGm: metalFields.livePricePerGm,
      defaultWastagePercent: metalFields.defaultWastagePercent,
      isActive: true,
      createdBy: requester.id,
      updatedBy: requester.id,
    });

    return this.designMasterRepo.save(created);
  }

  async updateMaster(id: string, dto: UpdateDesignMasterDto, requester: AuthUser): Promise<DesignMaster> {
    this.assertDesignWriteAccess(requester);
    const master = await this.designMasterRepo.findOne({ where: { id } });
    if (!master) {
      throw new NotFoundException('Master value not found');
    }

    const value = dto.value !== undefined ? this.normalizeMasterValue(dto.value) : master.value;
    const normalizedValue = value.toLowerCase();
    const aliasName = this.normalizeMasterAlias(
      dto.aliasName !== undefined ? dto.aliasName : master.aliasName,
      value,
    );
    const normalizedAlias = aliasName.toLowerCase();
    const description =
      dto.description !== undefined ? this.optionalText(dto.description) : master.description;
    const findingFields =
      master.masterType === DesignMasterType.FINDING_HEAD
        ? this.normalizeFindingMasterFields({
            findingNo: dto.findingNo !== undefined ? dto.findingNo : master.findingNo,
            metalCaratage:
              dto.metalCaratage !== undefined ? dto.metalCaratage : master.metalCaratage,
            priceIn: (dto.priceIn !== undefined ? dto.priceIn : master.priceIn) as
              | FindingPriceIn
              | undefined
              | null,
            pricePerUnit:
              dto.pricePerUnit !== undefined ? dto.pricePerUnit : master.pricePerUnit,
            dimensions: dto.dimensions !== undefined ? dto.dimensions : master.dimensions,
            weightPerUnit:
              dto.weightPerUnit !== undefined ? dto.weightPerUnit : master.weightPerUnit,
          })
        : this.emptyFindingMasterFields();
    const metalFields = await this.normalizeMetalMasterFields(
      master.masterType,
      {
        metalName: dto.metalName,
        metalColor: dto.metalColor,
        metalPurity: dto.metalPurity,
        purityPercentage: dto.purityPercentage,
        marketPricePerOunce: dto.marketPricePerOunce,
        marketPricePerGm: dto.marketPricePerGm,
        livePricePerGm: dto.livePricePerGm,
        defaultWastagePercent: dto.defaultWastagePercent,
      },
      master,
    );
    const jewelrySizeFields = await this.normalizeCategoryScopedMasterFields(
      master.masterType,
      {
        jewelryGroupId: dto.jewelryGroupId,
      },
      master,
    );
    const defaultWastagePercent =
      master.masterType === DesignMasterType.GOLD_COLOUR
        ? this.optionalNonNegativeNumber(
            dto.pricePerUnit !== undefined ? dto.pricePerUnit : master.pricePerUnit,
            'pricePerUnit',
          )
        : null;
    const masterPricePerUnit =
      master.masterType === DesignMasterType.FINDING_HEAD
        ? findingFields.pricePerUnit
        : master.masterType === DesignMasterType.METAL_CARATAGE
          ? metalFields.defaultWastagePercent
        : master.masterType === DesignMasterType.GOLD_COLOUR
          ? defaultWastagePercent
          : null;

    const duplicates = await this.designMasterRepo
      .createQueryBuilder('duplicate')
      .where('duplicate.masterType = :masterType', { masterType: master.masterType })
      .andWhere('duplicate.scopeKey = :scopeKey', { scopeKey: jewelrySizeFields.scopeKey })
      .andWhere('duplicate.id != :id', { id: master.id })
      .andWhere(
        new Brackets((where) => {
          where
            .where('duplicate.normalizedValue = :normalizedValue', { normalizedValue })
            .orWhere('duplicate.normalizedAlias = :normalizedAlias', { normalizedAlias });
          if (findingFields.normalizedFindingNo) {
            where.orWhere('LOWER(duplicate.finding_no) = :normalizedFindingNo', {
              normalizedFindingNo: findingFields.normalizedFindingNo,
            });
          }
        }),
      )
      .getMany();

    if (duplicates.some((duplicate) => duplicate.normalizedValue === normalizedValue)) {
      throw new BadRequestException('Master value already exists for selected type');
    }
    if (duplicates.some((duplicate) => duplicate.normalizedAlias === normalizedAlias)) {
      throw new BadRequestException('Master alias already exists for selected type');
    }
    if (
      findingFields.normalizedFindingNo &&
      duplicates.some(
        (duplicate) => (duplicate.findingNo || '').toLowerCase() === findingFields.normalizedFindingNo,
      )
    ) {
      throw new BadRequestException('Finding number already exists');
    }

    master.value = value;
    master.normalizedValue = normalizedValue;
    master.aliasName = aliasName;
    master.normalizedAlias = normalizedAlias;
    master.scopeKey = jewelrySizeFields.scopeKey;
    master.jewelryGroupId = jewelrySizeFields.jewelryGroupId;
    master.jewelryGroup = jewelrySizeFields.jewelryGroup;
    master.description = description;
    master.findingNo = findingFields.findingNo;
    master.metalCaratage = findingFields.metalCaratage;
    master.priceIn = findingFields.priceIn;
    master.pricePerUnit = masterPricePerUnit;
    master.dimensions = findingFields.dimensions;
    master.weightPerUnit = findingFields.weightPerUnit;
    master.metalName = metalFields.metalName;
    master.metalColor = metalFields.metalColor;
    master.metalPurity = metalFields.metalPurity;
    master.purityPercentage = metalFields.purityPercentage;
    master.marketPricePerOunce = metalFields.marketPricePerOunce;
    master.marketPricePerGm = metalFields.marketPricePerGm;
    master.livePricePerGm = metalFields.livePricePerGm;
    master.defaultWastagePercent = metalFields.defaultWastagePercent;
    master.updatedBy = requester.id;

    const savedMaster = await this.designMasterRepo.save(master);

    if (savedMaster.masterType === DesignMasterType.METAL_NAME) {
      const affectedMetalCaratages = await this.syncMetalCaratageRatesForMetalName(
        savedMaster.value,
        requester.id,
      );
      await this.recalculateDesignsForDependencies({ metalCaratages: affectedMetalCaratages });
    } else if (savedMaster.masterType === DesignMasterType.METAL_CARATAGE) {
      await this.recalculateDesignsForDependencies({ metalCaratages: [savedMaster.value] });
    }

    return savedMaster;
  }

  async updateMasterStatus(id: string, isActive: boolean, requester: AuthUser): Promise<DesignMaster> {
    this.assertDesignWriteAccess(requester);
    const master = await this.designMasterRepo.findOne({ where: { id } });
    if (!master) {
      throw new NotFoundException('Master value not found');
    }

    master.isActive = isActive;
    master.updatedBy = requester.id;
    return this.designMasterRepo.save(master);
  }

  private async getDesignForWrite(id: string, requester: AuthUser): Promise<Design> {
    this.assertDesignWriteAccess(requester);
    const design = await this.designRepo.findOne({ where: { id } });
    if (!design) {
      throw new NotFoundException('Product design not found');
    }
    this.assertReadScope(design, requester);
    return design;
  }

  private async getDesignForRead(id: string, requester: AuthUser): Promise<Design> {
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
    inputCompanyId: string | undefined,
    inputBranchId: string | undefined,
    requester: AuthUser,
  ): Promise<ScopeResult> {
    let companyId = inputCompanyId?.trim() || null;
    let branchId = inputBranchId?.trim() || null;

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
    companyId?: string,
    branchId?: string,
  ): void {
    const normalizedCompanyId = companyId?.trim();
    const normalizedBranchId = branchId?.trim();

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
    return (
      requester.role === UserRole.SUPER_ADMIN ||
      requester.role === UserRole.COMPANY_ADMIN ||
      requester.role === UserRole.BRANCH_MANAGER
    );
  }

  private canCreateDesign(requester: AuthUser): boolean {
    if (this.isDesignWriteUser(requester)) {
      return true;
    }

    return this.hasDesignEntriesPermission(requester);
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
    version: string,
    companyId: string | null,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.designRepo.findOne({
      where: {
        designNo,
        version,
        companyId,
      },
    });

    if (existing && existing.id !== excludeId) {
      throw new BadRequestException('Design no and version already exist for this company');
    }
  }

  private async resolvePrimaryVersionFlag(
    baseDesignNo: string,
    version: string,
    scope: ScopeResult,
  ): Promise<boolean> {
    if (version !== 'V1') {
      return false;
    }

    const qb = this.designRepo
      .createQueryBuilder('design')
      .select('design.id')
      .where(
        '(design.designNo = :baseDesignNo OR design.designNo LIKE :versionedDesignNo)',
        { baseDesignNo, versionedDesignNo: `${baseDesignNo}-V%` },
      )
      .andWhere('design.isPrimary = :isPrimary', { isPrimary: true });

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

  private async resolveJewelryGroupPrefix(jewelryGroup: string): Promise<string> {
    const normalizedGroup = jewelryGroup.trim();
    if (!normalizedGroup) {
      return 'DSN';
    }

    let groupMaster = await this.designMasterRepo.findOne({
      where: { masterType: DesignMasterType.JEWELRY_GROUP, value: normalizedGroup },
    });
    if (!groupMaster) {
      groupMaster = await this.designMasterRepo.findOne({
        where: { masterType: DesignMasterType.JEWELRY_GROUP, aliasName: normalizedGroup },
      });
    }

    const alias = (groupMaster?.aliasName || '').trim();
    if (alias) {
      return this.buildDesignNoPrefix(alias);
    }

    return this.buildDesignNoPrefix(normalizedGroup);
  }

  private async generateNextDesignNo(prefix: string, companyId: string | null): Promise<string> {
    const regex = `^${prefix}-[0-9]+$`;
    const qb = this.designRepo
      .createQueryBuilder('design')
      .select(
        "MAX(CAST(SUBSTRING_INDEX(design.designNo, '-', -1) AS UNSIGNED))",
        'maxSequence',
      )
      .where('design.designNo REGEXP :regex', { regex });

    if (companyId) {
      qb.andWhere('design.companyId = :companyId', { companyId });
    } else {
      qb.andWhere('design.companyId IS NULL');
    }

    const result = await qb.getRawOne<{ maxSequence?: number | string | null }>();
    const maxSequence = Number(result?.maxSequence ?? 0);
    const nextSequence = Number.isFinite(maxSequence) ? maxSequence + 1 : 1;
    return `${prefix}-${String(nextSequence).padStart(4, '0')}`;
  }

  private async withDesignNoLock<T>(
    companyId: string | null,
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

      const metalCaratage = this.optionalText(row.metalCaratage) || this.optionalText(row.goldColour);
      if (!metalCaratage) {
        throw new BadRequestException(
          `Metal Caratage is required for Metal row ${rowNo}`,
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
          `Price Per Gram must be greater than 0 for Metal row ${rowNo}. Select Metal Caratage with a valid master Price/Gms or enter manually.`,
        );
      }
      const computedValue = totalWt * pricePerGm;
      const value =
        row.value !== undefined && row.value !== null ? this.toNumber(row.value) : computedValue;
      if (value < 0) {
        throw new BadRequestException(`Value cannot be negative for Metal row ${rowNo}`);
      }

      return {
        metalCaratage,
        goldColour: metalCaratage,
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
    const rows = await this.designMasterRepo.find({
      where: {
        masterType: DesignMasterType.METAL_CARATAGE,
        isActive: true,
      },
      order: {
        updatedAt: 'DESC',
      },
    });

    const map = new Map<string, number>();
    rows.forEach((row) => {
      const key = (row.value || '').trim().toLowerCase();
      if (!key || map.has(key)) {
        return;
      }
      const rate = this.toNumber(row.livePricePerGm);
      if (rate > 0) {
        map.set(key, rate);
      }
    });
    return map;
  }

  private async syncMetalCaratageRatesForMetalName(
    metalName: string,
    updatedBy?: string | null,
  ): Promise<string[]> {
    const normalizedMetalName = this.optionalText(metalName);
    if (!normalizedMetalName) {
      return [];
    }

    const metalMaster = await this.designMasterRepo.findOne({
      where: {
        masterType: DesignMasterType.METAL_NAME,
        value: normalizedMetalName,
      },
    });

    if (metalMaster?.marketPricePerGm === null || metalMaster?.marketPricePerGm === undefined) {
      return [];
    }

    const baseMarketPricePerGm = this.toNumber(metalMaster.marketPricePerGm);
    const metalCaratages = await this.designMasterRepo.find({
      where: {
        masterType: DesignMasterType.METAL_CARATAGE,
        metalName: normalizedMetalName,
      },
    });

    const changedMasters: DesignMaster[] = [];
    const affectedValues = new Set<string>();

    for (const metalCaratage of metalCaratages) {
      let purityPercentage =
        metalCaratage.purityPercentage !== null && metalCaratage.purityPercentage !== undefined
          ? this.toNumber(metalCaratage.purityPercentage)
          : null;

      if (purityPercentage === null && metalCaratage.metalPurity) {
        const purityMaster = await this.designMasterRepo.findOne({
          where: {
            masterType: DesignMasterType.METAL_PURITY,
            value: metalCaratage.metalPurity,
            metalName: normalizedMetalName,
          },
        });

        if (
          purityMaster?.purityPercentage !== null &&
          purityMaster?.purityPercentage !== undefined
        ) {
          purityPercentage = this.toNumber(purityMaster.purityPercentage);
          metalCaratage.purityPercentage = purityPercentage;
        }
      }

      if (purityPercentage === null) {
        continue;
      }

      const nextLivePricePerGm = this.roundTo2((baseMarketPricePerGm * purityPercentage) / 100);
      if (this.toNumber(metalCaratage.livePricePerGm) !== nextLivePricePerGm) {
        metalCaratage.livePricePerGm = nextLivePricePerGm;
        if (updatedBy) {
          metalCaratage.updatedBy = updatedBy;
        }
        changedMasters.push(metalCaratage);
      }

      if (metalCaratage.value) {
        affectedValues.add(metalCaratage.value);
      }
    }

    if (changedMasters.length > 0) {
      await this.designMasterRepo.save(changedMasters);
    }

    return Array.from(affectedValues);
  }

  private async recalculateDesignsForDependencies(input: {
    metalCaratages?: string[];
    packetIds?: string[];
  }): Promise<{ updatedDesigns: number; totalDesigns: number }> {
    const metalCaratageKeys = new Set(
      (input.metalCaratages || [])
        .map((value) => this.normalizeLookupKey(value))
        .filter(Boolean),
    );
    const packetIds = new Set(
      (input.packetIds || []).map((value) => (value || '').trim()).filter(Boolean),
    );

    if (metalCaratageKeys.size === 0 && packetIds.size === 0) {
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

    const designs = await this.designRepo.find({
      relations: ['metals', 'gemstones', 'labors', 'findings'],
    });

    let updatedDesigns = 0;

    for (const design of designs) {
      const metals = design.metals || [];
      const gemstones = design.gemstones || [];

      const touchesMetalDependency =
        metalCaratageKeys.size > 0 &&
        metals.some((row) => metalCaratageKeys.has(this.normalizeLookupKey(row.goldColour)));
      const touchesPacketDependency =
        packetIds.size > 0 &&
        gemstones.some((row) => row.packetId && packetIds.has((row.packetId || '').trim()));

      if (!touchesMetalDependency && !touchesPacketDependency) {
        continue;
      }

      let metalsChanged = false;
      let gemstonesChanged = false;

      for (const metal of metals) {
        const lookup = this.normalizeLookupKey(metal.goldColour);
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
        const packetId = (gemstone.packetId || '').trim();
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
          metalCaratage: row.goldColour || null,
          goldColour: row.goldColour || null,
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
          stone: row.stone || null,
          shape: row.shape || null,
          size: row.size || null,
          cut: row.cut || null,
          color: row.color || null,
          quality: row.quality || null,
          stoneType: row.stoneType || null,
          wtPerPcs: this.toNumber(row.wtPerPcs),
          pcs: Math.max(0, Math.trunc(this.toNumber(row.pcs))),
          wtInCts: this.toNumber(row.wtInCts),
          pricePerCt: this.toNumber(row.pricePerCt),
          amount: this.toNumber(row.amount),
        })),
        (design.labors || []).map((row) => ({
          laborHead: row.laborHead || null,
          laborPerUnit: this.toNumber(row.laborPerUnit),
          unitQty: this.toNumber(row.unitQty),
          laborValue: this.toNumber(row.laborValue),
        })),
        (design.findings || []).map((row) => ({
          findingHead: row.findingHead || null,
          pricePerUnit: this.toNumber(row.pricePerUnit),
          units: this.toNumber(row.units),
          totalWeight: this.toNumber(row.totalWeight),
          findingValue: this.toNumber(row.findingValue),
        })),
      );

      design.metalValue = summary.metalValue;
      design.gemValue = summary.gemValue;
      design.laborValue = summary.laborValue;
      design.findingValue = summary.findingValue;
      design.totalValue = summary.totalValue;
      design.grossWeight = summary.grossWeight;
      design.livePrice = summary.totalValue;
      design.goldColour = metals[0]?.goldColour || design.goldColour || null;
      design.stoneInfo = gemstones[0]?.stone || design.stoneInfo || null;

      await this.designRepo.save(design);
      updatedDesigns += 1;
    }

    return { updatedDesigns, totalDesigns: designs.length };
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
        packetId: this.optionalText(row.packetId),
        stone: this.optionalText(row.stone),
        shape: this.optionalText(row.shape),
        size: this.optionalText(row.size),
        cut: this.optionalText(row.cut),
        color: this.optionalText(row.color),
        quality: this.optionalText(row.quality),
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
    return rows.map((row) => {
      const laborPerUnit = this.toNumber(row.laborPerUnit);
      const unitQty = this.toNumber(row.unitQty);
      const laborValue = laborPerUnit * unitQty;

      return {
        laborHead: this.optionalText(row.laborHead),
        laborPerUnit,
        unitQty,
        laborValue,
      };
    });
  }

  private normalizeFindings(rows: DesignFindingDto[]): NormalizedFindingRow[] {
    return rows.map((row) => {
      const pricePerUnit = this.toNumber(row.pricePerUnit);
      const units = this.toNumber(row.units);
      const findingValue =
        row.findingValue !== undefined ? this.toNumber(row.findingValue) : pricePerUnit * units;

      return {
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
    findings: NormalizedFindingRow[],
  ): SummaryBreakdown {
    const metalValue = metals.reduce((sum, row) => sum + row.value, 0);
    const gemValue = gemstones.reduce((sum, row) => sum + row.amount, 0);
    const laborValue = labors.reduce((sum, row) => sum + row.laborValue, 0);
    const findingValue = findings.reduce((sum, row) => sum + row.findingValue, 0);
    const totalValue = metalValue + gemValue + laborValue + findingValue;
    const grossWeight = metals.reduce((sum, row) => sum + row.totalWt, 0);

    return { metalValue, gemValue, laborValue, findingValue, totalValue, grossWeight };
  }

  private async replaceMetalRows(designId: string, rows: NormalizedMetalRow[]): Promise<void> {
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

    await this.metalRepo.save(entities);
  }

  private async replaceGemstoneRows(designId: string, rows: NormalizedGemstoneRow[]): Promise<void> {
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

    await this.gemstoneRepo.save(entities);
  }

  private async replaceLaborRows(designId: string, rows: NormalizedLaborRow[]): Promise<void> {
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

    await this.laborRepo.save(entities);
  }

  private async replaceFindingRows(designId: string, rows: NormalizedFindingRow[]): Promise<void> {
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

    await this.findingRepo.save(entities);
  }

  private async replaceProcessStageRows(
    designId: string,
    rows: DesignProcessStageDto[],
  ): Promise<void> {
    await this.processStageRepo.delete({ designId });

    if (!rows || rows.length === 0) {
      return;
    }

    const entities = rows.map((row, index) =>
      this.processStageRepo.create({
        designId,
        processStage: row.processStage.trim(),
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
    designId: string,
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

  private async replaceVendorRows(designId: string, rows: DesignVendorDto[]): Promise<void> {
    await this.vendorRepo.delete({ designId });

    if (!rows || rows.length === 0) {
      return;
    }

    const entities = rows.map((row, index) =>
      this.vendorRepo.create({
        designId,
        supplierName: row.supplierName.trim(),
        stockType: this.optionalText(row.stockType),
        supplierStyleNo: this.optionalText(row.supplierStyleNo),
        sortOrder: index,
      }),
    );

    await this.vendorRepo.save(entities);
  }

  private async resolveUserNames(userIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const users = await this.userRepo.find({
      where: { id: In(uniqueIds) },
      select: ['id', 'firstName', 'lastName', 'email'],
    });
    const map = new Map<string, string>();
    users.forEach((user) => {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
      map.set(user.id, fullName || user.email || user.id);
    });
    return map;
  }

  private async setRelevantDesignLinks(
    design: Design,
    designIds: string[],
    requester: AuthUser,
  ): Promise<void> {
    const deduplicated = Array.from(
      new Set((designIds || []).filter((entry) => !!entry && entry !== design.id)),
    );

    await this.relevantRepo.delete({ designId: design.id });

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

    const links = deduplicated.map((relatedDesignId) =>
      this.relevantRepo.create({
        designId: design.id,
        relatedDesignId,
      }),
    );

    await this.relevantRepo.save(links);
  }

  private async addHistory(
    designId: string,
    actionType: string,
    remarks: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.historyRepo.save(
      this.historyRepo.create({
        designId,
        actionType,
        remarks,
        performedBy: userId || null,
        metadata: metadata || null,
      }),
    );
  }

  private async getExistingRows(designId: string): Promise<{
    metals: DesignMetal[];
    gemstones: DesignGemstone[];
    labors: DesignLabor[];
    findings: DesignFinding[];
  }> {
    const [metals, gemstones, labors, findings] = await Promise.all([
      this.metalRepo.find({ where: { designId }, order: { sortOrder: 'ASC' } }),
      this.gemstoneRepo.find({ where: { designId }, order: { sortOrder: 'ASC' } }),
      this.laborRepo.find({ where: { designId }, order: { sortOrder: 'ASC' } }),
      this.findingRepo.find({ where: { designId }, order: { sortOrder: 'ASC' } }),
    ]);

    return { metals, gemstones, labors, findings };
  }

  private toMetalDtos(rows: DesignMetal[]): DesignMetalDto[] {
    return rows.map((row) => ({
      goldColour: row.goldColour || undefined,
      metalCaratage: row.goldColour || undefined,
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
      stone: row.stone || undefined,
      shape: row.shape || undefined,
      size: row.size || undefined,
      cut: row.cut || undefined,
      color: row.color || undefined,
      quality: row.quality || undefined,
      stoneType: row.stoneType || undefined,
      wtPerPcs: this.toNumber(row.wtPerPcs),
      pcs: row.pcs,
      wtInCts: this.toNumber(row.wtInCts),
      pricePerCt: this.toNumber(row.pricePerCt),
      amount: this.toNumber(row.amount),
    }));
  }

  private toLaborDtos(rows: DesignLabor[]): DesignLaborDto[] {
    return rows.map((row) => ({
      laborHead: row.laborHead || undefined,
      laborPerUnit: this.toNumber(row.laborPerUnit),
      unitQty: this.toNumber(row.unitQty),
      laborValue: this.toNumber(row.laborValue),
    }));
  }

  private toFindingDtos(rows: DesignFinding[]): DesignFindingDto[] {
    return rows.map((row) => ({
      findingHead: row.findingHead || undefined,
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

  private applyVersionToDesignNo(designNo: string, version: string): string {
    const base = this.normalizeBaseDesignNo(designNo);
    const normalizedVersion = this.normalizeVersion(version);
    if (normalizedVersion === 'V1') {
      return base;
    }
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
      metalCaratage: this.getImportCell(row, 'Metal Caratage', 'metalCaratage'),
      goldColour: this.getImportCell(row, 'Gold Colour', 'goldColour'),
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
  ): Promise<{ companyId: string | null; branchId: string | null }> {
    const companyCode = String(row.companyCode || '').trim().toUpperCase();
    const branchCode = String(row.branchCode || '').trim().toUpperCase();

    let companyId: string | null = null;
    let branchId: string | null = null;

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
      goldColour: row.goldColour?.trim() || undefined,
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

  private requireMasterType(query: FindDesignMastersQueryDto): DesignMasterType {
    if (!query.type) {
      throw new BadRequestException('Master type is required for Excel import/export');
    }

    return query.type as unknown as DesignMasterType;
  }

  private getImportCell(row: Record<string, unknown>, ...keys: string[]): string {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) {
        return String(row[key]).trim();
      }
    }

    return '';
  }

  private normalizeMasterImportRow(row: Record<string, unknown>): MasterImportRow {
    return {
      value: this.getImportCell(row, 'Value', 'value'),
      aliasName: this.getImportCell(row, 'Alias Name', 'aliasName'),
      description: this.getImportCell(row, 'Description', 'description'),
      jewelryGroup: this.getImportCell(row, 'Category', 'category', 'Jewelry Group', 'jewelryGroup'),
      findingNo: this.getImportCell(row, 'Finding No', 'findingNo'),
      metalCaratage: this.getImportCell(row, 'Metal Caratage', 'metalCaratage'),
      priceIn: this.getImportCell(row, 'Price In', 'priceIn'),
      pricePerUnit: this.getImportCell(row, 'Price Per Unit', 'pricePerUnit'),
      dimensions: this.getImportCell(row, 'Dimensions', 'dimensions'),
      weightPerUnit: this.getImportCell(row, 'Weight Per Unit', 'weightPerUnit'),
      metalName: this.getImportCell(row, 'Metal Name', 'metalName'),
      metalColor: this.getImportCell(row, 'Metal Color', 'metalColor'),
      metalPurity: this.getImportCell(row, 'Metal Purity', 'metalPurity'),
      purityPercentage: this.getImportCell(row, 'Purity Percentage', 'purityPercentage'),
      marketPricePerOunce: this.getImportCell(row, 'Market Price Per Ounce', 'marketPricePerOunce'),
      marketPricePerGm: this.getImportCell(row, 'Market Price Per Gm', 'marketPricePerGm'),
      livePricePerGm: this.getImportCell(row, 'Live Price Per Gm', 'livePricePerGm'),
      defaultWastagePercent: this.getImportCell(row, 'Default Wastage Percent', 'defaultWastagePercent'),
      isActive: this.getImportCell(row, 'Status', 'status', 'isActive'),
    };
  }

  private normalizePacketImportRow(row: Record<string, unknown>): PacketImportRow {
    return {
      barcode: this.getImportCell(row, 'Barcode', 'barcode'),
      packetName: this.getImportCell(row, 'Packet Name', 'packetName'),
      stone: this.getImportCell(row, 'Stone', 'stone'),
      shape: this.getImportCell(row, 'Shape', 'shape'),
      cut: this.getImportCell(row, 'Cut', 'cut'),
      size: this.getImportCell(row, 'Size', 'size'),
      color: this.getImportCell(row, 'Color', 'color'),
      quality: this.getImportCell(row, 'Quality', 'quality'),
      priceIn: this.getImportCell(row, 'Price In', 'priceIn'),
      sellingPrice: this.getImportCell(row, 'Selling Price', 'sellingPrice'),
      weightPerPc: this.getImportCell(row, 'Weight Per Pc', 'weightPerPc'),
      pieces: this.getImportCell(row, 'Pieces', 'pieces'),
      weight: this.getImportCell(row, 'Weight', 'weight'),
      weightUnit: this.getImportCell(row, 'Weight Unit', 'weightUnit'),
      isActive: this.getImportCell(row, 'Status', 'status', 'isActive'),
    };
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

  private async buildMasterImportPayload(
    type: DesignMasterType,
    row: MasterImportRow,
    _line: number,
  ): Promise<UpdateDesignMasterDto> {
    const value = row.value?.trim();
    if (!value) {
      throw new BadRequestException('Value is required');
    }

    const payload: UpdateDesignMasterDto = {
      value,
      aliasName: row.aliasName?.trim() || value,
      description: row.description?.trim() || undefined,
    };

    if (type === DesignMasterType.JEWELRY_SIZE || type === DesignMasterType.COLLECTION) {
      const jewelryGroup = row.jewelryGroup?.trim();
      if (!jewelryGroup) {
        throw new BadRequestException('Category is required');
      }
      const jewelryGroupOption = await this.findMasterByValueOrAlias(
        DesignMasterType.JEWELRY_GROUP,
        jewelryGroup,
      );
      if (!jewelryGroupOption) {
        throw new BadRequestException(`Category "${jewelryGroup}" not found`);
      }
      payload.jewelryGroupId = jewelryGroupOption.id;
    }

    if (type === DesignMasterType.METAL_NAME) {
      payload.marketPricePerOunce =
        this.optionalNonNegativeNumber(row.marketPricePerOunce, 'marketPricePerOunce') ?? undefined;
      payload.marketPricePerGm =
        this.optionalNonNegativeNumber(row.marketPricePerGm, 'marketPricePerGm') ?? undefined;
      payload.livePricePerGm =
        this.optionalNonNegativeNumber(row.livePricePerGm, 'livePricePerGm') ?? undefined;
    } else if (type === DesignMasterType.METAL_COLOR) {
      payload.metalName = row.metalName?.trim() || undefined;
      if (!payload.metalName) {
        throw new BadRequestException('Metal Name is required');
      }
    } else if (type === DesignMasterType.METAL_PURITY) {
      payload.metalName = row.metalName?.trim() || undefined;
      if (!payload.metalName) {
        throw new BadRequestException('Metal Name is required');
      }
      payload.purityPercentage =
        this.optionalNonNegativeNumber(row.purityPercentage, 'purityPercentage') ?? undefined;
      if (payload.purityPercentage === undefined) {
        throw new BadRequestException('Purity Percentage is required');
      }
    } else if (type === DesignMasterType.METAL_CARATAGE) {
      payload.metalName = row.metalName?.trim() || undefined;
      payload.metalColor = row.metalColor?.trim() || undefined;
      payload.metalPurity = row.metalPurity?.trim() || undefined;
      if (!payload.metalName || !payload.metalColor || !payload.metalPurity) {
        throw new BadRequestException('Metal Name, Metal Color and Metal Purity are required');
      }
      payload.purityPercentage =
        this.optionalNonNegativeNumber(row.purityPercentage, 'purityPercentage') ?? undefined;
      payload.livePricePerGm =
        this.optionalNonNegativeNumber(row.livePricePerGm, 'livePricePerGm') ?? undefined;
      payload.defaultWastagePercent =
        this.optionalNonNegativeNumber(row.defaultWastagePercent, 'defaultWastagePercent') ??
        undefined;
      if (!row.aliasName?.trim()) {
        payload.aliasName = value;
      }
    } else if (type === DesignMasterType.GOLD_COLOUR) {
      payload.pricePerUnit =
        this.optionalNonNegativeNumber(row.pricePerUnit, 'pricePerUnit') ?? undefined;
    } else if (type === DesignMasterType.FINDING_HEAD) {
      payload.findingNo = row.findingNo?.trim() || undefined;
      payload.metalCaratage = row.metalCaratage?.trim() || undefined;
      payload.priceIn = (row.priceIn?.trim().toUpperCase() as FindingPriceIn) || undefined;
      payload.pricePerUnit =
        this.optionalNonNegativeNumber(row.pricePerUnit, 'pricePerUnit') ?? undefined;
      payload.dimensions = row.dimensions?.trim() || undefined;
      payload.weightPerUnit =
        this.optionalNonNegativeNumber(row.weightPerUnit, 'weightPerUnit') ?? undefined;
    }

    return payload;
  }

  private async findExistingMasterForImport(
    type: DesignMasterType,
    payload: UpdateDesignMasterDto,
  ): Promise<DesignMaster | null> {
    let scopeKey = '';
    if (type === DesignMasterType.JEWELRY_SIZE || type === DesignMasterType.COLLECTION) {
      const jewelrySizeFields = await this.normalizeCategoryScopedMasterFields(
        type,
        { jewelryGroupId: payload.jewelryGroupId },
        undefined,
      );
      scopeKey = jewelrySizeFields.scopeKey;
    }

    return this.designMasterRepo
      .createQueryBuilder('master')
      .where('master.masterType = :masterType', { masterType: type })
      .andWhere('master.scopeKey = :scopeKey', { scopeKey })
      .andWhere('master.normalizedValue = :normalizedValue', {
        normalizedValue: this.normalizeMasterValue(payload.value).toLowerCase(),
      })
      .getOne();
  }

  private buildMasterTemplateRow(type: DesignMasterType): Record<string, unknown> {
    const row: Record<string, unknown> = {
      Value: 'Sample Value',
      'Alias Name': 'SAMPLE',
      Description: 'Optional description',
      Category: '',
      'Finding No': '',
      'Metal Caratage': '',
      'Price In': '',
      'Price Per Unit': '',
      Dimensions: '',
      'Weight Per Unit': '',
      'Metal Name': '',
      'Metal Color': '',
      'Metal Purity': '',
      'Purity Percentage': '',
      'Market Price Per Ounce': '',
      'Market Price Per Gm': '',
      'Live Price Per Gm': '',
      'Default Wastage Percent': '',
      Status: 'ACTIVE',
    };

    switch (type) {
      case DesignMasterType.JEWELRY_SIZE:
        row.Value = 'US 6';
        row['Alias Name'] = 'US 6';
        row.Category = 'Ring';
        break;
      case DesignMasterType.COLLECTION:
        row.Value = 'Eternity Bands';
        row['Alias Name'] = 'ETB';
        row.Category = 'Ring';
        break;
      case DesignMasterType.METAL_NAME:
        row.Value = 'Gold';
        row['Alias Name'] = 'G';
        row['Market Price Per Ounce'] = 5200;
        row['Market Price Per Gm'] = 167.18;
        row['Live Price Per Gm'] = 170;
        break;
      case DesignMasterType.METAL_COLOR:
        row.Value = 'Rose';
        row['Alias Name'] = 'RG';
        row['Metal Name'] = 'Gold';
        break;
      case DesignMasterType.METAL_PURITY:
        row.Value = '18';
        row['Alias Name'] = '18';
        row['Metal Name'] = 'Gold';
        row['Purity Percentage'] = 75;
        break;
      case DesignMasterType.METAL_CARATAGE:
        row.Value = '18-Rose-Gold';
        row['Alias Name'] = '18-Rose-Gold';
        row['Metal Name'] = 'Gold';
        row['Metal Color'] = 'Rose';
        row['Metal Purity'] = '18';
        row['Purity Percentage'] = 75;
        row['Live Price Per Gm'] = 125.39;
        row['Default Wastage Percent'] = 10;
        break;
      case DesignMasterType.GOLD_COLOUR:
        row.Value = 'Rose';
        row['Alias Name'] = 'Rose';
        row['Price Per Unit'] = 10;
        break;
      case DesignMasterType.FINDING_HEAD:
        row.Value = 'Hook';
        row['Alias Name'] = 'HK';
        row['Finding No'] = 'F-001';
        row['Metal Caratage'] = '18-Rose-Gold';
        row['Price In'] = 'PIECES';
        row['Price Per Unit'] = 10;
        row['Dimensions'] = '10x2';
        row['Weight Per Unit'] = 0.2;
        break;
      default:
        break;
    }

    return row;
  }

  private async buildMasterTemplateReferenceRows(
    type: DesignMasterType,
  ): Promise<Array<Record<string, string>>> {
    const rows: Array<Record<string, string>> = [
      { Field: 'Status', AllowedValues: 'ACTIVE, INACTIVE', Notes: 'Optional, defaults to ACTIVE' },
    ];

    if (type === DesignMasterType.JEWELRY_SIZE || type === DesignMasterType.COLLECTION) {
      const jewelryGroups = await this.designMasterRepo.find({
        where: { masterType: DesignMasterType.JEWELRY_GROUP, isActive: true },
        order: { value: 'ASC' },
      });
      rows.push({
        Field: 'Category',
        AllowedValues: jewelryGroups.map((item) => item.value).join(', '),
        Notes: 'Required. Existing Category value or alias',
      });
    }

    if (
      type === DesignMasterType.METAL_COLOR ||
      type === DesignMasterType.METAL_PURITY ||
      type === DesignMasterType.METAL_CARATAGE
    ) {
      const metalNames = await this.designMasterRepo.find({
        where: { masterType: DesignMasterType.METAL_NAME, isActive: true },
        order: { value: 'ASC' },
      });
      rows.push({
        Field: 'Metal Name',
        AllowedValues: metalNames.map((item) => item.value).join(', '),
        Notes: 'Required for this master type',
      });
    }

    if (type === DesignMasterType.METAL_CARATAGE) {
      const metalColors = await this.designMasterRepo.find({
        where: { masterType: DesignMasterType.METAL_COLOR, isActive: true },
        order: { value: 'ASC' },
      });
      const metalPurities = await this.designMasterRepo.find({
        where: { masterType: DesignMasterType.METAL_PURITY, isActive: true },
        order: { value: 'ASC' },
      });
      rows.push(
        {
          Field: 'Metal Color',
          AllowedValues: metalColors.map((item) => item.value).join(', '),
          Notes: 'Required for Metal Caratage',
        },
        {
          Field: 'Metal Purity',
          AllowedValues: metalPurities.map((item) => item.value).join(', '),
          Notes: 'Required for Metal Caratage',
        },
      );
    }

    if (type === DesignMasterType.FINDING_HEAD) {
      rows.push({
        Field: 'Price In',
        AllowedValues: Object.values(FindingPriceIn).join(', '),
        Notes: 'Required for Finding Head',
      });
    }

    return rows;
  }

  private buildPacketTemplateLookupRows(masters: any): Array<Record<string, string>> {
    const rows: Array<Record<string, string>> = [];
    const addRows = (field: string, values: Array<{ value: string }>) => {
      values.forEach((item) => rows.push({ Field: field, Value: item.value }));
    };

    addRows('Stone', masters.packetStones || []);
    addRows('Shape', masters.packetShapes || []);
    addRows('Size', masters.packetSizes || []);
    addRows('Cut', masters.packetCuts || []);
    addRows('Color', masters.packetColors || []);
    addRows('Quality', masters.packetQualities || []);

    return rows;
  }

  private toMasterExportRow(master: DesignMaster, _type: DesignMasterType): Record<string, unknown> {
    return {
      Value: master.value,
      'Alias Name': master.aliasName || '',
      Description: master.description || '',
      Category: master.jewelryGroup || '',
      'Finding No': master.findingNo || '',
      'Metal Caratage': master.metalCaratage || '',
      'Price In': master.priceIn || '',
      'Price Per Unit':
        master.pricePerUnit !== null && master.pricePerUnit !== undefined
          ? this.toNumber(master.pricePerUnit)
          : '',
      Dimensions: master.dimensions || '',
      'Weight Per Unit':
        master.weightPerUnit !== null && master.weightPerUnit !== undefined
          ? this.toNumber(master.weightPerUnit)
          : '',
      'Metal Name': master.metalName || '',
      'Metal Color': master.metalColor || '',
      'Metal Purity': master.metalPurity || '',
      'Purity Percentage':
        master.purityPercentage !== null && master.purityPercentage !== undefined
          ? this.toNumber(master.purityPercentage)
          : '',
      'Market Price Per Ounce':
        master.marketPricePerOunce !== null && master.marketPricePerOunce !== undefined
          ? this.toNumber(master.marketPricePerOunce)
          : '',
      'Market Price Per Gm':
        master.marketPricePerGm !== null && master.marketPricePerGm !== undefined
          ? this.toNumber(master.marketPricePerGm)
          : '',
      'Live Price Per Gm':
        master.livePricePerGm !== null && master.livePricePerGm !== undefined
          ? this.toNumber(master.livePricePerGm)
          : '',
      'Default Wastage Percent':
        master.defaultWastagePercent !== null && master.defaultWastagePercent !== undefined
          ? this.toNumber(master.defaultWastagePercent)
          : '',
      Status: master.isActive ? 'ACTIVE' : 'INACTIVE',
      'Created At': master.createdAt,
      'Updated At': master.updatedAt,
    };
  }

  private async findMasterByValueOrAlias(
    type: DesignMasterType,
    valueOrAlias: string,
  ): Promise<DesignMaster | null> {
    const normalized = valueOrAlias.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    return this.designMasterRepo
      .createQueryBuilder('master')
      .where('master.masterType = :masterType', { masterType: type })
      .andWhere('master.isActive = :isActive', { isActive: true })
      .andWhere(
        new Brackets((where) => {
          where
            .where('master.normalizedValue = :normalized', { normalized })
            .orWhere('master.normalizedAlias = :normalized', { normalized });
        }),
      )
      .getOne();
  }

  private normalizeMasterValue(value?: string): string {
    const normalized = value?.trim() || '';
    if (!normalized) {
      throw new BadRequestException('value is required');
    }
    return normalized;
  }

  private normalizeMasterAlias(aliasName?: string | null, fallbackValue?: string): string {
    const aliasValue = aliasName?.trim() || fallbackValue?.trim() || '';
    if (!aliasValue) {
      throw new BadRequestException('aliasName is required');
    }
    return aliasValue;
  }

  private emptyFindingMasterFields(): {
    findingNo: string | null;
    normalizedFindingNo: string | null;
    metalCaratage: string | null;
    priceIn: FindingPriceIn | null;
    pricePerUnit: number | null;
    dimensions: string | null;
    weightPerUnit: number | null;
  } {
    return {
      findingNo: null,
      normalizedFindingNo: null,
      metalCaratage: null,
      priceIn: null,
      pricePerUnit: null,
      dimensions: null,
      weightPerUnit: null,
    };
  }

  private normalizeFindingMasterFields(input: {
    findingNo?: string | null;
    metalCaratage?: string | null;
    priceIn?: FindingPriceIn | null;
    pricePerUnit?: number | null;
    dimensions?: string | null;
    weightPerUnit?: number | null;
  }): {
    findingNo: string;
    normalizedFindingNo: string;
    metalCaratage: string;
    priceIn: FindingPriceIn;
    pricePerUnit: number;
    dimensions: string | null;
    weightPerUnit: number;
  } {
    const findingNo = this.requiredText(input.findingNo, 'findingNo');
    const metalCaratage = this.requiredText(input.metalCaratage, 'metalCaratage');
    const priceIn = this.normalizeFindingPriceIn(input.priceIn);
    const pricePerUnit = this.requiredNumber(input.pricePerUnit, 'pricePerUnit');
    const weightPerUnit = this.requiredNumber(input.weightPerUnit, 'weightPerUnit');
    const dimensions = this.optionalText(input.dimensions);

    return {
      findingNo,
      normalizedFindingNo: findingNo.toLowerCase(),
      metalCaratage,
      priceIn,
      pricePerUnit,
      dimensions,
      weightPerUnit,
    };
  }

  private normalizeFindingPriceIn(value?: FindingPriceIn | null): FindingPriceIn {
    if (
      value === FindingPriceIn.PIECES ||
      value === FindingPriceIn.GRAM ||
      value === FindingPriceIn.PAIR ||
      value === FindingPriceIn.INCHES
    ) {
      return value;
    }
    throw new BadRequestException('priceIn is required');
  }

  private emptyCategoryScopedMasterFields(): {
    scopeKey: string;
    jewelryGroupId: string | null;
    jewelryGroup: string | null;
  } {
    return {
      scopeKey: '',
      jewelryGroupId: null,
      jewelryGroup: null,
    };
  }

  private async normalizeCategoryScopedMasterFields(
    masterType: DesignMasterType,
    input: {
      jewelryGroupId?: string | null;
    },
    existing?: DesignMaster,
  ): Promise<{
    scopeKey: string;
    jewelryGroupId: string | null;
    jewelryGroup: string | null;
  }> {
    if (masterType !== DesignMasterType.JEWELRY_SIZE && masterType !== DesignMasterType.COLLECTION) {
      return this.emptyCategoryScopedMasterFields();
    }

    const jewelryGroupId = this.requiredText(
      input.jewelryGroupId !== undefined ? input.jewelryGroupId : existing?.jewelryGroupId,
      'jewelryGroupId',
    );

    const jewelryGroupMaster = await this.designMasterRepo.findOne({
      where: {
        id: jewelryGroupId,
        masterType: DesignMasterType.JEWELRY_GROUP,
        isActive: true,
      },
    });
    if (!jewelryGroupMaster) {
      throw new BadRequestException('Selected category was not found');
    }

    return {
      scopeKey: jewelryGroupMaster.id,
      jewelryGroupId: jewelryGroupMaster.id,
      jewelryGroup: jewelryGroupMaster.value,
    };
  }

  private emptyMetalMasterFields(): {
    metalName: string | null;
    metalColor: string | null;
    metalPurity: string | null;
    purityPercentage: number | null;
    marketPricePerOunce: number | null;
    marketPricePerGm: number | null;
    livePricePerGm: number | null;
    defaultWastagePercent: number | null;
  } {
    return {
      metalName: null,
      metalColor: null,
      metalPurity: null,
      purityPercentage: null,
      marketPricePerOunce: null,
      marketPricePerGm: null,
      livePricePerGm: null,
      defaultWastagePercent: null,
    };
  }

  private async normalizeMetalMasterFields(
    masterType: DesignMasterType,
    input: {
      metalName?: string | null;
      metalColor?: string | null;
      metalPurity?: string | null;
      purityPercentage?: number | null;
      marketPricePerOunce?: number | null;
      marketPricePerGm?: number | null;
      livePricePerGm?: number | null;
      defaultWastagePercent?: number | null;
    },
    existing?: DesignMaster,
  ): Promise<{
    metalName: string | null;
    metalColor: string | null;
    metalPurity: string | null;
    purityPercentage: number | null;
    marketPricePerOunce: number | null;
    marketPricePerGm: number | null;
    livePricePerGm: number | null;
    defaultWastagePercent: number | null;
  }> {
    if (
      masterType !== DesignMasterType.METAL_NAME &&
      masterType !== DesignMasterType.METAL_COLOR &&
      masterType !== DesignMasterType.METAL_PURITY &&
      masterType !== DesignMasterType.METAL_CARATAGE
    ) {
      return this.emptyMetalMasterFields();
    }

    const empty = this.emptyMetalMasterFields();

    if (masterType === DesignMasterType.METAL_NAME) {
      const marketPricePerOunce = this.optionalNonNegativeNumber(
        input.marketPricePerOunce !== undefined ? input.marketPricePerOunce : existing?.marketPricePerOunce,
        'marketPricePerOunce',
      );
      let marketPricePerGm = this.optionalNonNegativeNumber(
        input.marketPricePerGm !== undefined ? input.marketPricePerGm : existing?.marketPricePerGm,
        'marketPricePerGm',
      );
      if (marketPricePerGm === null && marketPricePerOunce !== null) {
        marketPricePerGm = this.roundTo2(marketPricePerOunce / 31.1035);
      }
      if (marketPricePerGm === null) {
        throw new BadRequestException('marketPricePerGm is required for METAL_NAME');
      }
      let livePricePerGm = this.optionalNonNegativeNumber(
        input.livePricePerGm !== undefined ? input.livePricePerGm : existing?.livePricePerGm,
        'livePricePerGm',
      );
      if (livePricePerGm === null) {
        livePricePerGm = marketPricePerGm;
      }
      return {
        ...empty,
        marketPricePerOunce,
        marketPricePerGm,
        livePricePerGm,
      };
    }

    if (masterType === DesignMasterType.METAL_COLOR) {
      const metalName = this.requiredText(
        input.metalName !== undefined ? input.metalName : existing?.metalName,
        'metalName',
      );
      return {
        ...empty,
        metalName,
      };
    }

    if (masterType === DesignMasterType.METAL_PURITY) {
      const metalName = this.requiredText(
        input.metalName !== undefined ? input.metalName : existing?.metalName,
        'metalName',
      );
      const purityPercentage = this.requiredNumber(
        input.purityPercentage !== undefined ? input.purityPercentage : existing?.purityPercentage,
        'purityPercentage',
      );
      return {
        ...empty,
        metalName,
        purityPercentage,
      };
    }

    const metalName = this.requiredText(
      input.metalName !== undefined ? input.metalName : existing?.metalName,
      'metalName',
    );
    const metalColor = this.requiredText(
      input.metalColor !== undefined ? input.metalColor : existing?.metalColor,
      'metalColor',
    );
    const metalPurity = this.requiredText(
      input.metalPurity !== undefined ? input.metalPurity : existing?.metalPurity,
      'metalPurity',
    );

    let purityPercentage = this.optionalNonNegativeNumber(
      input.purityPercentage !== undefined ? input.purityPercentage : existing?.purityPercentage,
      'purityPercentage',
    );
    if (purityPercentage === null) {
      const purityMaster = await this.designMasterRepo.findOne({
        where: {
          masterType: DesignMasterType.METAL_PURITY,
          value: metalPurity,
          metalName,
          isActive: true,
        },
      });
      if (purityMaster?.purityPercentage !== null && purityMaster?.purityPercentage !== undefined) {
        purityPercentage = this.toNumber(purityMaster.purityPercentage);
      }
    }
    if (purityPercentage === null) {
      throw new BadRequestException('purityPercentage is required for METAL_CARATAGE');
    }

    const defaultWastagePercent =
      this.optionalNonNegativeNumber(
        input.defaultWastagePercent !== undefined
          ? input.defaultWastagePercent
          : existing?.defaultWastagePercent,
        'defaultWastagePercent',
      ) ?? 0;

    const metalMaster = await this.designMasterRepo.findOne({
      where: {
        masterType: DesignMasterType.METAL_NAME,
        value: metalName,
        isActive: true,
      },
    });
    const baseMarketPricePerGm =
      metalMaster?.marketPricePerGm !== null && metalMaster?.marketPricePerGm !== undefined
        ? this.toNumber(metalMaster.marketPricePerGm)
        : null;
    if (baseMarketPricePerGm === null) {
      throw new BadRequestException(
        'Unable to resolve Market Price/Gms from selected METAL_NAME for METAL_CARATAGE',
      );
    }

    const computedLivePricePerGm = this.roundTo2((baseMarketPricePerGm * purityPercentage) / 100);
    const manualLivePricePerGm = this.optionalNonNegativeNumber(
      input.livePricePerGm !== undefined ? input.livePricePerGm : null,
      'livePricePerGm',
    );
    const finalLivePricePerGm = this.roundTo2(
      manualLivePricePerGm !== null ? manualLivePricePerGm : computedLivePricePerGm,
    );
    return {
      ...empty,
      metalName,
      metalColor,
      metalPurity,
      purityPercentage,
      livePricePerGm: finalLivePricePerGm,
      defaultWastagePercent,
    };
  }

  private requiredText(value: string | null | undefined, field: string): string {
    const normalized = this.optionalText(value);
    if (!normalized) {
      throw new BadRequestException(`${field} is required`);
    }
    return normalized;
  }

  private requiredNumber(value: number | null | undefined, field: string): number {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      throw new BadRequestException(`${field} is required`);
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException(`${field} must be a valid number`);
    }
    return parsed;
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

  private requiredPositiveNumber(value: number | string | null | undefined, field: string): number {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      throw new BadRequestException(`${field} is required`);
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(`${field} must be greater than 0`);
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
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(client, command, { expiresIn });
    this.setCachedSignedUrl(bucket, key, url, expiresIn);
    return url;
  }

  private isGalleryMimeType(mimeType?: string | null): boolean {
    if (typeof mimeType !== 'string') return false;
    const normalized = mimeType.trim().toLowerCase();
    return normalized.startsWith('image/') || normalized.startsWith('video/');
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
    uploadedBy?: string | null;
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

  private optionalText(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();
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

  private resolveMetalRate(
    globalRateMaps: GlobalRateMaps | undefined,
    metalCaratage: string | null,
  ): number | undefined {
    if (!globalRateMaps || !metalCaratage) {
      return undefined;
    }

    const lookupKey = this.normalizeLookupKey(metalCaratage);
    if (!lookupKey) {
      return undefined;
    }

    return globalRateMaps.metalRates.get(lookupKey);
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

  private normalizePacketName(value?: string): string {
    const normalized = value?.trim() || '';
    if (!normalized) {
      throw new BadRequestException('packetName is required');
    }
    return normalized;
  }

  private normalizeStonePacketBarcode(value?: string | null): string | null {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return null;
    }
    if (!/^\d+$/.test(normalized)) {
      throw new BadRequestException('Packet barcode must contain digits only');
    }
    return normalized;
  }

  private async generateStonePacketBarcode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = `${Date.now()}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`;
      const existing = await this.packetRepo.findOne({ where: { barcode: candidate } });
      if (!existing) {
        return candidate;
      }
    }
    throw new BadRequestException('Unable to generate a unique packet barcode');
  }

  private async resolveStonePacketBarcode(value?: string | null, excludePacketId?: string): Promise<string> {
    const normalized = this.normalizeStonePacketBarcode(value);
    if (!normalized) {
      return this.generateStonePacketBarcode();
    }

    const existing = await this.packetRepo.findOne({ where: { barcode: normalized } });
    if (existing && existing.id !== excludePacketId) {
      throw new BadRequestException('Packet barcode already exists');
    }
    return normalized;
  }

  private buildDefaultDesignName(jewelryGroup: string | null | undefined, designNo: string): string {
    const normalizedDesignNo = this.normalizeDesignNo(designNo);
    const normalizedGroup = this.optionalText(jewelryGroup);
    return normalizedDesignNo || normalizedGroup || 'Design';
  }

  private normalizePacketWeightUnit(value?: string): StoneWeightUnit {
    const normalized = (value || '').trim().toUpperCase();
    if (normalized === StoneWeightUnit.GMS || normalized === 'GRAM') {
      return StoneWeightUnit.GMS;
    }
    return StoneWeightUnit.CTS;
  }

  private normalizePacketPriceIn(value?: string): StonePacketPriceIn {
    const normalized = (value || '').trim().toUpperCase();
    if (normalized === StonePacketPriceIn.PCS) {
      return StonePacketPriceIn.PCS;
    }
    return StonePacketPriceIn.WT;
  }

  private resolvePacketPieces(value: number | string | null | undefined, fallback = 1): number {
    if (value === undefined || value === null || value === '') {
      return Math.max(1, this.toInt(fallback));
    }
    return Math.max(1, this.toInt(value));
  }

  private resolvePacketWeightPerPc(input: {
    weightPerPc?: number | string | null;
    weight?: number | string | null;
    pieces: number;
    fallbackWeightPerPc?: number | string | null;
    fallbackWeight?: number | string | null;
  }): number {
    const explicitWeightPerPc = this.optionalNonNegativeNumber(input.weightPerPc, 'weightPerPc');
    if (explicitWeightPerPc !== null) {
      if (explicitWeightPerPc <= 0) {
        throw new BadRequestException('weightPerPc must be greater than 0');
      }
      return explicitWeightPerPc;
    }

    const explicitWeight = this.optionalNonNegativeNumber(input.weight, 'weight');
    if (explicitWeight !== null) {
      if (explicitWeight <= 0) {
        throw new BadRequestException('weight must be greater than 0');
      }
      return explicitWeight / Math.max(1, input.pieces);
    }

    const fallbackPerPc = this.toNumber(input.fallbackWeightPerPc);
    if (fallbackPerPc > 0) {
      return fallbackPerPc;
    }

    const fallbackWeight = this.toNumber(input.fallbackWeight);
    if (fallbackWeight > 0) {
      return fallbackWeight / Math.max(1, input.pieces);
    }

    throw new BadRequestException('weightPerPc must be greater than 0');
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
