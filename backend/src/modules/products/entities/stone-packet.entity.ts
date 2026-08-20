import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JoinColumn, ManyToOne } from 'typeorm';
import {
  PacketColorMaster,
  PacketCutMaster,
  PacketQualityMaster,
  PacketShapeMaster,
  PacketSizeMaster,
  PacketStoneMaster,
} from './design-master-tables.entity';

export enum StoneWeightUnit {
  CTS = 'CTS',
  GMS = 'GMS',
}

export enum StonePacketPriceIn {
  WT = 'WT',
  PCS = 'PCS',
}

@Entity('stone_packets')
export class StonePacket {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ name: 'barcode', length: 32, unique: true, nullable: true })
  barcode: string | null;

  @Column({ name: 'packet_name', unique: true })
  packetName: string;

  @Column({ name: 'stock_type', nullable: true })
  stockType: string | null;

  @Column({ name: 'stone_id', type: 'int', width: 11, nullable: true })
  stoneId: number | null;

  @Column({ name: 'shape_id', type: 'int', width: 11, nullable: true })
  shapeId: number | null;

  @Column({ name: 'size_id', type: 'int', width: 11, nullable: true })
  sizeId: number | null;

  @Column({ name: 'cut_id', type: 'int', width: 11, nullable: true })
  cutId: number | null;

  @Column({ name: 'color_id', type: 'int', width: 11, nullable: true })
  colorId: number | null;

  @Column({ name: 'quality_id', type: 'int', width: 11, nullable: true })
  qualityId: number | null;

  @Column({
    name: 'price_in',
    type: 'enum',
    enum: StonePacketPriceIn,
    default: StonePacketPriceIn.WT,
  })
  priceIn: StonePacketPriceIn;

  @Column({ name: 'selling_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  sellingPrice: number | null;

  @Column({ name: 'weight_per_pc', type: 'decimal', precision: 12, scale: 3, nullable: true })
  weightPerPc: number | null;

  @Column({ type: 'int', default: 0 })
  pieces: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  weight: number;

  @Column({
    name: 'weight_unit',
    type: 'enum',
    enum: StoneWeightUnit,
    default: StoneWeightUnit.CTS,
  })
  weightUnit: StoneWeightUnit;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
