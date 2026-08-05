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
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState(value || '');

  // Table Modal Dialog State
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(5);
  const [tableCols, setTableCols] = useState(2);
  const [tableWidth, setTableWidth] = useState('100%');

  const editor = useEditor({
    extensions: [
      StarterKit,
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
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setHtmlContent(html);
      onChange(html);
    },
  });

  // Sync value when parent resets form
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || '<p></p>');
      setHtmlContent(value || '');
    }
  }, [value, editor]);

  if (!editor) return null;

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
    const url = window.prompt('Enter Link URL:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleConfirmInsertTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: Number(tableRows) || 3, cols: Number(tableCols) || 2, withHeaderRow: true })
      .run();
    setShowTableModal(false);
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

  const handleHtmlTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setHtmlContent(val);
    onChange(val);
    if (editor) {
      editor.commands.setContent(val);
    }
  };

  return (
    <div className={cn('relative border border-border rounded-2xl overflow-hidden bg-card shadow-2xs', className)}>
      {/* Insert Table Modal Popup */}
      {showTableModal && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xl w-72 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <TableIcon className="h-3.5 w-3.5 text-primary" />
                Insert Table
              </h4>
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <label className="font-semibold text-foreground">Rows</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={(e) => setTableRows(Number(e.target.value))}
                  className="h-8 w-24 text-xs font-semibold rounded-lg bg-background"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="font-semibold text-foreground">Columns</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={tableCols}
                  onChange={(e) => setTableCols(Number(e.target.value))}
                  className="h-8 w-24 text-xs font-semibold rounded-lg bg-background"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="font-semibold text-foreground">Width</label>
                <Input
                  type="text"
                  value={tableWidth}
                  onChange={(e) => setTableWidth(e.target.value)}
                  className="h-8 w-24 text-xs font-semibold rounded-lg bg-background"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTableModal(false)}
                className="h-8 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmInsertTable}
                className="h-8 text-xs font-bold rounded-xl"
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}

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
          onClick={() => setShowTableModal(true)}
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

        <div className="h-4 w-px bg-border/60 mx-1" />

        {/* HTML Source View Toggle */}
        <Button
          type="button"
          variant={isHtmlMode ? 'default' : 'ghost'}
          size="sm"
          className="h-8 px-2 rounded-lg text-xs gap-1 ml-auto"
          onClick={() => setIsHtmlMode(!isHtmlMode)}
          title="Toggle HTML Source"
        >
          {isHtmlMode ? <Edit3 className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
          <span>{isHtmlMode ? 'Visual' : 'HTML'}</span>
        </Button>
      </div>

      {/* Editor Body */}
      <div className="p-3 bg-background min-h-[160px] text-xs leading-relaxed text-foreground">
        {isHtmlMode ? (
          <textarea
            value={htmlContent}
            onChange={handleHtmlTextareaChange}
            className="w-full h-40 p-2 font-mono text-xs bg-muted/20 border border-border/60 rounded-xl focus:outline-none resize-y"
            placeholder="<html>...</html>"
          />
        ) : (
          <EditorContent editor={editor} className="prose prose-sm max-w-none focus:outline-none min-h-[140px]" />
        )}
      </div>
    </div>
  );
}
