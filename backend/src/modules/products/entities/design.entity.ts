import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { DesignMetal } from './design-metal.entity';
import { DesignGemstone } from './design-gemstone.entity';
import { DesignLabor } from './design-labor.entity';
import { DesignOverhead } from './design-overhead.entity';
import { DesignFinding } from './design-finding.entity';
import { DesignProcessStage } from './design-process-stage.entity';
import { DesignPricingTier } from './design-pricing-tier.entity';
import { DesignVendor } from './design-vendor.entity';
import { DesignRelevant } from './design-relevant.entity';
import { DesignStlFile } from './design-stl-file.entity';
import { DesignHistory } from './design-history.entity';
import { DesignTag } from './design-tag.entity';
import {
  CollectionMaster,
  DesignStatusMaster,
  DiamondQualityMaster,
  DiamondSpreadMaster,
  DiamondTypeMaster,
  DiamondWeightMaster,
  JewelryGroupMaster,
  JewelrySizeMaster,
  MetalCaratageMaster,
  StageMaster,
} from './design-master-tables.entity';

@Entity('designs')
@Index('uq_designs_design_name_design_no', ['designName', 'designNo'], { unique: true })
export class Design {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Index('uq_designs_design_no', { unique: true })
  @Column({ name: 'design_no' })
  designNo: string;

  @Column({ nullable: true, length: 7, unique: true })
  barcode: string | null;

  @Index('idx_designs_family_design_id')
  @Column({ name: 'family_design_id', type: 'int', width: 11, nullable: true })
  familyDesignId: number | null;

  @Column({ name: 'design_name', nullable: true })
  designName: string | null;

  @Column({ default: 'V1' })
  version: string;

  @Index('idx_designs_company_id')
  @Column({ name: 'company_id', type: 'int', width: 11, nullable: true })
  companyId: number | null;

  @Index('idx_designs_branch_id')
  @Column({ name: 'branch_id', type: 'int', width: 11, nullable: true })
  branchId: number | null;

  @Column({ name: 'jewelry_group_id', type: 'int', width: 11 })
  jewelryGroupId: number;

  @Column({ name: 'collection_id', type: 'int', width: 11, nullable: true })
  collectionId: number | null;

  @Column({ name: 'jewelry_size_id', type: 'int', width: 11, nullable: true })
  jewelrySizeId: number | null;

  @Column({ name: 'stage_id', type: 'int', width: 11, nullable: true })
  stageId: number | null;

  @Column({ name: 'diamond_spread_id', type: 'int', width: 11, nullable: true })
  diamondSpreadId: number | null;

  @Column({ name: 'diamond_type_id', type: 'int', width: 11, nullable: true })
  diamondTypeId: number | null;

  @Column({ name: 'diamond_weight_id', type: 'int', width: 11, nullable: true })
  diamondWeightId: number | null;

  @Column({ name: 'diamond_quality_id', type: 'int', width: 11, nullable: true })
  diamondQualityId: number | null;

  @Column({ name: 'design_status_id', type: 'int', width: 11, nullable: true })
  designStatusId: number | null;

  @Column({ name: 'metal_caratage_id', type: 'int', width: 11, nullable: true })
  metalCaratageId: number | null;

  jewelryGroup?: string;
  collection?: string | null;
  jewelrySize?: string | null;
  stage?: string | null;
  diamondSpread?: string | null;
  diamondType?: string | null;
  diamondWeight?: string | null;
  diamondQuality?: string | null;
  designStatus?: string | null;
  tags?: string[] | null;
  metalCaratage?: string | null;
  metalColor?: string | null;

  @Column({ name: 'stone_info', nullable: true })
  stoneInfo: string | null;

  @Column({ name: 'drawer_location', nullable: true })
  drawerLocation: string | null;

  @Column({ name: 'other_weight', type: 'decimal', precision: 12, scale: 3, nullable: true })
  otherWeight: number | null;

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

  @Column({ name: 'stl_file_url', nullable: true, length: 500 })
  stlFileUrl: string | null;

  @Column({ name: 'image_urls', type: 'json', nullable: true })
  imageUrls: string[];

  @Column({ name: 'ijewel_model_id', nullable: true, length: 120 })
  ijewelModelId: string | null;

  @Column({ name: 'ijewel_base_name', nullable: true, length: 80 })
  ijewelBaseName: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Index('idx_designs_created_by')
  @Column({ name: 'created_by', type: 'int', width: 11, nullable: true })
  createdBy: number | null;

  @Index('idx_designs_updated_by')
  @Column({ name: 'updated_by', type: 'int', width: 11, nullable: true })
  updatedBy: number | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @ManyToOne(() => Design, (design) => design.familyDesigns, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_design_id' })
  familyDesign: Design | null;

  @ManyToOne(() => JewelryGroupMaster)
  @JoinColumn({ name: 'jewelry_group_id' })
  jewelryGroupMaster: JewelryGroupMaster;

  @ManyToOne(() => CollectionMaster, { nullable: true })
  @JoinColumn({ name: 'collection_id' })
  collectionMaster: CollectionMaster | null;

  @ManyToOne(() => JewelrySizeMaster, { nullable: true })
  @JoinColumn({ name: 'jewelry_size_id' })
  jewelrySizeMaster: JewelrySizeMaster | null;

  @ManyToOne(() => StageMaster, { nullable: true })
  @JoinColumn({ name: 'stage_id' })
  stageMaster: StageMaster | null;

  @ManyToOne(() => DiamondSpreadMaster, { nullable: true })
  @JoinColumn({ name: 'diamond_spread_id' })
  diamondSpreadMaster: DiamondSpreadMaster | null;

  @ManyToOne(() => DiamondTypeMaster, { nullable: true })
  @JoinColumn({ name: 'diamond_type_id' })
  diamondTypeMaster: DiamondTypeMaster | null;

  @ManyToOne(() => DiamondWeightMaster, { nullable: true })
  @JoinColumn({ name: 'diamond_weight_id' })
  diamondWeightMaster: DiamondWeightMaster | null;

  @ManyToOne(() => DiamondQualityMaster, { nullable: true })
  @JoinColumn({ name: 'diamond_quality_id' })
  diamondQualityMaster: DiamondQualityMaster | null;

  @ManyToOne(() => DesignStatusMaster, { nullable: true })
  @JoinColumn({ name: 'design_status_id' })
  designStatusMaster: DesignStatusMaster | null;

  @ManyToOne(() => MetalCaratageMaster, { nullable: true })
  @JoinColumn({ name: 'metal_caratage_id' })
  metalCaratageMaster: MetalCaratageMaster | null;

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

  @OneToMany(() => DesignTag, (designTag) => designTag.design)
  designTags: DesignTag[];

  @OneToMany(() => DesignLabor, (labor) => labor.design)
  labors: DesignLabor[];

  @OneToMany(() => DesignOverhead, (overhead) => overhead.design)
  overheads: DesignOverhead[];

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

  @OneToMany(() => Design, (design) => design.familyDesign)
  familyDesigns: Design[];

  @OneToMany(() => DesignStlFile, (stlFile) => stlFile.design)
  stlFiles: DesignStlFile[];

  @OneToMany(() => DesignHistory, (history) => history.design)
  history: DesignHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeBeforeInsert() {
    this.designNo = this.designNo.trim().toUpperCase();
    this.version = (this.version || 'V1').trim().toUpperCase();
  }
}


