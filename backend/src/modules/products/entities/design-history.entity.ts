import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Design } from './design.entity';
import { User } from '../../users/entities/user.entity';

@Entity('design_history')
export class DesignHistory {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'design_id', type: 'int', width: 11 })
  designId: number;

  @Column({ name: 'action_type' })
  actionType: string;

  @Column({ type: 'text' })
  remarks: string;

  @Column({ name: 'performed_by', type: 'int', width: 11, nullable: true })
  performedBy: number | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @ManyToOne(() => Design, (design) => design.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performed_by' })
  performedByUser: User;

  @CreateDateColumn({ name: 'performed_at' })
  performedAt: Date;

}
