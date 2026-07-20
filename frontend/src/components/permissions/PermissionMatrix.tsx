import { useEffect, useMemo, useRef, useState } from 'react';
import type { TaskPermission, UserRole } from '../../types/auth.types';
import api from '../../services/api';
import AlertDialog from '../common/AlertDialog';

type DataScope = 'NONE' | 'OWN' | 'BRANCH' | 'COMPANY' | 'ALL';
type PlatformFilter = 'all' | 'web' | 'mobile';
export type DetailedPermission = {
  actionKey: string;
  dataScope: Exclude<DataScope, 'NONE' | 'ALL'>;
};

type PermissionAction = {
  key: string;
  label: string;
  description: string;
  group?: string;
  platform?: 'web' | 'mobile' | 'both';
  legacyPermission?: TaskPermission;
  sensitive?: boolean;
};

type PermissionModule = {
  key: string;
  label: string;
  description: string;
  icon: string;
  legacyPermission?: TaskPermission;
  defaultScopeByRole: Partial<Record<UserRole, DataScope>>;
  actions: PermissionAction[];
};

type PermissionMatrixProps = {
  value: TaskPermission[];
  detailedValue?: DetailedPermission[];
  allowedPermissions: TaskPermission[];
  defaultPermissions: TaskPermission[];
  role: UserRole;
  canEdit: boolean;
  error?: string;
  onChange: (permissions: TaskPermission[]) => void;
  onDetailedChange?: (permissions: DetailedPermission[]) => void;
};

const DATA_SCOPE_OPTIONS: Array<{ value: DataScope; label: string }> = [
  { value: 'OWN', label: 'Own' },
  { value: 'BRANCH', label: 'Branch' },
  { value: 'COMPANY', label: 'Company' },
];

const NO_SCOPE_ACTIONS = new Set([
  'dashboard.view',
  'mobile.dashboard.view',
  'mobile.dashboard.quick_actions.view',
  'mobile.dashboard.quick_actions.orders.view',
  'mobile.dashboard.quick_actions.spiff.view',
  'mobile.dashboard.quick_actions.catalog.view',
  'mobile.dashboard.quick_actions.branches.view',
  'mobile.dashboard.quick_actions.team.view',
  'mobile.dashboard.quick_actions.pricing.view',
  'mobile.dashboard.profile_photo.update',
  'mobile.notification.push.register',
]);

const MODULE_DEFAULT_SCOPE: Record<string, DataScope> = {
  dashboard: 'OWN',
  design: 'BRANCH',
  version: 'COMPANY',
  catalog: 'OWN',
  order: 'OWN',
  master: 'COMPANY',
  pricing: 'COMPANY',
  organization: 'BRANCH',
  user: 'BRANCH',
  spiff: 'OWN',
  notification: 'OWN',
  ai: 'OWN',
};

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
  'mobile.order.status_update',
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
  'mobile.pricing.view',
  'mobile.pricing.company.update',
  'mobile.pricing.branch.update',
  'mobile.pricing.gold.update',
]);

