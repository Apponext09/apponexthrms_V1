import { v4 as uuidv4 } from 'uuid';
import { TaxDeclarationRepository } from '../repositories/TaxDeclarationRepository';
import { TaxInvestmentRepository } from '../repositories/TaxInvestmentRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

interface CreateDeclarationInput {
  employeeId: number;
  financialYear: string;
  panNumber?: string;
}

interface AddInvestmentInput {
  declarationId: number;
  investmentType: '80c' | '80d' | '80tta' | 'other';
  investmentAmount: number;
  investmentProofUrl?: string;
}

export class TaxService {
  private declarationRepo: TaxDeclarationRepository;
  private investmentRepo: TaxInvestmentRepository;
  private auditService: AuditService;

  constructor() {
    this.declarationRepo = new TaxDeclarationRepository();
    this.investmentRepo = new TaxInvestmentRepository();
    this.auditService = new AuditService();
  }

  async createDeclaration(ctx: TenantContext, input: CreateDeclarationInput) {
    const existing = await this.declarationRepo.getForFinancialYear(
      ctx,
      input.employeeId,
      input.financialYear
    );

    if (existing) {
      throw new ValidationError(`Declaration already exists for FY ${input.financialYear}`);
    }

    const declaration = await this.declarationRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: input.employeeId,
      financial_year: input.financialYear,
      pan_number: input.panNumber,
      declaration_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      created_by: ctx.userId,
      updated_by: ctx.userId
    });

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'TAX_DECLARATION',
      entityId: declaration.id,
      afterState: { declaration }
    });

    return declaration;
  }

  async addInvestment(ctx: TenantContext, input: AddInvestmentInput) {
    const declaration = await this.declarationRepo.getById(ctx, input.declarationId);
    if (!declaration) throw new NotFoundError('Tax declaration not found');

    const investment = await this.investmentRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      tax_declaration_id: input.declarationId,
      investment_type: input.investmentType,
      investment_amount: input.investmentAmount,
      investment_proof_url: input.investmentProofUrl,
      created_by: ctx.userId,
      updated_by: ctx.userId
    });

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'TAX_INVESTMENT',
      entityId: investment.id,
      afterState: { investment }
    });

    return investment;
  }

  async finalizeDeclaration(ctx: TenantContext, declarationId: number) {
    const declaration = await this.declarationRepo.getById(ctx, declarationId);
    if (!declaration) throw new NotFoundError('Tax declaration not found');

    return this.declarationRepo.update(ctx, declarationId, {
      status: 'finalized',
      updated_by: ctx.userId
    });
  }

  async getDeclaration(ctx: TenantContext, declarationId: number) {
    return this.declarationRepo.getById(ctx, declarationId);
  }

  async getEmployeeDeclarations(ctx: TenantContext, employeeId: number) {
    return this.declarationRepo.getForEmployee(ctx, employeeId);
  }

  async getDeclarationInvestments(ctx: TenantContext, declarationId: number) {
    return this.investmentRepo.getForDeclaration(ctx, declarationId);
  }

  async getTotalInvestments(ctx: TenantContext, declarationId: number): Promise<number> {
    return this.investmentRepo.getTotalInvestments(ctx, declarationId);
  }

  async calculateTDS(
    ctx: TenantContext,
    employeeId: number,
    financialYear: string,
    grossSalaryYtd: number,
    // 🔧 FIX: Support both tax regimes. New regime is default from FY 2023-24 onward.
    taxRegime: 'old' | 'new' = 'new'
  ) {
    const declaration = await this.declarationRepo.getForFinancialYear(ctx, employeeId, financialYear);

    let investmentsClaimed = 0;
    let standardDeduction = 0;
    let slab80C = 0;

    if (taxRegime === 'old') {
      // ─── OLD TAX REGIME ───────────────────────────────────────────────────────
      if (declaration) {
        investmentsClaimed = await this.getTotalInvestments(ctx, declaration.id);
      }
      standardDeduction = 50000; // ₹50,000 standard deduction
      slab80C = Math.min(investmentsClaimed, 150000); // Max ₹1.5L for 80C

      let taxableIncome = grossSalaryYtd - standardDeduction - slab80C;
      taxableIncome = Math.max(0, taxableIncome);

      // Old regime slabs (FY 2024-25)
      let tax = 0;
      if (taxableIncome <= 250000) {
        tax = 0;
      } else if (taxableIncome <= 500000) {
        tax = (taxableIncome - 250000) * 0.05;
      } else if (taxableIncome <= 1000000) {
        tax = 12500 + (taxableIncome - 500000) * 0.2;
      } else {
        tax = 112500 + (taxableIncome - 1000000) * 0.3;
      }

      // Section 87A rebate: ₹12,500 if taxable income ≤ ₹5L (old regime)
      if (taxableIncome <= 500000) {
        tax = Math.max(0, tax - 12500);
      }

      // Health & Education Cess (4%)
      const cess = tax > 0 ? tax * 0.04 : 0;
      tax += cess;

      return {
        regime: 'old',
        grossSalaryYtd,
        standardDeduction,
        investmentsClaimed,
        slab80C,
        taxableIncome,
        totalTaxCalculated: Math.round(tax * 100) / 100
      };
    } else {
      // ─── NEW TAX REGIME (Default from FY 2023-24) ─────────────────────────────
      // No deductions allowed under new regime (80C, HRA etc. not available)
      standardDeduction = 75000; // ₹75,000 standard deduction (Budget 2024)
      let taxableIncome = Math.max(0, grossSalaryYtd - standardDeduction);

      // New regime slabs (FY 2024-25 per Finance Act 2024)
      let tax = 0;
      if (taxableIncome <= 300000) {
        tax = 0;
      } else if (taxableIncome <= 600000) {
        tax = (taxableIncome - 300000) * 0.05;
      } else if (taxableIncome <= 900000) {
        tax = 15000 + (taxableIncome - 600000) * 0.10;
      } else if (taxableIncome <= 1200000) {
        tax = 45000 + (taxableIncome - 900000) * 0.15;
      } else if (taxableIncome <= 1500000) {
        tax = 90000 + (taxableIncome - 1200000) * 0.20;
      } else {
        tax = 150000 + (taxableIncome - 1500000) * 0.30;
      }

      // Section 87A rebate: Full rebate (up to ₹25,000) if taxable income ≤ ₹7L (new regime)
      if (taxableIncome <= 700000) {
        tax = Math.max(0, tax - 25000);
      }

      // Health & Education Cess (4%)
      const cess = tax > 0 ? tax * 0.04 : 0;
      tax += cess;

      return {
        regime: 'new',
        grossSalaryYtd,
        standardDeduction,
        investmentsClaimed: 0,
        slab80C: 0,
        taxableIncome,
        totalTaxCalculated: Math.round(tax * 100) / 100
      };
    }
  }
}

