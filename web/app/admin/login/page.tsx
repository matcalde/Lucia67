"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      setIsDev(host === "localhost" || host === "127.0.0.1");
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError("Inserisci la password");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && (json?.ok ?? true)) {
        router.replace("/admin/reviews");
        router.refresh();
      } else {
        setError(json?.error || "Errore di accesso");
      }
    } catch (e: any) {
      setError("Errore di rete, riprova");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className={`w-full max-w-sm space-y-5 card p-6 ${error ? "animate-shake" : ""}`}>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Accesso Gestore</h1>
          <p className="text-sm text-slate-600">Entra per gestire prenotazioni, comunicati e recensioni.</p>
        </div>
        {error && (
          <div id="login-error" role="alert" aria-live="polite" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <div className="space-y-2">
          <label className="label block" htmlFor="password">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              className={`input pr-10 ${error ? "border-red-500" : ""} focus:ring-2 focus:ring-amber-400`}
              placeholder={error ? "Password errata" : "Inserisci la password"}
              autoComplete="current-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute inset-y-0 right-2 my-auto h-8 px-2 rounded text-xs text-slate-600 hover:bg-slate-100"
              aria-label={showPw ? "Nascondi password" : "Mostra password"}
              title={showPw ? "Nascondi password" : "Mostra password"}
            >
              {showPw ? "Nascondi" : "Mostra"}
            </button>
          </div>
          {isDev && (
            <p className="text-xs text-slate-500">Suggerimento (solo locale): password predefinita "admin"</p>
          )}
        </div>
        <button disabled={!password || submitting} className="btn btn-glow w-full">{submitting ? "Accesso..." : "Accedi"}</button>
        <div className="text-center">
          <a href="/" className="text-sm text-slate-600 hover:underline">Torna al sito</a>
        </div>
      </form>
    </div>
  );
}