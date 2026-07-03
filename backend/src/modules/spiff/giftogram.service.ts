import { Injectable } from '@nestjs/common';

@Injectable()
export class GiftogramService {
  private readonly defaultBaseUrl = 'https://api.giftogram.com/api/v1';

  isConfigured(): boolean {
    return Boolean(
      this.optionalText(process.env.GIFTOGRAM_API_KEY) &&
        this.optionalText(process.env.GIFTOGRAM_DEFAULT_CAMPAIGN_ID),
    );
  }

  getBaseUrl(): string {
    return this.optionalText(process.env.GIFTOGRAM_BASE_URL)?.replace(/\/+$/, '') || this.defaultBaseUrl;
  }

  async createOrderReward(input: {
    requestId: string;
    amountCents: number;
    giftCardType: string;
    recipientName?: string | null;
    recipientEmail?: string | null;
    note?: string | null;
  }): Promise<{
    requestId: string;
    response: Record<string, unknown>;
    rewardLink: string | null;
  }> {
    const apiKey = this.optionalText(process.env.GIFTOGRAM_API_KEY);
    if (!apiKey) {
      throw new Error('Giftogram API key is not configured');
    }

    const requestId = input.requestId.trim();
    if (!requestId) {
      throw new Error('Giftogram request id is required');
    }

    const recipientEmail = this.optionalText(input.recipientEmail);
    if (!recipientEmail) {
      throw new Error('Recipient email is required for Giftogram fulfillment');
    }

    const campaignId = this.resolveCampaignIdByGiftCardType(input.giftCardType);
    if (!campaignId) {
      throw new Error(`Giftogram campaign is not configured for gift card type "${input.giftCardType}"`);
    }

    const denomination = this.toDenomination(input.amountCents);
    const payload: Record<string, unknown> = {
      external_id: requestId,
      campaign_id: campaignId,
      notes: this.optionalText(input.note) || this.optionalText(process.env.GIFTOGRAM_NOTES_TEMPLATE),
      reference_number: `${this.optionalText(process.env.GIFTOGRAM_REFERENCE_PREFIX) || 'SPIFF'}-${requestId}`,
      message:
        this.optionalText(input.note) ||
        this.optionalText(process.env.GIFTOGRAM_MESSAGE_TEMPLATE) ||
        'Your Blitz NYC SPIFF redemption is ready.',
      subject:
        this.optionalText(process.env.GIFTOGRAM_SUBJECT_TEMPLATE) ||
        `Your Blitz NYC SPIFF reward (${requestId})`,
      recipients: [
        {
          email: recipientEmail,
          name: this.optionalText(input.recipientName) || undefined,
        },
      ],
      denomination,
    };

    if (!payload.notes) {
      delete payload.notes;
    }

    const response = await this.request('POST', '/order', payload);
    const rewardLink = this.extractRewardLink(response);

    return {
      requestId,
      response,
      rewardLink,
    };
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, any>> {
    const apiKey = this.optionalText(process.env.GIFTOGRAM_API_KEY);
    if (!apiKey) {
      throw new Error('Giftogram API key is not configured');
    }

    const baseUrl = this.getBaseUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
        signal: controller.signal,
      });

      let payload: any = null;
      const text = await response.text();
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        payload = { raw: text };
      }

      if (!response.ok) {
        const message =
          payload?.message ||
          payload?.error ||
          payload?.errors?.[0]?.message ||
          response.statusText ||
          `Giftogram request failed (${response.status})`;
        throw new Error(String(message));
      }

      return payload || {};
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractRewardLink(payload: any): string | null {
    if (!payload) return null;

    if (typeof payload === 'string' && /^https?:\/\//i.test(payload)) {
      return payload;
    }

    const candidateFields = [
      payload?.reward_link,
      payload?.gift_link,
      payload?.link,
      payload?.url,
      payload?.claim_url,
      payload?.recipient_link,
    ];

    for (const field of candidateFields) {
      if (typeof field === 'string' && /^https?:\/\//i.test(field)) {
        return field;
      }
    }

    if (Array.isArray(payload?.recipients)) {
      for (const item of payload.recipients) {
        const nested = this.extractRewardLink(item);
        if (nested) return nested;
      }
    }

    if (Array.isArray(payload?.orders)) {
      for (const item of payload.orders) {
        const nested = this.extractRewardLink(item);
        if (nested) return nested;
      }
    }

    if (typeof payload === 'object') {
      for (const value of Object.values(payload)) {
        if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
          return value;
        }
        if (value && typeof value === 'object') {
          const nested = this.extractRewardLink(value);
          if (nested) return nested;
        }
      }
    }

    return null;
  }

  private resolveCampaignIdByGiftCardType(giftCardType: string): string | null {
    const selectedType = this.normalizeKey(giftCardType);
    const byTypeRaw = this.optionalText(process.env.GIFTOGRAM_GIFTCARD_CAMPAIGN_IDS);

    if (byTypeRaw) {
      const fromJson = this.parseGiftCardCampaignJson(byTypeRaw, selectedType);
      if (fromJson) {
        return fromJson;
      }

      const fromDelimited = this.parseGiftCardCampaignDelimited(byTypeRaw, selectedType);
      if (fromDelimited) {
        return fromDelimited;
      }
    }

    return this.optionalText(process.env.GIFTOGRAM_DEFAULT_CAMPAIGN_ID);
  }

  private parseGiftCardCampaignJson(raw: string, selectedType: string): string | null {
    if (!raw.trim().startsWith('{')) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const [key, value] of Object.entries(parsed || {})) {
        if (this.normalizeKey(key) !== selectedType) continue;
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  private parseGiftCardCampaignDelimited(raw: string, selectedType: string): string | null {
    const rows = raw
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean);

    for (const row of rows) {
      const idx = row.indexOf('=');
      if (idx <= 0) continue;

      const typePart = row.slice(0, idx).trim();
      const campaignPart = row.slice(idx + 1).trim();
      if (!typePart || !campaignPart) continue;
      if (this.normalizeKey(typePart) !== selectedType) continue;

      return campaignPart;
    }

    return null;
  }

  private toDenomination(amountCents: number): number {
    const dollars = Math.max(0.01, amountCents / 100);
    const rounded = Number(dollars.toFixed(2));
    return Number.isInteger(rounded) ? Math.trunc(rounded) : rounded;
  }

  private normalizeKey(value: string | null | undefined): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private optionalText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
