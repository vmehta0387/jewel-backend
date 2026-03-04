import { BeforeInsert, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, Column } from 'typeorm';
import { randomUUID } from 'crypto';
import { Design } from './design.entity';

@Entity('design_relevant')
export class DesignRelevant {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'design_id' })
  designId: string;

  @Column({ name: 'related_design_id' })
  relatedDesignId: string;

  @ManyToOne(() => Design, (design) => design.relevantDesignLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @ManyToOne(() => Design, (design) => design.relatedToDesignLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'related_design_id' })
  relatedDesign: Design;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
