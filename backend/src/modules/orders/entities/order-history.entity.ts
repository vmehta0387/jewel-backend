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
import { Order } from './order.entity';
import { User } from '../../users/entities/user.entity';

export type OrderHistoryActionType = 'ADD' | 'EDIT' | 'STATUS_CHANGE' | 'CANCEL' | 'SUSPEND' | 'RESUME';

export interface OrderHistoryChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

@Entity('order_history')
export class OrderHistory {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'action_type' })
  actionType: OrderHistoryActionType;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'json', nullable: true })
  changes: OrderHistoryChange[] | null;

  @Column({ name: 'performed_by', nullable: true })
  performedBy: string | null;

  @Column({ name: 'performed_by_name', nullable: true })
  performedByName: string | null;

  @Column({ name: 'performed_by_role', nullable: true })
  performedByRole: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performed_by' })
  performedByUser: User;

  @CreateDateColumn({ name: 'performed_at' })
  performedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
