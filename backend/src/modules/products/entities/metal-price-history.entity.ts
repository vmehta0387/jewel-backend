import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MetalNameMaster } from './design-master-tables.entity';

@Entity('metal_price_history')
export class MetalPriceHistory {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'metal_name_id', type: 'int', width: 11, nullable: true })
  metalNameId: number | null;

  @Column({ name: 'market_price_per_ounce', type: 'decimal', precision: 12, scale: 2 })
  marketPricePerOunce: number;

  @Column({ name: 'market_price_per_gm', type: 'decimal', precision: 12, scale: 4 })
  marketPricePerGm: number;

  @Column({ name: 'live_price_per_gm', type: 'decimal', precision: 12, scale: 4 })
  livePricePerGm: number;

  @Column({ name: 'changed_by', type: 'int', width: 11, nullable: true })
  changedBy: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changed_by' })
  changedByUser: User | null;

  @ManyToOne(() => MetalNameMaster, { nullable: true })
  @JoinColumn({ name: 'metal_name_id' })
  metalNameMaster: MetalNameMaster | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

}
