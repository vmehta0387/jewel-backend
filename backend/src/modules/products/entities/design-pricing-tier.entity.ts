import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Design } from './design.entity';

export enum DesignPricingIncrementBy {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

@Entity('design_pricing_tiers')
export class DesignPricingTier {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number | string;

  @Column({ name: 'design_id', type: 'int' })
  designId: number | string;

  @Column()
  name: string;

  @Column({
    name: 'increment_by',
    type: 'enum',
    enum: DesignPricingIncrementBy,
    default: DesignPricingIncrementBy.PERCENTAGE,
  })
  incrementBy: DesignPricingIncrementBy;

  @Column({ nullable: true })
  unit: string | null;

  @Column({ name: 'weight_by', nullable: true })
  weightBy: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  value: number;

  @Column({ name: 'selling_price', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  sellingPrice: number;

  @Column({ nullable: true })
  code: string | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Design, (design) => design.pricingTiers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

}
