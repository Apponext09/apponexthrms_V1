import { BaseRepository } from '../../../db/BaseRepository';

export class GradeRepository extends BaseRepository<any> {
  constructor() {
    super('grades');
    this.companyScoped = true;
  }
}
