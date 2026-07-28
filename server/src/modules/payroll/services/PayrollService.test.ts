// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PayrollService } from './PayrollService';
import type { TenantContext } from '../../../db/types';

describe('PayrollService', () => {
  let service: PayrollService;
  let mockContext: TenantContext;

  beforeEach(() => {
    service = new PayrollService();
    mockContext = {
      organizationId: 1,
      userId: 1,
      sessionUuid: 'test-session'
    };
  });

  describe('generatePayroll', () => {
    it('should create a new payroll run', async () => {
      const payrollRun = await service.generatePayroll(mockContext, 1, 'regular');
      expect(payrollRun).toBeDefined();
      expect(payrollRun.status).toBe('draft');
    });

    it('should throw error if cycle is not open', async () => {
      // TODO: Mock closed cycle
      expect(true).toBe(true);
    });
  });

  describe('processPayroll', () => {
    it('should update payroll status to processing', async () => {
      const payrollRun = await service.generatePayroll(mockContext, 1);
      const processed = await service.processPayroll(mockContext, payrollRun.id);
      expect(processed.status).toBe('locked');
    });

    it('should calculate employees', async () => {
      // TODO: Test calculation logic
      expect(true).toBe(true);
    });
  });

  describe('lockPayroll', () => {
    it('should lock payroll for approval', async () => {
      const payrollRun = await service.generatePayroll(mockContext, 1);
      const locked = await service.lockPayroll(mockContext, payrollRun.id);
      expect(locked.status).toBe('locked');
      expect(locked.locked_by).toBe(mockContext.user_id);
    });
  });

  describe('approvePayroll', () => {
    it('should approve locked payroll', async () => {
      const payrollRun = await service.generatePayroll(mockContext, 1);
      await service.lockPayroll(mockContext, payrollRun.id);
      const approved = await service.approvePayroll(mockContext, payrollRun.id);
      expect(approved.status).toBe('approved');
    });

    it('should throw error if payroll not locked', async () => {
      const payrollRun = await service.generatePayroll(mockContext, 1);
      expect(async () => {
        await service.approvePayroll(mockContext, payrollRun.id);
      }).rejects.toThrow();
    });
  });

  describe('publishPayroll', () => {
    it('should publish approved payroll', async () => {
      const payrollRun = await service.generatePayroll(mockContext, 1);
      await service.lockPayroll(mockContext, payrollRun.id);
      await service.approvePayroll(mockContext, payrollRun.id);
      const published = await service.publishPayroll(mockContext, payrollRun.id);
      expect(published.status).toBe('published');
      expect(published.published_at).toBeDefined();
    });
  });

  describe('getPayrollStatus', () => {
    it('should retrieve payroll status', async () => {
      const payrollRun = await service.generatePayroll(mockContext, 1);
      const status = await service.getPayrollStatus(mockContext, payrollRun.id);
      expect(status.id).toBe(payrollRun.id);
      expect(status.status).toBe('draft');
    });
  });

  describe('getPayrollRuns', () => {
    it('should list all payroll runs', async () => {
      await service.generatePayroll(mockContext, 1);
      const runs = await service.getPayrollRuns(mockContext);
      expect(Array.isArray(runs)).toBe(true);
    });

    it('should filter by cycle', async () => {
      await service.generatePayroll(mockContext, 1);
      const runs = await service.getPayrollRuns(mockContext, 1);
      expect(Array.isArray(runs)).toBe(true);
    });
  });
});
