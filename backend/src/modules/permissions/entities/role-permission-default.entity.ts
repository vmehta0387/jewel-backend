import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TaskPermission } from '../../../common/enums/task-permission.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { RoleDefaultPermissionAction } from './role-default-permission-action.entity';

@Entity('role_permission_defaults')
@Index(['role'], { unique: true })
export class RolePermissionDefault {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ length: 160, default: 'Default' })
  name: string;

  @Column({ name: 'task_permissions', type: 'simple-json', nullable: true })
  taskPermissions: TaskPermission[] | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => RoleDefaultPermissionAction, (action) => action.defaultProfile)
  actions: RoleDefaultPermissionAction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}