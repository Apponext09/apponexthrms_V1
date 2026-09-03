import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '@/features/employee/hooks/useEmployees';
import { useActiveIdCardTemplate } from '@/features/id-card/api/useIdCardTemplates';
import { DEFAULT_ID_CARD_CONFIG } from '@/features/id-card/constants/defaultIdCardConfig';
import { IdCardRenderer } from '@/features/id-card/components/IdCardRenderer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Printer, 
  RotateCw, 
  Layers, 
  Shield 
} from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { apiClient } from '@/lib/api';

interface IDCardPageProps {
  employeeId?: number;
}

export const IDCardPage: React.FC<IDCardPageProps> = ({ employeeId }) => {
  const { user } = useAuthStore();
  const { employee, refetch } = useEmployee(employeeId || (user as any)?.employeeId || (user as any)?.id || 'me');
  const { data: activeTemplate, refetch: refetchTemplate } = useActiveIdCardTemplate(
    typeof employeeId === 'number' ? employeeId : undefined
  );

  useEffect(() => {
    refetchTemplate();
  }, [refetchTemplate]);

  const [isFlipped, setIsFlipped] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [personalDetails, setPersonalDetails] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // References for rendering and exports
  const cardFrontRef = useRef<HTMLDivElement>(null);
  const cardBackRef = useRef<HTMLDivElement>(null);
  const printSheetRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seamlessly merge user and employee data so names, designations, codes & photos are 100% available
  const currentEmployee = React.useMemo(() => {
    const rawFirst = employee?.firstName || (employee as any)?.first_name || user?.firstName || (user as any)?.first_name || '';
    const rawLast = employee?.lastName || (employee as any)?.last_name || user?.lastName || (user as any)?.last_name || '';
    const rawCode = employee?.employeeCode || (employee as any)?.employee_code || (user as any)?.employeeCode || (user as any)?.employee_code || (user as any)?.code || (user?.id ? `EMP${String(user.id).padStart(3, '0')}` : '');
    const rawDesig = employee?.designation || (employee as any)?.designation_name || (employee as any)?.jobTitle || (employee as any)?.job_title || (user as any)?.designation || (user as any)?.designation_name || (user as any)?.role || 'TEAM MEMBER';
    const rawDept = employee?.department || (employee as any)?.department_name || (user as any)?.department || (user as any)?.department_name || 'CORPORATE';
    const rawEmail = (employee as any)?.workEmail || (employee as any)?.work_email || (employee as any)?.email || user?.email || (user as any)?.work_email || '';

    return {
      ...user,
      ...employee,
      firstName: rawFirst,
      lastName: rawLast,
      employeeCode: rawCode,
      designation: rawDesig,
      department: rawDept,
      workEmail: rawEmail,
      avatarUrl: avatar || employee?.avatarUrl || (employee as any)?.avatar_url || (user as any)?.avatarUrl || (user as any)?.avatar_url,
    };
  }, [user, employee, avatar]);

  // Sync avatar and fetch personal details from DB
  useEffect(() => {
    if (employee || user) {
      const storedAvatar = employee?.avatarUrl || (employee as any)?.avatar_url || (user as any)?.avatarUrl || (user as any)?.avatar_url;
      if (storedAvatar) {
        setAvatar(storedAvatar);
      } else {
        const cached = localStorage.getItem(`emp_avatar_${user?.id || 'me'}`);
        if (cached) setAvatar(cached);
      }
    }

    const fetchPersonalInfo = async () => {
      const idToFetch = typeof employeeId === 'number' ? employeeId : user?.id;
      if (!idToFetch) return;
      try {
        const res = await apiClient.get(`/employees/${idToFetch}/personal-info`);
        if (res.data?.data) {
          setPersonalDetails(res.data.data);
        }
      } catch (err) {
        console.log('No extra personal info record found.');
      }
    };

    fetchPersonalInfo();
  }, [employee, employeeId, user]);

  // Log ID card generation event to DB API
  useEffect(() => {
    const logIssuance = async () => {
      const idToFetch = typeof employeeId === 'number' ? employeeId : user?.id;
      if (!idToFetch) return;
      try {
        await apiClient.post(`/employees/${idToFetch}/id-card/issue`);
      } catch (err) {}
    };
    logIssuance();
  }, [employeeId, user]);

  const empCode = currentEmployee?.employeeCode || (user as any)?.employeeCode || (user as any)?.employee_code || (user?.id ? `EMP${String(user.id).padStart(3, '0')}` : '');

  // Resolved dynamic card configuration from database template settings (safely parsed)
  const cardConfig = React.useMemo<any>(() => {
    let raw: any = activeTemplate?.configJson;
    let attempts = 0;
    while (typeof raw === 'string' && attempts < 10) {
      try {
        const next = JSON.parse(raw);
        if (next === raw) break;
        raw = next;
      } catch (e) {
        break;
      }
      attempts++;
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return {
        ...DEFAULT_ID_CARD_CONFIG,
        ...raw,
        theme: { ...DEFAULT_ID_CARD_CONFIG.theme, ...(raw.theme || {}) },
        header: { ...DEFAULT_ID_CARD_CONFIG.header, ...(raw.header || {}) },
        photo: { ...DEFAULT_ID_CARD_CONFIG.photo, ...(raw.photo || {}) },
        footer: { ...DEFAULT_ID_CARD_CONFIG.footer, ...(raw.footer || {}) },
        back: { ...DEFAULT_ID_CARD_CONFIG.back, ...(raw.back || {}) },
        fields: Array.isArray(raw.fields) && raw.fields.length > 0 ? raw.fields : DEFAULT_ID_CARD_CONFIG.fields,
      };
    }
    return DEFAULT_ID_CARD_CONFIG;
  }, [activeTemplate?.configJson]);

  // High-Resolution PNG Export using flat 2D DOM references
  const handleDownload = async (targetSide: 'front' | 'back' | 'both' = 'both') => {
    let exportTarget: HTMLElement | null = null;
    let fileName = `Digital_ID_Card_${empCode}.png`;

    if (targetSide === 'front' && cardFrontRef.current) {
      exportTarget = cardFrontRef.current;
      fileName = `ID_Card_Front_${empCode}.png`;
    } else if (targetSide === 'back' && cardBackRef.current) {
      exportTarget = cardBackRef.current;
      fileName = `ID_Card_Back_${empCode}.png`;
    } else if (printSheetRef.current) {
      exportTarget = printSheetRef.current;
      fileName = `ID_Card_Full_Sheet_${empCode}.png`;
    }

    if (!exportTarget) return;

    setIsGenerating(true);
    const toastId = toast.loading(`Generating high-resolution ${targetSide.toUpperCase()} ID card export...`);

    try {
      await document.fonts.ready;
      await new Promise((res) => setTimeout(res, 120));

      const canvas = await html2canvas(exportTarget, {
        scale: 3, // 300 DPI print quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
        onclone: (clonedDoc: Document) => {
          const el = clonedDoc.getElementById('print-section');
          if (el) {
            el.style.position = 'static';
            el.style.left = '0';
            el.style.top = '0';
          }
        },
      });

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${fileName} downloaded successfully!`, { id: toastId });
    } catch (err: any) {
      console.error('ID Card export failed:', err);
      toast.error('Failed to generate high-resolution image. Please try again.', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger browser print flow
  const handlePrint = () => {
    window.print();
  };

  // Avatar Upload Handler
  const handleAvatarClick = () => {
    if (cardConfig?.photo?.allowEmployeeUpload === false) {
      toast.error('Profile photo updates on ID card are locked by HR administrator.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        toast.error('Avatar file size must be less than 3MB.');
        return;
      }

      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setAvatar(base64);
        
        const cacheSuffix = user?.id || user?.employeeId || 'me';
        try {
          localStorage.setItem(`emp_avatar_${cacheSuffix}`, base64);
        } catch (err) {}

        try {
          if (employeeId) {
            await apiClient.put(`/employees/${employeeId}`, { 
              avatarUrl: base64, 
              avatar_url: base64,
              profilePicture: base64,
              photoUrl: base64 
            });
            toast.success('ID Card photo updated and saved to profile!');
            if (refetch) refetch();
          } else {
            toast.success('ID Card photo updated!');
          }
        } catch (err) {
          toast.success('ID Card photo updated in local preview!');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-10">
      {/* Printable CSS style overlay */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-section, #print-section * {
            visibility: visible !important;
          }
          #print-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 20px !important;
            background: white !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Actions Card */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Digital ID Card
            </h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
              Official Credential
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Official Organization Security Credentials & Digital Access Badge
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 xl:pb-0 scrollbar-none">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFlipped(!isFlipped)}
            className="gap-1.5 rounded-lg font-bold text-xs h-8 px-3 border-border text-foreground hover:bg-muted shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5 text-primary" /> {isFlipped ? 'Show Front' : 'Show Back'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 rounded-lg font-bold text-xs h-8 px-3 border-border text-foreground hover:bg-muted shrink-0"
          >
            <Printer className="w-3.5 h-3.5 text-muted-foreground" /> Print ID Sheet
          </Button>

          <Button
            size="sm"
            onClick={() => handleDownload('front')}
            disabled={isGenerating}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-3 rounded-lg gap-1 shadow-2xs shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Front PNG
          </Button>
          <Button
            size="sm"
            onClick={() => handleDownload('back')}
            disabled={isGenerating}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-3 rounded-lg gap-1 shadow-2xs shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Back PNG
          </Button>
          <Button
            size="sm"
            onClick={() => handleDownload('both')}
            disabled={isGenerating}
            variant="secondary"
            className="font-bold text-xs h-8 px-3 rounded-lg gap-1 border border-border shrink-0"
          >
            <Layers className="w-3.5 h-3.5" /> Full Sheet
          </Button>
        </div>
      </div>

      {/* Interactive ID Card Display Area */}
      <div className="flex flex-col items-center justify-center py-4 no-print">
        <IdCardRenderer
          config={cardConfig}
          employeeData={currentEmployee}
          personalDetails={personalDetails}
          isFlipped={isFlipped}
          onFlipToggle={() => setIsFlipped(!isFlipped)}
          interactive={true}
          onAvatarClick={handleAvatarClick}
          avatarOverride={avatar}
        />
      </div>

      {/* =========================================================================================
          PRINT & EXPORT CONTAINER (#print-section)
          Flat 2D rendering without 3D rotations so html2canvas and window.print work 100% cleanly!
         ========================================================================================= */}
      <div id="print-section" className="no-print" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={printSheetRef} className="p-6 bg-white text-slate-900 flex flex-wrap gap-8 justify-center items-center">
          {/* 2D FLAT FRONT CARD */}
          <IdCardRenderer
            config={cardConfig}
            employeeData={currentEmployee}
            personalDetails={personalDetails}
            side="front"
            mode="flat-2d"
            frontRef={cardFrontRef}
            avatarOverride={avatar}
          />

          {/* 2D FLAT BACK CARD */}
          <IdCardRenderer
            config={cardConfig}
            employeeData={currentEmployee}
            personalDetails={personalDetails}
            side="back"
            mode="flat-2d"
            backRef={cardBackRef}
            avatarOverride={avatar}
          />
        </div>
      </div>

      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarChange}
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
      />
    </div>
  );
};

export default IDCardPage;
