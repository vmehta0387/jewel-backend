import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Design } from './design.entity';
import { MetalCaratageMaster } from './design-master-tables.entity';

@Entity('design_metals')
export class DesignMetal {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number | string;

  @Column({ name: 'design_id', type: 'int' })
  designId: number | string;

  @Column({ name: 'metal_caratage_id', type: 'int', nullable: true })
  metalCaratageId: number | null;

  goldColour?: string | null;
  metalCaratage?: string | null;

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

  @ManyToOne(() => MetalCaratageMaster, { nullable: true })
  @JoinColumn({ name: 'metal_caratage_id' })
  metalCaratageMaster: MetalCaratageMaster | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

}
