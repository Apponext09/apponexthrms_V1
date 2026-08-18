import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import * as xlsx from 'xlsx';
import mammoth from 'mammoth';
import AdmZip from 'adm-zip';

export interface ParsedCandidateEntry {
  name: string;
  email: string;
  contact?: string;
  gender?: string;
  dob?: string;
  maritalStatus?: string;
  company?: string;
  qualification?: string;
  university?: string;
  totalExp?: string;
  relevantExp?: string;
  skills?: string;
  position?: string;
  country?: string;
  state?: string;
  city?: string;
  source?: string;
  rawText?: string;
  resumeUrl?: string;
  fileName?: string;
}

const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'React.js', 'Node.js', 'Node', 'Express', 'Express.js',
  'Next.js', 'Vue.js', 'Angular', 'HTML', 'HTML5', 'CSS', 'CSS3', 'Tailwind', 'Tailwind CSS',
  'Python', 'Django', 'Flask', 'FastAPI', 'Java', 'Spring', 'Spring Boot', 'C++', 'C#', '.NET',
  'PHP', 'Laravel', 'Ruby', 'Rails', 'Go', 'Golang', 'Rust', 'SQL', 'MySQL', 'PostgreSQL',
  'MongoDB', 'Redis', 'Oracle', 'SQLite', 'AWS', 'Amazon Web Services', 'Azure', 'Google Cloud', 'GCP',
  'Docker', 'Kubernetes', 'CI/CD', 'Jenkins', 'GitHub Actions', 'Git', 'Linux', 'REST API',
  'GraphQL', 'Microservices', 'Agile', 'Scrum', 'Jira', 'Figma', 'UI/UX', 'Power BI', 'Tableau',
  'Excel', 'Machine Learning', 'Deep Learning', 'Data Science', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch',
  'DevOps', 'QA', 'Selenium', 'Cypress', 'Playwright', 'Jest', 'Mocha', 'Postman', 'Communication',
  'Leadership', 'Problem Solving', 'Team Management', 'Project Management'
];

/**
 * Extract clean text and candidate fields from raw resume text
 */
export function extractCandidateFromText(rawText: string, fileName: string): ParsedCandidateEntry {
  const cleanText = rawText.replace(/\r\n/g, '\n').trim();
  const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 1. Email extraction
  const emailMatch = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  const email = emailMatch ? emailMatch[0].toLowerCase().trim() : '';

  // 2. Phone / Contact extraction
  const phoneMatch = cleanText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b[6-9]\d{9}\b|\b\d{10}\b/);
  const contact = phoneMatch ? phoneMatch[0].trim() : '';

  // 3. Name extraction
  let name = '';
  // Try clean filename first if it looks like a person's name (e.g. "John_Doe_Resume.pdf" -> "John Doe")
  const cleanBaseName = path.basename(fileName, path.extname(fileName))
    .replace(/[_\-.]/g, ' ')
    .replace(/\b(resume|cv|biodata|profile|updated|final|latest|draft|202[0-9])\b/gi, '')
    .trim();
  
  if (cleanBaseName.length >= 3 && cleanBaseName.length <= 40 && !/\d{4}/.test(cleanBaseName)) {
    name = cleanBaseName.split(' ')
      .filter(w => w.length > 0)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  // If filename wasn't conclusive, check first 5 non-empty lines
  if (!name || name.length < 2) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      // Skip if contains email, phone, url, or common resume header keywords
      if (
        !line.includes('@') && 
        !/\d{5,}/.test(line) && 
        !/http|www|github|linkedin|curriculum|resume|biodata|profile/i.test(line) &&
        line.length >= 3 && 
        line.length <= 50 &&
        /^[a-zA-Z\s.'-]+$/.test(line)
      ) {
        name = line.split(' ')
          .filter(w => w.length > 0)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        break;
      }
    }
  }

  if (!name) {
    name = email ? email.split('@')[0].replace(/[._-]/g, ' ').toUpperCase() : 'Candidate';
  }

  // 4. Skills extraction
  const foundSkills: string[] = [];
  for (const skill of COMMON_SKILLS) {
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(cleanText)) {
      foundSkills.push(skill);
    }
  }
  const skills = foundSkills.length > 0 ? foundSkills.slice(0, 15).join(', ') : undefined;

  // 5. Total Experience extraction
  let totalExp: string | undefined;
  const expMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s+of)?\s+experience/i)
    || cleanText.match(/experience\s*:\s*(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)/i);
  if (expMatch) {
    totalExp = `${expMatch[1]} Years`;
  }

  // 6. Qualification extraction
  let qualification: string | undefined;
  const eduMatch = cleanText.match(/\b(B\.?E|B\.?Tech|M\.?Tech|BCA|MCA|B\.?Sc|M\.?Sc|BBA|MBA|B\.?Com|Bachelor of [a-zA-Z\s]+|Master of [a-zA-Z\s]+|Diploma in [a-zA-Z\s]+|Ph\.?D)\b/i);
  if (eduMatch) {
    qualification = eduMatch[0].trim();
  }

  // 7. Position Title extraction
  let position: string | undefined;
  const titleMatch = cleanText.match(/(?:role|designation|title|position)\s*:\s*([a-zA-Z\s]+)/i)
    || cleanText.match(/\b(Software Engineer|Full Stack Developer|Frontend Developer|Backend Developer|DevOps Engineer|QA Engineer|Data Analyst|Data Scientist|Product Manager|HR Executive|Accountant)\b/i);
  if (titleMatch) {
    position = titleMatch[1].trim();
  }

  return {
    name,
    email: email || `${name.toLowerCase().replace(/\s+/g, '.') || 'candidate'}@example.com`,
    contact: contact || undefined,
    gender: 'Male',
    skills: skills || undefined,
    totalExp: totalExp || undefined,
    qualification: qualification || undefined,
    position: position || undefined,
    source: 'Resume Upload',
    rawText: cleanText.substring(0, 4000),
    fileName,
  };
}

