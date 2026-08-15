import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
export enum DesignMasterType {
  JEWELRY_GROUP = 'JEWELRY_GROUP',
  COLLECTION = 'COLLECTION',
  JEWELRY_SIZE = 'JEWELRY_SIZE',
  TAG = 'TAG',
  DESIGN_STATUS = 'DESIGN_STATUS',
  STAGE = 'STAGE',
  METAL_NAME = 'METAL_NAME',
  METAL_COLOR = 'METAL_COLOR',
  METAL_PURITY = 'METAL_PURITY',
  METAL_CARATAGE = 'METAL_CARATAGE',
  GOLD_COLOUR = 'GOLD_COLOUR',
  DIAMOND_TYPE = 'DIAMOND_TYPE',
  DIAMOND_SPREAD = 'DIAMOND_SPREAD',
  DIAMOND_WEIGHT = 'DIAMOND_WEIGHT',
  DIAMOND_QUALITY = 'DIAMOND_QUALITY',
  VENDOR_NAME = 'VENDOR_NAME',
  LABOR_HEAD = 'LABOR_HEAD',
  LABOR_RULE = 'LABOR_RULE',
  OVERHEAD_RULE = 'OVERHEAD_RULE',
  FINDING_HEAD = 'FINDING_HEAD',
  PACKET_STONE = 'PACKET_STONE',
  PACKET_SHAPE = 'PACKET_SHAPE',
  PACKET_SIZE = 'PACKET_SIZE',
  PACKET_CUT = 'PACKET_CUT',
  PACKET_COLOR = 'PACKET_COLOR',
  PACKET_QUALITY = 'PACKET_QUALITY',
}

export enum FindingPriceIn {
  PIECES = 'PIECES',
  GRAM = 'GRAM',
  PAIR = 'PAIR',
  INCHES = 'INCHES',
}

export enum LaborApplyMode {
  FLAT = 'FLAT',
  PER_STONE = 'PER_STONE',
  PER_GRAM = 'PER_GRAM',
  PER_GROUP = 'PER_GROUP',
}

export enum OverheadApplyMode {
  PERCENT_MATERIALS = 'PERCENT_MATERIALS',
  PERCENT_BOM_SUBTOTAL = 'PERCENT_BOM_SUBTOTAL',
  FLAT = 'FLAT',
}

export enum OverheadRuleApplyMode {
  PER_OF_MATERIALS = 'per_of_materials',
  FLAT = 'flat',
}

export abstract class MasterTableEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ length: 255 })
  value: string;

  @Column({ name: 'normalized_value', length: 255 })
  normalizedValue: string;

  @Column({ name: 'alias_name', length: 255, nullable: true })
  aliasName: string | null;

  @Column({ name: 'normalized_alias', length: 255, nullable: true })
  normalizedAlias: string | null;

  @Column({ name: 'scope_key', length: 64, default: '' })
  scopeKey: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeMasterFields() {
    this.value = this.value.trim();
    this.normalizedValue = this.value.toLowerCase();
    this.aliasName = this.normalizeOptionalText(this.aliasName) || this.value;
    this.normalizedAlias = this.aliasName.toLowerCase();
    this.scopeKey = this.normalizeOptionalText(this.scopeKey) || '';
    this.description = this.normalizeOptionalText(this.description);
  }

  protected normalizeOptionalText(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}

export abstract class JewelryGroupScopedMasterEntity extends MasterTableEntity {
  @Column({ name: 'jewelry_group_id', type: 'int', nullable: true })
  jewelryGroupId: number | null;
}

@Entity('jewelry_groups')
export class JewelryGroupMaster extends MasterTableEntity {}

@Entity('collections')
export class CollectionMaster extends JewelryGroupScopedMasterEntity {
  @ManyToOne(() => JewelryGroupMaster, { nullable: true })
  @JoinColumn({ name: 'jewelry_group_id' })
  jewelryGroupMaster: JewelryGroupMaster | null;
}

@Entity('jewelry_sizes')
export class JewelrySizeMaster extends JewelryGroupScopedMasterEntity {
  @ManyToOne(() => JewelryGroupMaster, { nullable: true })
  @JoinColumn({ name: 'jewelry_group_id' })
  jewelryGroupMaster: JewelryGroupMaster | null;
}

@Entity('tags')
export class TagMaster extends MasterTableEntity {}

@Entity('design_statuses')
export class DesignStatusMaster extends MasterTableEntity {}

@Entity('design_stages')
export class StageMaster extends MasterTableEntity {}

@Entity('metal_names')
export class MetalNameMaster extends MasterTableEntity {
  @Column({ name: 'market_price_per_ounce', type: 'double', nullable: true })
  marketPricePerOunce: number | null;

