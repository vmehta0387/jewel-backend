import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EmailTemplate, EmailTemplateStatus } from './email-template.entity';

@Entity('email_template_versions')
export class EmailTemplateVersion {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'template_id', type: 'int' })
  templateId: number;

  @Column({ type: 'int' })
  version: number;

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

  @Column({ length: 20 })
  status: EmailTemplateStatus;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => EmailTemplate, (template) => template.versions, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: EmailTemplate;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}