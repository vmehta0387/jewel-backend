import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { Order } from '../../orders/entities/order.entity';
import { SpiffLedgerEvent } from '../enums/spiff-ledger-event.enum';

@Entity('spiff_point_ledger')
export class SpiffPointLedger {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'user_id', type: 'int', width: 11 })
  userId: number;

  @Column({ name: 'company_id', type: 'int', width: 11, nullable: true })
  companyId: number | null;

  @Column({ name: 'branch_id', type: 'int', width: 11, nullable: true })
  branchId: number | null;

  @Column({ name: 'order_id', type: 'int', width: 11, nullable: true })
  orderId: number | null;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: SpiffLedgerEvent,
  })
  eventType: SpiffLedgerEvent;

  @Column({ name: 'event_key', length: 150, nullable: true, unique: true })
  eventKey: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  points: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company | null;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch | null;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
