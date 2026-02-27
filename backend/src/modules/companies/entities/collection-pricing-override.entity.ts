import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, BeforeInsert } from 'typeorm';
import { randomUUID } from 'crypto';
import { Company } from './company.entity';

export enum CollectionType {
  ENGAGEMENT = 'ENGAGEMENT',
  ETERNITY = 'ETERNITY',
  FLORAL = 'FLORAL',
  WEDDING_BANDS = 'WEDDING_BANDS',
}

@Entity('collection_pricing_overrides')
export class CollectionPricingOverride {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

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

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
