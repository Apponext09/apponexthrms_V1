import { BaseRepository } from '../../../db/BaseRepository';

export interface RolesResponsibility {
  id: number;
  uuid: string;
  organization_id: number;
  company_id: number | null;
  company_name: string | null;
  department_id: number | null;
  department_name: string | null;
  designation_id: number | null;
  designation_name: string | null;
  kra_form_id: number | null;
  kra_form: string | null;
  responsibilities: string;
  is_active: 'Yes' | 'No';
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class RolesResponsibilityRepository extends BaseRepository<RolesResponsibility> {
  constructor() {
    super('roles_responsibilities');
  }

  protected getSearchableFields(): string[] {
    return ['company_name', 'department_name', 'designation_name', 'kra_form', 'responsibilities'];
  }

  protected getAllowedSortColumns(): string[] {
    return ['id', 'company_name', 'department_name', 'designation_name', 'is_active', 'created_at', 'updated_at'];
  }
}
