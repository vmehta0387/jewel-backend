import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Design } from './design.entity';
import { OverheadRuleMaster } from './design-master-tables.entity';

@Entity('design_overheads')
export class DesignOverhead {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number | string;

  @Column({ name: 'design_id', type: 'int' })
  designId: number | string;

  @Column({ name: 'overhead_rule_id', type: 'int', nullable: true })
  overheadRuleId: number | null;

  overheadHead?: string | null;

  @Column({ name: 'overhead_apply_mode', type: 'varchar', length: 32, nullable: true })
  overheadApplyMode: string | null;

  @Column({ name: 'rate_percent', type: 'decimal', precision: 8, scale: 3, nullable: true })
  ratePercent: number | null;

  @Column({ name: 'flat_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  flatAmount: number | null;

  @Column({ name: 'overhead_value', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  overheadValue: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Design, (design) => design.overheads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @ManyToOne(() => OverheadRuleMaster, { nullable: true })
  @JoinColumn({ name: 'overhead_rule_id' })
  overheadRuleMaster: OverheadRuleMaster | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
