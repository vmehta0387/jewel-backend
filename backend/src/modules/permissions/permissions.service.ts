import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionAction } from './entities/permission-action.entity';
import { PermissionModule } from './entities/permission-module.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(PermissionModule)
    private readonly moduleRepo: Repository<PermissionModule>,
    @InjectRepository(PermissionAction)
    private readonly actionRepo: Repository<PermissionAction>,
  ) {}

  async getMatrix() {
    let modules: PermissionModule[] = [];
    let actions: PermissionAction[] = [];

    try {
      [modules, actions] = await Promise.all([
        this.moduleRepo.find({ where: { isActive: true }, order: { sortOrder: 'ASC', label: 'ASC' } }),
        this.actionRepo.find({ where: { isActive: true }, order: { sortOrder: 'ASC', label: 'ASC' } }),
      ]);
    } catch (error) {
      if (this.isMissingPermissionTableError(error)) {
        return { modules: [] };
      }
      throw error;
    }

    const actionsByModule = new Map<string, PermissionAction[]>();
    actions.forEach((action) => {
      const bucket = actionsByModule.get(action.moduleKey) || [];
      bucket.push(action);
      actionsByModule.set(action.moduleKey, bucket);
    });

    return {
      modules: modules.map((module) => ({
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
      })),
    };
  }

  private isMissingPermissionTableError(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    const message = String((error as { message?: string })?.message || '').toLowerCase();
    return code === 'ER_NO_SUCH_TABLE' || message.includes('permission_modules') || message.includes('permission_actions');
  }
}
