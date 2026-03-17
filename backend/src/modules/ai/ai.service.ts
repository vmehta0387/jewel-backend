import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { DesignChatDto } from './dto/ai-chat.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../../common/enums/user-role.enum';

type TogetherMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

@Injectable()
export class AiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
  ) {}

  async chatDesigns(dto: DesignChatDto, requester: AuthUser) {
    const apiKey = this.configService.get<string>('TOGETHER_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('TOGETHER_API_KEY is not configured');
    }

    const limit = dto.limit ?? 5;
    const readUser: AuthUser = {
      ...requester,
      role: UserRole.INTERNAL_REP,
      companyId: null,
      branchId: null,
    };

    const search = dto.message?.trim() || '';
    const results = await this.productsService.findAll(
      { search, page: 1, limit, status: 'ACTIVE' },
      readUser,
    );

    const candidates = results?.data || [];
    const details = await Promise.all(
      candidates.slice(0, 3).map((design) => this.productsService.findOne(design.id, readUser)),
    );

    const pricing = await Promise.all(
      details.map(async (design) => {
        const companyId = dto.companyId || requester.companyId || undefined;
        const branchId = dto.branchId || requester.branchId || undefined;
        if (!companyId || !branchId) {
          return { designId: design.id, finalPrice: null, companyMultiplier: null, branchMultiplier: null };
        }
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

    const context = details.map((design) => {
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
        grossWeight: design.grossWeight,
        metalValue: design.metalValue,
        gemValue: design.gemValue,
        laborValue: design.laborValue,
        totalValue: design.totalValue,
        imageUrls: design.imageUrls || [],
        metals: (design.metals || []).map((metal) => ({
          metalCaratage: metal.metalCaratage,
          goldColour: metal.goldColour,
          netWt: metal.netWt,
          wastagePercent: metal.wastagePercent,
          wastageWt: metal.wastageWt,
          totalWt: metal.totalWt,
          pricePerGram: metal.pricePerGram,
          value: metal.value,
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
          pricePerCt: gem.pricePerCt,
          amount: gem.amount,
        })),
        pricing: priceInfo,
      };
    });

    const systemPrompt = [
      'You are a helpful assistant for a jewelry design system.',
      'Answer using ONLY the provided design data.',
      'If the answer is not available, say so clearly.',
      'Pricing must use the computed pricing values (finalPrice) based on company and branch multipliers. Do not use base design price unless finalPrice is missing.',
      'Include relevant image URLs when the user asks for visuals or when it helps.',
      'Keep answers concise and professional.',
    ].join(' ');

    const messages: TogetherMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `User question: ${dto.message}\n\nDesign data (JSON):\n${JSON.stringify(context, null, 2)}`,
      },
    ];

    const model = this.configService.get<string>('TOGETHER_MODEL') || 'ServiceNow-AI/Apriel-1.6-15b-Thinker';
    const fetcher = await this.getFetcher();
    const response = await fetcher('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new BadRequestException(text || 'AI service error');
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || 'No response.';

    return {
      reply,
      designs: context,
    };
  }

  private async getFetcher(): Promise<(url: string, init?: any) => Promise<any>> {
    if (typeof fetch !== 'undefined') {
      return fetch as unknown as (url: string, init?: any) => Promise<any>;
    }
    try {
      const mod = await import('node-fetch');
      return mod.default as unknown as (url: string, init?: any) => Promise<any>;
    } catch {
      throw new BadRequestException('Fetch API not available on server runtime');
    }
  }
}
