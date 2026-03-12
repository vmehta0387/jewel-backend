import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { Company } from '../../companies/entities/company.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { Design } from '../../products/entities/design.entity';

@Entity('orders')
export class Order {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'order_number', unique: true })
  orderNumber: string;

  @Column({ name: 'company_id', nullable: true })
  companyId: string | null;

  @Column({ name: 'branch_id', nullable: true })
  branchId: string | null;

  @Column({ name: 'design_id', nullable: true })
  designId: string | null;

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

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.QUOTE })
  status: OrderStatus;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

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
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
    if (this.orderNumber) {
      this.orderNumber = this.orderNumber.trim().toUpperCase();
    }
  }
}
