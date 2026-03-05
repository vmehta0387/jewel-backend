import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingRule } from './entities/pricing-rule.entity';
import {
  GlobalBasePrice,
  GlobalBasePriceCategory,
  GlobalBasePriceUnit,
} from './entities/global-base-price.entity';
import {
  CreateGlobalBasePriceDto,
  FindGlobalBasePricesQueryDto,
  FindGlobalBasePriceReferenceOptionsQueryDto,
  UpdateGlobalBasePriceDto,
} from './dto/pricing.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { Design } from '../products/entities/design.entity';
import { DesignMetal } from '../products/entities/design-metal.entity';
import { DesignGemstone } from '../products/entities/design-gemstone.entity';
import { DesignMaster, DesignMasterType } from '../products/entities/design-master.entity';

interface GlobalRateMaps {
  metalRates: Map<string, number>;
  diamondRatesByType: Map<string, number>;
  diamondRatesByTypeAndSize: Map<string, number>;
}

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PricingRule)
    private pricingRuleRepo: Repository<PricingRule>,
    @InjectRepository(GlobalBasePrice)
    private readonly globalBasePriceRepo: Repository<GlobalBasePrice>,
    @InjectRepository(Design)
    private readonly designRepo: Repository<Design>,
    @InjectRepository(DesignMetal)
    private readonly metalRepo: Repository<DesignMetal>,
    @InjectRepository(DesignGemstone)
    private readonly gemstoneRepo: Repository<DesignGemstone>,
    @InjectRepository(DesignMaster)
    private readonly designMasterRepo: Repository<DesignMaster>,
  ) {}

  async findGlobalBasePrices(query: FindGlobalBasePricesQueryDto): Promise<any> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);
    const skip = (page - 1) * limit;
    const includeInactive = query.includeInactive ?? false;

    const qb = this.globalBasePriceRepo
      .createQueryBuilder('rate')
      .orderBy('rate.category', 'ASC')
      .addOrderBy('rate.referenceValue', 'ASC')
      .addOrderBy('rate.subValue', 'ASC')
      .addOrderBy('rate.effectiveFrom', 'DESC')
      .addOrderBy('rate.updatedAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.category) {
      qb.andWhere('rate.category = :category', { category: query.category });
    }

    if (!includeInactive) {
      qb.andWhere('rate.isActive = :isActive', { isActive: true });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findGlobalBasePriceReferenceOptions(
    query: FindGlobalBasePriceReferenceOptionsQueryDto,
  ): Promise<{ data: string[] }> {
    const masterType = this.resolveReferenceMasterType(query.category);

    const [masters, configuredRates, currentRate] = await Promise.all([
      this.designMasterRepo.find({
        where: { masterType, isActive: true },
        order: { value: 'ASC' },
      }),
      this.globalBasePriceRepo.find({
        where: { category: query.category },
        select: ['id', 'referenceValue'],
      }),
      query.excludeId
        ? this.globalBasePriceRepo.findOne({
            where: { id: query.excludeId },
          })
        : Promise.resolve(null),
    ]);

    const excludedReferenceValues = new Set(
      configuredRates
        .filter((row) => !query.excludeId || row.id !== query.excludeId)
        .map((row) => this.normalizeLookup(row.referenceValue))
        .filter((value): value is string => !!value),
    );

    const seen = new Set<string>();
    const options: string[] = [];

    if (
      currentRate &&
      currentRate.category === query.category &&
      typeof currentRate.referenceValue === 'string'
    ) {
      const normalizedCurrent = this.normalizeLookup(currentRate.referenceValue);
      const trimmedCurrent = currentRate.referenceValue.trim();
      if (
        normalizedCurrent &&
        trimmedCurrent &&
        !excludedReferenceValues.has(normalizedCurrent) &&
        !seen.has(normalizedCurrent)
      ) {
        seen.add(normalizedCurrent);
        options.push(trimmedCurrent);
      }
    }

    masters.forEach((master) => {
      const normalizedValue = this.normalizeLookup(master.value);
      const trimmedValue = (master.value || '').trim();
      if (!normalizedValue || !trimmedValue) {
        return;
      }
      if (excludedReferenceValues.has(normalizedValue) || seen.has(normalizedValue)) {
        return;
      }

      seen.add(normalizedValue);
      options.push(trimmedValue);
    });

    return { data: options };
  }

  async createGlobalBasePrice(dto: CreateGlobalBasePriceDto, requester: AuthUser): Promise<any> {
    const normalizedReferenceValue = this.requiredText(dto.referenceValue, 'referenceValue');
    const normalizedSubValue = this.optionalText(dto.subValue);
    const unit = this.resolveUnit(dto.category, dto.unit);
    const currency = this.normalizeCurrency(dto.currency);

    const existing = await this.findActiveRateByKey({
      category: dto.category,
      referenceValue: normalizedReferenceValue,
      subValue: normalizedSubValue,
      unit,
      currency,
    });

    let saved: GlobalBasePrice;
    if (existing) {
      existing.pricePerUnit = this.toNumber(dto.pricePerUnit);
      existing.effectiveFrom = this.resolveEffectiveFrom(dto.effectiveFrom);
      existing.notes = this.optionalText(dto.notes);
      existing.updatedBy = requester.id;
      existing.isActive = dto.isActive ?? true;
      saved = await this.globalBasePriceRepo.save(existing);
    } else {
      const entity = this.globalBasePriceRepo.create({
        category: dto.category,
        referenceValue: normalizedReferenceValue,
        subValue: normalizedSubValue,
        pricePerUnit: this.toNumber(dto.pricePerUnit),
        unit,
        currency,
        effectiveFrom: this.resolveEffectiveFrom(dto.effectiveFrom),
        notes: this.optionalText(dto.notes),
        isActive: dto.isActive ?? true,
        createdBy: requester.id,
        updatedBy: requester.id,
      });
      saved = await this.globalBasePriceRepo.save(entity);
    }

    const recalculation = await this.recalculateDesignsFromGlobalBasePrices();

    return { rate: saved, recalculation };
  }

  async updateGlobalBasePrice(
    id: string,
    dto: UpdateGlobalBasePriceDto,
    requester: AuthUser,
  ): Promise<any> {
    const existing = await this.globalBasePriceRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Global base price not found');
    }

    const nextCategory = existing.category;
    const nextReferenceValue =
      dto.referenceValue !== undefined
        ? this.requiredText(dto.referenceValue, 'referenceValue')
        : existing.referenceValue;
    const nextSubValue =
      dto.subValue !== undefined ? this.optionalText(dto.subValue) : existing.subValue;
    const nextUnit = this.resolveUnit(nextCategory, dto.unit || existing.unit);
    const nextCurrency = this.normalizeCurrency(dto.currency || existing.currency);

    if (existing.isActive) {
      const duplicate = await this.findActiveRateByKey(
        {
          category: nextCategory,
          referenceValue: nextReferenceValue,
          subValue: nextSubValue,
          unit: nextUnit,
          currency: nextCurrency,
        },
        id,
      );

      if (duplicate) {
        throw new BadRequestException('An active global base price already exists for this key');
      }
    }

    existing.referenceValue = nextReferenceValue;
    existing.subValue = nextSubValue;
    if (dto.pricePerUnit !== undefined) {
      existing.pricePerUnit = this.toNumber(dto.pricePerUnit);
    }
    existing.unit = nextUnit;
    existing.currency = nextCurrency;
    if (dto.effectiveFrom !== undefined) {
      existing.effectiveFrom = this.resolveEffectiveFrom(dto.effectiveFrom);
    }
    if (dto.notes !== undefined) {
      existing.notes = this.optionalText(dto.notes);
    }
    existing.updatedBy = requester.id;

    const saved = await this.globalBasePriceRepo.save(existing);
    const recalculation = await this.recalculateDesignsFromGlobalBasePrices();

    return { rate: saved, recalculation };
  }

  async updateGlobalBasePriceStatus(
    id: string,
    isActive: boolean,
    requester: AuthUser,
  ): Promise<any> {
    const existing = await this.globalBasePriceRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Global base price not found');
    }

    if (isActive) {
      const duplicate = await this.findActiveRateByKey(
        {
          category: existing.category,
          referenceValue: existing.referenceValue,
          subValue: existing.subValue,
          unit: existing.unit,
          currency: existing.currency,
        },
        id,
      );

      if (duplicate) {
        throw new BadRequestException('An active global base price already exists for this key');
      }
    }

    existing.isActive = isActive;
    existing.updatedBy = requester.id;
    const saved = await this.globalBasePriceRepo.save(existing);
    const recalculation = await this.recalculateDesignsFromGlobalBasePrices();

    return { rate: saved, recalculation };
  }

  async recalculateDesignsFromGlobalBasePrices(): Promise<{ updatedDesigns: number; totalDesigns: number }> {
    const activeRates = await this.globalBasePriceRepo.find({
      where: { isActive: true },
      order: { effectiveFrom: 'DESC', updatedAt: 'DESC' },
    });

    const maps = this.buildGlobalRateMaps(activeRates);
    const designs = await this.designRepo.find({
      relations: ['metals', 'gemstones', 'labors', 'findings'],
    });

    let updatedDesigns = 0;

    for (const design of designs) {
      const metals = design.metals || [];
      const gemstones = design.gemstones || [];

      let metalsChanged = false;
      let gemstonesChanged = false;

      for (const metal of metals) {
        const key = this.normalizeLookup(metal.goldColour);
        if (!key) continue;

        const rate = maps.metalRates.get(key);
        if (rate === undefined) continue;

        const totalWt = this.toNumber(metal.totalWt);
        const nextValue = this.roundMoney(totalWt * rate);
        if (this.toNumber(metal.pricePerGm) !== rate || this.toNumber(metal.value) !== nextValue) {
          metal.pricePerGm = rate;
          metal.value = nextValue;
          metalsChanged = true;
        }
      }

      for (const gemstone of gemstones) {
        const rate = this.resolveDiamondRate(
          maps,
          gemstone.stoneType || design.diamondType || null,
          gemstone.size,
        );

        if (rate === undefined) continue;

        const wtPerPcs = this.toNumber(gemstone.wtPerPcs);
        const pcs = Math.max(0, Math.trunc(this.toNumber(gemstone.pcs)));
        const computedWeight = wtPerPcs * pcs;
        const currentWtInCts = this.toNumber(gemstone.wtInCts);
        const nextWtInCts = currentWtInCts > 0 ? currentWtInCts : computedWeight;
        const nextAmount = this.roundMoney(nextWtInCts * rate);

        if (
          this.toNumber(gemstone.pricePerCt) !== rate ||
          this.toNumber(gemstone.amount) !== nextAmount ||
          this.toNumber(gemstone.wtInCts) !== nextWtInCts
        ) {
          gemstone.pricePerCt = rate;
          gemstone.wtInCts = nextWtInCts;
          gemstone.amount = nextAmount;
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

      const metalValue = metals.reduce((sum, row) => sum + this.toNumber(row.value), 0);
      const gemValue = gemstones.reduce((sum, row) => sum + this.toNumber(row.amount), 0);
      const laborValue = (design.labors || []).reduce(
        (sum, row) => sum + this.toNumber((row as any).laborValue),
        0,
      );
      const findingValue = (design.findings || []).reduce(
        (sum, row) => sum + this.toNumber((row as any).findingValue),
        0,
      );
      const totalValue = this.roundMoney(metalValue + gemValue + laborValue + findingValue);
      const grossWeight = metals.reduce((sum, row) => sum + this.toNumber(row.totalWt), 0);

      design.metalValue = metalValue;
      design.gemValue = gemValue;
      design.laborValue = laborValue;
      design.findingValue = findingValue;
      design.totalValue = totalValue;
      design.grossWeight = grossWeight;
      design.livePrice = totalValue;
      design.goldColour = metals[0]?.goldColour || design.goldColour || null;
      design.stoneInfo = gemstones[0]?.stone || design.stoneInfo || null;

      await this.designRepo.save(design);
      updatedDesigns += 1;
    }

    return { updatedDesigns, totalDesigns: designs.length };
  }

  async calculatePrice(config: {
    goldPricePerGram: number;
    weightGrams: number;
    diamondCount: number;
    avgDiamondWeightCarats: number;
    pricePerCarat: number;
    laborCost: number;
    collectionMultiplier: number;
    branchMultiplier: number;
    companyMultiplier: number;
  }): Promise<{ baseCost: number; finalPrice: number; appliedMultiplier: number }> {
    const goldCost = config.goldPricePerGram * config.weightGrams;
    const diamondCost = config.diamondCount * config.avgDiamondWeightCarats * config.pricePerCarat;
    const baseCost = goldCost + diamondCost + config.laborCost;

    const appliedMultiplier = Math.max(
      config.collectionMultiplier,
      config.branchMultiplier,
      config.companyMultiplier,
    );

    const finalPrice = baseCost * appliedMultiplier;

    return { baseCost, finalPrice, appliedMultiplier };
  }

  private buildGlobalRateMaps(rows: GlobalBasePrice[]): GlobalRateMaps {
    const metalRates = new Map<string, number>();
    const diamondRatesByType = new Map<string, number>();
    const diamondRatesByTypeAndSize = new Map<string, number>();

    rows.forEach((row) => {
      const refKey = this.normalizeLookup(row.referenceValue);
      if (!refKey) return;

      const rate = this.toNumber(row.pricePerUnit);
      if (row.category === GlobalBasePriceCategory.METAL) {
        if (!metalRates.has(refKey)) {
          metalRates.set(refKey, rate);
        }
        return;
      }

      if (row.category === GlobalBasePriceCategory.DIAMOND) {
        const sizeKey = this.normalizeLookup(row.subValue);
        if (sizeKey) {
          const typeAndSizeKey = `${refKey}::${sizeKey}`;
          if (!diamondRatesByTypeAndSize.has(typeAndSizeKey)) {
            diamondRatesByTypeAndSize.set(typeAndSizeKey, rate);
          }
        }

        if (!diamondRatesByType.has(refKey)) {
          diamondRatesByType.set(refKey, rate);
        }
      }
    });

    return {
      metalRates,
      diamondRatesByType,
      diamondRatesByTypeAndSize,
    };
  }

  private resolveDiamondRate(
    maps: GlobalRateMaps,
    diamondType: string | null,
    size: string | null,
  ): number | undefined {
    const diamondTypeKey = this.normalizeLookup(diamondType);
    if (!diamondTypeKey) return undefined;

    const sizeKey = this.normalizeLookup(size);
    if (sizeKey) {
      const fromSizeSpecific = maps.diamondRatesByTypeAndSize.get(`${diamondTypeKey}::${sizeKey}`);
      if (fromSizeSpecific !== undefined) {
        return fromSizeSpecific;
      }
    }

    return maps.diamondRatesByType.get(diamondTypeKey);
  }

  private async findActiveRateByKey(
    params: {
      category: GlobalBasePriceCategory;
      referenceValue: string;
      subValue: string | null;
      unit: GlobalBasePriceUnit;
      currency: string;
    },
    excludeId?: string,
  ): Promise<GlobalBasePrice | null> {
    const qb = this.globalBasePriceRepo
      .createQueryBuilder('rate')
      .where('rate.category = :category', { category: params.category })
      .andWhere('rate.referenceValue = :referenceValue', { referenceValue: params.referenceValue })
      .andWhere('rate.unit = :unit', { unit: params.unit })
      .andWhere('rate.currency = :currency', { currency: params.currency })
      .andWhere('rate.isActive = :isActive', { isActive: true });

    if (params.subValue) {
      qb.andWhere('rate.subValue = :subValue', { subValue: params.subValue });
    } else {
      qb.andWhere('rate.subValue IS NULL');
    }

    if (excludeId) {
      qb.andWhere('rate.id != :excludeId', { excludeId });
    }

    return qb.orderBy('rate.updatedAt', 'DESC').getOne();
  }

  private resolveUnit(
    category: GlobalBasePriceCategory,
    inputUnit?: GlobalBasePriceUnit,
  ): GlobalBasePriceUnit {
    const fallback =
      category === GlobalBasePriceCategory.METAL
        ? GlobalBasePriceUnit.GRAM
        : GlobalBasePriceUnit.CARAT;
    const normalizedUnit = inputUnit || fallback;

    if (category === GlobalBasePriceCategory.METAL && normalizedUnit !== GlobalBasePriceUnit.GRAM) {
      throw new BadRequestException('Metal base prices must use GRAM unit');
    }

    if (
      category === GlobalBasePriceCategory.DIAMOND &&
      normalizedUnit !== GlobalBasePriceUnit.CARAT
    ) {
      throw new BadRequestException('Diamond base prices must use CARAT unit');
    }

    return normalizedUnit;
  }

  private resolveEffectiveFrom(value?: string): Date {
    if (!value) {
      return new Date();
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('effectiveFrom must be a valid date');
    }

    return parsed;
  }

  private requiredText(value: string | undefined, fieldName: string): string {
    const normalized = value?.trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return normalized;
  }

  private optionalText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeLookup(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeCurrency(value?: string): string {
    const normalized = (value || 'USD').trim().toUpperCase();
    return normalized.length > 0 ? normalized : 'USD';
  }

  private resolveReferenceMasterType(category: GlobalBasePriceCategory): DesignMasterType {
    if (category === GlobalBasePriceCategory.METAL) {
      return DesignMasterType.GOLD_COLOUR;
    }
    return DesignMasterType.DIAMOND_TYPE;
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }

  private toNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
