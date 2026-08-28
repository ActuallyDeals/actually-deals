"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { loadVote, saveVote } from "@/lib/store";
import type { Deal } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AliveVoteBar({ deal }: { deal: Deal }) {
  const [current, setCurrent] = useState(deal);
  const [vote, setVote] = useState(() => loadVote(deal.id));
  const total = current.upvotes + current.downvotes;
  const alivePercent = total === 0 ? 0 : Math.round((current.upvotes / total) * 100);
  const expiredShare = total === 0 ? 0 : current.downvotes / total;

  function onVote(isAlive: boolean) {
    const result = saveVote(current, isAlive);
    setCurrent(result.deal);
    setVote(result.vote);
    toast.success(isAlive ? "Marked still alive" : "Marked expired");
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Is this deal still alive?</h2>
          <p className="text-sm text-slate-500">
            {total === 0
              ? "Be the first hunter to confirm checkout."
              : `${alivePercent}% of users confirm this deal is active`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onVote(true)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold",
              vote?.isAlive === true
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
            )}
          >
            <ThumbsUp className="size-4" />
            Still Alive ({current.upvotes})
          </button>
          <button
            type="button"
            onClick={() => onVote(false)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold",
              vote?.isAlive === false
                ? "bg-red-600 text-white"
                : "bg-red-50 text-red-800 hover:bg-red-100",
            )}
          >
            <ThumbsDown className="size-4" />
            Expired ({current.downvotes})
          </button>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{ width: `${total === 0 ? 0 : alivePercent}%` }}
        />
      </div>
      {expiredShare > 0.7 ? (
        <p className="mt-3 text-sm font-semibold text-amber-800">
          ⚠️ Reported Expired — more than 70% of voters say checkout no longer matches.
        </p>
      ) : null}
    </section>
  );
}
