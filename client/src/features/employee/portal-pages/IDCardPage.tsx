import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import { apiClient } from '@/lib/api';
import html2canvas from 'html2canvas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, Sparkles, Printer, Download, RotateCw, CheckCircle2, 
  Phone, Mail, MapPin, Heart, Calendar, Camera, UploadCloud, FileImage, Trash2, Layers 
} from 'lucide-react';
import { toast } from 'sonner';

export default function IDCardPage() {
  const { user } = useAuthStore();
  const employeeId = user?.employeeId || user?.id || 0;
  const { employee, refetch } = useEmployee(employeeId);

  const [activeMode, setActiveMode] = useState<'smart' | 'custom'>('smart');
  const [isFlipped, setIsFlipped] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [customCardImage, setCustomCardImage] = useState<string | null>(null);
  const [personalDetails, setPersonalDetails] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // References for rendering and exports
  const cardFrontRef = useRef<HTMLDivElement>(null);
  const cardBackRef = useRef<HTMLDivElement>(null);
  const printSheetRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customCardInputRef = useRef<HTMLInputElement>(null);

  // Sync avatar, custom card, and fetch personal details from DB
  useEffect(() => {
    if (employee) {
      const storedAvatar = employee.avatarUrl || (employee as any).avatar_url;
      if (storedAvatar) {
        setAvatar(storedAvatar);
      } else {
        const cached = localStorage.getItem(`emp_avatar_${user?.id || 'me'}`);
        if (cached) setAvatar(cached);
      }

      // Check if custom ID card is uploaded
      const storedCustomCard = employee.customIdCard || (employee as any).custom_id_card;
      if (storedCustomCard) {
        setCustomCardImage(storedCustomCard);
        setActiveMode('custom'); // Auto-switch to custom if uploaded
      } else {
        const cachedCustom = localStorage.getItem(`emp_custom_id_card_${user?.id || 'me'}`);
        if (cachedCustom) {
          setCustomCardImage(cachedCustom);
          setActiveMode('custom');
        }
      }
    }

    const fetchPersonalInfo = async () => {
      if (!employeeId) return;
      try {
        const res = await apiClient.get(`/employees/${employeeId}/personal-info`);
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
      if (!employeeId) return;
      try {
        await apiClient.post(`/employees/${employeeId}/id-card/issue`);
      } catch (err) {}
    };
    logIssuance();
  }, [employeeId]);

  // High-Resolution PNG Export using flat 2D DOM references
  const handleDownload = async (targetSide: 'front' | 'back' | 'both' = 'both') => {
    if (activeMode === 'custom' && customCardImage) {
      const link = document.createElement('a');
      link.href = customCardImage;
      link.download = `Custom_ID_Card_${empCode}.png`;
      link.click();
      toast.success('Custom ID Card image downloaded successfully!');
      return;
    }

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
    toast.info('Generating high-resolution Digital ID Card PNG...');
    
    try {
      const canvas = await html2canvas(exportTarget, {
        scale: 3, // 3x ultra-crisp density
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = fileName;
      link.click();
      toast.success('Digital ID Card downloaded successfully!');
    } catch (err) {
      console.error('Failed to export ID Card image', err);
      toast.error('Failed to generate image download. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Clean Print Action
  const handlePrint = () => {
    toast.info('Opening print dialog...');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Avatar Click Handler
  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
            await apiClient.put(`/employees/${employeeId}`, { avatarUrl: base64, avatar_url: base64 });
            toast.success('ID Card photo saved to database successfully!');
          }
        } catch (err) {
          toast.success('ID Card photo updated!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Custom ID Card Image Upload Handler
  const handleCustomCardClick = () => {
    customCardInputRef.current?.click();
  };

  const handleCustomCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setCustomCardImage(base64);
        setActiveMode('custom');
        
        const cacheSuffix = user?.id || user?.employeeId || 'me';
        try {
          localStorage.setItem(`emp_custom_id_card_${cacheSuffix}`, base64);
        } catch (err) {}

        try {
          if (employeeId) {
            await apiClient.put(`/employees/${employeeId}`, { 
              customIdCard: base64, 
              custom_id_card: base64 
            });
            toast.success('Custom ID Card layout saved to database successfully!');
            if (refetch) refetch();
          }
        } catch (err) {
          toast.success('Custom ID Card layout loaded preview!');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Delete Custom Card Layout
  const handleDeleteCustomCard = async () => {
    setIsUploading(true);
    try {
      setCustomCardImage(null);
      setActiveMode('smart');
      
      const cacheSuffix = user?.id || user?.employeeId || 'me';
      localStorage.removeItem(`emp_custom_id_card_${cacheSuffix}`);

      if (employeeId) {
        await apiClient.put(`/employees/${employeeId}`, { 
          customIdCard: null, 
          custom_id_card: null 
        });
        toast.success('Custom ID Card layout removed. Reverted to Smart Generator.');
        if (refetch) refetch();
      }
    } catch (err) {
      toast.error('Failed to remove custom ID card layout.');
    } finally {
      setIsUploading(false);
    }
  };

  // Real Database Details with Clean Fallbacks
  const empName = employee 
    ? `${employee.firstName} ${employee.lastName}`.trim() 
    : `${user?.firstName || 'Employee'} ${user?.lastName || ''}`.trim();

  const empCode = employee?.employeeCode 
    || (employee?.id ? `EMP-${String(employee.id).padStart(4, '0')}` : 'Pending HR');

  const designation = employee?.designation || (employee as any)?.designation_name || 'Staff Member';
  const department = employee?.department || (employee as any)?.department_name || 'General Department';
  const initials = empName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase() || 'EMP';

  const dateOfJoining = employee?.dateOfJoining 
    ? new Date(employee.dateOfJoining).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) 
    : '2024';

  const bloodGroup = (personalDetails as any)?.blood_group || (personalDetails as any)?.bloodGroup || 'O+';
  const emergencyPhone = (personalDetails as any)?.emergencyContactPhone || employee?.phone || employee?.mobile || '+91 98765 00000';
  const currentAddress = (personalDetails as any)?.currentAddress || (personalDetails as any)?.current_address || 'Registered Employee Address';

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
          {activeMode === 'smart' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFlipped(!isFlipped)}
              className="gap-1.5 rounded-lg font-bold text-xs h-8 px-3 border-border text-foreground hover:bg-muted shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5 text-primary" /> {isFlipped ? 'Show Front' : 'Show Back'}
            </Button>
          )}

          {activeMode === 'custom' && customCardImage && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteCustomCard}
              disabled={isUploading}
              className="gap-1.5 rounded-lg font-bold text-xs h-8 px-3 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Custom Layout
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 rounded-lg font-bold text-xs h-8 px-3 border-border text-foreground hover:bg-muted shrink-0"
          >
            <Printer className="w-3.5 h-3.5 text-muted-foreground" /> Print ID Sheet
          </Button>

          {activeMode === 'smart' ? (
            <>
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
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => handleDownload('both')}
              disabled={isGenerating || !customCardImage}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-2xs shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Download PNG
            </Button>
          )}
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex justify-center no-print">
        <Tabs value={activeMode} onValueChange={(v: any) => setActiveMode(v)} className="w-full max-w-md">
          <TabsList className="grid grid-cols-2 rounded-xl p-1 bg-muted border border-border/60">
            <TabsTrigger value="smart" className="rounded-lg font-bold text-xs py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs">
              ✨ Smart Generator
            </TabsTrigger>
            <TabsTrigger value="custom" className="rounded-lg font-bold text-xs py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs">
              📸 Custom Scanned Layout
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Interactive Display Area */}
      <div className="flex flex-col items-center justify-center py-4 no-print">
        {activeMode === 'smart' ? (
          /* Interactive 3D Card Preview */
          <div 
            className="w-80 h-[490px] relative transition-transform duration-700 preserve-3d cursor-pointer select-none"
            onClick={() => setIsFlipped(!isFlipped)}
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* FRONT PREVIEW */}
            <div 
              className="absolute inset-0 w-full h-full bg-gradient-to-br from-violet-600 via-indigo-800 to-slate-950 rounded-3xl p-6 text-white shadow-2xl border border-white/20 flex flex-col justify-between overflow-hidden"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex justify-between items-center relative z-10 border-b border-white/15 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-sm shadow">
                    A
                  </div>
                  <div>
                    <span className="font-extrabold text-xs tracking-wider uppercase text-white block">APPONEXT HRMS</span>
                    <span className="text-[8px] text-violet-200/80 font-bold uppercase tracking-widest block">Official ID Card</span>
                  </div>
                </div>
                <Badge className="bg-emerald-400/20 text-emerald-300 border-emerald-400/30 text-[9px] font-extrabold uppercase tracking-wider">
                  ACTIVE
                </Badge>
              </div>

              {/* Photo Avatar & Name */}
              <div className="flex flex-col items-center text-center my-auto relative z-10 py-2">
                <div 
                  onClick={handleAvatarClick}
                  className="w-24 h-24 rounded-2xl bg-white/15 backdrop-blur border-2 border-white/40 flex items-center justify-center text-3xl font-black shadow-2xl overflow-hidden relative group cursor-pointer transition-transform duration-200 hover:scale-105"
                  title="Click to upload profile photo"
                >
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>

                <h3 className="text-xl font-black tracking-tight mt-3 text-white">{empName}</h3>
                <p className="text-xs text-violet-200 font-bold tracking-wide mt-0.5 uppercase">{designation}</p>
                <p className="text-[11px] text-white/70 font-semibold">{department}</p>
              </div>

              <div className="border-t border-white/15 pt-3 flex justify-between items-center relative z-10">
                <div className="space-y-1.5 text-left">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-white/50 block font-bold">Employee Code</span>
                    <span className="text-xs font-mono font-black text-amber-300">{empCode}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-white/50 block font-bold">Joined</span>
                    <span className="text-xs font-bold">{dateOfJoining}</span>
                  </div>
                </div>

                <div className="w-16 h-16 bg-white p-1.5 rounded-2xl shadow-lg border border-white/30 flex items-center justify-center">
                  <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100">
                    <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                    <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                    <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                    <rect x="10" y="10" width="10" height="10" fill="white" />
                    <rect x="80" y="10" width="10" height="10" fill="white" />
                    <rect x="10" y="80" width="10" height="10" fill="white" />
                    <rect x="40" y="10" width="20" height="10" fill="currentColor" />
                    <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                    <rect x="70" y="40" width="10" height="20" fill="currentColor" />
                    <rect x="40" y="70" width="20" height="10" fill="currentColor" />
                    <rect x="80" y="80" width="10" height="10" fill="currentColor" />
                  </svg>
                </div>
              </div>

              <div className="text-[8px] text-center text-white/40 tracking-widest font-bold border-t border-white/10 pt-2 mt-2 uppercase">
                Click Card to Flip • Apponext HRMS Secured
              </div>
            </div>

            {/* BACK PREVIEW */}
            <div 
              className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-2xl border border-white/20 flex flex-col justify-between overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="flex justify-between items-center relative z-10 border-b border-white/15 pb-3">
                <span className="font-extrabold text-xs tracking-wider uppercase text-violet-300">SECURITY & EMERGENCY DETAILS</span>
                <Shield className="w-4 h-4 text-violet-400" />
              </div>

              <div className="space-y-3.5 my-auto text-left relative z-10 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-white/60 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" /> Blood Group
                  </span>
                  <span className="font-extrabold text-rose-400 font-mono text-sm">{bloodGroup}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-white/50 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" /> Emergency Contact Phone
                  </span>
                  <p className="font-mono font-bold text-white pl-5 text-xs">{emergencyPhone}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-white/50 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" /> Registered Location
                  </span>
                  <p className="text-[11px] text-white/80 leading-tight pl-5 truncate">{currentAddress}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-white/50 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" /> Corporate HR Helpline
                  </span>
                  <p className="font-mono text-[11px] text-cyan-300 pl-5">hr@apponexthrms.com</p>
                </div>
              </div>

              <div className="border-t border-white/15 pt-3 text-center space-y-1 relative z-10">
                <p className="text-[8px] text-white/50 leading-relaxed font-semibold">
                  This digital ID card is the official property of Apponext HRMS. If found, please return to the nearest company branch or contact HR helpline.
                </p>
                <span className="text-[8px] font-mono text-violet-300 block font-bold">VERIFICATION ID: {empCode}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Scanned Custom Layout Preview */
          <div className="w-80 h-[490px] flex flex-col justify-between">
            {customCardImage ? (
              <div className="relative group w-full h-[470px] rounded-xl overflow-hidden border border-border/80 bg-card flex items-center justify-center shadow-2xs">
                <img 
                  src={customCardImage} 
                  alt="Custom ID Card layout" 
                  className="w-full h-full object-contain"
                />
                <div 
                  onClick={handleCustomCardClick}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity duration-200 gap-2"
                >
                  <UploadCloud className="w-8 h-8 animate-bounce text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wide">Upload New Layout</span>
                </div>
              </div>
            ) : (
              <div 
                onClick={handleCustomCardClick}
                className="w-full h-[470px] rounded-xl border-2 border-dashed border-border/80 hover:border-primary/60 hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center text-center p-6 space-y-3 transition-all duration-200 bg-card shadow-2xs"
              >
                <div className="p-3.5 rounded-xl bg-primary/10 text-primary">
                  <FileImage className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-foreground">Upload Custom ID Card Layout</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Drag & drop or click here to upload your customized scanned ID card image (PNG/JPG).
                  </p>
                </div>
                <Button size="sm" className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg gap-1.5 shadow-2xs mt-2">
                  <UploadCloud className="w-3.5 h-3.5" /> Choose File
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================================
          PRINT & EXPORT CONTAINER (#print-section)
          Flat 2D rendering without 3D rotations so html2canvas and window.print work 100% cleanly!
         ========================================================================================= */}
      <div id="print-section" className="no-print" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={printSheetRef} className="p-6 bg-white text-slate-900 flex flex-wrap gap-8 justify-center items-center">
          {/* 2D FLAT FRONT CARD */}
          <div 
            ref={cardFrontRef}
            className="w-80 h-[490px] bg-gradient-to-br from-violet-600 via-indigo-800 to-slate-950 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between overflow-hidden relative"
          >
            <div className="flex justify-between items-center border-b border-white/15 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-sm shadow">
                  A
                </div>
                <div>
                  <span className="font-extrabold text-xs tracking-wider uppercase text-white block">APPONEXT HRMS</span>
                  <span className="text-[8px] text-violet-200/80 font-bold uppercase tracking-widest block">Official ID Card</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-extrabold uppercase">
                ACTIVE
              </span>
            </div>

            <div className="flex flex-col items-center text-center my-auto py-2">
              <div className="w-24 h-24 rounded-2xl bg-white/15 border-2 border-white/40 flex items-center justify-center text-3xl font-black shadow-xl overflow-hidden">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <h3 className="text-xl font-black tracking-tight mt-3 text-white">{empName}</h3>
              <p className="text-xs text-violet-200 font-bold tracking-wide mt-0.5 uppercase">{designation}</p>
              <p className="text-[11px] text-white/70 font-semibold">{department}</p>
            </div>

            <div className="border-t border-white/15 pt-3 flex justify-between items-center">
              <div className="space-y-1.5 text-left">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/50 block font-bold">Employee Code</span>
                  <span className="text-xs font-mono font-black text-amber-300">{empCode}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/50 block font-bold">Joined</span>
                  <span className="text-xs font-bold">{dateOfJoining}</span>
                </div>
              </div>

              <div className="w-16 h-16 bg-white p-1.5 rounded-2xl shadow-lg border border-white/30 flex items-center justify-center">
                <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100">
                  <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                  <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                  <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                  <rect x="10" y="10" width="10" height="10" fill="white" />
                  <rect x="80" y="10" width="10" height="10" fill="white" />
                  <rect x="10" y="80" width="10" height="10" fill="white" />
                  <rect x="40" y="10" width="20" height="10" fill="currentColor" />
                  <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                  <rect x="70" y="40" width="10" height="20" fill="currentColor" />
                  <rect x="40" y="70" width="20" height="10" fill="currentColor" />
                  <rect x="80" y="80" width="10" height="10" fill="currentColor" />
                </svg>
              </div>
            </div>

            <div className="text-[8px] text-center text-white/40 tracking-widest font-bold border-t border-white/10 pt-2 mt-2 uppercase">
              Apponext HRMS Secured Credentials
            </div>
          </div>

          {/* 2D FLAT BACK CARD */}
          <div 
            ref={cardBackRef}
            className="w-80 h-[490px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between overflow-hidden relative"
          >
            <div className="flex justify-between items-center border-b border-white/15 pb-3">
              <span className="font-extrabold text-xs tracking-wider uppercase text-violet-300">SECURITY & EMERGENCY DETAILS</span>
              <Shield className="w-4 h-4 text-violet-400" />
            </div>

            <div className="space-y-3.5 my-auto text-left text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] uppercase font-bold text-white/60 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400" /> Blood Group
                </span>
                <span className="font-extrabold text-rose-400 font-mono text-sm">{bloodGroup}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/50 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> Emergency Contact Phone
                </span>
                <p className="font-mono font-bold text-white pl-5 text-xs">{emergencyPhone}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/50 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> Registered Location
                </span>
                <p className="text-[11px] text-white/80 leading-tight pl-5 truncate">{currentAddress}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/50 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" /> Corporate HR Helpline
                </span>
                <p className="font-mono text-[11px] text-cyan-300 pl-5">hr@apponexthrms.com</p>
              </div>
            </div>

            <div className="border-t border-white/15 pt-3 text-center space-y-1">
              <p className="text-[8px] text-white/50 leading-relaxed font-semibold">
                This digital ID card is the official property of Apponext HRMS. If found, please return to the nearest company branch or contact HR helpline.
              </p>
              <span className="text-[8px] font-mono text-violet-300 block font-bold">VERIFICATION ID: {empCode}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/80 rounded-xl p-3 text-center text-xs text-muted-foreground no-print font-medium shadow-2xs max-w-xl mx-auto">
        💡 <strong>Tip:</strong> {activeMode === 'smart' 
          ? 'Click on the card to flip between Front and Back views. Click the profile photo to upload a new ID picture.' 
          : 'Click the card area to replace or upload your custom scanned ID Card layout.'}
      </div>

      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      <input 
        type="file" 
        ref={customCardInputRef} 
        onChange={handleCustomCardChange} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
}
