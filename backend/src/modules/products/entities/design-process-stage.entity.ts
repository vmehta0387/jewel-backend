import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { randomUUID } from 'crypto';
import { Design } from './design.entity';

export enum DesignDurationType {
  MINUTES = 'MINUTES',
  HOURS = 'HOURS',
  DAYS = 'DAYS',
}

@Entity('design_process_stages')
export class DesignProcessStage {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'design_id' })
  designId: string;

  @Column({ name: 'process_stage' })
  processStage: string;

  @Column({ name: 'net_weight', type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  netWeight: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  duration: number;

  @Column({
    name: 'duration_type',
    type: 'enum',
    enum: DesignDurationType,
    default: DesignDurationType.MINUTES,
  })
  durationType: DesignDurationType;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Design, (design) => design.processStages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
