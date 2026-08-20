import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Design } from './design.entity';
import { User } from '../../users/entities/user.entity';

@Entity('design_stl_files')
export class DesignStlFile {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Index('idx_design_stl_files_design_id')
  @Column({ name: 'design_id', type: 'int', width: 11 })
  designId: number;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'file_url', length: 500 })
  fileUrl: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Index('idx_design_stl_files_uploaded_by')
  @Column({ name: 'uploaded_by', type: 'int', width: 11, nullable: true })
  uploadedBy: number | null;

  @ManyToOne(() => Design, (design) => design.stlFiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedByUser: User;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}
