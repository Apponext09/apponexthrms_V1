import { getKnex } from '../../db/knex';
import type { SuperAdminRecord } from './superadmin.types';

export class SuperAdminRepository {
  private db = getKnex();

  /**
   * Get SuperAdmin by email
   */
  async getByEmail(email: string): Promise<SuperAdminRecord | null> {
    const result = await this.db('super_admins')
      .where('email', email)
      .first();
    return result || null;
  }

  /**
   * Get SuperAdmin by ID
   */
  async getById(id: number): Promise<SuperAdminRecord | null> {
    const result = await this.db('super_admins')
      .where('id', id)
      .first();
    return result || null;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: number): Promise<void> {
    await this.db('super_admins')
      .where('id', id)
      .update({
        last_login_at: new Date(),
        updated_at: new Date(),
      });
  }
}

export const superAdminRepository = new SuperAdminRepository();
