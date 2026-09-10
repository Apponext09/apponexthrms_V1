import type { TenantContext } from '../../../db/types';
import { getKnex } from '../../../db/knex';
import { v4 as uuidv4 } from 'uuid';

export interface SkillMatchResult {
  matched: string[];
  missing: string[];
  matchPercentage: number;
}

const DEFAULT_SKILL_MASTER: Record<string, { category: string; aliases: string[] }> = {
  'JavaScript': {
    category: 'Frontend / Fullstack',
    aliases: ['js', 'ecmascript', 'es6', 'es2015', 'es2020', 'vanilla js', 'javascript']
  },
  'TypeScript': {
    category: 'Programming Languages',
    aliases: ['ts', 'typescript']
  },
  'Node.js': {
    category: 'Backend',
    aliases: ['nodejs', 'node', 'node.js', 'express', 'express.js', 'expressjs', 'nestjs', 'nest.js']
  },
  'React': {
    category: 'Frontend',
    aliases: ['react', 'reactjs', 'react.js', 'nextjs', 'next.js', 'redux']
  },
  'Vue.js': {
    category: 'Frontend',
    aliases: ['vue', 'vuejs', 'vue.js', 'nuxt', 'nuxtjs']
  },
  'Angular': {
    category: 'Frontend',
    aliases: ['angular', 'angularjs', 'angular.js', 'angular 2+']
  },
  'Python': {
    category: 'Programming Languages',
    aliases: ['python', 'python3', 'py', 'django', 'flask', 'fastapi']
  },
  'Java': {
    category: 'Programming Languages',
    aliases: ['java', 'spring', 'spring boot', 'j2ee', 'hibernate']
  },
  'C# / .NET': {
    category: 'Programming Languages',
    aliases: ['c#', '.net', 'asp.net', 'dotnet', 'dotnet core', 'csharp']
  },
  'PHP': {
    category: 'Backend',
    aliases: ['php', 'laravel', 'symfony', 'codeigniter', 'wordpress']
  },
  'PostgreSQL': {
    category: 'Database',
    aliases: ['postgres', 'postgresql', 'psql', 'postgresql db', 'postgres db']
  },
  'MySQL': {
    category: 'Database',
    aliases: ['mysql', 'mariadb', 'my sql', 'mysql db']
  },
  'MongoDB': {
    category: 'Database',
    aliases: ['mongo', 'mongodb', 'mongoose', 'nosql']
  },
  'Redis': {
    category: 'Database / Caching',
    aliases: ['redis', 'redis cache', 'in-memory db']
  },
  'REST API': {
    category: 'Architecture',
    aliases: ['rest', 'restful', 'rest api', 'rest apis', 'restful api', 'web services']
  },
  'GraphQL': {
    category: 'Architecture',
    aliases: ['graphql', 'apollo', 'relay']
  },
  'Docker': {
    category: 'DevOps / Cloud',
    aliases: ['docker', 'docker container', 'containerization', 'dockerfile', 'docker-compose']
  },
  'Kubernetes': {
    category: 'DevOps / Cloud',
    aliases: ['k8s', 'kubernetes', 'helm']
  },
  'AWS': {
    category: 'Cloud',
    aliases: ['amazon web services', 'aws', 'aws cloud', 'ec2', 's3', 'lambda', 'cloudformation']
  },
  'Azure': {
    category: 'Cloud',
    aliases: ['azure', 'microsoft azure', 'azure devops', 'azure cloud']
  },
  'Git': {
    category: 'Tools',
    aliases: ['git', 'github', 'gitlab', 'bitbucket', 'version control']
  },
  'CI/CD': {
    category: 'DevOps',
    aliases: ['ci/cd', 'github actions', 'jenkins', 'gitlab ci', 'continuous integration']
  },
  'HTML / CSS': {
    category: 'Frontend',
    aliases: ['html', 'html5', 'css', 'css3', 'sass', 'scss', 'tailwind', 'tailwindcss', 'bootstrap']
  },
  'SQL': {
    category: 'Database',
    aliases: ['sql', 'structured query language', 'rdbms', 'relational database']
  },
  'HR Management': {
    category: 'HR / Operations',
    aliases: ['human resources', 'hrms', 'talent acquisition', 'payroll', 'recruitment', 'onboarding', 'hr operations']
  },
  'Sales & Marketing': {
    category: 'Sales / Marketing',
    aliases: ['b2b sales', 'lead generation', 'crm', 'digital marketing', 'seo', 'inbound marketing', 'sales']
  },
  'Accounting & Finance': {
    category: 'Finance',
    aliases: ['tally', 'quickbooks', 'gst', 'taxation', 'financial auditing', 'ledger', 'accounting', 'balance sheet']
  }
};

export class SkillMasterService {
  private cache: Map<string, string> = new Map(); // alias lower-case -> canonical name

  constructor() {
    this.populateStaticCache();
  }

  private populateStaticCache() {
    for (const [canonical, data] of Object.entries(DEFAULT_SKILL_MASTER)) {
      this.cache.set(canonical.toLowerCase(), canonical);
      for (const alias of data.aliases) {
        this.cache.set(alias.toLowerCase().trim(), canonical);
      }
    }
  }

