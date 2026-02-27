import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TaskPermission } from '../../../common/enums/task-permission.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { TASK_PERMISSIONS_KEY } from '../decorators/task-permissions.decorator';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class TaskPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<TaskPermission[]>(
      TASK_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!request.user) {
      return false;
    }

    if (request.user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const userPermissions = new Set(request.user.taskPermissions || []);
    return requiredPermissions.every((permission) => userPermissions.has(permission));
  }
}
