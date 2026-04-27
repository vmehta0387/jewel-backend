import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('spiff_system_settings')
export class SpiffSetting {
  @PrimaryColumn({ name: 'setting_key', type: 'varchar', length: 100 })
  settingKey: string;

  @Column({ name: 'setting_value', type: 'varchar', length: 255 })
  settingValue: string;

  @Column({ name: 'updated_by_id', type: 'varchar', length: 36, nullable: true })
  updatedById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
