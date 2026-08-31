import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isAdmin, isAdminConfigured } from "@/lib/auth";
import { affiliateTags } from "@/lib/affiliate";
import { AdminLogin, AdminUnauthorized } from "@/components/admin-login";

export const dynamic = "force-dynamic";

function status(value: string): string {
  return value ? "Set on this server" : "Not set — Get Deal uses a clean merchant URL";
}

export default async function AdminSettingsPage() {
  if (!isAdminConfigured()) {
    return (
      <div className="flex min-h-full flex-col bg-slate-100">
        <SiteHeader admin />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
          <AdminUnauthorized />
        </main>
        <SiteFooter />
      </div>
    );
  }

  const signedIn = await isAdmin();
  const tags = signedIn ? affiliateTags() : null;

  return (
    <div className="flex min-h-full flex-col bg-slate-100">
      <SiteHeader admin />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        {signedIn && tags ? (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-semibold text-slate-950">Affiliate settings</h1>
              <Link href="/admin" className="text-sm font-medium text-emerald-700">
                Back to the desk
              </Link>
            </div>
            <p className="text-sm text-slate-500">
              Tags are environment variables. This page cannot write Vercel secrets. Amazon defaults
              to Store ID <code>actuallydea07-20</code>. Other empty tags stay clean merchant links.
            </p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-slate-900">Amazon</dt>
                <dd className="text-slate-600">
                  {status(tags.amazon)} · Store ID <code>actuallydea07-20</code> via{" "}
                  <code>NEXT_PUBLIC_AMAZON_AFFILIATE_TAG</code> or <code>AFFILIATE_AMAZON_TAG</code>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Walmart</dt>
                <dd className="text-slate-600">{status(tags.walmart)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Target</dt>
                <dd className="text-slate-600">{status(tags.target)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Home Depot</dt>
                <dd className="text-slate-600">{status(tags["home-depot"])}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Best Buy</dt>
                <dd className="text-slate-600">{status(tags["best-buy"])}</dd>
              </div>
            </dl>
          </section>
        ) : (
          <AdminLogin />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