  @Column({ name: 'market_price_per_gm', type: 'double', nullable: true })
  marketPricePerGm: number | null;

  @Column({ name: 'live_price_per_gm', type: 'double', nullable: true })
  livePricePerGm: number | null;
}

@Entity('metal_colors')
export class MetalColorMaster extends MasterTableEntity {
  @Column({ name: 'metal_id', type: 'int', nullable: true })
  metalId: number | null;

  @ManyToOne(() => MetalNameMaster, { nullable: true })
  @JoinColumn({ name: 'metal_id' })
  metalMaster: MetalNameMaster | null;
}

@Entity('metal_purities')
export class MetalPurityMaster extends MasterTableEntity {
  @Column({ name: 'metal_id', type: 'int', nullable: true })
  metalId: number | null;

  @ManyToOne(() => MetalNameMaster, { nullable: true })
  @JoinColumn({ name: 'metal_id' })
  metalMaster: MetalNameMaster | null;

  @Column({ name: 'purity_percentage', type: 'decimal', precision: 8, scale: 3, nullable: true })
  purityPercentage: number | null;
}

@Entity('metal_caratages')
export class MetalCaratageMaster extends MasterTableEntity {
  @Column({ name: 'metal_id', type: 'int', nullable: true })
  metalId: number | null;

  @Column({ name: 'metal_color_id', type: 'int', nullable: true })
  metalColorId: number | null;

  @Column({ name: 'metal_purity_id', type: 'int', nullable: true })
  metalPurityId: number | null;

  @ManyToOne(() => MetalNameMaster, { nullable: true })
  @JoinColumn({ name: 'metal_id' })
  metalMaster: MetalNameMaster | null;

  @ManyToOne(() => MetalColorMaster, { nullable: true })
  @JoinColumn({ name: 'metal_color_id' })
  metalColorMaster: MetalColorMaster | null;

  @ManyToOne(() => MetalPurityMaster, { nullable: true })
  @JoinColumn({ name: 'metal_purity_id' })
  metalPurityMaster: MetalPurityMaster | null;

  @Column({ name: 'purity_percentage', type: 'decimal', precision: 8, scale: 3, nullable: true })
  purityPercentage: number | null;

  @Column({ name: 'market_price_per_ounce', type: 'decimal', precision: 12, scale: 2, nullable: true })
  marketPricePerOunce: number | null;

  @Column({ name: 'market_price_per_gm', type: 'decimal', precision: 12, scale: 4, nullable: true })
  marketPricePerGm: number | null;

  @Column({ name: 'live_price_per_gm', type: 'decimal', precision: 12, scale: 4, nullable: true })
  livePricePerGm: number | null;

  @Column({ name: 'default_wastage_percent', type: 'decimal', precision: 8, scale: 3, nullable: true })
  defaultWastagePercent: number | null;
}

@Entity('gold_colours')
export class GoldColourMaster extends MasterTableEntity {}

@Entity('diamond_types')
export class DiamondTypeMaster extends MasterTableEntity {}

@Entity('diamond_spreads')
export class DiamondSpreadMaster extends MasterTableEntity {}

@Entity('diamond_weights')
export class DiamondWeightMaster extends MasterTableEntity {}

@Entity('diamond_qualities')
export class DiamondQualityMaster extends MasterTableEntity {}

@Entity('vendor_names')
export class VendorNameMaster extends MasterTableEntity {
  @Column({ length: 255, nullable: true })
  email: string | null;
}

@Entity('labor_heads')
export class LaborHeadMaster extends MasterTableEntity {}

@Entity('labor_rules')
export class LaborRuleMaster extends MasterTableEntity {
  @Column({ name: 'labor_apply_mode', type: 'varchar', length: 32, nullable: true })
  laborApplyMode: LaborApplyMode | null;

