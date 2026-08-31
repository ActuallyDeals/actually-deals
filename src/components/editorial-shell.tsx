import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function EditorialShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
