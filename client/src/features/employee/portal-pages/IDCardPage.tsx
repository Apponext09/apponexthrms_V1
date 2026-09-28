import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '@/features/employee/hooks/useEmployees';
import { useActiveIdCardTemplate } from '@/features/id-card/api/useIdCardTemplates';
import { DEFAULT_ID_CARD_CONFIG } from '@/features/id-card/constants/defaultIdCardConfig';
import { IdCardRenderer } from '@/features/id-card/components/IdCardRenderer';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Printer, 
  RotateCw, 
  Sun,
  Moon,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { apiClient } from '@/lib/api';

interface IDCardPageProps {
  employeeId?: number;
}

export const IDCardPage: React.FC<IDCardPageProps> = ({ employeeId }) => {
  const { user } = useAuthStore();
  // For a self-service card, let the API resolve the authenticated user's linked
  // employee record. A user's account ID is not necessarily their employee ID.
  const { employee, refetch } = useEmployee(employeeId ?? 'me');
  const { data: activeTemplate, refetch: refetchTemplate } = useActiveIdCardTemplate(
    typeof employeeId === 'number' ? employeeId : undefined
  );

  useEffect(() => {
    refetchTemplate();
  }, [refetchTemplate]);

  const [isFlipped, setIsFlipped] = useState(false);
  const [cardDarkMode, setCardDarkMode] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [personalDetails, setPersonalDetails] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Keep the card legible when the application theme is changed elsewhere.
  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setCardDarkMode(root.classList.contains('dark'));
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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
    const rawDesig = employee?.designation || (employee as any)?.designation_name || (employee as any)?.designationName || (employee as any)?.currentDesignationName || (employee as any)?.current_designation_name || (employee as any)?.jobTitle || (employee as any)?.job_title || (user as any)?.designation || (user as any)?.designation_name || (user as any)?.role || 'TEAM MEMBER';
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
      const idToFetch = typeof employeeId === 'number' ? employeeId : employee?.id;
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
      const idToFetch = typeof employeeId === 'number' ? employeeId : employee?.id;
      if (!idToFetch) return;
      try {
        await apiClient.post(`/employees/${idToFetch}/id-card/issue`);
      } catch (err) {}
    };
    logIssuance();
  }, [employee, employeeId]);

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
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
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

      {/* Interactive ID Card Display Area */}
      <div className="flex items-center justify-center gap-3 py-4 no-print">
        <IdCardRenderer
          config={cardConfig}
          employeeData={currentEmployee}
          personalDetails={personalDetails}
          isFlipped={isFlipped}
          onFlipToggle={() => setIsFlipped(!isFlipped)}
          interactive={true}
          onAvatarClick={handleAvatarClick}
          avatarOverride={avatar}
          isDarkMode={cardDarkMode}
        />

        {/* Icon-only controls stay beside the card instead of occupying a header. */}
        <div
          className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          role="toolbar"
          aria-label="Digital ID card controls"
        >
          <Button type="button" variant="ghost" size="icon" onClick={() => setCardDarkMode((value) => !value)} className="h-10 w-10 rounded-none text-muted-foreground hover:bg-muted hover:text-foreground" title={cardDarkMode ? 'Use light card theme' : 'Use dark card theme'} aria-label={cardDarkMode ? 'Use light card theme' : 'Use dark card theme'}>
            {cardDarkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => setIsFlipped((value) => !value)} className="h-10 w-10 rounded-none border-t border-border text-muted-foreground hover:bg-muted hover:text-foreground" title={isFlipped ? 'Show front of ID card' : 'Show back of ID card'} aria-label={isFlipped ? 'Show front of ID card' : 'Show back of ID card'}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={handlePrint} className="h-10 w-10 rounded-none border-t border-border text-muted-foreground hover:bg-muted hover:text-foreground" title="Print ID sheet" aria-label="Print ID sheet">
            <Printer className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => handleDownload('front')} disabled={isGenerating} className="h-10 w-10 rounded-none border-t border-border text-muted-foreground hover:bg-muted hover:text-foreground" title="Download front as PNG" aria-label="Download front as PNG">
            <Download className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsFlipped(false)}
            className={`h-11 w-10 rounded-none border-b border-border ${!isFlipped ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            title="Show front of ID card"
            aria-label="Show front of ID card"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsFlipped(true)}
            className={`h-11 w-10 rounded-none ${isFlipped ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            title="Show back of ID card"
            aria-label="Show back of ID card"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
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
            isDarkMode={cardDarkMode}
          />

          {/* 2D FLAT BACK CARD */}
          <IdCardRenderer
            config={cardConfig}
            employeeData={currentEmployee}
            personalDetails={personalDetails}
            side="back"
            mode="flat-2d"
            backRef={cardBackRef}
            isDarkMode={cardDarkMode}
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
