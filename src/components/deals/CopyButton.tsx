"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

type CopyButtonProps = {
  value: string;
  label?: string;
  className?: string;
};

export function CopyButton({
  value,
  label = "Copy Code",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label.replace(/^Copy /, "")} copied`);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy. Select the text and copy manually.");
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-blue-700",
        className,
      )}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}
