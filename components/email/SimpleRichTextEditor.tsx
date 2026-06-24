"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type SimpleRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  className?: string;
};

export function SimpleRichTextEditor({
  value,
  onChange,
  disabled = false,
  className,
}: SimpleRichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const exec = useCallback((command: string) => {
    document.execCommand(command, false);
    const el = ref.current;
    if (el) onChange(el.innerHTML);
  }, [onChange]);

  return (
    <div className={cn("flex flex-col rounded-lg border border-slate-200", className)}>
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        {[
          { label: "B", cmd: "bold", title: "Bold (Ctrl+B)" },
          { label: "I", cmd: "italic", title: "Italic (Ctrl+I)" },
          { label: "U", cmd: "underline", title: "Underline" },
          { label: "• List", cmd: "insertUnorderedList", title: "Bullet list" },
          { label: "1. List", cmd: "insertOrderedList", title: "Numbered list" },
        ].map((item) => (
          <button
            key={item.cmd}
            type="button"
            title={item.title}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(item.cmd)}
            className="rounded px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline
        contentEditable={!disabled}
        suppressContentEditableWarning
        className="min-h-[200px] max-h-[40vh] overflow-y-auto px-3 py-2 text-sm text-slate-800 focus:outline-none"
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      />
    </div>
  );
}