  /**
   * Seed default skills and aliases into database for an organization if empty
   */
  async ensureSkillsSeeded(ctx: TenantContext): Promise<void> {
    try {
      const db = getKnex();
      const existing = await db('skills').where('organization_id', ctx.organizationId).first();
      if (!existing) {
        for (const [name, data] of Object.entries(DEFAULT_SKILL_MASTER)) {
          const [skillId] = await db('skills').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            name,
            category: data.category,
          });

          const aliasRows = data.aliases.map((alias) => ({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            skill_id: skillId,
            alias,
          }));

          if (aliasRows.length > 0) {
            await db('skill_aliases').insert(aliasRows);
          }
        }
      }
    } catch (err) {
      // Non-blocking fallback to in-memory static cache
      console.warn('[SkillMasterService] DB seed notice:', (err as any)?.message);
    }
  }

  /**
   * Normalize any skill text / alias to its canonical skill name.
   * Returns empty string if text is not a valid skill (e.g. sentences or descriptions).
   */
  normalizeSkill(skill: string): string {
    if (!skill) return '';
    const clean = skill.trim().toLowerCase();
    
    // Ignore long sentences, descriptions or irrelevant stopwords
    if (clean.length > 35 || clean.split(/\s+/).length > 3) {
      // If it's a long sentence, check if it matches a known canonical or alias exactly, otherwise skip
      if (this.cache.has(clean)) {
        return this.cache.get(clean)!;
      }
      return '';
    }

    const invalidStopwords = ['depending on', 'reporting to', 'experience level', 'fresher', '0-3 years', 'years of experience', 'job position', 'job description', 'responsibilities', 'qualifications', 'benefits', 'salary'];
    if (invalidStopwords.some(sw => clean.includes(sw))) {
      return '';
    }
    
    // Exact match in cache
    if (this.cache.has(clean)) {
      return this.cache.get(clean)!;
    }

    // Substring / word boundary check for known aliases (alias must be at least 3 chars or exact word)
    for (const [alias, canonical] of this.cache.entries()) {
      if (alias.length >= 3) {
        const regex = new RegExp(`\\b${alias.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
        if (regex.test(clean)) {
          return canonical;
        }
      }
    }

    // If clean is a short valid skill keyword (1-3 words, 2-25 chars)
    if (clean.length >= 2 && clean.length <= 25 && clean.split(/\s+/).length <= 3 && /^[a-zA-Z0-9+#./\s-]+$/.test(clean)) {
      return skill.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    return '';
  }

  /**
   * Extract recognized skills directly from free-form text (Job Descriptions, Resumes, etc.)
   */
  extractSkillsFromText(text: string): string[] {
    if (!text) return [];
    const cleanText = text.replace(/<[^>]*>?/gm, ' ').replace(/\r\n/g, '\n');
    const matchedSkills = new Set<string>();

    // 1. Scan against all known cache aliases & canonical names
    for (const [alias, canonical] of this.cache.entries()) {
      if (alias.length >= 2) {
        const regex = new RegExp(`\\b${alias.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
        if (regex.test(cleanText)) {
          matchedSkills.add(canonical);
        }
      }
    }

    // 2. Scan bullet points or comma lists for concise skills
    const lines = cleanText.split(/[\n,;•·▪]+/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const words = line.split(/\s+/);
      if (words.length <= 3 && line.length >= 2 && line.length <= 25 && !/\d{4}/.test(line)) {
        const norm = this.normalizeSkill(line);
        if (norm) matchedSkills.add(norm);
      }
    }

    return Array.from(matchedSkills);
  }

  /**
   * Normalize an array of skills, de-duplicating canonical matches
   */
  normalizeSkillList(skills: string[] | string | null | undefined): string[] {
    if (!skills) return [];
    const list = Array.isArray(skills) 
      ? skills 
      : String(skills).split(/[,|\n\r;•·]+/).map(s => s.trim()).filter(Boolean);

    const canonicalSet = new Set<string>();
    for (const s of list) {
      if (s) {
        const norm = this.normalizeSkill(s);
        if (norm) {
          canonicalSet.add(norm);
        }
      }
    }
    return Array.from(canonicalSet);
  }

  /**
   * Compare required skills with candidate skills using canonical aliases
   */
  matchSkills(requiredSkills: string[], candidateSkills: string[]): SkillMatchResult {
    const normRequired = this.normalizeSkillList(requiredSkills);
    const normCandidate = this.normalizeSkillList(candidateSkills);

    if (normRequired.length === 0) {
      return {
        matched: normCandidate,
        missing: [],
        matchPercentage: 100,
      };
    }

    const candidateSet = new Set(normCandidate.map(s => s.toLowerCase()));
    const matched: string[] = [];
    const missing: string[] = [];

    for (const req of normRequired) {
      const reqLower = req.toLowerCase();
      let isMatched = candidateSet.has(reqLower);

      if (!isMatched) {
        // Check partial string containment
        for (const cand of normCandidate) {
          const candLower = cand.toLowerCase();
          if (candLower.includes(reqLower) || reqLower.includes(candLower)) {
            isMatched = true;
            break;
          }
        }
      }

      if (isMatched) {
        matched.push(req);
      } else {
        missing.push(req);
      }
    }

    const matchPercentage = Math.round((matched.length / normRequired.length) * 100);

    return {
      matched,
      missing,
      matchPercentage: Math.min(100, Math.max(0, matchPercentage)),
    };
  }

  /**
   * List all skills and their aliases
   */
  async listSkills(ctx: TenantContext): Promise<any[]> {
    const db = getKnex();
    await this.ensureSkillsSeeded(ctx);

    const skills = await db('skills')
      .where('organization_id', ctx.organizationId)
      .orWhereNull('organization_id')
      .orderBy('name', 'asc');

    const aliases = await db('skill_aliases')
      .where('organization_id', ctx.organizationId)
      .orWhereNull('organization_id');

    const aliasMap = new Map<number, string[]>();
    for (const a of aliases) {
      const list = aliasMap.get(a.skill_id) || [];
      list.push(a.alias);
      aliasMap.set(a.skill_id, list);
    }

    return skills.map((s) => ({
      ...s,
      aliases: aliasMap.get(s.id) || [],
    }));
  }
}

export const skillMasterService = new SkillMasterService();
