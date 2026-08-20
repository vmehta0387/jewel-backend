import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Design } from './design.entity';

@Entity('design_relevant')
export class DesignRelevant {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'design_id', type: 'int', width: 11 })
  designId: number;

  @Column({ name: 'related_design_id', type: 'int', width: 11 })
  relatedDesignId: number;

  @ManyToOne(() => Design, (design) => design.relevantDesignLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @ManyToOne(() => Design, (design) => design.relatedToDesignLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'related_design_id' })
  relatedDesign: Design;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

}
