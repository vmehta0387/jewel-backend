import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { CollectionType } from '../../../common/enums/collection-type.enum';

@Entity('ring_styles')
export class RingStyle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'sku_prefix' })
  skuPrefix: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'collection_type', type: 'enum', enum: CollectionType })
  collectionType: CollectionType;

  @Column({ name: 'collection_multiplier', type: 'decimal', precision: 5, scale: 2, default: 1.00 })
  collectionMultiplier: number;

  @Column({ name: 'base_labor_cost', type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  baseLaborCost: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
