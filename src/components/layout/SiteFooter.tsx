import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <p className="font-semibold text-slate-800">Affiliate disclosure</p>
          <p className="mt-2 leading-6">
            Some links are affiliate links. If you click one and buy, we may earn a commission at no
            extra cost to you. Confirm the total at checkout.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 font-semibold">
          <Link href="/about" className="hover:text-slate-900">
            About
          </Link>
          <Link href="/disclosure" className="hover:text-slate-900">
            Disclosure
          </Link>
          <Link href="/privacy" className="hover:text-slate-900">
            Privacy
          </Link>
          <Link href="/rss.xml" className="hover:text-slate-900">
            RSS
          </Link>
        </nav>
      </div>
    </footer>
  );
}
