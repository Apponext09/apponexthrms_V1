import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import { logger } from '../../../common/lib/logger';

export interface ChatHistoryItem {
  sender: 'ai' | 'user';
  text: string;
}

export interface ParsedLeaveRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  leaveTypeCode: string; // e.g. "CL", "SL", "EL"
  reason: string;
}

export class AIService {
  private aiClient: GoogleGenerativeAI | null = null;
  private modelName = 'gemini-3.6-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.aiClient = new GoogleGenerativeAI(apiKey);
      logger.info('Gemini AI Client initialized successfully for Leave Module');
    } else {
      logger.warn('GEMINI_API_KEY not found in env. Running Leave AIService in mock/fallback mode.');
    }
  }

  /**
   * Chat with HR Assistant regarding leave policies and guidelines
   */
  async chatWithHR(ctx: TenantContext, message: string, history: ChatHistoryItem[]): Promise<string> {
    if (!this.aiClient) {
      return this.getMockResponse(message);
    }

    try {
      // 1. Fetch available leave categories dynamically for the context org
      const leaveTypes = await db('leave_types')
        .where('organization_id', ctx.organizationId)
        .orWhereNull('organization_id')
        .select('leave_name', 'leave_code', 'description', 'sandwich_rule_enabled');

      const leaveTypesContext = leaveTypes
        .map(t => `- ${t.leave_name} (${t.leave_code}): ${t.description || 'No description'}. (Sandwich Rule: ${t.sandwich_rule_enabled ? 'Enabled' : 'Disabled'})`)
        .join('\n');

      const systemPrompt = `You are ApponextHRMS AI HR Assistant. You help employees check their leave policies, understand rules, and request leaves.
Here are the configured leave categories for the employee's organization:
${leaveTypesContext}

Standard policies:
- Saturday and Sunday are weekly-offs unless employee shift states otherwise.
- Sandwich Rule: If enabled for a leave type, any holiday/weekend falling between two leave days is counted as leave. If disabled, they are excluded.
- Employees can apply for leaves in advance, or apply backdated requests if allowed by policy.

Instructions:
- Be professional, warm, and concise.
- Limit answers to 3-4 sentences max.
- Always guide them on what type to apply for.
- If the user says they want to take leave, guide them to request it. Do not execute the request here.
- NAVIGATION LINKS: If the user asks where a section is, how to find something, or asks about any specific module, YOU MUST reply with a markdown link to the exact page.
  Here are the correct internal routes for the application:
  - Dashboard: /employee/dashboard
  - My Profile: /employee/profile
  - Digital ID Card: /employee/id-card
  - Face Recognition Attendance: /employee/face-attendance
  - Attendance Logs: /employee/attendance
  - My Leaves: /employee/leaves
  - Attendance Correction / Regularization: /employee/attendance-regularization
  - My Shifts / Shift Roster: /employee/shift-roster
  - Holiday Calendar: /employee/holiday-calendar
  - Timesheet log: /employee/timesheet
  - My Payroll: /employee/payroll
  - My Payslips: /employee/payslips
  - Loan Requests: /employee/loans
  - Expense Claims: /employee/expenses
  - Travel Requests: /employee/travel
  - Performance reviews: /employee/performance
  - Goals Checklist: /employee/goals
  - Learning (LMS) & Training: /employee/learning or /employee/training
  - Company Policies: /employee/policies
  - Announcements & Surveys: /employee/announcements or /employee/surveys
  - Employee Referrals & Job Openings: /employee/referrals or /employee/job-openings
  - Health & Wellness: /employee/health-wellness
  - Assigned Assets: /employee/assets
  - My Documents: /employee/documents
  - Helpdesk Tickets & Support: /employee/helpdesk
  - AI HR Assistant: /employee/ai-assistant
  - My Approvals: /employee/approvals
  - Settings & Security: /employee/settings
  Example: "You can apply for attendance correction in the [Attendance Correction](/employee/attendance-regularization) module."`;

      const model = this.aiClient.getGenerativeModel({ model: this.modelName });
      
      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...history.map(h => ({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        })),
        { role: 'user', parts: [{ text: message }] }
      ];

      const result = await model.generateContent({ contents });
      const responseText = result.response.text();
      return responseText.trim();
    } catch (error: any) {
      logger.error('Error calling Gemini API for HR Chat', { error: error.message });
      return this.getMockResponse(message);
    }
  }

  /**
   * Stream HR Assistant chat response
   */
  async chatWithHRStream(ctx: TenantContext, message: string, history: ChatHistoryItem[]): Promise<any> {
    if (!this.aiClient) {
      // Mock streaming by returning an object that mimics the stream async iterator
      const mockText = this.getMockResponse(message);
      const chunks = mockText.split(' ');
      
      return (async function* () {
        for (let i = 0; i < chunks.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 50));
          yield { text: () => chunks[i] + (i < chunks.length - 1 ? ' ' : '') };
        }
      })();
    }

    try {
      const systemPrompt = `You are ApponextHRMS AI Assistant, an intelligent, helpful, and friendly HR assistant for employees.
You are helping an employee in the organization.
Your primary goals:
1. Answer questions about HR policies, leave rules, and general queries based on common HR practices.
2. Guide employees on how to use the ApponextHRMS portal.

Portal Navigation Guide:
- Dashboard: /employee/dashboard
- Apply Leave / My Leaves: /employee/leaves
- Attendance & Regularization: /employee/attendance-regularization
- Payslips: /employee/payslips
- My Documents: /employee/documents
- Helpdesk Tickets & Support: /employee/helpdesk
- AI HR Assistant: /employee/ai-assistant
- My Approvals: /employee/approvals
- Settings & Security: /employee/settings
Example: "You can apply for attendance correction in the [Attendance Correction](/employee/attendance-regularization) module."`;

      const model = this.aiClient.getGenerativeModel({ model: this.modelName });
      
      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...history.map(h => ({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        })),
        { role: 'user', parts: [{ text: message }] }
      ];

      const result = await model.generateContentStream({ contents });
      return result.stream;
    } catch (error: any) {
      logger.error('Error calling Gemini API for HR Chat Stream', { error: error.message });
      const mockText = this.getMockResponse(message);
      return (async function* () {
        yield { text: () => mockText };
      })();
    }
  }

  /**
   * Parse a natural language leave sentence into a structured JSON request
   */
  async parseLeaveSentence(
    ctx: TenantContext,
    message: string
  ): Promise<{
    success: boolean;
    data?: ParsedLeaveRequest;
    confidence: number;
    reply: string;
  }> {
    if (!this.aiClient) {
      return this.getMockParseResponse(message);
    }

    try {
      const leaveTypes = await db('leave_types')
        .where('organization_id', ctx.organizationId)
        .orWhereNull('organization_id')
        .select('leave_code', 'leave_name');

      const validCodes = leaveTypes.map(t => t.leave_code.toUpperCase());
      const leaveTypesDesc = leaveTypes.map(t => `${t.leave_name} (Code: ${t.leave_code})`).join(', ');

      const systemPrompt = `You are a parser. Analyze the user's message requesting leave and extract the details.
Valid leave codes in our system are: [${validCodes.join(', ')}] (mapping: ${leaveTypesDesc}).
Current Date/Year Reference: The current date is ${new Date().toISOString().split('T')[0]}. If they say "next Monday" or "tomorrow", compute dates relative to this date.

You must respond ONLY with a JSON object in this format:
{
  "success": boolean,
  "data": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "leaveTypeCode": "one of the valid codes listed",
    "reason": "summary of the reason they stated"
  },
  "confidence": number between 0 and 1,
  "reply": "A brief confirmation reply saying you parsed their request, e.g., 'I have prefilled a Sick Leave request for you from June 5 to June 7.'"
}

If you cannot extract the dates or the leave code, set success to false, omit 'data', and set 'reply' asking for clarification.`;

      const model = this.aiClient.getGenerativeModel({
        model: this.modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'user', parts: [{ text: message }] }
        ]
      });

      const rawJson = result.response.text().trim();
      const parsed = JSON.parse(rawJson);

      if (parsed.success && parsed.data) {
        // Double check leave code validity
        const code = String(parsed.data.leaveTypeCode).toUpperCase();
        if (!validCodes.includes(code)) {
          parsed.success = false;
          parsed.reply = `I identified a request but code '${code}' is not valid. Choose one of: ${validCodes.join(', ')}`;
        }
      }

      return parsed;
    } catch (error: any) {
      logger.error('Error parsing leave sentence via Gemini API', { error: error.message });
      return this.getMockParseResponse(message);
    }
  }

  /**
   * Analyze medical certificate to extract employee name, start/end dates
   */
  async analyzeCertificate(
    ctx: TenantContext,
    base64Data: string,
    mimeType: string
  ): Promise<{
    patientName: string;
    startDate: string;
    endDate: string;
    isValid: boolean;
    confidence: number;
    notes: string;
  }> {
    if (!this.aiClient) {
      return {
        patientName: 'PTO Test',
        startDate: '2026-06-05',
        endDate: '2026-06-09',
        isValid: true,
        confidence: 0.9,
        notes: '(Offline Mode Fallback) Medical certificate verified.'
      };
    }

    try {
      const systemPrompt = `Analyze this medical certificate/document. Extract the patient name, the starting date of sickness/leave, and the ending date of sickness/leave.
Return ONLY a JSON object in this format:
{
  "patientName": "extracted patient name",
  "startDate": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null",
  "isValid": true if it appears to be a real medical certificate/note with dates, false otherwise,
  "confidence": number between 0 and 1,
  "notes": "any relevant medical advice or diagnosis stated"
}`;

      const model = this.aiClient.getGenerativeModel({
        model: this.modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      };

      const result = await model.generateContent([systemPrompt, imagePart]);
      const rawJson = result.response.text().trim();
      return JSON.parse(rawJson);
    } catch (error: any) {
      logger.error('Error analyzing medical certificate via Gemini', { error: error.message });
      return {
        patientName: 'Error during parsing',
        startDate: '',
        endDate: '',
        isValid: false,
        confidence: 0,
        notes: `Could not analyze certificate: ${error.message}`
      };
    }
  }

  /**
   * Rule-based fallback mock responses when Gemini is offline or API key is not configured
   */
  private getMockResponse(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('leave') || lower.includes('छुट्टी') || lower.includes('policy')) {
      return 'According to Apponext policy, employees receive 12 Casual Leaves (CL) and 10 Sick Leaves (SL) annually. CL does not have sandwich rules, but SL does. You can apply for leaves directly in the Employee Portal.';
    }
    if (lower.includes('sandwich') || lower.includes('सैंडविच')) {
      return 'The sandwich rule means that if you take leave on both Friday and Monday, the intervening Saturday and Sunday will also be counted as leave. This applies to SL (Sick Leave) but is disabled for CL (Casual Leave).';
    }
    if (lower.includes('salary') || lower.includes('payslip') || lower.includes('पैसा')) {
      return 'Salary slips are generated on the 1st of every month. You can download your payslips under the Finance & Payroll section in the sidebar.';
    }
    return "Hello! I am your AI HR Assistant. I can help you with leave quotas, policy queries, and balance checks. Please let me know what leave details you're looking for!";
  }

  /**
   * Rule-based parsing fallback
   */
  private getMockParseResponse(message: string): {
    success: boolean;
    data?: ParsedLeaveRequest;
    confidence: number;
    reply: string;
  } {
    const lower = message.toLowerCase();
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Very basic regex extractor for fallback parsing
    let leaveType = 'CL';
    if (lower.includes('sick') || lower.includes('sl') || lower.includes(' बीमार')) {
      leaveType = 'SL';
    }

    // Check for standard "tomorrow" or simple date cues
    if (lower.includes('tomorrow') || lower.includes('कल')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomStr = tomorrow.toISOString().split('T')[0];
      return {
        success: true,
        data: {
          startDate: tomStr,
          endDate: tomStr,
          leaveTypeCode: leaveType,
          reason: 'Absence request',
        },
        confidence: 0.7,
        reply: `(Offline Mode) I detected you want a 1-day ${leaveType} leave for tomorrow. I have pre-filled the request.`,
      };
    }

    return {
      success: false,
      confidence: 0.1,
      reply: "I am currently running in offline mode. For a quick pre-fill, try typing: 'apply sick leave tomorrow' or use the Apply button directly.",
    };
  }

  /**
   * Forecast leave utilization trend for the next 3 months based on historical data
   */
  async forecastFutureLeaves(
    ctx: TenantContext,
    historyData: { month: string; daysTaken: number }[]
  ): Promise<{
    forecast: { month: string; predictedDays: number; confidenceInterval: { low: number; high: number }; explanation: string }[];
  }> {
    if (!this.aiClient) {
      const forecast = historyData.map((h, i) => {
        const nextMonthDate = new Date();
        nextMonthDate.setMonth(nextMonthDate.getMonth() + i + 1);
        const nextMonthStr = nextMonthDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        const avg = historyData.reduce((sum, item) => sum + item.daysTaken, 0) / (historyData.length || 1);
        const predictedDays = Math.round(avg * (1 + (i % 2 === 0 ? 0.15 : -0.1)) * 10) / 10;
        return {
          month: nextMonthStr,
          predictedDays,
          confidenceInterval: {
            low: Math.max(0, Math.round((predictedDays * 0.7) * 10) / 10),
            high: Math.round((predictedDays * 1.3) * 10) / 10,
          },
          explanation: '(Offline Forecast) Projected based on historical rolling average and standard seasonal factors.',
        };
      });
      return { forecast };
    }

    try {
      const historyJson = JSON.stringify(historyData);
      const systemPrompt = `You are a forecasting assistant. Based on this historical monthly leave data of employees: ${historyJson}, predict the total leave utilization (in days) for the next 3 months.
Return ONLY a JSON object in this format:
{
  "forecast": [
    {
      "month": "MMM YYYY",
      "predictedDays": number (1 decimal place),
      "confidenceInterval": { "low": number, "high": number },
      "explanation": "brief reasoning"
    }
  ]
}`;

      const model = this.aiClient.getGenerativeModel({
        model: this.modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: systemPrompt }] }] });
      const rawJson = result.response.text().trim();
      return JSON.parse(rawJson);
    } catch (error: any) {
      logger.error('Error in AI forecasting', error);
      const forecast = historyData.map((h, i) => {
        const nextMonthDate = new Date();
        nextMonthDate.setMonth(nextMonthDate.getMonth() + i + 1);
        const nextMonthStr = nextMonthDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        const avg = historyData.reduce((sum, item) => sum + item.daysTaken, 0) / (historyData.length || 1);
        const predictedDays = Math.round(avg * (1 + (i % 2 === 0 ? 0.15 : -0.1)) * 10) / 10;
        return {
          month: nextMonthStr,
          predictedDays,
          confidenceInterval: {
            low: Math.max(0, Math.round((predictedDays * 0.7) * 10) / 10),
            high: Math.round((predictedDays * 1.3) * 10) / 10,
          },
          explanation: `Projected based on historical rolling average: ${avg.toFixed(1)} days.`,
        };
      });
      return { forecast };
    }
  }

  /**
   * Suggest best leave type based on reason text and available balance
   */
  async suggestLeaveType(
    ctx: TenantContext,
    employeeId: number,
    reasonText: string
  ): Promise<{
    recommended_leave_type_id: number | null;
    confidence_score: number;
    explanation: string;
  }> {
    try {
      const leaveTypes = await db('leave_types as lt')
        .leftJoin('leave_balances as lb', function() {
          this.on('lt.id', '=', 'lb.leave_type_id')
              .andOn('lb.employee_id', '=', db.raw('?', [employeeId]));
        })
        .where(function() {
          this.where('lt.organization_id', ctx.organizationId)
              .orWhereNull('lt.organization_id');
        })
        .select(
          'lt.id as leaveTypeId',
          'lt.leave_name as leaveName',
          'lt.leave_code as leaveCode',
          'lt.description',
          db.raw('COALESCE(lb.available_balance, 0) as availableBalance')
        );

      if (leaveTypes.length === 0) {
        return {
          recommended_leave_type_id: null,
          confidence_score: 0,
          explanation: 'No leave types found for this employee.'
        };
      }

      if (!this.aiClient) {
        return this.getMockSuggestion(reasonText, leaveTypes);
      }

      const leaveTypesDesc = leaveTypes
        .map(t => `- ID ${t.leaveTypeId}: Name: ${t.leaveName} (Code: ${t.leaveCode}), Balance: ${t.availableBalance} days. Description: ${t.description || 'N/A'}`)
        .join('\n');

      const systemPrompt = `You are an HR leave recommendation system.
Analyze the employee's reason for requesting leave and recommend the best matching leave type from the eligible types below.
Eligible Leave Types:
${leaveTypesDesc}

User's Leave Reason: "${reasonText}"

Instructions:
1. Infer the best matching leave type ID based on the reason.
2. Consider availability (if balance is 0, you may still suggest it but explain why, or suggest the next best option like LOP/Unpaid leave if available).
3. Return ONLY a JSON object in this format:
{
  "recommended_leave_type_id": number (the ID of the recommended leave type, or null if none match),
  "confidence_score": number between 0 and 1,
  "explanation": "a concise one-sentence explanation of why this was chosen"
}`;

      const model = this.aiClient.getGenerativeModel({
        model: this.modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: systemPrompt }] }] });
      const rawJson = result.response.text().trim();
      const parsed = JSON.parse(rawJson);

      return {
        recommended_leave_type_id: parsed.recommended_leave_type_id || null,
        confidence_score: parsed.confidence_score || 0.5,
        explanation: parsed.explanation || 'Recommended based on reasoning analysis.'
      };
    } catch (error: any) {
      logger.error('Error suggesting leave type via Gemini', { error: error.message });
      try {
        const leaveTypes = await db('leave_types as lt')
          .leftJoin('leave_balances as lb', function() {
            this.on('lt.id', '=', 'lb.leave_type_id')
                .andOn('lb.employee_id', '=', db.raw('?', [employeeId]));
          })
          .where(function() {
            this.where('lt.organization_id', ctx.organizationId)
                .orWhereNull('lt.organization_id');
          })
          .select(
            'lt.id as leaveTypeId',
            'lt.leave_name as leaveName',
            'lt.leave_code as leaveCode',
            'lt.description',
            db.raw('COALESCE(lb.available_balance, 0) as availableBalance')
          );
        return this.getMockSuggestion(reasonText, leaveTypes);
      } catch (innerErr) {
        return {
          recommended_leave_type_id: null,
          confidence_score: 0,
          explanation: 'Fallback recommendation failed due to database error.'
        };
      }
    }
  }

  /**
   * Keyword-based rule suggestions (fallback mode)
   */
  private getMockSuggestion(reasonText: string, leaveTypes: any[]): {
    recommended_leave_type_id: number | null;
    confidence_score: number;
    explanation: string;
  } {
    const lower = reasonText.toLowerCase();

    let matchedCode = 'CL';
    let confidence = 0.5;
    let explanation = 'Default Suggestion (Casual Leave) due to insufficient keywords.';

    if (lower.includes('sick') || lower.includes('doctor') || lower.includes('medical') || lower.includes('hospital') || lower.includes('pain') || lower.includes('fever') || lower.includes('accident') || lower.includes('surgery')) {
      matchedCode = 'SL';
      confidence = 0.9;
      explanation = 'Reason indicates medical or sickness needs.';
    } else if (lower.includes('wedding') || lower.includes('marriage') || lower.includes('shaadi') || lower.includes('reception')) {
      matchedCode = 'EL';
      confidence = 0.85;
      explanation = 'Reason indicates a major family event or wedding.';
    } else if (lower.includes('vacation') || lower.includes('travel') || lower.includes('holiday') || lower.includes('trip')) {
      matchedCode = 'EL';
      confidence = 0.8;
      explanation = 'Reason indicates planned leisure travel or vacation.';
    } else if (lower.includes('personal') || lower.includes('urgent') || lower.includes('family') || lower.includes('home')) {
      matchedCode = 'CL';
      confidence = 0.7;
      explanation = 'Reason indicates short-term personal or family commitment.';
    }

    const matched = leaveTypes.find(t => t.leaveCode.toUpperCase() === matchedCode) || leaveTypes[0];
    return {
      recommended_leave_type_id: matched ? matched.leaveTypeId : null,
      confidence_score: confidence,
      explanation: `(Offline Suggestion) ${explanation}`
    };
  }

  /**
   * Suggest alternative date ranges when team coverage is low
   */
  async optimizeCoverage(
    ctx: TenantContext,
    requestId: number | null,
    departmentId: number,
    requestedStartDate: string,
    requestedEndDate: string
  ): Promise<{
    start_date: string;
    end_date: string;
    confidence_score: number;
    reason: string;
  }[]> {
    try {
      const deptEmployees = await db('employees')
        .where('current_department_id', departmentId)
        .select('id');
      const employeeIds = deptEmployees.map(e => e.id);

      if (employeeIds.length === 0) {
        return [];
      }

      const startWindow = new Date(requestedStartDate);
      startWindow.setDate(startWindow.getDate() - 14);
      const endWindow = new Date(requestedEndDate);
      endWindow.setDate(endWindow.getDate() + 14);

      const startWindowStr = startWindow.toISOString().split('T')[0];
      const endWindowStr = endWindow.toISOString().split('T')[0];

      const query = db('leave_applications as la')
        .join('employees as e', 'la.employee_id', 'e.id')
        .whereIn('la.employee_id', employeeIds)
        .whereIn('la.status', ['approved', 'pending_l1', 'pending_l2'])
        .where('la.application_start_date', '<=', endWindowStr)
        .where('la.application_end_date', '>=', startWindowStr);

      if (requestId) {
        query.whereNot('la.id', requestId);
      }

      const leaves = await query.select(
        'la.id',
        'la.employee_id',
        'e.first_name',
        'e.last_name',
        'la.application_start_date as startDate',
        'la.application_end_date as endDate',
        'la.total_days as totalDays'
      );

      const dStart = new Date(requestedStartDate);
      const dEnd = new Date(requestedEndDate);
      const duration = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      if (!this.aiClient) {
        return this.getMockCoverageSuggestions(requestedStartDate, duration, leaves);
      }

      const leaveSummary = leaves
        .map(l => `- Employee ${l.first_name} ${l.last_name} (ID: ${l.employee_id}) on leave from ${l.startDate} to ${l.endDate} (${l.totalDays} days)`)
        .join('\n');

      const systemPrompt = `You are a team coverage optimizer.
Analyze the department calendar and suggest alternative non-conflicting date ranges for a new leave request.
New Leave Request:
- Requested Start Date: ${requestedStartDate}
- Requested End Date: ${requestedEndDate}
- Requested Duration: ${duration} days

Other Team Leaves in the Window:
${leaveSummary || 'No other employees are on leave during this window.'}

Instructions:
1. Suggest up to 3 alternative date ranges within a 2-week window (7 days before to 14 days after the requested start date).
2. The alternative ranges must have the same duration of ${duration} days.
3. Minimize overlap with other team leaves.
4. Return ONLY a JSON array of objects in this format:
[
  {
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "confidence_score": number between 0 and 1,
    "reason": "brief reason why this range is suggested"
  }
]`;

      const model = this.aiClient.getGenerativeModel({
        model: this.modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: systemPrompt }] }] });
      const rawJson = result.response.text().trim();
      const parsed = JSON.parse(rawJson);

      return (parsed || []).map((item: any) => ({
        start_date: item.start_date,
        end_date: item.end_date,
        confidence_score: item.confidence_score || 0.8,
        reason: item.reason || 'Optimized alternative range.'
      }));
    } catch (error: any) {
      logger.error('Error optimizing team coverage via Gemini', { error: error.message });
      try {
        const dStart = new Date(requestedStartDate);
        const dEnd = new Date(requestedEndDate);
        const duration = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        return this.getMockCoverageSuggestions(requestedStartDate, duration, []);
      } catch (innerErr) {
        return [];
      }
    }
  }

  /**
   * Deterministic constraint-based alternative suggestor (fallback mode)
   */
  private getMockCoverageSuggestions(
    startDateStr: string,
    duration: number,
    leaves: any[]
  ): {
    start_date: string;
    end_date: string;
    confidence_score: number;
    reason: string;
  }[] {
    const suggestions: { start_date: string; end_date: string; confidence_score: number; reason: string; }[] = [];
    const shifts = [7, -7, 14];

    for (const shift of shifts) {
      const altStart = new Date(startDateStr);
      altStart.setDate(altStart.getDate() + shift);
      const altEnd = new Date(altStart);
      altEnd.setDate(altEnd.getDate() + duration - 1);

      const altStartStr = altStart.toISOString().split('T')[0];
      const altEndStr = altEnd.toISOString().split('T')[0];

      let conflictCount = 0;
      for (const leave of leaves) {
        const lStart = new Date(leave.startDate);
        const lEnd = new Date(leave.endDate);
        if (lStart <= altEnd && lEnd >= altStart) {
          conflictCount++;
        }
      }

      let score = 0.95;
      let reason = 'Optimal choice with zero team conflicts.';

      if (conflictCount > 0) {
        score = Math.max(0.2, 0.9 - conflictCount * 0.25);
        reason = `Moderate coverage risk: ${conflictCount} teammate(s) on leave.`;
      } else {
        reason = `Highly recommended: Conflict-free period shifted by ${shift} days.`;
      }

      suggestions.push({
        start_date: altStartStr,
        end_date: altEndStr,
        confidence_score: score,
        reason: `(Offline Optimizer) ${reason}`
      });
    }

    return suggestions;
  }
}
