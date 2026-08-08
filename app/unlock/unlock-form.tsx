"use client";

import { useState, useTransition } from "react";
import { unlock } from "@/app/unlock/actions";

export function UnlockForm({ next }: { next: string }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await unlock(passcode, next);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="password"
        inputMode="numeric"
        autoFocus
        required
        placeholder="Passcode"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-center text-lg tracking-widest placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-sky-500 px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Unlocking…" : "Unlock"}
      </button>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </form>
  );
}