/**
 * Parse any supported resume file (PDF, DOCX, DOC, XLSX, XLS, CSV, TXT, ZIP)
 */
export async function parseUploadedFiles(
  files: Array<{ path: string; originalname: string; mimetype?: string }>
): Promise<ParsedCandidateEntry[]> {
  const results: ParsedCandidateEntry[] = [];

  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    const filePath = file.path;

    try {
      if (ext === '.xlsx' || ext === '.xls') {
        // Parse Excel spreadsheet
        const workbook = xlsx.readFile(filePath);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        for (const row of rows) {
          const entry: ParsedCandidateEntry = {
            name: String(row.Name || row.name || row['Candidate Name'] || '').trim(),
            email: String(row.Email || row.email || row['Email ID'] || row['Email Id'] || '').trim(),
            contact: String(row.Contact || row.contact || row.Phone || row.phone || row['Contact Number'] || '').trim() || undefined,
            gender: String(row.Gender || row.gender || 'Male').trim(),
            dob: String(row.DOB || row.dob || row['Date of Birth'] || '').trim() || undefined,
            maritalStatus: String(row['Marital Status'] || row.maritalStatus || '').trim() || undefined,
            company: String(row.Company || row.company || row['Current Company'] || '').trim() || undefined,
            qualification: String(row.Qualification || row.qualification || '').trim() || undefined,
            university: String(row.University || row.university || '').trim() || undefined,
            totalExp: String(row['Total Experience'] || row.totalExp || row.experience || '').trim() || undefined,
            relevantExp: String(row['Relevant Experience'] || row.relevantExp || '').trim() || undefined,
            skills: String(row.Skills || row.skills || '').trim() || undefined,
            position: String(row.Position || row.position || '').trim() || undefined,
            country: String(row.Country || row.country || '').trim() || undefined,
            state: String(row.State || row.state || '').trim() || undefined,
            city: String(row.City || row.city || '').trim() || undefined,
            source: 'Excel Import',
            fileName: file.originalname,
          };

          if (entry.name && entry.email) {
            results.push(entry);
          }
        }
      } else if (ext === '.csv') {
        // Parse CSV spreadsheet
        const csvContent = fs.readFileSync(filePath, 'utf8');
        const workbook = xlsx.read(csvContent, { type: 'string' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        for (const row of rows) {
          const entry: ParsedCandidateEntry = {
            name: String(row.Name || row.name || row['Candidate Name'] || '').trim(),
            email: String(row.Email || row.email || row['Email ID'] || row['Email Id'] || '').trim(),
            contact: String(row.Contact || row.contact || row.Phone || row.phone || row['Contact Number'] || '').trim() || undefined,
            gender: String(row.Gender || row.gender || 'Male').trim(),
            dob: String(row.DOB || row.dob || row['Date of Birth'] || '').trim() || undefined,
            company: String(row.Company || row.company || row['Current Company'] || '').trim() || undefined,
            qualification: String(row.Qualification || row.qualification || '').trim() || undefined,
            university: String(row.University || row.university || '').trim() || undefined,
            totalExp: String(row['Total Experience'] || row.totalExp || row.experience || '').trim() || undefined,
            skills: String(row.Skills || row.skills || '').trim() || undefined,
            position: String(row.Position || row.position || '').trim() || undefined,
            country: String(row.Country || row.country || '').trim() || undefined,
            state: String(row.State || row.state || '').trim() || undefined,
            city: String(row.City || row.city || '').trim() || undefined,
            source: 'CSV Import',
            fileName: file.originalname,
          };

          if (entry.name && entry.email) {
            results.push(entry);
          }
        }
      } else if (ext === '.pdf') {
        // Parse PDF resume
        const fileBuffer = fs.readFileSync(filePath);
        const parsedPdf = await pdfParse(fileBuffer);
        const entry = extractCandidateFromText(parsedPdf.text || '', file.originalname);
        entry.source = 'PDF Resume';
        entry.resumeUrl = `data:application/pdf;base64,${fileBuffer.toString('base64')}`;
        results.push(entry);
      } else if (ext === '.docx') {
        // Parse Word DOCX resume
        const fileBuffer = fs.readFileSync(filePath);
        const parsedDocx = await mammoth.extractRawText({ buffer: fileBuffer });
        const entry = extractCandidateFromText(parsedDocx.value || '', file.originalname);
        entry.source = 'Word Resume';
        entry.resumeUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(parsedDocx.value || '')}`;
        results.push(entry);
      } else if (ext === '.doc' || ext === '.txt' || ext === '.rtf') {
        // Parse plain text / legacy doc
        const rawContent = fs.readFileSync(filePath, 'utf8');
        const entry = extractCandidateFromText(rawContent || '', file.originalname);
        entry.source = 'Document Resume';
        entry.resumeUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(rawContent || '')}`;
        results.push(entry);
      } else if (ext === '.zip') {
        // Unzip and recursively parse all files inside
        const zip = new AdmZip(filePath);
        const zipEntries = zip.getEntries();

        for (const zipEntry of zipEntries) {
          if (!zipEntry.isDirectory) {
            const entryExt = path.extname(zipEntry.entryName).toLowerCase();
            const entryBuffer = zipEntry.getData();

            if (entryExt === '.pdf') {
              const parsedPdf = await pdfParse(entryBuffer);
              const entry = extractCandidateFromText(parsedPdf.text || '', zipEntry.name);
              entry.source = 'ZIP Archive (PDF)';
              entry.resumeUrl = `data:application/pdf;base64,${entryBuffer.toString('base64')}`;
              results.push(entry);
            } else if (entryExt === '.docx') {
              const parsedDocx = await mammoth.extractRawText({ buffer: entryBuffer });
              const entry = extractCandidateFromText(parsedDocx.value || '', zipEntry.name);
              entry.source = 'ZIP Archive (DOCX)';
              entry.resumeUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(parsedDocx.value || '')}`;
              results.push(entry);
            } else if (entryExt === '.txt' || entryExt === '.doc') {
              const text = entryBuffer.toString('utf8');
              const entry = extractCandidateFromText(text, zipEntry.name);
              entry.source = 'ZIP Archive (Doc)';
              entry.resumeUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
              results.push(entry);
            } else if (entryExt === '.xlsx' || entryExt === '.xls' || entryExt === '.csv') {
              const workbook = xlsx.read(entryBuffer, { type: 'buffer' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const rows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

              for (const row of rows) {
                const entry: ParsedCandidateEntry = {
                  name: String(row.Name || row.name || '').trim(),
                  email: String(row.Email || row.email || '').trim(),
                  contact: String(row.Contact || row.contact || row.Phone || '').trim() || undefined,
                  skills: String(row.Skills || row.skills || '').trim() || undefined,
                  position: String(row.Position || row.position || '').trim() || undefined,
                  source: 'ZIP Archive (Spreadsheet)',
                  fileName: zipEntry.name,
                };
                if (entry.name && entry.email) results.push(entry);
              }
            }
          }
        }
      }
    } catch (parseErr: any) {
      console.warn(`[ResumeFileParser] Error parsing ${file.originalname}:`, parseErr.message);
    }
  }

  return results;
}
