import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationPriority {
  P0 = 'P0',
  P1 = 'P1',
  P2 = 'P2',
}

@Entity('notifications')
export class Notification {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'recipient_user_id', length: 36 })
  recipientUserId: string;

  @Column({ name: 'company_id', length: 36, nullable: true })
  companyId: string | null;

  @Column({ name: 'branch_id', length: 36, nullable: true })
  branchId: string | null;

  @Column({ length: 60 })
  type: string;

  @Column({ length: 8 })
  priority: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'entity_type', length: 60, nullable: true })
  entityType: string | null;

  @Column({ name: 'entity_id', length: 36, nullable: true })
  entityId: string | null;

  @Column({ name: 'action_url', type: 'text', nullable: true })
  actionUrl: string | null;

  @Column({ name: 'channel_in_app', default: true })
  channelInApp: boolean;

  @Column({ name: 'channel_email', default: false })
  channelEmail: boolean;

  @Column({ name: 'channel_push', default: false })
  channelPush: boolean;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'datetime', nullable: true })
  readAt: Date | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
