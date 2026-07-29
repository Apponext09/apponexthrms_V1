import axios, { AxiosError } from 'axios';
import { db } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import { AttendanceService } from './AttendanceService';
import { GeoFenceService } from './GeoFenceService';

const PROFILE_TABLE = 'employee_biometric_profiles';
const BIOMETRIC_SERVICE_URL =
  process.env.BIOMETRIC_SERVICE_URL || 'http://127.0.0.1:8000';
const BIOMETRIC_SERVICE_API_KEY = process.env.BIOMETRIC_SERVICE_API_KEY || '';
const EMBEDDING_MODEL = 'dlib_resnet_v1_128';
const REQUEST_TIMEOUT_MS = Number(process.env.BIOMETRIC_REQUEST_TIMEOUT_MS || 20000);

type PunchAction = 'auto' | 'check_in' | 'check_out';

interface EmployeeRow {
  id: number;
  organizationId: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  avatarUrl?: string | null;
  status?: string;
}

interface EnrollmentResponse {
  success: boolean;
  message: string;
  embedding?: number[];
  model_version?: string;
  quality_score?: number;
  sample_count?: number;
  samples?: Array<Record<string, unknown>>;
}

interface IdentificationResponse {
  success: boolean;
  matched: boolean;
  message: string;
  employee_id?: string;
  employee_name?: string;
  distance?: number;
  threshold?: number;
  separation?: number | null;
  match_score?: number;
  quality?: Record<string, unknown>;
  model_version?: string;
}

export class BiometricService {
  private readonly attendanceService = new AttendanceService();

  private get serviceHeaders() {
    return BIOMETRIC_SERVICE_API_KEY
      ? { 'X-Biometric-Key': BIOMETRIC_SERVICE_API_KEY }
      : {};
  }

  private async requireProfileTable(): Promise<void> {
    if (!(await db.schema.hasTable(PROFILE_TABLE))) {
      throw new Error(
        'Biometric database migration is not installed. Run npm run db:migrate.'
      );
    }
  }

