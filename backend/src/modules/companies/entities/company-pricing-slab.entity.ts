import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, BeforeInsert } from 'typeorm';
import { randomUUID } from 'crypto';
import { Company } from './company.entity';

@Entity('company_pricing_slabs')
export class CompanyPricingSlab {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'min_cost', type: 'decimal', precision: 10, scale: 2 })
  minCost: number;

  @Column({ name: 'max_cost', type: 'decimal', precision: 10, scale: 2 })
  maxCost: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  multiplier: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => Company, company => company.pricingSlabs)
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
