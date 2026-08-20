import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Branch } from './branch.entity';

@Entity('branch_pricing_slabs')
export class BranchPricingSlab {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'branch_id', type: 'int', width: 11 })
  branchId: number;

  @Column({ name: 'min_cost', type: 'decimal', precision: 10, scale: 2 })
  minCost: number;

  @Column({ name: 'max_cost', type: 'decimal', precision: 10, scale: 2 })
  maxCost: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  multiplier: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => Branch, branch => branch.pricingSlabs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

}
