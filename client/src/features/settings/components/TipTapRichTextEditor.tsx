import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import {
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, RemoveFormatting, Image as ImageIcon, Link as LinkIcon, 
  Crop, X, Check, Quote
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TipTapRichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TipTapRichTextEditor({
  content,
  onChange,
  disabled = false,
}: TipTapRichTextEditorProps) {
  // Toggle for raw HTML Source Code editor view
  const [showSource, setShowSource] = useState(false);
  const [rawHtml, setRawHtml] = useState(content || '');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        underline: false,
        link: false,
      } as any),
      Underline,
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Subscript,
      Superscript,
    ],
    content: content || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setRawHtml(html);
      onChange(html);
    },
  });

  // Sync editor content if content prop changes externally (e.g. form reset or selection)
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    
    // Normalize empty check to prevent infinite update loops (e.g. '' vs '<p></p>')
    const isPropEmpty = !content || content.trim() === '' || content === '<p></p>';
    const isEditorEmpty = editor.isEmpty || editor.getHTML() === '<p></p>';
    
    if (isPropEmpty && isEditorEmpty) {
      return; // Both are empty, no need to update
    }
    
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
      setRawHtml(content || '');
    }
  }, [content, editor]);

  // Sync state back from raw HTML source editor
  const handleRawHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawHtml(val);
    onChange(val);
    if (editor) {
      editor.commands.setContent(val);
    }
  };

  // Image Customizer Dialog state
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [imageAlign, setImageAlign] = useState<'left' | 'center' | 'right'>('center');
  
  // Drag to crop state
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // File Upload handler
  const handleLocalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          setImageObj(img);
          setCropBox(null);
          setImageAlign('center');
          setIsCustomizerOpen(true);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Reset file input
  };

  // Draw loop for canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the image first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);

    // If there is an active cropbox selection, draw a semi-transparent mask
    if (cropBox && (cropBox.w > 0 || cropBox.h > 0)) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      
      // Top section mask
      ctx.fillRect(0, 0, canvas.width, cropBox.y);
      // Bottom section mask
      ctx.fillRect(0, cropBox.y + cropBox.h, canvas.width, canvas.height - (cropBox.y + cropBox.h));
      // Left section mask
      ctx.fillRect(0, cropBox.y, cropBox.x, cropBox.h);
      // Right section mask
      ctx.fillRect(cropBox.x + cropBox.w, cropBox.y, canvas.width - (cropBox.x + cropBox.w), cropBox.h);

      // Stroke border for crop area
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]); // Dashed line
      ctx.strokeRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);
      ctx.setLineDash([]); // Reset dash

      // Corner handles
      ctx.fillStyle = '#3b82f6';
      const handleSize = 6;
      ctx.fillRect(cropBox.x - handleSize/2, cropBox.y - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropBox.x + cropBox.w - handleSize/2, cropBox.y - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropBox.x - handleSize/2, cropBox.y + cropBox.h - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropBox.x + cropBox.w - handleSize/2, cropBox.y + cropBox.h - handleSize/2, handleSize, handleSize);
    }
  }, [imageObj, cropBox, isDrawing, isCustomizerOpen]);

  // Drag handlers for Canvas selection box
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Scale client mouse coordinate to fit actual canvas internal pixels
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setDragStart({ x, y });
    setIsDrawing(true);
    setCropBox({ x, y, w: 0, h: 0 });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !cropBox) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const w = x - dragStart.x;
    const h = y - dragStart.y;

    const boxX = w < 0 ? x : dragStart.x;
    const boxY = h < 0 ? y : dragStart.y;
    const boxW = Math.abs(w);
    const boxH = Math.abs(h);

    setCropBox({
      x: Math.max(0, Math.min(boxX, canvas.width)),
      y: Math.max(0, Math.min(boxY, canvas.height)),
      w: Math.min(boxW, canvas.width - boxX),
      h: Math.min(boxH, canvas.height - boxY)
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  // Compile and insert customized resizable image wrapper
  const handleInsertCustomImage = () => {
    if (!imageObj || !editor) return;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    let sx = 0;
    let sy = 0;
    let sw = imageObj.naturalWidth;
    let sh = imageObj.naturalHeight;

    // Check if user defined a valid crop box selection (w/h larger than 5 pixels)
    if (cropBox && cropBox.w > 5 && cropBox.h > 5 && canvasRef.current) {
      const scaleX = imageObj.naturalWidth / canvasRef.current.width;
      const scaleY = imageObj.naturalHeight / canvasRef.current.height;
      sx = cropBox.x * scaleX;
      sy = cropBox.y * scaleY;
      sw = cropBox.w * scaleX;
      sh = cropBox.h * scaleY;
    }

    tempCanvas.width = sw;
    tempCanvas.height = sh;
    tempCtx.drawImage(imageObj, sx, sy, sw, sh, 0, 0, sw, sh);

    const base64Src = tempCanvas.toDataURL('image/jpeg', 0.85);

    // Build resizable inline image wrapper matching exact canvas aspect ratio widths
    const resizeWidth = Math.round(canvasWidth);
    const wrapperStyle = `text-align: ${imageAlign}; width: 100%; margin: 16px 0;`;
    const resizerStyle = `display: inline-block; position: relative; resize: both; overflow: hidden; width: ${resizeWidth}px; max-width: 100%; border: 2px dashed #3b82f6; padding: 2px; border-radius: 6px; vertical-align: bottom;`;
    const imgStyle = `width: 100%; height: 100%; object-fit: contain; display: block; pointer-events: none;`;

    const htmlContent = `<div style="${wrapperStyle}"><div style="${resizerStyle}"><img src="${base64Src}" style="${imgStyle}" /></div></div>`;
    
    // Insert into TipTap document flow
    editor.chain().focus().insertContent(htmlContent).run();

    // Close Dialog
    setIsCustomizerOpen(false);
    setImageObj(null);
    setCropBox(null);
  };

  // Helper to add hyperlink
  const handleAddLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter Link URL:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  if (!editor) {
    return null;
  }

  // Calculate size to fit display canvas (500x330 box)
  let canvasWidth = 500;
  let canvasHeight = 330;
  if (imageObj) {
    const ratio = imageObj.naturalWidth / imageObj.naturalHeight;
    if (imageObj.naturalWidth > canvasWidth) {
      canvasWidth = 500;
      canvasHeight = canvasWidth / ratio;
    } else {
      canvasWidth = imageObj.naturalWidth;
      canvasHeight = imageObj.naturalHeight;
    }
    
    if (canvasHeight > 330) {
      canvasHeight = 330;
      canvasWidth = canvasHeight * ratio;
    }
  }

  return (
    <div className="relative border border-border rounded bg-background shadow-sm font-sans">
      
      {/* ─── Styled Rich Text Editor Toolbar ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 p-1 bg-[#f4f4f4] border-b border-border text-foreground text-xs select-none">
        
        {/* Bold */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          title="Bold"
          className={cn(
            'p-1 px-2 rounded hover:bg-muted transition-colors cursor-pointer font-extrabold text-foreground text-sm select-none',
            editor.isActive('bold') ? 'bg-slate-300' : ''
          )}
        >
          B
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          title="Italic"
          className={cn(
            'p-1 px-2 rounded hover:bg-muted transition-colors cursor-pointer italic font-serif text-slate-850 text-sm select-none',
            editor.isActive('italic') ? 'bg-slate-300' : ''
          )}
        >
          I
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={disabled}
          title="Underline"
          className={cn(
            'p-1 px-1.5 rounded hover:bg-muted transition-colors cursor-pointer underline text-foreground text-sm select-none',
            editor.isActive('underline') ? 'bg-slate-300' : ''
          )}
        >
          U
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled}
          title="Strikethrough"
          className={cn(
            'p-1 px-1.5 rounded hover:bg-muted transition-colors cursor-pointer line-through text-foreground text-sm select-none',
            editor.isActive('strike') ? 'bg-slate-300' : ''
          )}
        >
          S
        </button>

        <div className="h-5 w-[1px] bg-slate-300 mx-1.5" />

        {/* Align Left */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          disabled={disabled}
          title="Align Left"
          className={cn(
            'p-1 rounded hover:bg-muted transition-colors cursor-pointer',
            editor.isActive({ textAlign: 'left' }) ? 'bg-slate-300' : ''
          )}
        >
          <AlignLeft className="h-3.5 w-3.5 text-foreground" />
        </button>

        {/* Align Center */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          disabled={disabled}
          title="Align Center"
          className={cn(
            'p-1 rounded hover:bg-muted transition-colors cursor-pointer',
            editor.isActive({ textAlign: 'center' }) ? 'bg-slate-300' : ''
          )}
        >
          <AlignCenter className="h-3.5 w-3.5 text-foreground" />
        </button>

        {/* Align Right */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          disabled={disabled}
          title="Align Right"
          className={cn(
            'p-1 rounded hover:bg-muted transition-colors cursor-pointer',
            editor.isActive({ textAlign: 'right' }) ? 'bg-slate-300' : ''
          )}
        >
          <AlignRight className="h-3.5 w-3.5 text-foreground" />
        </button>

        {/* Align Justify */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          disabled={disabled}
          title="Align Justify"
          className={cn(
            'p-1 rounded hover:bg-muted transition-colors cursor-pointer',
            editor.isActive({ textAlign: 'justify' }) ? 'bg-slate-300' : ''
          )}
        >
          <AlignJustify className="h-3.5 w-3.5 text-foreground" />
        </button>

        <div className="h-5 w-[1px] bg-slate-300 mx-1.5" />

        {/* Bullet List */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          title="Bullet List"
          className={cn(
            'p-1 rounded hover:bg-muted transition-colors cursor-pointer',
            editor.isActive('bulletList') ? 'bg-slate-300' : ''
          )}
        >
          <List className="h-3.5 w-3.5 text-foreground" />
        </button>

        {/* Ordered List */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          title="Numbered List"
          className={cn(
            'p-1 rounded hover:bg-muted transition-colors cursor-pointer',
            editor.isActive('orderedList') ? 'bg-slate-300' : ''
          )}
        >
          <ListOrdered className="h-3.5 w-3.5 text-foreground" />
        </button>

        <div className="h-5 w-[1px] bg-slate-300 mx-1.5" />

        {/* Font Size Select */}
        <select
          onChange={(e) => {
            if (editor) {
              editor.chain().focus().setMark('textStyle', { fontSize: e.target.value }).run();
            }
          }}
          className="bg-background border border-border rounded px-1 py-0.5 text-xs text-foreground focus:outline-none cursor-pointer h-[24px] font-medium"
          defaultValue=""
        >
          <option value="" disabled>Font Size...</option>
          <option value="12px">12px</option>
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
        </select>

        {/* Font Family Select */}
        <select
          onChange={(e) => {
            if (editor) {
              editor.chain().focus().setFontFamily(e.target.value).run();
            }
          }}
          className="bg-background border border-border rounded px-1 py-0.5 text-xs text-foreground focus:outline-none cursor-pointer h-[24px] font-medium ml-0.5"
          defaultValue=""
        >
          <option value="" disabled>Font Family...</option>
          <option value="Arial">Arial</option>
          <option value="Courier New">Courier</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Verdana">Verdana</option>
          <option value="Inter">Inter</option>
        </select>

        {/* Font Format Select */}
        <select
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1' :
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' :
            editor.isActive('paragraph') ? 'p' :
            ''
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'p') editor.chain().focus().setParagraph().run();
            else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          className="bg-background border border-border rounded px-1 py-0.5 text-xs text-foreground focus:outline-none cursor-pointer h-[24px] font-medium ml-0.5"
        >
          <option value="" disabled>Font Format</option>
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <div className="h-5 w-[1px] bg-slate-300 mx-1.5" />

        {/* Subscript x₂ */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          disabled={disabled}
          title="Subscript"
          className={cn(
            'p-1 px-1.5 rounded hover:bg-muted transition-colors cursor-pointer text-foreground text-xs font-bold font-sans select-none',
            editor.isActive('subscript') ? 'bg-slate-300' : ''
          )}
        >
          x<sub>2</sub>
        </button>

        {/* Superscript x² */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          disabled={disabled}
          title="Superscript"
          className={cn(
            'p-1 px-1.5 rounded hover:bg-muted transition-colors cursor-pointer text-foreground text-xs font-bold font-sans select-none',
            editor.isActive('superscript') ? 'bg-slate-300' : ''
          )}
        >
          x<sup>2</sup>
        </button>

        {/* Quote */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={disabled}
          title="Quote"
          className={cn(
            'p-1 rounded hover:bg-muted transition-colors cursor-pointer',
            editor.isActive('blockquote') ? 'bg-slate-300' : ''
          )}
        >
          <Quote className="h-3.5 w-3.5 text-foreground" />
        </button>

        <div className="h-5 w-[1px] bg-slate-300 mx-1.5" />

        {/* Link */}
        <button
          type="button"
          onClick={handleAddLink}
          disabled={disabled}
          title="Insert Link"
          className={cn(
            'p-1 rounded hover:bg-muted transition-colors cursor-pointer',
            editor.isActive('link') ? 'bg-slate-300' : ''
          )}
        >
          <LinkIcon className="h-3.5 w-3.5 text-foreground" />
        </button>

        {/* Local Image Upload */}
        <label
          className="p-1 rounded hover:bg-muted transition-colors cursor-pointer inline-flex items-center justify-center text-foreground"
          title="Insert Local Image"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={handleLocalImageChange}
          />
        </label>

        {/* Clear formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          disabled={disabled}
          title="Clear Formatting"
          className="p-1 rounded hover:bg-muted hover:text-red-650 transition-colors text-foreground cursor-pointer"
        >
          <RemoveFormatting className="h-3.5 w-3.5" />
        </button>

        <div className="h-5 w-[1px] bg-slate-300 mx-1.5" />

        {/* Toggle HTML Source Code view */}
        <button
          type="button"
          onClick={() => setShowSource(!showSource)}
          title="Toggle HTML Source Code"
          className={cn(
            'p-1 rounded hover:bg-muted transition-colors cursor-pointer flex items-center justify-center font-bold font-sans text-xs px-1.5 text-foreground',
            showSource ? 'bg-slate-300 text-blue-700 border border-blue-300' : ''
          )}
        >
          HTML
        </button>

        <div className="h-5 w-[1px] bg-slate-300 mx-1.5" />

        {/* Undo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || !editor.can().undo()}
          title="Undo"
          className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-40 text-foreground cursor-pointer"
        >
          <Undo className="h-3.5 w-3.5" />
        </button>

        {/* Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().redo()}
          title="Redo"
          className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-40 text-foreground cursor-pointer"
        >
          <Redo className="h-3.5 w-3.5" />
        </button>

        <div className="ml-auto text-[10px] text-muted-foreground font-mono px-1.5">
          {editor.getText().length} chars
        </div>
      </div>

      {/* ─── Editor Content / HTML Source Editor area ──────────────────────── */}
      <div className="bg-background min-h-[160px] max-h-[350px] overflow-y-auto">
        {showSource ? (
          /* Raw HTML Editor Mode */
          <textarea
            value={rawHtml}
            onChange={handleRawHtmlChange}
            disabled={disabled}
            className="w-full min-h-[160px] p-4 text-xs font-mono text-foreground border-0 focus:outline-none focus:ring-0 resize-none bg-muted/30/70 bg-background text-foreground border-border placeholder:text-muted-foreground"
            placeholder="Type raw HTML source code here..."
            style={{ minHeight: '160px' }}
          />
        ) : (
          /* Visual WSYIWYG mode */
          <div className="p-4 text-xs text-foreground font-normal leading-relaxed prose prose-sm max-w-none focus:outline-none min-h-[140px]">
            <EditorContent editor={editor} />
          </div>
        )}
      </div>

      {/* ─── Image Customizer Absolute Overlay (Prevents Dialog conflicts) ─── */}
      {isCustomizerOpen && (
        <div className="absolute inset-0 bg-background z-[60] p-4 flex flex-col justify-between overflow-y-auto rounded-lg border border-border">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Crop className="w-4 h-4 text-blue-500" /> Customize Image Upload
              </h4>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                Drag on the image to crop. Set positioning and alignment.
              </p>
            </div>
            <button 
              type="button" 
              onClick={() => {
                setIsCustomizerOpen(false);
                setImageObj(null);
                setCropBox(null);
              }}
              className="p-1 text-muted-foreground/70 hover:text-slate-650 hover:bg-muted/30 rounded-full transition-all"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-1 flex-1 min-h-0">
            
            {/* Canvas area (2 cols) */}
            <div className="md:col-span-2 flex items-center justify-center bg-muted/30 border border-border/60 rounded p-1 min-h-[220px]">
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="border border-border/60 rounded cursor-crosshair max-w-full block bg-background"
                style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
              />
            </div>

            {/* Editing settings sidepanel (1 col) */}
            <div className="space-y-4 flex flex-col justify-between text-xs text-muted-foreground">
              
              <div className="space-y-3">
                {/* Crop information */}
                <div className="bg-blue-50/50 border border-blue-100 rounded p-2.5 text-[11px] text-muted-foreground">
                  <span className="font-bold text-blue-800 block mb-0.5">Cropping Guide:</span>
                  Click and drag your mouse directly on the image to draw a crop boundary. Click "Clear Crop Area" to insert the full image.
                </div>

                {/* Image alignment */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Align Position</span>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setImageAlign('left')}
                      className={cn(
                        "h-8 text-xs font-semibold rounded border transition-all cursor-pointer",
                        imageAlign === 'left' 
                          ? "bg-[#1e73be] border-[#1e73be] text-white shadow-xs" 
                          : "bg-background border-border/60 text-muted-foreground hover:bg-muted/30"
                      )}
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageAlign('center')}
                      className={cn(
                        "h-8 text-xs font-semibold rounded border transition-all cursor-pointer",
                        imageAlign === 'center' 
                          ? "bg-[#1e73be] border-[#1e73be] text-white shadow-xs" 
                          : "bg-background border-border/60 text-muted-foreground hover:bg-muted/30"
                      )}
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageAlign('right')}
                      className={cn(
                        "h-8 text-xs font-semibold rounded border transition-all cursor-pointer",
                        imageAlign === 'right' 
                          ? "bg-[#1e73be] border-[#1e73be] text-white shadow-xs" 
                          : "bg-background border-border/60 text-muted-foreground hover:bg-muted/30"
                      )}
                    >
                      Right
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset Crop button */}
              <div>
                <button
                  type="button"
                  onClick={() => setCropBox(null)}
                  disabled={!cropBox}
                  className="w-full h-8 text-[11px] border border-border/60 rounded text-muted-foreground hover:bg-muted/30 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                >
                  Clear Crop Area
                </button>
              </div>

            </div>

          </div>

          <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end mt-2">
            <button
              type="button"
              onClick={() => {
                setIsCustomizerOpen(false);
                setImageObj(null);
                setCropBox(null);
              }}
              className="h-9 px-4 text-xs font-medium border border-border/60 rounded text-muted-foreground hover:bg-muted/30 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInsertCustomImage}
              className="h-9 px-5 text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-white rounded shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Insert Image
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
