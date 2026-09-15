import { BaseRepository } from '../../../db/BaseRepository';
import { getKnex, convertSnakeToCamel } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import type { LmsModule } from '../types/lms.types';

export class ModuleRepository extends BaseRepository<LmsModule> {
  constructor() {
    super('lms_modules');
  }

  async getByCourseId(ctx: TenantContext, courseId: number) {
    return this.query(ctx)
      .where('course_id', courseId)
      .whereNull('deleted_at')
      .orderBy('sequence', 'asc');
  }

  async update(ctx: TenantContext, id: number | string, data: Partial<LmsModule>): Promise<LmsModule> {
    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    // Direct update scoped to organization
    await this.db('lms_modules')
      .where('id', Number(id))
      .where('organization_id', ctx.organizationId)
      .update(updateData);

    const updated = await this.getById(ctx, id);
    if (updated) {
      return updated;
    }

    // Fallback: fetch raw row
    const raw = await this.db('lms_modules').where('id', Number(id)).first();
    if (!raw) {
      throw new Error(`Module with ID ${id} not found`);
    }
    return convertSnakeToCamel(raw);
  }

  async reorderModules(ctx: TenantContext, courseId: number, orders: { id: number; sequence: number }[]) {
    return this.db.transaction(async (trx) => {
      for (const item of orders) {
        await trx('lms_modules')
          .where('id', item.id)
          .where('course_id', courseId)
          .where('organization_id', ctx.organizationId)
          .update({
            sequence: item.sequence,
            updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          });
      }
    });
  }
}

export const moduleRepository = new ModuleRepository();
