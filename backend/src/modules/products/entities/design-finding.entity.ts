import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { randomUUID } from 'crypto';
import { Design } from './design.entity';

@Entity('design_findings')
export class DesignFinding {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'design_id' })
  designId: string;

  @Column({ name: 'finding_head', nullable: true })
  findingHead: string | null;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
