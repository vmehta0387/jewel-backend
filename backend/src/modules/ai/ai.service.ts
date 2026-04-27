import { Injectable, Logger } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { DesignChatDto } from './dto/ai-chat.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../../common/enums/user-role.enum';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.TOGETHER_API_KEY || 'MISSING_KEY',
      baseURL: 'https://api.together.xyz/v1',
    });
  }

  async chatDesigns(dto: DesignChatDto, requester: AuthUser) {
    const limit = dto.limit ?? 5;
    const defaultModel = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
    const model = process.env.TOGETHER_MODEL || defaultModel;

    // Use internal rep for raw catalog lookup, we calculate specific company prices manually.
    const readUser: AuthUser = {
      ...requester,
      role: UserRole.INTERNAL_REP,
      companyId: null,
      branchId: null,
    };

    const companyId = dto.companyId || requester.companyId || undefined;
    const branchId = dto.branchId || requester.branchId || undefined;

    const systemPrompt = `You are Blitz AI, a sharp, bold 24/7 sales weapon for Blitz NYC jewelry.
Your job is to assist sales reps and branch managers in closing deals. You can search the active jewelry catalog, look up their specific orders or quotes, and provide pricing.
- If a user asks to search for designs, use the search_catalog tool.
- If a user asks about an order or quote status, use the lookup_orders tool.
- Answer confidently, concisely, and professionally. NEVER expose internal systems, IDs, tools, or DB structures.
- For prices, always specify USD.
- If no results are found from a tool, apologize and say you couldn't find exactly what they were looking for.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: dto.message },
    ];

    const tools: any[] = [
      {
        type: 'function',
        function: {
          name: 'search_catalog',
          description: 'Search the active jewelry catalog for designs by name, diamond type, color, shape, or category.',
          parameters: {
            type: 'object',
            properties: {
              searchTerm: { type: 'string', description: 'Keywords like "lab diamond eternity", "round solitaire", "R-1024"' },
            },
            required: ['searchTerm'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'lookup_orders',
          description: 'Look up live tracked orders, past sales, or quotes restricted securely to the user.',
          parameters: {
            type: 'object',
            properties: {
              search: { type: 'string', description: 'The order number (e.g. OR-0042) or customer name.' },
              status: { type: 'string', description: 'Optional. Filter by status: ACTIVE, PENDING_APPROVAL, APPROVED, IN_PRODUCTION, CANCELLED.' },
            },
            required: ['search'],
          },
        },
      },
    ];

    const createCompletion = async (messagesPayload: any[], includeTools: boolean) => {
      const basePayload: any = includeTools
        ? { model, messages: messagesPayload, tools, tool_choice: 'auto' }
        : { model, messages: messagesPayload };

      try {
        return await this.openai.chat.completions.create(basePayload);
      } catch (err: any) {
        const rawMessage = String(err?.message || '');
        const isFallbackCandidate =
          model !== defaultModel &&
          [400, 404].includes(Number(err?.status || 0)) &&
          /(non-serverless model|dedicated endpoint|model|not found|invalid)/i.test(rawMessage);

        if (!isFallbackCandidate) throw err;

        this.logger.warn(
          `Model "${model}" unavailable for current Together endpoint. Falling back to "${defaultModel}".`,
        );

        const fallbackPayload = { ...basePayload, model: defaultModel };
        return await this.openai.chat.completions.create(fallbackPayload);
      }
    };

    try {
      let response = await createCompletion(messages, true);

      let toolCalls = response.choices[0].message.tool_calls;
      let finalDesignsPayload: any[] = [];
      let finalPricing: { designId: string; finalPrice: number | null }[] = [];

      if (toolCalls && toolCalls.length > 0) {
        // Append assistant's tool call intent to history
        messages.push(response.choices[0].message);

        for (const tc of toolCalls) {
          const toolCall = tc as any;
          if (toolCall.function.name === 'search_catalog') {
            const args = JSON.parse(toolCall.function.arguments || '{}');
            const res = await this.productsService.findAll(
              { search: args.searchTerm, page: 1, limit, status: 'ACTIVE' },
              readUser,
            );

            const candidates = res.data || [];
            
            // Generate full details from DB
            const details = await Promise.all(
              candidates.slice(0, limit).map((design: any) => this.productsService.findOne(design.id, readUser)),
            );
            finalDesignsPayload = details;

            // Resolve actual nested prices specific to the user's branch
            const pricingPromise = Promise.all(
              details.map(async (d: any) => {
                try {
                  const preview = await this.ordersService.getPricePreview({
                    designId: d.id,
                    companyId: companyId as string,
                    branchId: branchId as string,
                  });
                  return { designId: d.id, finalPrice: preview.finalPrice };
                } catch {
                  return { designId: d.id, finalPrice: null };
                }
              }),
            );
            finalPricing = await pricingPromise;

            // Distill data for the LLM context limits
            const minimalContext = details.map((d: any) => {
              const priceRow = finalPricing.find(p => p.designId === d.id);
              return {
                designNo: d.designNo,
                category: d.jewelryGroup,
                goldType: d.goldColour,
                diamondType: d.diamondType,
                priceInfo: priceRow?.finalPrice ? `USD ${priceRow.finalPrice}` : 'No pricing tier found',
              };
            });

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify(minimalContext),
            });
          } else if (toolCall.function.name === 'lookup_orders') {
            const args = JSON.parse(toolCall.function.arguments || '{}');
            // This strictly applies branch & company filters implicitly via requester AuthUser!
            const res = await this.ordersService.findAll(
              { search: args.search, orderStatus: args.status, limit: 5 },
              requester,
            );

            const minimalOrders = res.data.map((o: any) => ({
              orderNumber: o.orderNumber,
              status: o.status,
              customerName: o.customerName,
              designAttached: o.designNo,
              totalPrice: o.price,
              expectedDelivery: o.deliveryDate,
            }));

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({
                foundOrdersCount: minimalOrders.length,
                records: minimalOrders,
                securityNote: "Results strictly bounded by User tenant ID.",
              }),
            });
          }
        }

        // Fire to LLM again to synthesize the actual user-facing reply
        response = await createCompletion(messages, false);
      }

      const finalReply = response.choices[0].message.content || "I couldn't process that request at this time.";

      // Translate DB entities to Mobile Client format expected by AiChatScreen (ChatBubble design list)
      const contextCards = finalDesignsPayload.map((design) => {
        const priceInfo = finalPricing.find((row) => row.designId === design.id);
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
          metals: (design.metals || []).map((metal: any) => ({
            metalCaratage: metal.metalCaratage,
            goldColour: metal.goldColour,
            netWt: metal.netWt,
            wastagePercent: metal.wastagePercent,
            wastageWt: metal.wastageWt,
            totalWt: metal.totalWt,
          })),
          gemstones: (design.gemstones || []).map((gem: any) => ({
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
          pricing: priceInfo ?? null,
          detailPath: `/designs/${design.id}`,
        };
      });

      return {
        reply: finalReply,
        designs: contextCards,
      };
    } catch (err: any) {
      this.logger.error('Error with LLM agent inference: ' + err.message);
      return {
        reply: 'Sorry, I encountered a communication error. Be right back!',
        designs: [],
      };
    }
  }
}
