import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { PermissionAction } from './permission-action.entity';

@Entity('permission_modules')
export class PermissionModule {
  @PrimaryColumn('varchar', { length: 80 })
  key: string;

  @Column({ length: 160 })
  label: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 80, nullable: true })
  icon: string | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => PermissionAction, (action) => action.module)
  actions: PermissionAction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
