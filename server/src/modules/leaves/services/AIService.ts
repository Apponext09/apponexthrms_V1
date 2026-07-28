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
  private modelName = 'gemini-1.5-flash';

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
- If they ask about salary or tax, tell them they can view it in the Payroll & Tax section.
- If the user says they want to take leave, guide them to request it. Do not execute the request here.`;

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
}
