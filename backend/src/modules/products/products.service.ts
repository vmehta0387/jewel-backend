import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import {
  CreateStonePacketDto,
  CreateProductDto,
  CreateDesignMasterDto,
  DesignFindingDto,
  DesignGemstoneDto,
  DesignLaborDto,
  DesignMetalDto,
  FindDesignMastersQueryDto,
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
import { StonePacket, StoneWeightUnit } from './entities/stone-packet.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { DesignMaster, DesignMasterType, FindingPriceIn } from './entities/design-master.entity';
import { GlobalBasePrice, GlobalBasePriceCategory } from '../pricing/entities/global-base-price.entity';

interface ScopeResult {
  companyId: string | null;
  branchId: string | null;
}

interface NormalizedMetalRow {
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

@Injectable()
export class ProductsService {
  constructor(
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
  ) {}

  async create(dto: CreateProductDto, requester: AuthUser): Promise<any> {
    this.assertDesignCreateAccess(requester);
    const scope = await this.resolveScope(dto.companyId, dto.branchId, requester);
    const designNo = this.normalizeDesignNo(dto.designNo);
    const version = this.normalizeVersion(dto.version);

    await this.assertUniqueDesign(designNo, version, scope.companyId, undefined);

    const globalRateMaps = await this.getGlobalRateMaps();
    const normalizedMetals = this.normalizeMetals(dto.metals || [], globalRateMaps);
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
      version,
      companyId: scope.companyId,
      branchId: scope.branchId,
      jewelryGroup: dto.jewelryGroup.trim(),
      collection: this.optionalText(dto.collection),
      jewelrySize: this.optionalText(dto.jewelrySize),
      stage: this.optionalText(dto.stage),
      diamondSpread: this.optionalText(dto.diamondSpread),
      diamondType: this.optionalText(dto.diamondType),
      designStatus: this.optionalText(dto.designStatus),
      goldColour: normalizedMetals[0]?.goldColour || null,
      stoneInfo: normalizedGemstones[0]?.stone || null,
      tags: this.normalizeTags(dto.tags),
      drawerLocation: this.optionalText(dto.drawerLocation),
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
      imageUrls: dto.imageUrls || [],
      isActive: dto.isActive ?? true,
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
            .orWhere('design.version LIKE :search', { search })
            .orWhere('design.jewelryGroup LIKE :search', { search })
            .orWhere('design.collection LIKE :search', { search })
            .orWhere('design.jewelrySize LIKE :search', { search })
            .orWhere('design.stage LIKE :search', { search })
            .orWhere('design.diamondSpread LIKE :search', { search })
            .orWhere('design.diamondType LIKE :search', { search })
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

    return {
      data,
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

    return {
      ...design,
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

    const designNo = this.normalizeDesignNo(dto.designNo || design.designNo);
    const version = this.normalizeVersion(dto.version || design.version);

    await this.assertUniqueDesign(designNo, version, scope.companyId, id);

    const existingRows = await this.getExistingRows(id);
    const globalRateMaps = await this.getGlobalRateMaps();
    const normalizedMetals = this.normalizeMetals(
      dto.metals !== undefined ? dto.metals : this.toMetalDtos(existingRows.metals),
      globalRateMaps,
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
    if (dto.designStatus !== undefined) design.designStatus = this.optionalText(dto.designStatus);
    design.goldColour = normalizedMetals[0]?.goldColour || null;
    design.stoneInfo = normalizedGemstones[0]?.stone || null;
    if (dto.tags !== undefined) design.tags = this.normalizeTags(dto.tags);
    if (dto.drawerLocation !== undefined) design.drawerLocation = this.optionalText(dto.drawerLocation);
    if (dto.designDescription !== undefined) {
      design.designDescription = this.optionalText(dto.designDescription);
    }
    if (dto.remarks !== undefined) design.remarks = this.optionalText(dto.remarks);
    if (dto.imageUrls !== undefined) design.imageUrls = dto.imageUrls || [];
    if (dto.stlFileUrl !== undefined) design.stlFileUrl = this.optionalText(dto.stlFileUrl);
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

  async updateStatus(id: string, isActive: boolean, requester: AuthUser): Promise<any> {
    this.assertDesignWriteAccess(requester);
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
    await this.designRepo.remove(design);
    return { deleted: true };
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

  async uploadGalleryFiles(
    files: Array<{ originalname?: string; mimetype?: string; buffer?: Buffer }>,
    request: any,
  ): Promise<{ files: Array<{ fileName: string; url: string }> }> {
    const requester: AuthUser | undefined = request?.user;
    if (requester) {
      this.assertDesignCreateAccess(requester);
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image file is required.');
    }

    const uploadDir = join(process.cwd(), 'uploads', 'design-gallery');
    await mkdir(uploadDir, { recursive: true });

    const uploaded: Array<{ fileName: string; url: string }> = [];

    for (const file of files) {
      if (!file?.buffer || !file.originalname) continue;

      if (!this.isImageMimeType(file.mimetype)) {
        throw new BadRequestException(
          `Unsupported file type: ${file.originalname}. Only image files are allowed.`,
        );
      }

      const extension = this.resolveImageExtension(file.originalname, file.mimetype);
      const fileName = `${Date.now()}-${randomUUID()}${extension}`;
      const outputPath = join(uploadDir, fileName);

      await writeFile(outputPath, file.buffer);

      uploaded.push({
        fileName,
        url: this.buildPublicAssetUrl(request, `/uploads/design-gallery/${fileName}`),
      });
    }

    if (uploaded.length === 0) {
      throw new BadRequestException('No valid image files uploaded.');
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

  async createPacket(dto: CreateStonePacketDto, requester: AuthUser): Promise<StonePacket> {
    this.assertDesignWriteAccess(requester);
    const packetName = this.normalizePacketName(dto.packetName);
    const existing = await this.packetRepo.findOne({ where: { packetName } });
    if (existing) {
      if (!existing.isActive) {
        existing.stockType = this.optionalText(dto.stockType) || existing.stockType || 'COMPLETED';
        existing.stone = this.optionalText(dto.stone);
        existing.shape = this.optionalText(dto.shape);
        existing.size = this.optionalText(dto.size);
        existing.cut = this.optionalText(dto.cut);
        existing.color = this.optionalText(dto.color);
        existing.quality = this.optionalText(dto.quality);
        existing.pieces = this.toInt(dto.pieces);
        existing.weight = this.toNumber(dto.weight);
        existing.weightUnit = this.normalizePacketWeightUnit(dto.weightUnit);
        existing.isActive = true;
        return this.packetRepo.save(existing);
      }
      throw new BadRequestException('Packet name already exists');
    }

    const packet = this.packetRepo.create({
      packetName,
      stockType: this.optionalText(dto.stockType) || 'COMPLETED',
      stone: this.optionalText(dto.stone),
      shape: this.optionalText(dto.shape),
      size: this.optionalText(dto.size),
      cut: this.optionalText(dto.cut),
      color: this.optionalText(dto.color),
      quality: this.optionalText(dto.quality),
      pieces: this.toInt(dto.pieces),
      weight: this.toNumber(dto.weight),
      weightUnit: this.normalizePacketWeightUnit(dto.weightUnit),
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

    if (dto.stockType !== undefined) packet.stockType = this.optionalText(dto.stockType);
    if (dto.stone !== undefined) packet.stone = this.optionalText(dto.stone);
    if (dto.shape !== undefined) packet.shape = this.optionalText(dto.shape);
    if (dto.size !== undefined) packet.size = this.optionalText(dto.size);
    if (dto.cut !== undefined) packet.cut = this.optionalText(dto.cut);
    if (dto.color !== undefined) packet.color = this.optionalText(dto.color);
    if (dto.quality !== undefined) packet.quality = this.optionalText(dto.quality);
    if (dto.pieces !== undefined) packet.pieces = this.toInt(dto.pieces);
    if (dto.weight !== undefined) packet.weight = this.toNumber(dto.weight);
    if (dto.weightUnit !== undefined) packet.weightUnit = this.normalizePacketWeightUnit(dto.weightUnit);

    return this.packetRepo.save(packet);
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
              .orWhere('master.description LIKE :search', { search: `%${query.search.trim()}%` });
          }),
        );
      }

      qb.orderBy('master.isActive', 'DESC').addOrderBy('master.value', 'ASC');

      const data = await qb.getMany();
      return { data, total: data.length };
    }

    const data = await this.designMasterRepo.find({
      where: { isActive: true },
      order: { value: 'ASC' },
    });

    const grouped = {
      jewelryGroups: [] as Array<{ id: string; value: string }>,
      collections: [] as Array<{ id: string; value: string }>,
      jewelrySizes: [] as Array<{ id: string; value: string }>,
      tags: [] as Array<{ id: string; value: string }>,
      designStatuses: [] as Array<{ id: string; value: string }>,
      stages: [] as Array<{ id: string; value: string }>,
      goldColours: [] as Array<{ id: string; value: string }>,
      diamondTypes: [] as Array<{ id: string; value: string }>,
      diamondSpreads: [] as Array<{ id: string; value: string }>,
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
      const option = { id: entry.id, value: entry.value };
      if (entry.masterType === DesignMasterType.JEWELRY_GROUP) {
        grouped.jewelryGroups.push(option);
      } else if (entry.masterType === DesignMasterType.COLLECTION) {
        grouped.collections.push(option);
      } else if (entry.masterType === DesignMasterType.JEWELRY_SIZE) {
        grouped.jewelrySizes.push(option);
      } else if (entry.masterType === DesignMasterType.TAG) {
        grouped.tags.push(option);
      } else if (entry.masterType === DesignMasterType.DESIGN_STATUS) {
        grouped.designStatuses.push(option);
      } else if (entry.masterType === DesignMasterType.STAGE) {
        grouped.stages.push(option);
      } else if (entry.masterType === DesignMasterType.GOLD_COLOUR) {
        grouped.goldColours.push(option);
      } else if (entry.masterType === DesignMasterType.DIAMOND_TYPE) {
        grouped.diamondTypes.push(option);
      } else if (entry.masterType === DesignMasterType.DIAMOND_SPREAD) {
        grouped.diamondSpreads.push(option);
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

    const matches = await this.designMasterRepo
      .createQueryBuilder('master')
      .where('master.masterType = :masterType', { masterType })
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
        valueMatch.priceIn = findingFields.priceIn;
        valueMatch.pricePerUnit = findingFields.pricePerUnit;
        valueMatch.dimensions = findingFields.dimensions;
        valueMatch.weightPerUnit = findingFields.weightPerUnit;
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
        aliasMatch.priceIn = findingFields.priceIn;
        aliasMatch.pricePerUnit = findingFields.pricePerUnit;
        aliasMatch.dimensions = findingFields.dimensions;
        aliasMatch.weightPerUnit = findingFields.weightPerUnit;
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
          findingNoMatch.priceIn = findingFields.priceIn;
          findingNoMatch.pricePerUnit = findingFields.pricePerUnit;
          findingNoMatch.dimensions = findingFields.dimensions;
          findingNoMatch.weightPerUnit = findingFields.weightPerUnit;
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
      description,
      findingNo: findingFields.findingNo,
      metalCaratage: findingFields.metalCaratage,
      priceIn: findingFields.priceIn,
      pricePerUnit: findingFields.pricePerUnit,
      dimensions: findingFields.dimensions,
      weightPerUnit: findingFields.weightPerUnit,
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

    const duplicates = await this.designMasterRepo
      .createQueryBuilder('duplicate')
      .where('duplicate.masterType = :masterType', { masterType: master.masterType })
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
    master.description = description;
    master.findingNo = findingFields.findingNo;
    master.metalCaratage = findingFields.metalCaratage;
    master.priceIn = findingFields.priceIn;
    master.pricePerUnit = findingFields.pricePerUnit;
    master.dimensions = findingFields.dimensions;
    master.weightPerUnit = findingFields.weightPerUnit;
    master.updatedBy = requester.id;

    return this.designMasterRepo.save(master);
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

    qb.andWhere('design.companyId = :scopeCompanyId', { scopeCompanyId: requester.companyId });

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

  private normalizeMetals(rows: DesignMetalDto[], globalRateMaps?: GlobalRateMaps): NormalizedMetalRow[] {
    return rows.map((row) => {
      const goldColour = this.optionalText(row.goldColour);
      const netWt = this.toNumber(row.netWt);
      const wastagePercent = this.toNumber(row.wastagePercent);
      const wastageWt = row.wastageWt !== undefined ? this.toNumber(row.wastageWt) : (netWt * wastagePercent) / 100;
      const totalWt = row.totalWt !== undefined ? this.toNumber(row.totalWt) : netWt + wastageWt;
      const globalPricePerGm = this.resolveMetalRate(globalRateMaps, goldColour);
      const enteredPricePerGm = this.toNumber(row.pricePerGm);
      const pricePerGm =
        globalPricePerGm !== undefined ? globalPricePerGm : enteredPricePerGm;
      const value = row.value !== undefined ? this.toNumber(row.value) : totalWt * pricePerGm;
      const components = Math.max(0, Math.trunc(this.toNumber(row.components)));

      return {
        goldColour,
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

  private normalizeGemstones(
    rows: DesignGemstoneDto[],
    designDiamondType: string | null,
    globalRateMaps?: GlobalRateMaps,
  ): NormalizedGemstoneRow[] {
    return rows.map((row) => {
      const stoneType = this.optionalText(row.stoneType);
      const effectiveDiamondType = stoneType || designDiamondType;
      const wtPerPcs = this.toNumber(row.wtPerPcs);
      const pcs = Math.max(0, Math.trunc(this.toNumber(row.pcs)));
      const wtInCts = row.wtInCts !== undefined ? this.toNumber(row.wtInCts) : wtPerPcs * pcs;
      const globalPricePerCt = this.resolveDiamondRate(globalRateMaps, effectiveDiamondType, row.size || null);
      const enteredPricePerCt = this.toNumber(row.pricePerCt);
      const pricePerCt =
        globalPricePerCt !== undefined ? globalPricePerCt : enteredPricePerCt;
      const amount = row.amount !== undefined ? this.toNumber(row.amount) : wtInCts * pricePerCt;

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
      const laborValue = row.laborValue !== undefined ? this.toNumber(row.laborValue) : laborPerUnit * unitQty;

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

  private isImageMimeType(mimeType?: string | null): boolean {
    return typeof mimeType === 'string' && mimeType.trim().toLowerCase().startsWith('image/');
  }

  private resolveImageExtension(originalName: string, mimeType?: string | null): string {
    const ext = extname(originalName || '').toLowerCase();
    const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg', '.avif']);
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
    };

    const normalizedMime = (mimeType || '').toLowerCase();
    return mimeMap[normalizedMime] || '.jpg';
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

  private resolveMetalRate(globalRateMaps: GlobalRateMaps | undefined, goldColour: string | null): number | undefined {
    if (!globalRateMaps || !goldColour) {
      return undefined;
    }

    const lookupKey = this.normalizeLookupKey(goldColour);
    if (!lookupKey) {
      return undefined;
    }

    return globalRateMaps.metalRates.get(lookupKey);
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

  private normalizePacketWeightUnit(value?: string): StoneWeightUnit {
    if (value === StoneWeightUnit.GMS) {
      return StoneWeightUnit.GMS;
    }
    return StoneWeightUnit.CTS;
  }

  private deriveFileNameFromUrl(fileUrl: string): string {
    const normalized = fileUrl.trim();
    const segments = normalized.split('/');
    return segments[segments.length - 1] || 'stl-file';
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
