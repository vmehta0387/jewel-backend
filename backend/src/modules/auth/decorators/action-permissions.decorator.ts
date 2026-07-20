import { SetMetadata } from '@nestjs/common';

export const ACTION_PERMISSIONS_KEY = 'actionPermissions';
export const ANY_ACTION_PERMISSIONS_KEY = 'anyActionPermissions';

export const ActionPermissions = (...permissions: string[]) =>
  SetMetadata(ACTION_PERMISSIONS_KEY, permissions);

export const AnyActionPermissions = (...permissions: string[]) =>
  SetMetadata(ANY_ACTION_PERMISSIONS_KEY, permissions);
