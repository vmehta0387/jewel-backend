import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Branch } from './entities/branch.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateBranchDto, UpdateBranchDto, BranchPricingSlabDto, NewBranchManagerDto } from './dto/branch.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { BranchPricingSlab } from './entities/branch-pricing-slab.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(BranchPricingSlab)
    private readonly pricingSlabRepo: Repository<BranchPricingSlab>,
  ) {}

  async create(dto: CreateBranchDto): Promise<Branch> {
    if (dto.branchManagerId && dto.newBranchManager) {
      throw new BadRequestException('Provide either branchManagerId or newBranchManager, not both');
    }

    await this.ensureCompanyExists(dto.companyId);
    const normalizedCode = this.normalizeCode(dto.code);
    await this.assertUniqueCode(dto.companyId, normalizedCode);
    this.validatePricingSlabs(dto.pricingSlabs);

    const {
      pricingSlabs,
      branchManagerId,
      newBranchManager,
      ...branchData
    } = dto as CreateBranchDto & { pricingSlabs?: BranchPricingSlabDto[] };

    const branch = this.branchRepo.create({
      ...branchData,
      code: normalizedCode,
      branchMultiplier: dto.branchMultiplier ?? 1.0,
      enableSlabPricing: dto.enableSlabPricing ?? false,
      branchManagerId: null,
    });

    const saved = await this.branchRepo.save(branch);

    if (pricingSlabs !== undefined) {
      await this.updatePricingSlabs(saved.id, pricingSlabs || []);
    }

    if (newBranchManager) {
      await this.createAndAssignBranchManager(saved.id, saved.companyId, newBranchManager);
    } else if (branchManagerId !== undefined) {
      await this.assignExistingBranchManager(saved.id, saved.companyId, branchManagerId || null);
    }

    return this.findOne(saved.id);
  }

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    companyId?: string,
    status?: string,
    country?: string,
    city?: string,
    requester?: AuthUser,
  ) {
    const skip = (page - 1) * limit;
    const query = this.branchRepo
      .createQueryBuilder('branch')
      .leftJoinAndSelect('branch.company', 'company')
      .leftJoinAndSelect('branch.branchManager', 'branchManager')
      .loadRelationCountAndMap('branch.pricingSlabCount', 'branch.pricingSlabs')
      .orderBy('branch.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search?.trim()) {
      const normalizedSearch = search.trim();
      query.andWhere(
        '(branch.name LIKE :search OR branch.code LIKE :search OR branch.city LIKE :search OR company.companyName LIKE :search)',
        { search: `%${normalizedSearch}%` },
      );
    }

    if (companyId?.trim()) {
      query.andWhere('branch.companyId = :companyId', { companyId: companyId.trim() });
    }

    if (status === 'ACTIVE') {
      query.andWhere('branch.isActive = :isActive', { isActive: true });
    } else if (status === 'INACTIVE') {
      query.andWhere('branch.isActive = :isActive', { isActive: false });
    }

    if (country?.trim()) {
      query.andWhere('branch.country LIKE :country', { country: `%${country.trim()}%` });
    }

    if (city?.trim()) {
      query.andWhere('branch.city LIKE :city', { city: `%${city.trim()}%` });
    }

    if (requester?.role === UserRole.INTERNAL_REP) {
      query.andWhere('company.accountManagerId = :requesterId', { requesterId: requester.id });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: data.map((branch) => this.sanitizeBranch(branch)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, requester?: AuthUser): Promise<Branch> {
    const branch = await this.branchRepo.findOne({
      where: { id },
      relations: ['company', 'branchManager', 'pricingSlabs'],
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    if (requester?.role === UserRole.INTERNAL_REP && branch.company?.accountManagerId !== requester.id) {
      throw new NotFoundException('Branch not found');
    }

    return this.sanitizeBranch(branch);
  }

  async update(id: string, dto: UpdateBranchDto): Promise<Branch> {
    if (dto.branchManagerId !== undefined && dto.newBranchManager !== undefined) {
      throw new BadRequestException('Provide either branchManagerId or newBranchManager, not both');
    }

    const branch = await this.findOne(id);
    const previousCompanyId = branch.companyId;
    const nextCompanyId = dto.companyId ?? branch.companyId;

    await this.ensureCompanyExists(nextCompanyId);

    if (dto.code !== undefined || dto.companyId !== undefined) {
      const nextCode = this.normalizeCode(dto.code ?? branch.code);
      await this.assertUniqueCode(nextCompanyId, nextCode, id);
      branch.code = nextCode;
    }

    if (dto.companyId !== undefined) branch.companyId = dto.companyId;
    if (dto.name !== undefined) branch.name = dto.name;
    if (dto.streetAddress !== undefined) branch.streetAddress = dto.streetAddress;
    if (dto.streetAddress2 !== undefined) branch.streetAddress2 = dto.streetAddress2;
    if (dto.city !== undefined) branch.city = dto.city;
    if (dto.stateProvince !== undefined) branch.stateProvince = dto.stateProvince;
    if (dto.postalCode !== undefined) branch.postalCode = dto.postalCode;
    if (dto.country !== undefined) branch.country = dto.country;
    if (dto.email !== undefined) branch.email = dto.email;
    if (dto.phone !== undefined) branch.phone = dto.phone;
    if (dto.branchMultiplier !== undefined) branch.branchMultiplier = dto.branchMultiplier;
    if (dto.enableSlabPricing !== undefined) branch.enableSlabPricing = dto.enableSlabPricing;

    this.validatePricingSlabs(dto.pricingSlabs);

    await this.branchRepo.save(branch);

    if (dto.pricingSlabs !== undefined) {
      await this.updatePricingSlabs(id, dto.pricingSlabs || []);
    }

    if (dto.newBranchManager) {
      await this.createAndAssignBranchManager(id, branch.companyId, dto.newBranchManager);
    } else if (dto.branchManagerId !== undefined) {
      await this.assignExistingBranchManager(id, branch.companyId, dto.branchManagerId || null);
    } else if (branch.branchManagerId) {
      await this.syncExistingBranchManager(branch.branchManagerId, branch.companyId, id);
    }

    if (previousCompanyId !== branch.companyId) {
      await this.userRepo.update({ branchId: id }, { companyId: branch.companyId });
    }

    return this.findOne(id);
  }

  async updateStatus(id: string, isActive: boolean): Promise<Branch> {
    const branch = await this.findOne(id);
    branch.isActive = isActive;
    await this.branchRepo.save(branch);
    return this.findOne(id);
  }

  async updatePricingSlabs(branchId: string, slabs: BranchPricingSlabDto[]): Promise<void> {
    await this.pricingSlabRepo.delete({ branchId });

    if (!slabs || slabs.length === 0) {
      return;
    }

    const entities = slabs.map((slab) =>
      this.pricingSlabRepo.create({
        id: randomUUID(),
        branchId,
        minCost: slab.minCost,
        maxCost: slab.maxCost,
        multiplier: slab.multiplier,
        isActive: true,
      }),
    );

    await this.pricingSlabRepo.save(entities);
  }

  private async createAndAssignBranchManager(
    branchId: string,
    companyId: string,
    managerData: NewBranchManagerDto,
  ): Promise<void> {
    const email = managerData.email.trim().toLowerCase();
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Branch manager email already exists');
    }

    const passwordHash = await bcrypt.hash('TempPassword123!', 10);
    const manager = this.userRepo.create({
      id: randomUUID(),
      email,
      passwordHash,
      firstName: managerData.firstName.trim(),
      lastName: managerData.lastName.trim(),
      phone: managerData.phone?.trim() || null,
      role: UserRole.BRANCH_MANAGER,
      companyId,
      branchId,
      isActive: true,
      taskPermissions: [
        TaskPermission.DESIGN_ENTRIES,
        TaskPermission.ORDER_ENTRIES,
        TaskPermission.ORDER_APPROVALS,
        TaskPermission.VIEW_REPORTS,
      ],
    });

    await this.userRepo.save(manager);
    await this.assignExistingBranchManager(branchId, companyId, manager.id);
  }

  private async assignExistingBranchManager(
    branchId: string,
    companyId: string,
    branchManagerId: string | null,
  ): Promise<void> {
    const branch = await this.branchRepo.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const previousManagerId = branch.branchManagerId;

    if (!branchManagerId) {
      branch.branchManagerId = null;
      await this.branchRepo.save(branch);

      if (previousManagerId) {
        const previousManager = await this.userRepo.findOne({ where: { id: previousManagerId } });
        if (previousManager && previousManager.branchId === branchId) {
          previousManager.branchId = null;
          await this.userRepo.save(previousManager);
        }
      }

      return;
    }

    const manager = await this.userRepo.findOne({ where: { id: branchManagerId } });
    if (!manager) {
      throw new NotFoundException('Branch manager user not found');
    }

    if (manager.role !== UserRole.BRANCH_MANAGER) {
      throw new BadRequestException('Selected user is not a branch manager');
    }

    if (manager.branchId && manager.branchId !== branchId) {
      await this.branchRepo.update({ id: manager.branchId, branchManagerId: manager.id }, { branchManagerId: null });
    }

    if (previousManagerId && previousManagerId !== manager.id) {
      const previousManager = await this.userRepo.findOne({ where: { id: previousManagerId } });
      if (previousManager && previousManager.branchId === branchId) {
        previousManager.branchId = null;
        await this.userRepo.save(previousManager);
      }
    }

    branch.branchManagerId = manager.id;
    await this.branchRepo.save(branch);

    manager.companyId = companyId;
    manager.branchId = branchId;
    await this.userRepo.save(manager);
  }

  private async syncExistingBranchManager(branchManagerId: string, companyId: string, branchId: string): Promise<void> {
    const manager = await this.userRepo.findOne({ where: { id: branchManagerId } });
    if (!manager) {
      return;
    }

    if (manager.role !== UserRole.BRANCH_MANAGER) {
      throw new BadRequestException('Assigned branch manager user must have BRANCH_MANAGER role');
    }

    if (manager.companyId !== companyId || manager.branchId !== branchId) {
      manager.companyId = companyId;
      manager.branchId = branchId;
      await this.userRepo.save(manager);
    }
  }

  private sanitizeBranch(branch: Branch): Branch {
    if (branch.branchManager) {
      delete (branch.branchManager as Partial<User>).passwordHash;
    }
    return branch;
  }

  private async ensureCompanyExists(companyId: string): Promise<void> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
  }

  private normalizeCode(code: string): string {
    return code.toUpperCase().replace(/\s+/g, '');
  }

  private async assertUniqueCode(companyId: string, code: string, excludeId?: string): Promise<void> {
    const existing = await this.branchRepo.findOne({ where: { companyId, code } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Branch code already exists for this company');
    }
  }

  private validatePricingSlabs(slabs?: BranchPricingSlabDto[]): void {
    if (!slabs || slabs.length === 0) {
      return;
    }

    const sorted = [...slabs].sort((a, b) => a.minCost - b.minCost);
    for (let index = 0; index < sorted.length; index += 1) {
      const slab = sorted[index];
      if (Number.isNaN(slab.minCost) || Number.isNaN(slab.maxCost) || Number.isNaN(slab.multiplier)) {
        throw new BadRequestException('Branch pricing slabs contain invalid numeric values');
      }

      if (slab.maxCost < slab.minCost) {
        throw new BadRequestException('Branch pricing slab maxCost must be greater than or equal to minCost');
      }

      if (slab.multiplier < 1 || slab.multiplier > 10) {
        throw new BadRequestException('Branch pricing slab multiplier must be between 1 and 10');
      }

      if (index > 0 && slab.minCost <= sorted[index - 1].maxCost) {
        throw new BadRequestException('Branch pricing slab ranges cannot overlap');
      }
    }
  }
}
