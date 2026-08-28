"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { formatRelativeTime } from "@/lib/time";
import type { DealComment } from "@/lib/types";

export function CommentThread({ dealId }: { dealId: string }) {
  const [comments, setComments] = useState<DealComment[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/comments?dealId=${encodeURIComponent(dealId)}`)
      .then((response) => response.json())
      .then((payload: { comments?: DealComment[] }) => setComments(payload.comments ?? []))
      .catch(() => setComments([]));
  }, [dealId]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) {
      toast.error("Write a comment first.");
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          authorName: authorName.trim() || "Deal Hunter",
          content,
        }),
      });
      const payload = (await response.json()) as { comment?: DealComment; error?: string };
      if (!response.ok || !payload.comment) {
        throw new Error(payload.error || "Could not post.");
      }
      setComments((current) => [payload.comment!, ...current]);
      setContent("");
      toast.success("Comment posted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">Comments</h2>
      <p className="mt-1 text-sm text-slate-500">
        Did the price stick? Leave the total you paid so the next person knows.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder="Name"
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-orange-400"
        />
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Still $55 after the code, free store pickup..."
          className="min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-orange-400"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {sending ? "Posting…" : "Post comment"}
        </button>
      </form>

      <div className="mt-6 space-y-4">
        {comments.length === 0 ? (
          <p className="rounded-xl bg-orange-50/70 px-4 py-6 text-sm text-slate-500">
            No comments yet. If you checked out, tell everyone what you paid.
          </p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">{comment.authorName}</p>
                <time className="text-xs text-slate-400">{formatRelativeTime(comment.createdAt)}</time>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{comment.content}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
