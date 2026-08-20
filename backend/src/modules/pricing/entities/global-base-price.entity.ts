import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum GlobalBasePriceCategory {
  METAL = 'METAL',
  DIAMOND = 'DIAMOND',
}

export enum GlobalBasePriceUnit {
  GRAM = 'GRAM',
  CARAT = 'CARAT',
}

@Entity('global_base_prices')
export class GlobalBasePrice {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'enum',
    enum: GlobalBasePriceCategory,
  })
  category: GlobalBasePriceCategory;

  @Column({ name: 'reference_value', length: 255 })
  referenceValue: string;

  @Column({ name: 'sub_value', length: 255, nullable: true })
  subValue: string | null;

  @Column({ name: 'price_per_unit', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  pricePerUnit: number;

  @Column({
    type: 'enum',
    enum: GlobalBasePriceUnit,
  })
  unit: GlobalBasePriceUnit;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ name: 'effective_from', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  effectiveFrom: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'int', width: 11, nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'int', width: 11, nullable: true })
  updatedBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  beforeInsert() {
    this.normalize();
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.normalize();
  }

  private normalize() {
    this.referenceValue = this.referenceValue.trim();
    if (this.subValue !== undefined && this.subValue !== null) {
      const normalizedSubValue = this.subValue.trim();
      this.subValue = normalizedSubValue.length > 0 ? normalizedSubValue : null;
    }
    if (this.notes !== undefined && this.notes !== null) {
      const normalizedNotes = this.notes.trim();
      this.notes = normalizedNotes.length > 0 ? normalizedNotes : null;
    }
    this.currency = (this.currency || 'USD').trim().toUpperCase();
  }
}
