import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Design } from './design.entity';
import { FindingHeadMaster } from './design-master-tables.entity';

@Entity('design_findings')
export class DesignFinding {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'design_id', type: 'int', width: 11 })
  designId: number;

  @Column({ name: 'finding_head_id', type: 'int', width: 11, nullable: true })
  findingHeadId: number | null;

  findingHead?: string | null;

  @Column({ name: 'price_per_unit', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  pricePerUnit: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  units: number;

  @Column({ name: 'total_weight', type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  totalWeight: number;

  @Column({ name: 'finding_value', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  findingValue: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Design, (design) => design.findings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @ManyToOne(() => FindingHeadMaster, { nullable: true })
  @JoinColumn({ name: 'finding_head_id' })
  findingHeadMaster: FindingHeadMaster | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

}
