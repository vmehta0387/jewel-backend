import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from '../../users/entities/user.entity';

export enum DesignMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  STL = 'STL',
}

@Entity('design_media_library')
export class DesignMediaLibrary {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

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

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedByUser: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
