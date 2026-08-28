import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import * as XLSX from 'xlsx';
import { User } from './entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateBranchEmployeeDto, UpdateBranchEmployeeDto } from './dto/branch-employee.dto';
import { CheckUserHandleQueryDto, CreateUserDto, FindUsersQueryDto, UpdateUserDto } from './dto/user.dto';
import { NotificationEventsService } from '../notification-events/notification-events.service';
import { PermissionsService } from '../permissions/permissions.service';
import { NotificationPriority } from '../notifications/entities/notification.entity';
import {
  PermissionDataScope,
  UserPermissionAction,
} from '../permissions/entities/user-permission-action.entity';

export interface UserResponse {
  id: number;
  label?: string;
  email: string;
  firstName: string;
  lastName: string;
  userHandle: string | null;
  role: UserRole;
  companyId: number | null;
  branchId: number | null;
  phone: string | null;
  photoUrl: string | null;
  photoStoragePath: string | null;
  isActive: boolean;
  isOnline: boolean;
  lastSeenAt: Date | null;
  taskPermissions: TaskPermission[];
  detailedPermissions: {
    actionKey: string;
    dataScope: PermissionDataScope;
  }[];
  company: {
    id: number;
    companyName: string;
    companyCode: string;
  } | null;
  managedCompanies: {
    id: number;
    companyName: string;
    companyCode: string;
  }[];
  branch: {
    id: number;
    name: string;
    code: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserImportRow {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyCode: string;
  branchCode: string;
  phone: string;
  password: string;
  status: string;
  taskPermissions: string;
}

@Injectable()
export class UsersService implements OnModuleInit {
  private s3Client: S3Client | null = null;
  private signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
  private readonly signedUrlCacheSkewMs = 2 * 60 * 1000;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(Branch)
    private branchRepo: Repository<Branch>,
    @InjectRepository(UserPermissionAction)
    private userPermissionActionRepo: Repository<UserPermissionAction>,
    private readonly notificationEventsService: NotificationEventsService,
    private readonly permissionsService: PermissionsService,
  ) { }

  private readonly allPermissions: TaskPermission[] = Object.values(TaskPermission);
  private readonly userImportHeaders = [
    'Email',
    'First Name',
    'Last Name',
    'Role',
    'Company Code',
    'Branch Code',
    'Phone',
    'Password',
    'Status',
    'Task Permissions',
  ] as const;

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
      TaskPermission.BRANCH_MANAGEMENT,
      TaskPermission.USER_MANAGEMENT,
      TaskPermission.DESIGN_ENTRIES,
      TaskPermission.ORDER_ENTRIES,
      TaskPermission.ORDER_APPROVALS,
      TaskPermission.PRICING_CONFIGURATION,
      TaskPermission.VIEW_REPORTS,
    ],
  };

  private readonly allowedPermissionsByRole: Record<UserRole, TaskPermission[]> = {
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
      TaskPermission.PRICING_CONFIGURATION,
      TaskPermission.VIEW_REPORTS,
    ],
    [UserRole.SALES_REP]: [
      TaskPermission.DESIGN_ENTRIES,
      TaskPermission.ORDER_ENTRIES,
      TaskPermission.VIEW_REPORTS,
    ],
    [UserRole.INTERNAL_REP]: [
      TaskPermission.COMPANY_MANAGEMENT,
      TaskPermission.BRANCH_MANAGEMENT,
      TaskPermission.USER_MANAGEMENT,
      TaskPermission.DESIGN_ENTRIES,
      TaskPermission.ORDER_ENTRIES,
      TaskPermission.ORDER_APPROVALS,
      TaskPermission.PRICING_CONFIGURATION,
      TaskPermission.VIEW_REPORTS,
    ],
  };

  private readonly companyAdminManagedRoles: UserRole[] = [UserRole.BRANCH_MANAGER, UserRole.SALES_REP];

  async onModuleInit() {
    await this.ensureUserHandleColumn();
  }

  private async ensureUserHandleColumn() {
    try {
      await this.userRepo.query('ALTER TABLE users ADD COLUMN user_handle varchar(255) NULL');
    } catch {
      // Ignored when the column already exists.
    }

    try {
      await this.userRepo.query('CREATE UNIQUE INDEX idx_users_user_handle ON users (user_handle)');
    } catch {
      // Ignored when the index already exists.
    }
  }

  async findAll(query: FindUsersQueryDto = {}, requester?: AuthUser): Promise<UserResponse[]> {
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

    if (query.companyId) {
      usersQuery.andWhere('user.companyId = :companyId', { companyId: query.companyId });
    }

    if (query.branchId) {
      usersQuery.andWhere('user.branchId = :branchId', { branchId: query.branchId });
    }

    if (requester?.role === UserRole.COMPANY_ADMIN) {
      if (!requester.companyId) {
        throw new ForbiddenException('Company admin must be assigned to a company');
      }

      usersQuery.andWhere('user.companyId = :requesterCompanyId', { requesterCompanyId: requester.companyId });
      usersQuery.andWhere('user.role IN (:...managedRoles)', { managedRoles: this.companyAdminManagedRoles });

      if (query.role && !this.companyAdminManagedRoles.includes(query.role)) {
        return [];
      }
    }

    const users = await usersQuery.getMany();
    const userIds = users.map((user) => user.id);
    const [managedCompaniesMap, detailedPermissionsMap] = await Promise.all([
      this.getManagedCompaniesMap(userIds),
      this.getUserDetailedPermissionsMap(userIds),
    ]);
    return Promise.all(
      users.map((user) =>
        this.mapToUserResponse(
          user,
          managedCompaniesMap.get(user.id) || [],
          detailedPermissionsMap.get(user.id) || [],
        ),
      ),
    );
  }

  async findLookup(query: FindUsersQueryDto = {}, requester: AuthUser): Promise<UserResponse[]> {
    const usersQuery = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .leftJoinAndSelect('user.branch', 'branch')
      .addSelect("TRIM(CONCAT(COALESCE(user.firstName, ''), ' ', COALESCE(user.lastName, '')))", 'user_lookupLabel')
      .orderBy('user.firstName', 'ASC')
      .addOrderBy('user.lastName', 'ASC');

    const search = query.search?.trim();
    if (search) {
      usersQuery.andWhere(
        '(user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search OR company.companyName LIKE :search OR branch.name LIKE :search)',
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

    if (requester.role === UserRole.INTERNAL_REP) {
      usersQuery.andWhere('company.accountManagerId = :requesterId', { requesterId: requester.id });
    } else if (
      requester.role === UserRole.COMPANY_ADMIN ||
      requester.role === UserRole.BRANCH_MANAGER ||
      requester.role === UserRole.SALES_REP
    ) {
      if (!requester.companyId) {
        return [];
      }
      usersQuery.andWhere('user.companyId = :requesterCompanyId', { requesterCompanyId: requester.companyId });
      if (requester.branchId) {
        usersQuery.andWhere('user.branchId = :requesterBranchId', { requesterBranchId: requester.branchId });
      }
    }

    if (query.companyId && requester.role === UserRole.SUPER_ADMIN) {
      usersQuery.andWhere('user.companyId = :companyId', { companyId: query.companyId });
    }

    if (query.branchId && requester.role !== UserRole.BRANCH_MANAGER && requester.role !== UserRole.SALES_REP) {
      usersQuery.andWhere('user.branchId = :branchId', { branchId: query.branchId });
    }

    const { entities: users, raw } = await usersQuery.getRawAndEntities();
    const lookupLabels = new Map<number, string>();
    raw.forEach((row: Record<string, unknown>) => {
      const id = Number(row.user_id);
      const label = String(row.user_lookupLabel || '').trim();
      if (Number.isFinite(id) && label) {
        lookupLabels.set(id, label);
      }
    });
    const userIds = users.map((user) => user.id);
    const [managedCompaniesMap, detailedPermissionsMap] = await Promise.all([
      this.getManagedCompaniesMap(userIds),
      this.getUserDetailedPermissionsMap(userIds),
    ]);

    return Promise.all(
      users.map(async (user) => {
        const response = await this.mapToUserResponse(
          user,
          managedCompaniesMap.get(user.id) || [],
          detailedPermissionsMap.get(user.id) || [],
        );
        const fallbackLabel = `${response.firstName || ''} ${response.lastName || ''}`.trim() || response.email;
        return {
          ...response,
          label: lookupLabels.get(user.id) || fallbackLabel,
        };
      }),
    );
  }
  async checkUserHandleAvailability(query: CheckUserHandleQueryDto): Promise<{
    available: boolean;
    normalizedUserHandle: string | null;
    message?: string;
  }> {
    const normalizedUserHandle = this.normalizeUserHandle(query.userHandle);
    if (!normalizedUserHandle) {
      return { available: true, normalizedUserHandle };
    }

    const existing = await this.userRepo.findOne({ where: { userHandle: normalizedUserHandle } });
    const available = !existing || existing.id === query.excludeUserId;
    return {
      available,
      normalizedUserHandle,
      message: available ? undefined : 'User handle name alreday exit. try other please',
    };
  }

  async findOne(id: number, requester?: AuthUser): Promise<UserResponse> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['company', 'branch'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (requester?.role === UserRole.COMPANY_ADMIN) {
      this.assertCompanyAdminCanManageUser(requester, user);
    }

    const [managedCompaniesMap, detailedPermissionsMap] = await Promise.all([
      this.getManagedCompaniesMap([user.id]),
      this.getUserDetailedPermissionsMap([user.id]),
    ]);
    return this.mapToUserResponse(
      user,
      managedCompaniesMap.get(user.id) || [],
      detailedPermissionsMap.get(user.id) || [],
    );
  }

  async create(dto: CreateUserDto, requester?: AuthUser): Promise<UserResponse> {
    await this.assertCanChangeAssignedPermissions(dto, requester);

    if (requester?.role === UserRole.COMPANY_ADMIN) {
      if (!requester.companyId) {
        throw new ForbiddenException('Company admin must be assigned to a company');
      }
      if (!this.companyAdminManagedRoles.includes(dto.role)) {
        throw new ForbiddenException('Company admin can only create branch managers or sales reps');
      }
      dto.companyId = requester.companyId;
    }

    const normalizedEmail = this.normalizeEmail(dto.email);
    await this.ensureEmailAvailable(normalizedEmail);
    const normalizedUserHandle = this.normalizeUserHandle(dto.userHandle);
    if (normalizedUserHandle) {
      await this.ensureUserHandleAvailable(normalizedUserHandle);
    }

    const scopedOrg = await this.resolveScope(dto.role, dto.companyId, dto.branchId);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const defaultAssignment =
      dto.detailedPermissions === undefined && dto.taskPermissions === undefined
        ? await this.resolveRoleDefaultPermissionAssignment(dto.role)
        : null;
    const normalizedDetailedPermissions =
      dto.detailedPermissions !== undefined
        ? dto.role === UserRole.SUPER_ADMIN
          ? []
          : this.normalizeDetailedPermissions(dto.detailedPermissions)
        : defaultAssignment?.detailedPermissions;
    const user = this.userRepo.create({
      email: normalizedEmail,
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      userHandle: normalizedUserHandle,
      role: dto.role,
      companyId: scopedOrg.companyId,
      branchId: scopedOrg.branchId,
      phone: dto.phone?.trim() || null,
      photoUrl: this.normalizePhotoStoragePath(dto.photoUrl?.trim() || null),
      isActive: dto.isActive ?? true,
      taskPermissions:
        normalizedDetailedPermissions !== undefined
          ? this.deriveLegacyPermissionsFromDetailed(normalizedDetailedPermissions, dto.role)
          : this.normalizePermissions(defaultAssignment?.taskPermissions ?? dto.taskPermissions, dto.role),
    });

    const saved: any = await this.userRepo.save(user);
    if (normalizedDetailedPermissions !== undefined) {
      await this.replaceUserDetailedPermissions(saved.id, normalizedDetailedPermissions);
    }
    const response = await this.findOne(saved.id, requester);
    await this.safeNotifyUserCreated(saved, response, requester);
    return response;
  }

  async update(id: number, dto: UpdateUserDto, requester?: AuthUser): Promise<UserResponse> {
    await this.assertCanChangeAssignedPermissions(dto, requester);

    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (requester?.role === UserRole.COMPANY_ADMIN) {
      this.assertCompanyAdminCanManageUser(requester, user);
      const nextRoleForCheck = dto.role ?? user.role;
      if (!this.companyAdminManagedRoles.includes(nextRoleForCheck)) {
        throw new ForbiddenException('Company admin can only manage branch managers or sales reps');
      }
      if (dto.companyId && dto.companyId !== requester.companyId) {
        throw new ForbiddenException('You can only manage users in your company');
      }
      dto.companyId = requester.companyId || null;
    }

    const previousRole = user.role;

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

    if (dto.userHandle !== undefined) {
      const normalizedUserHandle = this.normalizeUserHandle(dto.userHandle);
      if (normalizedUserHandle && normalizedUserHandle !== user.userHandle) {
        await this.ensureUserHandleAvailable(normalizedUserHandle, id);
      }
      user.userHandle = normalizedUserHandle;
    }

    if (dto.phone !== undefined) {
      user.phone = dto.phone?.trim() || null;
    }

    if (dto.photoUrl !== undefined) {
      user.photoUrl = this.normalizePhotoStoragePath(dto.photoUrl?.trim() || null);
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

    const defaultAssignment =
      dto.detailedPermissions === undefined && dto.taskPermissions === undefined && previousRole !== nextRole
        ? await this.resolveRoleDefaultPermissionAssignment(nextRole)
        : null;
    const normalizedDetailedPermissions =
      dto.detailedPermissions !== undefined
        ? nextRole === UserRole.SUPER_ADMIN
          ? []
          : this.normalizeDetailedPermissions(dto.detailedPermissions)
        : defaultAssignment?.detailedPermissions;
    const permissionsInput =
      dto.taskPermissions !== undefined
        ? dto.taskPermissions
        : defaultAssignment
          ? defaultAssignment.taskPermissions
          : dto.role !== undefined
            ? undefined
            : user.taskPermissions || [];
    user.taskPermissions =
      normalizedDetailedPermissions !== undefined
        ? this.deriveLegacyPermissionsFromDetailed(normalizedDetailedPermissions, nextRole)
        : this.normalizePermissions(permissionsInput, nextRole);

    await this.userRepo.save(user);
    if (normalizedDetailedPermissions !== undefined || previousRole !== user.role) {
      await this.replaceUserDetailedPermissions(id, normalizedDetailedPermissions || []);
    }
    const response = await this.findOne(id, requester);
    if (previousRole !== user.role) {
      await this.safeNotifyUserRoleChanged(user, response, previousRole, requester);
    }
    return response;
  }

  private async assertCanChangeAssignedPermissions(
    dto: Pick<CreateUserDto | UpdateUserDto, 'taskPermissions' | 'detailedPermissions'>,
    requester?: AuthUser,
  ): Promise<void> {
    if (requester?.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (dto.taskPermissions === undefined && dto.detailedPermissions === undefined) {
      return;
    }

    if (!requester?.id) {
      throw new ForbiddenException('You do not have permission to manage user permissions');
    }

    const permission = await this.userPermissionActionRepo.findOne({
      where: { userId: requester.id, actionKey: 'user.permissions.manage' },
      select: ['id'],
    });

    if (!permission) {
      throw new ForbiddenException('You do not have permission to manage user permissions');
    }
  }

  async updateStatus(id: number, isActive: boolean, requester?: AuthUser): Promise<UserResponse> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (requester?.role === UserRole.COMPANY_ADMIN) {
      this.assertCompanyAdminCanManageUser(requester, user);
    }

    user.isActive = isActive;
    await this.userRepo.save(user);
    return this.findOne(id, requester);
  }

  private async safeNotifyUserCreated(user: User, response: UserResponse, requester?: AuthUser) {
    try {
      const recipientIds = await this.getUserAdminAudience(user, [requester?.id, user.id]);
      const roleLabel = this.formatRoleLabel(user.role);
      const companyLabel = response.company?.companyName || 'your company';
      const branchLabel = response.branch?.name || null;

      await this.notificationEventsService.notifyUserAccountCreated({
        userId: user.id,
        companyId: user.companyId ?? null,
        branchId: user.branchId ?? null,
        priority: NotificationPriority.P1,
        title: 'Your account is ready',
        message: branchLabel
          ? `Your ${roleLabel} account for ${companyLabel} / ${branchLabel} is now active.`
          : `Your ${roleLabel} account for ${companyLabel} is now active.`,
        entityType: 'USER',
        entityId: user.id,
        actionUrl: '/profile',
        metadata: {
          userId: user.id,
          role: user.role,
          companyId: user.companyId ?? null,
          branchId: user.branchId ?? null,
        },
      });

      if (recipientIds.length) {
        await this.notificationEventsService.notifyUserAccountCreatedForAdmins(recipientIds, {
          companyId: user.companyId ?? null,
          branchId: user.branchId ?? null,
          priority: NotificationPriority.P2,
          title: `New ${roleLabel} account created`,
          message: `${response.firstName} ${response.lastName} was added as ${roleLabel}.`,
          entityType: 'USER',
          entityId: user.id,
          actionUrl: `/users/${user.id}`,
          metadata: {
            userId: user.id,
            role: user.role,
            createdByUserId: requester?.id ?? null,
            companyId: user.companyId ?? null,
            branchId: user.branchId ?? null,
          },
        });
      }
    } catch {
      // Notifications are best-effort; user creation remains the source of truth.
    }
  }

  private async safeNotifyUserRoleChanged(
    user: User,
    response: UserResponse,
    previousRole: UserRole,
    requester?: AuthUser,
  ) {
    try {
      const recipientIds = await this.getUserAdminAudience(user, [requester?.id, user.id]);
      const nextRoleLabel = this.formatRoleLabel(user.role);
      const previousRoleLabel = this.formatRoleLabel(previousRole);

      await this.notificationEventsService.notifyUserRoleChanged({
        userId: user.id,
        companyId: user.companyId ?? null,
        branchId: user.branchId ?? null,
        priority: NotificationPriority.P1,
        title: 'Your role was updated',
        message: `Your role changed from ${previousRoleLabel} to ${nextRoleLabel}.`,
        entityType: 'USER',
        entityId: user.id,
        actionUrl: '/profile',
        metadata: {
          userId: user.id,
          previousRole,
          role: user.role,
          updatedByUserId: requester?.id ?? null,
        },
      });

      if (recipientIds.length) {
        await this.notificationEventsService.notifyUserRoleChangedForAdmins(recipientIds, {
          companyId: user.companyId ?? null,
          branchId: user.branchId ?? null,
          priority: NotificationPriority.P2,
          title: `Role updated for ${response.firstName} ${response.lastName}`,
          message: `${response.firstName} ${response.lastName} moved from ${previousRoleLabel} to ${nextRoleLabel}.`,
          entityType: 'USER',
          entityId: user.id,
          actionUrl: `/users/${user.id}`,
          metadata: {
            userId: user.id,
            previousRole,
            role: user.role,
            updatedByUserId: requester?.id ?? null,
          },
        });
      }
    } catch {
      // Notifications are best-effort.
    }
  }

  private async getUserAdminAudience(user: User, excludedIds: Array<number | null | undefined>) {
    const excludeSet = new Set(excludedIds.filter((value) => value != null));
    const rows = await this.userRepo.find({
      where: [
        { role: UserRole.SUPER_ADMIN, isActive: true },
        ...(user.companyId ? [{ role: UserRole.COMPANY_ADMIN, companyId: user.companyId, isActive: true } as any] : []),
      ],
      select: ['id'],
    });

    return rows.map((row) => row.id).filter((id) => !excludeSet.has(id));
  }

  private formatRoleLabel(role: UserRole) {
    return String(role || '')
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  async uploadPhoto(
    file?: { buffer?: Buffer; originalname?: string; mimetype?: string },
    request?: { protocol?: string; get?: (name: string) => string | undefined; headers?: Record<string, string | string[] | undefined> },
  ): Promise<{ fileName: string; url: string; previewUrl: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }

    const mime = (file.mimetype || '').toLowerCase();
    if (!mime.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const ext = this.resolveImageExtension(file.originalname || '', mime);
    const fileName = `${Date.now()}-${randomUUID()}${ext}`;
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const relativeDir = `user-profiles/${year}/${month}/${day}`;

    const s3Config = this.getS3Client();
    if (s3Config) {
      const { client, bucket } = s3Config;
      const key = `${relativeDir}/${fileName}`;

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: mime || 'image/jpeg',
        }),
      );

      const storagePath = `s3://${bucket}/${key}`;
      return {
        fileName,
        url: storagePath,
        previewUrl: await this.createSignedUrl(client, bucket, key),
      };
    }

    const uploadsRoot = process.env.UPLOADS_ROOT || join(process.cwd(), 'uploads');
    const uploadDir = join(uploadsRoot, relativeDir);
    await mkdir(uploadDir, { recursive: true });

    await writeFile(join(uploadDir, fileName), file.buffer);
    const relativePath = `/uploads/${relativeDir}/${fileName}`;
    const publicUrl = this.buildPublicAssetUrl(request, relativePath);
    return {
      fileName,
      url: publicUrl,
      previewUrl: publicUrl,
    };
  }

  async generateImportTemplate(): Promise<{ buffer: Buffer; fileName: string }> {
    const workbook = XLSX.utils.book_new();
    const templateRows = [
      {
        Email: 'manager@example.com',
        'First Name': 'Branch',
        'Last Name': 'Manager',
        Role: 'BRANCH_MANAGER',
        'Company Code': 'BRILL',
        'Branch Code': 'BRILLD',
        Phone: '9876543210',
        Password: 'Admin@123',
        Status: 'ACTIVE',
        'Task Permissions': 'DESIGN_ENTRIES,ORDER_ENTRIES,ORDER_APPROVALS,VIEW_REPORTS',
      },
    ];
    const referenceRows = [
      { Field: 'Role', AllowedValues: Object.values(UserRole).join(', '), Notes: 'Required' },
      { Field: 'Status', AllowedValues: 'ACTIVE, INACTIVE', Notes: 'Optional, defaults to ACTIVE' },
      {
        Field: 'Task Permissions',
        AllowedValues: Object.values(TaskPermission).join(', '),
        Notes: 'Optional comma-separated values. Leave blank to use role defaults.',
      },
      {
        Field: 'Password',
        AllowedValues: 'Minimum 8 characters',
        Notes: 'Required for new users. Optional when updating existing users by email.',
      },
      {
        Field: 'Company Code',
        AllowedValues: 'Existing company code',
        Notes: 'Required for COMPANY_ADMIN, BRANCH_MANAGER, SALES_REP',
      },
      {
        Field: 'Branch Code',
        AllowedValues: 'Existing branch code',
        Notes: 'Required for BRANCH_MANAGER and SALES_REP',
      },
    ];

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(templateRows, { header: [...this.userImportHeaders] }), 'Users');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(referenceRows), 'Reference');

    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: 'users-import-template.xlsx',
    };
  }

  async exportUsers(query: FindUsersQueryDto = {}, requester?: AuthUser): Promise<{ buffer: Buffer; fileName: string }> {
    const users = await this.findAll(query, requester);
    const workbook = XLSX.utils.book_new();
    const rows = users.map((user) => ({
      Email: user.email,
      'First Name': user.firstName,
      'Last Name': user.lastName,
      Role: user.role,
      'Company Code': user.company?.companyCode || '',
      'Company Name': user.company?.companyName || '',
      'Branch Code': user.branch?.code || '',
      'Branch Name': user.branch?.name || '',
      Phone: user.phone || '',
      Status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      'Task Permissions': (user.taskPermissions || []).join(','),
      'Created At': user.createdAt,
      'Updated At': user.updatedAt,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Users');
    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: `users-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
    };
  }

  async importUsers(file?: { buffer?: Buffer; originalname?: string }): Promise<{
    totalRows: number;
    created: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Excel file is required');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('The uploaded workbook is empty');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });

    if (rows.length === 0) {
      throw new BadRequestException('The uploaded sheet does not contain any rows');
    }

    const companyMap = await this.getCompanyCodeMap();
    const branchMap = await this.getBranchCodeMap();
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = this.normalizeUserImportRow(rows[index]);
      const line = index + 2;

      try {
        const payload = await this.buildUserImportPayload(row, companyMap, branchMap, line);
        const existing = await this.userRepo.findOne({ where: { email: payload.email } });

        if (existing) {
          const updateDto: UpdateUserDto = {
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            role: payload.role,
            companyId: payload.companyId,
            branchId: payload.branchId,
            phone: payload.phone,
            isActive: payload.isActive,
            taskPermissions: payload.taskPermissions,
          };
          if (payload.password) {
            updateDto.password = payload.password;
          }
          await this.update(existing.id, updateDto);
          updated += 1;
        } else {
          if (!payload.password) {
            throw new BadRequestException('Password is required for new users');
          }
          const createDto: CreateUserDto = {
            email: payload.email,
            password: payload.password,
            firstName: payload.firstName,
            lastName: payload.lastName,
            role: payload.role,
            companyId: payload.companyId,
            branchId: payload.branchId,
            phone: payload.phone,
            isActive: payload.isActive,
            taskPermissions: payload.taskPermissions,
          };
          await this.create(createDto);
          created += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${line}: ${message}`);
      }
    }

    return {
      totalRows: rows.length,
      created,
      updated,
      failed: errors.length,
      errors,
    };
  }

  async findBranchEmployees(requester: AuthUser): Promise<UserResponse[]> {
    const scope = await this.resolveBranchEmployeeScope(requester);
    const roleFilter =
      requester.role === UserRole.COMPANY_ADMIN
        ? In([UserRole.SALES_REP, UserRole.BRANCH_MANAGER])
        : UserRole.SALES_REP;

    const users = await this.userRepo.find({
      where: {
        role: roleFilter as any,
        companyId: scope.companyId ?? null,
        ...(scope.branchId ? { branchId: scope.branchId } : {}),
      },
      order: { createdAt: 'DESC' },
      relations: ['company', 'branch'],
    });

    const userIds = users.map((user) => user.id);
    const [managedCompaniesMap, detailedPermissionsMap] = await Promise.all([
      this.getManagedCompaniesMap(userIds),
      this.getUserDetailedPermissionsMap(userIds),
    ]);
    return Promise.all(
      users.map((user) =>
        this.mapToUserResponse(
          user,
          managedCompaniesMap.get(user.id) || [],
          detailedPermissionsMap.get(user.id) || [],
        ),
      ),
    );
  }

  async createBranchEmployee(dto: CreateBranchEmployeeDto, requester: AuthUser): Promise<UserResponse> {
    const scope = await this.resolveBranchEmployeeScope(requester, dto.branchId);

    const payload: CreateUserDto = {
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: UserRole.SALES_REP,
      companyId: scope.companyId ?? undefined,
      branchId: scope.branchId ?? undefined,
    };

    return this.create(payload);
  }

  async updateBranchEmployee(
    id: number,
    dto: UpdateBranchEmployeeDto,
    requester: AuthUser,
  ): Promise<UserResponse> {
    this.assertBranchEmployeeManagerAccess(requester);
    const employee = await this.userRepo.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException('User not found');
    }

    this.assertEmployeeScopeMatch(employee, requester);

    if (employee.role !== UserRole.SALES_REP) {
      throw new ForbiddenException('Only sales reps can be managed from mobile');
    }

    const payload: UpdateUserDto = {
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      branchId: employee.branchId,
    };

    if (dto.branchId !== undefined) {
      const nextBranchId = dto.branchId;
      if (!nextBranchId) {
        throw new BadRequestException('Branch is required');
      }

      const branch = await this.branchRepo.findOne({ where: { id: nextBranchId, isActive: true } });
      if (!branch) {
        throw new NotFoundException('Branch not found');
      }

      if (!requester.companyId || branch.companyId !== requester.companyId) {
        throw new ForbiddenException('Branch does not belong to your company');
      }

      payload.branchId = branch.id;
      payload.companyId = branch.companyId;
    }

    return this.update(id, payload, requester);
  }

  async updateBranchEmployeeStatus(
    id: number,
    isActive: boolean,
    requester: AuthUser,
  ): Promise<UserResponse> {
    this.assertBranchEmployeeManagerAccess(requester);
    const employee = await this.userRepo.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException('User not found');
    }

    this.assertEmployeeScopeMatch(employee, requester);

    if (employee.role !== UserRole.SALES_REP) {
      throw new ForbiddenException('Only sales reps can be managed from mobile');
    }

    return this.updateStatus(id, isActive, requester);
  }

  private assertCompanyAdminCanManageUser(requester: AuthUser, user: User): void {
    if (requester.role !== UserRole.COMPANY_ADMIN) {
      return;
    }
    if (!requester.companyId) {
      throw new ForbiddenException('Company admin must be assigned to a company');
    }
    if (user.companyId !== requester.companyId) {
      throw new ForbiddenException('You can only manage users in your company');
    }
    if (!this.companyAdminManagedRoles.includes(user.role)) {
      throw new ForbiddenException('Company admin can only manage branch managers or sales reps');
    }
  }

  private async resolveScope(
    role: UserRole,
    companyId?: number | null,
    branchId?: number | null,
  ): Promise<{ companyId: number | null; branchId: number | null }> {
    const normalizedCompanyId = companyId || null;
    const normalizedBranchId = branchId || null;

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

  private async ensureEmailAvailable(email: string, excludeUserId?: number): Promise<void> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing && existing.id !== excludeUserId) {
      throw new ConflictException('Email already exists');
    }
  }

  private async ensureUserHandleAvailable(userHandle: string, excludeUserId?: number): Promise<void> {
    const existing = await this.userRepo.findOne({ where: { userHandle } });
    if (existing && existing.id !== excludeUserId) {
      throw new ConflictException('User handle name alreday exit. try other please');
    }
  }

  private async ensureCompanyExists(companyId: number): Promise<void> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
  }

  private normalizeDetailedPermissions(
    permissions: Array<{ actionKey?: string; dataScope?: PermissionDataScope }> | undefined,
  ): { actionKey: string; dataScope: PermissionDataScope }[] {
    if (!permissions?.length) {
      return [];
    }

    const normalized = new Map<string, PermissionDataScope>();
    permissions.forEach((permission) => {
      const actionKey = String(permission.actionKey || '').trim();
      if (!actionKey) return;
      const dataScope = Object.values(PermissionDataScope).includes(permission.dataScope as PermissionDataScope)
        ? (permission.dataScope as PermissionDataScope)
        : PermissionDataScope.OWN;
      normalized.set(actionKey, dataScope);
    });

    return Array.from(normalized.entries()).map(([actionKey, dataScope]) => ({ actionKey, dataScope }));
  }

  private deriveLegacyPermissionsFromDetailed(
    detailedPermissions: { actionKey: string; dataScope: PermissionDataScope }[],
    role: UserRole,
  ): TaskPermission[] {
    const permissions = detailedPermissions
      .map((permission) => this.resolveLegacyPermissionForAction(permission.actionKey))
      .filter((permission): permission is TaskPermission => Boolean(permission));

    return this.normalizePermissions(permissions, role);
  }

  private resolveLegacyPermissionForAction(actionKey: string): TaskPermission | null {
    const key = actionKey.trim().toLowerCase();
    if (!key) return null;
    if (key.startsWith('company.') || key.startsWith('organization.company')) return TaskPermission.COMPANY_MANAGEMENT;
    if (key.startsWith('branch.') || key.startsWith('organization.branch')) return TaskPermission.BRANCH_MANAGEMENT;
    if (key.startsWith('user.') || key.startsWith('mobile.dashboard.quick_actions.team')) return TaskPermission.USER_MANAGEMENT;
    if (key.startsWith('design.') || key.startsWith('version.') || key.startsWith('catalog.') || key.startsWith('master.')) {
      return TaskPermission.DESIGN_ENTRIES;
    }
    if (
      key.includes('approval') ||
      key.includes('approve') ||
      key.includes('reject') ||
      key.includes('status_update')
    ) {
      return TaskPermission.ORDER_APPROVALS;
    }
    if (key.startsWith('order.') || key.startsWith('mobile.order.') || key.startsWith('spiff.') || key.startsWith('mobile.spiff.')) {
      return TaskPermission.ORDER_ENTRIES;
    }
    if (key.startsWith('pricing.') || key.startsWith('mobile.pricing.') || key.includes('price_activity')) {
      return TaskPermission.PRICING_CONFIGURATION;
    }
    if (key.startsWith('dashboard.') || key.startsWith('mobile.dashboard.') || key.startsWith('notification.') || key.startsWith('ai.')) {
      return TaskPermission.VIEW_REPORTS;
    }
    return null;
  }

  private async replaceUserDetailedPermissions(
    userId: number,
    permissions: { actionKey: string; dataScope: PermissionDataScope }[],
  ): Promise<void> {
    try {
      await this.userPermissionActionRepo.delete({ userId });
    } catch (error) {
      if (this.isMissingPermissionTableError(error)) {
        throw new BadRequestException('Detailed permission table is missing. Run the user permission actions database upgrade before saving permissions.');
      }
      throw error;
    }
    if (!permissions.length) {
      return;
    }

    const rows = permissions.map((permission) =>
      this.userPermissionActionRepo.create({
        userId,
        actionKey: permission.actionKey,
        dataScope: permission.dataScope,
      }),
    );
    try {
      await this.userPermissionActionRepo.save(rows);
    } catch (error) {
      if (this.isMissingPermissionTableError(error)) {
        throw new BadRequestException('Detailed permission table is missing. Run the user permission actions database upgrade before saving permissions.');
      }
      throw error;
    }
  }

  private async getUserDetailedPermissionsMap(
    userIds: number[],
  ): Promise<Map<number, { actionKey: string; dataScope: PermissionDataScope }[]>> {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    const map = new Map<number, { actionKey: string; dataScope: PermissionDataScope }[]>();
    uniqueUserIds.forEach((userId) => map.set(userId, []));
    if (!uniqueUserIds.length) {
      return map;
    }

    let rows: UserPermissionAction[] = [];
    try {
      rows = await this.userPermissionActionRepo.find({
        where: { userId: In(uniqueUserIds) },
        order: { actionKey: 'ASC' },
      });
    } catch (error) {
      if (this.isMissingPermissionTableError(error)) {
        return map;
      }
      throw error;
    }
    rows.forEach((row) => {
      const target = map.get(row.userId) || [];
      target.push({ actionKey: row.actionKey, dataScope: row.dataScope });
      map.set(row.userId, target);
    });
    return map;
  }

  private isMissingPermissionTableError(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    const message = String((error as { message?: string })?.message || '').toLowerCase();
    return code === 'ER_NO_SUCH_TABLE' || message.includes('user_permission_actions');
  }

  private async resolveRoleDefaultPermissionAssignment(role: UserRole): Promise<{
    taskPermissions: TaskPermission[];
    detailedPermissions?: { actionKey: string; dataScope: PermissionDataScope }[];
  }> {
    const defaultProfile = await this.permissionsService.getRoleDefault(role);
    if (!defaultProfile) {
      return { taskPermissions: this.normalizePermissions(undefined, role) };
    }

    const detailedPermissions = this.normalizeDetailedPermissions(defaultProfile.detailedPermissions || []);
    const taskPermissions = detailedPermissions.length > 0
      ? this.deriveLegacyPermissionsFromDetailed(detailedPermissions, role)
      : this.normalizePermissions(defaultProfile.taskPermissions, role);

    return {
      taskPermissions,
      detailedPermissions: detailedPermissions.length > 0 ? detailedPermissions : undefined,
    };
  }
  private normalizePermissions(
    permissions: TaskPermission[] | undefined,
    role: UserRole,
  ): TaskPermission[] {
    const allowed = new Set(this.allowedPermissionsByRole[role] || []);
    const source = permissions ?? this.defaultPermissionsByRole[role];
    const normalized = Array.from(new Set(source)).filter((permission) => allowed.has(permission));
    if (role === UserRole.SUPER_ADMIN) {
      return this.allPermissions;
    }
    return normalized;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeUserHandle(userHandle?: string | null): string | null {
    const normalized = String(userHandle || '').trim().toLowerCase();
    return normalized || null;
  }

  private workbookToBuffer(workbook: XLSX.WorkBook): Buffer {
    const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.isBuffer(output) ? output : Buffer.from(output);
  }

  private getImportCell(row: Record<string, unknown>, ...keys: string[]): string {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) {
        return String(row[key]).trim();
      }
    }
    return '';
  }

  private normalizeUserImportRow(row: Record<string, unknown>): UserImportRow {
    return {
      email: this.getImportCell(row, 'Email', 'email'),
      firstName: this.getImportCell(row, 'First Name', 'firstName'),
      lastName: this.getImportCell(row, 'Last Name', 'lastName'),
      role: this.getImportCell(row, 'Role', 'role'),
      companyCode: this.getImportCell(row, 'Company Code', 'companyCode'),
      branchCode: this.getImportCell(row, 'Branch Code', 'branchCode'),
      phone: this.getImportCell(row, 'Phone', 'phone'),
      password: this.getImportCell(row, 'Password', 'password'),
      status: this.getImportCell(row, 'Status', 'status'),
      taskPermissions: this.getImportCell(row, 'Task Permissions', 'taskPermissions'),
    };
  }

  private async getCompanyCodeMap(): Promise<Map<string, Company>> {
    const companies = await this.companyRepo.find();
    return new Map(companies.map((company) => [company.companyCode.trim().toUpperCase(), company]));
  }

  private async getBranchCodeMap(): Promise<Map<string, Branch[]>> {
    const branches = await this.branchRepo.find();
    const map = new Map<string, Branch[]>();
    branches.forEach((branch) => {
      const key = branch.code.trim().toUpperCase();
      const bucket = map.get(key) || [];
      bucket.push(branch);
      map.set(key, bucket);
    });
    return map;
  }

  private async buildUserImportPayload(
    row: UserImportRow,
    companyMap: Map<string, Company>,
    branchMap: Map<string, Branch[]>,
    line: number,
  ): Promise<CreateUserDto> {
    const email = this.normalizeEmail(String(row.email || ''));
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const firstName = String(row.firstName || '').trim();
    const lastName = String(row.lastName || '').trim();
    if (!firstName || !lastName) {
      throw new BadRequestException('First Name and Last Name are required');
    }

    const roleValue = String(row.role || '').trim().toUpperCase() as UserRole;
    if (!Object.values(UserRole).includes(roleValue)) {
      throw new BadRequestException(`Invalid role "${row.role}"`);
    }

    const companyCode = String(row.companyCode || '').trim().toUpperCase();
    const branchCode = String(row.branchCode || '').trim().toUpperCase();
    const status = String(row.status || 'ACTIVE').trim().toUpperCase();
    const taskPermissions = this.parseTaskPermissions(row.taskPermissions);
    const phone = String(row.phone || '').trim() || undefined;
    const password = String(row.password || '').trim();

    let companyId: number | null | undefined;
    let branchId: number | null | undefined;

    if (companyCode) {
      const company = companyMap.get(companyCode);
      if (!company) {
        throw new BadRequestException(`Company Code "${companyCode}" not found`);
      }
      companyId = company.id;
    }

    if (branchCode) {
      const branchMatches = branchMap.get(branchCode) || [];
      if (branchMatches.length === 0) {
        throw new BadRequestException(`Branch Code "${branchCode}" not found`);
      }

      const branch =
        companyId !== undefined && companyId !== null
          ? branchMatches.find((item) => item.companyId === companyId)
          : branchMatches.length === 1
            ? branchMatches[0]
            : null;

      if (!branch) {
        throw new BadRequestException(
          companyId
            ? `Branch Code "${branchCode}" does not belong to Company Code "${companyCode}"`
            : `Branch Code "${branchCode}" matches multiple companies. Provide Company Code as well.`,
        );
      }

      branchId = branch.id;
      companyId = branch.companyId;
    }

    if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
      throw new BadRequestException(`Invalid status "${row.status}"`);
    }

    if (password && password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    return {
      email,
      password,
      firstName,
      lastName,
      role: roleValue,
      companyId,
      branchId,
      phone,
      isActive: status !== 'INACTIVE',
      taskPermissions,
    };
  }

  private parseTaskPermissions(value: string): TaskPermission[] | undefined {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return undefined;
    }

    const permissions = normalized
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean) as TaskPermission[];

    const invalid = permissions.filter((permission) => !Object.values(TaskPermission).includes(permission));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid task permission(s): ${invalid.join(', ')}`);
    }

    return permissions;
  }

  async findBranchEmployeeBranches(
    requester: AuthUser,
  ): Promise<
    {
      id: number;
      name: string;
      code: string;
      streetAddress?: string | null;
      streetAddress2?: string | null;
      city?: string | null;
      stateProvince?: string | null;
      postalCode?: string | null;
      country?: string | null;
      email?: string | null;
      phone?: string | null;
    }[]
  > {
    const qb = this.branchRepo
      .createQueryBuilder('branch')
      .leftJoin('branch.company', 'company')
      .where('branch.isActive = :isActive', { isActive: true })
      .orderBy('branch.name', 'ASC');

    if (requester.role === UserRole.INTERNAL_REP) {
      qb.andWhere('company.accountManagerId = :accountManagerId', { accountManagerId: requester.id });
    } else if (
      requester.role === UserRole.COMPANY_ADMIN ||
      requester.role === UserRole.BRANCH_MANAGER ||
      requester.role === UserRole.SALES_REP
    ) {
      if (!requester.companyId) {
        return [];
      }
      qb.andWhere('branch.companyId = :companyId', { companyId: requester.companyId });
      if (requester.branchId) {
        qb.andWhere('branch.id = :branchId', { branchId: requester.branchId });
      }
    }

    const branches = await qb.getMany();
    return branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      code: branch.code,
      streetAddress: branch.streetAddress,
      streetAddress2: branch.streetAddress2,
      city: branch.city,
      stateProvince: branch.stateProvince,
      postalCode: branch.postalCode,
      country: branch.country,
      email: branch.email,
      phone: branch.phone,
    }));
  }

  private assertBranchEmployeeManagerAccess(requester: AuthUser): void {
    if (requester.role !== UserRole.BRANCH_MANAGER && requester.role !== UserRole.COMPANY_ADMIN) {
      throw new ForbiddenException('Only branch managers or company admins can manage branch employees');
    }
  }

  private assertEmployeeScopeMatch(employee: User, requester: AuthUser): void {
    if (requester.role === UserRole.BRANCH_MANAGER) {
      if (!requester.branchId) {
        throw new ForbiddenException('Branch manager must be assigned to a branch');
      }
      if (employee.branchId !== requester.branchId) {
        throw new ForbiddenException('You can only manage employees in your branch');
      }
      return;
    }

    if (requester.role === UserRole.COMPANY_ADMIN) {
      if (!requester.companyId) {
        throw new ForbiddenException('Company admin must be assigned to a company');
      }
      if (employee.companyId !== requester.companyId) {
        throw new ForbiddenException('You can only manage employees in your company');
      }
    }
  }

  private async resolveBranchEmployeeScope(
    requester: AuthUser,
    branchId?: number,
  ): Promise<{ companyId: number | null; branchId: number | null }> {
    if (requester.role === UserRole.BRANCH_MANAGER) {
      if (!requester.companyId || !requester.branchId) {
        throw new ForbiddenException('Branch manager must be assigned to a company and branch');
      }
      return { companyId: requester.companyId, branchId: requester.branchId };
    }

    if (requester.role !== UserRole.COMPANY_ADMIN) {
      throw new ForbiddenException('Only branch managers or company admins can manage branch employees');
    }

    if (!requester.companyId) {
      throw new ForbiddenException('Company admin must be assigned to a company');
    }

    if (!branchId) {
      return { companyId: requester.companyId, branchId: null };
    }

    const branch = await this.branchRepo.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    if (branch.companyId !== requester.companyId) {
      throw new ForbiddenException('Branch does not belong to your company');
    }
    return { companyId: requester.companyId, branchId: branch.id };
  }

  private async getManagedCompaniesMap(
    userIds: number[],
  ): Promise<Map<number, { id: number; companyName: string; companyCode: string }[]>> {
    const map = new Map<number, { id: number; companyName: string; companyCode: string }[]>();

    if (userIds.length === 0) {
      return map;
    }

    const companies = await this.companyRepo
      .createQueryBuilder('company')
      .select(['company.id AS id', 'company.companyName AS companyName', 'company.companyCode AS companyCode', 'company.accountManagerId AS accountManagerId'])
      .where('company.accountManagerId IN (:...userIds)', { userIds })
      .orderBy('company.companyName', 'ASC')
      .getRawMany<{
        id: number;
        companyName: string;
        companyCode: string;
        accountManagerId: number;
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
    managedCompanies: { id: number; companyName: string; companyCode: string }[] = [],
    detailedPermissions: { actionKey: string; dataScope: PermissionDataScope }[] = [],
  ): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userHandle: user.userHandle || null,
      role: user.role,
      companyId: user.companyId || null,
      branchId: user.branchId || null,
      phone: user.phone || null,
      photoUrl: user.photoUrl || null,
      photoStoragePath: user.photoUrl || null,
      isActive: user.isActive,
      isOnline: this.isUserOnline(user),
      lastSeenAt: user.lastSeenAt || null,
      taskPermissions: user.taskPermissions || [],
      detailedPermissions,
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

  private async mapToUserResponse(
    user: User,
    managedCompanies: { id: number; companyName: string; companyCode: string }[] = [],
    detailedPermissions: { actionKey: string; dataScope: PermissionDataScope }[] = [],
  ): Promise<UserResponse> {
    const response = this.toResponse(user, managedCompanies, detailedPermissions);
    return {
      ...response,
      photoUrl: await this.resolveUserPhotoUrl(response.photoStoragePath),
    };
  }

  private isUserOnline(user: User): boolean {
    if (!user.isActive || !user.lastSeenAt) {
      return false;
    }
    const onlineWindowMinutes = Number.parseInt(process.env.USER_ONLINE_WINDOW_MINUTES || '10', 10);
    const safeWindow = Number.isFinite(onlineWindowMinutes) && onlineWindowMinutes > 0 ? onlineWindowMinutes : 10;
    const diffMs = Date.now() - new Date(user.lastSeenAt).getTime();
    return diffMs >= 0 && diffMs <= safeWindow * 60 * 1000;
  }

  private resolveImageExtension(originalName: string, mimeType: string): string {
    const byName = extname((originalName || '').trim().toLowerCase());
    if (byName && ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(byName)) {
      return byName;
    }

    if (mimeType.includes('png')) return '.png';
    if (mimeType.includes('webp')) return '.webp';
    if (mimeType.includes('gif')) return '.gif';
    return '.jpg';
  }

  private buildPublicAssetUrl(
    request: { protocol?: string; get?: (name: string) => string | undefined; headers?: Record<string, string | string[] | undefined> } | undefined,
    relativePath: string,
  ): string {
    let normalizedRelative = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

    const envBase = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
    if (envBase) {
      const normalizedBase = envBase.endsWith('/api') ? envBase.slice(0, -4) : envBase;
      return `${normalizedBase}${normalizedRelative}`;
    }

    if (!request) {
      return normalizedRelative;
    }

    const forwardedProto = request.headers?.['x-forwarded-proto'];
    const protocol = request.protocol || (typeof forwardedProto === 'string' ? forwardedProto.split(',')[0] : '') || 'http';
    const host = request.get?.('host') || '';
    if (!host) {
      return normalizedRelative;
    }

    normalizedRelative = normalizedRelative.replace(/\/{2,}/g, '/');
    return `${protocol}://${host}${normalizedRelative}`;
  }

  private optionalText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private getS3Config(): {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  } | null {
    const bucket = this.optionalText(process.env.AWS_S3_BUCKET);
    const region = this.optionalText(process.env.AWS_REGION);
    const accessKeyId = this.optionalText(process.env.AWS_ACCESS_KEY_ID) || this.optionalText(process.env.AWS_ACCESS_KEY);
    const secretAccessKey =
      this.optionalText(process.env.AWS_SECRET_ACCESS_KEY) || this.optionalText(process.env.AWS_SECRET_KEY);

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      return null;
    }

    return { bucket, region, accessKeyId, secretAccessKey };
  }

  private getS3Client(): { client: S3Client; bucket: string } | null {
    const config = this.getS3Config();
    if (!config) {
      return null;
    }

    if (!this.s3Client) {
      const endpoint = this.optionalText(process.env.AWS_S3_ENDPOINT);
      this.s3Client = new S3Client({
        region: config.region,
        endpoint: endpoint || undefined,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
    }

    return { client: this.s3Client, bucket: config.bucket };
  }

  private getSignedUrlExpiresIn(): number {
    const raw = this.optionalText(process.env.AWS_S3_SIGNED_URL_EXPIRES);
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return 21600;
  }

  private getSignedUrlCacheKey(bucket: string, key: string): string {
    return `${bucket}/${key}`;
  }

  private getCachedSignedUrl(bucket: string, key: string): string | null {
    const cacheKey = this.getSignedUrlCacheKey(bucket, key);
    const cached = this.signedUrlCache.get(cacheKey);
    if (!cached) return null;
    if (Date.now() >= cached.expiresAt - this.signedUrlCacheSkewMs) {
      this.signedUrlCache.delete(cacheKey);
      return null;
    }
    return cached.url;
  }

  private setCachedSignedUrl(bucket: string, key: string, url: string, expiresInSeconds: number): void {
    const cacheKey = this.getSignedUrlCacheKey(bucket, key);
    this.signedUrlCache.set(cacheKey, {
      url,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    });
    if (this.signedUrlCache.size > 3000) {
      const now = Date.now();
      for (const [entryKey, entry] of this.signedUrlCache.entries()) {
        if (entry.expiresAt <= now || this.signedUrlCache.size > 2500) {
          this.signedUrlCache.delete(entryKey);
        }
      }
    }
  }

  private parseS3KeyFromUrl(value: string, bucket: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('s3://')) {
      const withoutScheme = trimmed.slice(5);
      const [bucketName, ...rest] = withoutScheme.split('/');
      if (!bucketName || rest.length === 0) return null;
      if (bucketName !== bucket) return null;
      return rest.join('/');
    }

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      return null;
    }

    const host = parsedUrl.hostname;
    const path = parsedUrl.pathname.replace(/^\/+/, '');

    if (host.startsWith(`${bucket}.s3`)) {
      return path || null;
    }

    if (host.startsWith('s3') && path.startsWith(`${bucket}/`)) {
      return path.slice(bucket.length + 1) || null;
    }

    return null;
  }

  private async createSignedUrl(client: S3Client, bucket: string, key: string): Promise<string> {
    const cached = this.getCachedSignedUrl(bucket, key);
    if (cached) {
      return cached;
    }
    const expiresIn = this.getSignedUrlExpiresIn();
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(client, command, { expiresIn });
    this.setCachedSignedUrl(bucket, key, url, expiresIn);
    return url;
  }

  private async resolveUserPhotoUrl(value: string | null | undefined): Promise<string | null> {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const s3Config = this.getS3Client();
    if (!s3Config) {
      return trimmed;
    }

    const { client, bucket } = s3Config;
    const key = this.parseS3KeyFromUrl(trimmed, bucket);
    if (!key) {
      return trimmed;
    }

    return this.createSignedUrl(client, bucket, key);
  }

  private normalizePhotoStoragePath(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const s3Config = this.getS3Client();
    if (!s3Config) {
      return trimmed;
    }

    const key = this.parseS3KeyFromUrl(trimmed, s3Config.bucket);
    if (!key) {
      return trimmed;
    }

    return `s3://${s3Config.bucket}/${key}`;
  }
}





