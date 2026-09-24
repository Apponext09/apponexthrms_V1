import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Edit3, Type, Upload, RotateCcw, CheckCircle2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PolicySignaturePadProps {
  onSignatureChange: (signatureDataUrl: string | null, signatureType: 'drawn' | 'typed' | 'uploaded') => void;
  defaultSignerName?: string;
}

export const PolicySignaturePad: React.FC<PolicySignaturePadProps> = ({
  onSignatureChange,
  defaultSignerName = '',
}) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  
  // Canvas State for Drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#1e3a8a'); // Navy Blue default

  // Type Signature State
  const [typedName, setTypedName] = useState(defaultSignerName);
  const [selectedFont, setSelectedFont] = useState<'font-serif' | 'font-mono' | 'font-sans'>('font-serif');

  // Upload Signature State
  const [uploadedSignatureUrl, setUploadedSignatureUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Initialize Canvas
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = penColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [activeTab, penColor]);

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current && hasDrawn) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSignatureChange(dataUrl, 'drawn');
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(null, 'drawn');
  };

  // Type Signature Handler
  const handleTypedNameChange = (val: string) => {
    setTypedName(val);
    if (!val.trim()) {
      onSignatureChange(null, 'typed');
      return;
    }

    // Generate canvas from typed text for preview/dataUrl
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 400;
    tempCanvas.height = 100;
    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 100);
      ctx.font = 'italic bold 32px Georgia, serif';
      ctx.fillStyle = '#1e3a8a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val.trim(), 200, 50);
      onSignatureChange(tempCanvas.toDataURL('image/png'), 'typed');
    }
  };

  // Upload Signature Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid signature image file (PNG, JPG, JPEG, SVG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Signature file size should not exceed 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedSignatureUrl(dataUrl);
      setUploadedFileName(file.name);
      onSignatureChange(dataUrl, 'uploaded');
      toast.success('Signature image uploaded successfully');
    };
    reader.readAsDataURL(file);
  };

  const removeUploadedSignature = () => {
    setUploadedSignatureUrl(null);
    setUploadedFileName(null);
    onSignatureChange(null, 'uploaded');
  };

  return (
    <div className="border border-border/80 rounded-xl p-4 bg-muted/20 space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Edit3 className="w-4 h-4 text-primary" /> Signature Input
        </label>
        <span className="text-[10px] text-muted-foreground">Choose Draw, Type, or Upload Signature</span>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          const tab = val as 'draw' | 'type' | 'upload';
          setActiveTab(tab);
          if (tab === 'draw') {
            onSignatureChange(hasDrawn && canvasRef.current ? canvasRef.current.toDataURL() : null, 'drawn');
          } else if (tab === 'type') {
            handleTypedNameChange(typedName);
          } else if (tab === 'upload') {
            onSignatureChange(uploadedSignatureUrl, 'uploaded');
          }
        }}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 h-9 bg-background/80 border border-border p-1 rounded-lg">
          <TabsTrigger value="draw" className="text-xs font-bold gap-1.5 py-1">
            <Edit3 className="w-3.5 h-3.5" /> Draw Sign
          </TabsTrigger>
          <TabsTrigger value="type" className="text-xs font-bold gap-1.5 py-1">
            <Type className="w-3.5 h-3.5" /> Type Sign
          </TabsTrigger>
          <TabsTrigger value="upload" className="text-xs font-bold gap-1.5 py-1">
            <Upload className="w-3.5 h-3.5" /> Upload Sign
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Draw Signature Canvas */}
        <TabsContent value="draw" className="space-y-2 pt-2">
          <div className="relative bg-white border border-slate-300 rounded-lg overflow-hidden shadow-inner">
            <canvas
              ref={canvasRef}
              width={480}
              height={120}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-[120px] cursor-crosshair touch-none"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs italic">
                Draw your signature inside this box using mouse or finger
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-medium">Ink Color:</span>
              <button
                type="button"
                onClick={() => setPenColor('#1e3a8a')}
                className={`w-5 h-5 rounded-full bg-blue-900 border ${penColor === '#1e3a8a' ? 'ring-2 ring-primary' : ''}`}
                title="Navy Blue"
              />
              <button
                type="button"
                onClick={() => setPenColor('#000000')}
                className={`w-5 h-5 rounded-full bg-black border ${penColor === '#000000' ? 'ring-2 ring-primary' : ''}`}
                title="Black"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearCanvas}
              disabled={!hasDrawn}
              className="h-7 text-[11px] font-bold gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Clear Box
            </Button>
          </div>
        </TabsContent>

        {/* Tab 2: Type Signature */}
        <TabsContent value="type" className="space-y-3 pt-2">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Type your full legal name:</label>
            <Input
              type="text"
              value={typedName}
              onChange={(e) => handleTypedNameChange(e.target.value)}
              placeholder="e.g. John Doe"
              className="h-9 text-xs font-medium"
            />
          </div>

          {typedName.trim() && (
            <div className="p-4 bg-white border border-slate-300 rounded-lg text-center shadow-inner">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1">Generated Digital Signature</span>
              <span className={`text-2xl italic font-bold text-blue-950 block ${selectedFont}`}>
                {typedName}
              </span>
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Upload Signature (Image File) */}
        <TabsContent value="upload" className="space-y-3 pt-2">
          {uploadedSignatureUrl ? (
            <div className="p-4 bg-white border border-slate-300 rounded-lg flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3 truncate">
                <div className="h-14 w-28 bg-slate-50 border border-slate-200 rounded flex items-center justify-center p-1 overflow-hidden shrink-0">
                  <img src={uploadedSignatureUrl} alt="Uploaded Signature" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="truncate text-xs">
                  <span className="font-bold text-slate-900 block truncate">{uploadedFileName}</span>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Signature image ready
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeUploadedSignature}
                className="h-8 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </Button>
            </div>
          ) : (
            <div className="relative border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-5 text-center transition-all bg-background/50 space-y-2">
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">Click to upload your signature image</span>
                <span className="text-[10px] text-muted-foreground">PNG, JPG, JPEG or SVG (Transparent background recommended, max 5MB)</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
