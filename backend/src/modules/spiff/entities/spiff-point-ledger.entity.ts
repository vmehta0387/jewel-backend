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
import { Company } from '../../companies/entities/company.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { Order } from '../../orders/entities/order.entity';
import { SpiffLedgerEvent } from '../enums/spiff-ledger-event.enum';

@Entity('spiff_point_ledger')
export class SpiffPointLedger {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'company_id', nullable: true })
  companyId: string | null;

  @Column({ name: 'branch_id', nullable: true })
  branchId: string | null;

  @Column({ name: 'order_id', nullable: true })
  orderId: string | null;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: SpiffLedgerEvent,
  })
  eventType: SpiffLedgerEvent;

  @Column({ name: 'event_key', length: 150, nullable: true, unique: true })
  eventKey: string | null;

  @Column({ type: 'int' })
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

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
