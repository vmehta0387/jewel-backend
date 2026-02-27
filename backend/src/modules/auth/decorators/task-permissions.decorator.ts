import { SetMetadata } from '@nestjs/common';
import { TaskPermission } from '../../../common/enums/task-permission.enum';

export const TASK_PERMISSIONS_KEY = 'taskPermissions';
export const TaskPermissions = (...permissions: TaskPermission[]) =>
  SetMetadata(TASK_PERMISSIONS_KEY, permissions);
