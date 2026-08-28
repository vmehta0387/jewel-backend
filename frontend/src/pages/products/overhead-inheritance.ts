export type InheritedOverheadRule = {
  id: string;
  value: string;
  overheadApplyMode?: unknown;
  overheadApplyModeName?: unknown;
  overheadApplyModeKey?: unknown;
  ratePercent?: unknown;
  flatAmount?: unknown;
};

export type InheritedOverheadRow = {
  id: string;
  overheadHead: string;
  ruleId: string;
  ruleSnapshot: InheritedOverheadRule;
};

const lookupKey = (value: unknown): string => String(value ?? '').trim().toLowerCase();

export const initializeInheritedOverheads = (
  overheads: unknown,
  labors: unknown,
  rules: InheritedOverheadRule[],
  makeId: () => string,
): InheritedOverheadRow[] => {
  const savedOverheads = Array.isArray(overheads) ? overheads : [];
  const legacyOverheads = (Array.isArray(labors) ? labors : []).filter((item: any) =>
    lookupKey(item?.laborHead).startsWith('overhead -'),
  );

  return (savedOverheads.length > 0 ? savedOverheads : legacyOverheads).map((item: any) => {
    const overheadHead = String(item?.overheadHead || item?.laborHead || '')
      .replace(/^Overhead\s*-\s*/i, '')
      .trim();
    const overheadRuleId = String(item?.overheadRuleId ?? '').trim();
    const matchedRule = rules.find(
      (rule) =>
        (overheadRuleId && String(rule.id) === overheadRuleId) ||
        lookupKey(rule.value) === lookupKey(overheadHead),
    );
    const ruleSnapshot: InheritedOverheadRule = matchedRule || {
      id: overheadRuleId || `current-${overheadHead || makeId()}`,
      value: overheadHead,
      overheadApplyMode: item?.overheadApplyMode,
      overheadApplyModeName: item?.overheadApplyModeName,
      ratePercent: item?.ratePercent,
      flatAmount: item?.flatAmount,
    };

    return {
      id: String(item?.id || makeId()),
      overheadHead,
      ruleId: String(matchedRule?.id || ruleSnapshot.id),
      ruleSnapshot,
    };
  });
};
