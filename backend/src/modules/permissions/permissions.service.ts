import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { PermissionAction } from './entities/permission-action.entity';
import { PermissionModule } from './entities/permission-module.entity';
import { RoleDefaultPermissionAction } from './entities/role-default-permission-action.entity';
import { RolePermissionDefault } from './entities/role-permission-default.entity';
import { PermissionDataScope } from './entities/user-permission-action.entity';
import { UpdateRolePermissionDefaultDto } from './dto/role-permission-default.dto';
import { User } from '../users/entities/user.entity';
import { UserPermissionAction } from './entities/user-permission-action.entity';
import { getRestoredSpiffPermissionsForRole } from './spiff-role-permissions';

const HIDDEN_PERMISSION_MODULES = new Set([
  'design',
  'version',
  'catalog',
  'notification',
  'ai',
]);

const HIDDEN_PERMISSION_ACTIONS = new Set([
  'dashboard.view',
  'dashboard.totals.view',
  'dashboard.order_activity.view',
  'dashboard.order_activity.received_today.view',
  'dashboard.order_activity.due_today.view',
  'dashboard.order_activity.sales_week.view',
  'dashboard.order_activity.active_orders.view',
  'dashboard.order_activity.trends.view',
  'mobile.dashboard.view',
  'mobile.dashboard.totals.view',
  'mobile.dashboard.quick_actions.view',
  'mobile.dashboard.quick_actions.orders.view',
  'mobile.dashboard.quick_actions.spiff.view',
  'mobile.dashboard.quick_actions.catalog.view',
  'mobile.dashboard.quick_actions.branches.view',
  'mobile.dashboard.quick_actions.team.view',
  'mobile.dashboard.quick_actions.pricing.view',
  'mobile.dashboard.trending.view',
  'mobile.dashboard.trending.price.view',
  'mobile.dashboard.trending.open_design',
  'mobile.dashboard.pipeline.view',
  'mobile.dashboard.performance.rep.view',
  'mobile.dashboard.performance.branch.view',
  'mobile.dashboard.notifications.view',
  'mobile.dashboard.profile_photo.update',
  'order.view',
  'order.create',
  'order.edit',
  'order.approve',
  'order.reject',
  'order.price_preview',
  'order.price_override',
  'order.cost_price.view',
  'mobile.order.view',
  'mobile.order.create',
  'mobile.order.edit',
  'mobile.order.approve',
  'mobile.order.reject',
  'mobile.order.price_preview',
  'packet.view',
  'packet.create',
  'packet.edit',
  'packet.selling_price.update',
  'pricing.view',
  'pricing.base.create',
  'pricing.base.edit',
  'pricing.recalculate',
]);

