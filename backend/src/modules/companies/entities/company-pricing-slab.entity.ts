import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity('company_pricing_slabs')
export class CompanyPricingSlab {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'company_id', type: 'int', width: 11 })
  companyId: number;

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

}
