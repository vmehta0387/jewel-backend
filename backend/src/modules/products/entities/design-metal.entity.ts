import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { randomUUID } from 'crypto';
import { Design } from './design.entity';

@Entity('design_metals')
export class DesignMetal {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'design_id' })
  designId: string;

  @Column({ name: 'gold_colour', nullable: true })
  goldColour: string | null;

  @Column({ name: 'net_wt', type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  netWt: number;

  @Column({ name: 'wastage_percent', type: 'decimal', precision: 8, scale: 3, default: 0.0 })
  wastagePercent: number;

  @Column({ name: 'wastage_wt', type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  wastageWt: number;

  @Column({ name: 'total_wt', type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  totalWt: number;

  @Column({ name: 'price_per_gm', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  pricePerGm: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  value: number;

  @Column({ default: 0 })
  components: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Design, (design) => design.metals, { onDelete: 'CASCADE' })
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
