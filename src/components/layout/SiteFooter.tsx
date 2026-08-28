export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm leading-6 text-slate-500">
        <p className="font-semibold text-slate-800">Affiliate disclosure</p>
        <p className="mt-2 max-w-3xl">
          Actually Deals is an independent deal desk. Some links on this site are affiliate links.
          If you click one and buy, we may earn a commission at no extra cost to you. We do not
          invent sale prices or MSRPs. When a retailer blocks a scrape, price fields stay blank
          until a human types the live checkout total. Offers change without notice. Always confirm
          the final price, tax, shipping, and coupon stack before you pay.
        </p>
        <p className="mt-4 text-xs text-slate-400">
          © {new Date().getFullYear()} Actually Deals · Affiliate link · Terms apply
        </p>
      </div>
    </footer>
  );
}
