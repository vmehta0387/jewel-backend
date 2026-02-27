import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { Company } from '../../companies/entities/company.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_number', unique: true })
  orderNumber: string;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'branch_id' })
  branchId: number;

  @Column({ name: 'sales_rep_id' })
  salesRepId: number;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({ name: 'customer_email', nullable: true })
  customerEmail: string;

  @Column({ name: 'customer_phone', nullable: true })
  customerPhone: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.QUOTE })
  status: OrderStatus;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Company)
  company: Company;

  @ManyToOne(() => Branch)
  branch: Branch;

  @ManyToOne(() => User)
  salesRep: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
