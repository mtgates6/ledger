"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
        Check <span className="text-slate-100">{email}</span> for a sign-in
        link.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-xl bg-sky-500 px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {status === "sending" ? "Sending link…" : "Send sign-in link"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-400">{errorMessage}</p>
      )}
    </form>
  );
}
