"use client";

import { useEffect, useMemo, useState } from "react";
import { FaStar } from "react-icons/fa";
import { PAGINATION } from "@/lib/constants";

type PendingReview = { id: string; name: string; rating: number; comment?: string | null; createdAt?: string };

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const [bump, setBump] = useState<number | null>(null);
  const active = hover ?? value;
  return (
    <div className="inline-flex items-center gap-1">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          type="button"
          className={
            "relative text-2xl transition-transform duration-150 " +
            (active >= n ? "text-amber-500" : "text-slate-300 hover:text-slate-400") +
            (bump === n ? " animate-bounce" : "")
          }
          onClick={() => { onChange(n); setBump(n); setTimeout(() => setBump(null), 400); }}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          aria-label={`${n} stelle`}
          title={`${n} stelle`}
        >
          <FaStar />
        </button>
      ))}
      <span className="ml-2 text-xs text-slate-500">{active}/5</span>
    </div>
  );
}

type Review = { id: string; name: string; rating: number; comment?: string | null; createdAt: string };

type Paged<T> = { items: T[]; total: number; page: number; take: number };

export default function ReviewsPage() {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDev, setIsDev] = useState(false);
  const [pending, setPending] = useState<PendingReview | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [commentErr, setCommentErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [items, setItems] = useState<Review[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, take: PAGINATION.DEFAULT_PAGE_SIZE });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // mostra il link admin solo in sviluppo/locale
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      setIsDev(host === "localhost" || host === "127.0.0.1");
      // carica pending da localStorage
      try {
        const saved = localStorage.getItem("rv_last_review");
        if (saved) setPending(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const fetchList = async (page = 1) => {
    try {
      setLoading(true);
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("take", String(pagination.take));
      const res = await fetch(`/api/reviews?${sp.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Errore");
      const data = json.data as Paged<Review>;
      setItems(data.items);
      setPagination({ page: data.page, total: data.total, take: data.take });
      // se la pending è stata approvata (ora appare in lista), rimuovila
      if (pending && data.items.some(i => i.id === pending.id)) {
        setPending(null);
        try { localStorage.removeItem("rv_last_review"); } catch {}
      }
    } catch (e) {
      console.error(e);
      alert("Errore nel caricamento recensioni");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(1); }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(pagination.total / pagination.take)), [pagination]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    const nm = name.trim();
    if (!nm) { setNameErr("Inserisci il nome"); valid = false; } else if (nm.length < 2) { setNameErr("Il nome deve avere almeno 2 caratteri"); valid = false; } else { setNameErr(null); }
    if (rating < 1 || rating > 5) { valid = false; }
    if (comment && comment.length > 500) { setCommentErr("Il commento non può superare 500 caratteri"); valid = false; } else { setCommentErr(null); }
    if (!valid) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rating, comment: comment || undefined }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Errore invio recensione");
      // salva pending locale
      const createdId = json.data?.id ?? json.data?.review?.id ?? undefined;
      const now = new Date().toISOString();
      const pendingObj: PendingReview = { id: createdId, name, rating, comment: comment || undefined, createdAt: now } as PendingReview;
      if (createdId) {
        try { localStorage.setItem("rv_last_review", JSON.stringify(pendingObj)); } catch {}
        setPending(pendingObj);
      }
      // reset form
      setName("");
      setRating(5);
      setComment("");
      setSuccessMsg("Recensione inviata! Sarà visibile dopo l'approvazione dello staff.");
      setShowToast(true);
      setTimeout(() => { setShowToast(false); setTimeout(() => setSuccessMsg(null), 250); }, 6000);
      await fetchList(1);
    } catch (e) {
      console.error(e);
      alert("Impossibile inviare la recensione");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl p-4 space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Lascia una recensione</h1>
            <p className="text-slate-600">La tua opinione è importante per noi.</p>
          </div>
          {isDev && (
            <div className="ml-auto flex items-center gap-2">
              <a href="/admin/reviews" className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                Vai all'area gestore
              </a>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const url = typeof window !== "undefined" ? new URL("/admin/reviews", window.location.origin).toString() : "/admin/reviews";
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {}
                }}
                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                title="Copia link gestore"
              >
                {copied ? "Copiato!" : "Copia link"}
              </button>
            </div>
          )}
        </div>

        {successMsg && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-50 max-w-sm rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-lg transition-opacity duration-200"
            style={{ opacity: showToast ? 1 : 0 }}
          >
            {successMsg}
          </div>
        )}
      </div>

      <form id="lascia" onSubmit={submit} className="card p-4 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Nome</label>
          <input
            className={`input focus:ring-2 focus:ring-amber-400 ${nameErr ? "border-red-500" : ""}`}
            value={name}
            onChange={(e) => { setName(e.target.value); if (nameErr) setNameErr(null); }}
            placeholder="Il tuo nome"
            minLength={2}
            maxLength={40}
            aria-invalid={!!nameErr}
            aria-describedby={nameErr ? "name-error" : undefined}
          />
          {nameErr && <p id="name-error" className="text-xs text-red-600">{nameErr}</p>}
          <p className="text-xs text-slate-500">Il nome sarà mostrato insieme alla recensione.</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Valutazione</label>
          <Stars value={rating} onChange={setRating} />
          <p className="text-xs text-slate-500">Seleziona quante stelle assegnare (1 = pessimo, 5 = eccellente).</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Descrizione (opzionale)</label>
            <span className="text-xs text-slate-500">{comment.length}/500</span>
          </div>
          <textarea
            className={`textarea resize-none focus:ring-2 focus:ring-amber-400 ${commentErr ? "border-red-500" : ""}`}
            rows={5}
            value={comment}
            onChange={(e) => { setComment(e.target.value); if (commentErr) setCommentErr(null); }}
            placeholder="Raccontaci cosa ti è piaciuto del servizio, del cibo o dell'atmosfera..."
            maxLength={500}
            aria-invalid={!!commentErr}
            aria-describedby={commentErr ? "comment-error" : undefined}
          />
          {commentErr && <p id="comment-error" className="text-xs text-red-600">{commentErr}</p>}
          <p className="text-xs text-slate-500">Suggerimento: dettagli utili aiutano gli altri utenti.</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Nota: le recensioni vengono moderate e saranno visibili dopo approvazione.</p>
          <button disabled={submitting} className="btn btn-glow">{submitting ? "Invio..." : "Invia recensione"}</button>
        </div>
      </form>

      {pending && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <div className="flex items-center justify-between">
            <div className="font-medium">La tua ultima recensione</div>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
              In attesa di approvazione
            </span>
          </div>
          <div className="mt-2 text-sm">
            <div className="font-medium">{pending.name}</div>
            <div className="text-amber-600 inline-flex items-center gap-1">
              {Array.from({ length: pending.rating }).map((_, i) => <FaStar key={i} />)}
              <span className="ml-1 text-xs text-amber-700">{pending.rating}/5</span>
            </div>
            {pending.comment && <p className="mt-2 whitespace-pre-wrap">{pending.comment}</p>}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Ultime recensioni</h2>
          <div className="text-sm text-slate-600">Totale: {pagination.total}</div>
        </div>
        <div className="card p-0">
          {items.length === 0 ? (
            <div className="p-6 text-center text-slate-500">Non ci sono ancora recensioni</div>
          ) : (
            <ul className="divide-y">
              {items.map((r) => (
                <li key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-amber-500 inline-flex items-center gap-1">
                        {Array.from({ length: r.rating }).map((_, i) => <FaStar key={i} />)}
                        <span className="ml-1 text-xs text-slate-500">{r.rating}/5</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}</div>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
        {items.length > 0 && (
          <div className="flex items-center justify-between">
            <button className="btn btn-sm" disabled={pagination.page === 1 || loading} onClick={() => fetchList(pagination.page - 1)}>Precedente</button>
            <span className="text-sm">Pagina {pagination.page} / {Math.max(1, Math.ceil(pagination.total / pagination.take))}</span>
            <button className="btn btn-sm" disabled={(pagination.page * pagination.take) >= pagination.total || loading} onClick={() => fetchList(pagination.page + 1)}>Successiva</button>
          </div>
        )}
      </div>
    </div>
  );
}