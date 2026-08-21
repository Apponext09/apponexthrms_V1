import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiATSResult {
  matchedSkills: string[];
  missingSkills: string[];
  skillScore: number;       // 0-60
  experienceScore: number;  // 0-25
  profileScore: number;     // 0-15
  overallScore: number;     // 0-100
  recommendation: 'Strong Match' | 'Good Match' | 'Fair Match' | 'Weak Match';
  aiSummary: string;        // Brief AI reasoning
}

/**
 * Gemini AI-powered ATS scoring service.
 * Uses Google Gemini API to semantically analyze resume text against Job Description
 * for intelligent skill matching, context-aware scoring, and natural language understanding.
 */
export class GeminiATSService {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName = 'gemini-2.0-flash';

  private getClient(): GoogleGenerativeAI {
    if (!this.genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in .env file. Please add it to use AI-powered ATS matching.');
      }
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    return this.genAI;
  }

  /**
   * Score a single candidate's resume against a Job Description using Gemini AI.
   * Returns structured scoring data with matched/missing skills and AI reasoning.
   */
  async scoreCandidate(
    jobDescriptionHtml: string,
    jobTitle: string,
    resumeText: string,
    candidateSkills: string,
    candidateExperience: number,
    candidateQualification: string
  ): Promise<GeminiATSResult> {
    const client = this.getClient();
    
    const modelsToTry = [
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
      'gemini-3.6-flash',
      'gemini-2.5-flash-lite'
    ];

    // Strip HTML tags from JD for cleaner prompt
    const cleanJd = (jobDescriptionHtml || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Combine all candidate data
    const candidateProfile = [
      resumeText ? `Resume Content:\n${resumeText.substring(0, 3000)}` : '',
      candidateSkills ? `Profile Skills: ${candidateSkills}` : '',
      candidateExperience ? `Years of Experience: ${candidateExperience}` : '',
      candidateQualification ? `Qualification: ${candidateQualification}` : '',
    ].filter(Boolean).join('\n\n');

    const prompt = `You are an expert ATS (Applicant Tracking System) resume analyzer. Analyze the following candidate's resume and profile against the given Job Description.

## Job Title: ${jobTitle}

## Job Description:
${cleanJd.substring(0, 3000) || jobTitle}

## Candidate Profile:
${candidateProfile || 'No resume or profile data available.'}

## Your Task:
1. Extract ALL required and preferred skills/technologies from the Job Description.
2. Check which of those skills are present in the candidate's resume/profile (use semantic matching — e.g., "Web Development" implies HTML/CSS/JS, "REST services" matches "REST API").
3. Score the candidate on a 0-100 scale using this breakdown:
   - Skill Match (0-60): Based on % of JD skills found in resume
   - Experience (0-25): Based on relevance and years of experience
   - Profile Completeness (0-15): Based on qualification, certifications, projects mentioned

## IMPORTANT: Respond ONLY with valid JSON (no markdown code fences, no explanation). Use exactly this format:
{
  "matchedSkills": ["SKILL1", "SKILL2"],
  "missingSkills": ["SKILL3", "SKILL4"],
  "skillScore": 45,
  "experienceScore": 20,
  "profileScore": 10,
  "overallScore": 75,
  "recommendation": "Good Match",
  "aiSummary": "Brief 1-2 sentence reasoning for the score"
}

Rules for recommendation field:
- "Strong Match" if overallScore >= 80
- "Good Match" if overallScore >= 60
- "Fair Match" if overallScore >= 40
- "Weak Match" if overallScore < 40

All skill names must be UPPERCASE. Return valid JSON only.`;

    let lastError = 'No models responded';

    for (const modelName of modelsToTry) {
      try {
        const model = client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // Parse AI response — strip any markdown code fences if present
        const cleanResponse = responseText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const parsed = JSON.parse(cleanResponse);

        // Validate and normalize the response
        return {
          matchedSkills: Array.isArray(parsed.matchedSkills)
            ? parsed.matchedSkills.map((s: any) => String(s).toUpperCase())
            : [],
          missingSkills: Array.isArray(parsed.missingSkills)
            ? parsed.missingSkills.map((s: any) => String(s).toUpperCase())
            : [],
          skillScore: Math.min(60, Math.max(0, Number(parsed.skillScore) || 0)),
          experienceScore: Math.min(25, Math.max(0, Number(parsed.experienceScore) || 0)),
          profileScore: Math.min(15, Math.max(0, Number(parsed.profileScore) || 0)),
          overallScore: Math.min(100, Math.max(0, Number(parsed.overallScore) || 0)),
          recommendation: this.normalizeRecommendation(parsed.recommendation, Number(parsed.overallScore) || 0),
          aiSummary: String(parsed.aiSummary || 'AI analysis completed.'),
        };
      } catch (error: any) {
        lastError = error.message;
        console.warn(`[GeminiATSService] Model ${modelName} failed, trying next... Error: ${error.message}`);
      }
    }

    console.error('[GeminiATSService] All Gemini models failed:', lastError);

    // Return a fallback result so the system doesn't crash
    return {
      matchedSkills: [],
      missingSkills: [],
      skillScore: 0,
      experienceScore: 0,
      profileScore: 0,
      overallScore: 0,
      recommendation: 'Weak Match',
      aiSummary: `AI scoring failed: ${lastError}`,
    };
  }

  /**
   * Batch score ALL candidates against a Job Description in 1 single-pass API call.
   * Eliminates rate-limits and reduces 10 API calls into 1 fast API call.
   */
  async scoreAllCandidatesBatch(
    jobDescriptionHtml: string,
    jobTitle: string,
    candidates: Array<{
      id: number;
      name: string;
      resumeText: string;
      candidateSkills: string;
      candidateExperience: number;
      candidateQualification: string;
    }>,
    targetSkills?: string[]
  ): Promise<Map<number, GeminiATSResult>> {
    const resultMap = new Map<number, GeminiATSResult>();
    if (!candidates || candidates.length === 0) return resultMap;

    const client = this.getClient();
    const modelsToTry = [
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
      'gemini-3.6-flash',
      'gemini-2.5-flash-lite'
    ];

    const cleanJd = (jobDescriptionHtml || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const targetSkillsFormatted = targetSkills && targetSkills.length > 0
      ? targetSkills.map(s => String(s).toUpperCase()).join(', ')
      : '';

    // Process candidates in chunks of 15 max per API call
    const chunkSize = 15;
    for (let i = 0; i < candidates.length; i += chunkSize) {
      const chunk = candidates.slice(i, i + chunkSize);

      const prompt = `You are an expert ATS (Applicant Tracking System) resume analyzer. Analyze ALL the following candidates against the given Job Description in a SINGLE PASS.

## Job Title: ${jobTitle}

## Job Description:
${cleanJd.substring(0, 3000) || jobTitle}

${targetSkillsFormatted ? `## Target Required & Manual Skills to Match (${targetSkills.length} skills):\n${targetSkillsFormatted}\n` : ''}

## Candidates List (${chunk.length} candidates):
${chunk.map(c => `
--- CANDIDATE ID: ${c.id} ---
Name: ${c.name}
Experience: ${c.candidateExperience} Years
Qualification: ${c.candidateQualification || 'N/A'}
Skills: ${c.candidateSkills || 'N/A'}
Resume Content: ${(c.resumeText || 'No resume text').substring(0, 1500)}
`).join('\n')}

## Your Task:
For EVERY candidate in the list above:
1. Evaluate against the Target Required Skills${targetSkillsFormatted ? ` (${targetSkillsFormatted})` : ' extracted from the Job Description'}.
2. Check matchedSkills and missingSkills for that candidate (use semantic matching).
3. Score on a 0-100 scale: skillScore (0-60), experienceScore (0-25), profileScore (0-15), overallScore (0-100).
4. Assign recommendation: "Strong Match" (>=80), "Good Match" (>=60), "Fair Match" (>=40), "Weak Match" (<40).

## IMPORTANT: Respond ONLY with a valid JSON array of objects (no markdown fences, no explanation).
Format:
[
  {
    "id": 1,
    "matchedSkills": ["PHP", "MYSQL", "HTML", "CSS", "JAVASCRIPT"],
    "missingSkills": ["BOOTSTRAP", "LARAVEL"],
    "skillScore": 45,
    "experienceScore": 20,
    "profileScore": 10,
    "overallScore": 75,
    "recommendation": "Good Match",
    "aiSummary": "Brief reasoning for candidate"
  }
]

All skill names must be UPPERCASE. Return valid JSON array for all ${chunk.length} candidates.`;

      let chunkSuccess = false;
      for (const modelName of modelsToTry) {
        try {
          const model = client.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const responseText = result.response.text().trim();

          const cleanResponse = responseText
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

          const parsedList = JSON.parse(cleanResponse);

          if (Array.isArray(parsedList)) {
            for (const item of parsedList) {
              const cId = Number(item.id);
              if (cId) {
                resultMap.set(cId, {
                  matchedSkills: Array.isArray(item.matchedSkills) ? item.matchedSkills.map((s: any) => String(s).toUpperCase()) : [],
                  missingSkills: Array.isArray(item.missingSkills) ? item.missingSkills.map((s: any) => String(s).toUpperCase()) : [],
                  skillScore: Math.min(60, Math.max(0, Number(item.skillScore) || 0)),
                  experienceScore: Math.min(25, Math.max(0, Number(item.experienceScore) || 0)),
                  profileScore: Math.min(15, Math.max(0, Number(item.profileScore) || 0)),
                  overallScore: Math.min(100, Math.max(0, Number(item.overallScore) || 0)),
                  recommendation: this.normalizeRecommendation(item.recommendation, Number(item.overallScore) || 0),
                  aiSummary: String(item.aiSummary || 'AI analysis completed.'),
                });
              }
            }
            chunkSuccess = true;
            break;
          }
        } catch (e: any) {
          console.warn(`[GeminiATSService] Chunk batch model ${modelName} failed: ${e.message}`);
        }
      }

      if (!chunkSuccess) {
        console.error('[GeminiATSService] Single-pass batch failed for chunk, falling back to individual calls...');
        for (const c of chunk) {
          const res = await this.scoreCandidate(
            jobDescriptionHtml,
            jobTitle,
            c.resumeText,
            c.candidateSkills,
            c.candidateExperience,
            c.candidateQualification
          );
          resultMap.set(c.id, res);
          await new Promise(r => setTimeout(r, 600));
        }
      }
    }

    return resultMap;
  }

  /**
   * Batch score multiple candidates against a JD.
   * Processes sequentially to respect API rate limits.
   */
  async scoreCandidatesBatch(
    jobDescriptionHtml: string,
    jobTitle: string,
    candidates: Array<{
      resumeText: string;
      candidateSkills: string;
      candidateExperience: number;
      candidateQualification: string;
    }>
  ): Promise<GeminiATSResult[]> {
    const results: GeminiATSResult[] = [];

    for (const candidate of candidates) {
      const result = await this.scoreCandidate(
        jobDescriptionHtml,
        jobTitle,
        candidate.resumeText,
        candidate.candidateSkills,
        candidate.candidateExperience,
        candidate.candidateQualification
      );
      results.push(result);

      // Small delay between API calls to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    return results;
  }

  private normalizeRecommendation(
    raw: string | undefined,
    score: number
  ): 'Strong Match' | 'Good Match' | 'Fair Match' | 'Weak Match' {
    const valid = ['Strong Match', 'Good Match', 'Fair Match', 'Weak Match'];
    if (raw && valid.includes(raw)) return raw as any;
    if (score >= 80) return 'Strong Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Weak Match';
  }
}