@Injectable()
export class PermissionsService implements OnModuleInit {
  constructor(
    @InjectRepository(PermissionModule)
    private readonly moduleRepo: Repository<PermissionModule>,
    @InjectRepository(PermissionAction)
    private readonly actionRepo: Repository<PermissionAction>,
    @InjectRepository(RolePermissionDefault)
    private readonly roleDefaultRepo: Repository<RolePermissionDefault>,
    @InjectRepository(RoleDefaultPermissionAction)
    private readonly roleDefaultActionRepo: Repository<RoleDefaultPermissionAction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserPermissionAction)
    private readonly userPermissionActionRepo: Repository<UserPermissionAction>,
  ) {}

  async onModuleInit() {
    await this.backfillRestoredSpiffPermissions();
  }

  /**
   * Restores the SPIFF baseline for both existing users and any saved role
   * defaults. Inserts are idempotent, so administrator-assigned permissions
   * are preserved and no unrelated permissions are changed.
   */
  private async backfillRestoredSpiffPermissions() {
    try {
      const roles = [UserRole.SALES_REP, UserRole.BRANCH_MANAGER];
      const [users, roleDefaults] = await Promise.all([
        this.userRepo.find({ where: { role: In(roles) }, select: ['id', 'role'] }),
        this.roleDefaultRepo.find({ where: { role: In(roles), isActive: true }, select: ['id', 'role'] }),
      ]);

      const userRows = users.flatMap((user) =>
        getRestoredSpiffPermissionsForRole(user.role).map((permission) =>
          ({ userId: user.id, ...permission }),
        ),
      );
      const roleDefaultRows = roleDefaults.flatMap((defaultProfile) =>
        getRestoredSpiffPermissionsForRole(defaultProfile.role).map((permission) =>
          ({ defaultId: defaultProfile.id, ...permission }),
        ),
      );

      if (userRows.length > 0) {
        const placeholders = userRows.map(() => '(?, ?, ?)').join(', ');
        await this.userPermissionActionRepo.query(
          `INSERT IGNORE INTO user_permission_actions (user_id, action_key, data_scope) VALUES ${placeholders}`,
          userRows.flatMap((row) => [row.userId, row.actionKey, row.dataScope]),
        );
      }
      if (roleDefaultRows.length > 0) {
        const placeholders = roleDefaultRows.map(() => '(?, ?, ?)').join(', ');
        await this.roleDefaultActionRepo.query(
          `INSERT IGNORE INTO role_default_permission_actions (default_id, action_key, data_scope) VALUES ${placeholders}`,
          roleDefaultRows.flatMap((row) => [row.defaultId, row.actionKey, row.dataScope]),
        );
      }
    } catch (error) {
      if (this.isMissingRoleDefaultTableError(error) || this.isMissingPermissionCatalogTableError(error)) {
        return;
      }
      throw error;
    }
  }

  async getMatrix() {
    let modules: PermissionModule[] = [];
    let actions: PermissionAction[] = [];

    try {
      [modules, actions] = await Promise.all([
        this.moduleRepo.find({ where: { isActive: true }, order: { sortOrder: 'ASC', label: 'ASC' } }),
        this.actionRepo.find({ where: { isActive: true }, order: { sortOrder: 'ASC', label: 'ASC' } }),
      ]);
    } catch (error) {
      if (this.isMissingPermissionCatalogTableError(error)) {
        return { modules: [] };
      }
      throw error;
    }

    const actionsByModule = new Map<string, PermissionAction[]>();
    actions
      .filter((action) => !HIDDEN_PERMISSION_ACTIONS.has(action.key))
      .forEach((action) => {
        const bucket = actionsByModule.get(action.moduleKey) || [];
        bucket.push(action);
        actionsByModule.set(action.moduleKey, bucket);
      });

    return {
      modules: modules
        .filter((module) => !HIDDEN_PERMISSION_MODULES.has(module.key))
        .map((module) => ({
          key: module.key,
          label: module.label,
          description: module.description || '',
          icon: module.icon || 'bi-grid',
          defaultScopeByRole: {},
          actions: (actionsByModule.get(module.key) || []).map((action) => ({
            key: action.key,
            label: action.label,
            description: action.description || '',
            group: action.group || undefined,
            platform: action.platform,
            legacyPermission: action.legacyPermission || undefined,
            sensitive: action.sensitive,
          })),
        }))
        .filter((module) => module.actions.length > 0),
    };
  }

  async listRoleDefaults() {
    try {
      const defaults = await this.roleDefaultRepo.find({ order: { role: 'ASC' } });
      const actionMap = await this.getRoleDefaultActionMap(defaults.map((item) => item.id));
      return defaults.map((item) => this.toRoleDefaultResponse(item, actionMap.get(item.id) || []));
    } catch (error) {
      if (this.isMissingRoleDefaultTableError(error)) {
        return [];
      }
      throw error;
    }
  }

  async getRoleDefault(role: UserRole) {
    const defaultProfile = await this.findRoleDefault(role);
    if (!defaultProfile) {
      return null;
    }

    const actions = await this.roleDefaultActionRepo.find({ where: { defaultId: defaultProfile.id }, order: { actionKey: 'ASC' } });
    return this.toRoleDefaultResponse(defaultProfile, actions);
  }

  async upsertRoleDefault(role: UserRole, dto: UpdateRolePermissionDefaultDto) {
    let defaultProfile = await this.findRoleDefault(role);
    if (!defaultProfile) {
      defaultProfile = this.roleDefaultRepo.create({ role, name: dto.name?.trim() || 'Default', isActive: true });
    }

    defaultProfile.name = dto.name?.trim() || defaultProfile.name || 'Default';
    defaultProfile.taskPermissions = this.normalizeTaskPermissions(dto.taskPermissions || []);
    defaultProfile.isActive = dto.isActive ?? true;

    const saved = await this.roleDefaultRepo.save(defaultProfile);
    const detailedPermissions = this.normalizeDetailedPermissions(dto.detailedPermissions || []);

    await this.roleDefaultActionRepo.delete({ defaultId: saved.id });
    if (detailedPermissions.length > 0) {
      await this.roleDefaultActionRepo.save(
        detailedPermissions.map((permission) => this.roleDefaultActionRepo.create({
          defaultId: saved.id,
          actionKey: permission.actionKey,
          dataScope: permission.dataScope,
        })),
      );
    }

    return this.toRoleDefaultResponse(saved, detailedPermissions as RoleDefaultPermissionAction[]);
  }

  async requireRoleDefault(role: UserRole) {
    const defaultProfile = await this.getRoleDefault(role);
    if (!defaultProfile) {
      throw new NotFoundException('Role default permissions not found');
    }
    return defaultProfile;
  }

  private async findRoleDefault(role: UserRole) {
    try {
      return await this.roleDefaultRepo.findOne({ where: { role, isActive: true } });
    } catch (error) {
      if (this.isMissingRoleDefaultTableError(error)) {
        return null;
      }
      throw error;
    }
  }

  private async getRoleDefaultActionMap(defaultIds: number[]) {
    const actionMap = new Map<number, RoleDefaultPermissionAction[]>();
    if (defaultIds.length === 0) {
      return actionMap;
    }

    const actions = await this.roleDefaultActionRepo.find({ where: { defaultId: In(defaultIds) }, order: { actionKey: 'ASC' } });
    actions.forEach((action) => {
      const bucket = actionMap.get(action.defaultId) || [];
      bucket.push(action);
      actionMap.set(action.defaultId, bucket);
    });
    return actionMap;
  }

  private normalizeTaskPermissions(permissions: TaskPermission[]) {
    const allowed = new Set(Object.values(TaskPermission));
    return Array.from(new Set((permissions || []).filter((permission) => allowed.has(permission))));
  }

  private normalizeDetailedPermissions(permissions: Array<{ actionKey: string; dataScope?: PermissionDataScope }>) {
    const unique = new Map<string, { actionKey: string; dataScope: PermissionDataScope }>();
    (permissions || []).forEach((permission) => {
      const actionKey = String(permission.actionKey || '').trim();
      if (!actionKey) return;
      unique.set(actionKey, {
        actionKey,
        dataScope: permission.dataScope || PermissionDataScope.OWN,
      });
    });
    return Array.from(unique.values());
  }

  private toRoleDefaultResponse(defaultProfile: RolePermissionDefault, actions: Array<{ actionKey: string; dataScope: PermissionDataScope }>) {
    return {
      id: defaultProfile.id,
      role: defaultProfile.role,
      name: defaultProfile.name,
      isActive: defaultProfile.isActive,
      taskPermissions: defaultProfile.taskPermissions || [],
      detailedPermissions: actions.map((action) => ({
        actionKey: action.actionKey,
        dataScope: action.dataScope,
      })),
      createdAt: defaultProfile.createdAt,
      updatedAt: defaultProfile.updatedAt,
    };
  }

  private isMissingPermissionCatalogTableError(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    const message = String((error as { message?: string })?.message || '').toLowerCase();
    return code === 'ER_NO_SUCH_TABLE' || message.includes('permission_modules') || message.includes('permission_actions');
  }

  private isMissingRoleDefaultTableError(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    const message = String((error as { message?: string })?.message || '').toLowerCase();
    return code === 'ER_NO_SUCH_TABLE' || message.includes('role_permission_defaults') || message.includes('role_default_permission_actions');
  }
}
