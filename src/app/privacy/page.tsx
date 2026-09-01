import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Privacy",
  description: "What Actually Deals stores when you vote or comment.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-col bg-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Privacy</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          We may set a cookie so a vote can be changed. Comments keep the name and text you type. We
          do not sell that.
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Merchant sites have their own policies. Affiliate networks may count a Get Deal click.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
