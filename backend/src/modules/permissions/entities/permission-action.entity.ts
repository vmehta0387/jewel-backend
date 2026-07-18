import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { TaskPermission } from '../../../common/enums/task-permission.enum';
import { PermissionModule } from './permission-module.entity';

export type PermissionPlatform = 'web' | 'mobile' | 'both';

@Entity('permission_actions')
export class PermissionAction {
  @PrimaryColumn('varchar', { length: 160 })
  key: string;

  @Column({ name: 'module_key', length: 80 })
  moduleKey: string;

  @ManyToOne(() => PermissionModule, (module) => module.actions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_key' })
  module: PermissionModule;

  @Column({ length: 160 })
  label: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'action_group', length: 120, nullable: true })
  group: string | null;

  @Column({ type: 'enum', enum: ['web', 'mobile', 'both'], default: 'web' })
  platform: PermissionPlatform;

  @Column({ name: 'legacy_permission', type: 'enum', enum: TaskPermission, nullable: true })
  legacyPermission: TaskPermission | null;

  @Column({ name: 'supports_scope', default: true })
  supportsScope: boolean;

  @Column({ default: false })
  sensitive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
