import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface EmployeeAssetAllocation {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  asset_id: number;
  allocation_date: string;
  return_date: string | null;
  condition_at_allocation: 'good' | 'fair' | 'poor';
  condition_at_return: 'good' | 'fair' | 'poor' | null;
  notes: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeAssetAllocationRepository extends BaseRepository<EmployeeAssetAllocation> {
  constructor() {
    super('employee_asset_allocations');
  }

  /**
   * Get allocations by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get current allocations for employee (not returned)
   */
  async getCurrentAllocations(ctx: TenantContext, employeeId: number) {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .whereNull('return_date')
      .select();
  }

  /**
   * Get allocations by asset
   */
  async getByAsset(ctx: TenantContext, assetId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { asset_id: assetId },
    });
  }

  /**
   * Check if asset is currently allocated
   */
  async isCurrentlyAllocated(ctx: TenantContext, assetId: number): Promise<boolean> {
    const result = await this.query(ctx)
      .where('asset_id', assetId)
      .whereNull('return_date')
      .first();
    return !!result;
  }

  protected getSearchableFields(): string[] {
    return ['notes'];
  }
}