  @Column({ name: 'flat_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  flatCost: number | null;

  @Column({ name: 'rate_per_stone', type: 'decimal', precision: 12, scale: 2, nullable: true })
  ratePerStone: number | null;

  @Column({ name: 'rate_per_gram', type: 'decimal', precision: 12, scale: 2, nullable: true })
  ratePerGram: number | null;

  @Column({ name: 'rate_per_group', type: 'decimal', precision: 12, scale: 2, nullable: true })
  ratePerGroup: number | null;
}

@Entity('overhead_rules')
export class OverheadRuleMaster extends MasterTableEntity {
  @Column({ name: 'jewelry_group_id', type: 'int', nullable: true })
  jewelryGroupId: number | null;

  @ManyToOne(() => JewelryGroupMaster, { nullable: true })
  @JoinColumn({ name: 'jewelry_group_id' })
  jewelryGroupMaster: JewelryGroupMaster | null;

  @Column({
    name: 'overhead_apply_mode',
    type: 'enum',
    enum: OverheadRuleApplyMode,
    nullable: true,
  })
  overheadApplyMode: OverheadRuleApplyMode | null;

  @Column({ name: 'rate_percent', type: 'decimal', precision: 8, scale: 3, nullable: true })
  ratePercent: number | null;

  @Column({ name: 'flat_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  flatAmount: number | null;
}

@Entity('finding_heads')
export class FindingHeadMaster extends MasterTableEntity {
  @Column({ name: 'finding_no', length: 100, nullable: true })
  findingNo: string | null;

  @Column({ name: 'metal_caratage', length: 100, nullable: true })
  metalCaratage: string | null;

  @Column({ name: 'price_in', type: 'enum', enum: FindingPriceIn, nullable: true })
  priceIn: FindingPriceIn | null;

  @Column({ name: 'price_per_unit', type: 'decimal', precision: 12, scale: 2, nullable: true })
  pricePerUnit: number | null;

  @Column({ name: 'dimensions', length: 255, nullable: true })
  dimensions: string | null;

  @Column({ name: 'weight_per_unit', type: 'decimal', precision: 12, scale: 3, nullable: true })
  weightPerUnit: number | null;
}

@Entity('packet_stones')
export class PacketStoneMaster extends MasterTableEntity {}

@Entity('packet_shapes')
export class PacketShapeMaster extends MasterTableEntity {}

@Entity('packet_sizes')
export class PacketSizeMaster extends MasterTableEntity {}

@Entity('packet_cuts')
export class PacketCutMaster extends MasterTableEntity {}

@Entity('packet_colors')
export class PacketColorMaster extends MasterTableEntity {}

@Entity('packet_qualities')
export class PacketQualityMaster extends MasterTableEntity {}

export const DESIGN_MASTER_TABLE_ENTITIES = [
  JewelryGroupMaster,
  CollectionMaster,
  JewelrySizeMaster,
  TagMaster,
  DesignStatusMaster,
  StageMaster,
  MetalNameMaster,
  MetalColorMaster,
  MetalPurityMaster,
  MetalCaratageMaster,
  GoldColourMaster,
  DiamondTypeMaster,
  DiamondSpreadMaster,
  DiamondWeightMaster,
  DiamondQualityMaster,
  VendorNameMaster,
  LaborHeadMaster,
  LaborRuleMaster,
  OverheadRuleMaster,
  FindingHeadMaster,
  PacketStoneMaster,
  PacketShapeMaster,
  PacketSizeMaster,
  PacketCutMaster,
  PacketColorMaster,
  PacketQualityMaster,
] as const;

export const DESIGN_MASTER_TYPE_TABLE_MAP = {
  [DesignMasterType.JEWELRY_GROUP]: JewelryGroupMaster,
  [DesignMasterType.COLLECTION]: CollectionMaster,
  [DesignMasterType.JEWELRY_SIZE]: JewelrySizeMaster,
  [DesignMasterType.TAG]: TagMaster,
  [DesignMasterType.DESIGN_STATUS]: DesignStatusMaster,
  [DesignMasterType.STAGE]: StageMaster,
  [DesignMasterType.METAL_NAME]: MetalNameMaster,
  [DesignMasterType.METAL_COLOR]: MetalColorMaster,
  [DesignMasterType.METAL_PURITY]: MetalPurityMaster,
  [DesignMasterType.METAL_CARATAGE]: MetalCaratageMaster,
  [DesignMasterType.GOLD_COLOUR]: GoldColourMaster,
  [DesignMasterType.DIAMOND_TYPE]: DiamondTypeMaster,
  [DesignMasterType.DIAMOND_SPREAD]: DiamondSpreadMaster,
  [DesignMasterType.DIAMOND_WEIGHT]: DiamondWeightMaster,
  [DesignMasterType.DIAMOND_QUALITY]: DiamondQualityMaster,
  [DesignMasterType.VENDOR_NAME]: VendorNameMaster,
  [DesignMasterType.LABOR_HEAD]: LaborHeadMaster,
  [DesignMasterType.LABOR_RULE]: LaborRuleMaster,
  [DesignMasterType.OVERHEAD_RULE]: OverheadRuleMaster,
  [DesignMasterType.FINDING_HEAD]: FindingHeadMaster,
  [DesignMasterType.PACKET_STONE]: PacketStoneMaster,
  [DesignMasterType.PACKET_SHAPE]: PacketShapeMaster,
  [DesignMasterType.PACKET_SIZE]: PacketSizeMaster,
  [DesignMasterType.PACKET_CUT]: PacketCutMaster,
  [DesignMasterType.PACKET_COLOR]: PacketColorMaster,
  [DesignMasterType.PACKET_QUALITY]: PacketQualityMaster,
} as const;
