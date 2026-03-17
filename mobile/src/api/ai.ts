import { apiRequest } from './client';

export type AiChatResponse = {
  reply: string;
  designs: Array<{
    id: string;
    designNo: string;
    version: string;
    jewelryGroup?: string | null;
    jewelrySize?: string | null;
    imageUrls?: string[];
    pricing?: {
      finalPrice?: number | null;
      companyMultiplier?: number | null;
      branchMultiplier?: number | null;
    } | null;
  }>;
};

export type AiChatPayload = {
  message: string;
  companyId?: string;
  branchId?: string;
  limit?: number;
};

export const chatDesigns = (token: string, payload: AiChatPayload) =>
  apiRequest<AiChatResponse>('/ai/design-chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
