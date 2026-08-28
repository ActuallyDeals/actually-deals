"use client";

import { useState } from "react";

import { CopyButton } from "@/components/deals/CopyButton";
import { withAffiliate } from "@/lib/affiliate-client";

export function CouponModal({
  code,
  merchantName,
  dealUrl,
}: {
  code: string;
  merchantName: string;
  dealUrl: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-bold text-green-800 hover:bg-green-100"
      >
        Show coupon
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-wide text-green-700">Coupon</p>
            <p className="mt-2 text-2xl font-black tracking-wide text-slate-900">{code}</p>
            <p className="mt-2 text-sm text-slate-500">
              Copy it, then open {merchantName}. Some stores apply the code by themselves.
            </p>
            <div className="mt-4 flex gap-2">
              <CopyButton value={code} label="Copy code" className="px-3 py-2 text-xs" />
              <a
                href={withAffiliate(dealUrl)}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-green-600 py-2 text-sm font-bold text-white hover:bg-green-700"
              >
                Go to {merchantName}
              </a>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full text-sm font-semibold text-slate-500"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
