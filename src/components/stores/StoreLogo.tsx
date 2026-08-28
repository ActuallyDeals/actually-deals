import { cn } from "@/lib/utils";

const LOGOS: Record<string, { bg: string; fg: string; mark: string }> = {
  amazon: { bg: "bg-[#232F3E]", fg: "text-[#FF9900]", mark: "amazon" },
  walmart: { bg: "bg-[#0071DC]", fg: "text-white", mark: "walmart" },
  target: { bg: "bg-[#CC0000]", fg: "text-white", mark: "target" },
  "best-buy": { bg: "bg-[#0046BE]", fg: "text-[#FFF200]", mark: "bestbuy" },
  "home-depot": { bg: "bg-[#F96302]", fg: "text-white", mark: "homedepot" },
  costco: { bg: "bg-[#E31837]", fg: "text-white", mark: "costco" },
  macys: { bg: "bg-[#E11A2C]", fg: "text-white", mark: "macys" },
  "macy-s": { bg: "bg-[#E11A2C]", fg: "text-white", mark: "macys" },
};

function mark(kind: string) {
  if (kind === "amazon") {
    return (
      <svg viewBox="0 0 24 24" className="size-3.5 fill-current">
        <path d="M13.2 9.1c0-1.2.1-2.2-1-3-.9-.6-2.1-.3-2.8.4-.3-1.4.8-2.8 2.2-3.1 1.8-.4 3.7.5 4.2 2.3.3 1.2.2 2.5.2 3.8v4.3c0 1.3.4 1.8 1.1 2.1v.4c-1.8.4-3.3-.3-3.4-2.2-.9 1.6-2.5 2.4-4.3 2.4-2.1 0-3.9-1.4-3.9-3.7 0-3.1 3-4 5.8-4h1.9Zm-1.8 5.6c.8 0 1.6-.4 2-1.2.3-.6.3-1.4.3-2.1h-1.5c-1.8 0-3.5.5-3.5 2.2 0 1.4 1 2.1 2.7 2.1Z" />
      </svg>
    );
  }
  if (kind === "target") {
    return (
      <svg viewBox="0 0 24 24" className="size-3.5 fill-current">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="12" cy="12" r="3.2" />
      </svg>
    );
  }
  if (kind === "walmart") {
    return (
      <svg viewBox="0 0 24 24" className="size-3.5 fill-current">
        <circle cx="12" cy="5.2" r="1.5" />
        <circle cx="18.1" cy="8.6" r="1.5" />
        <circle cx="18.1" cy="15.4" r="1.5" />
        <circle cx="12" cy="18.8" r="1.5" />
        <circle cx="5.9" cy="15.4" r="1.5" />
        <circle cx="5.9" cy="8.6" r="1.5" />
      </svg>
    );
  }
  return <span className="text-[10px] font-black uppercase">{kind.slice(0, 2)}</span>;
}

export function storeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function StoreLogo({ name, className }: { name: string; className?: string }) {
  const key = storeKey(name);
  const style = LOGOS[key] ?? { bg: "bg-slate-100", fg: "text-slate-700", mark: "other" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        style.bg,
        style.fg,
        className,
      )}
    >
      {mark(style.mark)}
      {name}
    </span>
  );
}
