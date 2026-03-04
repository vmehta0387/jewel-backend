import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { randomUUID } from 'crypto';
import { Design } from './design.entity';

@Entity('design_vendors')
export class DesignVendor {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'design_id' })
  designId: string;

  @Column({ name: 'supplier_name' })
  supplierName: string;

  @Column({ name: 'stock_type', nullable: true })
  stockType: string | null;

  @Column({ name: 'supplier_style_no', nullable: true })
  supplierStyleNo: string | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Design, (design) => design.vendors, { onDelete: 'CASCADE' })
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
