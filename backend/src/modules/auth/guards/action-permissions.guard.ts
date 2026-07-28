import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { TaskPermission } from '../../../common/enums/task-permission.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserPermissionAction } from '../../permissions/entities/user-permission-action.entity';
import { ACTION_PERMISSIONS_KEY, ANY_ACTION_PERMISSIONS_KEY } from '../decorators/action-permissions.decorator';
import { getDefaultMobileActionPermissionKeys } from '../default-mobile-permissions';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class ActionPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      ACTION_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const anyRequiredPermissions = this.reflector.getAllAndOverride<string[]>(
      ANY_ACTION_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if ((!requiredPermissions || requiredPermissions.length === 0) && (!anyRequiredPermissions || anyRequiredPermissions.length === 0)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      return false;
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const allowedActions = new Set(await this.getAllowedActionKeys(user));
    const hasAllRequired = (requiredPermissions || []).every((permission) =>
      this.hasActionOrLegacyPermission(permission, allowedActions, user),
    );
    const hasAnyRequired =
      !anyRequiredPermissions ||
      anyRequiredPermissions.length === 0 ||
      anyRequiredPermissions.some((permission) => this.hasActionOrLegacyPermission(permission, allowedActions, user));
    return hasAllRequired && hasAnyRequired;
  }

  private hasActionOrLegacyPermission(
    actionKey: string,
    allowedActions: Set<string>,
    user: AuthUser,
  ): boolean {
    if (allowedActions.has(actionKey)) {
      return true;
    }

    const legacyPermission = this.resolveLegacyPermissionForAction(actionKey);
    return Boolean(legacyPermission && (user.taskPermissions || []).includes(legacyPermission));
  }

  private resolveLegacyPermissionForAction(actionKey: string): TaskPermission | null {
    const key = actionKey.trim().toLowerCase();
    if (!key) return null;
    if (key.startsWith('company.') || key.startsWith('organization.company')) {
      return TaskPermission.COMPANY_MANAGEMENT;
    }
    if (key.startsWith('branch.') || key.startsWith('organization.branch')) {
      return TaskPermission.BRANCH_MANAGEMENT;
    }
    if (key.startsWith('user.') || key.startsWith('mobile.dashboard.quick_actions.team')) {
      return TaskPermission.USER_MANAGEMENT;
    }
    if (key.startsWith('design.') || key.startsWith('version.') || key.startsWith('catalog.') || key.startsWith('master.')) {
      return TaskPermission.DESIGN_ENTRIES;
    }
    if (key.startsWith('order.') || key.startsWith('mobile.order.') || key.startsWith('spiff.') || key.startsWith('mobile.spiff.')) {
      return TaskPermission.ORDER_ENTRIES;
    }
    if (key.includes('approval')) {
      return TaskPermission.ORDER_APPROVALS;
    }
    if (key.startsWith('pricing.') || key.startsWith('mobile.pricing.') || key.includes('price_activity')) {
      return TaskPermission.PRICING_CONFIGURATION;
    }
    if (key.startsWith('dashboard.') || key.startsWith('mobile.dashboard.') || key.startsWith('notification.') || key.startsWith('ai.')) {
      return TaskPermission.VIEW_REPORTS;
    }
    return null;
  }

  private async getAllowedActionKeys(user: AuthUser): Promise<string[]> {
    try {
      const rows = await this.dataSource.getRepository(UserPermissionAction).find({
        where: { userId: user.id },
        select: ['actionKey'],
      });
      if (rows.length === 0) {
        return getDefaultMobileActionPermissionKeys(user.role);
      }
      return rows.map((row) => row.actionKey);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const message = String((error as { message?: string })?.message || '').toLowerCase();
      if (code === 'ER_NO_SUCH_TABLE' || message.includes('user_permission_actions')) {
        return getDefaultMobileActionPermissionKeys(user.role);
      }
      throw error;
    }
  }
}
