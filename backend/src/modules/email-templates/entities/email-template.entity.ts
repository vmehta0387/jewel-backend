import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmailTemplateAction } from './email-template-action.entity';
import { EmailTemplateVersion } from './email-template-version.entity';

export enum EmailTemplateStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ length: 120, unique: true })
  key: string;

  @Column({ length: 180 })
  name: string;

  @Column({ length: 80 })
  category: string;

  @Column({ length: 255 })
  subject: string;

  @Column({ length: 255, nullable: true })
  preheader: string | null;

  @Column({ type: 'longtext' })
  html: string;

  @Column({ type: 'longtext', nullable: true })
  text: string | null;

  @Column({ name: 'required_variables', type: 'json', nullable: true })
  requiredVariables: string[] | null;

  @Column({ name: 'optional_variables', type: 'json', nullable: true })
  optionalVariables: string[] | null;

  @Column({ length: 20, default: EmailTemplateStatus.DRAFT })
  status: EmailTemplateStatus;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @OneToMany(() => EmailTemplateAction, (action) => action.template)
  actions: EmailTemplateAction[];

  @OneToMany(() => EmailTemplateVersion, (version) => version.template)
  versions: EmailTemplateVersion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}