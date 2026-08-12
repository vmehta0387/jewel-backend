import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Design } from './design.entity';
import {
  DiamondTypeMaster,
  PacketColorMaster,
  PacketCutMaster,
  PacketQualityMaster,
  PacketShapeMaster,
  PacketSizeMaster,
  PacketStoneMaster,
} from './design-master-tables.entity';

@Entity('design_gemstones')
export class DesignGemstone {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number | string;

  @Column({ name: 'design_id', type: 'int' })
  designId: number | string;

  @Column({ name: 'packet_id', type: 'int', nullable: true })
  packetId: number | null;

  @Column({ name: 'stone_id', type: 'int', nullable: true })
  stoneId: number | null;

  @Column({ name: 'shape_id', type: 'int', nullable: true })
  shapeId: number | null;

  @Column({ name: 'size_id', type: 'int', nullable: true })
  sizeId: number | null;

  @Column({ name: 'cut_id', type: 'int', nullable: true })
  cutId: number | null;

  @Column({ name: 'color_id', type: 'int', nullable: true })
  colorId: number | null;

  @Column({ name: 'quality_id', type: 'int', nullable: true })
  qualityId: number | null;

  @Column({ name: 'stone_type_id', type: 'int', nullable: true })
  stoneTypeId: number | null;

  stone?: string | null;
  shape?: string | null;
  size?: string | null;
  cut?: string | null;
  color?: string | null;
  quality?: string | null;
  stoneType?: string | null;

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

  @ManyToOne(() => PacketStoneMaster, { nullable: true })
  @JoinColumn({ name: 'stone_id' })
  stoneMaster: PacketStoneMaster | null;

  @ManyToOne(() => PacketShapeMaster, { nullable: true })
  @JoinColumn({ name: 'shape_id' })
  shapeMaster: PacketShapeMaster | null;

  @ManyToOne(() => PacketSizeMaster, { nullable: true })
  @JoinColumn({ name: 'size_id' })
  sizeMaster: PacketSizeMaster | null;

  @ManyToOne(() => PacketCutMaster, { nullable: true })
  @JoinColumn({ name: 'cut_id' })
  cutMaster: PacketCutMaster | null;

  @ManyToOne(() => PacketColorMaster, { nullable: true })
  @JoinColumn({ name: 'color_id' })
  colorMaster: PacketColorMaster | null;

  @ManyToOne(() => PacketQualityMaster, { nullable: true })
  @JoinColumn({ name: 'quality_id' })
  qualityMaster: PacketQualityMaster | null;

  @ManyToOne(() => DiamondTypeMaster, { nullable: true })
  @JoinColumn({ name: 'stone_type_id' })
  stoneTypeMaster: DiamondTypeMaster | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

}
