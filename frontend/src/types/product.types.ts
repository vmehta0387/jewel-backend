export enum CollectionType {
  ENGAGEMENT = 'ENGAGEMENT',
  ETERNITY = 'ETERNITY',
  FLORAL = 'FLORAL',
  WEDDING_BANDS = 'WEDDING_BANDS',
}

export interface RingStyle {
  id: number;
  name: string;
  skuPrefix: string;
  description?: string;
  collectionType: CollectionType;
  collectionMultiplier: number;
  baseLaborCost: number;
  isActive: boolean;
}

export interface RingConfiguration {
  metalType: string;
  metalColor: string;
  ringSize: string;
  diamondQuality: string;
  settingStyle: string;
}
