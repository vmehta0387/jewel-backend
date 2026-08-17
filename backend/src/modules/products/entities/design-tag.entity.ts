import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Design } from './design.entity';
import { TagMaster } from './design-master-tables.entity';

@Entity('design_tags')
@Unique('uq_design_tags_design_tag', ['designId', 'tagId'])
export class DesignTag {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'design_id', type: 'int' })
  designId: number;

  @Column({ name: 'tag_id', type: 'int' })
  tagId: number;

  @ManyToOne(() => Design, (design) => design.designTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @ManyToOne(() => TagMaster)
  @JoinColumn({ name: 'tag_id' })
  tagMaster: TagMaster;
}
