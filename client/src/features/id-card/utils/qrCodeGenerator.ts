import QRCode from 'qrcode';

export type QRErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

/**
 * Generate high-definition, 100% standard-compliant QR Code Data URL (PNG)
 * Decodes reliably on any smartphone camera (iOS, Android, Google Lens)
 */
export async function generateQRCodeDataUrl(
  payload: string,
  options: {
    width?: number;
    margin?: number;
    ecLevel?: QRErrorCorrectionLevel;
    fgColor?: string;
    bgColor?: string;
  } = {}
): Promise<string> {
  const {
    width = 256,
    margin = 1,
    ecLevel = 'M',
    fgColor = '#0b1e36',
    bgColor = '#ffffff',
  } = options;

  const validPayload = (payload && payload.trim()) || 'https://www.kosqu.com';

  try {
    const dataUrl = await QRCode.toDataURL(validPayload, {
      width,
      margin,
      errorCorrectionLevel: ecLevel,
      color: {
        dark: fgColor,
        light: bgColor,
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR code data URL:', err);
    return '';
  }
}

/**
 * Generate standard SVG string using official qrcode library
 */
export async function generateQRCodeSvg(
  payload: string,
  options: {
    margin?: number;
    ecLevel?: QRErrorCorrectionLevel;
    fgColor?: string;
    bgColor?: string;
  } = {}
): Promise<string> {
  const {
    margin = 1,
    ecLevel = 'M',
    fgColor = '#0b1e36',
    bgColor = '#ffffff',
  } = options;

  const validPayload = (payload && payload.trim()) || 'https://www.kosqu.com';

  try {
    const svg = await QRCode.toString(validPayload, {
      type: 'svg',
      margin,
      errorCorrectionLevel: ecLevel,
      color: {
        dark: fgColor,
        light: bgColor,
      },
    });
    return svg;
  } catch (err) {
    console.error('Error generating QR code SVG:', err);
    return '';
  }
}

/**
 * Build dynamic QR payload for employees
 */
export function buildDynamicQRPayload(
  type: 'vcard' | 'verification-url' | 'employee-id' | 'json-profile' | 'custom-url' | string,
  data: {
    empName?: string;
    empCode?: string;
    designation?: string;
    department?: string;
    workEmail?: string;
    emergencyPhone?: string;
    companyWebsite?: string;
    customUrlTemplate?: string;
    verificationBaseUrl?: string;
  }
): string {
  const {
    empName = 'Employee',
    empCode = '',
    designation = '',
    department = '',
    workEmail = '',
    emergencyPhone = '',
    companyWebsite = '',
    customUrlTemplate = '',
    verificationBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://portal.kosqu.com',
  } = data;

  const nameParts = empName.split(' ');
  const firstName = nameParts[0] || 'Employee';
  const lastName = nameParts.slice(1).join(' ') || '';

  switch (type) {
    case 'vcard':
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${lastName};${firstName};;;`,
        `FN:${empName}`,
        `ORG:Kosqu Technolab;${department}`,
        `TITLE:${designation}`,
        `EMAIL;type=INTERNET,WORK:${workEmail}`,
        `TEL;type=CELL:${emergencyPhone}`,
        `URL:${companyWebsite}`,
        `NOTE:Employee Code: ${empCode}`,
        'END:VCARD',
      ].join('\n');

    case 'verification-url':
      return `${verificationBaseUrl}/verify/id-card/${empCode}`;

    case 'employee-id':
      return empCode;

    case 'json-profile':
      return JSON.stringify({
        name: empName,
        id: empCode,
        designation,
        department,
        email: workEmail,
        contact: emergencyPhone,
        verified: true,
      });

    case 'custom-url':
      if (customUrlTemplate) {
        return customUrlTemplate
          .replace(/{{employeeCode}}/g, empCode)
          .replace(/{{empCode}}/g, empCode)
          .replace(/{{firstName}}/g, firstName)
          .replace(/{{lastName}}/g, lastName)
          .replace(/{{designation}}/g, encodeURIComponent(designation))
          .replace(/{{department}}/g, encodeURIComponent(department));
      }
      return `${verificationBaseUrl}/verify/id-card/${empCode}`;

    default:
      return `${verificationBaseUrl}/verify/id-card/${empCode}`;
  }
}
