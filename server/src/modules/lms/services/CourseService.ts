import type { TenantContext } from '../../../db/types';
import { courseRepository } from '../repositories/CourseRepository';
import { categoryRepository } from '../repositories/CategoryRepository';
import { moduleRepository } from '../repositories/ModuleRepository';
import { batchRepository } from '../repositories/BatchRepository';
import { v4 as uuidv4 } from 'uuid';

export class CourseService {
  // Categories
  async getCategories(ctx: TenantContext, options?: any) {
    return categoryRepository.listWithCourseCount(ctx, options);
  }

  async createCategory(ctx: TenantContext, data: any) {
    return categoryRepository.create(ctx, {
      name: data.name,
      description: data.description || null,
      icon: data.icon || 'Folder',
      is_active: data.isActive !== undefined ? data.isActive : true,
      organization_id: ctx.organizationId,
      company_id: ctx.companyId || null,
    });
  }

  async updateCategory(ctx: TenantContext, id: number, data: any) {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;
    if (data.icon !== undefined) payload.icon = data.icon;
    if (data.isActive !== undefined) payload.is_active = data.isActive;
    return categoryRepository.update(ctx, id, payload);
  }

  async deleteCategory(ctx: TenantContext, id: number) {
    return categoryRepository.softDelete(ctx, id);
  }

  // Courses
  async getCourses(ctx: TenantContext, filters?: any) {
    return courseRepository.listCoursesWithStats(ctx, filters);
  }

  async getCourseById(ctx: TenantContext, id: number) {
    const course = await courseRepository.getCourseDetails(ctx, id);
    if (!course) return null;
    const modules = await moduleRepository.getByCourseId(ctx, id);
    return { ...course, modules };
  }

