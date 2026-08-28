import Link from "next/link";

export function SiteLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden className="shrink-0">
        <rect width="36" height="36" rx="9" fill="#16a34a" />
        <path
          d="M10 14.5h16l-1.6 10.2A2 2 0 0 1 22.5 26h-9a2 2 0 0 1-1.9-1.3L10 14.5Z"
          fill="#fff"
        />
        <path d="M13 14.5c0-2.4 1.8-4.5 5-4.5s5 2.1 5 4.5" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="26.5" cy="11" r="5" fill="#facc15" />
        <path d="M26.5 8.4v5.2M24 11h5" stroke="#166534" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      {compact ? null : (
        <span className="text-[1.15rem] font-extrabold tracking-tight text-slate-900">
          Actually Deals
        </span>
      )}
    </Link>
  );
}
