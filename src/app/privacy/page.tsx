import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-black text-slate-900">Privacy</h1>
      <p className="mt-4 text-slate-600 leading-7">
        Comments you type on a deal page are stored so other readers can see them. We do not sell
        that text. Affiliate clicks go to the retailer. If you want a comment removed, email
        hello@actuallydeals.com.
      </p>
    </article>
  );
}
