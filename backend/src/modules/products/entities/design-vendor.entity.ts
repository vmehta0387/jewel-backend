import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Design } from './design.entity';
import { VendorNameMaster } from './design-master-tables.entity';

@Entity('design_vendors')
export class DesignVendor {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number | string;

  @Column({ name: 'design_id', type: 'int' })
  designId: number | string;

  @Column({ name: 'vendor_name_id', type: 'int' })
  vendorNameId: number;

  supplierName?: string;

  @Column({ name: 'stock_type', nullable: true })
  stockType: string | null;

  @Column({ name: 'supplier_style_no', nullable: true })
  supplierStyleNo: string | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Design, (design) => design.vendors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @ManyToOne(() => VendorNameMaster)
  @JoinColumn({ name: 'vendor_name_id' })
  vendorNameMaster: VendorNameMaster;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

}
