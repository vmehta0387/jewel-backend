import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { Company } from '../../companies/entities/company.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { Design } from '../../products/entities/design.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_number', unique: true })
  orderNumber: string;

  @Column({ name: 'company_id', nullable: true })
  companyId: string | null;

  @Column({ name: 'branch_id', nullable: true })
  branchId: string | null;

  @Column({ name: 'design_id', type: 'int', nullable: true })
  designId: number | string | null;

  @Column({ name: 'sales_rep_id', nullable: true })
  salesRepId: string | null;

  @Column({ name: 'delivery_date', type: 'date', nullable: true })
  deliveryDate: string | null;

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'price', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  price: number;

  @Column({ name: 'short_description', type: 'text', nullable: true })
  shortDescription: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 255, nullable: true })
  customerName: string | null;

  @Column({ name: 'customer_phone', type: 'varchar', length: 50, nullable: true })
  customerPhone: string | null;

  @Column({ name: 'customer_email', type: 'varchar', length: 255, nullable: true })
  customerEmail: string | null;

  @Column({ name: 'purchase_order_number', type: 'varchar', length: 120, nullable: true })
  purchaseOrderNumber: string | null;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.QUOTE })
  status: OrderStatus;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'ship_date', type: 'date', nullable: true })
  shipDate: string | null;

  @Column({ name: 'ship_via', type: 'varchar', length: 50, nullable: true })
  shipVia: string | null;

  @Column({ name: 'tracking_no', type: 'varchar', length: 120, nullable: true })
  trackingNo: string | null;

  @Column({ name: 'invoice_no', type: 'varchar', length: 120, nullable: true })
  invoiceNo: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @ManyToOne(() => Design, { nullable: true })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sales_rep_id' })
  salesRep: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  formatOrderNumber() {
    if (this.orderNumber) {
      this.orderNumber = this.orderNumber.trim().toUpperCase();
    }
  }
}
