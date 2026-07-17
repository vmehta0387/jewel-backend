import { useEffect, useMemo, useRef, useState } from 'react';
import type { TaskPermission, UserRole } from '../../types/auth.types';

type DataScope = 'NONE' | 'OWN' | 'BRANCH' | 'COMPANY' | 'ALL';

type PermissionAction = {
  key: string;
  label: string;
  description: string;
  group?: string;
  legacyPermission?: TaskPermission;
  sensitive?: boolean;
};

type PermissionModule = {
  key: string;
  label: string;
  description: string;
  legacyPermission?: TaskPermission;
  defaultScopeByRole: Partial<Record<UserRole, DataScope>>;
  actions: PermissionAction[];
};

type PermissionMatrixProps = {
  value: TaskPermission[];
  allowedPermissions: TaskPermission[];
  defaultPermissions: TaskPermission[];
  role: UserRole;
  canEdit: boolean;
  error?: string;
  onChange: (permissions: TaskPermission[]) => void;
};

const DATA_SCOPE_OPTIONS: Array<{ value: DataScope; label: string; description: string }> = [
  { value: 'NONE', label: 'None', description: 'No records in this module.' },
  { value: 'OWN', label: 'Own', description: 'Only records assigned to this user.' },
  { value: 'BRANCH', label: 'Branch', description: 'Records inside the assigned branch.' },
  { value: 'COMPANY', label: 'Company', description: 'Records inside the assigned company.' },
  { value: 'ALL', label: 'All', description: 'All records allowed by system role.' },
];

const SPLIT_MODULE_META: Record<string, {
  webLabel: string;
  mobileLabel: string;
  webDescription: string;
  mobileDescription: string;
  webParentKey: string;
  mobileParentKey: string;
  mobilePrefix: string;
  hideNone?: boolean;
}> = {
  dashboard: {
    webLabel: 'Web Dashboard',
    mobileLabel: 'Mobile Dashboard',
    webDescription: 'Admin portal dashboard totals, order activity, and live price panels.',
    mobileDescription: 'Mobile totals, quick actions, trending products, pipeline, and performance sections.',
    webParentKey: 'dashboard.view',
    mobileParentKey: 'mobile.dashboard.view',
    mobilePrefix: 'mobile.dashboard.',
  },
  design: {
    webLabel: 'Web Design Engine',
    mobileLabel: 'Mobile Design Engine',
    webDescription: 'Admin portal design list, records, media, history, imports, and exports.',
    mobileDescription: 'Mobile catalog, design detail, specifications, design price display, and quote/order start.',
    webParentKey: 'design.view',
    mobileParentKey: 'mobile.design.view',
    mobilePrefix: 'mobile.design.',
    hideNone: true,
  },
  order: {
    webLabel: 'Web Orders',
    mobileLabel: 'Mobile Orders',
    webDescription: 'Admin portal order list, entries, status updates, approvals, and price preview.',
    mobileDescription: 'Mobile order list, create/update flow, approvals, and price preview.',
    webParentKey: 'order.view',
    mobileParentKey: 'mobile.order.view',
    mobilePrefix: 'mobile.order.',
  },
  pricing: {
    webLabel: 'Web Pricing Configuration',
    mobileLabel: 'Mobile Pricing Configuration',
    webDescription: 'Admin portal price factors, markups, base prices, and recalculation tools.',
    mobileDescription: 'Mobile pricing shortcuts for company, branch, and live price updates.',
    webParentKey: 'pricing.view',
    mobileParentKey: 'mobile.pricing.view',
    mobilePrefix: 'mobile.pricing.',
  },
  spiff: {
    webLabel: 'Web SPIFF Rewards',
    mobileLabel: 'Mobile SPIFF Rewards',
    webDescription: 'Admin portal SPIFF rewards, claims, fulfillment, and configuration.',
    mobileDescription: 'Mobile SPIFF rewards, claims, review actions, and leaderboard.',
    webParentKey: 'spiff.view',
    mobileParentKey: 'mobile.spiff.view',
    mobilePrefix: 'mobile.spiff.',
  },
  notification: {
    webLabel: 'Web Notifications',
    mobileLabel: 'Mobile Notifications',
    webDescription: 'Admin portal notification feed and read state.',
    mobileDescription: 'Mobile notification feed, read state, and push device registration.',
    webParentKey: 'notification.view',
    mobileParentKey: 'mobile.notification.view',
    mobilePrefix: 'mobile.notification.',
  },
};

const PANEL_PARENT_ACTION_KEYS = new Set([
  'dashboard.view',
  'mobile.dashboard.view',
  'design.view',
  'mobile.design.view',
  'order.view',
  'mobile.order.view',
  'pricing.view',
  'mobile.pricing.view',
  'spiff.view',
  'mobile.spiff.view',
  'notification.view',
  'mobile.notification.view',
]);

