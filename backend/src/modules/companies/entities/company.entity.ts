import { Entity, PrimaryColumn, Column, OneToMany, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert } from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { CompanyPricingSlab } from './company-pricing-slab.entity';
import { CollectionPricingOverride } from './collection-pricing-override.entity';
import { randomUUID } from 'crypto';

export enum ShipToType {
  MAIN_ADDRESS = 'MAIN_ADDRESS',
  MAIN_BRANCH = 'MAIN_BRANCH',
  CUSTOM = 'CUSTOM',
}

@Entity('companies')
export class Company {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'company_name' })
  companyName: string;

  @Column({ name: 'company_code', unique: true })
  companyCode: string;

  @Column({ name: 'account_manager_id', nullable: true })
  accountManagerId: string;

  // Structured Address
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

  // Contact Information
  @Column({ name: 'primary_email', nullable: true })
  primaryEmail: string;

  @Column({ name: 'primary_phone', nullable: true })
  primaryPhone: string;

  @Column({ nullable: true })
  website: string;

  // Shipping Configuration
  @Column({ name: 'ship_to_type', type: 'enum', enum: ShipToType, default: ShipToType.MAIN_ADDRESS })
  shipToType: ShipToType;

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

  // Pricing Configuration
  @Column({ name: 'default_multiplier', type: 'decimal', precision: 5, scale: 2, default: 1.00 })
  defaultMultiplier: number;

  @Column({ name: 'enable_slab_pricing', default: false })
  enableSlabPricing: boolean;

  @Column({ name: 'enable_collection_pricing', default: false })
  enableCollectionPricing: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'account_manager_id' })
  accountManager: User;

  @OneToMany(() => Branch, branch => branch.company)
  branches: Branch[];

  @OneToMany(() => CompanyPricingSlab, slab => slab.company)
  pricingSlabs: CompanyPricingSlab[];

  @OneToMany(() => CollectionPricingOverride, override => override.company)
  collectionPricingOverrides: CollectionPricingOverride[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Mapped at query time via loadRelationCountAndMap
  branchCount?: number;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
    this.companyCode = this.companyCode.toUpperCase().replace(/\s+/g, '');
  }
}
