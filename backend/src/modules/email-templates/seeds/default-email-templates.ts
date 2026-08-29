import { EmailTemplateStatus } from '../entities/email-template.entity';

export interface DefaultEmailTemplateSeed {
  key: string;
  name: string;
  category: string;
  actionTypes: string[];
  subject: string;
  preheader?: string;
  html: string;
  text?: string;
  requiredVariables: string[];
  optionalVariables?: string[];
}

interface TemplateDefinition {
  key: string;
  name: string;
  category: string;
  actionTypes: string[];
  subject: string;
  heading: string;
  body: string;
  cta?: string;
  variables?: string[];
}

export const DEFAULT_EMAIL_TEMPLATE_STATUS = EmailTemplateStatus.ACTIVE;

const button = (label: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 8px;"><tr>
<td bgcolor="#b8924a" style="border-radius:8px;"><a href="{{action_url}}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1a1714;text-decoration:none;border-radius:8px;">${label}</a></td>
</tr></table>`;

const details = (rows: Array<[string, string]>) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e7e2d6;border-radius:8px;border-collapse:separate;overflow:hidden;">
${rows.map(([label, value], index) => `<tr><td style="padding:9px 12px;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b6660;width:42%;${index < rows.length - 1 ? 'border-bottom:1px solid #e7e2d6;' : ''}">${label}</td><td style="padding:9px 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1714;${index < rows.length - 1 ? 'border-bottom:1px solid #e7e2d6;' : ''}">${value}</td></tr>`).join('')}
</table>`;

const wrapEmail = (definition: TemplateDefinition) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${definition.subject}</title></head>
<body style="margin:0;padding:0;background:#f4f1ea;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${definition.body}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f1ea"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e7e2d6;border-radius:12px;overflow:hidden;">
<tr><td style="background:#1a1714;padding:18px 28px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#ffffff;">BLITZ <span style="color:#b8924a;">NYC</span></span></td></tr>
<tr><td style="padding:30px 28px 26px;"><h1 style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:21px;line-height:1.25;font-weight:bold;color:#1a1714;">${definition.heading}</h1><p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a1714;">${definition.body}</p>${definition.category === 'ORDER' ? details([['Order', '{{order_number}}'], ['Company', '{{company_name}}']]) : ''}${definition.category === 'BILLING' ? details([['Invoice', '{{invoice_number}}'], ['Amount', '{{amount_due}}']]) : ''}${definition.cta ? button(definition.cta) : ''}<p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1714;">- Blitz NYC</p></td></tr>
<tr><td style="background:#faf9f6;border-top:1px solid #e7e2d6;padding:20px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#6b6660;">You're receiving this because you have a Blitz NYC account.<br>Blitz NYC, LLC</td></tr>
</table></td></tr></table></body></html>`;

const definitions: TemplateDefinition[] = [
  { key: 'notification_default', name: 'Default notification email', category: 'GENERAL', actionTypes: ['CUSTOM_GENERAL', 'CUSTOM_ORDER', 'CUSTOM_DESIGN', 'SERVICE_DEGRADATION'], subject: '{{title}}', heading: '{{title}}', body: '{{message}}', cta: 'Open details', variables: ['title', 'message', 'action_url'] },
  { key: 'order_received', name: 'Order received', category: 'ORDER', actionTypes: ['ORDER_CREATED', 'ORDER_SUBMITTED'], subject: 'Order received - {{order_number}}', heading: 'We received your order', body: 'Order {{order_number}} for {{company_name}} is in and pending confirmation.', cta: 'View order', variables: ['order_number', 'company_name', 'action_url'] },
  { key: 'order_approval_required', name: 'Order approval required', category: 'ORDER', actionTypes: ['ORDER_APPROVAL_REQUIRED'], subject: 'Approval required - {{order_number}}', heading: 'Order approval required', body: 'Order {{order_number}} needs approval before it can move forward.', cta: 'Review order', variables: ['order_number', 'company_name', 'action_url'] },
  { key: 'order_approved', name: 'Order approved', category: 'ORDER', actionTypes: ['ORDER_APPROVED'], subject: 'Order approved - {{order_number}}', heading: 'Order approved', body: 'Order {{order_number}} has been approved and is ready for the next step.', cta: 'View order', variables: ['order_number', 'company_name', 'action_url'] },
  { key: 'order_on_hold', name: 'Order on hold', category: 'ORDER', actionTypes: ['ORDER_ON_HOLD'], subject: 'Action needed - {{order_number}}', heading: 'This order needs attention', body: 'Order {{order_number}} is on hold. {{hold_reason}} {{hold_detail}}', cta: 'Resolve now', variables: ['order_number', 'company_name', 'hold_reason', 'hold_detail', 'action_url'] },
  { key: 'order_in_production', name: 'Order in production', category: 'ORDER', actionTypes: ['ORDER_IN_PRODUCTION'], subject: 'Order in production - {{order_number}}', heading: 'Your order is in production', body: 'Order {{order_number}} is now in production.', cta: 'View order', variables: ['order_number', 'company_name', 'action_url'] },
  { key: 'order_shipped', name: 'Order shipped', category: 'ORDER', actionTypes: ['ORDER_SHIPPED'], subject: 'Your order has shipped - {{order_number}}', heading: 'Your order is on its way', body: 'Order {{order_number}} has shipped. Carrier: {{carrier}}. Tracking: {{tracking_number}}.', cta: 'Track shipment', variables: ['order_number', 'company_name', 'carrier', 'tracking_number', 'delivery_estimate', 'action_url'] },
  { key: 'order_completed', name: 'Order completed', category: 'ORDER', actionTypes: ['ORDER_COMPLETED'], subject: 'Order completed - {{order_number}}', heading: 'Order completed', body: 'Order {{order_number}} is complete.', cta: 'View order', variables: ['order_number', 'company_name', 'action_url'] },
  { key: 'order_cancelled', name: 'Order cancelled', category: 'ORDER', actionTypes: ['ORDER_CANCELLED'], subject: 'Order cancelled - {{order_number}}', heading: 'Order cancelled', body: 'Order {{order_number}} has been cancelled. Reason: {{cancel_reason}}', cta: 'View order', variables: ['order_number', 'company_name', 'cancel_reason', 'action_url'] },
  { key: 'order_revised', name: 'Order revised', category: 'ORDER', actionTypes: ['ORDER_REVISED'], subject: 'Order revised - {{order_number}}', heading: 'Order revised', body: 'Order {{order_number}} was revised. {{revision_summary}}', cta: 'Review changes', variables: ['order_number', 'company_name', 'revision_summary', 'action_url'] },
  { key: 'new_collection', name: 'New collection available', category: 'CATALOG', actionTypes: ['COLLECTION_ACCESS_GRANTED'], subject: 'New collection available - {{collection_name}}', heading: 'New collection available', body: '{{collection_name}} is now available for {{company_name}}.', cta: 'Open collection', variables: ['collection_name', 'company_name', 'action_url'] },
  { key: 'pricing_updated', name: 'Pricing updated', category: 'PRICING', actionTypes: ['PRICING_UPDATED'], subject: 'Pricing updated - {{price_list_name}}', heading: 'Pricing update', body: '{{price_list_name}} pricing was updated. Effective date: {{effective_date}}.', cta: 'View pricing', variables: ['price_list_name', 'effective_date', 'action_url'] },
  { key: 'pricing_tier_changed', name: 'Pricing tier changed', category: 'PRICING', actionTypes: ['PRICING_TIER_CHANGED'], subject: 'Pricing tier changed - {{company_name}}', heading: 'Pricing tier changed', body: '{{company_name}} is now assigned to {{pricing_tier}}.', cta: 'View account', variables: ['company_name', 'pricing_tier', 'action_url'] },
  { key: 'product_import_failed', name: 'Product import failed', category: 'CATALOG', actionTypes: ['PRODUCT_IMPORT_FAILED'], subject: 'Product import failed - {{import_name}}', heading: 'Product import failed', body: '{{import_name}} could not be completed. {{failure_reason}}', cta: 'Review import', variables: ['import_name', 'failure_reason', 'action_url'] },
  { key: 'spiff_campaign_live', name: 'SPIFF campaign live', category: 'SPIFF', actionTypes: ['SPIFF_CAMPAIGN_LIVE'], subject: 'SPIFF campaign live - {{campaign_name}}', heading: 'SPIFF campaign is live', body: '{{campaign_name}} is now live. Earn {{points}} points.', cta: 'Open SPIFF', variables: ['campaign_name', 'points', 'action_url'] },
  { key: 'spiff_earned', name: 'SPIFF earned', category: 'SPIFF', actionTypes: ['SPIFF_EARNED', 'SPIFF_POINTS_GIVEN'], subject: 'You earned SPIFF points', heading: 'SPIFF points earned', body: 'You earned {{points}} points for {{activity_name}}.', cta: 'View SPIFF', variables: ['points', 'activity_name', 'action_url'] },
  { key: 'spiff_claim_submitted', name: 'SPIFF claim submitted', category: 'SPIFF', actionTypes: ['SPIFF_CLAIM_SUBMITTED', 'SPIFF_CLAIM_REVIEW_REQUIRED'], subject: 'SPIFF claim submitted - {{claim_id}}', heading: 'SPIFF claim submitted', body: 'Claim {{claim_id}} is waiting for review.', cta: 'Review claim', variables: ['claim_id', 'action_url'] },
  { key: 'spiff_claim_updated', name: 'SPIFF claim updated', category: 'SPIFF', actionTypes: ['SPIFF_CLAIM_APPROVED', 'SPIFF_CLAIM_REJECTED', 'SPIFF_CLAIM_HOLD', 'SPIFF_CLAIM_FULFILLED'], subject: 'SPIFF claim update - {{claim_id}}', heading: 'SPIFF claim update', body: 'Claim {{claim_id}} status is {{claim_status}}. {{claim_note}}', cta: 'Open claim', variables: ['claim_id', 'claim_status', 'claim_note', 'action_url'] },
  { key: 'spiff_period_reset', name: 'SPIFF period reset', category: 'SPIFF', actionTypes: ['SPIFF_PERIOD_RESET'], subject: 'SPIFF period reset - {{period_range}}', heading: 'SPIFF period reset', body: 'The SPIFF period {{period_range}} has reset.', cta: 'Open SPIFF', variables: ['period_range', 'action_url'] },
  { key: 'spiff_pace_nudge', name: 'SPIFF pace nudge', category: 'SPIFF', actionTypes: ['SPIFF_PACE_NUDGE', 'SPIFF_LEADERBOARD_MOVEMENT', 'SPIFF_EXPIRING_SOON'], subject: 'SPIFF update', heading: 'SPIFF update', body: '{{message}}', cta: 'Open SPIFF', variables: ['message', 'action_url'] },
  { key: 'user_account_created', name: 'User account created', category: 'USER', actionTypes: ['USER_ACCOUNT_CREATED'], subject: '{{title}}', heading: 'Your account is ready', body: '{{message}}', cta: 'Open account', variables: ['title', 'message', 'user_name', 'action_url'] },
  { key: 'user_role_changed', name: 'User role changed', category: 'USER', actionTypes: ['USER_ROLE_CHANGED', 'USER_ACCESS_CHANGED', 'USER_INVITE_ACTIVITY'], subject: 'Account access updated', heading: 'Account access updated', body: '{{message}}', cta: 'Open account', variables: ['message', 'action_url'] },
  { key: 'tenant_onboarded', name: 'Tenant onboarded', category: 'ACCOUNT', actionTypes: ['TENANT_ONBOARDED'], subject: 'New tenant onboarded - {{company_name}}', heading: 'New tenant onboarded', body: '{{company_name}} has been onboarded.', cta: 'Open company', variables: ['company_name', 'action_url'] },
  { key: 'overdue_hold', name: 'Account on hold - overdue invoice', category: 'BILLING', actionTypes: ['BILLING_OVERDUE_HOLD'], subject: 'Account on hold - invoice {{invoice_number}}', heading: 'Your account is on hold', body: 'Invoice {{invoice_number}} is past due. New orders are paused until payment is received.', cta: 'Resolve balance', variables: ['invoice_number', 'amount_due', 'action_url'] },
  { key: 'weekly_summary', name: 'Weekly summary', category: 'SUMMARY', actionTypes: ['SA_SUMMARY', 'IR_SUMMARY', 'COMPANY_SUMMARY'], subject: 'Blitz summary - {{period_range}}', heading: 'Blitz summary', body: '{{summary_message}}', cta: 'Open dashboard', variables: ['period_range', 'summary_message', 'action_url'] },
];

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplateSeed[] = definitions.map((definition) => ({
  key: definition.key,
  name: definition.name,
  category: definition.category,
  actionTypes: definition.actionTypes,
  subject: definition.subject,
  preheader: definition.body,
  html: wrapEmail(definition),
  requiredVariables: definition.variables?.filter((variable) => variable !== 'action_url') || [],
  optionalVariables: definition.variables?.includes('action_url') ? ['action_url'] : [],
}));