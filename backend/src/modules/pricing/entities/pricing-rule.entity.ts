import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pricing_rules')
export class PricingRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rule_type', type: 'enum', enum: ['COMPANY', 'BRANCH', 'COLLECTION'] })
  ruleType: string;

  @Column({ name: 'entity_id' })
  entityId: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  multiplier: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
