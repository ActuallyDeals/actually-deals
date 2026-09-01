import { AdminLogin, AdminUnauthorized } from "@/components/admin-login";
import { AdminPublisher } from "@/components/admin-publisher";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isAdmin, isAdminConfigured } from "@/lib/auth";
import { listPublishedDeals, listQueuedDeals } from "@/lib/store";
import { persistenceMode } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isAdminConfigured()) {
    return (
      <div className="flex min-h-full flex-col bg-slate-100">
        <SiteHeader admin />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
          <AdminUnauthorized />
        </main>
        <SiteFooter />
      </div>
    );
  }

  const signedIn = await isAdmin();
  const queued = signedIn ? await listQueuedDeals() : [];
  const live = signedIn ? await listPublishedDeals() : [];

  return (
    <div className="flex min-h-full flex-col bg-slate-100">
      <SiteHeader admin />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
        {signedIn ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <a href="/admin/settings" className="text-sm font-medium text-emerald-700">
                Affiliate settings
              </a>
            </div>
            <AdminPublisher persistence={persistenceMode()} queued={queued} live={live} />
          </div>
        ) : (
          <AdminLogin />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
