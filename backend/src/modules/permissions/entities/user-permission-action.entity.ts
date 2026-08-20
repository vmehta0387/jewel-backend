import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PermissionDataScope {
  OWN = 'OWN',
  BRANCH = 'BRANCH',
  COMPANY = 'COMPANY',
}

@Entity('user_permission_actions')
@Index(['userId', 'actionKey'], { unique: true })
export class UserPermissionAction {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'user_id', type: 'int', width: 11 })
  userId: number;

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
