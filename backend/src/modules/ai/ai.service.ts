import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';
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
    const inferredFilters = this.inferDesignFilters(search);
    let results = inferredFilters
      ? await this.productsService.findAll(
          { ...inferredFilters, page: 1, limit, status: 'ACTIVE' },
          readUser,
        )
      : await this.productsService.findAll(
          { search, page: 1, limit, status: 'ACTIVE' },
          readUser,
        );

    let candidates = results?.data || [];
    if (candidates.length === 0) {
      results = await this.productsService.findAll(
        { search, page: 1, limit, status: 'ACTIVE' },
        readUser,
      );
      candidates = results?.data || [];
    }

    if (candidates.length === 0) {
      results = await this.productsService.findAll(
        { page: 1, limit, status: 'ACTIVE' },
        readUser,
      );
      candidates = results?.data || [];
    }

    if (candidates.length === 0) {
      return {
        reply: 'No designs are available yet. Please add designs in the admin portal.',
        designs: [],
      };
    }
    const details = await Promise.all(
      candidates.slice(0, 3).map((design) => this.productsService.findOne(design.id, readUser)),
    );

    const context = details.map((design) => {
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
      };
    });

    const systemPrompt = [
      'You are a helpful assistant for a jewelry design system.',
      'Answer using ONLY the provided design data.',
      'If the answer is not available, say so clearly.',
      'Do NOT include any prices, costs, or monetary values in your response.',
      'Include relevant image URLs when the user asks for visuals or when it helps.',
      'Keep answers concise and professional.',
      'Do not reveal your reasoning or internal thoughts. Provide only the final answer.',
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
    const replyRaw = data?.choices?.[0]?.message?.content?.trim() || 'No response.';
    const reply = this.sanitizeAiReply(replyRaw);

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

  private inferDesignFilters(message: string):
    | {
        jewelryGroup?: string;
        stone?: string;
        shape?: string;
        cut?: string;
        color?: string;
        quality?: string;
      }
    | null {
    const text = message.toLowerCase();
    const filters: {
      jewelryGroup?: string;
      stone?: string;
      shape?: string;
      cut?: string;
      color?: string;
      quality?: string;
    } = {};

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

    const colors = ['white', 'yellow', 'pink', 'blue', 'green', 'black', 'brown', 'navy', 'red'];
    const colorMatch = colors.find((color) => text.includes(color));
    if (colorMatch) {
      filters.color = colorMatch.charAt(0).toUpperCase() + colorMatch.slice(1);
    }

    const qualityMatch = /(vvs|vs|si|if)\b/i.exec(message);
    if (qualityMatch) {
      filters.quality = qualityMatch[1].toUpperCase();
    }

    return Object.keys(filters).length ? filters : null;
  }

  private sanitizeAiReply(text: string) {
    const strippedThink = text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/^\s*(thoughts?|reasoning|analysis)\s*:\s*[\s\S]*?(\n\n|$)/gi, '')
      .trim();

    const noPrices = strippedThink
      .replace(/\b(usd|inr|eur|gbp|aud|cad)\s*\$?\s*\d[\d,]*(?:\.\d+)?/gi, '[price hidden]')
      .replace(/\$\s*\d[\d,]*(?:\.\d+)?/g, '[price hidden]')
      .replace(/\b\d[\d,]*(?:\.\d+)?\s*(usd|inr|eur|gbp|aud|cad)\b/gi, '[price hidden]');

    return noPrices || 'No response.';
  }
}
