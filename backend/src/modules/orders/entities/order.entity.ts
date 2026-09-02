import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { Company } from '../../companies/entities/company.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { Design } from '../../products/entities/design.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'order_number', unique: true })
  orderNumber: string;

  @Index('idx_orders_company_id')
  @Column({ name: 'company_id', type: 'int', width: 11, nullable: true })
  companyId: number | null;

  @Index('idx_orders_branch_id')
  @Column({ name: 'branch_id', type: 'int', width: 11, nullable: true })
  branchId: number | null;

  @Index('idx_orders_design_id')
  @Column({ name: 'design_id', type: 'int', width: 11, nullable: true })
  designId: number | null;

  @Index('idx_orders_sales_rep_id')
  @Column({ name: 'sales_rep_id', type: 'int', width: 11, nullable: true })
  salesRepId: number | null;

  @Index('idx_orders_created_by')
  @Column({ name: 'created_by', type: 'int', width: 11, nullable: true })
  createdBy: number | null;

  @Index('idx_orders_updated_by')
  @Column({ name: 'updated_by', type: 'int', width: 11, nullable: true })
  updatedBy: number | null;

  @Column({ name: 'delivery_date', type: 'date', nullable: true })
  deliveryDate: string | null;

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'price', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  price: number;

  // Historical pricing values captured when the order is created. These must not
  // be recalculated from later Design, Company, or Branch pricing changes.
  @Column({ name: 'base_cost_snapshot', type: 'decimal', precision: 12, scale: 2, nullable: true })
  baseCostSnapshot: number | null;

  @Column({ name: 'company_cost_snapshot', type: 'decimal', precision: 12, scale: 2, nullable: true })
  companyCostSnapshot: number | null;

  @Column({ name: 'company_multiplier_snapshot', type: 'decimal', precision: 5, scale: 2, nullable: true })
  companyMultiplierSnapshot: number | null;

  @Column({ name: 'branch_cost_snapshot', type: 'decimal', precision: 12, scale: 2, nullable: true })
  branchCostSnapshot: number | null;

  @Column({ name: 'branch_multiplier_snapshot', type: 'decimal', precision: 5, scale: 2, nullable: true })
  branchMultiplierSnapshot: number | null;

  @Column({ name: 'effective_multiplier_snapshot', type: 'decimal', precision: 5, scale: 2, nullable: true })
  effectiveMultiplierSnapshot: number | null;

  @Column({ name: 'selling_price_snapshot', type: 'decimal', precision: 12, scale: 2, nullable: true })
  sellingPriceSnapshot: number | null;

  @Column({ name: 'short_description', type: 'text', nullable: true })
  shortDescription: string | null;

  @Column({ name: 'selected_options', type: 'json', nullable: true })
  selectedOptions: Record<string, { id: number | null; label: string }> | null;

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

  @Column({ name: 'completed_at', type: 'datetime', precision: 6, nullable: true })
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

  @ManyToOne(() => Design, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sales_rep_id' })
  salesRep: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;

  @BeforeInsert()
  formatOrderNumber() {
    if (this.orderNumber) {
      this.orderNumber = this.orderNumber.trim().toUpperCase();
    }
  }
}
