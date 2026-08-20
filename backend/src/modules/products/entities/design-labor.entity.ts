import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Design } from './design.entity';
import { LaborHeadMaster, LaborRuleMaster } from './design-master-tables.entity';

@Entity('design_labors')
export class DesignLabor {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'design_id', type: 'int', width: 11 })
  designId: number;

  @Column({ name: 'labor_head_id', type: 'int', width: 11, nullable: true })
  laborHeadId: number | null;

  @Column({ name: 'labor_rule_id', type: 'int', width: 11, nullable: true })
  laborRuleId: number | null;

  laborHead?: string | null;

  @Column({ name: 'labor_per_unit', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  laborPerUnit: number;

  @Column({ name: 'unit_qty', type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  unitQty: number;

  @Column({ name: 'labor_value', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  laborValue: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Design, (design) => design.labors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @ManyToOne(() => LaborHeadMaster, { nullable: true })
  @JoinColumn({ name: 'labor_head_id' })
  laborHeadMaster: LaborHeadMaster | null;

  @ManyToOne(() => LaborRuleMaster, { nullable: true })
  @JoinColumn({ name: 'labor_rule_id' })
  laborRuleMaster: LaborRuleMaster | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

}
