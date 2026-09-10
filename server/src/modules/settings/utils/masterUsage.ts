import { getKnex } from '../../../db/knex';
import { ConflictError } from '../../../common/errors/index';

export interface MasterRef {
  /** Table that may reference the master. */
  table: string;
  /** Column on `table` holding the master id (or, for `matchValue`, the master's name/code). */
  column: string;
  /** Human label for the referencing rows, e.g. "employee(s)". */
  label: string;
  /** When set, compare `column` to this literal value instead of the master id (loose string links). */
  matchValue?: string;
  /** Table has an `organization_id` column to scope by. Default true. */
  orgScoped?: boolean;
  /** Table has a `deleted_at` column to exclude soft-deleted rows. Default true. */
  softDeleted?: boolean;
}

/**
 * Guard a master (Department, Designation, Location, Grade, …) delete against orphaning:
 * throws ConflictError (→ HTTP 409) if anything still references it.
 * Callers should soft-delete / deactivate instead when this throws.
 */
export async function assertMasterNotInUse(
  organizationId: number,
  id: number | string,
  masterLabel: string,
  refs: MasterRef[]
): Promise<void> {
  const db = getKnex();
  const found: string[] = [];

  for (const ref of refs) {
    // A loose string link with no value to match on can't be checked — skip rather than
    // matching every empty cell.
    if (ref.matchValue !== undefined && !String(ref.matchValue).trim()) continue;
    let q = db(ref.table).where(ref.column, ref.matchValue ?? id);
    if (ref.orgScoped !== false) q = q.where('organization_id', organizationId);
    if (ref.softDeleted !== false) q = q.whereNull('deleted_at');
    const n = Number(((await q.count('* as c').first()) as any)?.c || 0);
    if (n > 0) found.push(`${n} ${ref.label}`);
  }

  if (found.length > 0) {
    throw new ConflictError(
      `Cannot delete this ${masterLabel} — it is still assigned to ${found.join(' and ')}. ` +
        `Reassign them first, or set the ${masterLabel} to Inactive instead.`
    );
  }
}
