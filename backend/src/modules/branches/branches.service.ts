import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(dto: CreateBranchDto): Promise<Branch> {
    await this.ensureCompanyExists(dto.companyId);
    const normalizedCode = this.normalizeCode(dto.code);

    await this.assertUniqueCode(dto.companyId, normalizedCode);

    const branch = this.branchRepo.create({
      ...dto,
      code: normalizedCode,
      branchMultiplier: dto.branchMultiplier ?? 1.0,
    });

    const saved = await this.branchRepo.save(branch);
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
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, requester?: AuthUser): Promise<Branch> {
    const branch = await this.branchRepo.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    if (requester?.role === UserRole.INTERNAL_REP && branch.company?.accountManagerId !== requester.id) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async update(id: string, dto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(id);
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
    if (dto.city !== undefined) branch.city = dto.city;
    if (dto.stateProvince !== undefined) branch.stateProvince = dto.stateProvince;
    if (dto.postalCode !== undefined) branch.postalCode = dto.postalCode;
    if (dto.country !== undefined) branch.country = dto.country;
    if (dto.email !== undefined) branch.email = dto.email;
    if (dto.phone !== undefined) branch.phone = dto.phone;
    if (dto.branchMultiplier !== undefined) branch.branchMultiplier = dto.branchMultiplier;

    await this.branchRepo.save(branch);
    return this.findOne(id);
  }

  async updateStatus(id: string, isActive: boolean): Promise<Branch> {
    const branch = await this.findOne(id);
    branch.isActive = isActive;
    await this.branchRepo.save(branch);
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
}
