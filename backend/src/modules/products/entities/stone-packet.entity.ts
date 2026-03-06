import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';

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
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'packet_name', unique: true })
  packetName: string;

  @Column({ name: 'stock_type', nullable: true })
  stockType: string | null;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
