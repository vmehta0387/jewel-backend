import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from '../../users/entities/user.entity';
import { MetalNameMaster } from './design-master-tables.entity';

@Entity('metal_price_history')
export class MetalPriceHistory {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'metal_name_id', type: 'int', nullable: true })
  metalNameId: number | null;

  @Column({ name: 'market_price_per_ounce', type: 'decimal', precision: 12, scale: 2 })
  marketPricePerOunce: number;

  @Column({ name: 'market_price_per_gm', type: 'decimal', precision: 12, scale: 4 })
  marketPricePerGm: number;

  @Column({ name: 'live_price_per_gm', type: 'decimal', precision: 12, scale: 4 })
  livePricePerGm: number;

  @Column({ name: 'changed_by', nullable: true })
  changedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changed_by' })
  changedByUser: User | null;

  @ManyToOne(() => MetalNameMaster, { nullable: true })
  @JoinColumn({ name: 'metal_name_id' })
  metalNameMaster: MetalNameMaster | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
