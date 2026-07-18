import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PermissionDataScope {
  OWN = 'OWN',
  BRANCH = 'BRANCH',
  COMPANY = 'COMPANY',
}

@Entity('user_permission_actions')
@Index(['userId', 'actionKey'], { unique: true })
export class UserPermissionAction {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'user_id', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'action_key', length: 160 })
  actionKey: string;

  @Column({ name: 'data_scope', type: 'enum', enum: PermissionDataScope, default: PermissionDataScope.OWN })
  dataScope: PermissionDataScope;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
