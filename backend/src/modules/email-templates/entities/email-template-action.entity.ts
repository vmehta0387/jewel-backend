import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EmailTemplate } from './email-template.entity';

@Entity('email_template_actions')
export class EmailTemplateAction {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'action_type', length: 100 })
  actionType: string;

  @Column({ name: 'template_id', type: 'int' })
  templateId: number;

  @Column({ name: 'recipient_role', length: 60, nullable: true })
  recipientRole: string | null;

  @Column({ length: 30, default: 'EMAIL' })
  channel: string;

  @Column({ type: 'int', default: 100 })
  priority: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => EmailTemplate, (template) => template.actions, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: EmailTemplate;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}