const MODULES: PermissionModule[] = [
  {
    key: 'dashboard',
    label: 'Dashboard & Reports',
    description: 'Dashboard cards, trends, summaries, and reporting screens.',
    legacyPermission: 'VIEW_REPORTS',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'OWN',
    },
    actions: [
      { key: 'dashboard.view', label: 'View dashboard', description: 'Open dashboard screens.', group: 'Core Access', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.totals.view', label: 'Totals', description: 'Show total companies, total branches, design families, and generated versions.', group: 'Totals', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.order_activity.view', label: 'Order activity', description: 'See order activity section.', group: 'Order Activity', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.order_activity.received_today.view', label: 'Received today', description: 'See today received order count.', group: 'Order Activity', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.order_activity.due_today.view', label: 'Due today', description: 'See orders due today.', group: 'Order Activity', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.order_activity.sales_week.view', label: 'Sales this week', description: 'See weekly sales amount.', group: 'Order Activity', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.order_activity.active_orders.view', label: 'Active orders', description: 'See active order count.', group: 'Order Activity', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.order_activity.trends.view', label: 'Order trends', description: 'See order and sales trend charts.', group: 'Order Activity', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.price_activity.view', label: 'Price activity', description: 'See live gold and packet price panels.', group: 'Price Activity', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.price_activity.gold_price.view', label: 'View gold price', description: 'See gold market/live prices.', group: 'Price Activity', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.price_activity.gold_price.update', label: 'Update gold price', description: 'Change gold price master values.', group: 'Price Activity', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'dashboard.price_activity.packet_price.view', label: 'View packet price', description: 'See selected packet selling price.', group: 'Price Activity', legacyPermission: 'VIEW_REPORTS' },
      { key: 'dashboard.price_activity.packet_price.update', label: 'Update packet price', description: 'Change packet selling price from dashboard.', group: 'Price Activity', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'mobile.dashboard.view', label: 'View mobile dashboard', description: 'Open the mobile dashboard tab.', group: 'Mobile Core Access', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.dashboard.totals.view', label: 'Totals', description: 'Show today sales, monthly sales, SPIFF earned, branch revenue, company revenue, pending approvals, and active reps.', group: 'Totals', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.dashboard.quick_actions.view', label: 'Quick actions', description: 'See quick action shortcuts.', group: 'Quick Actions', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.dashboard.quick_actions.orders.view', label: 'Orders shortcut', description: 'Show dashboard shortcut to orders.', group: 'Quick Actions', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'mobile.dashboard.quick_actions.spiff.view', label: 'SPIFF shortcut', description: 'Show dashboard shortcut to SPIFF.', group: 'Quick Actions', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'mobile.dashboard.quick_actions.catalog.view', label: 'Catalog shortcut', description: 'Show dashboard shortcut to catalog.', group: 'Quick Actions', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.dashboard.quick_actions.branches.view', label: 'Branches shortcut', description: 'Show company admin branches shortcut.', group: 'Quick Actions', legacyPermission: 'BRANCH_MANAGEMENT' },
      { key: 'mobile.dashboard.quick_actions.team.view', label: 'Team shortcut', description: 'Show team management shortcut.', group: 'Quick Actions', legacyPermission: 'USER_MANAGEMENT' },
      { key: 'mobile.dashboard.quick_actions.pricing.view', label: 'Pricing shortcut', description: 'Show pricing shortcut.', group: 'Quick Actions', legacyPermission: 'PRICING_CONFIGURATION' },
      { key: 'mobile.dashboard.trending.view', label: 'Trending today', description: 'See trending product cards.', group: 'Trending Today', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.dashboard.trending.price.view', label: 'Trending prices', description: 'See prices on trending cards.', group: 'Trending Today', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.dashboard.trending.open_design', label: 'Open trending design', description: 'Open design detail from trending card.', group: 'Trending Today', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.dashboard.pipeline.view', label: 'Sales pipeline', description: 'See pending, approved, and production pipeline.', group: 'Pipeline', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.dashboard.performance.rep.view', label: 'Rep performance', description: 'See branch rep sales ranking.', group: 'Performance', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.dashboard.performance.branch.view', label: 'Branch performance', description: 'See company branch performance cards.', group: 'Performance', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.dashboard.notifications.view', label: 'Notifications', description: 'Open dashboard notification popover.', group: 'Utility', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.dashboard.profile_photo.update', label: 'Update profile photo', description: 'Upload profile photo from dashboard menu.', group: 'Utility' },
    ],
  },
  {
    key: 'design',
    label: 'Design Engine',
    description: 'Design list, detail, media, history, and related design maintenance.',
    legacyPermission: 'DESIGN_ENTRIES',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'BRANCH',
    },
    actions: [
      { key: 'design.view', label: 'View designs', description: 'Browse design list and details.', group: 'Core Access', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.create', label: 'Create design', description: 'Create a new design record.', group: 'Design Records', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.edit', label: 'Edit design', description: 'Update design specifications and BOM rows.', group: 'Design Records', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.activate', label: 'Activate or deactivate', description: 'Change design active status.', group: 'Design Records', legacyPermission: 'DESIGN_ENTRIES', sensitive: true },
      { key: 'design.set_primary', label: 'Set primary', description: 'Mark a version as the primary design.', group: 'Version Control', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.history.view', label: 'View history', description: 'Review design change history.', group: 'Review', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.media.upload', label: 'Upload media', description: 'Upload gallery and STL files.', group: 'Media', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.import', label: 'Import designs', description: 'Upload design spreadsheet imports.', group: 'Bulk Tools', legacyPermission: 'DESIGN_ENTRIES', sensitive: true },
      { key: 'design.export', label: 'Export designs', description: 'Download design exports and templates.', group: 'Bulk Tools', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.design.view', label: 'View mobile designs', description: 'Open the mobile design catalog and design list.', group: 'Core Access', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.design.detail.view', label: 'View design detail', description: 'Open mobile design detail with images and specifications.', group: 'Detail', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.design.specifications.view', label: 'View specifications', description: 'See product specification rows in mobile detail.', group: 'Detail', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.design.price.view', label: 'View design price', description: 'See rule-based design prices in mobile list and detail.', group: 'Detail', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'mobile.design.quote.create', label: 'Create quote/order', description: 'Start quote or order flow from a mobile design.', group: 'Detail', legacyPermission: 'ORDER_ENTRIES' },
    ],
  },
  {
    key: 'version',
    label: 'Design Versions',
    description: 'Version lookup, version creation, and version builder workflows.',
    legacyPermission: 'DESIGN_ENTRIES',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'BRANCH',
    },
    actions: [
      { key: 'design.version.view', label: 'View versions', description: 'Open design family versions.', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.version.create', label: 'Create version', description: 'Create a new design version.', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.version.build', label: 'Build version', description: 'Use version builder to create a version.', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'design.version.set_primary', label: 'Set primary version', description: 'Promote a version to primary.', legacyPermission: 'DESIGN_ENTRIES' },
    ],
  },
  {
    key: 'catalog',
    label: 'Mobile Catalog & Quotes',
    description: 'Mobile catalog, configurator, quote builder, and quote summary flows.',
    legacyPermission: 'ORDER_ENTRIES',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'OWN',
    },
    actions: [
      { key: 'catalog.view', label: 'View catalog', description: 'Open mobile catalog and trending products.', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'catalog.configure', label: 'Configure design', description: 'Use configurator and resolve options.', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'quote.create', label: 'Create quote', description: 'Create quote from catalog.', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'quote.edit', label: 'Edit quote', description: 'Modify quote/customer details.', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'quote.send_for_approval', label: 'Send for approval', description: 'Submit a quote to approval queue.', legacyPermission: 'ORDER_ENTRIES' },
    ],
  },
  {
    key: 'order',
    label: 'Orders',
    description: 'Order list, order detail, create/update order, status changes, and approval actions.',
    legacyPermission: 'ORDER_ENTRIES',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'OWN',
    },
    actions: [
      { key: 'order.view', label: 'View orders', description: 'Browse and open orders.', group: 'Order Access', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'order.create', label: 'Create order', description: 'Create new orders.', group: 'Order Entries', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'order.edit', label: 'Edit order', description: 'Update order details.', group: 'Order Entries', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'order.status_update', label: 'Update status', description: 'Change order status.', group: 'Approvals', legacyPermission: 'ORDER_APPROVALS' },
      { key: 'order.approve', label: 'Approve order', description: 'Approve pending orders.', group: 'Approvals', legacyPermission: 'ORDER_APPROVALS', sensitive: true },
      { key: 'order.reject', label: 'Reject order', description: 'Reject or cancel pending orders.', group: 'Approvals', legacyPermission: 'ORDER_APPROVALS', sensitive: true },
      { key: 'order.price_preview', label: 'Preview price', description: 'Calculate retail price previews.', group: 'Pricing', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'order.price_override', label: 'Override price', description: 'Manually override order price.', group: 'Pricing', legacyPermission: 'ORDER_ENTRIES', sensitive: true },
      { key: 'order.cost_price.view', label: 'View cost price', description: 'See design/order cost price.', group: 'Pricing', sensitive: true },
      { key: 'mobile.order.view', label: 'View mobile orders', description: 'Open mobile order list and detail screens.', group: 'Order Access', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'mobile.order.create', label: 'Create mobile order', description: 'Create orders from mobile catalog or order screens.', group: 'Order Entries', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'mobile.order.edit', label: 'Edit mobile order', description: 'Update order details from the mobile app.', group: 'Order Entries', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'mobile.order.status_update', label: 'Update mobile status', description: 'Change order status from mobile workflows.', group: 'Approvals', legacyPermission: 'ORDER_APPROVALS' },
      { key: 'mobile.order.approve', label: 'Approve mobile order', description: 'Approve pending orders from mobile.', group: 'Approvals', legacyPermission: 'ORDER_APPROVALS', sensitive: true },
      { key: 'mobile.order.reject', label: 'Reject mobile order', description: 'Reject or cancel pending mobile orders.', group: 'Approvals', legacyPermission: 'ORDER_APPROVALS', sensitive: true },
      { key: 'mobile.order.price_preview', label: 'Preview mobile price', description: 'See retail price previews in mobile order flow.', group: 'Pricing', legacyPermission: 'ORDER_ENTRIES' },
    ],
  },
  {
    key: 'master',
    label: 'Masters & Packets',
    description: 'Design masters, packet inventory, finding heads, and import/export tools.',
    legacyPermission: 'DESIGN_ENTRIES',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'NONE',
    },
    actions: [
      { key: 'master.view', label: 'View masters', description: 'Browse master records.', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'master.create', label: 'Create master', description: 'Create master records.', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'master.edit', label: 'Edit master', description: 'Update master records.', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'master.status_update', label: 'Activate or deactivate', description: 'Change master status.', legacyPermission: 'DESIGN_ENTRIES', sensitive: true },
      { key: 'master.import', label: 'Import masters', description: 'Upload master spreadsheets.', legacyPermission: 'DESIGN_ENTRIES', sensitive: true },
      { key: 'packet.view', label: 'View packets', description: 'Browse packet inventory.', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'packet.create', label: 'Create packet', description: 'Create packet records.', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'packet.edit', label: 'Edit packet', description: 'Update packet records.', legacyPermission: 'DESIGN_ENTRIES' },
      { key: 'packet.selling_price.update', label: 'Update packet price', description: 'Change packet selling price.', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
    ],
  },
  {
    key: 'pricing',
    label: 'Pricing Configuration',
    description: 'Price factors, markup rules, branch/company pricing, and base price recalculation.',
    legacyPermission: 'PRICING_CONFIGURATION',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'NONE',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'NONE',
    },
    actions: [
      { key: 'pricing.view', label: 'View pricing', description: 'See pricing configuration.', group: 'Pricing Access', legacyPermission: 'PRICING_CONFIGURATION' },
      { key: 'pricing.company.update', label: 'Update company markup', description: 'Change company-level factors.', group: 'Markup Rules', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'pricing.branch.update', label: 'Update branch markup', description: 'Change branch-level factors.', group: 'Markup Rules', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'pricing.base.create', label: 'Create base price', description: 'Add global base price records.', group: 'Base Prices', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'pricing.base.edit', label: 'Edit base price', description: 'Update global base prices.', group: 'Base Prices', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'pricing.recalculate', label: 'Recalculate designs', description: 'Refresh dependent design values.', group: 'Maintenance', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'mobile.pricing.view', label: 'View mobile pricing', description: 'Open mobile price configuration screens.', group: 'Pricing Access', legacyPermission: 'PRICING_CONFIGURATION' },
      { key: 'mobile.pricing.company.update', label: 'Update company pricing', description: 'Change company pricing factors from mobile.', group: 'Markup Rules', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'mobile.pricing.branch.update', label: 'Update branch pricing', description: 'Change branch pricing factors from mobile.', group: 'Markup Rules', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
      { key: 'mobile.pricing.gold.update', label: 'Update gold price', description: 'Change gold price values from mobile.', group: 'Live Prices', legacyPermission: 'PRICING_CONFIGURATION', sensitive: true },
    ],
  },
  {
    key: 'organization',
    label: 'Companies & Branches',
    description: 'Company records, branch records, managers, and pricing slab setup.',
    legacyPermission: 'BRANCH_MANAGEMENT',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'NONE',
    },
    actions: [
      { key: 'company.view', label: 'View companies', description: 'Browse company records.', legacyPermission: 'COMPANY_MANAGEMENT' },
      { key: 'company.create', label: 'Create company', description: 'Create company records.', legacyPermission: 'COMPANY_MANAGEMENT' },
      { key: 'company.edit', label: 'Edit company', description: 'Update company profile.', legacyPermission: 'COMPANY_MANAGEMENT' },
      { key: 'company.status_update', label: 'Activate company', description: 'Change company status.', legacyPermission: 'COMPANY_MANAGEMENT', sensitive: true },
      { key: 'branch.view', label: 'View branches', description: 'Browse branch records.', legacyPermission: 'BRANCH_MANAGEMENT' },
      { key: 'branch.create', label: 'Create branch', description: 'Create branch records.', legacyPermission: 'BRANCH_MANAGEMENT' },
      { key: 'branch.edit', label: 'Edit branch', description: 'Update branch profile.', legacyPermission: 'BRANCH_MANAGEMENT' },
      { key: 'branch.pricing.manage', label: 'Manage branch pricing', description: 'Update branch pricing slabs.', legacyPermission: 'BRANCH_MANAGEMENT', sensitive: true },
    ],
  },
  {
    key: 'user',
    label: 'Users & Team',
    description: 'User records, branch employees, activation, imports, and permission assignment.',
    legacyPermission: 'USER_MANAGEMENT',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'NONE',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'OWN',
    },
    actions: [
      { key: 'user.view', label: 'View users', description: 'Browse user records.', legacyPermission: 'USER_MANAGEMENT' },
      { key: 'user.create', label: 'Create user', description: 'Create user records.', legacyPermission: 'USER_MANAGEMENT' },
      { key: 'user.edit', label: 'Edit user', description: 'Update user profiles.', legacyPermission: 'USER_MANAGEMENT' },
      { key: 'user.status_update', label: 'Activate or deactivate', description: 'Change user active status.', legacyPermission: 'USER_MANAGEMENT', sensitive: true },
      { key: 'user.permissions.manage', label: 'Manage permissions', description: 'Grant or revoke permissions.', legacyPermission: 'USER_MANAGEMENT', sensitive: true },
      { key: 'user.import', label: 'Import users', description: 'Upload user spreadsheet imports.', legacyPermission: 'USER_MANAGEMENT', sensitive: true },
      { key: 'team.employee.manage', label: 'Manage team employees', description: 'Create and update branch employees.', legacyPermission: 'USER_MANAGEMENT' },
    ],
  },
  {
    key: 'spiff',
    label: 'SPIFF Rewards',
    description: 'SPIFF summary, leaderboard, claim creation, review, and fulfillment.',
    legacyPermission: 'ORDER_ENTRIES',
    defaultScopeByRole: {
      SUPER_ADMIN: 'ALL',
      INTERNAL_REP: 'ALL',
      COMPANY_ADMIN: 'COMPANY',
      BRANCH_MANAGER: 'BRANCH',
      SALES_REP: 'OWN',
    },
    actions: [
      { key: 'spiff.view', label: 'View SPIFF', description: 'Open SPIFF rewards screens.', group: 'SPIFF Access', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'spiff.claim.create', label: 'Submit claim', description: 'Create redemption claims.', group: 'Claims', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'spiff.claim.review', label: 'Review claim', description: 'Approve, hold, or reject claims.', group: 'Claims', legacyPermission: 'ORDER_APPROVALS', sensitive: true },
      { key: 'spiff.claim.fulfill', label: 'Fulfill claim', description: 'Fulfill approved claims.', group: 'Claims', legacyPermission: 'ORDER_APPROVALS', sensitive: true },
      { key: 'spiff.config.edit', label: 'Edit SPIFF config', description: 'Change points and conversion rules.', group: 'Configuration', sensitive: true },
      { key: 'mobile.spiff.view', label: 'View mobile SPIFF', description: 'Open mobile SPIFF rewards screens.', group: 'SPIFF Access', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'mobile.spiff.claim.create', label: 'Submit mobile claim', description: 'Create redemption claims from mobile.', group: 'Claims', legacyPermission: 'ORDER_ENTRIES' },
      { key: 'mobile.spiff.claim.review', label: 'Review mobile claim', description: 'Approve, hold, or reject claims from mobile.', group: 'Claims', legacyPermission: 'ORDER_APPROVALS', sensitive: true },
      { key: 'mobile.spiff.leaderboard.view', label: 'View leaderboard', description: 'See SPIFF leaderboard in mobile.', group: 'Leaderboard', legacyPermission: 'ORDER_ENTRIES' },
    ],
  },
  {
    key: 'notification',
    label: 'Notifications',
    description: 'Notification feed, read status, and mobile push device registration.',
    defaultScopeByRole: {
      SUPER_ADMIN: 'OWN',
      INTERNAL_REP: 'OWN',
      COMPANY_ADMIN: 'OWN',
      BRANCH_MANAGER: 'OWN',
      SALES_REP: 'OWN',
    },
    actions: [
      { key: 'notification.view', label: 'View notifications', description: 'Open notification feed.', group: 'Notification Access', legacyPermission: 'VIEW_REPORTS' },
      { key: 'notification.read', label: 'Mark as read', description: 'Update read state.', group: 'Notification Access', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.notification.view', label: 'View mobile notifications', description: 'Open mobile notification feed.', group: 'Notification Access', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.notification.read', label: 'Mark mobile as read', description: 'Update mobile notification read state.', group: 'Notification Access', legacyPermission: 'VIEW_REPORTS' },
      { key: 'mobile.notification.push.register', label: 'Register push device', description: 'Use mobile push notifications.', group: 'Push Notifications', legacyPermission: 'VIEW_REPORTS' },
    ],
  },
];

