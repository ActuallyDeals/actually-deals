"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeTime } from "@/lib/format";
import type { DealComment } from "@/lib/types";

export function CommentThread({
  slug,
  initialComments,
}: {
  slug: string;
  initialComments: DealComment[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/deals/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name, body }),
      });
      const payload = (await response.json()) as { error?: string; comment?: DealComment };
      if (!response.ok || !payload.comment) {
        throw new Error(payload.error || "Could not post comment.");
      }
      setComments((current) => [...current, payload.comment!]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post comment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-950">
        Comments {comments.length > 0 ? `(${comments.length})` : ""}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Report cart totals, ZIP codes, and whether the merchant honored it.
      </p>

      {comments.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No field reports yet. Be the first to confirm the price.
        </p>
      ) : (
        <ol className="mt-5 space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold text-slate-900">{comment.authorName}</p>
                <p className="text-xs text-slate-400">{formatRelativeTime(comment.createdAt)}</p>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{comment.body}</p>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={submit} className="mt-6 space-y-3">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          maxLength={40}
          required
        />
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Worked at $49 after tax in 78701. Two left at pickup."
          maxLength={800}
          required
          className="min-h-24"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={pending} className="h-11 w-full bg-slate-900 text-white hover:bg-slate-800">
          {pending ? "Posting…" : "Post comment"}
        </Button>
      </form>
    </section>
  );
}
