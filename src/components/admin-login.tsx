"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not sign in.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
    >
      <div>
        <h1 className="text-xl font-semibold text-slate-950">Editor desk</h1>
        <p className="mt-1 text-sm text-slate-500">
          Staff only. Use the <code className="rounded bg-slate-100 px-1">ADMIN_PASSWORD</code> set
          on this server. There is no default.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={pending} className="h-11 w-full bg-slate-900 text-white hover:bg-slate-800">
        {pending ? "Checking…" : "Open the desk"}
      </Button>
    </form>
  );
}

export function AdminUnauthorized() {
  return (
    <div className="mx-auto w-full max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-slate-950">Unauthorized</h1>
      <p className="text-sm text-slate-500">
        The editor desk is locked. Set a real{" "}
        <code className="rounded bg-slate-100 px-1">ADMIN_PASSWORD</code> on this server. There is
        no default password and the queue is not loaded.
      </p>
    </div>
  );
}
