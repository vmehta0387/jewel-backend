import api from '../services/api';

export interface DesignMetal {
  id?: string;
  metalCaratage?: string | null;
  metalColor?: string | null;
  netWt?: number | null;
  wastagePercent?: number | null;
  wastageWt?: number | null;
  totalWt?: number | null;
  pricePerGm?: number | null;
  value?: number | null;
  components?: number | null;
  metalPurity?: string | null;
  weight?: number | null;
  rate?: number | null;
  amount?: number | null;
}

export interface DesignGemstone {
  id?: string;
  packetId?: string | null;
  stone?: string | null;
  shape?: string | null;
  size?: string | null;
  color?: string | null;
  quality?: string | null;
  wtPerPcs?: number | null;
  pcs?: number | null;
  wtInCts?: number | null;
  pricePerCt?: number | null;
  amount?: number | null;
}

export interface DesignDetail {
  id: string;
  designNo: string;
  barcode?: string | null;
  version?: string;
  designName?: string | null;
  jewelryGroup?: string | null;
  collection?: string | null;
  jewelrySize?: string | null;
  designStatus?: string | null;
  diamondType?: string | null;
  stoneInfo?: string | null;
  diamondSpread?: string | null;
  diamondWeight?: string | null;
  diamondQuality?: string | null;
  metalCaratage?: string | null;
  displayPrice?: number | null;
  totalValue?: number | null;
  metals?: DesignMetal[];
  gemstones?: DesignGemstone[];
  groupId?: string | null;
  familyId?: string | null;
  imageUrls?: string[];
  [key: string]: any;
}

export const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const publicAssetsBaseUrl = apiBaseUrl.replace(/\/api$/, '');

export const resolvePublicAssetUrl = (rawUrl: string): string => {
  const url = rawUrl.trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) {
    return url;
  }
  if (!publicAssetsBaseUrl) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${publicAssetsBaseUrl}${url}`;
  }
  return `${publicAssetsBaseUrl}/${url}`;
};

export const stripUrlSuffix = (url: string): string => url.split('#')[0].split('?')[0].toLowerCase();

export const getUrlExtension = (url: string): string => {
  const clean = stripUrlSuffix(url);
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toUpperCase() || 'FILE';
};

export const isImageUrl = (url: string): boolean => {
  const normalized = (url || '').trim();
  if (!normalized) return false;
  if (/^data:image\//i.test(normalized)) return true;
  const clean = stripUrlSuffix(normalized);
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif'].some((ext) => clean.endsWith(ext));
};

export const isVideoUrl = (url: string): boolean => {
  const normalized = (url || '').trim();
  if (!normalized) return false;
  if (/^data:video\//i.test(normalized)) return true;
  const clean = stripUrlSuffix(normalized);
  return ['.mp4', '.webm', '.mov', '.m4v', '.ogv', '.ogg'].some((ext) => clean.endsWith(ext));
};

export const formatMoney = (value: number): string =>
  `USD ${Math.round(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const calculateTotalAmount = (price: number | string | null | undefined, quantity: number | string | null | undefined): number =>
  Number(price || 0) * Number(quantity || 0);

export const formatDisplayDate = (value?: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US');
};

export const formatNumberInput = (value: number): string => {
  if (!Number.isFinite(value)) return '';
  return Number(value.toFixed(2)).toString();
};

export const getDesignDefaultPrice = (design?: Pick<DesignDetail, 'displayPrice' | 'totalValue'> | null): number => {
  const displayPrice = Number(design?.displayPrice ?? 0);
  if (Number.isFinite(displayPrice) && displayPrice > 0) return displayPrice;
  const totalValue = Number(design?.totalValue ?? 0);
  return Number.isFinite(totalValue) && totalValue > 0 ? totalValue : 0;
};

export const toOrderPriceInput = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '';
  return String(Math.round(value));
};

export const uniqueMediaUrls = (urls: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];
  urls.forEach((rawUrl) => {
    const url = String(rawUrl || '').trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    unique.push(url);
  });
  return unique;
};

export const getBaseDesignNo = (designNo: string | null | undefined): string =>
  String(designNo || '')
    .trim()
    .toUpperCase()
    .replace(/-V\d+$/i, '');

export const loadDesignFamilyMedia = async (design: DesignDetail | null): Promise<string[]> => {
  if (!design?.designNo) {
    return uniqueMediaUrls(design?.imageUrls || []);
  }

  const baseDesignNo = getBaseDesignNo(design.designNo);
  const currentMedia = uniqueMediaUrls(design.imageUrls || []);

  try {
    const response = await api.get('/products', {
      params: {
        search: baseDesignNo,
        limit: 200,
        status: 'ALL',
        summaryOnly: true,
      },
    });
    const rows = response.data?.data || [];
    const familyMedia = rows
      .filter((row: any) => getBaseDesignNo(row.designNo) === baseDesignNo)
      .flatMap((row: any) => row.imageUrls || []);

    return uniqueMediaUrls([...currentMedia, ...familyMedia]);
  } catch {
    return currentMedia;
  }
};
