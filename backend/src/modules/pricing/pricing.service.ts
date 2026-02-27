import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingRule } from './entities/pricing-rule.entity';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PricingRule)
    private pricingRuleRepo: Repository<PricingRule>,
  ) {}

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
      config.companyMultiplier
    );

    const finalPrice = baseCost * appliedMultiplier;

    return { baseCost, finalPrice, appliedMultiplier };
  }
}
