import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Design } from './design.entity';
import { StageMaster } from './design-master-tables.entity';

export enum DesignDurationType {
  MINUTES = 'MINUTES',
  HOURS = 'HOURS',
  DAYS = 'DAYS',
}

@Entity('design_process_stages')
export class DesignProcessStage {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number | string;

  @Column({ name: 'design_id', type: 'int' })
  designId: number | string;

  @Column({ name: 'process_stage_id', type: 'int' })
  processStageId: number;

  processStage?: string;

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

  @ManyToOne(() => StageMaster)
  @JoinColumn({ name: 'process_stage_id' })
  processStageMaster: StageMaster;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

}
