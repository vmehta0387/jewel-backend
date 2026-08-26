import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PermissionDataScope } from './user-permission-action.entity';
import { RolePermissionDefault } from './role-permission-default.entity';

@Entity('role_default_permission_actions')
@Index(['defaultId', 'actionKey'], { unique: true })
export class RoleDefaultPermissionAction {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'default_id', type: 'int', width: 11 })
  defaultId: number;

  @ManyToOne(() => RolePermissionDefault, (defaultProfile) => defaultProfile.actions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'default_id' })
  defaultProfile: RolePermissionDefault;

  @Column({ name: 'action_key', length: 160 })
  actionKey: string;

  @Column({ name: 'data_scope', type: 'enum', enum: PermissionDataScope, default: PermissionDataScope.OWN })
  dataScope: PermissionDataScope;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}