  private async resolveEmployee(
    ctx: TenantContext,
    employeeIdentifier: string | number
  ): Promise<EmployeeRow> {
    const identifier = String(employeeIdentifier).trim();
    const query = db('employees')
      .select(
        'id',
        'organization_id as organizationId',
        'employee_code as employeeCode',
        'first_name as firstName',
        'last_name as lastName',
        'email',
        'avatar_url as avatarUrl',
        'status'
      )
      .where({ organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .andWhere((builder) => {
        builder.where({ employee_code: identifier });
        if (/^\d+$/.test(identifier)) {
          builder.orWhere({ id: Number(identifier) });
        }
      })
      .first();

    const employee = (await query) as EmployeeRow | undefined;
    if (!employee) {
      throw new Error('Employee was not found in the current organization.');
    }
    return employee;
  }

  private employeeName(employee: EmployeeRow): string {
    return `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
      || employee.employeeCode;
  }

  private normalizeImages(imageOrImages: string | string[]): string[] {
    const images = (Array.isArray(imageOrImages) ? imageOrImages : [imageOrImages])
      .map((image) => image?.replace(/[\r\n]/g, '').trim())
      .filter((image): image is string => Boolean(image));

    if (images.length === 0) {
      throw new Error('At least one camera image is required.');
    }
    return images;
  }

  private parseVector(value: unknown): number[] | null {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if (
        Array.isArray(parsed)
        && parsed.length === 128
        && parsed.every((item) => Number.isFinite(Number(item)))
      ) {
        return parsed.map(Number);
      }
    } catch {
      // Invalid legacy templates are ignored and rebuilt from the employee photo.
    }
    return null;
  }

  private biometricError(error: unknown, fallback: string): Error {
    if (error instanceof AxiosError) {
      const responseMessage =
        error.response?.data?.message || error.response?.data?.detail;
      if (responseMessage) return new Error(String(responseMessage));
      if (error.code === 'ECONNREFUSED') {
        return new Error(
          'Biometric engine is offline. Start the new biometric backend on port 8000.'
        );
      }
    }
    return error instanceof Error ? error : new Error(fallback);
  }

  private async extractEnrollment(images: string[]): Promise<EnrollmentResponse> {
    try {
      const response = await axios.post<EnrollmentResponse>(
        `${BIOMETRIC_SERVICE_URL}/v1/embeddings/enroll`,
        { images },
        {
          timeout: REQUEST_TIMEOUT_MS,
          headers: this.serviceHeaders,
          maxBodyLength: 25 * 1024 * 1024,
        }
      );
      if (!response.data.success || !response.data.embedding) {
        throw new Error(response.data.message || 'Face template generation failed.');
      }
      return response.data;
    } catch (error) {
      throw this.biometricError(error, 'Face template generation failed.');
    }
  }

  private async saveEnrollment(
    ctx: TenantContext,
    employee: EmployeeRow,
    images: string[]
  ) {
    await this.requireProfileTable();
    const result = await this.extractEnrollment(images);
    const name = this.employeeName(employee);
    const profilePhoto = images[Math.floor(images.length / 2)] || images[0];
    const payload = {
      organization_id: ctx.organizationId,
      employee_id: employee.id,
      employee_code: employee.employeeCode,
      employee_name: name,
      embedding_model: result.model_version || EMBEDDING_MODEL,
      face_vector: JSON.stringify(result.embedding),
      profile_photo: profilePhoto,
      quality_score: result.quality_score ?? null,
      sample_count: result.sample_count || images.length,
      is_active: true,
      enrolled_at: db.fn.now(),
      updated_at: db.fn.now(),
    };

    const existing = await db(PROFILE_TABLE)
      .where({
        organization_id: ctx.organizationId,
        employee_id: employee.id,
      })
      .first();

    if (existing) {
      await db(PROFILE_TABLE).where({ id: existing.id }).update(payload);
    } else {
      await db(PROFILE_TABLE).insert({
        ...payload,
        created_at: db.fn.now(),
      });
    }

    if (profilePhoto !== employee.avatarUrl) {
      await db('employees')
        .where({ id: employee.id, organization_id: ctx.organizationId })
        .update({ avatar_url: profilePhoto, updated_at: db.fn.now() });
    }

    return {
      success: true,
      message: `Face biometric enrolled for ${name}.`,
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        name,
      },
      modelVersion: result.model_version || EMBEDDING_MODEL,
      sampleCount: result.sample_count || images.length,
      qualityScore: result.quality_score ?? null,
      qualitySamples: result.samples || [],
      profilePhoto,
    };
  }

  async getEmployeesList(ctx: TenantContext) {
    const rows = (await db('employees')
      .select(
        'id',
        'employee_code',
        'first_name',
        'last_name',
        'status'
      )
      .where({ organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .whereNotIn('status', ['exit', 'alumni'])
      .orderBy('first_name', 'asc')
      .limit(500)) as EmployeeRow[];

    return rows.map((employee) => ({
      id: String(employee.id),
      employeeCode: employee.employeeCode,
      name: this.employeeName(employee),
    }));
  }

  async enrollFace(
    ctx: TenantContext,
    employeeIdentifier: string | number,
    imageOrImages: string | string[]
  ) {
    const employee = await this.resolveEmployee(ctx, employeeIdentifier);
    return this.saveEnrollment(ctx, employee, this.normalizeImages(imageOrImages));
  }

  async getEnrollmentStatus(
    ctx: TenantContext,
    employeeIdentifier: string | number
  ) {
    await this.requireProfileTable();
    const employee = await this.resolveEmployee(ctx, employeeIdentifier);
    const record = await db(PROFILE_TABLE)
      .where({
        organization_id: ctx.organizationId,
        employee_id: employee.id,
        is_active: true,
      })
      .first();

    return {
      isEnrolled: Boolean(record),
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      enrolledAt: record?.enrolledAt || null,
      modelVersion: record?.embeddingModel || null,
      qualityScore: record?.qualityScore ?? null,
      sampleCount: record?.sampleCount || 0,
      profilePhoto: record?.profilePhoto || employee.avatarUrl || null,
    };
  }

  async deactivateFace(
    ctx: TenantContext,
    employeeIdentifier: string | number
  ): Promise<void> {
    await this.requireProfileTable();
    const employee = await this.resolveEmployee(ctx, employeeIdentifier);
    await db(PROFILE_TABLE)
      .where({
        organization_id: ctx.organizationId,
        employee_id: employee.id,
      })
      .update({ is_active: false, updated_at: db.fn.now() });
  }

  /**
   * Converts existing employee profile photos into real embeddings.
   * Invalid/non-face photos are skipped and reported; no placeholder vector is ever stored.
   */
  async syncExistingEmployeePhotos(ctx: TenantContext) {
    await this.requireProfileTable();
    const employees = (await db('employees')
      .select(
        'id',
        'organization_id',
        'employee_code',
        'first_name',
        'last_name',
        'email',
        'avatar_url',
        'status'
      )
      .where({ organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .whereNotNull('avatar_url')
      .whereNotIn('status', ['exit', 'alumni'])) as EmployeeRow[];

    const profiles = await db(PROFILE_TABLE)
      .select('employee_id', 'embedding_model')
      .where({ organization_id: ctx.organizationId, is_active: true });
    const current = new Map(
      profiles.map((profile: any) => [
        Number(profile.employeeId),
        profile.embeddingModel,
      ])
    );

    const synced: string[] = [];
    const skipped: Array<{ employeeCode: string; reason: string }> = [];
    for (const employee of employees) {
      if (current.get(Number(employee.id)) === EMBEDDING_MODEL) continue;
      if (!employee.avatarUrl?.startsWith('data:image/')) {
        skipped.push({
          employeeCode: employee.employeeCode,
          reason: 'Profile photo is not a captured image data URL.',
        });
        continue;
      }
      try {
        await this.saveEnrollment(ctx, employee, [employee.avatarUrl]);
        synced.push(employee.employeeCode);
      } catch (error) {
        skipped.push({
          employeeCode: employee.employeeCode,
          reason: error instanceof Error ? error.message : 'Face extraction failed.',
        });
      }
    }
    return { synced, skipped };
  }

  async verifyAndPunch(
    ctx: TenantContext,
    imageOrImages: string | string[],
    requestedAction: PunchAction = 'auto',
    location?: {
      locationId?: number;
      latitude?: number;
      longitude?: number;
    },
    targetEmployeeIdentifier?: string
  ) {
    await this.requireProfileTable();
    const images = this.normalizeImages(imageOrImages);

    // This bootstraps the existing Samarth/Harsh captured profile photos once.
    const syncResult = await this.syncExistingEmployeePhotos(ctx);

    let targetEmployeeId: number | undefined;
    if (targetEmployeeIdentifier) {
      targetEmployeeId = (
        await this.resolveEmployee(ctx, targetEmployeeIdentifier)
      ).id;
    }

    if (location?.latitude !== undefined && location?.longitude !== undefined) {
      const geoFenceService = new GeoFenceService();
      const geoResult = await geoFenceService.validateCheckInLocation(
        ctx,
        targetEmployeeId || 0,
        Number(location.latitude),
        Number(location.longitude),
        new Date().toISOString()
      );
      if (!geoResult.valid) {
        throw new Error(geoResult.message);
      }
    }

    const profileQuery = db(PROFILE_TABLE)
      .select(
        'employee_id as employeeId',
        'employee_code as employeeCode',
        'employee_name as employeeName',
        'face_vector as faceVector',
        'embedding_model as embeddingModel',
        'profile_photo as profilePhoto'
      )
      .where({
        organization_id: ctx.organizationId,
        is_active: true,
        embedding_model: EMBEDDING_MODEL,
      });
    if (targetEmployeeId) {
      profileQuery.andWhere({ employee_id: targetEmployeeId });
    }

    const profiles = await profileQuery;
    const candidates = profiles
      .map((profile: any) => ({
        employee_id: String(profile.employeeId),
        employee_name: profile.employeeName,
        face_vector: this.parseVector(profile.faceVector),
        model_version: profile.embeddingModel,
      }))
      .filter((candidate) => candidate.face_vector !== null);

    if (candidates.length === 0) {
      const serviceOffline = syncResult.skipped.find((item) =>
        item.reason.toLowerCase().includes('engine is offline')
      );
      if (serviceOffline) {
        throw new Error(serviceOffline.reason);
      }
      throw new Error(
        'No valid employee face templates are enrolled for this organization.'
      );
    }

    let identification: IdentificationResponse;
    try {
      const response = await axios.post<IdentificationResponse>(
        `${BIOMETRIC_SERVICE_URL}/v1/faces/identify`,
        {
          images,
          candidates,
        },
        {
          timeout: REQUEST_TIMEOUT_MS,
          headers: this.serviceHeaders,
          maxBodyLength: 25 * 1024 * 1024,
        }
      );
      identification = response.data;
    } catch (error) {
      throw this.biometricError(error, 'Face identification failed.');
    }

    if (!identification.success || !identification.matched || !identification.employee_id) {
      throw new Error(
        identification.message || 'Face did not match an enrolled employee.'
      );
    }

    const matchedEmployee = (await db('employees')
      .select(
        'id',
        'organization_id as organizationId',
        'employee_code as employeeCode',
        'first_name as firstName',
        'last_name as lastName',
        'status'
      )
      .where({
        id: Number(identification.employee_id),
        organization_id: ctx.organizationId,
      })
      .whereNull('deleted_at')
      .first()) as EmployeeRow | undefined;
    if (!matchedEmployee || ['exit', 'alumni'].includes(matchedEmployee.status || '')) {
      throw new Error('Matched employee is not active in this organization.');
    }
    console.log(`[BiometricService] Face matched → Employee: ${matchedEmployee.firstName} ${matchedEmployee.lastName} (Code: ${matchedEmployee.employeeCode}, ID: ${matchedEmployee.id})`);

    const todayRecord = await this.attendanceService.getTodayRecord(
      ctx,
      matchedEmployee.id
    );
    const action: Exclude<PunchAction, 'auto'> =
      requestedAction === 'auto'
        ? todayRecord?.checkInTime && !todayRecord?.checkOutTime
          ? 'check_out'
          : 'check_in'
        : requestedAction;

    if (action === 'check_in' && todayRecord?.checkInTime) {
      throw new Error(
        todayRecord.checkOutTime
          ? 'Attendance is already completed for this employee today.'
          : 'Employee is already checked in. Select Check out to end the shift.'
      );
    }
    if (
      action === 'check_out'
      && (!todayRecord?.checkInTime || todayRecord?.checkOutTime)
    ) {
      throw new Error(
        todayRecord?.checkOutTime
          ? 'Employee is already checked out for today.'
          : 'Employee must check in before checking out.'
      );
    }

    let attendanceRecord;
    try {
      attendanceRecord =
        action === 'check_in'
          ? await this.attendanceService.checkIn(ctx, {
              employeeId: matchedEmployee.id,
              method: 'face_recognition',
              checkInLocation: location?.locationId,
              latitude: location?.latitude,
              longitude: location?.longitude,
            })
          : await this.attendanceService.checkOut(ctx, {
              employeeId: matchedEmployee.id,
              method: 'face_recognition',
              checkOutLocation: location?.locationId,
              latitude: location?.latitude,
              longitude: location?.longitude,
            });
    } catch (attendanceErr: any) {
      console.error(`[BiometricService] Failed to save attendance for employee ${matchedEmployee.id}:`, attendanceErr?.message || attendanceErr);
      throw attendanceErr;
    }

    await db(PROFILE_TABLE)
      .where({
        organization_id: ctx.organizationId,
        employee_id: matchedEmployee.id,
      })
      .update({ last_verified_at: db.fn.now(), updated_at: db.fn.now() });

    const matchedProfile = profiles.find(
      (profile: any) => Number(profile.employeeId) === matchedEmployee.id
    );
    const name = this.employeeName(matchedEmployee);
    const markedAt =
      action === 'check_in'
        ? attendanceRecord.checkInTime ?? attendanceRecord.check_in_time
        : attendanceRecord.checkOutTime ?? attendanceRecord.check_out_time;

    const entryResult = (attendanceRecord as any)._entryResult;

    return {
      success: true,
      message: `${name} has checked ${action === 'check_in' ? 'in' : 'out'} successfully.`,
      action,
      entryStatus: entryResult?.entryStatus || null,
      entryResult: entryResult || null,
      matchedEmployee: {
        id: matchedEmployee.id,
        employeeCode: matchedEmployee.employeeCode,
        name,
        profilePhoto: matchedProfile?.profilePhoto || null,
      },
      matchScore: identification.match_score ?? null,
      similarityPercentage: identification.match_score ?? null,
      distance: identification.distance ?? null,
      threshold: identification.threshold ?? null,
      separation: identification.separation ?? null,
      quality: identification.quality || null,
      modelVersion: identification.model_version || EMBEDDING_MODEL,
      attendance: {
        id: attendanceRecord.id,
        status: action === 'check_in' ? 'checked_in' : 'checked_out',
        markedAt,
        attendanceStatus: attendanceRecord.status,
        isLate: attendanceRecord.isLate ?? attendanceRecord.is_late ?? false,
      },
    };

  }
}
