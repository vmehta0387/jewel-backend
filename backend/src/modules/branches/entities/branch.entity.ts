import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert, OneToMany } from 'typeorm';
import { randomUUID } from 'crypto';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { BranchPricingSlab } from './branch-pricing-slab.entity';
import { BranchShipToType } from '../enums/branch-ship-to-type.enum';

@Entity('branches')
export class Branch {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column({ name: 'street_address', nullable: true })
  streetAddress: string;

  @Column({ name: 'street_address_2', nullable: true })
  streetAddress2: string;

  @Column({ nullable: true })
  city: string;

  @Column({ name: 'state_province', nullable: true })
  stateProvince: string;

  @Column({ name: 'postal_code', nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'ship_to_type', type: 'enum', enum: BranchShipToType, default: BranchShipToType.BRANCH_ADDRESS })
  shipToType: BranchShipToType;

  @Column({ name: 'ship_street_address', nullable: true })
  shipStreetAddress: string;

  @Column({ name: 'ship_city', nullable: true })
  shipCity: string;

  @Column({ name: 'ship_state_province', nullable: true })
  shipStateProvince: string;

  @Column({ name: 'ship_postal_code', nullable: true })
  shipPostalCode: string;

  @Column({ name: 'ship_country', nullable: true })
  shipCountry: string;

  @Column({ name: 'branch_manager_id', nullable: true })
  branchManagerId: string;

  @Column({ name: 'branch_multiplier', type: 'decimal', precision: 5, scale: 2, default: 1.00 })
  branchMultiplier: number;

  @Column({ name: 'enable_slab_pricing', default: false })
  enableSlabPricing: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => Company, company => company.branches)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'branch_manager_id' })
  branchManager: User;

  @OneToMany(() => BranchPricingSlab, slab => slab.branch)
  pricingSlabs: BranchPricingSlab[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Mapped at query time via loadRelationCountAndMap
  pricingSlabCount?: number;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
    this.code = this.code.toUpperCase().replace(/\s+/g, '');
  }
}
