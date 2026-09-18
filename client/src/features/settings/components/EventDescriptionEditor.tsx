import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Code, Image as ImageIcon, Link as LinkIcon, Subscript as SubIcon,
  Superscript as SuperIcon, Strikethrough, Quote, Table as TableIcon, Eye, Edit3, X,
  Square, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EventDescriptionEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
}

export function EventDescriptionEditor({
  value,
  onChange,
  className,
}: EventDescriptionEditorProps) {
  const [htmlContent, setHtmlContent] = useState(value || '');
  const [editorReady, setEditorReady] = useState(false);

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
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Subscript,
      Superscript,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '<p></p>',
    onCreate: () => {
      setEditorReady(true);
    },
    onUpdate: ({ editor }) => {
      if (editor.isDestroyed) return;
      const html = editor.getHTML();
      setHtmlContent(html);
      onChange(html);
    },
  });

  // Sync value when parent resets form
  useEffect(() => {
    if (!editor || editor.isDestroyed || !editorReady) return;
    try {
      const current = editor.getHTML();
      if (value !== undefined && value !== current) {
        editor.commands.setContent(value || '<p></p>');
        setHtmlContent(value || '');
      }
    } catch {
      // editor schema not ready yet, skip
    }
  }, [value, editor, editorReady]);

  if (!editor || !editorReady) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        if (src) {
          editor.chain().focus().setImage({ src }).run();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = await window.appPrompt('Enter Link URL:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleInsertTable = () => {
    const rowsStr = await window.appPrompt('Enter number of rows:', '3');
    if (rowsStr === null) return;
    const colsStr = await window.appPrompt('Enter number of columns:', '3');
    if (colsStr === null) return;

    const rows = parseInt(rowsStr, 10) || 3;
    const cols = parseInt(colsStr, 10) || 3;

    editor
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run();
  };

  const handleInsertTextBox = () => {
    editor
      .chain()
      .focus()
      .insertContent(
        '<blockquote style="border-left: 3px solid #3b82f6; padding: 10px 14px; background: rgba(59, 130, 246, 0.05); margin: 10px 0; border-radius: 8px;"><p>Insert Callout / Text Box Content Here...</p></blockquote>'
      )
      .run();
  };

  return (
    <div className={cn('relative border border-border rounded-2xl bg-card shadow-2xs', className)} style={{ isolation: 'isolate' }}>
      <style>{`
        .ProseMirror h1 {
          font-size: 2em !important;
          font-weight: bold !important;
          margin-top: 0.67em !important;
          margin-bottom: 0.67em !important;
          display: block !important;
        }
        .ProseMirror h2 {
          font-size: 1.5em !important;
          font-weight: bold !important;
          margin-top: 0.83em !important;
          margin-bottom: 0.83em !important;
          display: block !important;
        }
        .ProseMirror h3 {
          font-size: 1.17em !important;
          font-weight: bold !important;
          margin-top: 1em !important;
          margin-bottom: 1em !important;
          display: block !important;
        }
        .ProseMirror h4 {
          font-size: 1em !important;
          font-weight: bold !important;
          margin-top: 1.33em !important;
          margin-bottom: 1.33em !important;
          display: block !important;
        }
        .ProseMirror p {
          margin-bottom: 0.5em !important;
        }
        .ProseMirror ul {
          list-style-type: disc !important;
          padding-left: 40px !important;
          margin-top: 1em !important;
          margin-bottom: 1em !important;
        }
        .ProseMirror ol {
          list-style-type: decimal !important;
          padding-left: 40px !important;
          margin-top: 1em !important;
          margin-bottom: 1em !important;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #3b82f6 !important;
          padding: 10px 14px !important;
          background: rgba(59, 130, 246, 0.05) !important;
          margin: 10px 0 !important;
          border-radius: 8px !important;
        }
        .ProseMirror table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 10px 0 !important;
        }
        .ProseMirror th, .ProseMirror td {
          border: 1px solid #cbd5e1 !important;
          padding: 8px !important;
          min-width: 50px !important;
        }
        .ProseMirror th {
          background-color: #f1f5f9 !important;
          font-weight: bold !important;
        }
      `}</style>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/40 border-b border-border/70 text-xs">
        {/* Bold / Italic / Underline / Strike */}
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('underline') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('strike') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </Button>

        <div className="h-4 w-px bg-border/60 mx-1" />

        {/* Alignment */}
        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align Left"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align Center"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align Right"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          title="Justify"
        >
          <AlignJustify className="h-3.5 w-3.5" />
        </Button>

        <div className="h-4 w-px bg-border/60 mx-1" />

        {/* Lists */}
        <Button
          type="button"
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          <Quote className="h-3.5 w-3.5" />
        </Button>

        <div className="h-4 w-px bg-border/60 mx-1" />

        {/* Font Family Dropdown */}
        <select
          value={editor.getAttributes('textStyle').fontFamily || ''}
          onChange={(e) => {
            if (e.target.value) {
              editor.chain().focus().setFontFamily(e.target.value).run();
            } else {
              editor.chain().focus().unsetFontFamily().run();
            }
          }}
          className="h-8 px-2 text-xs bg-background border border-border/80 rounded-lg text-foreground focus:outline-none"
        >
          <option value="">Font Family...</option>
          <option value="Inter">Inter</option>
          <option value="Roboto">Roboto</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Courier New">Courier New</option>
        </select>

        {/* Font Format / Heading Dropdown */}
        <select
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1' :
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' :
            editor.isActive('heading', { level: 4 }) ? 'h4' :
            editor.isActive('paragraph') ? 'p' :
            ''
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'p') editor.chain().focus().setParagraph().run();
            else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
            else if (val === 'h4') editor.chain().focus().toggleHeading({ level: 4 }).run();
          }}
          className="h-8 px-2 text-xs bg-background border border-border/80 rounded-lg text-foreground focus:outline-none"
        >
          <option value="">Font Format...</option>
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
        </select>

        <div className="h-4 w-px bg-border/60 mx-1" />

        {/* Subscript / Superscript */}
        <Button
          type="button"
          variant={editor.isActive('subscript') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          title="Subscript"
        >
          <SubIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('superscript') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          title="Superscript"
        >
          <SuperIcon className="h-3.5 w-3.5" />
        </Button>

        {/* Image & Link & Insert Table & Insert Text Box */}
        <label className="h-8 w-8 p-0 rounded-lg hover:bg-muted inline-flex items-center justify-center cursor-pointer text-foreground" title="Insert Image">
          <ImageIcon className="h-3.5 w-3.5" />
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
        <Button
          type="button"
          variant={editor.isActive('link') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={handleAddLink}
          title="Insert Link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={handleInsertTable}
          title="Insert Table (Rows/Cols)"
        >
          <TableIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={handleInsertTextBox}
          title="Insert Text Box / Callout"
        >
          <FileText className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Editor Body */}
      <div className="relative p-3 bg-background min-h-[160px] text-xs leading-relaxed text-foreground">
        <EditorContent editor={editor} className="prose prose-sm max-w-none focus:outline-none min-h-[140px]" />
      </div>
    </div>
  );
}
