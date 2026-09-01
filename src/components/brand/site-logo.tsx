import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#0F172A" />
      <path
        d="M8.4 14.1 15.9 6.6c.5-.5 1.2-.5 1.7 0l7.8 7.8c.5.5.5 1.2 0 1.7l-7.5 7.5c-.5.5-1.2.5-1.7 0l-7.8-7.8c-.5-.5-.5-1.2 0-1.7Z"
        fill="#F8FAFC"
      />
      <circle cx="20.3" cy="11.5" r="1.55" fill="#0F172A" />
      <rect x="8" y="24.2" width="16" height="2.6" rx="1.3" fill="#059669" />
    </svg>
  );
}

export function SiteLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className="size-8" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={cn("font-semibold tracking-tight", compact ? "text-base" : "text-lg sm:text-xl")}>
          <span className="text-slate-950">Actually</span>
          <span className="text-emerald-600"> Deals</span>
        </span>
        {compact ? null : (
          <span className="text-[11px] font-normal tracking-normal text-slate-500">
            Deals that are actually good!
          </span>
        )}
      </span>
    </span>
  );
}
