import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, Camera, Heart, Phone, MapPin, Mail, User, Briefcase, 
  Building2, Calendar, Award, CheckCircle2, QrCode as QrIcon 
} from 'lucide-react';
import type { IdCardConfig, IdCardFieldConfig } from '../types/idCard.types';
import { DEFAULT_ID_CARD_CONFIG } from '../constants/defaultIdCardConfig';
import { generateQRCodeDataUrl, generateQRCodeSvg, buildDynamicQRPayload } from '../utils/qrCodeGenerator';

export interface IdCardRendererProps {
  config: IdCardConfig;
  employeeData?: any;
  personalDetails?: any;
  side?: 'front' | 'back';
  isFlipped?: boolean;
  onFlipToggle?: () => void;
  mode?: 'interactive-3d' | 'flat-2d' | 'print-sheet';
  interactive?: boolean;
  onAvatarClick?: (e: React.MouseEvent) => void;
  onCardClick?: () => void;
  avatarOverride?: string | null;
  scale?: number;
  className?: string;
  frontRef?: React.RefObject<HTMLDivElement>;
  backRef?: React.RefObject<HTMLDivElement>;
}

export const IdCardRenderer: React.FC<IdCardRendererProps> = ({
  config: rawConfig,
  employeeData,
  personalDetails,
  side = 'front',
  isFlipped = false,
  onFlipToggle,
  mode = 'interactive-3d',
  interactive = true,
  onAvatarClick,
  onCardClick,
  avatarOverride,
  scale = 1,
  className = '',
  frontRef,
  backRef,
}) => {
  // 0. Auto-recover and normalize config object
  const config = React.useMemo<IdCardConfig>(() => {
    if (!rawConfig) return DEFAULT_ID_CARD_CONFIG;
    let parsed: any = rawConfig;
    let attempts = 0;
    while (typeof parsed === 'string' && attempts < 10) {
      try {
        const next = JSON.parse(parsed);
        if (next === parsed) break;
        parsed = next;
      } catch (e) {
        break;
      }
      attempts++;
    }
    return (parsed && typeof parsed === 'object' ? parsed : DEFAULT_ID_CARD_CONFIG) as IdCardConfig;
  }, [rawConfig]);

  // 1. Comprehensive Robust Employee Data Resolution
  const rawFirstName = employeeData?.firstName || employeeData?.first_name || '';
  const rawLastName = employeeData?.lastName || employeeData?.last_name || '';
  const combinedName = `${rawFirstName} ${rawLastName}`.trim();
  
  const empName = (
    combinedName ||
    employeeData?.fullName ||
    employeeData?.full_name ||
    employeeData?.name ||
    employeeData?.displayName ||
    employeeData?.display_name ||
    'EMPLOYEE'
  ).toUpperCase();

  const empCode = employeeData?.employeeCode 
    || employeeData?.employee_code 
    || employeeData?.empCode
    || employeeData?.emp_code
    || employeeData?.code
    || (employeeData?.id ? `EMP${String(employeeData.id).padStart(3, '0')}` : '');

  const designation = (
    employeeData?.designation ||
    employeeData?.designationName ||
    employeeData?.designation_name ||
    employeeData?.jobTitle ||
    employeeData?.job_title ||
    employeeData?.role ||
    employeeData?.role_name ||
    'TEAM MEMBER'
  ).toUpperCase();

  const department = (
    employeeData?.department ||
    employeeData?.departmentName ||
    employeeData?.department_name ||
    employeeData?.departmentTitle ||
    employeeData?.dept_name ||
    'OPERATIONS'
  ).toUpperCase();

  const initials = empName
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase() || 'EM';

  const emergencyPhone = personalDetails?.emergencyContactPhone 
    || personalDetails?.emergency_contact_phone 
    || employeeData?.emergencyContactPhone
    || employeeData?.emergency_contact_phone
    || employeeData?.phone
    || employeeData?.mobile
    || config?.theme?.emergencyPhone
    || '+91 98765 43210';

  const companyWebsite = config?.theme?.companyWebsite || 'www.kosqu.com';
  const supportEmail = config?.theme?.supportEmail 
    || employeeData?.workEmail 
    || employeeData?.work_email 
    || employeeData?.email 
    || config?.footer?.hrHelpline 
    || 'info@kosqu.com';

  // Photo resolution: uploaded avatar override > employee profile avatar > Rahul Sharma sample ONLY if explicitly sample
  const defaultSampleAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80';
  const avatar = avatarOverride 
    || employeeData?.avatarUrl 
    || employeeData?.avatar_url 
    || employeeData?.photoUrl
    || employeeData?.photo_url
    || employeeData?.profilePicture
    || employeeData?.profile_picture
    || employeeData?.profileImage
    || employeeData?.profile_image
    || (employeeData?.isSample ? defaultSampleAvatar : null);

  // 2. Resolve Theme & Layout Engine
  const theme = config?.theme || {};
  const borderRadius = theme.borderRadius ?? 20;
  const cardWidth = theme.cardWidth || 320;
  const cardHeight = theme.cardHeight || 490;

  // 3. Stylized KOSQU Corporate Logo & Header
  const renderKosquLogo = (centered = false) => {
    const showLogo = config?.header?.showLogo !== false;
    const customLogoUrl = config?.header?.logoUrl;
    const orgDisplayName = config?.header?.orgName || 'KOSQU';
    const subtitle = config?.header?.subtitle ?? 'TECHNOLOGY • AI • GROWTH';

    return (
      <div className={`flex items-center justify-center gap-2 ${centered ? 'flex-col text-center' : ''}`}>
        {/* Stylized Logo Icon or Custom Uploaded Logo */}
        {showLogo && (
          <div className="flex items-center justify-center shrink-0">
            {customLogoUrl ? (
              <img
                src={customLogoUrl}
                alt="Logo"
                className="h-8 w-auto object-contain max-w-[100px] shrink-0"
              />
            ) : (
              <svg viewBox="0 0 100 80" className="w-8.5 h-7 shrink-0">
                {/* Decorative pixel squares on left of K */}
                <rect x="5" y="34" width="7" height="7" fill="#0284c7" rx="1.5" />
                <rect x="14" y="24" width="7" height="7" fill="#0369a1" rx="1.5" />
                <rect x="14" y="44" width="7" height="7" fill="#ea580c" rx="1.5" />
                {/* Main Blue Vertical Bar */}
                <polygon points="26,10 38,10 38,70 26,70" fill="#1d4ed8" />
                {/* Diagonal Lower Arm */}
                <polygon points="38,45 68,70 54,70 33,52" fill="#1e40af" />
                {/* Diagonal Upper Arrow in Orange */}
                <polygon points="38,38 62,18 50,18 33,32" fill="#f97316" />
                {/* Arrow Head */}
                <polygon points="62,10 78,10 78,26 70,18 57,28 51,22 63,12" fill="#ea580c" />
              </svg>
            )}
          </div>
        )}

        {/* Vertical subtle divider */}
        {showLogo && !centered && <div className="w-[1.5px] h-6.5 bg-slate-300 mx-0.5 shrink-0" />}

        {/* Company Wordmark + Subtitle */}
        <div className="leading-none text-left flex flex-col justify-center">
          <span
            className="font-black text-[18px] tracking-tight font-sans block leading-none"
            style={{ color: config?.header?.orgNameColor || '#0b1e36' }}
          >
            {orgDisplayName}
          </span>
          {subtitle !== '' && (
            <div
              className="flex items-center gap-1 mt-1 text-[6.5px] font-black tracking-wider uppercase leading-none"
              style={{ color: config?.header?.subtitleColor || '#1e293b' }}
            >
              {subtitle.includes('•') ? (
                subtitle.split('•').map((part, i, arr) => (
                  <React.Fragment key={i}>
                    <span>{part.trim()}</span>
                    {i < arr.length - 1 && (
                      <span className={i % 2 === 0 ? 'text-[#ea580c] text-[7px] font-black' : 'text-[#0284c7] text-[7px] font-black'}>•</span>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <span>{subtitle}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 5. Dynamic QR Code Payload & Standard Camera-Scannable Generator
  const qrPayload = React.useMemo(() => {
    const qrObj = config?.qrConfig || config?.qrCode;
    const payloadType = qrObj?.payloadType || 'vcard';
    return buildDynamicQRPayload(payloadType, {
      empName,
      empCode,
      designation,
      department,
      workEmail: employeeData?.workEmail || employeeData?.work_email || supportEmail,
      emergencyPhone,
      companyWebsite,
      customUrlTemplate: qrObj?.customUrlTemplate,
    });
  }, [
    config?.qrConfig,
    config?.qrCode,
    empName,
    empCode,
    designation,
    department,
    employeeData,
    supportEmail,
    emergencyPhone,
    companyWebsite,
  ]);

  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string>('');

  React.useEffect(() => {
    let isMounted = true;
    const qrObj = config?.qrConfig || config?.qrCode;
    generateQRCodeDataUrl(qrPayload, {
      width: 256,
      margin: 1,
      ecLevel: qrObj?.errorCorrection || 'M',
      fgColor: qrObj?.fgColor || qrObj?.foregroundColor || '#0b1e36',
      bgColor: qrObj?.bgColor || qrObj?.backgroundColor || '#ffffff',
    }).then((url) => {
      if (isMounted && url) setQrCodeDataUrl(url);
    });
    return () => {
      isMounted = false;
    };
  }, [qrPayload, config?.qrConfig, config?.qrCode]);

  const renderQrCode = (size = 80) => (
    <div
      className="p-1 bg-white rounded-md shadow-xs border border-slate-200/80 inline-flex items-center justify-center overflow-hidden"
      title={`Scan to verify: ${empName} (${empCode})`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {qrCodeDataUrl ? (
        <img
          src={qrCodeDataUrl}
          alt={`QR Code: ${empName} (${empCode})`}
          className="w-full h-full object-contain block"
        />
      ) : (
        <div className="w-full h-full animate-pulse bg-slate-100 rounded" />
      )}
    </div>
  );

  // 6. Realistic Barcode SVG
  const renderBarcodeSvg = () => {
    const bars = [
      3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1,
      4, 1, 2, 1, 3, 2, 4, 1, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4,
    ];
    return (
      <svg className="w-48 h-8 mx-auto" viewBox="0 0 200 32">
        {bars.map((w, idx) => {
          const x = idx * 4;
          return (
            <rect
              key={idx}
              x={x}
              y="0"
              width={Math.max(1.2, w * 0.72)}
              height="32"
              fill="#0b1e36"
            />
          );
        })}
      </svg>
    );
  };

  // 7. Orange Chevron Ribbon / Arrow Band
  const renderChevronRibbon = () => (
    <div className="w-full relative h-8 my-1 flex items-center shadow-xs">
      <div
        className="absolute inset-0 flex items-center justify-between overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, #ea580c 0%, #f97316 45%, #f97316 80%, #ea580c 100%)',
        }}
      >
        {/* Left chevron arrow cutout/accent */}
        <div className="flex items-center -ml-1">
          <svg className="h-8 w-6 text-white shrink-0 drop-shadow-xs" viewBox="0 0 24 32" fill="currentColor">
            <polygon points="0,0 10,16 0,32 6,32 16,16 6,0" />
          </svg>
        </div>

        {/* Right chevron arrow tip spanning across */}
        <div className="flex items-center -mr-1">
          <svg className="h-8 w-6 text-white shrink-0 drop-shadow-xs" viewBox="0 0 24 32" fill="currentColor">
            <polygon points="4,0 14,16 4,32 10,32 20,16 10,0" />
          </svg>
        </div>
      </div>
    </div>
  );

  // 7. Holographic Iridescent Background & Geometric Pixel Mosaics
  const renderDecorativePixels = (isBack = false, hasHeaderImage = false) => (
    <>
      {/* Crisp White Card Base with Iridescent Diagonal Light Flare */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            'linear-gradient(118deg, #ffffff 0%, #ffffff 25%, rgba(56,189,248,0.18) 40%, rgba(244,114,182,0.14) 52%, rgba(251,191,36,0.18) 62%, #ffffff 80%, #ffffff 100%)',
        }}
      />

      {/* Realistic Soft Radial Holographic Glare */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at 80% 20%, rgba(56,189,248,0.25) 0%, rgba(244,114,182,0.15) 30%, transparent 70%)',
        }}
      />

      {/* FRONT SIDE PIXEL MOSAICS */}
      {!isBack && !hasHeaderImage && (
        <>
          {/* Mid-Left Pixel Column (Next to photo) */}
          <div className="absolute top-28 left-2 pointer-events-none z-0 flex flex-col gap-1.5 opacity-90">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 bg-[#38bdf8] rounded-xs shadow-xs" />
              <div className="w-3 h-3 bg-[#1d4ed8] rounded-xs shadow-xs" />
            </div>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 bg-[#ea580c] rounded-xs shadow-xs" />
              <div className="w-3 h-3 bg-[#fde047] rounded-xs shadow-xs" />
            </div>
            <div className="w-3 h-3 bg-[#94a3b8] rounded-xs ml-1 opacity-70" />
          </div>

          {/* Mid-Right Pixel Column & Facets (Next to photo) */}
          <div className="absolute top-28 right-2 pointer-events-none z-0 flex flex-col items-end gap-1.5 opacity-90">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 bg-[#93c5fd] rounded-xs shadow-xs" />
              <div className="w-3.5 h-3.5 bg-[#38bdf8] rounded-xs shadow-xs" />
            </div>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 bg-[#fbbf24] rounded-xs shadow-xs" />
              <div className="w-3 h-3 bg-[#0284c7] rounded-xs shadow-xs" />
            </div>
            <div className="flex gap-1.5 mr-1">
              <div className="w-2.5 h-2.5 bg-[#cbd5e1] rounded-xs opacity-70" />
              <div className="w-2.5 h-2.5 bg-[#38bdf8] rounded-xs" />
            </div>
          </div>
        </>
      )}

      {/* BACK SIDE PIXEL MOSAIC (Removed for clean back aesthetic) */}
    </>
  );

  // 8. Employee Photo / Portrait Frame
  const renderAvatar = () => {
    const photo = config?.photo || {};
    if (photo.visible === false) return null;

    return (
      <div
        onClick={photo.allowEmployeeUpload && onAvatarClick ? onAvatarClick : undefined}
        className={`relative group overflow-hidden shadow-md flex items-center justify-center rounded-[3px] z-10 ${
          photo.allowEmployeeUpload ? 'cursor-pointer hover:scale-105 transition-transform duration-200' : ''
        }`}
        style={{
          width: '112px',
          height: '112px',
          border: '2.5px solid #0b1e36',
          backgroundColor: '#f8fafc',
        }}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={empName}
            className="w-full h-full object-cover block"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
            <svg className="w-8 h-8 opacity-60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span className="text-[9px] font-bold tracking-tight uppercase">Photo</span>
          </div>
        )}
      </div>
    );
  };

  // 9. FRONT CARD RENDERER
  const renderFrontCard = () => {
    const headerImageSrc = 
      config?.header?.headerImageUrl || 
      config?.header?.bgImageUrl || 
      (config?.header as any)?.bannerImageUrl || 
      (config?.header as any)?.headerBgUrl;
    const hasHeaderImage = !!headerImageSrc;
    const hasBottomImage = !!(config?.footer?.bottomBarcodeImageUrl || config?.footer?.footerImageUrl);

    const cardBgImageUrl = config?.theme?.bgImageUrl;
    const cardBgColor = config?.theme?.solidBgColor || '#ffffff';

    return (
      <div
        ref={frontRef}
        className="w-full h-full p-4 text-slate-900 shadow-2xl flex flex-col justify-between overflow-hidden relative select-none"
        style={{
          borderRadius: `${borderRadius}px`,
          fontFamily: theme.fontFamily || 'Inter, sans-serif',
          border: '1px solid rgba(15, 23, 42, 0.14)',
          backgroundColor: cardBgColor,
        }}
      >
        {/* Custom card background image (from theme settings) */}
        {cardBgImageUrl && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src={cardBgImageUrl}
              alt="Card Background"
              className="w-full h-full object-cover"
              style={{ borderRadius: `${borderRadius}px` }}
            />
          </div>
        )}

        {/* Holographic iridescent background & decorative pixel mosaics */}
        {!cardBgImageUrl && renderDecorativePixels(false, hasHeaderImage)}

        {/* Header: Uploaded Image (Edge-to-Edge) or Stylized KOSQU Logo */}
        {config?.header?.visible !== false && (
          hasHeaderImage ? (
            <div className="relative z-10 -mx-4 -mt-4 w-[calc(100%+2rem)] overflow-hidden shrink-0">
              <img
                src={headerImageSrc}
                alt="Header"
                className="w-full h-auto object-cover block"
              />
            </div>
          ) : (
            <div className="relative z-10 flex items-center justify-center px-3 pt-4 pb-1 mt-1 shrink-0">
              {renderKosquLogo(false)}
            </div>
          )
        )}

        {/* Center: Photo + Employee Name + Designation */}
        <div className="flex flex-col items-center text-center my-auto relative z-10 py-0.5 gap-1.5">
          {renderAvatar()}
          <div className="space-y-0.5 mt-1">
            <h2 className="font-extrabold text-[17px] tracking-wide text-[#0b1e36] uppercase leading-tight font-sans">
              {empName}
            </h2>
            <p className="text-[11px] font-bold text-[#334155] uppercase tracking-wider">
              {designation}
            </p>
          </div>
        </div>

        {/* Orange Chevron Accent Ribbon / Arrow Strip */}
        <div className="relative z-10 -mx-4 w-[calc(100%+2rem)] overflow-hidden shrink-0 my-0.5">
          {theme.ribbonImageUrl ? (
            <img src={theme.ribbonImageUrl} alt="Ribbon" className="w-full h-8 object-cover block" />
          ) : (
            renderChevronRibbon()
          )}
        </div>

        {/* ID Code + High-Contrast Barcode or Dynamic QR Code */}
        {hasBottomImage ? (
          <div className="relative z-10 -mx-4 -mb-4 w-[calc(100%+2rem)] overflow-hidden shrink-0">
            <img
              src={(config?.footer?.bottomBarcodeImageUrl || config?.footer?.footerImageUrl)!}
              alt="Bottom Barcode Strip"
              className="w-full h-auto object-cover block"
            />
          </div>
        ) : (
          <div className="relative z-10 text-center space-y-1 py-1">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold tracking-widest text-[#475569] uppercase">
                ID NO : <span className="font-extrabold text-[#0b1e36]">{empCode}</span>
              </span>
            </div>

            {/* Dynamic Code Placement: Barcode vs QR Code */}
            {theme.barcodeFormat === 'qr' ? (
              <div className="flex justify-center my-0.5">
                {renderQrCode(52)}
              </div>
            ) : (
              renderBarcodeSvg()
            )}
          </div>
        )}

        {/* Footer Tagline */}
        {config?.footer?.visible !== false && (
          <div className="relative z-10 text-center border-t border-slate-200/80 pt-1.5 pb-0.5">
            <div className="flex items-center justify-center gap-1.5 text-[8.5px] font-black tracking-widest text-[#0b1e36] uppercase">
              {config?.footer?.text || config?.theme?.tagline ? (
                <span>{config?.footer?.text || config?.theme?.tagline}</span>
              ) : (
                <>
                  <span>TECHNOLOGY</span>
                  <span className="text-[#ea580c] font-black">•</span>
                  <span>AI</span>
                  <span className="text-[#0284c7] font-black">•</span>
                  <span>GROWTH</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 10. BACK CARD RENDERER
  const renderBackCard = () => {
    const hasBackHeaderImage = !!config?.back?.backHeaderImageUrl;

    const backBgImageUrl = config?.back?.bgImageUrl || config?.theme?.bgImageUrl;
    const backBgColor = config?.theme?.solidBgColor || '#ffffff';
    const orgDisplayName = config?.header?.orgName || 'Company';

    return (
      <div
        ref={backRef}
        className="w-full h-full p-4 text-slate-900 shadow-2xl flex flex-col justify-between overflow-hidden relative select-none text-center"
        style={{
          borderRadius: `${borderRadius}px`,
          fontFamily: theme.fontFamily || 'Inter, sans-serif',
          border: '1px solid rgba(15, 23, 42, 0.14)',
          backgroundColor: backBgColor,
        }}
      >
        {/* Custom card background image */}
        {backBgImageUrl && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src={backBgImageUrl}
              alt="Card Background"
              className="w-full h-full object-cover"
              style={{ borderRadius: `${borderRadius}px` }}
            />
          </div>
        )}

        {/* Holographic iridescent background */}
        {!backBgImageUrl && renderDecorativePixels(true, hasBackHeaderImage)}

        {/* Center Top: Optional Custom Back Header Image or Clean Title */}
        {hasBackHeaderImage ? (
          <div className="relative z-10 -mx-4 -mt-4 w-[calc(100%+2rem)] overflow-hidden shrink-0 mb-1">
            <img
              src={config.back.backHeaderImageUrl!}
              alt="Back Header"
              className="w-full h-auto object-cover block"
            />
          </div>
        ) : config?.back?.headerTitle ? (
          <div className="relative z-10 pt-1 pb-0.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              {config.back.headerTitle}
            </h3>
          </div>
        ) : null}

        {/* Dynamic QR Code Verification on Back */}
        {config?.back?.showQrCode !== false && (
          <div className="relative z-10 flex flex-col items-center justify-center my-auto py-1">
            <div className="p-2.5 bg-white/95 rounded-2xl shadow-sm border border-slate-200/90 inline-flex flex-col items-center justify-center">
              {renderQrCode(88)}
            </div>
            <span className="text-[8.5px] font-black text-slate-600 tracking-widest uppercase mt-1.5">
              Scan to verify credentials
            </span>
          </div>
        )}

        {/* Card Property & Return Info Card */}
        <div className="relative z-10 my-auto space-y-2 px-1 text-center">
          <div className="bg-white/85 dark:bg-slate-900/60 backdrop-blur-xs rounded-xl p-2.5 border border-slate-200/80 shadow-xs space-y-1">
            <p className="text-[9.5px] text-slate-500 font-medium leading-none">
              {config?.back?.disclaimerText || 'This credential is the property of'}
            </p>
            <h4 className="text-[12px] font-extrabold text-slate-900 uppercase tracking-wide">
              {orgDisplayName}
            </h4>
            <p className="text-[9px] text-slate-600 leading-snug">
              {config?.back?.returnAddress || 'If found, please return to Human Resources Department.'}
            </p>
          </div>

          {/* Contact Details Pill Grid */}
          <div className="bg-white/85 dark:bg-slate-900/60 backdrop-blur-xs rounded-xl p-2 border border-slate-200/80 shadow-xs space-y-1 text-[10px]">
            <div className="flex items-center justify-between px-1">
              <span className="font-semibold text-slate-500 text-[9.5px]">Emergency:</span>
              <span className="font-bold text-slate-900 font-mono text-[10.5px]">{emergencyPhone}</span>
            </div>
            <div className="flex items-center justify-between px-1 border-t border-slate-200/50 pt-1">
              <span className="font-semibold text-slate-500 text-[9.5px]">Support:</span>
              <span className="font-medium text-slate-800 text-[9.5px] truncate max-w-[170px]">{supportEmail}</span>
            </div>
            <div className="flex items-center justify-between px-1 border-t border-slate-200/50 pt-1">
              <span className="font-semibold text-slate-500 text-[9.5px]">Portal:</span>
              <span className="font-medium text-slate-800 text-[9.5px] truncate max-w-[170px]">{companyWebsite}</span>
            </div>
          </div>

          {/* Signatory Block if enabled */}
          {config?.back?.showSignatory && (
            <div className="flex flex-col items-center justify-center pt-1">
              {config.back.signatureImageUrl && (
                <img
                  src={config.back.signatureImageUrl}
                  alt="Signature"
                  className="h-8 max-w-[100px] object-contain"
                />
              )}
              <span className="text-[8px] font-bold text-slate-600 uppercase border-t border-slate-300 pt-0.5 mt-0.5">
                {config.back.signatoryTitle || 'Authorized Signatory'}
              </span>
            </div>
          )}

          <p className="text-[8.5px] text-slate-500 font-medium italic">
            {config?.back?.termsAndConditions || 'This card is non-transferable.'}
          </p>
        </div>

        {/* Footer Bar */}
        {config?.footer?.visible !== false && (
          <div className="relative z-10 text-center border-t border-slate-200/80 pt-1.5 pb-0.5">
            <div className="flex items-center justify-center gap-1 text-[8px] font-black tracking-widest text-[#0b1e36] uppercase">
              {config?.footer?.text || config?.theme?.tagline ? (
                <span>{config?.footer?.text || config?.theme?.tagline}</span>
              ) : (
                <span>OFFICIAL DIGITAL ACCESS CREDENTIAL</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 11. Mode Dispatcher

  // MODE: FLAT 2D (Used for high-res exports and individual front/back captures)
  if (mode === 'flat-2d') {
    return (
      <div
        className={`relative ${className}`}
        style={{
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top center',
        }}
      >
        {side === 'front' ? renderFrontCard() : renderBackCard()}
      </div>
    );
  }

  // MODE: PRINT SHEET (Multiple cards formatted for A4/Letter print)
  if (mode === 'print-sheet') {
    const layoutGrid =
      config.print?.layout === '2-up'
        ? 'grid-cols-2'
        : config.print?.layout === '8-up'
        ? 'grid-cols-4'
        : 'grid-cols-2';

    return (
      <div className={`p-8 bg-white text-slate-900 ${className}`}>
        <div className={`grid ${layoutGrid} gap-8 justify-center items-center`}>
          {/* Front */}
          <div className="relative">
            {config.print?.showCutGuides && (
              <div className="absolute -inset-2 border border-dashed border-slate-400 pointer-events-none" />
            )}
            <div style={{ width: `${cardWidth}px`, height: `${cardHeight}px` }}>
              {renderFrontCard()}
            </div>
          </div>

          {/* Back */}
          <div className="relative">
            {config.print?.showCutGuides && (
              <div className="absolute -inset-2 border border-dashed border-slate-400 pointer-events-none" />
            )}
            <div style={{ width: `${cardWidth}px`, height: `${cardHeight}px` }}>
              {renderBackCard()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MODE: INTERACTIVE 3D FLIP CARD
  return (
    <div
      className={`relative select-none ${className}`}
      style={{
        perspective: '1200px',
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
      }}
    >
      <div
        onClick={interactive ? onFlipToggle || onCardClick : undefined}
        className={`w-full h-full relative duration-700 ease-out transition-transform ${
          interactive ? 'cursor-pointer' : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT FACE */}
        <div
          className="absolute inset-0 w-full h-full shadow-2xl rounded-2xl"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {renderFrontCard()}
        </div>

        {/* BACK FACE */}
        <div
          className="absolute inset-0 w-full h-full shadow-2xl rounded-2xl"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {renderBackCard()}
        </div>
      </div>
    </div>
  );
};

export default IdCardRenderer;
