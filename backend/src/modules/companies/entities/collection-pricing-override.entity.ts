import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Company } from './company.entity';

export enum CollectionType {
  ENGAGEMENT = 'ENGAGEMENT',
  ETERNITY = 'ETERNITY',
  FLORAL = 'FLORAL',
  WEDDING_BANDS = 'WEDDING_BANDS',
}

@Entity('collection_pricing_overrides')
export class CollectionPricingOverride {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'company_id', type: 'int', width: 11 })
  companyId: number;

  @Column({ name: 'collection_type', type: 'enum', enum: CollectionType })
  collectionType: CollectionType;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  multiplier: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => Company, company => company.collectionPricingOverrides)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

}
