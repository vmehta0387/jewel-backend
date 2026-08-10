import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from '../../users/entities/user.entity';

export interface ActivityEventChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

@Entity('activity_events')
@Index('idx_activity_events_user_created_at', ['userId', 'createdAt'])
export class ActivityEvent {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Index('idx_activity_events_user_id')
  @Column({ name: 'user_id', length: 36 })
  userId: string;

  @Index('idx_activity_events_device_id')
  @Column({ name: 'device_id', length: 120, nullable: true })
  deviceId: string | null;

  @Index('idx_activity_events_module')
  @Column({ length: 80 })
  module: string;

  @Column({ length: 120 })
  event: string;

  @Column({ length: 120, nullable: true })
  screen: string | null;

  @Index('idx_activity_events_entity_type')
  @Column({ name: 'entity_type', length: 80, nullable: true })
  entityType: string | null;

  @Index('idx_activity_events_entity_id')
  @Column({ name: 'entity_id', length: 120, nullable: true })
  entityId: string | null;

  @Column({ type: 'json', nullable: true })
  changes: ActivityEventChange[] | null;

  @Column({ type: 'json', nullable: true })
  data: Record<string, unknown> | null;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index('idx_activity_events_created_at')
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
