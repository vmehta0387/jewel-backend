import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { SpiffClaimStatus } from '../enums/spiff-claim-status.enum';

@Entity('spiff_redemption_claims')
export class SpiffRedemptionClaim {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'claim_number', unique: true, length: 30 })
  claimNumber: string;

  @Column({ name: 'user_id', type: 'int', width: 11 })
  userId: number;

  @Column({ name: 'company_id', type: 'int', width: 11, nullable: true })
  companyId: number | null;

  @Column({ name: 'branch_id', type: 'int', width: 11, nullable: true })
  branchId: number | null;

  @Column({ name: 'requested_points', type: 'decimal', precision: 12, scale: 2 })
  requestedPoints: number;

  @Column({ name: 'requested_amount_cents', type: 'int' })
  requestedAmountCents: number;

  @Column({ name: 'conversion_rate_points_per_dollar', type: 'int' })
  conversionRatePointsPerDollar: number;

  @Column({ name: 'gift_card_type', length: 120 })
  giftCardType: string;

  @Column({
    type: 'enum',
    enum: SpiffClaimStatus,
    default: SpiffClaimStatus.PENDING_REVIEW,
  })
  status: SpiffClaimStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'review_reason', type: 'text', nullable: true })
  reviewReason: string | null;

  @Column({ name: 'giftbit_request_id', length: 150, nullable: true })
  giftbitRequestId: string | null;

  @Column({ name: 'giftbit_link_url', type: 'text', nullable: true })
  giftbitLinkUrl: string | null;

  @Column({ name: 'giftbit_response', type: 'json', nullable: true })
  giftbitResponse: Record<string, unknown> | null;

  @Column({ name: 'approved_by_id', type: 'int', width: 11, nullable: true })
  approvedById: number | null;

  @Column({ name: 'approved_at', type: 'datetime', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'fulfilled_at', type: 'datetime', nullable: true })
  fulfilledAt: Date | null;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company | null;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
