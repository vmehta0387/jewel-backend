import { Injectable } from '@nestjs/common';

@Injectable()
export class GiftbitService {
  private readonly defaultBaseUrl = 'https://api-testbed.giftbit.com/papi/v1';

  isConfigured(): boolean {
    return Boolean(this.optionalText(process.env.GIFTBIT_API_KEY));
  }

  getBaseUrl(): string {
    return this.optionalText(process.env.GIFTBIT_BASE_URL)?.replace(/\/+$/, '') || this.defaultBaseUrl;
  }

  async createDirectLinkReward(input: {
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
    const apiKey = this.optionalText(process.env.GIFTBIT_API_KEY);
    if (!apiKey) {
      throw new Error('Giftbit API key is not configured');
    }

    const requestId = input.requestId.trim();
    if (!requestId) {
      throw new Error('Giftbit request id is required');
    }

    const payload: Record<string, unknown> = {
      id: requestId,
      price_in_cents: Math.max(1, Math.floor(input.amountCents)),
    };

    const brandCodes = this.parseCsvEnv(process.env.GIFTBIT_BRAND_CODES);
    const region = this.optionalText(process.env.GIFTBIT_REGION) || 'US';
    if (brandCodes.length > 0) {
      payload.brand_codes = brandCodes;
    } else {
      payload.marketplace = region;
    }

    const locale = this.optionalText(process.env.GIFTBIT_LOCALE);
    if (locale) {
      payload.locale = locale;
    }

    const senderName = this.optionalText(process.env.GIFTBIT_SENDER_NAME);
    if (senderName) {
      payload.sender_name = senderName;
    }

    const personalizedNote = this.optionalText(input.note) || this.optionalText(process.env.GIFTBIT_NOTE_TEMPLATE);
    if (personalizedNote) {
      payload.note = personalizedNote;
    }

    if (this.optionalText(input.recipientEmail)) {
      payload.recipient = {
        email: this.optionalText(input.recipientEmail),
        name: this.optionalText(input.recipientName) || undefined,
      };
    }

    const response = await this.request('POST', '/direct_links', payload);
    let rewardLink = this.extractRewardLink(response);

    if (!rewardLink) {
      const followUp = await this.request('GET', `/links/${encodeURIComponent(requestId)}`);
      rewardLink = this.extractRewardLink(followUp);
      return {
        requestId,
        response: {
          createResponse: response,
          followUp,
        },
        rewardLink,
      };
    }

    return { requestId, response, rewardLink };
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, any>> {
    const apiKey = this.optionalText(process.env.GIFTBIT_API_KEY);
    if (!apiKey) {
      throw new Error('Giftbit API key is not configured');
    }

    const baseUrl = this.getBaseUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'identity',
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
          response.statusText ||
          `Giftbit request failed (${response.status})`;
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
      payload?.short_url,
      payload?.shortlink,
      payload?.claim_url,
    ];

    for (const field of candidateFields) {
      if (typeof field === 'string' && /^https?:\/\//i.test(field)) {
        return field;
      }
    }

    const arrays = [payload?.links, payload?.results, payload?.data];
    for (const arr of arrays) {
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
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

  private parseCsvEnv(value: string | undefined): string[] {
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private optionalText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
