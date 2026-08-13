import { OverheadRuleApplyMode } from '../entities/design-master-tables.entity';

export const OVERHEAD_RULE_APPLY_MODE_OPTIONS = [
  { key: OverheadRuleApplyMode.PER_OF_MATERIALS, name: 'Per Of Materials' },
  { key: OverheadRuleApplyMode.FLAT, name: 'Flat' },
] as const;

export const OVERHEAD_RULE_APPLY_MODE_NAME_BY_KEY = OVERHEAD_RULE_APPLY_MODE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.key] = option.name;
    return acc;
  },
  {} as Record<OverheadRuleApplyMode, string>,
);
