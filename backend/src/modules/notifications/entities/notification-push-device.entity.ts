import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('notification_push_devices')
export class NotificationPushDevice {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'user_id', length: 36 })
  userId: string;

  @Column({ name: 'expo_push_token', length: 255, unique: true })
  expoPushToken: string;

  @Column({ length: 32, nullable: true })
  platform: string | null;

  @Column({ name: 'device_id', length: 128, nullable: true })
  deviceId: string | null;

  @Column({ name: 'app_version', length: 64, nullable: true })
  appVersion: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_registered_at', type: 'datetime', nullable: true })
  lastRegisteredAt: Date | null;

  @Column({ name: 'last_delivered_at', type: 'datetime', nullable: true })
  lastDeliveredAt: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
