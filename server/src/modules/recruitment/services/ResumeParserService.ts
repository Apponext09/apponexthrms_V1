import { CandidateRepository } from '../repositories/CandidateRepository';
import {
  CandidateSkillRepository,
  CandidateEducationRepository,
  CandidateExperienceRepository,
} from '../repositories/CandidateProfileRepository';
import { CandidateResumeRepository } from '../repositories/CandidateDocumentRepository';
import { NotFoundError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';
import { v4 as uuidv4 } from 'uuid';

export interface ParsedResume {
  name: string;
  email: string;
  phone: string | null;
  skills: Array<{ name: string; proficiency?: string }>;
  experience: Array<{
    company: string;
    jobTitle: string;
    duration?: string;
    description?: string;
  }>;
  education: Array<{
    degree: string;
    fieldOfStudy: string;
    institution: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
  }>;
  currentCTC: number | null;
  expectedCTC: number | null;
  noticePeriod: number | null;
  extractedText?: string;
  yearsOfExperience?: number;
}

export class ResumeParserService {
  private candidateRepo: CandidateRepository;
  private resumeRepo: CandidateResumeRepository;
  private skillRepo: CandidateSkillRepository;
  private educationRepo: CandidateEducationRepository;
  private experienceRepo: CandidateExperienceRepository;

  constructor() {
    this.candidateRepo = new CandidateRepository();
    this.resumeRepo = new CandidateResumeRepository();
    this.skillRepo = new CandidateSkillRepository();
    this.educationRepo = new CandidateEducationRepository();
    this.experienceRepo = new CandidateExperienceRepository();
  }

  /**
   * Extract text from PDF, DOCX, DOC, or TXT buffer
   */
  async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    if (!buffer || buffer.length === 0) {
      return 'Empty resume content uploaded.';
    }

    // 1. Try DOCX extraction (Word XML via adm-zip)
    try {
      const AdmZipModule = await import('adm-zip');
      const AdmZip = AdmZipModule.default || AdmZipModule;
      const zip = new AdmZip(buffer);
      const docXmlEntry = zip.getEntry('word/document.xml');
      if (docXmlEntry) {
        const xmlText = docXmlEntry.getData().toString('utf-8');
        const cleanText = xmlText
          .replace(/<w:p[^>]*>/g, '\n')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();

        if (cleanText.length > 10 && !cleanText.startsWith('PK')) {
          return cleanText;
        }
      }
    } catch {
      // Buffer is not a DOCX zip archive
    }

    // 2. Try PDF extraction (via pdf-parse)
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const parsed = await pdfParse(buffer);
      if (parsed && parsed.text && parsed.text.trim().length > 10) {
        return parsed.text.trim();
      }
    } catch (err: any) {
      console.warn('[ResumeParserService] pdf-parse direct extraction warning:', err.message);
    }

    // 3. Fallback text extraction for raw text, RTF (ensuring it is NOT binary zip data)
    try {
      const rawStr = buffer.toString('utf-8');
      if (!rawStr.startsWith('PK') && !rawStr.includes('word/_rels')) {
        const cleanText = rawStr
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (cleanText.length > 10) {
          return cleanText;
        }
      }
    } catch {}

    return 'Resume content uploaded.';
  }

  /**
   * Parse resume buffer to structured details
   */
  async parseResumeBuffer(buffer: Buffer, originalFilename?: string): Promise<ParsedResume> {
    const text = await this.extractTextFromBuffer(buffer);
    
    // Extract Email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const validFallbackEmail = `candidate_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}@example.com`;
    const email = (emailMatch && emailMatch[0]) ? emailMatch[0].toLowerCase() : validFallbackEmail;

    // Extract Phone
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : null;

    // Extract Candidate Name heuristic
    let name = '';
    if (originalFilename) {
      const cleanBase = originalFilename
        .replace(/\.[^/.]+$/, '')
        .replace(/(?:^|[_-\s])(?:python|java|php|developer|engineer|fullstack|backend|frontend|resume|cv|doc|docx|pdf)(?=[_-\s]|$)/gi, ' ')
        .replace(/[_-\s]+/g, ' ')
        .trim();
      if (cleanBase.length >= 2) {
        name = cleanBase;
      }
    }
    if (!name) {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      for (const line of lines.slice(0, 5)) {
        if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(line) && line.length < 40 && !line.includes('@')) {
          name = line;
          break;
        }
      }
    }
    if (!name || name.trim().length < 2) {
      name = originalFilename ? originalFilename.replace(/\.[^/.]+$/, '').replace(/[_-\s]+/g, ' ').trim() : 'Candidate Applicant';
    }
    if (!name || name.trim().length < 2) {
      name = 'Candidate Applicant';
    }

    // Extract Experience (years) heuristic
    let yearsOfExperience = 0;
    const expMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:exp|experience)/i);
    if (expMatch) {
      yearsOfExperience = parseInt(expMatch[1], 10);
    }

    // Common technical & professional skills dictionary
    const knownSkillsDict = [
      'React', 'React.js', 'ReactJS', 'Node.js', 'NodeJS', 'TypeScript', 'JavaScript', 'Python', 'Java',
      'C++', 'C#', '.NET', 'PHP', 'Laravel', 'Express.js', 'Vue.js', 'Angular', 'HTML', 'CSS', 'Tailwind',
      'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
      'Git', 'CI/CD', 'REST API', 'GraphQL', 'Microservices', 'System Design', 'Agile', 'Scrum',
      'Project Management', 'Jira', 'Figma', 'UI/UX', 'Excel', 'Communication', 'Problem Solving',
      'Machine Learning', 'Data Analysis', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Spring Boot'
    ];

    const foundSkills: string[] = [];
    for (const skill of knownSkillsDict) {
      // Escape ALL regex special chars: . + * ? ^ $ { } [ ] | ( ) \ etc.
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      try {
        const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
        if (regex.test(text)) {
          foundSkills.push(skill);
        }
      } catch {
        // If regex still fails, fall back to simple string includes check
        if (text.toLowerCase().includes(skill.toLowerCase())) {
          foundSkills.push(skill);
        }
      }
    }

    return {
      name,
      email: email || `candidate_${Date.now()}@example.com`,
      phone,
      skills: foundSkills.map(s => ({ name: s, proficiency: 'Intermediate' })),
      experience: [],
      education: [],
      certifications: [],
      currentCTC: null,
      expectedCTC: null,
      noticePeriod: null,
      extractedText: text,
      yearsOfExperience,
    };
  }

  async parseResume(ctx: TenantContext, fileUrl: string): Promise<ParsedResume> {
    return {
      name: 'Parsed Name',
      email: 'parsed@example.com',
      phone: null,
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      currentCTC: null,
      expectedCTC: null,
      noticePeriod: null,
    };
  }

  async generateCandidateSummary(ctx: TenantContext, candidateId: number): Promise<string> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const experience = await this.experienceRepo.getByCandidate(ctx, candidateId, { pageSize: 10000 });
    const skills = await this.skillRepo.getByCandidate(ctx, candidateId, { pageSize: 10000 });

    let summary = `${candidate.first_name} ${candidate.last_name} is a professional with ${candidate.years_of_experience || 0} years of experience`;

    if (candidate.current_company) {
      summary += `, currently working at ${candidate.current_company}`;
    }
    summary += '.';

    if (skills.items.length > 0) {
      const skillNames = skills.items.map((s) => s.skill_name).join(', ');
      summary += ` Key skills include: ${skillNames}.`;
    }

    if (experience.items.length > 0) {
      const mostRecent = experience.items[0];
      summary += ` Most recently worked as ${mostRecent.job_title} at ${mostRecent.company_name}.`;
    }

    return summary;
  }

  async generateSkillMatrix(ctx: TenantContext, candidateId: number): Promise<any> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const skills = await this.skillRepo.getByCandidate(ctx, candidateId, { pageSize: 10000 });

    return {
      candidateId,
      totalSkills: skills.items.length,
      expertSkills: skills.items.filter((s) => s.proficiency_level === 'expert').length,
      intermediateSkills: skills.items.filter((s) => s.proficiency_level === 'intermediate').length,
      beginnerSkills: skills.items.filter((s) => s.proficiency_level === 'beginner').length,
      skills: skills.items,
    };
  }

  async calculateCandidateScore(ctx: TenantContext, candidateId: number, jobId: number): Promise<number> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    let score = 50;
    if (candidate.years_of_experience) {
      score += Math.min(candidate.years_of_experience * 5, 20);
    }

    const skills = await this.skillRepo.getByCandidate(ctx, candidateId);
    score += Math.min(skills.items.length * 2, 15);

    const education = await this.educationRepo.getByCandidate(ctx, candidateId);
    if (education.items.length > 0) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  async generateFitmentAnalysis(ctx: TenantContext, candidateId: number, jobId: number): Promise<any> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const score = await this.calculateCandidateScore(ctx, candidateId, jobId);
    const summary = await this.generateCandidateSummary(ctx, candidateId);
    const skillMatrix = await this.generateSkillMatrix(ctx, candidateId);

    let recommendation = 'poor_match';
    if (score >= 80) {
      recommendation = 'strong_match';
    } else if (score >= 60) {
      recommendation = 'good_match';
    } else if (score >= 40) {
      recommendation = 'fair_match';
    }

    return {
      candidateId,
      jobId,
      overallScore: score,
      recommendation,
      summary,
      skillMatching: skillMatrix,
      analysisDate: new Date().toISOString(),
    };
  }

  async storeParsedResume(
    ctx: TenantContext,
    candidateId: number,
    fileUrl: string,
    extractedText: string,
    fileSizeKb: number
  ): Promise<any> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const existing = await this.resumeRepo.getByCandidate(ctx, candidateId, { pageSize: 1 });
    const nextVersion = existing.items.length > 0 ? existing.items[0].resume_version + 1 : 1;
    const isPrimary = nextVersion === 1;

    const resume = await this.resumeRepo.create(ctx, {
      uuid: uuidv4(),
      candidate_id: candidateId,
      resume_file_url: fileUrl,
      resume_version: nextVersion,
      is_primary: isPrimary,
      file_size_kb: fileSizeKb,
      extracted_text: extractedText,
    } as any);

    return resume;
  }
}