const MODULES: PermissionModule[] = [
  {
    key: 'dashboard',
    label: 'Dashboard & Reports',
    description: 'Dashboard cards, trends, summaries, and reporting screens.',
    icon: 'bi-bar-chart-line',
    legacyPermission: 'VIEW_REPORTS',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'OWN',
    },
    actions: [
      { key: 'dashboard.view', label: 'View dashboard', description: 'Open dashboard screens.', group: 'Core Access', platform: 'web', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.totals.view', label: 'Totals', description: 'Show total companies, total branches, design families, and generated versions.', group: 'Totals', platform: 'web', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.order_activity.view', label: 'Order activity', description: 'See order activity section.', group: 'Order Activity', platform: 'web', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.order_activity.received_today.view', label: 'Received today', description: 'See today received order count.', group: 'Order Activity', platform: 'web', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.order_activity.due_today.view', label: 'Due today', description: 'See orders due today.', group: 'Order Activity', platform: 'web', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.order_activity.sales_week.view', label: 'Sales this week', description: 'See weekly sales amount.', group: 'Order Activity', platform: 'web', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.order_activity.active_orders.view', label: 'Active orders', description: 'See active order count.', group: 'Order Activity', platform: 'web', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.order_activity.trends.view', label: 'Order trends', description: 'See order and sales trend charts.', group: 'Order Activity', platform: 'web', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.price_activity.view', label: 'Price activity', description: 'See live gold and packet price panels.', group: 'Price Activity', platform: 'web', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.price_activity.gold_price.view', label: 'View gold price', description: 'See gold market/live prices.', group: 'Price Activity', platform: 'web', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.price_activity.gold_price.update', label: 'Update gold price', description: 'Change gold price master values.', group: 'Price Activity', platform: 'web', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'dashboard.price_activity.packet_price.view', label: 'View packet price', description: 'See selected packet selling price.', group: 'Price Activity', platform: 'web', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.price_activity.packet_price.update', label: 'Update packet price', description: 'Change packet selling price from dashboard.', group: 'Price Activity', platform: 'web', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'mobile.dashboard.view', label: 'View mobile dashboard', description: 'Open the mobile dashboard tab.', group: 'Mobile Core Access', platform: 'mobile', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.dashboard.totals.view', label: 'Totals', description: 'Show sales, SPIFF, revenue, approvals, and reps.', group: 'Totals', platform: 'mobile', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.dashboard.quick_actions.view', label: 'Quick actions', description: 'See quick action shortcuts.', group: 'Quick Actions', platform: 'mobile', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.dashboard.quick_actions.orders.view', label: 'Orders shortcut', description: 'Show dashboard shortcut to orders.', group: 'Quick Actions', platform: 'mobile', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'mobile.dashboard.quick_actions.spiff.view', label: 'SPIFF shortcut', description: 'Show dashboard shortcut to SPIFF.', group: 'Quick Actions', platform: 'mobile', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'mobile.dashboard.quick_actions.catalog.view', label: 'Catalog shortcut', description: 'Show dashboard shortcut to catalog.', group: 'Quick Actions', platform: 'mobile', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.dashboard.quick_actions.branches.view', label: 'Branches shortcut', description: 'Show company admin branches shortcut.', group: 'Quick Actions', platform: 'mobile', legacyPermission: 'BRANCH_MANAGEMENT' },
      { key: 'mobile.dashboard.quick_actions.team.view', label: 'Team shortcut', description: 'Show team management shortcut.', group: 'Quick Actions', platform: 'mobile', legacyPermission: 'USER_MANAGEMENT' },
      { key: 'mobile.dashboard.quick_actions.pricing.view', label: 'Pricing shortcut', description: 'Show pricing shortcut.', group: 'Quick Actions', platform: 'mobile', legacyPermission: 'PRICING_CONFIGURATION' },
      { key: 'mobile.dashboard.trending.view', label: 'Trending today', description: 'See trending product cards.', group: 'Trending Today', platform: 'mobile', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.dashboard.trending.price.view', label: 'Trending prices', description: 'See prices on trending cards.', group: 'Trending Today', platform: 'mobile', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.dashboard.trending.open_design', label: 'Open trending design', description: 'Open design detail from trending card.', group: 'Trending Today', platform: 'mobile', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.dashboard.pipeline.view', label: 'Sales pipeline', description: 'See pending, approved, and production pipeline.', group: 'Pipeline', platform: 'mobile', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.dashboard.performance.rep.view', label: 'Rep performance', description: 'See branch rep sales ranking.', group: 'Performance', platform: 'mobile', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.dashboard.performance.branch.view', label: 'Branch performance', description: 'See company branch performance cards.', group: 'Performance', platform: 'mobile', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.dashboard.notifications.view', label: 'Notifications', description: 'Open dashboard notification popover.', group: 'Utility', platform: 'mobile', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.dashboard.profile_photo.update', label: 'Update profile photo', description: 'Upload profile photo from dashboard menu.', group: 'Utility', platform: 'mobile' },
    ],
  },
  {
    key: 'design',
    label: 'Design Engine',
    description: 'Design list, detail, media, history, and related design maintenance.',
    icon: 'bi-gem',
    legacyPermission: 'DESIGN_ENTRIES',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'BRANCH',
    },
    actions: [
      { key: 'design.view', label: 'View designs', description: 'Browse design list and details.', group: 'Core Access', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.create', label: 'Create design', description: 'Create a new design record.', group: 'Design Records', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.edit', label: 'Edit design', description: 'Update design specifications and BOM rows.', group: 'Design Records', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.activate', label: 'Activate or deactivate', description: 'Change design active status.', group: 'Design Records', platform: 'web', legacyPermission: 'DESIGN_ENTRIES', sensitive: true },
      { key: 'design.set_primary', label: 'Set primary', description: 'Mark a version as the primary design.', group: 'Version Control', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.history.view', label: 'View history', description: 'Review design change history.', group: 'Review', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.media.upload', label: 'Upload media', description: 'Upload gallery and STL files.', group: 'Media', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.import', label: 'Import designs', description: 'Upload design spreadsheet imports.', group: 'Bulk Tools', platform: 'web', legacyPermission: 'DESIGN_ENTRIES', sensitive: true },
      { key: 'design.export', label: 'Export designs', description: 'Download design exports and templates.', group: 'Bulk Tools', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.design.view', label: 'View mobile designs', description: 'Open the mobile design catalog.', group: 'Core Access', platform: 'mobile', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.design.detail.view', label: 'View design detail', description: 'Open mobile design detail specifications.', group: 'Detail', platform: 'mobile', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.design.specifications.view', label: 'View specifications', description: 'See specifications in mobile detail.', group: 'Detail', platform: 'mobile', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.design.price.view', label: 'View design price', description: 'See rule-based design prices.', group: 'Detail', platform: 'mobile', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.design.quote.create', label: 'Create quote/order', description: 'Start quote or order flow.', group: 'Detail', platform: 'mobile', legacyPermission: 'ORDER_ENTRIES' },
    ],
  },
  {
    key: 'version',
    label: 'Design Versions',
    description: 'Version lookup, version creation, and version builder workflows.',
    icon: 'bi-diagram-3',
    legacyPermission: 'DESIGN_ENTRIES',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'BRANCH',
    },
    actions: [
      { key: 'design.version.view', label: 'View versions', description: 'Open design family versions.', group: 'Versions', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.version.create', label: 'Create version', description: 'Create a new design version.', group: 'Versions', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.version.build', label: 'Build version', description: 'Use version builder.', group: 'Versions', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.version.set_primary', label: 'Set primary version', description: 'Promote a version to primary.', group: 'Versions', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
    ],
  },
  {
    key: 'catalog',
    label: 'Mobile Catalog & Quotes',
    description: 'Mobile catalog, configurator, quote builder, and quote summary flows.',
    icon: 'bi-phone',
    legacyPermission: 'ORDER_ENTRIES',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'OWN',
    },
    actions: [
      { key: 'catalog.view', label: 'View catalog', description: 'Open mobile catalog.', group: 'Catalog', platform: 'mobile', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'catalog.configure', label: 'Configure design', description: 'Use configurator and options.', group: 'Catalog', platform: 'mobile', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'quote.create', label: 'Create quote', description: 'Create quote from catalog.', group: 'Quote Workflow', platform: 'mobile', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'quote.edit', label: 'Edit quote', description: 'Modify quote/customer details.', group: 'Quote Workflow', platform: 'mobile', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'quote.send_for_approval', label: 'Send for approval', description: 'Submit a quote to approval queue.', group: 'Quote Workflow', platform: 'mobile', legacyPermission: 'ORDER_ENTRIES' },
    ],
  },
  {
    key: 'order',
    label: 'Orders',
    description: 'Order list, order detail, create/update order, status changes, and approval actions.',
    icon: 'bi-receipt-cutoff',
    legacyPermission: 'ORDER_ENTRIES',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'OWN',
    },
    actions: [
      { key: 'order.view', label: 'View orders', description: 'Browse and open orders.', group: 'Order Access', platform: 'web', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'order.create', label: 'Create order', description: 'Create new orders.', group: 'Order Entries', platform: 'web', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'order.edit', label: 'Edit order', description: 'Update order details.', group: 'Order Entries', platform: 'web', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'order.status_update', label: 'Update status', description: 'Change order status.', group: 'Approvals', platform: 'web', legacyPermission: 'ORDER_APPROVALS' },
      { key: 'order.approve', label: 'Approve order', description: 'Approve pending orders.', group: 'Approvals', platform: 'web', legacyPermission: 'ORDER_APPROVALS', sensitive: true },
      { key: 'order.reject', label: 'Reject order', description: 'Reject or cancel pending orders.', group: 'Approvals', platform: 'web', legacyPermission: 'ORDER_APPROVALS', sensitive: true },
      { key: 'order.price_preview', label: 'Preview price', description: 'Calculate retail price previews.', group: 'Pricing', platform: 'web', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'order.price_override', label: 'Override price', description: 'Manually override order price.', group: 'Pricing', platform: 'web', legacyPermission: 'ORDER_ENTRIES', sensitive: true },
      { key: 'order.cost_price.view', label: 'View cost price', description: 'See design/order cost price.', group: 'Pricing', platform: 'web', sensitive: true },
      { key: 'mobile.order.view', label: 'View mobile orders', description: 'Open mobile order list and detail screens.', group: 'Order Access', platform: 'mobile', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'mobile.order.create', label: 'Create mobile order', description: 'Create orders from mobile app.', group: 'Order Entries', platform: 'mobile', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'mobile.order.edit', label: 'Edit mobile order', description: 'Update order details from mobile.', group: 'Order Entries', platform: 'mobile', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'mobile.order.status_update', label: 'Update mobile status', description: 'Change order status from mobile.', group: 'Approvals', platform: 'mobile', legacyPermission: 'ORDER_APPROVALS' },
      { key: 'mobile.order.approve', label: 'Approve mobile order', description: 'Approve orders from mobile.', group: 'Approvals', platform: 'mobile', legacyPermission: 'ORDER_APPROVALS', sensitive: true },
      { key: 'mobile.order.reject', label: 'Reject mobile order', description: 'Reject pending mobile orders.', group: 'Approvals', platform: 'mobile', legacyPermission: 'ORDER_APPROVALS', sensitive: true },
      { key: 'mobile.order.price_preview', label: 'Preview mobile price', description: 'See retail price previews in mobile.', group: 'Pricing', platform: 'mobile', legacyPermission: 'ORDER_ENTRIES' },
    ],
  },
  {
    key: 'master',
    label: 'Masters & Packets',
    description: 'Design masters, packet inventory, finding heads, and import/export tools.',
    icon: 'bi-layers',
    legacyPermission: 'DESIGN_ENTRIES',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'NONE',
    },
    actions: [
      { key: 'master.view', label: 'View masters', description: 'Browse master records.', group: 'Masters', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'master.create', label: 'Create master', description: 'Create master records.', group: 'Masters', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'master.edit', label: 'Edit master', description: 'Update master records.', group: 'Masters', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'master.status_update', label: 'Activate or deactivate', description: 'Change master status.', group: 'Masters', platform: 'web', legacyPermission: 'DESIGN_ENTRIES', sensitive: true },
      { key: 'master.import', label: 'Import masters', description: 'Upload master spreadsheets.', group: 'Bulk Tools', platform: 'web', legacyPermission: 'DESIGN_ENTRIES', sensitive: true },
      { key: 'packet.view', label: 'View packets', description: 'Browse packet inventory.', group: 'Stone Packets', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'packet.create', label: 'Create packet', description: 'Create packet records.', group: 'Stone Packets', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'packet.edit', label: 'Edit packet', description: 'Update packet records.', group: 'Stone Packets', platform: 'web', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'packet.selling_price.update', label: 'Update packet price', description: 'Change packet selling price.', group: 'Stone Packets', platform: 'web', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
    ],
  },
  {
    key: 'pricing',
    label: 'Pricing Configuration',
    description: 'Price factors, markup rules, branch/company pricing, and base price recalculation.',
    icon: 'bi-cash-coin',
    legacyPermission: 'PRICING_CONFIGURATION',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'NONE',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'NONE',
    },
    actions: [
      { key: 'pricing.view', label: 'View pricing', description: 'See pricing configuration.', group: 'Pricing Access', platform: 'web', legacyPermission: 'PRICING_CONFIGURATION' },
      { key: 'pricing.company.update', label: 'Update company markup', description: 'Change company-level factors.', group: 'Markup Rules', platform: 'web', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'pricing.branch.update', label: 'Update branch markup', description: 'Change branch-level factors.', group: 'Markup Rules', platform: 'web', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'pricing.base.create', label: 'Create base price', description: 'Add global base price records.', group: 'Base Prices', platform: 'web', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'pricing.base.edit', label: 'Edit base price', description: 'Update global base prices.', group: 'Base Prices', platform: 'web', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'pricing.recalculate', label: 'Recalculate designs', description: 'Refresh dependent design values.', group: 'Maintenance', platform: 'web', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'mobile.pricing.view', label: 'View mobile pricing', description: 'Open mobile price configuration.', group: 'Pricing Access', platform: 'mobile', legacyPermission: 'PRICING_CONFIGURATION' },
      { key: 'mobile.pricing.company.update', label: 'Update company pricing', description: 'Change company pricing from mobile.', group: 'Markup Rules', platform: 'mobile', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'mobile.pricing.branch.update', label: 'Update branch pricing', description: 'Change branch pricing from mobile.', group: 'Markup Rules', platform: 'mobile', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'mobile.pricing.gold.update', label: 'Update gold price', description: 'Change gold price from mobile.', group: 'Live Prices', platform: 'mobile', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
    ],
  },
  {
    key: 'organization',
    label: 'Companies & Branches',
    description: 'Company records, branch records, managers, and pricing slab setup.',
    icon: 'bi-buildings',
    legacyPermission: 'BRANCH_MANAGEMENT',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'NONE',
    },
    actions: [
      { key: 'company.view', label: 'View companies', description: 'Browse company records.', group: 'Companies', platform: 'web', legacyPermission: 'COMPANY_MANAGEMENT' },
      { key: 'company.create', label: 'Create company', description: 'Create company records.', group: 'Companies', platform: 'web', legacyPermission: 'COMPANY_MANAGEMENT' },
      { key: 'company.edit', label: 'Edit company', description: 'Update company profile.', group: 'Companies', platform: 'web', legacyPermission: 'COMPANY_MANAGEMENT' },
      { key: 'company.status_update', label: 'Activate company', description: 'Change company status.', group: 'Companies', platform: 'web', legacyPermission: 'COMPANY_MANAGEMENT', sensitive: true },
      { key: 'branch.view', label: 'View branches', description: 'Browse branch records.', group: 'Branches', platform: 'both', legacyPermission: 'BRANCH_MANAGEMENT' },
      { key: 'branch.create', label: 'Create branch', description: 'Create branch records.', group: 'Branches', platform: 'web', legacyPermission: 'BRANCH_MANAGEMENT' },
      { key: 'branch.edit', label: 'Edit branch', description: 'Update branch profile.', group: 'Branches', platform: 'web', legacyPermission: 'BRANCH_MANAGEMENT' },
      { key: 'branch.pricing.manage', label: 'Manage branch pricing', description: 'Update branch pricing slabs.', group: 'Branches', platform: 'both', legacyPermission: 'BRANCH_MANAGEMENT', sensitive: true },
    ],
  },
  {
    key: 'user',
    label: 'Users & Team',
    description: 'User records, branch employees, activation, imports, and permission assignment.',
    icon: 'bi-people',
    legacyPermission: 'USER_MANAGEMENT',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'NONE',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'OWN',
    },
    actions: [
      { key: 'user.view', label: 'View users', description: 'Browse user records.', group: 'Users', platform: 'web', legacyPermission: 'USER_MANAGEMENT' },
      { key: 'user.create', label: 'Create user', description: 'Create user records.', group: 'Users', platform: 'web', legacyPermission: 'USER_MANAGEMENT' },
      { key: 'user.edit', label: 'Edit user', description: 'Update user profiles.', group: 'Users', platform: 'web', legacyPermission: 'USER_MANAGEMENT' },
      { key: 'user.status_update', label: 'Activate or deactivate', description: 'Change user active status.', group: 'Users', platform: 'web', legacyPermission: 'USER_MANAGEMENT', sensitive: true },
      { key: 'user.permissions.manage', label: 'Manage permissions', description: 'Grant or revoke permissions.', group: 'Permissions', platform: 'web', legacyPermission: 'USER_MANAGEMENT', sensitive: true },
      { key: 'user.import', label: 'Import users', description: 'Upload user spreadsheet imports.', group: 'Bulk Tools', platform: 'web', legacyPermission: 'USER_MANAGEMENT', sensitive: true },
      { key: 'team.employee.manage', label: 'Manage team employees', description: 'Create and update branch employees.', group: 'Mobile Team', platform: 'mobile', legacyPermission: 'USER_MANAGEMENT' },
    ],
  },
  {
    key: 'spiff',
    label: 'SPIFF Rewards',
    description: 'SPIFF summary, leaderboard, claim creation, review, and fulfillment.',
    icon: 'bi-stars',
    legacyPermission: 'ORDER_ENTRIES',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'OWN',
    },
    actions: [
      { key: 'spiff.view', label: 'View SPIFF', description: 'Open SPIFF rewards screens.', group: 'SPIFF Access', platform: 'web', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'spiff.claim.create', label: 'Submit claim', description: 'Create redemption claims.', group: 'Claims', platform: 'web', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'spiff.claim.review', label: 'Review claim', description: 'Approve, hold, or reject claims.', group: 'Claims', platform: 'web', legacyPermission: 'ORDER_APPROVALS', sensitive: true },
      { key: 'spiff.claim.fulfill', label: 'Fulfill claim', description: 'Fulfill approved claims.', group: 'Claims', platform: 'web', legacyPermission: 'ORDER_APPROVALS', sensitive: true },
      { key: 'spiff.config.edit', label: 'Edit SPIFF config', description: 'Change points and conversion rules.', group: 'Configuration', platform: 'web', sensitive: true },
      { key: 'mobile.spiff.view', label: 'View mobile SPIFF', description: 'Open mobile SPIFF rewards screens.', group: 'SPIFF Access', platform: 'mobile', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'mobile.spiff.claim.create', label: 'Submit mobile claim', description: 'Create redemption claims from mobile.', group: 'Claims', platform: 'mobile', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'mobile.spiff.claim.review', label: 'Review mobile claim', description: 'Approve, hold, or reject claims from mobile.', group: 'Claims', platform: 'mobile', legacyPermission: 'ORDER_APPROVALS', sensitive: true },
      { key: 'mobile.spiff.leaderboard.view', label: 'View leaderboard', description: 'See SPIFF leaderboard in mobile.', group: 'Leaderboard', platform: 'mobile', legacyPermission: 'ORDER_ENTRIES' },
    ],
  },
  {
    key: 'notification',
    label: 'Notifications',
    description: 'Notification feed, read status, and mobile push device registration.',
    icon: 'bi-bell',
    legacyPermission: 'VIEW_REPORTS',
    defaultScopeByRole: {
      SUPER_ADMIN: 'OWN',
      INTERNAL_REP: 'OWN',
      COMPANY_ADMIN: 'OWN',
      BRANCH_MANAGER: 'OWN',
      SALES_REP: 'OWN',
    },
    actions: [
      { key: 'notification.view', label: 'View notifications', description: 'Open notification feed.', group: 'Notification Access', platform: 'web', legacyPermission: 'VIEW_REPORTS' },
      { key: 'notification.read', label: 'Mark as read', description: 'Update read state.', group: 'Notification Access', platform: 'web', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.notification.view', label: 'View mobile notifications', description: 'Open mobile notification feed.', group: 'Notification Access', platform: 'mobile', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.notification.read', label: 'Mark mobile as read', description: 'Update mobile notification read state.', group: 'Notification Access', platform: 'mobile', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.notification.push.register', label: 'Register push device', description: 'Use mobile push notifications.', group: 'Push Notifications', platform: 'mobile', legacyPermission: 'VIEW_REPORTS' },
    ],
  },
  {
    key: 'ai',
    label: 'AI Sales Assistant',
    description: 'AI Sales Assistant actions, searching, and lookup.',
    icon: 'bi-lightning-charge',
    legacyPermission: 'DESIGN_ENTRIES',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'NONE',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'NONE',
    },
    actions: [
      { key: 'mobile.ai.view', label: 'Open AI Sales', description: 'Open AI Sales assistant.', group: 'AI Access', platform: 'mobile', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.ai.catalog.search', label: 'Search catalog with AI', description: 'Search catalog using natural language.', group: 'AI Tools', platform: 'mobile', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.ai.orders.lookup', label: 'Look up orders with AI', description: 'Find order updates using natural language.', group: 'AI Tools', platform: 'mobile', legacyPermission: 'ORDER_ENTRIES', sensitive: true },
      { key: 'mobile.ai.pricing.view', label: 'View AI pricing response', description: 'Obtain price break estimates from AI.', group: 'AI Tools', platform: 'mobile', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
    ],
  },
];

