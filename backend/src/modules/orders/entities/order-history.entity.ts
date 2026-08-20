import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
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
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Index('idx_order_history_order_id')
  @Column({ name: 'order_id', type: 'int', width: 11 })
  orderId: number;

  @Column({ name: 'action_type' })
  actionType: OrderHistoryActionType;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'json', nullable: true })
  changes: OrderHistoryChange[] | null;

  @Index('idx_order_history_performed_by')
  @Column({ name: 'performed_by', type: 'int', width: 11, nullable: true })
  performedBy: number | null;

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

  @CreateDateColumn({ name: 'performed_at', type: 'datetime' })
  performedAt: Date;
}
