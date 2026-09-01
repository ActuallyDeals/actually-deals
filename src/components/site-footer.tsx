import Link from "next/link";
import { AMAZON_ASSOCIATE_DISCLOSURE } from "@/lib/disclosures";
import { SOCIAL } from "@/lib/social";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Deals that are actually good!
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/disclosure" className="hover:text-slate-900">
              Disclosure
            </Link>
            <Link href="/privacy" className="hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-slate-900">
              Contact
            </Link>
            <a href="/rss.xml" className="hover:text-slate-900">
              RSS
            </a>
          </div>
        </div>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          <a href={SOCIAL.x.url} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">
            X {SOCIAL.x.handle}
          </a>
          <a
            href={SOCIAL.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-600"
          >
            Instagram {SOCIAL.instagram.handle}
          </a>
          <a
            href={SOCIAL.facebook.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-600"
          >
            Facebook {SOCIAL.facebook.handle}
          </a>
        </p>
        <p className="text-xs text-slate-400">{AMAZON_ASSOCIATE_DISCLOSURE}</p>
      </div>
    </footer>
  );
}
