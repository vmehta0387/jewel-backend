import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('help_requests')
export class HelpRequest {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'contact_info', length: 255 })
  contactInfo: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ length: 40, default: 'OPEN' })
  status: string;

  @Column({ name: 'client_platform', length: 40, nullable: true })
  clientPlatform: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
