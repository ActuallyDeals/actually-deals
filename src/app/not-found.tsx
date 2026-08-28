import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">404</p>
      <h1 className="mt-2 text-3xl font-black text-slate-900">That page is expired.</h1>
      <p className="mt-3 text-slate-500">
        The deal or route you wanted is gone. The live feed still has the current desk.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700"
      >
        Back to deals
      </Link>
    </div>
  );
}
