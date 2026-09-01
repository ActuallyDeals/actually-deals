import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#0F172A" />
      <path
        d="M12.25 13.25v-2.6a2.25 2.25 0 0 1 4.5 0"
        stroke="#34D399"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <path
        d="M15.25 13.25v-2.6a2.25 2.25 0 0 1 4.5 0"
        stroke="#34D399"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <rect x="8.5" y="12.75" width="15" height="13.5" rx="2.25" fill="#059669" />
      <path
        d="M12.4 19.85 14.95 22.4 20.05 16.55"
        stroke="#ECFDF5"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
