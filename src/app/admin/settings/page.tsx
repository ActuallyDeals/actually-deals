"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getAmazonTag, setAmazonTag } from "@/lib/affiliate-client";

export default function SettingsPage() {
  const [tag, setTag] = useState("");

  useEffect(() => {
    setTag(getAmazonTag());
  }, []);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-black text-slate-900">Affiliate settings</h1>
      <p className="mt-2 text-sm text-slate-500">
        Paste your Amazon Associates tag. Every Amazon Get Deal click will append it. Other stores
        use the raw product link until you add those networks later.
      </p>
      <label className="mt-6 block text-sm font-semibold text-slate-800">
        Amazon tag
        <input
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          placeholder="yourtag-20"
          className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3"
        />
      </label>
      <button
        type="button"
        onClick={() => {
          setAmazonTag(tag);
          toast.success("Amazon tag saved on this browser");
        }}
        className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
      >
        Save
      </button>
      <p className="mt-6 text-xs leading-5 text-slate-400">
        X / Twitter cannot post by itself until you create a developer app and send those keys.
        Until then, copy the share post from the staff desk.
      </p>
    </div>
  );
}
