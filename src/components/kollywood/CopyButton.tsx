import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Copy-to-clipboard button with a satisfying "copied" micro-interaction. */
export function CopyButton({
  value,
  label = "COPY",
  copiedLabel = "COPIED",
  successMessage = "Copied to clipboard",
  className,
  variant = "outline",
  size = "default",
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  successMessage?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API can be unavailable in embedded webviews.
      try {
        const area = document.createElement("textarea");
        area.value = value;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      } catch {
        toast.error("Could not copy — select the text manually.");
        return;
      }
    }
    setCopied(true);
    toast.success(successMessage);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={copy}
      className={cn(
        "transition-all",
        copied &&
          "border-primary/60 text-primary shadow-[0_0_18px_rgba(245,197,66,0.25)]",
        className,
      )}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {copied ? copiedLabel : label}
    </Button>
  );
}