  async createCourse(ctx: TenantContext, data: any) {
    const course = await courseRepository.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      company_id: ctx.companyId || null,
      category_id: data.categoryId || null,
      title: data.title,
      description: data.description || null,
      type: data.type || 'self_paced',
      duration_hours: data.durationHours || 0,
      thumbnail_url: data.thumbnailUrl || null,
      is_mandatory: data.isMandatory !== undefined ? data.isMandatory : false,
      deadline_days: data.deadlineDays || 0,
      pass_percentage: data.passPercentage || 60,
      attempt_limit: data.attemptLimit || 3,
      status: data.status || 'draft',
      created_by: ctx.userId ? Number(ctx.userId) : null,
      updated_by: ctx.userId ? Number(ctx.userId) : null,
      skill_tags: data.skillTags ? (typeof data.skillTags === 'string' ? data.skillTags : JSON.stringify(data.skillTags)) : '[]',
    });
    return course;
  }

  async updateCourse(ctx: TenantContext, id: number, data: any) {
    const updatePayload: any = {};
    if (data.categoryId !== undefined) updatePayload.category_id = data.categoryId;
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.type !== undefined) updatePayload.type = data.type;
    if (data.durationHours !== undefined) updatePayload.duration_hours = data.durationHours;
    if (data.thumbnailUrl !== undefined) updatePayload.thumbnail_url = data.thumbnailUrl;
    if (data.isMandatory !== undefined) updatePayload.is_mandatory = data.isMandatory;
    if (data.deadlineDays !== undefined) updatePayload.deadline_days = data.deadlineDays;
    if (data.passPercentage !== undefined) updatePayload.pass_percentage = data.passPercentage;
    if (data.attemptLimit !== undefined) updatePayload.attempt_limit = data.attemptLimit;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.skillTags !== undefined) {
      updatePayload.skill_tags = typeof data.skillTags === 'string' ? data.skillTags : JSON.stringify(data.skillTags);
    }
    if (ctx.userId) {
      updatePayload.updated_by = Number(ctx.userId);
    }
    return courseRepository.update(ctx, id, updatePayload);
  }

  async deleteCourse(ctx: TenantContext, id: number) {
    return courseRepository.softDelete(ctx, id);
  }

  // Modules
  async getModulesByCourse(ctx: TenantContext, courseId: number) {
    return moduleRepository.getByCourseId(ctx, courseId);
  }

  async createModule(ctx: TenantContext, data: any) {
    return moduleRepository.create(ctx, {
      course_id: data.courseId,
      name: data.name || data.title,
      content_type: data.contentType || 'video',
      content_url: data.contentUrl || null,
      body_text: data.bodyText || data.contentText || null,
      sequence: data.sequence || data.sequenceOrder || 1,
      is_locked: data.isLocked !== undefined ? data.isLocked : false,
      duration_minutes: data.durationMinutes || 0,
      organization_id: ctx.organizationId,
    });
  }

  async updateModule(ctx: TenantContext, id: number, data: any) {
    const payload: any = {};
    if (data.courseId !== undefined) payload.course_id = data.courseId;
    if (data.name !== undefined) payload.name = data.name;
    if (data.title !== undefined) payload.name = data.title;
    if (data.contentType !== undefined) payload.content_type = data.contentType;
    if (data.contentUrl !== undefined) payload.content_url = data.contentUrl;
    if (data.bodyText !== undefined) payload.body_text = data.bodyText;
    if (data.contentText !== undefined) payload.body_text = data.contentText;
    if (data.sequence !== undefined) payload.sequence = data.sequence;
    if (data.sequenceOrder !== undefined) payload.sequence = data.sequenceOrder;
    if (data.isLocked !== undefined) payload.is_locked = data.isLocked;
    if (data.durationMinutes !== undefined) payload.duration_minutes = data.durationMinutes;
    return moduleRepository.update(ctx, id, payload);
  }

  async deleteModule(ctx: TenantContext, id: number) {
    return moduleRepository.softDelete(ctx, id);
  }

  async reorderModules(ctx: TenantContext, courseId: number, orders: { id: number; sequence: number }[]) {
    await moduleRepository.reorderModules(ctx, courseId, orders);
    return { success: true };
  }

  // Batches
  async getBatches(ctx: TenantContext, filters?: any) {
    return batchRepository.listWithCourseInfo(ctx, filters);
  }

  async createBatch(ctx: TenantContext, data: any) {
    return batchRepository.create(ctx, {
      course_id: data.courseId,
      trainer_id: data.trainerId || null,
      trainer_name: data.trainerName || null,
      title: data.title || data.name,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      schedule_time: data.scheduleTime || null,
      schedule_days: data.scheduleDays || null,
      today_session_time: data.todaySessionTime || null,
      session_notice: data.sessionNotice || null,
      mode: data.mode || 'online',
      max_seats: data.maxSeats || 50,
      seats_filled: 0,
      meeting_link: data.meetingLink || null,
      location: data.location || null,
      status: data.status || 'upcoming',
      organization_id: ctx.organizationId,
      company_id: ctx.companyId || null,
    });
  }

  async updateBatch(ctx: TenantContext, id: number, data: any) {
    const payload: any = {};
    if (data.courseId !== undefined) payload.course_id = data.courseId;
    if (data.trainerId !== undefined) payload.trainer_id = data.trainerId;
    if (data.trainerName !== undefined) payload.trainer_name = data.trainerName;
    if (data.title !== undefined) payload.title = data.title;
    if (data.name !== undefined) payload.title = data.name;
    if (data.startDate !== undefined) payload.start_date = data.startDate;
    if (data.endDate !== undefined) payload.end_date = data.endDate;
    if (data.scheduleTime !== undefined) payload.schedule_time = data.scheduleTime;
    if (data.scheduleDays !== undefined) payload.schedule_days = data.scheduleDays;
    if (data.todaySessionTime !== undefined) payload.today_session_time = data.todaySessionTime;
    if (data.sessionNotice !== undefined) payload.session_notice = data.sessionNotice;
    if (data.mode !== undefined) payload.mode = data.mode;
    if (data.maxSeats !== undefined) payload.max_seats = data.maxSeats;
    if (data.seatsFilled !== undefined) payload.seats_filled = data.seatsFilled;
    if (data.meetingLink !== undefined) payload.meeting_link = data.meetingLink;
    if (data.location !== undefined) payload.location = data.location;
    if (data.status !== undefined) payload.status = data.status;
    return batchRepository.update(ctx, id, payload);
  }

  async deleteBatch(ctx: TenantContext, id: number) {
    return batchRepository.softDelete(ctx, id);
  }
}

export const courseService = new CourseService();
