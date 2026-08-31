import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SOCIAL } from "@/lib/social";

export const metadata = {
  title: "Contact",
  description: "How to reach Actually Deals.",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-full flex-col bg-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Contact</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Questions about a listing, a dead price, or this site: email{" "}
          <a
            href="mailto:deals@actuallydeals.com"
            className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
          >
            deals@actuallydeals.com
          </a>
          .
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          We read every note. We cannot hold inventory or honor a merchant&apos;s checkout total from
          here — confirm the price on the store page before you pay.
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          On social:{" "}
          <a href={SOCIAL.x.url} className="font-semibold text-emerald-700 hover:underline">
            X {SOCIAL.x.handle}
          </a>
          ,{" "}
          <a href={SOCIAL.instagram.url} className="font-semibold text-emerald-700 hover:underline">
            Instagram {SOCIAL.instagram.handle}
          </a>
          , and{" "}
          <a href={SOCIAL.facebook.url} className="font-semibold text-emerald-700 hover:underline">
            Facebook {SOCIAL.facebook.handle}
          </a>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
