import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { Company } from '../../companies/entities/company.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { DesignMetal } from './design-metal.entity';
import { DesignGemstone } from './design-gemstone.entity';
import { DesignLabor } from './design-labor.entity';
import { DesignFinding } from './design-finding.entity';
import { DesignProcessStage } from './design-process-stage.entity';
import { DesignPricingTier } from './design-pricing-tier.entity';
import { DesignVendor } from './design-vendor.entity';
import { DesignRelevant } from './design-relevant.entity';
import { DesignStlFile } from './design-stl-file.entity';
import { DesignHistory } from './design-history.entity';

@Entity('designs')
export class Design {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'design_no' })
  designNo: string;

  @Column({ default: 'V1' })
  version: string;

  @Column({ name: 'company_id', nullable: true })
  companyId: string | null;

  @Column({ name: 'branch_id', nullable: true })
  branchId: string | null;

  @Column({ name: 'jewelry_group' })
  jewelryGroup: string;

  @Column({ nullable: true })
  collection: string | null;

  @Column({ name: 'jewelry_size', nullable: true })
  jewelrySize: string | null;

  @Column({ nullable: true })
  stage: string | null;

  @Column({ name: 'diamond_spread', nullable: true })
  diamondSpread: string | null;

  @Column({ name: 'diamond_type', nullable: true })
  diamondType: string | null;

  @Column({ name: 'design_status', nullable: true })
  designStatus: string | null;

  @Column({ name: 'gold_colour', nullable: true })
  goldColour: string | null;

  @Column({ name: 'stone_info', nullable: true })
  stoneInfo: string | null;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ name: 'drawer_location', nullable: true })
  drawerLocation: string | null;

  @Column({ name: 'design_description', type: 'text', nullable: true })
  designDescription: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ name: 'metal_value', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  metalValue: number;

  @Column({ name: 'gem_value', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  gemValue: number;

  @Column({ name: 'labor_value', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  laborValue: number;

  @Column({ name: 'finding_value', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  findingValue: number;

  @Column({ name: 'total_value', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  totalValue: number;

  @Column({ name: 'gross_weight', type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  grossWeight: number;

  @Column({ name: 'live_price', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  livePrice: number;

  @Column({ name: 'stl_file_url', nullable: true })
  stlFileUrl: string | null;

  @Column({ name: 'image_urls', type: 'json', nullable: true })
  imageUrls: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User;

  @OneToMany(() => DesignMetal, (metal) => metal.design)
  metals: DesignMetal[];

  @OneToMany(() => DesignGemstone, (gemstone) => gemstone.design)
  gemstones: DesignGemstone[];

  @OneToMany(() => DesignLabor, (labor) => labor.design)
  labors: DesignLabor[];

  @OneToMany(() => DesignFinding, (finding) => finding.design)
  findings: DesignFinding[];

  @OneToMany(() => DesignProcessStage, (stage) => stage.design)
  processStages: DesignProcessStage[];

  @OneToMany(() => DesignPricingTier, (tier) => tier.design)
  pricingTiers: DesignPricingTier[];

  @OneToMany(() => DesignVendor, (vendor) => vendor.design)
  vendors: DesignVendor[];

  @OneToMany(() => DesignRelevant, (relevant) => relevant.design)
  relevantDesignLinks: DesignRelevant[];

  @OneToMany(() => DesignRelevant, (relevant) => relevant.relatedDesign)
  relatedToDesignLinks: DesignRelevant[];

  @OneToMany(() => DesignStlFile, (stlFile) => stlFile.design)
  stlFiles: DesignStlFile[];

  @OneToMany(() => DesignHistory, (history) => history.design)
  history: DesignHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
    this.designNo = this.designNo.trim().toUpperCase();
    this.version = (this.version || 'V1').trim().toUpperCase();
  }
}
