/**
 * payroll.classify.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for "what kind of payroll component is this?".
 *
 * The engine previously scattered ad-hoc `name.toLowerCase().includes('pf')`,
 * `includes('esi') || includes('insurance')`, `includes('pt')` checks across
 * three calculation paths. Those over-match ("Receipt Allowance" → PT via a
 * naive substring, "Group Insurance" → ESI) and drift out of sync.
 *
 * `classifyComponent()` prefers the explicit `statutory_code` / `is_statutory`
 * columns (populated by migration + Settings UI) and only falls back to
 * *corrected, centralised* name heuristics for components that predate them.
 */

export type StatutoryCode =
  | 'epf'      // employee provident fund (12% of basic, employee share)
  | 'eps'      // employee pension scheme (employer split of PF)
  | 'vpf'      // voluntary provident fund
  | 'esi'      // employee state insurance
  | 'pt'       // professional tax (state)
  | 'tds'      // tax deducted at source / income tax
  | 'lwf'      // labour welfare fund
  | 'gratuity';

export interface ComponentClassification {
  kind: 'earning' | 'deduction' | 'unknown';
  statutoryCode: StatutoryCode | null;
  isStatutory: boolean;
  isBasic: boolean;
  isHRA: boolean;
  /** The residual "balancing" earning that absorbs gross − Σ(other earnings). */
  isSpecialAllowanceResidual: boolean;
}

const pick = (comp: any, ...keys: string[]) => {
  for (const k of keys) {
    if (comp && comp[k] !== undefined && comp[k] !== null && comp[k] !== '') return comp[k];
  }
  return undefined;
};

function heuristicStatutoryCode(name: string): StatutoryCode | null {
  const n = ` ${name.toLowerCase().replace(/[._]/g, ' ').replace(/\s+/g, ' ')} `;
  if (/\b(tds|income tax)\b/.test(n) || /\btax deducted\b/.test(n)) return 'tds';
  if (/\besic?\b/.test(n) || /\bemployee state insurance\b/.test(n)) return 'esi';
  if (/\b(pt|p tax|prof(?:essional)? tax)\b/.test(n)) return 'pt';
  if (/\blwf\b/.test(n) || /\blabou?r welfare\b/.test(n)) return 'lwf';
  if (/\bvpf\b/.test(n) || /\bvoluntary provident\b/.test(n)) return 'vpf';
  if (/\beps\b/.test(n) || /\bpension scheme\b/.test(n)) return 'eps';
  if (/\b(epf|pf)\b/.test(n) || /\bprovident fund\b/.test(n)) return 'epf';
  if (/\bgratuity\b/.test(n)) return 'gratuity';
  return null;
}

export function classifyComponent(comp: any): ComponentClassification {
  const name = String(pick(comp, 'name', 'component_name', 'componentName') ?? '');
  const nameLc = name.toLowerCase();

  const rawCat = String(
    pick(comp, 'group_category', 'groupCategory', 'category', 'kind') ?? ''
  ).toLowerCase();
  let kind: ComponentClassification['kind'] = 'unknown';
  if (rawCat.includes('deduct')) kind = 'deduction';
  else if (rawCat.includes('earn')) kind = 'earning';

  // Explicit column wins.
  const explicitCode = String(pick(comp, 'statutory_code', 'statutoryCode') ?? '')
    .toLowerCase()
    .trim() as StatutoryCode | '';
  const explicitFlag = pick(comp, 'is_statutory', 'isStatutory');

  let statutoryCode: StatutoryCode | null =
    (['epf', 'eps', 'vpf', 'esi', 'pt', 'tds', 'lwf', 'gratuity'] as const).includes(
      explicitCode as StatutoryCode
    )
      ? (explicitCode as StatutoryCode)
      : null;

  // `is_statutory` is a NOT NULL DEFAULT 0 column, so "0" means "not yet
  // classified", not "explicitly non-statutory". Fall back to name heuristics
  // whenever we have neither an explicit code nor an explicit `is_statutory = 1`.
  const explicitlyStatutory = explicitFlag === 1 || explicitFlag === true;
  if (!statutoryCode && !explicitlyStatutory) {
    statutoryCode = heuristicStatutoryCode(name);
  }

  const isStatutory = explicitlyStatutory || Boolean(statutoryCode);

  // Basic: an earning literally called "basic", not e.g. "PF 12% on Basic".
  const isBasic =
    /\bbasic\b/.test(nameLc) && kind !== 'deduction' && !isStatutory;

  const isHRA = /\bhra\b/.test(nameLc) || /\bhouse rent\b/.test(nameLc);

  const isSpecialAllowanceResidual =
    kind !== 'deduction' &&
    (/\bspecial allowance\b/.test(nameLc) ||
      /\bbalance allowance\b/.test(nameLc) ||
      /\bresidual\b/.test(nameLc));

  return { kind, statutoryCode, isStatutory, isBasic, isHRA, isSpecialAllowanceResidual };
}

/** True when `comp` is the given statutory component. */
export function isStatutoryComponent(comp: any, code: StatutoryCode): boolean {
  return classifyComponent(comp).statutoryCode === code;
}

/** True when `comp` is any PF-family component (epf/eps/vpf). */
export function isProvidentFund(comp: any): boolean {
  const c = classifyComponent(comp).statutoryCode;
  return c === 'epf' || c === 'eps' || c === 'vpf';
}
