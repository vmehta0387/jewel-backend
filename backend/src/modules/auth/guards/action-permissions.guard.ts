import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserPermissionAction } from '../../permissions/entities/user-permission-action.entity';
import { ACTION_PERMISSIONS_KEY, ANY_ACTION_PERMISSIONS_KEY } from '../decorators/action-permissions.decorator';
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

    const allowedActions = new Set(await this.getAllowedActionKeys(user.id));
    const hasAllRequired = (requiredPermissions || []).every((permission) => allowedActions.has(permission));
    const hasAnyRequired =
      !anyRequiredPermissions ||
      anyRequiredPermissions.length === 0 ||
      anyRequiredPermissions.some((permission) => allowedActions.has(permission));
    return hasAllRequired && hasAnyRequired;
  }

  private async getAllowedActionKeys(userId: string): Promise<string[]> {
    try {
      const rows = await this.dataSource.getRepository(UserPermissionAction).find({
        where: { userId },
        select: ['actionKey'],
      });
      return rows.map((row) => row.actionKey);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const message = String((error as { message?: string })?.message || '').toLowerCase();
      if (code === 'ER_NO_SUCH_TABLE' || message.includes('user_permission_actions')) {
        return [];
      }
      throw error;
    }
  }
}
