/**
 * Utility helper to determine if a leave type or policy is applicable for a given employee's gender.
 */
function extractConditionItems(groupOrItem: any): any[] {
  if (!groupOrItem) return [];
  if (Array.isArray(groupOrItem)) {
    return groupOrItem.flatMap(extractConditionItems);
  }
  if (groupOrItem.conditions && Array.isArray(groupOrItem.conditions)) {
    return groupOrItem.conditions.flatMap(extractConditionItems);
  }
  if (groupOrItem.rules && Array.isArray(groupOrItem.rules)) {
    return groupOrItem.rules.flatMap(extractConditionItems);
  }
  return [groupOrItem];
}

export const isLeaveTypeApplicableForGender = (item: any, employeeGender?: string): boolean => {
  if (!employeeGender) return true;
  const empGender = String(employeeGender).trim().toLowerCase();
  if (!empGender) return true;

  // 1. Direct gender field checks across schemas
  const directGender = (
    item.gender_applicable ||
    item.genderApplicable ||
    item.gender ||
    item.allocation_settings?.gender ||
    item.allocation?.gender ||
    'all'
  ).toString().trim().toLowerCase();

  if (directGender !== 'all' && directGender !== 'both' && directGender !== '') {
    if (directGender === 'female' && empGender !== 'female') return false;
    if (directGender === 'male' && empGender !== 'male') return false;
  }

  // 2. Condition builder rule checks ("only_when" or "onlyWhen")
  const rawOnlyWhen =
    item.only_when ||
    item.onlyWhen ||
    item.allocation_settings?.onlyWhen ||
    item.allocation_settings?.only_when;

  let parsedOnlyWhen = rawOnlyWhen;
  if (typeof rawOnlyWhen === 'string') {
    try {
      parsedOnlyWhen = JSON.parse(rawOnlyWhen);
    } catch (e) {
      parsedOnlyWhen = null;
    }
  }

  const conditionItems = extractConditionItems(parsedOnlyWhen);

  for (const rule of conditionItems) {
    if (!rule || typeof rule !== 'object') continue;
    const fieldName = (rule.fact || rule.field || '').toString().trim().toLowerCase();
    if (fieldName === 'gender') {
      const targetGender = (rule.value || '').toString().trim().toLowerCase();
      const op = (rule.operator || '=').toString().trim().toLowerCase();

      if (['=', '==', '===', 'equals', 'is_equal_to', 'is equal to (=)'].includes(op)) {
        if (targetGender === 'female' && empGender !== 'female') return false;
        if (targetGender === 'male' && empGender !== 'male') return false;
      }
    }
  }

  return true;
};
