"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import CharacterCount from "@tiptap/extension-character-count";
import { AlignCenter, AlignLeft, AlignRight, Bold, Heading2, Italic, Link2, List, ListOrdered, Quote, Redo2, RemoveFormatting, Strikethrough, UnderlineIcon, Undo2, Unlink } from "lucide-react";
import { cn } from "@/lib/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
  placeholder?: string;
  minHeight?: "sm" | "lg";
  maxLength?: number;
  onCharacterCountChange?: (count: number) => void;
  disabled?: boolean;
  className?: string;
};

function ToolbarButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Tooltip><TooltipTrigger render={<button type="button" aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick} className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-neutral-tint hover:text-ink disabled:pointer-events-none disabled:opacity-40", active && "bg-neutral-tint text-ink")} />}>{children}</TooltipTrigger><TooltipContent side="top">{label}</TooltipContent></Tooltip>;
}

export function RichTextEditor({ value, onChange, ariaLabel, placeholder = "Start writing…", minHeight = "sm", maxLength, onCharacterCountChange, disabled = false, className }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    content: value || "",
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ autolink: true, openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CharacterCount.configure({ limit: maxLength }),
    ],
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        class: cn("rich-text-content px-3 py-3 text-[13px] leading-6 text-ink outline-none", minHeight === "lg" ? "min-h-64" : "min-h-32"),
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.isEmpty ? "" : currentEditor.getHTML();
      onChange(html);
      onCharacterCountChange?.(currentEditor.storage.characterCount.characters());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor || editor.getHTML() === value || (editor.isEmpty && !value)) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
    onCharacterCountChange?.(editor.storage.characterCount.characters());
  }, [editor, onCharacterCountChange, value]);

  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor?.isActive("bold") ?? false,
      italic: currentEditor?.isActive("italic") ?? false,
      underline: currentEditor?.isActive("underline") ?? false,
      strike: currentEditor?.isActive("strike") ?? false,
      heading: currentEditor?.isActive("heading", { level: 2 }) ?? false,
      bulletList: currentEditor?.isActive("bulletList") ?? false,
      orderedList: currentEditor?.isActive("orderedList") ?? false,
      blockquote: currentEditor?.isActive("blockquote") ?? false,
      link: currentEditor?.isActive("link") ?? false,
      alignLeft: currentEditor?.isActive({ textAlign: "left" }) ?? false,
      alignCenter: currentEditor?.isActive({ textAlign: "center" }) ?? false,
      alignRight: currentEditor?.isActive({ textAlign: "right" }) ?? false,
      canUndo: currentEditor?.can().undo() ?? false,
      canRedo: currentEditor?.can().redo() ?? false,
    }),
  });
  const toolbarState = state ?? {
    bold: false, italic: false, underline: false, strike: false, heading: false,
    bulletList: false, orderedList: false, blockquote: false, link: false,
    alignLeft: false, alignCenter: false, alignRight: false,
    canUndo: false, canRedo: false,
  };

  function setLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter the destination URL", previousUrl ?? "https://");
    if (url === null) return;
    if (!url.trim()) { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  if (!editor) return <div className={cn("min-h-40 animate-pulse rounded-md border border-border-strong bg-neutral-tint", className)} aria-label={`Loading ${ariaLabel}`} />;

  return <div className={cn("mt-2 overflow-hidden rounded-md border border-border-strong bg-surface focus-within:border-accent-strong focus-within:ring-1 focus-within:ring-accent-strong", className)}><div role="toolbar" aria-label={`${ariaLabel} formatting`} className="flex flex-wrap items-center gap-0.5 border-b border-border bg-canvas px-2 py-1.5"><ToolbarButton label="Undo" disabled={!toolbarState.canUndo || disabled} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Redo" disabled={!toolbarState.canRedo || disabled} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></ToolbarButton><span className="mx-1 h-5 w-px bg-border" /><ToolbarButton label="Heading" active={toolbarState.heading} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Bold" active={toolbarState.bold} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Italic" active={toolbarState.italic} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Underline" active={toolbarState.underline} disabled={disabled} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Strikethrough" active={toolbarState.strike} disabled={disabled} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolbarButton><span className="mx-1 h-5 w-px bg-border" /><ToolbarButton label="Bullet list" active={toolbarState.bulletList} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Numbered list" active={toolbarState.orderedList} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Block quote" active={toolbarState.blockquote} disabled={disabled} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolbarButton><span className="mx-1 h-5 w-px bg-border" /><ToolbarButton label="Align left" active={toolbarState.alignLeft} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Align center" active={toolbarState.alignCenter} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Align right" active={toolbarState.alignRight} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="h-4 w-4" /></ToolbarButton><span className="mx-1 h-5 w-px bg-border" /><ToolbarButton label={toolbarState.link ? "Edit link" : "Add link"} active={toolbarState.link} disabled={disabled} onClick={setLink}><Link2 className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Remove link" disabled={!toolbarState.link || disabled} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Clear formatting" disabled={disabled} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}><RemoveFormatting className="h-4 w-4" /></ToolbarButton></div><EditorContent editor={editor} />{maxLength ? <div className="border-t border-border px-3 py-1.5 text-right text-[10.5px] text-ink-muted" aria-live="polite">{editor.storage.characterCount.characters()} of {maxLength} characters</div> : null}</div>;
}
