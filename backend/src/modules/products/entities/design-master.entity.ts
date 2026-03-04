import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';

export enum DesignMasterType {
  JEWELRY_GROUP = 'JEWELRY_GROUP',
  COLLECTION = 'COLLECTION',
  JEWELRY_SIZE = 'JEWELRY_SIZE',
  TAG = 'TAG',
  DESIGN_STATUS = 'DESIGN_STATUS',
  STAGE = 'STAGE',
  GOLD_COLOUR = 'GOLD_COLOUR',
  DIAMOND_TYPE = 'DIAMOND_TYPE',
  DIAMOND_SPREAD = 'DIAMOND_SPREAD',
  LABOR_HEAD = 'LABOR_HEAD',
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

@Entity('design_masters')
export class DesignMaster {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({
    name: 'master_type',
    type: 'enum',
    enum: DesignMasterType,
  })
  masterType: DesignMasterType;

  @Column({ length: 255 })
  value: string;

  @Column({ name: 'normalized_value', length: 255 })
  normalizedValue: string;

  @Column({ name: 'alias_name', length: 255, nullable: true })
  aliasName: string | null;

  @Column({ name: 'normalized_alias', length: 255, nullable: true })
  normalizedAlias: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'finding_no', length: 100, nullable: true })
  findingNo: string | null;

  @Column({ name: 'metal_caratage', length: 100, nullable: true })
  metalCaratage: string | null;

  @Column({
    name: 'price_in',
    type: 'enum',
    enum: FindingPriceIn,
    nullable: true,
  })
  priceIn: FindingPriceIn | null;

  @Column({ name: 'price_per_unit', type: 'decimal', precision: 12, scale: 2, nullable: true })
  pricePerUnit: number | null;

  @Column({ name: 'dimensions', length: 255, nullable: true })
  dimensions: string | null;

  @Column({ name: 'weight_per_unit', type: 'decimal', precision: 12, scale: 3, nullable: true })
  weightPerUnit: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) {
      this.id = randomUUID();
    }
    this.normalizeValue();
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.normalizeValue();
  }

  private normalizeValue() {
    this.value = this.value.trim();
    this.normalizedValue = this.value.toLowerCase();
    if (this.aliasName === undefined || this.aliasName === null || this.aliasName.trim().length === 0) {
      this.aliasName = this.value;
    } else {
      this.aliasName = this.aliasName.trim();
    }
    this.normalizedAlias = this.aliasName.toLowerCase();
    if (this.description !== undefined && this.description !== null) {
      const normalizedDescription = this.description.trim();
      this.description = normalizedDescription.length > 0 ? normalizedDescription : null;
    }
    if (this.findingNo !== undefined && this.findingNo !== null) {
      const normalizedFindingNo = this.findingNo.trim();
      this.findingNo = normalizedFindingNo.length > 0 ? normalizedFindingNo : null;
    }
    if (this.metalCaratage !== undefined && this.metalCaratage !== null) {
      const normalizedMetalCaratage = this.metalCaratage.trim();
      this.metalCaratage = normalizedMetalCaratage.length > 0 ? normalizedMetalCaratage : null;
    }
    if (this.dimensions !== undefined && this.dimensions !== null) {
      const normalizedDimensions = this.dimensions.trim();
      this.dimensions = normalizedDimensions.length > 0 ? normalizedDimensions : null;
    }
  }
}
