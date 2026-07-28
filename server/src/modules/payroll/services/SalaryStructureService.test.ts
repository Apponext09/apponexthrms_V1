// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { SalaryStructureService } from './SalaryStructureService';
import type { TenantContext } from '../../../db/types';

describe('SalaryStructureService', () => {
  let service: SalaryStructureService;
  let mockContext: TenantContext;

  beforeEach(() => {
    service = new SalaryStructureService();
    mockContext = {
      organizationId: 1,
      userId: 1,
      sessionUuid: 'test-session'
    };
  });

  describe('createStructure', () => {
    it('should create a new salary structure', async () => {
      const structure = await service.createStructure(mockContext, {
        structureName: 'Senior Manager',
        structureCode: 'SM-001',
        effectiveFrom: '2026-01-01'
      });

      expect(structure).toBeDefined();
      expect(structure.structure_name).toBe('Senior Manager');
      expect(structure.structure_code).toBe('SM-001');
      expect(structure.status).toBe('active');
    });

    it('should throw error if code already exists', async () => {
      await service.createStructure(mockContext, {
        structureName: 'Senior Manager',
        structureCode: 'SM-001',
        effectiveFrom: '2026-01-01'
      });

      expect(async () => {
        await service.createStructure(mockContext, {
          structureName: 'Another Structure',
          structureCode: 'SM-001',
          effectiveFrom: '2026-01-01'
        });
      }).rejects.toThrow();
    });
  });

  describe('assignStructureToEmployee', () => {
    it('should assign structure to employee', async () => {
      const structure = await service.createStructure(mockContext, {
        structureName: 'Senior Manager',
        structureCode: 'SM-001',
        effectiveFrom: '2026-01-01'
      });

      const assignment = await service.assignStructureToEmployee(mockContext, {
        employeeId: 1,
        structureId: structure.id,
        effectiveFrom: '2026-01-01'
      });

      expect(assignment).toBeDefined();
      expect(assignment.employee_id).toBe(1);
      expect(assignment.salary_structure_id).toBe(structure.id);
      expect(assignment.is_current).toBe(true);
    });
  });

  describe('getEmployeeSalaryStructure', () => {
    it('should retrieve current salary structure for employee', async () => {
      const structure = await service.createStructure(mockContext, {
        structureName: 'Senior Manager',
        structureCode: 'SM-001',
        effectiveFrom: '2026-01-01'
      });

      await service.assignStructureToEmployee(mockContext, {
        employeeId: 1,
        structureId: structure.id,
        effectiveFrom: '2026-01-01'
      });

      const current = await service.getEmployeeSalaryStructure(mockContext, 1, '2026-06-15');
      expect(current).toBeDefined();
      expect(current?.salary_structure_id).toBe(structure.id);
    });
  });

  describe('listStructures', () => {
    it('should list all active structures', async () => {
      await service.createStructure(mockContext, {
        structureName: 'Senior Manager',
        structureCode: 'SM-001',
        effectiveFrom: '2026-01-01'
      });

      const structures = await service.listStructures(mockContext);
      expect(Array.isArray(structures)).toBe(true);
      expect(structures.length).toBeGreaterThan(0);
    });
  });

  describe('calculateCTC', () => {
    it('should calculate total CTC from structure components', async () => {
      const structure = await service.createStructure(mockContext, {
        structureName: 'Senior Manager',
        structureCode: 'SM-001',
        effectiveFrom: '2026-01-01'
      });

      const ctc = await service.calculateCTC(mockContext, structure.id);
      expect(typeof ctc).toBe('number');
      expect(ctc).toBeGreaterThanOrEqual(0);
    });
  });

  describe('addComponentToStructure', () => {
    it('should add component to structure', async () => {
      const structure = await service.createStructure(mockContext, {
        structureName: 'Senior Manager',
        structureCode: 'SM-001',
        effectiveFrom: '2026-01-01'
      });

      const component = await service.addComponentToStructure(mockContext, structure.id, 1, 0);
      expect(component).toBeDefined();
      expect(component.structure_id).toBe(structure.id);
      expect(component.component_id).toBe(1);
    });
  });

  describe('getStructureComponents', () => {
    it('should retrieve all components in a structure', async () => {
      const structure = await service.createStructure(mockContext, {
        structureName: 'Senior Manager',
        structureCode: 'SM-001',
        effectiveFrom: '2026-01-01'
      });

      await service.addComponentToStructure(mockContext, structure.id, 1, 0);

      const components = await service.getStructureComponents(mockContext, structure.id);
      expect(Array.isArray(components)).toBe(true);
    });
  });
});
