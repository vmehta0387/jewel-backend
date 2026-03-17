import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { DesignChatDto } from './dto/ai-chat.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class AiService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
  ) {}

  async chatDesigns(dto: DesignChatDto, requester: AuthUser) {
    const limit = dto.limit ?? 10;
    const readUser: AuthUser = {
      ...requester,
      role: UserRole.INTERNAL_REP,
      companyId: null,
      branchId: null,
    };

    const search = dto.message?.trim() || '';
    const aiQuery = this.parseAiQuery(search);
    if (!aiQuery.isDesignQuery) {
      return { reply: 'No matching results found', designs: [] };
    }
    const companyId = dto.companyId || requester.companyId || undefined;
    const branchId = dto.branchId || requester.branchId || undefined;
    if (aiQuery.needsPricing && (!companyId || !branchId)) {
      return { reply: 'No matching results found', designs: [] };
    }
    const inferredFilters = aiQuery.filters;
    const baseLimit = Math.max(limit, aiQuery.needsPricing ? 50 : limit);
    let results = inferredFilters
      ? await this.productsService.findAll(
          { ...inferredFilters, page: 1, limit: baseLimit, status: 'ACTIVE' },
          readUser,
        )
      : await this.productsService.findAll(
          { search, page: 1, limit: baseLimit, status: 'ACTIVE' },
          readUser,
        );

    let candidates = results?.data || [];
    if (candidates.length === 0) {
      results = await this.productsService.findAll(
        { search, page: 1, limit: baseLimit, status: 'ACTIVE' },
        readUser,
      );
      candidates = results?.data || [];
    }

    if (candidates.length === 0) {
      results = await this.productsService.findAll(
        { page: 1, limit: baseLimit, status: 'ACTIVE' },
        readUser,
      );
      candidates = results?.data || [];
    }

    if (candidates.length === 0) {
      return {
        reply: 'No matching results found',
        designs: [],
      };
    }

    const details = await Promise.all(
      candidates.slice(0, baseLimit).map((design) => this.productsService.findOne(design.id, readUser)),
    );

    const pricing = aiQuery.needsPricing
      ? await this.resolvePricing(details, companyId, branchId)
      : [];

    const filteredDetails = this.filterByPrice(details, pricing, aiQuery.priceMin, aiQuery.priceMax);
    if (filteredDetails.length === 0) {
      return { reply: 'No matching results found', designs: [] };
    }

    const topDetails = filteredDetails.slice(0, limit);
    const reply = this.buildReply(aiQuery, topDetails, pricing);

    const context = topDetails.map((design) => {
      const priceInfo = pricing.find((row) => row.designId === design.id);
      return {
        id: design.id,
        designNo: design.designNo,
        version: design.version,
        jewelryGroup: design.jewelryGroup,
        collection: design.collection,
        jewelrySize: design.jewelrySize,
        stage: design.stage,
        diamondSpread: design.diamondSpread,
        diamondType: design.diamondType,
        goldColour: design.goldColour,
        tags: design.tags,
        imageUrls: design.imageUrls || [],
        metals: (design.metals || []).map((metal) => ({
          metalCaratage: metal.metalCaratage,
          goldColour: metal.goldColour,
          netWt: metal.netWt,
          wastagePercent: metal.wastagePercent,
          wastageWt: metal.wastageWt,
          totalWt: metal.totalWt,
        })),
        gemstones: (design.gemstones || []).map((gem) => ({
          packetId: gem.packetId,
          stone: gem.stone,
          shape: gem.shape,
          size: gem.size,
          color: gem.color,
          quality: gem.quality,
          wtPerPcs: gem.wtPerPcs,
          pcs: gem.pcs,
          wtInCts: gem.wtInCts,
        })),
        pricing: aiQuery.needsPricing ? priceInfo ?? null : null,
        detailPath: `/designs/${design.id}`,
      };
    });

    return {
      reply,
      designs: context,
    };
  }

  private parseAiQuery(message: string): {
    filters: {
      search?: string;
      jewelryGroup?: string;
      stone?: string;
      shape?: string;
      cut?: string;
      color?: string;
      quality?: string;
      goldColour?: string;
    } | null;
    needsPricing: boolean;
    priceMin?: number;
    priceMax?: number;
    wantsPrice: boolean;
    designNo?: string;
    isDesignQuery: boolean;
  } {
    const text = message.toLowerCase();
    const filters: {
      search?: string;
      jewelryGroup?: string;
      stone?: string;
      shape?: string;
      cut?: string;
      color?: string;
      quality?: string;
      goldColour?: string;
    } = {};

    const wantsPrice =
      /price|cost|under|below|less than|over|above|greater than|\$|usd|inr|eur|gbp|aud|cad/.test(text);

    const designNoMatch = /\b[A-Z]{2,}[A-Z0-9]*-\d{2,}(?:-[A-Z0-9]+)?(?:-V\d+)?\b/i.exec(message);
    if (designNoMatch) {
      filters.search = designNoMatch[0];
    }

    const groupMap: Record<string, string> = {
      ring: 'Ring',
      bracelet: 'Bracelet',
      bangle: 'Bangle',
      necklace: 'Necklace',
      pendant: 'Pendant',
      earrings: 'Earrings',
      earring: 'Earrings',
      chain: 'Chain',
    };

    for (const key of Object.keys(groupMap)) {
      if (text.includes(key)) {
        filters.jewelryGroup = groupMap[key];
        break;
      }
    }

    if (text.includes('diamond')) {
      filters.stone = 'Diamond';
    }

    const shapes = [
      'round',
      'oval',
      'princess',
      'emerald',
      'pear',
      'marquise',
      'cushion',
      'radiant',
      'asscher',
      'heart',
      'trillion',
      'hexagon',
      'square',
      'rectangle',
    ];
    const shapeMatch = shapes.find((shape) => text.includes(shape));
    if (shapeMatch) {
      filters.shape = shapeMatch.charAt(0).toUpperCase() + shapeMatch.slice(1);
    }

    const cuts = ['excellent', 'very good', 'good', 'fair', 'ideal', 'brilliant'];
    const cutMatch = cuts.find((cut) => text.includes(cut));
    if (cutMatch) {
      filters.cut = cutMatch.charAt(0).toUpperCase() + cutMatch.slice(1);
    }

    const colors = ['white', 'yellow', 'pink', 'blue', 'green', 'black', 'brown', 'navy', 'red', 'rose'];
    const colorMatch = colors.find((color) => text.includes(color));
    if (colorMatch) {
      filters.color = colorMatch === 'rose' ? 'Rose' : colorMatch.charAt(0).toUpperCase() + colorMatch.slice(1);
      filters.goldColour = filters.color;
    }

    const qualityMatch = /(vvs|vs|si|if)\b/i.exec(message);
    if (qualityMatch) {
      filters.quality = qualityMatch[1].toUpperCase();
    }

    const searchTokens: string[] = [];
    if (text.includes('eternity')) searchTokens.push('eternity');
    if (text.includes('engagement')) searchTokens.push('engagement');
    if (text.includes('solitaire')) searchTokens.push('solitaire');
    if (text.includes('lab')) searchTokens.push('lab');
    if (text.includes('natural')) searchTokens.push('natural');
    if (!filters.search && searchTokens.length) {
      filters.search = searchTokens.join(' ');
    } else if (filters.search && searchTokens.length) {
      filters.search = `${filters.search} ${searchTokens.join(' ')}`.trim();
    }

    const { priceMin, priceMax } = this.extractPriceRange(text);
    const needsPricing = Boolean(priceMin !== undefined || priceMax !== undefined || wantsPrice);

    const isGreeting =
      /^(hi|hello|hey|good morning|good evening|good afternoon|yo|hola|thanks|thank you)\b/i.test(
        message.trim(),
      );
    const mentionsDesign =
      /\bdesigns?\b/i.test(message) ||
      /show|list|find|search|looking for/i.test(message) ||
      Boolean(Object.keys(filters).length) ||
      Boolean(designNoMatch);
    const isDesignQuery = !isGreeting && (mentionsDesign || needsPricing);

    return {
      filters: Object.keys(filters).length ? filters : null,
      needsPricing,
      priceMin,
      priceMax,
      wantsPrice,
      designNo: designNoMatch?.[0],
      isDesignQuery,
    };
  }

  private extractPriceRange(text: string): { priceMin?: number; priceMax?: number } {
    const normalizeAmount = (value: string) => {
      const numeric = Number.parseFloat(value.replace(/,/g, ''));
      return Number.isFinite(numeric) ? numeric : undefined;
    };

    const betweenMatch = /between\s+\$?\s*([\d,]+(?:\.\d+)?)\s+and\s+\$?\s*([\d,]+(?:\.\d+)?)/i.exec(text);
    if (betweenMatch) {
      const min = normalizeAmount(betweenMatch[1]);
      const max = normalizeAmount(betweenMatch[2]);
      return { priceMin: min, priceMax: max };
    }

    const underMatch = /(under|below|less than|<=)\s*\$?\s*([\d,]+(?:\.\d+)?)/i.exec(text);
    if (underMatch) {
      const max = normalizeAmount(underMatch[2]);
      return { priceMax: max };
    }

    const overMatch = /(over|above|greater than|>=)\s*\$?\s*([\d,]+(?:\.\d+)?)/i.exec(text);
    if (overMatch) {
      const min = normalizeAmount(overMatch[2]);
      return { priceMin: min };
    }

    return {};
  }

  private async resolvePricing(
    designs: any[],
    companyId?: string,
    branchId?: string,
  ): Promise<{ designId: string; finalPrice: number | null; companyMultiplier: number | null; branchMultiplier: number | null }[]> {
    return Promise.all(
      designs.map(async (design) => {
        try {
          const preview = await this.ordersService.getPricePreview({
            designId: design.id,
            companyId,
            branchId,
          });
          return { designId: design.id, ...preview };
        } catch {
          return { designId: design.id, finalPrice: null, companyMultiplier: null, branchMultiplier: null };
        }
      }),
    );
  }

  private filterByPrice(
    designs: any[],
    pricing: { designId: string; finalPrice: number | null }[],
    min?: number,
    max?: number,
  ) {
    if (min === undefined && max === undefined) return designs;
    return designs.filter((design) => {
      const priceInfo = pricing.find((row) => row.designId === design.id);
      if (!priceInfo || priceInfo.finalPrice === null) return false;
      const price = priceInfo.finalPrice;
      if (min !== undefined && price < min) return false;
      if (max !== undefined && price > max) return false;
      return true;
    });
  }

  private buildReply(
    aiQuery: { wantsPrice: boolean; designNo?: string },
    designs: any[],
    pricing: { designId: string; finalPrice: number | null }[],
  ) {
    if (!designs.length) {
      return 'No matching results found';
    }

    if (aiQuery.designNo) {
      const match = designs.find((design) => design.designNo?.toLowerCase() === aiQuery.designNo?.toLowerCase());
      if (match && aiQuery.wantsPrice) {
        const priceInfo = pricing.find((row) => row.designId === match.id);
        if (!priceInfo || priceInfo.finalPrice === null) {
          return 'No matching results found';
        }
        return `Price for ${match.designNo} is USD ${priceInfo.finalPrice.toFixed(2)}.`;
      }
    }

    if (aiQuery.wantsPrice) {
      const hasAnyPrice = pricing.some((row) => row.finalPrice !== null && row.finalPrice !== undefined);
      if (!hasAnyPrice) {
        return 'No matching results found';
      }
    }

    const lines = designs.map((design) => {
      const parts = [design.designNo];
      if (design.jewelryGroup) parts.push(design.jewelryGroup);
      if (design.collection) parts.push(design.collection);
      if (design.goldColour) parts.push(design.goldColour);
      if (aiQuery.wantsPrice) {
        const priceInfo = pricing.find((row) => row.designId === design.id);
        if (priceInfo?.finalPrice !== null && priceInfo?.finalPrice !== undefined) {
          parts.push(`USD ${priceInfo.finalPrice.toFixed(2)}`);
        }
      }
      return `- ${parts.join(' | ')}`;
    });

    const header = `Found ${designs.length} design${designs.length === 1 ? '' : 's'}:`;
    return [header, ...lines].join('\n');
  }
}
