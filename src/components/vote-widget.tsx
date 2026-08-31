"use client";

import { useState } from "react";
import type { VoteChoice } from "@/lib/types";
import { cn } from "@/lib/utils";

interface VoteWidgetProps {
  slug: string;
  aliveVotes: number;
  expiredVotes: number;
  initialVote: VoteChoice | null;
}

export function VoteWidget({ slug, aliveVotes, expiredVotes, initialVote }: VoteWidgetProps) {
  const [alive, setAlive] = useState(aliveVotes);
  const [expired, setExpired] = useState(expiredVotes);
  const [mine, setMine] = useState<VoteChoice | null>(initialVote);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = alive + expired;
  const alivePct = total === 0 ? 50 : Math.round((alive / total) * 100);

  async function vote(choice: VoteChoice) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/deals/${slug}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      });
      const payload = (await response.json()) as {
        error?: string;
        aliveVotes?: number;
        expiredVotes?: number;
        myVote?: VoteChoice;
      };
      if (!response.ok) throw new Error(payload.error || "Vote failed.");
      setAlive(payload.aliveVotes ?? alive);
      setExpired(payload.expiredVotes ?? expired);
      setMine(payload.myVote ?? choice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Is this deal still alive?</h2>
          <p className="mt-1 text-sm text-slate-500">
            One vote per browser. Switch if the price disappears.
          </p>
        </div>
        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{total} votes</p>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-red-100">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${alivePct}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => vote("alive")}
          className={cn(
            "h-12 rounded-xl border text-sm font-bold transition",
            mine === "alive"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400",
          )}
        >
          Alive · {alive}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => vote("expired")}
          className={cn(
            "h-12 rounded-xl border text-sm font-bold transition",
            mine === "expired"
              ? "border-red-600 bg-red-600 text-white"
              : "border-red-200 bg-red-50 text-red-800 hover:border-red-400",
          )}
        >
          Expired · {expired}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
