import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CompanyPricingSlab } from './entities/company-pricing-slab.entity';
import { CollectionPricingOverride } from './entities/collection-pricing-override.entity';
import { User } from '../users/entities/user.entity';
import { CreateCompanyDto, UpdateCompanyDto, PricingSlabDto } from './dto/company.dto';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/user-role.enum';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { Branch } from '../branches/entities/branch.entity';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(CompanyPricingSlab)
    private slabRepo: Repository<CompanyPricingSlab>,
    @InjectRepository(CollectionPricingOverride)
    private collectionOverrideRepo: Repository<CollectionPricingOverride>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Branch)
    private branchRepo: Repository<Branch>,
  ) {}

  async create(dto: CreateCompanyDto): Promise<Company> {
    const code = dto.companyCode.toUpperCase().replace(/\s+/g, '');
    
    const exists = await this.companyRepo.findOne({ where: { companyCode: code } });
    if (exists) {
      throw new ConflictException('Company code already exists');
    }

    const {
      pricingSlabs,
      collectionOverrides,
      newAccountManager,
      createMainBranch,
      mainBranchName,
      mainBranchCode,
      ...companyData
    } = dto as any;

    let accountManagerId = companyData.accountManagerId?.trim() || null;

    // Create new account manager if provided
    if (newAccountManager) {
      const passwordHash = await bcrypt.hash('TempPassword123!', 10);
      const userId = randomUUID();
      const newUser = this.userRepo.create({
        id: userId,
        email: newAccountManager.email,
        passwordHash,
        firstName: newAccountManager.firstName,
        lastName: newAccountManager.lastName,
        phone: newAccountManager.phone,
        role: UserRole.INTERNAL_REP,
        taskPermissions: [TaskPermission.COMPANY_MANAGEMENT, TaskPermission.VIEW_REPORTS],
      });
      await this.userRepo.save(newUser);
      accountManagerId = userId;
    }

    const company = this.companyRepo.create({
      ...companyData,
      companyCode: code,
      accountManagerId,
    } as Company);

    const saved: Company = await this.companyRepo.save(company);

    if (pricingSlabs && pricingSlabs.length > 0) {
      await this.updatePricingSlabs(saved.id, pricingSlabs);
    }

    if (collectionOverrides && collectionOverrides.length > 0) {
      await this.updateCollectionOverrides(saved.id, collectionOverrides);
    }

    if (createMainBranch) {
      await this.createMainBranchFromCompany(saved, mainBranchName, mainBranchCode);
    }

    return this.findOne(saved.id);
  }

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    status?: string,
    country?: string,
    city?: string,
    accountManagerId?: string,
    pricingMode?: string,
    requester?: AuthUser,
  ) {
    const skip = (page - 1) * limit;
    const query = this.companyRepo
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.accountManager', 'accountManager')
      .leftJoinAndSelect('company.pricingSlabs', 'pricingSlabs')
      .leftJoinAndSelect('company.collectionPricingOverrides', 'collectionPricingOverrides')
      .loadRelationCountAndMap('company.branchCount', 'company.branches')
      .orderBy('company.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search?.trim()) {
      const normalizedSearch = search.trim();
      query.andWhere(
        '(company.companyName LIKE :search OR company.companyCode LIKE :search OR company.city LIKE :search OR company.country LIKE :search)',
        {
        search: `%${normalizedSearch}%`,
        },
      );
    }

    if (status === 'ACTIVE') {
      query.andWhere('company.isActive = :isActive', { isActive: true });
    } else if (status === 'INACTIVE') {
      query.andWhere('company.isActive = :isActive', { isActive: false });
    }

    if (country?.trim()) {
      query.andWhere('company.country LIKE :country', { country: `%${country.trim()}%` });
    }

    if (city?.trim()) {
      query.andWhere('company.city LIKE :city', { city: `%${city.trim()}%` });
    }

    if (accountManagerId?.trim()) {
      query.andWhere('company.accountManagerId = :accountManagerId', { accountManagerId: accountManagerId.trim() });
    }

    if (requester?.role === UserRole.INTERNAL_REP) {
      query.andWhere('company.accountManagerId = :requesterId', { requesterId: requester.id });
    }

    if (pricingMode === 'DEFAULT') {
      query.andWhere('company.enableSlabPricing = :slab AND company.enableCollectionPricing = :collection', {
        slab: false,
        collection: false,
      });
    } else if (pricingMode === 'SLAB') {
      query.andWhere('company.enableSlabPricing = :slab AND company.enableCollectionPricing = :collection', {
        slab: true,
        collection: false,
      });
    } else if (pricingMode === 'COLLECTION') {
      query.andWhere('company.enableSlabPricing = :slab AND company.enableCollectionPricing = :collection', {
        slab: false,
        collection: true,
      });
    } else if (pricingMode === 'HYBRID') {
      query.andWhere('company.enableSlabPricing = :slab AND company.enableCollectionPricing = :collection', {
        slab: true,
        collection: true,
      });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, requester?: AuthUser): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ['accountManager', 'pricingSlabs', 'collectionPricingOverrides'],
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (requester?.role === UserRole.INTERNAL_REP && company.accountManagerId !== requester.id) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    // Extract pricing data from DTO
    const { pricingSlabs, collectionOverrides, ...companyData } = dto as any;
    
    // Use update query instead of save to ensure database is updated
    await this.companyRepo.update(id, companyData);

    // Update pricing slabs if provided
    if (pricingSlabs !== undefined) {
      await this.updatePricingSlabs(id, pricingSlabs || []);
    }

    // Update collection overrides if provided
    if (collectionOverrides !== undefined) {
      await this.updateCollectionOverrides(id, collectionOverrides || []);
    }

    return this.findOne(id);
  }

  async updateStatus(id: string, isActive: boolean): Promise<Company> {
    const company = await this.findOne(id);
    company.isActive = isActive;
    await this.companyRepo.save(company);
    return company;
  }

  async updatePricingSlabs(companyId: string, slabs: PricingSlabDto[]): Promise<void> {
    await this.slabRepo.delete({ companyId });

    if (slabs && slabs.length > 0) {
      const newSlabs = slabs.map(slab => 
        this.slabRepo.create({
          id: randomUUID(),
          companyId,
          ...slab,
        })
      );

      await this.slabRepo.save(newSlabs);
    }
  }

  async calculatePrice(companyId: string, baseCost: number, collectionType?: string): Promise<number> {
    const company = await this.findOne(companyId);
    let multiplier = company.defaultMultiplier;

    // Priority 1: Collection-based pricing (if enabled and collection provided)
    if (company.enableCollectionPricing && collectionType) {
      const collectionOverride = company.collectionPricingOverrides?.find(
        override => override.collectionType === collectionType && override.isActive
      );
      if (collectionOverride) {
        return baseCost * collectionOverride.multiplier;
      }
    }

    // Priority 2: Slab-based pricing (if enabled)
    if (company.enableSlabPricing) {
      const slab = company.pricingSlabs?.find(
        s => s.isActive && baseCost >= s.minCost && baseCost <= s.maxCost
      );
      if (slab) {
        return baseCost * slab.multiplier;
      }
    }

    // Priority 3: Default multiplier
    return baseCost * multiplier;
  }

  private async createMainBranchFromCompany(
    company: Company,
    mainBranchName?: string,
    mainBranchCode?: string,
  ): Promise<void> {
    const branchCode = (mainBranchCode?.trim() || 'MAIN').toUpperCase().replace(/\s+/g, '');
    const existingBranch = await this.branchRepo.findOne({
      where: { companyId: company.id, code: branchCode },
    });

    if (existingBranch) {
      throw new ConflictException('Main branch code already exists for this company');
    }

    const branch = this.branchRepo.create({
      id: randomUUID(),
      companyId: company.id,
      name: mainBranchName?.trim() || `${company.companyName} Main Branch`,
      code: branchCode,
      streetAddress: company.streetAddress,
      streetAddress2: company.streetAddress2,
      city: company.city,
      stateProvince: company.stateProvince,
      postalCode: company.postalCode,
      country: company.country,
      email: company.primaryEmail,
      phone: company.primaryPhone,
      branchMultiplier: 1,
      isActive: true,
    });

    await this.branchRepo.save(branch);
  }

  async updateCollectionOverrides(companyId: string, overrides: any[]): Promise<void> {
    await this.collectionOverrideRepo.delete({ companyId });

    if (overrides && overrides.length > 0) {
      const newOverrides = overrides.map(override => 
        this.collectionOverrideRepo.create({
          id: randomUUID(),
          companyId,
          collectionType: override.collectionType,
          multiplier: override.multiplier,
        })
      );

      await this.collectionOverrideRepo.save(newOverrides);
    }
  }
}
