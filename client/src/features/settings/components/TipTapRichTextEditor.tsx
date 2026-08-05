import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, RemoveFormatting, Heading1, Heading2, Heading3, TextQuote
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
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: content || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync editor content if content prop changes externally (e.g. form reset or selection)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-border/90 rounded-2xl overflow-hidden bg-background shadow-2xs text-foreground focus-within:ring-2 focus-within:ring-primary/20 transition-all">
      {/* ─── TipTap Toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/40 border-b border-border text-foreground">
        {/* Bold */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          title="Bold"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive('bold')
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          title="Italic"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive('italic')
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={disabled}
          title="Underline"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive('underline')
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled}
          title="Strikethrough"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive('strike')
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </button>

        <div className="h-4 w-px bg-border my-auto mx-1" />

        {/* Bullet List */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          title="Bullet List"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive('bulletList')
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <List className="h-3.5 w-3.5" />
        </button>

        {/* Ordered List */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          title="Numbered List"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive('orderedList')
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>

        <div className="h-4 w-px bg-border my-auto mx-1" />

        {/* Align Left */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          disabled={disabled}
          title="Align Left"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive({ textAlign: 'left' })
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </button>

        {/* Align Center */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          disabled={disabled}
          title="Align Center"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive({ textAlign: 'center' })
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </button>

        {/* Align Right */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          disabled={disabled}
          title="Align Right"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive({ textAlign: 'right' })
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </button>

        {/* Align Justify */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          disabled={disabled}
          title="Align Justify"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive({ textAlign: 'justify' })
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <AlignJustify className="h-3.5 w-3.5" />
        </button>

        <div className="h-4 w-px bg-border my-auto mx-1" />

        {/* Heading 1 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={disabled}
          title="Heading 1"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive('heading', { level: 1 })
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <Heading1 className="h-3.5 w-3.5" />
        </button>

        {/* Heading 2 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
          title="Heading 2"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive('heading', { level: 2 })
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </button>

        {/* Heading 3 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={disabled}
          title="Heading 3"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive('heading', { level: 3 })
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <Heading3 className="h-3.5 w-3.5" />
        </button>

        {/* Blockquote */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={disabled}
          title="Quote"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive('blockquote')
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <TextQuote className="h-3.5 w-3.5" />
        </button>

        {/* Code */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={disabled}
          title="Code"
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
            editor.isActive('code')
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <Code className="h-3.5 w-3.5" />
        </button>

        <div className="h-4 w-px bg-border my-auto mx-1" />

        {/* Undo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || !editor.can().undo()}
          title="Undo"
          className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors disabled:opacity-40"
        >
          <Undo className="h-3.5 w-3.5" />
        </button>

        {/* Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().redo()}
          title="Redo"
          className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors disabled:opacity-40"
        >
          <Redo className="h-3.5 w-3.5" />
        </button>

        {/* Clear Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          disabled={disabled}
          title="Clear Formatting"
          className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
        >
          <RemoveFormatting className="h-3.5 w-3.5" />
        </button>

        <div className="ml-auto text-[10px] text-muted-foreground font-mono px-1">
          {editor.getText().length} chars
        </div>
      </div>

      {/* ─── Editor Content Container ──────────────────────────────────────── */}
      <div className="p-3.5 min-h-[140px] max-h-[300px] overflow-y-auto text-xs text-foreground font-normal leading-relaxed prose prose-sm dark:prose-invert max-w-none focus:outline-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
