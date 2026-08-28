"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addComment, loadComments } from "@/lib/store";
import { formatRelativeTime } from "@/lib/time";
import type { DealComment } from "@/lib/types";

export function CommentThread({ dealId }: { dealId: string }) {
  const [comments, setComments] = useState<DealComment[]>([]);
  const [authorName, setAuthorName] = useState("Deal Hunter");
  const [content, setContent] = useState("");

  useEffect(() => {
    setComments(loadComments(dealId));
  }, [dealId]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) {
      toast.error("Write a stacking tip or a checkout confirmation first.");
      return;
    }
    const next = addComment(dealId, authorName, content);
    setComments((current) => [next, ...current]);
    setContent("");
    toast.success("Tip posted");
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Community confirmations</h2>
      <p className="mt-1 text-sm text-slate-500">
        Share stacking order, canceled orders, or a final checkout screenshot note.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <Input
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder="Display name"
          className="h-10 bg-white"
        />
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Still alive at $19.99 after clipping the coupon..."
          className="min-h-24 bg-white"
        />
        <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800">
          Post tip
        </Button>
      </form>

      <div className="mt-6 space-y-4">
        {comments.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No confirmations yet. If you checked out, leave the exact total you paid.
          </p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
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
