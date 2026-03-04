import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { randomUUID } from 'crypto';
import { Design } from './design.entity';

@Entity('design_gemstones')
export class DesignGemstone {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'design_id' })
  designId: string;

  @Column({ name: 'packet_id', nullable: true })
  packetId: string | null;

  @Column({ nullable: true })
  stone: string | null;

  @Column({ nullable: true })
  shape: string | null;

  @Column({ nullable: true })
  size: string | null;

  @Column({ nullable: true })
  cut: string | null;

  @Column({ nullable: true })
  color: string | null;

  @Column({ nullable: true })
  quality: string | null;

  @Column({ name: 'stone_type', nullable: true })
  stoneType: string | null;

  @Column({ name: 'wt_per_pcs', type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  wtPerPcs: number;

  @Column({ type: 'int', default: 0 })
  pcs: number;

  @Column({ name: 'wt_in_cts', type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  wtInCts: number;

  @Column({ name: 'price_per_ct', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  pricePerCt: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  amount: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Design, (design) => design.gemstones, { onDelete: 'CASCADE' })
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
