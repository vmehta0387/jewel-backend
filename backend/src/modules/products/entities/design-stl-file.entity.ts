import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { Design } from './design.entity';
import { User } from '../../users/entities/user.entity';

@Entity('design_stl_files')
export class DesignStlFile {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'design_id' })
  designId: string;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'file_url' })
  fileUrl: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy: string | null;

  @ManyToOne(() => Design, (design) => design.stlFiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedByUser: User;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
