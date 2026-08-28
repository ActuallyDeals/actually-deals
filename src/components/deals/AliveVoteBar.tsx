"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { Deal } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AliveVoteBar({ deal }: { deal: Deal }) {
  const [current, setCurrent] = useState(deal);
  const [voted, setVoted] = useState<"alive" | "expired" | null>(null);
  const total = current.upvotes + current.downvotes;
  const alivePercent = total === 0 ? 0 : Math.round((current.upvotes / total) * 100);

  async function onVote(isAlive: boolean) {
    if (voted) {
      return;
    }
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: current.slug, isAlive }),
      });
      const payload = (await response.json()) as { deal?: Deal; error?: string };
      if (!response.ok || !payload.deal) {
        throw new Error(payload.error || "Could not vote.");
      }
      setCurrent(payload.deal);
      setVoted(isAlive ? "alive" : "expired");
      toast.success(isAlive ? "Marked still good" : "Marked expired");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not vote.");
    }
  }

  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">Was this deal still good?</h2>
          <p className="text-sm text-slate-500">
            {total === 0
              ? "Be the first to confirm checkout."
              : `${alivePercent}% say this deal is still live`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void onVote(true)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-bold",
              voted === "alive" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800",
            )}
          >
            Still good ({current.upvotes})
          </button>
          <button
            type="button"
            onClick={() => void onVote(false)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-bold",
              voted === "expired" ? "bg-red-600 text-white" : "bg-red-50 text-red-800",
            )}
          >
            Expired ({current.downvotes})
          </button>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{ width: `${total === 0 ? 0 : alivePercent}%` }}
        />
      </div>
    </section>
  );
}
