import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum DesignMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  STL = 'STL',
}

@Entity('design_media_library')
export class DesignMediaLibrary {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'media_type', type: 'enum', enum: DesignMediaType })
  mediaType: DesignMediaType;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'file_key' })
  fileKey: string;

  @Column({ name: 'mime_type', nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: string | null;

  @Column({ name: 'uploaded_by', type: 'int', width: 11, nullable: true })
  uploadedBy: number | null;

  @Column({ name: 'status', type: 'int', default: 1 })
  status: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedByUser: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
