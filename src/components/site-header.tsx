import Link from "next/link";
import { SiteLogo } from "@/components/brand/site-logo";
import { persistenceMode } from "@/lib/supabase";

export function SiteHeader({ admin = false }: { admin?: boolean }) {
  const persistence = persistenceMode();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="min-w-0">
          <SiteLogo />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link href="/" className="hover:text-slate-950">
            Deals
          </Link>
          <Link href="/?filter=amazon" className="hover:text-slate-950">
            Amazon
          </Link>
          <Link href="/learn" className="hidden hover:text-slate-950 sm:inline">
            Learn
          </Link>
          <Link href="/contact" className="hidden hover:text-slate-950 sm:inline">
            Contact
          </Link>
          {admin ? (
            <>
              <Link
                href="/admin"
                className="rounded-full bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800"
              >
                Desk
              </Link>
              <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:inline">
                {persistence === "supabase" ? "Supabase live" : "Local store"}
              </span>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