const filterPermissionCatalog = (modules: PermissionModule[]) =>
  modules
    .filter((module) => !HIDDEN_PERMISSION_MODULES.has(module.key))
    .map((module) => ({
      ...module,
      actions: module.actions.filter((action) => !HIDDEN_PERMISSION_ACTIONS.has(action.key)),
    }))
    .filter((module) => module.actions.length > 0);

const selectedSet = (value: TaskPermission[]) => new Set(value);

const PLATFORM_FILTER_OPTIONS: Array<{ value: PlatformFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile' },
];

const ACTION_TREE: Record<string, string[]> = {
  'dashboard.price_activity.view': [
    'dashboard.price_activity.gold_price.view',
    'dashboard.price_activity.gold_price.update',
    'dashboard.price_activity.packet_price.view',
    'dashboard.price_activity.packet_price.update',
  ],
};

const CHILD_ACTION_PARENT = Object.entries(ACTION_TREE).reduce<Record<string, string>>((acc, [parentKey, childKeys]) => {
  childKeys.forEach((childKey) => {
    acc[childKey] = parentKey;
  });
  return acc;
}, {});

const normalizeTreeSelection = (actions: Set<string>) => {
  const next = new Set(actions);
  Object.entries(ACTION_TREE).forEach(([parentKey, childKeys]) => {
    if (next.has(parentKey)) return;
    childKeys.forEach((childKey) => next.delete(childKey));
  });
  return next;
};

