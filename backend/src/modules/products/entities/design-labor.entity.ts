import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { randomUUID } from 'crypto';
import { Design } from './design.entity';

@Entity('design_labors')
export class DesignLabor {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'design_id' })
  designId: string;

  @Column({ name: 'labor_head', nullable: true })
  laborHead: string | null;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
