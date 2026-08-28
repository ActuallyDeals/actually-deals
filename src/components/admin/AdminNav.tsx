import Link from "next/link";

export function AdminNav() {
  return (
    <div className="border-b border-slate-200 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-6xl gap-4 px-4 py-2 text-sm font-semibold">
        <span className="text-slate-400">Staff</span>
        <Link href="/admin" className="hover:text-green-300">
          New deal
        </Link>
        <Link href="/admin/settings" className="hover:text-green-300">
          Affiliate settings
        </Link>
        <Link href="/" className="ml-auto text-slate-400 hover:text-white">
          View site
        </Link>
      </div>
    </div>
  );
}
