import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionAction } from './entities/permission-action.entity';
import { PermissionModule } from './entities/permission-module.entity';

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

  private isMissingPermissionTableError(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    const message = String((error as { message?: string })?.message || '').toLowerCase();
    return code === 'ER_NO_SUCH_TABLE' || message.includes('permission_modules') || message.includes('permission_actions');
  }
}