const getLegacyPermissionsFromActions = (
  actionKeys: Set<string>,
  allowed: Set<TaskPermission>,
  modules: PermissionModule[] = MODULES,
) => {
  const next = new Set<TaskPermission>();
  modules.forEach((module) => {
    module.actions.forEach((action) => {
      if (action.legacyPermission && actionKeys.has(action.key) && allowed.has(action.legacyPermission)) {
        next.add(action.legacyPermission);
      }
    });
  });
  return Array.from(next);
};

const getActionKeysFromLegacyPermissions = (
  permissions: Set<TaskPermission>,
  modules: PermissionModule[] = MODULES,
) => {
  const next = new Set<string>();
  modules.forEach((module) => {
    module.actions.forEach((action) => {
      if (action.legacyPermission && permissions.has(action.legacyPermission)) {
        next.add(action.key);
      }
    });
  });
  return next;
};


const supportsScope = (action: PermissionAction) => !NO_SCOPE_ACTIONS.has(action.key);

export default function PermissionMatrix({
  value,
  detailedValue,
  allowedPermissions,
  defaultPermissions,
  role,
  canEdit,
  error,
  onChange,
  onDetailedChange,
}: PermissionMatrixProps) {
  const [selectedModuleId, setSelectedModuleId] = useState('dashboard');
  const [moduleSearch, setModuleSearch] = useState('');
  const [actionSearch, setActionSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [expandedTreeKeys, setExpandedTreeKeys] = useState<Set<string>>(() => new Set());
  const [expandedSelectedTreeKeys, setExpandedSelectedTreeKeys] = useState<Set<string>>(() => new Set(Object.keys(ACTION_TREE)));
  const [pendingTreeRemoval, setPendingTreeRemoval] = useState<{ childKey: string; parentKey: string; parentLabel: string } | null>(null);
  const [remoteModules, setRemoteModules] = useState<PermissionModule[]>([]);
  const rawCatalogModules = remoteModules.length > 0 ? remoteModules : MODULES;
  const catalogModules = useMemo(() => filterPermissionCatalog(rawCatalogModules), [rawCatalogModules]);
  
  const [dataScopes, setDataScopes] = useState<Record<string, DataScope>>({});
  const [selectedActions, setSelectedActions] = useState<Set<string>>(() =>
    detailedValue !== undefined
      ? normalizeTreeSelection(new Set(detailedValue.map((permission) => permission.actionKey).filter((key) => !HIDDEN_PERMISSION_ACTIONS.has(key))))
      : normalizeTreeSelection(getActionKeysFromLegacyPermissions(selectedSet(value), catalogModules))
  );

  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [touchDraggingKey, setTouchDraggingKey] = useState<string | null>(null);
  const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null);

  const permissions = useMemo(() => selectedSet(value), [value]);
  const allowed = useMemo(() => selectedSet(allowedPermissions), [allowedPermissions]);

  useEffect(() => {
    if (!catalogModules.some((module) => module.key === selectedModuleId)) {
      setSelectedModuleId(catalogModules[0]?.key || '');
    }
  }, [catalogModules, selectedModuleId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await api.get('/permissions/matrix');
        const modules = Array.isArray(response.data?.modules) ? response.data.modules : [];
        if (active && modules.length > 0) {
          setRemoteModules(modules);
        }
      } catch {
        if (active) {
          setRemoteModules([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (detailedValue !== undefined) {
      const visibleActionKeys = new Set(catalogModules.flatMap((module) => module.actions.map((action) => action.key)));
      setSelectedActions(normalizeTreeSelection(new Set(detailedValue.map((permission) => permission.actionKey).filter((key) => visibleActionKeys.has(key)))));
      setDataScopes(() => {
        const next: Record<string, DataScope> = {};
        detailedValue.forEach((permission) => {
          if (visibleActionKeys.has(permission.actionKey)) {
            next[permission.actionKey] = permission.dataScope;
          }
        });
        return next;
      });
      return;
    }
    setSelectedActions(normalizeTreeSelection(getActionKeysFromLegacyPermissions(permissions, catalogModules)));
  }, [catalogModules, detailedValue, permissions, role]);

  const allActions = useMemo(() => catalogModules.flatMap((m) => m.actions), [catalogModules]);
  const actionMap = useMemo(() => new Map(allActions.map((a) => [a.key, a])), [allActions]);
  const moduleMap = useMemo(() => new Map(catalogModules.map((m) => [m.key, m])), [catalogModules]);

  const toPersistedScope = (scope: DataScope | null): DetailedPermission['dataScope'] => {
    return scope === 'BRANCH' || scope === 'COMPANY' ? scope : 'OWN';
  };

  const emitSelectionChange = (nextActions: Set<string>, nextScopes = dataScopes) => {
    const normalizedActions = normalizeTreeSelection(nextActions);
    onChange(getLegacyPermissionsFromActions(normalizedActions, allowed, catalogModules));
    if (!onDetailedChange) return;
    onDetailedChange(
      Array.from(normalizedActions)
        .filter((key) => actionMap.has(key))
        .sort()
        .map((actionKey) => ({
          actionKey,
          dataScope: toPersistedScope(nextScopes[actionKey] || scopeFor(actionMap.get(actionKey)!)),
        })),
    );
  };

  const scopeFor = (action: PermissionAction) => {
    if (!supportsScope(action)) return null;
    return dataScopes[action.key] || MODULE_DEFAULT_SCOPE[action.key.split('.')[0]] || 'OWN';
  };

  const commonModuleScope = (mActions: PermissionAction[]): DataScope | 'mixed' => {
    const scoped = mActions.filter(supportsScope);
    if (!scoped.length) return 'NONE';
    const values = Array.from(new Set(scoped.map(scopeFor)));
    return values.length === 1 ? (values[0] as DataScope) : 'mixed';
  };

  const getSelectedCountForModule = (moduleId: string) => {
    const mod = moduleMap.get(moduleId);
    if (!mod) return 0;
    return mod.actions.filter((a) => selectedActions.has(a.key)).length;
  };

  const matchesPlatformFilter = (action: PermissionAction) => {
    if (platformFilter === 'all') return true;
    return action.platform === platformFilter || action.platform === 'both';
  };

  const isChildActionLocked = (action: PermissionAction, actionSet = selectedActions) => {
    const parentKey = CHILD_ACTION_PARENT[action.key];
    return Boolean(parentKey && !actionSet.has(parentKey));
  };

  const isLastSelectedTreeChild = (actionKey: string, actionSet = selectedActions) => {
    const parentKey = CHILD_ACTION_PARENT[actionKey];
    if (!parentKey || !actionSet.has(parentKey)) return false;
    const selectedChildCount = (ACTION_TREE[parentKey] || []).filter((childKey) => actionSet.has(childKey)).length;
    return selectedChildCount <= 1 && actionSet.has(actionKey);
  };

  const canAddActionToSelection = (action: PermissionAction, actionSet: Set<string>) => {
    if (action.legacyPermission && !allowed.has(action.legacyPermission)) return false;
    if (isChildActionLocked(action, actionSet)) return false;
    return true;
  };

  const addActionWithChildren = (action: PermissionAction, actionSet: Set<string>) => {
    if (!canAddActionToSelection(action, actionSet)) return;
    actionSet.add(action.key);
    ACTION_TREE[action.key]?.forEach((childKey) => {
      const childAction = actionMap.get(childKey);
      if (childAction && canAddActionToSelection(childAction, actionSet)) {
        actionSet.add(childKey);
      }
    });
  };

  const toggleTree = (key: string) => {
    setExpandedTreeKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelectedTree = (key: string) => {
    setExpandedSelectedTreeKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const PlatformToggle = () => (
    <div className="platform-toggle" role="group" aria-label="Filter actions by platform">
      {PLATFORM_FILTER_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={platformFilter === option.value ? 'active' : ''}
          onClick={() => setPlatformFilter(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  const addAction = (key: string) => {
    if (!canEdit || selectedActions.has(key)) return;
    const action = actionMap.get(key);
    if (!action) return;
    
    const next = new Set(selectedActions);
    addActionWithChildren(action, next);
    setSelectedActions(next);
    emitSelectionChange(next);
  };

  const removeAction = (key: string) => {
    if (!canEdit) return;
    const next = new Set(selectedActions);

    if (isLastSelectedTreeChild(key)) {
      const parentKey = CHILD_ACTION_PARENT[key];
      const parentAction = parentKey ? actionMap.get(parentKey) : null;
      if (!parentKey) return;
      setPendingTreeRemoval({
        childKey: key,
        parentKey,
        parentLabel: parentAction?.label || 'the parent action',
      });
      return;
    }

    next.delete(key);
    ACTION_TREE[key]?.forEach((childKey) => next.delete(childKey));
    setSelectedActions(next);
    emitSelectionChange(next);
  };

  const confirmTreeRemoval = () => {
    if (!pendingTreeRemoval) return;
    const next = new Set(selectedActions);
    next.delete(pendingTreeRemoval.parentKey);
    ACTION_TREE[pendingTreeRemoval.parentKey]?.forEach((childKey) => next.delete(childKey));
    setSelectedActions(next);
    emitSelectionChange(next);
    setPendingTreeRemoval(null);
  };

  const addAllModuleActions = () => {
    if (!canEdit) return;
    const mod = moduleMap.get(selectedModuleId);
    if (!mod) return;
    
    const next = new Set(selectedActions);
    const needle = actionSearch.trim().toLowerCase();
    
    mod.actions.forEach((a) => {
      if (!matchesPlatformFilter(a)) return;
      if (needle && !`${a.label} ${a.group}`.toLowerCase().includes(needle)) return;
      addActionWithChildren(a, next);
    });

    setSelectedActions(next);
    emitSelectionChange(next);
  };

  const removeModule = (moduleId: string) => {
    if (!canEdit) return;
    const mod = moduleMap.get(moduleId);
    if (!mod) return;

    const next = new Set(selectedActions);
    mod.actions.forEach((a) => next.delete(a.key));
    setSelectedActions(next);
    emitSelectionChange(next);
  };

  const clearAll = () => {
    if (!canEdit) return;
    const next = new Set<string>();
    setSelectedActions(next);
    emitSelectionChange(next);
  };

  const resetToRoleDefaults = () => {
    if (!canEdit) return;
    setDataScopes({});
    const defaults = defaultPermissions.filter((p) => allowed.has(p));
    onChange(defaults);
    if (onDetailedChange) {
      onDetailedChange(
        Array.from(getActionKeysFromLegacyPermissions(new Set(defaults), catalogModules))
          .filter((key) => actionMap.has(key))
          .sort()
          .map((actionKey) => ({
            actionKey,
            dataScope: toPersistedScope(scopeFor(actionMap.get(actionKey)!)),
          })),
      );
    }
  };

  const handleDragStart = (e: React.DragEvent, key: string) => {
    if (!canEdit) return;
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingKey(key);
  };

  const handleDragEnd = () => {
    setDraggingKey(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingKey(null);
    const key = e.dataTransfer.getData('text/plain');
    if (key) {
      addAction(key);
    }
  };

  const handleTouchStart = (key: string) => {
    if (!canEdit) return;
    setTouchDraggingKey(key);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDraggingKey) return;
    const touch = e.touches[0];
    setTouchPosition({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchDraggingKey) return;
    if (dropZoneRef.current) {
      const rect = dropZoneRef.current.getBoundingClientRect();
      const touch = e.changedTouches[0];
      const isInside =
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom;
      if (isInside) {
        addAction(touchDraggingKey);
      }
    }
    setTouchDraggingKey(null);
    setTouchPosition(null);
  };

  // Modules List Column Filter
  const filteredModules = useMemo(() => {
    const needle = moduleSearch.trim().toLowerCase();
    return catalogModules.filter((m) => !needle || m.label.toLowerCase().includes(needle));
  }, [catalogModules, moduleSearch]);

  // Selected Module Actions Column Filter
  const filteredActions = useMemo(() => {
    const mod = moduleMap.get(selectedModuleId);
    if (!mod) return [];
    const needle = actionSearch.trim().toLowerCase();
    return mod.actions.filter((a) => {
      if (selectedActions.has(a.key)) return false;
      const parentKey = CHILD_ACTION_PARENT[a.key];
      if (parentKey && selectedActions.has(parentKey)) return false;
      return matchesPlatformFilter(a) && (!needle || `${a.label} ${a.group}`.toLowerCase().includes(needle));
    });
  }, [selectedModuleId, actionSearch, moduleMap, platformFilter, selectedActions]);

  const visibleActions = useMemo(() => {
    return filteredActions.filter((action) => {
      const parentKey = CHILD_ACTION_PARENT[action.key];
      return !parentKey || selectedActions.has(parentKey) || expandedTreeKeys.has(parentKey);
    });
  }, [filteredActions, expandedTreeKeys, selectedActions]);

  // Allowed groups list (Column 3)
  const allowedGroups = useMemo(() => {
    return catalogModules.map((m) => {
      const active = m.actions.filter((a) => selectedActions.has(a.key) && matchesPlatformFilter(a));
      return { module: m, actions: active };
    }).filter((g) => g.actions.length > 0);
  }, [catalogModules, selectedActions, platformFilter]);

  return (
    <div className="permission-matrix-container">
      {/* Dynamic Link for Bootstrap Icons stylesheet */}
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" />
      
      {/* Pixel-perfect styling injection matching the mockup */}
      <style dangerouslySetInnerHTML={{ __html: `
        .permission-matrix-container :root {
          --app-bg: #f7f5f2;
          --panel: #fff;
          --ink: #25211e;
          --muted: #756e68;
          --line: #e6e0da;
          --line-strong: #d7cec5;
          --blue: #0d6efd;
          --blue-soft: #edf4ff;
          --gold: #b57b0d;
          --gold-soft: #fff6df;
          --green: #16803d;
          --green-soft: #eaf8ee;
          --red: #b42318;
          --red-soft: #fff0ef;
          --shadow: 0 8px 28px rgba(57, 43, 31, .07);
        }
        .permission-matrix-container {
          color: #25211e;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 13px;
        }
        .permission-matrix-container * {
          box-sizing: border-box;
        }
        .permission-matrix-container .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          text-align: center;
          white-space: nowrap;
          vertical-align: middle;
          user-select: none;
          border: 1px solid transparent;
          padding: 0.375rem 0.75rem;
          font-size: 13px;
          line-height: 1.5;
          border-radius: 8px;
          transition: all 0.15s ease-in-out;
          cursor: pointer;
        }
        .permission-matrix-container .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 11px;
          border-radius: 6px;
        }
        .permission-matrix-container .btn-primary {
          color: #fff;
          background-color: #171311;
          border-color: #352b24;
        }
        .permission-matrix-container .btn-primary:hover {
          background-color: #352b24;
        }
        .permission-matrix-container .btn-outline-primary {
          color: #b57b0d;
          background-color: transparent;
          border-color: #e1b65e;
        }
        .permission-matrix-container .btn-outline-primary:hover:not(:disabled) {
          color: #fff;
          background-color: #b57b0d;
          border-color: #b57b0d;
        }
        .permission-matrix-container .btn-outline-danger {
          color: #b42318;
          background-color: transparent;
          border-color: #f1ceca;
        }
        .permission-matrix-container .btn-outline-danger:hover:not(:disabled) {
          color: #fff;
          background-color: #b42318;
          border-color: #b42318;
        }
        .permission-matrix-container .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .permission-matrix-container .input-group {
          position: relative;
          display: flex;
          align-items: stretch;
          width: 100%;
        }
        .permission-matrix-container .input-group-text {
          display: flex;
          align-items: center;
          padding: 0.25rem 0.6rem;
          font-size: 12px;
          color: #756e68;
          background-color: #fff;
          border: 1px solid #e6e0da;
          border-right: 0;
          border-top-left-radius: 8px;
          border-bottom-left-radius: 8px;
        }
        .permission-matrix-container .form-control {
          display: block;
          width: 100%;
          padding: 0.25rem 0.5rem;
          font-size: 12px;
          color: #25211e;
          background-color: #fff;
          border: 1px solid #e6e0da;
          border-top-right-radius: 8px;
          border-bottom-right-radius: 8px;
          outline: none;
          transition: all 0.15s ease-in-out;
        }
        .permission-matrix-container .form-control:focus {
          border-color: #cf941f;
          box-shadow: 0 0 0 2px rgba(207, 148, 31, .09);
        }
        .permission-matrix-container .form-select {
          display: block;
          padding: 0.25rem 1.5rem 0.25rem 0.5rem;
          font-size: 11px;
          color: #25211e;
          background-color: #fff;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23756e68' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 0.4rem center;
          background-size: 9px 9px;
          border: 1px solid #e6e0da;
          border-radius: 6px;
          outline: none;
          appearance: none;
        }
        .permission-matrix-container .form-select:focus {
          border-color: #cf941f;
          box-shadow: 0 0 0 2px rgba(207, 148, 31, .09);
        }
        .permission-matrix-container .panel {
          background: #fff;
          border: 1px solid #e6e0da;
          border-radius: 13px;
          box-shadow: 0 8px 28px rgba(57,43,31,.07);
        }
        .permission-matrix-container .badge-soft {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 7px;
          border: 1px solid transparent;
          border-radius: 99px;
          font-size: 9px;
          font-weight: 700;
          white-space: nowrap;
        }
        .permission-matrix-container .badge-blue {
          color: #0b5ed7;
          background: #edf4ff;
          border-color: #d7e7ff;
        }
        .permission-matrix-container .badge-green {
          color: #146c35;
          background: #eaf8ee;
          border-color: #c8ebd3;
        }
        .permission-matrix-container .badge-red {
          color: #a02117;
          background: #fff0ef;
          border-color: #f1ceca;
        }
        .permission-matrix-container .badge-gray {
          color: #625c56;
          background: #f3f1ef;
          border-color: #e2ded9;
        }
        .permission-matrix-container .builder {
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .permission-matrix-container .builder-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 15px 16px;
          border-bottom: 1px solid #e6e0da;
        }
        .permission-matrix-container .builder-title {
          margin: 0;
          font-size: 16px;
          font-weight: 720;
          line-height: 1.2;
        }
        .permission-matrix-container .builder-copy {
          margin-top: 3px;
          color: #756e68;
          font-size: 10px;
        }
        .permission-matrix-container .builder-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .permission-matrix-container .selection-count {
          padding: 6px 9px;
          color: #5f5852;
          background: #f8f6f3;
          border: 1px solid #e6e0da;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 650;
        }
        .permission-matrix-container .builder-grid {
          display: grid;
          grid-template-columns: minmax(215px, 0.72fr) minmax(300px, 1fr) minmax(360px, 1.35fr);
          height: min(600px, calc(100vh - 220px));
          min-height: 420px;
        }
        .permission-matrix-container .builder-column {
          min-width: 0;
          min-height: 0;
          background: #fff;
          border-right: 1px solid #e6e0da;
          display: flex;
          flex-direction: column;
        }
        .permission-matrix-container .builder-column:last-child {
          border-right: 0;
          background: #fcfbfa;
        }
        .permission-matrix-container .column-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          min-height: 68px;
          padding: 13px 14px;
          border-bottom: 1px solid #e6e0da;
          flex: 0 0 auto;
        }
        .permission-matrix-container .column-head-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }
        .permission-matrix-container .step-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 720;
        }
        .permission-matrix-container .step-number {
          width: 23px;
          height: 23px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #8c5d04;
          background: #fff6df;
          border: 1px solid #e1b65e;
          border-radius: 50%;
          font-size: 10px;
          font-weight: 750;
        }
        .permission-matrix-container .column-copy {
          margin: 4px 0 0 31px;
          color: #756e68;
          font-size: 9px;
          line-height: 1.4;
        }
        .permission-matrix-container .column-tools {
          padding: 10px 12px;
          border-bottom: 1px solid #e6e0da;
          flex: 0 0 auto;
        }
        .permission-matrix-container .module-list {
          overflow-y: auto;
          padding: 8px;
          flex: 1;
          min-height: 0;
        }
        .permission-matrix-container .module-item {
          width: 100%;
          display: grid;
          grid-template-columns: 31px minmax(0, 1fr) auto;
          align-items: center;
          gap: 9px;
          margin-bottom: 6px;
          padding: 9px;
          text-align: left;
          background: #fff;
          border: 1px solid #e6e0da;
          border-radius: 9px;
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .permission-matrix-container .module-item:hover {
          border-color: #c9baaa;
          transform: translateY(-1px);
        }
        .permission-matrix-container .module-item.active {
          background: #fffaf0;
          border-color: #cf941f;
          box-shadow: 0 0 0 2px rgba(207,148,31,.09);
        }
        .permission-matrix-container .module-icon {
          width: 31px;
          height: 31px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #3d3834;
          background: #f3f0ec;
          border-radius: 8px;
          font-size: 14px;
        }
        .permission-matrix-container .module-name {
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .permission-matrix-container .module-meta {
          margin-top: 2px;
          color: #756e68;
          font-size: 8px;
        }
        .permission-matrix-container .module-count {
          min-width: 26px;
          padding: 3px 5px;
          text-align: center;
          color: #5e5751;
          background: #f4f2ef;
          border-radius: 99px;
          font-size: 8px;
          font-weight: 700;
        }
        .permission-matrix-container .action-list {
          overflow-y: auto;
          padding: 8px;
          flex: 1;
          min-height: 0;
        }
        .permission-matrix-container .action-card {
          display: grid;
          grid-template-columns: 20px minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          padding: 9px;
          background: #fff;
          border: 1px solid #e6e0da;
          border-radius: 9px;
          cursor: grab;
          transition: all 0.15s ease;
        }
        .permission-matrix-container .action-card:hover {
          border-color: #a9c6f4;
          box-shadow: 0 4px 12px rgba(13,110,253,.06);
        }
        .permission-matrix-container .action-card.dragging {
          opacity: 0.45;
        }
        .permission-matrix-container .action-card.added {
          cursor: default;
          background: #f7fbf8;
          border-color: #d5eadb;
        }
        .permission-matrix-container .action-card.tree-parent {
          border-color: #bdd3f6;
          box-shadow: inset 3px 0 0 #8bb7f0;
        }
        .permission-matrix-container .action-card.tree-child {
          position: relative;
          margin-left: 22px;
          grid-template-columns: 18px minmax(0, 1fr) auto;
          background: #fffdfb;
        }
        .permission-matrix-container .action-card.tree-child::before {
          content: "";
          position: absolute;
          left: -13px;
          top: -7px;
          width: 13px;
          height: calc(50% + 7px);
          border-left: 1px solid #d8cec3;
          border-bottom: 1px solid #d8cec3;
          border-bottom-left-radius: 7px;
        }
        .permission-matrix-container .action-card.child-locked {
          cursor: not-allowed;
          background: #f8f6f3;
        }
        .permission-matrix-container .tree-toggle {
          width: 19px;
          height: 19px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          color: #3866a3;
          background: #edf4ff;
          border: 1px solid #cfe0f8;
          border-radius: 6px;
          cursor: pointer;
          font-size: 10px;
          transition: all 0.15s ease;
        }
        .permission-matrix-container .tree-toggle:hover {
          color: #164985;
          background: #e2efff;
          border-color: #a9c6f4;
        }
        .permission-matrix-container .drag-handle {
          color: #a29b94;
          font-size: 13px;
        }
        .permission-matrix-container .action-name {
          font-size: 10px;
          font-weight: 680;
        }
        .permission-matrix-container .action-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 3px;
          color: #756e68;
          font-size: 8px;
        }
        .permission-matrix-container .platform {
          padding: 2px 5px;
          color: #0b5ed7;
          background: #edf4ff;
          border-radius: 5px;
          font-size: 7px;
          font-weight: 750;
          text-transform: uppercase;
        }
        .permission-matrix-container .platform-toggle {
          display: inline-flex;
          align-items: center;
          padding: 2px;
          background: #f6f3ef;
          border: 1px solid #e2dcd5;
          border-radius: 8px;
        }
        .permission-matrix-container .platform-toggle button {
          min-width: 42px;
          height: 24px;
          padding: 0 8px;
          color: #625c56;
          background: transparent;
          border: 0;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 720;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .permission-matrix-container .platform-toggle button:hover {
          color: #25211e;
          background: #fff;
        }
        .permission-matrix-container .platform-toggle button.active {
          color: #8c5d04;
          background: #fff;
          box-shadow: 0 1px 4px rgba(57,43,31,.08);
        }
        .permission-matrix-container .icon-button {
          width: 25px;
          height: 25px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          color: #0d6efd;
          background: #fff;
          border: 1px solid #bad1f4;
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .permission-matrix-container .action-card.added .icon-button {
          color: #16803d;
          background: #eaf8ee;
          border-color: #cce7d5;
          cursor: default;
        }
        .permission-matrix-container .drop-shell {
          padding: 8px;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .permission-matrix-container .drop-zone {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 8px;
          background: #fff;
          border: 1px dashed #cfc3b6;
          border-radius: 10px;
          transition: all 0.16s ease;
        }
        .permission-matrix-container .drop-zone.drag-over {
          background: #f2f7ff;
          border-color: #0d6efd;
          box-shadow: inset 0 0 0 2px rgba(13,110,253,.08);
        }
        .permission-matrix-container .drop-empty {
          height: 100%;
          min-height: 260px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px;
          text-align: center;
          color: #756e68;
        }
        .permission-matrix-container .drop-empty-icon {
          width: 52px;
          height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          color: #8f8173;
          background: #f5f1ec;
          border-radius: 50%;
          font-size: 22px;
        }
        .permission-matrix-container .selected-group {
          margin-bottom: 9px;
          overflow: visible;
          background: #fff;
          border: 1px solid #e6e0da;
          border-radius: 9px;
        }
        .permission-matrix-container .selected-group:last-child {
          margin-bottom: 0;
        }
        .permission-matrix-container .selected-group-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 9px 10px;
          background: #f7f5f2;
          border-bottom: 1px solid #e6e0da;
        }
        .permission-matrix-container .selected-group-title {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 10px;
          font-weight: 720;
        }
        .permission-matrix-container .selected-group-controls {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
          flex-wrap: wrap;
        }
        .permission-matrix-container .module-scope {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .permission-matrix-container .module-scope label {
          margin: 0;
          color: #756e68;
          font-size: 7px;
          font-weight: 750;
          letter-spacing: .04em;
          text-transform: uppercase;
        }
        .permission-matrix-container .module-scope select {
          width: 96px;
          height: 24px;
          padding-top: 2px;
          padding-bottom: 2px;
          font-size: 9px;
        }
        .permission-matrix-container .selected-action {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 125px auto;
          align-items: center;
          gap: 8px;
          margin: 6px 8px;
          padding: 9px;
          background: #fff;
          border: 1px solid #e6e0da;
          border-radius: 9px;
          transition: all 0.15s ease;
        }
        .permission-matrix-container .selected-action:last-child {
          margin-bottom: 8px;
        }
        .permission-matrix-container .selected-action.tree-parent {
          background: #fff;
          border-color: #bdd3f6;
          box-shadow: inset 3px 0 0 #8bb7f0;
        }
        .permission-matrix-container .selected-action.tree-child {
          position: relative;
          margin-left: 30px;
          background: #fffdfb;
        }
        .permission-matrix-container .selected-action.tree-child::before {
          content: "";
          position: absolute;
          left: -13px;
          top: -7px;
          width: 13px;
          height: calc(50% + 7px);
          border-left: 1px solid #d8cec3;
          border-bottom: 1px solid #d8cec3;
          border-bottom-left-radius: 7px;
        }
        .permission-matrix-container .selected-action.inactive-child {
          color: #8a837c;
          background: #f8f6f3;
          border-color: #e6e0da;
          opacity: 0.72;
        }
        .permission-matrix-container .selected-action.inactive-child .selected-action-name,
        .permission-matrix-container .selected-action.inactive-child .action-meta {
          color: #8a837c;
        }
        .permission-matrix-container .selected-action-name {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 680;
        }
        .permission-matrix-container .selected-tree-toggle {
          width: 18px;
          height: 18px;
          flex: 0 0 auto;
          font-size: 9px;
        }
        .permission-matrix-container .action-scope label {
          display: block;
          margin-bottom: 3px;
          color: #756e68;
          font-size: 7px;
          font-weight: 750;
          letter-spacing: .04em;
          text-transform: uppercase;
        }
        .permission-matrix-container .action-scope select {
          height: 24px;
          padding-top: 2px;
          padding-bottom: 2px;
          font-size: 9px;
          width: 100%;
        }
        .permission-matrix-container .no-scope {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #8a837c;
          font-size: 8px;
        }
        .permission-matrix-container .remove-action {
          width: 23px;
          height: 23px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          color: #8a8077;
          background: #fff;
          border: 1px solid #e6e0da;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .permission-matrix-container .remove-action:hover {
          color: #b42318;
          border-color: #efb9b4;
          background: #fff0ef;
        }
        .permission-matrix-container .restore-action {
          color: #0d6efd;
          border-color: #bad1f4;
        }
        .permission-matrix-container .restore-action:hover {
          color: #0b5ed7;
          border-color: #a9c6f4;
          background: #edf4ff;
        }
        .permission-matrix-container .empty-filter {
          padding: 40px 18px;
          text-align: center;
          color: #756e68;
          font-size: 10px;
        }
        @media(max-width: 1180px) {
          .permission-matrix-container .builder-grid {
            grid-template-columns: 200px minmax(250px, 1fr) minmax(300px, 1.2fr);
          }
        }
        @media(max-width: 840px) {
          .permission-matrix-container .builder-grid {
            grid-template-columns: 1fr;
          }
          .permission-matrix-container .builder-column {
            border-right: 0;
            border-bottom: 1px solid #e6e0da;
          }
          .permission-matrix-container .module-list,
          .permission-matrix-container .action-list {
            max-height: 280px;
          }
          .permission-matrix-container .drop-zone {
            min-height: 280px;
          }
        }
        @media(max-width: 575px) {
          .permission-matrix-container .builder-head {
            align-items: flex-start;
            flex-direction: column;
          }
          .permission-matrix-container .builder-actions {
            width: 100%;
            justify-content: space-between;
          }
          .permission-matrix-container .column-head {
            min-height: 0;
          }
          .permission-matrix-container .column-head-actions {
            width: 100%;
            justify-content: space-between;
          }
          .permission-matrix-container .selected-group-head {
            align-items: flex-start;
            flex-direction: column;
          }
          .permission-matrix-container .selected-group-controls {
            width: 100%;
            justify-content: space-between;
          }
          .permission-matrix-container .selected-action {
            grid-template-columns: minmax(0, 1fr) auto;
          }
          .permission-matrix-container .action-scope {
            grid-column: 1 / -1;
            grid-row: 2;
          }
          .permission-matrix-container .remove-action {
            grid-column: 2;
            grid-row: 1;
          }
        }
      ` }} />

      <div className="panel builder">
        {/* Builder Head */}
        <div className="builder-head">
          <div>
            <h1 className="builder-title text-slate-900">Simple Permission Builder</h1>
            <div className="builder-copy">Direct module actions with simple Own, Branch or Company data scope.</div>
          </div>
          <div className="builder-actions">
            <span className="selection-count">
              <strong>{selectedActions.size}</strong> actions allowed
            </span>
            <button 
              type="button" 
              className="btn btn-sm btn-outline-primary"
              onClick={resetToRoleDefaults}
              disabled={!canEdit}
            >
              <i className="bi bi-arrow-counterclockwise me-1" />
              Role Defaults
            </button>
          </div>
        </div>

        {/* Builder Column Grid */}
        <div className="builder-grid">
          
          {/* Column 1: Modules */}
          <section className="builder-column" aria-label="Modules">
            <div className="column-head">
              <div>
                <div className="step-label">
                  <span className="step-number">1</span>
                  Modules
                </div>
                <p className="column-copy">Choose one module.</p>
              </div>
              <span className="badge-soft badge-gray">
                {catalogModules.length} modules
              </span>
            </div>
            <div className="column-tools">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search modules"
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="module-list">
              {filteredModules.length > 0 ? (
                filteredModules.map((m) => {
                  const isActive = m.key === selectedModuleId;
                  const allowedCount = getSelectedCountForModule(m.key);
                  return (
                    <button
                      key={m.key}
                      className={`module-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedModuleId(m.key);
                        setActionSearch('');
                      }}
                      type="button"
                    >
                      <span className="module-icon">
                        <i className={`bi ${m.icon}`} />
                      </span>
                      <span className="min-w-0">
                        <span className="module-name d-block text-slate-800">{m.label}</span>
                        <span className="module-meta">{m.actions.length} available actions</span>
                      </span>
                      <span className="module-count">
                        {allowedCount}/{m.actions.length}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="empty-filter">No modules found.</div>
              )}
            </div>
          </section>

          {/* Column 2: Module Actions */}
          <section className="builder-column" aria-label="Module actions">
            <div className="column-head">
              <div>
                <div className="step-label">
                  <span className="step-number">2</span>
                  <span>{moduleMap.get(selectedModuleId)?.label || 'Actions'}</span>
                </div>
                <p className="column-copy">Drag cards or tap + to allow.</p>
              </div>
              <div className="column-head-actions">
                <PlatformToggle />
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-primary"
                  onClick={addAllModuleActions}
                  disabled={!canEdit}
                >
                  <i className="bi bi-plus-lg me-1" />
                  Add all
                </button>
              </div>
            </div>
            <div className="column-tools">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search actions"
                  value={actionSearch}
                  onChange={(e) => setActionSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="action-list">
              {visibleActions.length > 0 ? (
                visibleActions.map((a) => {
                  const added = selectedActions.has(a.key);
                  const legacyAllowed = a.legacyPermission ? allowed.has(a.legacyPermission) : true;
                  const isTreeParent = Boolean(ACTION_TREE[a.key]);
                  const isTreeExpanded = expandedTreeKeys.has(a.key);
                  const isTreeChild = Boolean(CHILD_ACTION_PARENT[a.key]);
                  const childLocked = isChildActionLocked(a);
                  const isActionDisabled = !canEdit || !legacyAllowed || childLocked;
                  
                  return (
                    <div
                      key={a.key}
                      className={`action-card ${added ? 'added' : ''} ${draggingKey === a.key ? 'dragging' : ''} ${isTreeParent ? 'tree-parent' : ''} ${isTreeChild ? 'tree-child' : ''} ${childLocked ? 'child-locked' : ''}`}
                      draggable={canEdit && !added && legacyAllowed && !childLocked}
                      onDragStart={(e) => handleDragStart(e, a.key)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={() => handleTouchStart(a.key)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      style={{ opacity: isActionDisabled ? 0.6 : 1 }}
                    >
                      {isTreeParent ? (
                        <button
                          type="button"
                          className="tree-toggle"
                          onClick={() => toggleTree(a.key)}
                          title={isTreeExpanded ? 'Collapse actions' : 'Expand actions'}
                        >
                          <i className={`bi ${isTreeExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
                        </button>
                      ) : (
                        <i className={`bi ${added ? 'bi-check2' : 'bi-grip-vertical'} drag-handle`} />
                      )}
                      <div className="min-w-0">
                        <div className="action-name text-slate-800">{a.label}</div>
                        <div className="action-meta">
                          <span>{a.group}</span>
                          {a.platform && <span className="platform">{a.platform}</span>}
                          {a.sensitive && <span className="badge-soft badge-red">Sensitive</span>}
                          {!legacyAllowed && <span className="badge-soft badge-gray">Role Locked</span>}
                          {childLocked && <span className="badge-soft badge-gray">Parent Required</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => addAction(a.key)}
                        disabled={added || isActionDisabled}
                        title={childLocked ? 'Allow parent permission first' : added ? 'Already allowed' : 'Add permission'}
                      >
                        <i className={`bi ${added ? 'bi-check-lg' : 'bi-plus-lg'}`} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="empty-filter">No actions found.</div>
              )}
            </div>
          </section>

          {/* Column 3: Allowed Actions & Scope */}
          <section className="builder-column" aria-label="Allowed actions">
            <div className="column-head">
              <div>
                <div className="step-label">
                  <span className="step-number">3</span>
                  Allowed & Data Scope
                </div>
                <p className="column-copy">Define data visibility levels.</p>
              </div>
              <div className="column-head-actions">
                <PlatformToggle />
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-danger"
                  onClick={clearAll}
                  disabled={!canEdit || selectedActions.size === 0}
                >
                  <i className="bi bi-trash3 me-1" />
                  Clear
                </button>
              </div>
            </div>
            
            <div className="drop-shell">
              <div 
                ref={dropZoneRef}
                className={`drop-zone ${draggingKey || touchDraggingKey ? 'drag-over' : ''}`}
                onDragOver={(e) => {
                  if (!canEdit) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                  e.currentTarget.classList.add('drag-over');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('drag-over');
                }}
                onDrop={(e) => {
                  e.currentTarget.classList.remove('drag-over');
                  handleDrop(e);
                }}
              >
                {allowedGroups.length > 0 ? (
                  allowedGroups.map(({ module: m, actions: mActs }) => {
                    const isMixed = commonModuleScope(mActs) === 'mixed';
                    const activeScope = isMixed ? 'mixed' : commonModuleScope(mActs);
                    const modScopedActions = mActs.filter(supportsScope);
                    const selectedActionKeys = new Set(mActs.map((act) => act.key));
                    const displayActions = m.actions.filter((act) => {
                      if (selectedActionKeys.has(act.key)) return true;
                      const parentKey = CHILD_ACTION_PARENT[act.key];
                      return Boolean(parentKey && selectedActionKeys.has(parentKey));
                    });
                    
                    return (
                      <div key={m.key} className="selected-group">
                        {/* Group Head */}
                        <div className="selected-group-head">
                          <div className="selected-group-title text-slate-800">
                            <span className="module-icon" style={{ width: 22, height: 22, fontSize: 10 }}>
                              <i className={`bi ${m.icon}`} />
                            </span>
                            {m.label}
                            <span className="badge-soft badge-blue">{mActs.length}</span>
                          </div>
                          
                          <div className="selected-group-controls">
                            {modScopedActions.length > 0 && (
                              <div className="module-scope">
                                <label>Set all</label>
                                <select
                                  className="form-select form-select-sm"
                                  value={activeScope}
                                  onChange={(e) => {
                                    const nextScope = e.target.value as DataScope;
                                    if (nextScope === ('mixed' as any)) return;
                                    const updated = { ...dataScopes };
                                    modScopedActions.forEach((act) => {
                                      updated[act.key] = nextScope;
                                    });
                                    setDataScopes(updated);
                                    emitSelectionChange(selectedActions, updated);
                                  }}
                                  disabled={!canEdit}
                                >
                                  {isMixed && <option value="mixed" disabled>Mixed</option>}
                                  {DATA_SCOPE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-danger p-0 text-decoration-none"
                              style={{ fontSize: 8, padding: 0 }}
                              onClick={() => removeModule(m.key)}
                              disabled={!canEdit}
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Group Selected Actions list */}
                        {displayActions.filter((act) => {
                          const parentKey = CHILD_ACTION_PARENT[act.key];
                          return !parentKey || expandedSelectedTreeKeys.has(parentKey);
                        }).map((act) => {
                          const currentScope = scopeFor(act);
                          const isScoped = supportsScope(act);
                          const isSelected = selectedActionKeys.has(act.key);
                          const isTreeChild = Boolean(CHILD_ACTION_PARENT[act.key]);
                          const isTreeParent = Boolean(ACTION_TREE[act.key]);
                          const isTreeExpanded = expandedSelectedTreeKeys.has(act.key);
                          const isLastTreeChild = isSelected && isLastSelectedTreeChild(act.key);
                          return (
                            <div key={act.key} className={`selected-action ${isTreeParent ? 'tree-parent' : ''} ${isTreeChild ? 'tree-child' : ''} ${!isSelected ? 'inactive-child' : ''}`}>
                              <div>
                                <div className="selected-action-name text-slate-800">
                                  {isTreeParent && (
                                    <button
                                      type="button"
                                      className="tree-toggle selected-tree-toggle"
                                      onClick={() => toggleSelectedTree(act.key)}
                                      title={isTreeExpanded ? 'Collapse actions' : 'Expand actions'}
                                    >
                                      <i className={`bi ${isTreeExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
                                    </button>
                                  )}
                                  <span>{act.label}</span>
                                </div>
                                <div className="action-meta">
                                  <span>{act.group}</span>
                                  {act.platform && <span className="platform">{act.platform}</span>}
                                  {act.sensitive && <span className="badge-soft badge-red">Sensitive</span>}
                                </div>
                              </div>

                              {isScoped && isSelected ? (
                                <div className="action-scope">
                                  <label>Data Scope</label>
                                  <select
                                    className="form-select form-select-sm"
                                    value={currentScope || 'OWN'}
                                    onChange={(e) => {
                                      const nextScope = e.target.value as DataScope;
                                      const updated = { ...dataScopes, [act.key]: nextScope };
                                      setDataScopes(updated);
                                      emitSelectionChange(selectedActions, updated);
                                    }}
                                    disabled={!canEdit}
                                  >
                                    {DATA_SCOPE_OPTIONS.map((o) => (
                                      <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <span className="no-scope">
                                  <i className={`bi ${isSelected ? 'bi-dash-circle' : 'bi-pause-circle'}`} />
                                  {isSelected ? 'No data scope' : 'Not allowed'}
                                </span>
                              )}

                              <button
                                type="button"
                                className={`remove-action ${!isSelected ? 'restore-action' : ''}`}
                                onClick={() => isSelected ? removeAction(act.key) : addAction(act.key)}
                                disabled={!canEdit}
                                title={
                                  !isSelected
                                    ? 'Allow permission'
                                    : isLastTreeChild
                                      ? 'Remove this last child and move parent to not allowed'
                                      : 'Remove permission'
                                }
                              >
                                <i className={`bi ${isSelected ? 'bi-x-lg' : 'bi-plus-lg'}`} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                ) : (
                  <div className="drop-empty">
                    <div>
                      <span className="drop-empty-icon">
                        <i className="bi bi-box-arrow-in-down" />
                      </span>
                      <div className="fw-semibold text-slate-800">Drop actions here</div>
                      <div className="mt-1">Selected permissions will appear module-wise.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>

      {touchDraggingKey && touchPosition && (
        <div
          style={{
            position: 'fixed',
            left: touchPosition.x - 100,
            top: touchPosition.y - 20,
            width: 200,
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0.85,
            transform: 'scale(0.95)',
          }}
          className="action-card added"
        >
          <i className="bi bi-grip-vertical drag-handle" />
          <div className="min-w-0">
            <div className="action-name text-slate-800" style={{ fontSize: 9 }}>
              {actionMap.get(touchDraggingKey)?.label}
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      <AlertDialog
        open={Boolean(pendingTreeRemoval)}
        title="Remove parent permission?"
        message={`If you remove the last sub-action, ${pendingTreeRemoval?.parentLabel || 'the parent action'} will also move to not allowed. Do you want to continue?`}
        variant="warning"
        confirmLabel="Yes, remove"
        cancelLabel="Cancel"
        onClose={() => setPendingTreeRemoval(null)}
        onConfirm={confirmTreeRemoval}
      />
    </div>
  );
}
