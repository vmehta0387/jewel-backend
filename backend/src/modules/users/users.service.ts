import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { User } from './entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateUserDto, FindUsersQueryDto, UpdateUserDto } from './dto/user.dto';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string | null;
  branchId: string | null;
  phone: string | null;
  isActive: boolean;
  taskPermissions: TaskPermission[];
  company: {
    id: string;
    companyName: string;
    companyCode: string;
  } | null;
  managedCompanies: {
    id: string;
    companyName: string;
    companyCode: string;
  }[];
  branch: {
    id: string;
    name: string;
    code: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(Branch)
    private branchRepo: Repository<Branch>,
  ) {}

  private readonly allPermissions: TaskPermission[] = Object.values(TaskPermission);

  private readonly defaultPermissionsByRole: Record<UserRole, TaskPermission[]> = {
    [UserRole.SUPER_ADMIN]: this.allPermissions,
    [UserRole.COMPANY_ADMIN]: [
      TaskPermission.BRANCH_MANAGEMENT,
      TaskPermission.USER_MANAGEMENT,
      TaskPermission.DESIGN_ENTRIES,
      TaskPermission.ORDER_ENTRIES,
      TaskPermission.ORDER_APPROVALS,
      TaskPermission.PRICING_CONFIGURATION,
      TaskPermission.VIEW_REPORTS,
    ],
    [UserRole.BRANCH_MANAGER]: [
      TaskPermission.DESIGN_ENTRIES,
      TaskPermission.ORDER_ENTRIES,
      TaskPermission.ORDER_APPROVALS,
      TaskPermission.VIEW_REPORTS,
    ],
    [UserRole.SALES_REP]: [
      TaskPermission.DESIGN_ENTRIES,
      TaskPermission.ORDER_ENTRIES,
      TaskPermission.VIEW_REPORTS,
    ],
    [UserRole.INTERNAL_REP]: [
      TaskPermission.COMPANY_MANAGEMENT,
      TaskPermission.VIEW_REPORTS,
    ],
  };

  async findAll(query: FindUsersQueryDto = {}): Promise<UserResponse[]> {
    const usersQuery = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .leftJoinAndSelect('user.branch', 'branch')
      .orderBy('user.createdAt', 'DESC');

    const search = query.search?.trim();
    if (search) {
      usersQuery.andWhere(
        '(user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search OR company.companyName LIKE :search OR branch.name LIKE :search OR EXISTS (SELECT 1 FROM companies managedCompany WHERE managedCompany.account_manager_id = user.id AND managedCompany.company_name LIKE :search))',
        { search: `%${search}%` },
      );
    }

    if (query.role) {
      usersQuery.andWhere('user.role = :role', { role: query.role });
    }

    const status = query.status || 'ACTIVE';
    if (status === 'ACTIVE') {
      usersQuery.andWhere('user.isActive = :isActive', { isActive: true });
    } else if (status === 'INACTIVE') {
      usersQuery.andWhere('user.isActive = :isActive', { isActive: false });
    }

    if (query.companyId?.trim()) {
      usersQuery.andWhere('user.companyId = :companyId', { companyId: query.companyId.trim() });
    }

    if (query.branchId?.trim()) {
      usersQuery.andWhere('user.branchId = :branchId', { branchId: query.branchId.trim() });
    }

    const users = await usersQuery.getMany();
    const managedCompaniesMap = await this.getManagedCompaniesMap(users.map((user) => user.id));
    return users.map((user) => this.toResponse(user, managedCompaniesMap.get(user.id) || []));
  }

  async findOne(id: string): Promise<UserResponse> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['company', 'branch'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const managedCompaniesMap = await this.getManagedCompaniesMap([user.id]);
    return this.toResponse(user, managedCompaniesMap.get(user.id) || []);
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const normalizedEmail = this.normalizeEmail(dto.email);
    await this.ensureEmailAvailable(normalizedEmail);

    const scopedOrg = await this.resolveScope(dto.role, dto.companyId, dto.branchId);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      id: randomUUID(),
      email: normalizedEmail,
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      role: dto.role,
      companyId: scopedOrg.companyId,
      branchId: scopedOrg.branchId,
      phone: dto.phone?.trim() || null,
      isActive: dto.isActive ?? true,
      taskPermissions: this.normalizePermissions(dto.taskPermissions, dto.role),
    });

    const saved = await this.userRepo.save(user);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email !== undefined) {
      const normalizedEmail = this.normalizeEmail(dto.email);
      if (normalizedEmail !== user.email) {
        await this.ensureEmailAvailable(normalizedEmail, id);
      }
      user.email = normalizedEmail;
    }

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName.trim();
    }

    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName.trim();
    }

    if (dto.phone !== undefined) {
      user.phone = dto.phone?.trim() || null;
    }

    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }

    if (dto.password !== undefined && dto.password.trim()) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const nextRole = dto.role ?? user.role;
    const nextCompanyId = dto.companyId !== undefined ? dto.companyId : user.companyId;
    const nextBranchId = dto.branchId !== undefined ? dto.branchId : user.branchId;

    const scopedOrg = await this.resolveScope(nextRole, nextCompanyId, nextBranchId);
    user.role = nextRole;
    user.companyId = scopedOrg.companyId;
    user.branchId = scopedOrg.branchId;

    const permissionsInput =
      dto.taskPermissions !== undefined
        ? dto.taskPermissions
        : dto.role !== undefined
          ? undefined
          : user.taskPermissions || [];
    user.taskPermissions = this.normalizePermissions(permissionsInput, nextRole);

    await this.userRepo.save(user);
    return this.findOne(id);
  }

  async updateStatus(id: string, isActive: boolean): Promise<UserResponse> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = isActive;
    await this.userRepo.save(user);
    return this.findOne(id);
  }

  private async resolveScope(
    role: UserRole,
    companyId?: string | null,
    branchId?: string | null,
  ): Promise<{ companyId: string | null; branchId: string | null }> {
    const normalizedCompanyId = companyId?.trim() || null;
    const normalizedBranchId = branchId?.trim() || null;

    if (role === UserRole.SUPER_ADMIN || role === UserRole.INTERNAL_REP) {
      return { companyId: null, branchId: null };
    }

    if (role === UserRole.COMPANY_ADMIN) {
      if (!normalizedCompanyId) {
        throw new BadRequestException('Company is required for company admin users');
      }
      await this.ensureCompanyExists(normalizedCompanyId);
      return { companyId: normalizedCompanyId, branchId: null };
    }

    if (!normalizedBranchId) {
      throw new BadRequestException('Branch is required for branch manager and sales rep users');
    }

    const branch = await this.branchRepo.findOne({ where: { id: normalizedBranchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const resolvedCompanyId = normalizedCompanyId || branch.companyId;
    if (branch.companyId !== resolvedCompanyId) {
      throw new BadRequestException('Branch does not belong to the selected company');
    }

    await this.ensureCompanyExists(resolvedCompanyId);

    return {
      companyId: resolvedCompanyId,
      branchId: normalizedBranchId,
    };
  }

  private async ensureEmailAvailable(email: string, excludeUserId?: string): Promise<void> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing && existing.id !== excludeUserId) {
      throw new ConflictException('Email already exists');
    }
  }

  private async ensureCompanyExists(companyId: string): Promise<void> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
  }

  private normalizePermissions(
    permissions: TaskPermission[] | undefined,
    role: UserRole,
  ): TaskPermission[] {
    if (role === UserRole.SUPER_ADMIN) {
      return this.allPermissions;
    }

    const source = permissions ?? this.defaultPermissionsByRole[role];
    return Array.from(new Set(source));
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async getManagedCompaniesMap(
    userIds: string[],
  ): Promise<Map<string, { id: string; companyName: string; companyCode: string }[]>> {
    const map = new Map<string, { id: string; companyName: string; companyCode: string }[]>();

    if (userIds.length === 0) {
      return map;
    }

    const companies = await this.companyRepo
      .createQueryBuilder('company')
      .select(['company.id AS id', 'company.companyName AS companyName', 'company.companyCode AS companyCode', 'company.accountManagerId AS accountManagerId'])
      .where('company.accountManagerId IN (:...userIds)', { userIds })
      .orderBy('company.companyName', 'ASC')
      .getRawMany<{
        id: string;
        companyName: string;
        companyCode: string;
        accountManagerId: string;
      }>();

    for (const company of companies) {
      if (!map.has(company.accountManagerId)) {
        map.set(company.accountManagerId, []);
      }

      map.get(company.accountManagerId).push({
        id: company.id,
        companyName: company.companyName,
        companyCode: company.companyCode,
      });
    }

    return map;
  }

  private toResponse(
    user: User,
    managedCompanies: { id: string; companyName: string; companyCode: string }[] = [],
  ): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId || null,
      branchId: user.branchId || null,
      phone: user.phone || null,
      isActive: user.isActive,
      taskPermissions: user.taskPermissions || [],
      company: user.company
        ? {
            id: user.company.id,
            companyName: user.company.companyName,
            companyCode: user.company.companyCode,
          }
        : null,
      managedCompanies,
      branch: user.branch
        ? {
            id: user.branch.id,
            name: user.branch.name,
            code: user.branch.code,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