const selectedSet = (value: TaskPermission[]) => new Set(value);

const getLegacyPermissionsFromActions = (actionKeys: Set<string>, allowed: Set<TaskPermission>) => {
  const next = new Set<TaskPermission>();
  MODULES.forEach((module) => {
    module.actions.forEach((action) => {
      if (action.legacyPermission && actionKeys.has(action.key) && allowed.has(action.legacyPermission)) {
        next.add(action.legacyPermission);
      }
    });
  });
  return Array.from(next);
};

const getActionKeysFromLegacyPermissions = (permissions: Set<TaskPermission>) => {
  const next = new Set<string>();
  MODULES.forEach((module) => {
    module.actions.forEach((action) => {
      if (action.legacyPermission && permissions.has(action.legacyPermission)) {
        next.add(action.key);
      }
    });
  });
  return next;
};

const getModuleScope = (module: PermissionModule, role: UserRole, enabledCount: number): DataScope => {
  if (enabledCount <= 0) return 'NONE';
  return module.defaultScopeByRole[role] || 'NONE';
};

export default function PermissionMatrix({
  value,
  allowedPermissions,
  defaultPermissions,
  role,
  canEdit,
  error,
  onChange,
}: PermissionMatrixProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'SELECTED' | 'UNSELECTED'>('ALL');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(MODULES.slice(0, 4).map((module) => module.key)));
  const [dashboardPanelTabs, setDashboardPanelTabs] = useState<Record<string, 'actions' | 'data'>>({
    web: 'actions',
    mobile: 'actions',
  });
  const [dataScopes, setDataScopes] = useState<Record<string, DataScope>>({});
  const skipNextLegacySync = useRef(false);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(() =>
    getActionKeysFromLegacyPermissions(selectedSet(value)),
  );
  const permissions = useMemo(() => selectedSet(value), [value]);
  const allowed = useMemo(() => selectedSet(allowedPermissions), [allowedPermissions]);

  useEffect(() => {
    if (skipNextLegacySync.current) {
      skipNextLegacySync.current = false;
      return;
    }
    setSelectedActions(getActionKeysFromLegacyPermissions(permissions));
  }, [permissions, role]);

  const visibleModules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return MODULES.map((module) => {
      const actions = module.actions.filter((action) => {
        const checked = selectedActions.has(action.key);
        if (filter === 'SELECTED' && !checked) return false;
        if (filter === 'UNSELECTED' && checked) return false;
        if (!needle) return true;
        return (
          module.label.toLowerCase().includes(needle) ||
          module.description.toLowerCase().includes(needle) ||
          action.label.toLowerCase().includes(needle) ||
          action.description.toLowerCase().includes(needle) ||
          action.key.toLowerCase().includes(needle)
        );
      });
      return { module, actions };
    }).filter(({ module, actions }) => {
      if (actions.length > 0) return true;
      const needle = query.trim().toLowerCase();
      return Boolean(needle && (module.label.toLowerCase().includes(needle) || module.description.toLowerCase().includes(needle)));
    });
  }, [filter, query, selectedActions]);

  const totalActions = MODULES.reduce((sum, module) => sum + module.actions.length, 0);
  const selectedActionCount = MODULES.reduce(
    (sum, module) => sum + module.actions.filter((action) => selectedActions.has(action.key)).length,
    0,
  );

  const toggleExpanded = (key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const setAllExpanded = (open: boolean) => {
    setExpanded(open ? new Set(MODULES.map((module) => module.key)) : new Set());
  };

  const resolveDataScope = (key: string, module: PermissionModule, enabledCount: number) =>
    dataScopes[key] || getModuleScope(module, role, enabledCount);

  const updateDataScope = (key: string, scope: DataScope, hideNone = false) => {
    if (!canEdit || (hideNone && scope === 'NONE')) return;
    setDataScopes((current) => ({ ...current, [key]: scope }));
  };

  const commitActionSelection = (next: Set<string>) => {
    skipNextLegacySync.current = true;
    setSelectedActions(next);
    onChange(getLegacyPermissionsFromActions(next, allowed));
  };

  const getAllowedModuleActions = (module: PermissionModule) =>
    module.actions.filter((action) => action.legacyPermission && allowed.has(action.legacyPermission));

  const toggleModuleAccess = (module: PermissionModule) => {
    if (!canEdit) return;
    const moduleActions = getAllowedModuleActions(module);
    if (!moduleActions.length) return;

    const next = new Set(selectedActions);
    const hasAnySelected = moduleActions.some((action) => next.has(action.key));

    if (hasAnySelected) {
      module.actions.forEach((action) => next.delete(action.key));
    } else {
      moduleActions.forEach((action) => next.add(action.key));
    }

    commitActionSelection(next);
  };

  const toggleAction = (action: PermissionAction, panelActions?: PermissionAction[]) => {
    if (!action.legacyPermission || !canEdit || !allowed.has(action.legacyPermission)) return;
    const next = new Set(selectedActions);
    const isSelected = next.has(action.key);

    if (PANEL_PARENT_ACTION_KEYS.has(action.key)) {
      const scopedActions = panelActions || [action];
      if (isSelected) {
        scopedActions.forEach((item) => next.delete(item.key));
      } else {
        next.add(action.key);
      }
      commitActionSelection(next);
      return;
    }

    if (isSelected) {
      next.delete(action.key);
    } else {
      next.add(action.key);
      const parentAction = panelActions?.find((item) => PANEL_PARENT_ACTION_KEYS.has(item.key));
      if (parentAction) {
        next.add(parentAction.key);
      }
    }
    commitActionSelection(next);
  };

  const renderActionCard = (action: PermissionAction, panelActions?: PermissionAction[]) => {
    const checked = selectedActions.has(action.key);
    const legacyAllowed = action.legacyPermission ? allowed.has(action.legacyPermission) : false;
    const disabled = !canEdit || !action.legacyPermission || !legacyAllowed;

    return (
      <label
        key={action.key}
        className={`flex min-h-[92px] gap-3 rounded-lg border p-3 transition ${
          checked
            ? 'border-primary-300 bg-primary-50 shadow-sm ring-1 ring-primary-100'
            : 'border-slate-200 bg-white'
        } ${
          disabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:border-primary-200 hover:bg-slate-50 hover:shadow-sm'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={() => toggleAction(action, panelActions)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold leading-5 text-slate-900">{action.label}</span>
            {action.sensitive ? (
              <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700">
                Sensitive
              </span>
            ) : null}
          </span>
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">{action.description}</span>
        </span>
      </label>
    );
  };

  const groupActions = (actions: PermissionAction[]) =>
    actions.reduce<Array<{ name: string; actions: PermissionAction[] }>>((groups, action) => {
      const groupName = action.group || 'Actions';
      const existing = groups.find((group) => group.name === groupName);
      if (existing) {
        existing.actions.push(action);
      } else {
        groups.push({ name: groupName, actions: [action] });
      }
      return groups;
    }, []);

  const renderActionGroups = (
    groups: Array<{ name: string; actions: PermissionAction[] }>,
    panelActions?: PermissionAction[],
  ) => (
    <div className="space-y-4">
      {groups.length ? groups.map((group) => (
        <div key={group.name} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {group.name}
            </span>
            <span className="h-px flex-1 bg-slate-100" />
            <span className="text-[11px] font-medium text-slate-400">
              {group.actions.filter((action) => selectedActions.has(action.key)).length} of {group.actions.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.actions.map((action) => renderActionCard(action, panelActions))}
          </div>
        </div>
      )) : (
        <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500">
          No actions match the current search.
        </div>
      )}
    </div>
  );

  const renderDataAccess = (
    scope: DataScope,
    compact = false,
    hideNone = false,
    onSelect?: (scope: DataScope) => void,
  ) => (
    <div className={compact ? 'grid gap-2 sm:grid-cols-2 xl:grid-cols-5' : 'space-y-2'}>
      {DATA_SCOPE_OPTIONS.filter((option) => !hideNone || option.value !== 'NONE').map((option) => {
        const active = option.value === scope;
        return (
          <button
            type="button"
            key={option.value}
            disabled={!canEdit || !onSelect}
            onClick={() => onSelect?.(option.value)}
            className={`w-full rounded-lg border px-3 py-2 text-left transition ${
              active ? 'border-primary-300 bg-primary-50 ring-1 ring-primary-100' : 'border-slate-200 bg-white'
            } ${canEdit && onSelect ? 'cursor-pointer hover:border-primary-200 hover:bg-slate-50' : 'cursor-default'}`}
          >
            <div className="flex items-center gap-2">
              <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                active ? 'border-primary-600 bg-primary-600' : 'border-slate-300 bg-white'
              }`}>
                {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
              </span>
              <span className="text-sm font-semibold text-slate-800">{option.label}</span>
            </div>
            {!compact ? <p className="mt-1 text-xs text-slate-500">{option.description}</p> : null}
          </button>
        );
      })}
    </div>
  );

  const resetDefaults = () => {
    if (!canEdit) return;
    setDataScopes({});
    onChange(defaultPermissions.filter((permission) => allowed.has(permission)));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Permission Matrix</h3>
              <p className="mt-1 text-sm text-slate-500">
                Configure action access and review module data scope for this user.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                      {selectedActionCount} of {totalActions} actions allowed
              </span>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setAllExpanded(true)}
              >
                Expand all
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setAllExpanded(false)}
              >
                Collapse all
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canEdit}
                onClick={resetDefaults}
              >
                Use role defaults
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search modules, actions, or keys"
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {(['ALL', 'SELECTED', 'UNSELECTED'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    filter === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  onClick={() => setFilter(item)}
                >
                  {item === 'ALL' ? 'All' : item === 'SELECTED' ? 'Selected' : 'Unselected'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {visibleModules.map(({ module, actions }) => {
            const moduleSelected = module.actions.filter((action) => selectedActions.has(action.key)).length;
            const isOpen = expanded.has(module.key) || Boolean(query.trim());
            const scope = resolveDataScope(module.key, module, moduleSelected);
            const moduleLegacyAllowed = module.legacyPermission ? allowed.has(module.legacyPermission) : true;
            const allowedModuleActions = getAllowedModuleActions(module);
            const moduleAccessChecked = allowedModuleActions.some((action) => selectedActions.has(action.key));
            const moduleAccessDisabled = !canEdit || allowedModuleActions.length === 0;
            const actionGroups = groupActions(actions);
            const splitMeta = SPLIT_MODULE_META[module.key];
            const splitPanels = splitMeta ? [
              {
                key: `${module.key}Web`,
                label: splitMeta.webLabel,
                description: splitMeta.webDescription,
                parentKey: splitMeta.webParentKey,
                actions: actions.filter((action) => !action.key.startsWith(splitMeta.mobilePrefix)),
                scopedActions: module.actions.filter((action) => !action.key.startsWith(splitMeta.mobilePrefix)),
              },
              {
                key: `${module.key}Mobile`,
                label: splitMeta.mobileLabel,
                description: splitMeta.mobileDescription,
                parentKey: splitMeta.mobileParentKey,
                actions: actions.filter((action) => action.key.startsWith(splitMeta.mobilePrefix)),
                scopedActions: module.actions.filter((action) => action.key.startsWith(splitMeta.mobilePrefix)),
              },
            ] : [];

            return (
              <section key={module.key} className="bg-white">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
                  onClick={() => toggleExpanded(module.key)}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={moduleAccessChecked}
                      disabled={moduleAccessDisabled}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => toggleModuleAccess(module)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                        {module.label.slice(0, 1)}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{module.label}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {moduleSelected} of {module.actions.length}
                      </span>
                      {!moduleLegacyAllowed ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          Limited by role
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{module.description}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-lg text-slate-400">{isOpen ? '−' : '+'}</span>
                  </div>
                </button>

                {isOpen && splitMeta ? (
                  <div className="grid gap-6 px-4 pb-4 xl:grid-cols-2 xl:gap-0 xl:divide-x xl:divide-slate-200">
                    {splitPanels.map((panel, panelIndex) => {
                      const panelSelected = panel.scopedActions.filter((action) => selectedActions.has(action.key)).length;
                      const panelScope = resolveDataScope(panel.key, module, panelSelected);
                      const activePanelTab = dashboardPanelTabs[panel.key] || 'actions';
                      const parentAction = module.actions.find((action) => action.key === panel.parentKey);
                      const panelBodyActions = panel.actions.filter((action) => action !== parentAction);
                      const parentChecked = parentAction ? selectedActions.has(parentAction.key) : false;
                      const parentAllowed = parentAction?.legacyPermission ? allowed.has(parentAction.legacyPermission) : false;
                      const parentDisabled = !parentAction || !canEdit || !parentAction.legacyPermission || !parentAllowed;
                      return (
                        <div key={panel.key} className={panelIndex === 0 ? 'xl:pr-5' : 'xl:pl-5'}>
                          <div className="pb-3">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={parentChecked}
                                disabled={parentDisabled}
                                onChange={() => parentAction && toggleAction(parentAction, panel.scopedActions)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
                              />
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900">{panel.label}</h4>
                                <p className="mt-1 text-xs leading-5 text-slate-500">{panel.description}</p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="mb-3 flex flex-wrap items-center gap-5 border-b border-slate-200">
                              <button
                                type="button"
                                className={`border-b-2 px-0 pb-2 pt-1 text-[11px] font-semibold transition ${
                                  activePanelTab === 'actions'
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                                onClick={() => setDashboardPanelTabs((prev) => ({ ...prev, [panel.key]: 'actions' }))}
                              >
                                Actions · {panelSelected} of {panel.scopedActions.length}
                              </button>
                              <button
                                type="button"
                                className={`border-b-2 px-0 pb-2 pt-1 text-[11px] font-semibold transition ${
                                  activePanelTab === 'data'
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                                onClick={() => setDashboardPanelTabs((prev) => ({ ...prev, [panel.key]: 'data' }))}
                              >
                                Data allowance{splitMeta.hideNone && panelScope === 'NONE' ? '' : ` · ${DATA_SCOPE_OPTIONS.find((item) => item.value === panelScope)?.label || 'None'}`}
                              </button>
                            </div>

                            {activePanelTab === 'actions' ? (
                              <div className="rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</span>
                                  <span className="text-[11px] font-medium text-slate-500">{panelSelected} selected</span>
                                </div>
                                <div className="p-3">
                                  {renderActionGroups(groupActions(panelBodyActions), panel.scopedActions)}
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data allowance</span>
                                  <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                    {splitMeta.hideNone
                                      ? DATA_SCOPE_OPTIONS.find((item) => item.value === panelScope && item.value !== 'NONE')?.label || 'Not assigned'
                                      : DATA_SCOPE_OPTIONS.find((item) => item.value === panelScope)?.label || 'None'}
                                  </span>
                                </div>
                                <div className="p-3">
                                  {renderDataAccess(panelScope, true, Boolean(splitMeta.hideNone), (nextScope) => updateDataScope(panel.key, nextScope, Boolean(splitMeta.hideNone)))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 xl:col-span-2">
                      Data allowance selection is part of the permission setup. Persistence will be connected when backend data permissions are added.
                    </p>
                  </div>
                ) : isOpen && module.key === 'design' ? (
                  <div className="grid gap-4 px-4 pb-4 xl:grid-cols-2">
                    {[
                      {
                        key: 'designWeb',
                        label: 'Web Design Engine',
                        description: 'Admin portal design list, records, media, history, imports, and exports.',
                        parentKey: 'design.view',
                        actions: actions.filter((action) => !action.key.startsWith('mobile.design.')),
                        scopedActions: module.actions.filter((action) => !action.key.startsWith('mobile.design.')),
                      },
                      {
                        key: 'designMobile',
                        label: 'Mobile Design Engine',
                        description: 'Mobile catalog, design detail, configurator, specifications, and design price display.',
                        parentKey: 'mobile.design.view',
                        actions: actions.filter((action) => action.key.startsWith('mobile.design.')),
                        scopedActions: module.actions.filter((action) => action.key.startsWith('mobile.design.')),
                      },
                    ].map((panel) => {
                      const panelSelected = panel.scopedActions.filter((action) => selectedActions.has(action.key)).length;
                      const panelScope = resolveDataScope(panel.key, module, panelSelected);
                      const panelScopeLabel = panelScope === 'NONE'
                        ? ''
                        : ` · ${DATA_SCOPE_OPTIONS.find((item) => item.value === panelScope)?.label || ''}`;
                      const activePanelTab = dashboardPanelTabs[panel.key] || 'actions';
                      const parentAction = module.actions.find((action) => action.key === panel.parentKey);
                      const panelBodyActions = panel.actions.filter((action) => action.key !== panel.parentKey);
                      const parentChecked = parentAction ? selectedActions.has(parentAction.key) : false;
                      const parentAllowed = parentAction?.legacyPermission ? allowed.has(parentAction.legacyPermission) : false;
                      const parentDisabled = !parentAction || !canEdit || !parentAction.legacyPermission || !parentAllowed;

                      return (
                        <div key={panel.key} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={parentChecked}
                                disabled={parentDisabled}
                                onChange={() => parentAction && toggleAction(parentAction, panel.scopedActions)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
                              />
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900">{panel.label}</h4>
                                <p className="mt-1 text-xs leading-5 text-slate-500">{panel.description}</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="mb-3 flex flex-wrap items-center gap-5 border-b border-slate-200">
                              <button
                                type="button"
                                className={`border-b-2 px-0 pb-2 pt-1 text-[11px] font-semibold transition ${
                                  activePanelTab === 'actions'
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                                onClick={() => setDashboardPanelTabs((prev) => ({ ...prev, [panel.key]: 'actions' }))}
                              >
                                Actions · {panelSelected} of {panel.scopedActions.length}
                              </button>
                              <button
                                type="button"
                                className={`border-b-2 px-0 pb-2 pt-1 text-[11px] font-semibold transition ${
                                  activePanelTab === 'data'
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                                onClick={() => setDashboardPanelTabs((prev) => ({ ...prev, [panel.key]: 'data' }))}
                              >
                                Data allowance{panelScopeLabel}
                              </button>
                            </div>

                            {activePanelTab === 'actions' ? (
                              <div className="rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</span>
                                  <span className="text-[11px] font-medium text-slate-500">{panelSelected} selected</span>
                                </div>
                                <div className="p-3">
                                  {renderActionGroups(groupActions(panelBodyActions), panel.scopedActions)}
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data allowance</span>
                                  <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                    {DATA_SCOPE_OPTIONS.find((item) => item.value === panelScope && item.value !== 'NONE')?.label || 'Not assigned'}
                                  </span>
                                </div>
                                <div className="p-3">
                                  {renderDataAccess(panelScope, true, true, (nextScope) => updateDataScope(panel.key, nextScope, true))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 xl:col-span-2">
                      Data allowance selection is part of the permission setup. Persistence will be connected when backend data permissions are added.
                    </p>
                  </div>
                ) : isOpen ? (
                  <div className="px-4 pb-4">
                    <div>
                      <div>
                        <div className="mb-3 flex flex-wrap items-center gap-5 border-b border-slate-200">
                          <button
                            type="button"
                            className={`border-b-2 px-0 pb-2 pt-1 text-[11px] font-semibold transition ${
                              (dashboardPanelTabs[module.key] || 'actions') === 'actions'
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                            onClick={() => setDashboardPanelTabs((prev) => ({ ...prev, [module.key]: 'actions' }))}
                          >
                            Actions · {moduleSelected} of {module.actions.length}
                          </button>
                          <button
                            type="button"
                            className={`border-b-2 px-0 pb-2 pt-1 text-[11px] font-semibold transition ${
                              dashboardPanelTabs[module.key] === 'data'
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                            onClick={() => setDashboardPanelTabs((prev) => ({ ...prev, [module.key]: 'data' }))}
                          >
                            Data allowance · {DATA_SCOPE_OPTIONS.find((item) => item.value === scope)?.label || 'None'}
                          </button>
                        </div>

                        {(dashboardPanelTabs[module.key] || 'actions') === 'actions' ? (
                          <div className="rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</span>
                              <span className="text-[11px] font-medium text-slate-500">
                                {moduleSelected} selected
                              </span>
                            </div>
                            <div className="space-y-4 p-3">
                              {renderActionGroups(actionGroups)}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data allowance</span>
                              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                {DATA_SCOPE_OPTIONS.find((item) => item.value === scope)?.label || 'None'}
                              </span>
                            </div>
                            <div className="p-3">
                              {renderDataAccess(scope, true, false, (nextScope) => updateDataScope(module.key, nextScope))}
                              <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                                Data allowance selection is part of the permission setup. Persistence will be connected when backend data permissions are added.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
