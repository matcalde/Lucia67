"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { z } from "zod";
import { AvailabilityCalendar } from "@/app/components/AvailabilityCalendar";
import { BookingCreateSchema } from "@/lib/schemas";
import { getTimeSlotsForDate } from "@/lib/constants";

export type BookingStepperProps = {
  disabledDates: string[];
  confirmedDates?: string[];
  pendingDates?: string[];
  specialEvents?: Array<{ id: string; title: string; eventDate?: string | null | Date }>;
};

type StepNumber = 1 | 2 | 3;
type Step = StepNumber | "success";

type BookingDraft = {
  date: string | null;
  guests: number;
  name: string;
  email: string;
  phone: string;
  allergies?: string;
  preferences?: string;
  notes?: string;
  time?: string | null;
  specialEventId?: string | null;
};

export default function BookingStepper({ disabledDates, confirmedDates = [], pendingDates = [], specialEvents = [] }: BookingStepperProps) {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BookingDraft>({
    date: null,
    guests: 2,
    name: "",
    email: "",
    phone: "",
    allergies: "",
    preferences: "",
    notes: "",
    time: null,
    specialEventId: null,
  });

  const disabledSet = useMemo(() => new Set(disabledDates), [disabledDates]);
  const timeSlots = useMemo(() => getTimeSlotsForDate(draft.date), [draft.date]);

  function nextFromStep1() {
    setError(null);
    if (!draft.date) {
      setError("Seleziona una data disponibile");
      return;
    }
    if (!draft.time) {
      setError("Seleziona un orario");
      return;
    }
    if (draft.guests < 1 || draft.guests > 12) {
      setError("Inserisci un numero di ospiti valido (1–12)");
      return;
    }
    setStep(2);
  }

  function nextFromStep2() {
    setError(null);
    // Validazioni base (più rigorose in submit finale con zod)
    if (!draft.name || draft.name.trim().length < 2) {
      setError("Inserisci il tuo nome (min 2 caratteri)");
      return;
    }
    if (!draft.email || !/.+@.+\..+/.test(draft.email)) {
      setError("Inserisci un'email valida");
      return;
    }
    if (!draft.phone || draft.phone.trim().length < 6) {
      setError("Inserisci un numero di telefono valido");
      return;
    }
    setStep(3);
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const selectedEvent = draft.specialEventId ? (specialEvents || []).find((e) => String(e.id) === draft.specialEventId) : null;
      const dateLabel = selectedEvent?.eventDate ? new Date(selectedEvent.eventDate as any).toLocaleDateString("it-IT", { day: "2-digit", month: "long" }) : undefined;
      const eventNote = selectedEvent ? `[Evento speciale: ${selectedEvent.title}${dateLabel ? ` – ${dateLabel}` : ""}]` : "";
      const combinedNotes = [eventNote, draft.notes?.trim() || ""].filter(Boolean).join(" ").trim();

      const payload = {
        date: draft.date && draft.time ? `${draft.date}T${draft.time}:00` : "",
        guests: draft.guests,
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        allergies: draft.allergies?.trim() || undefined,
        preferences: draft.preferences?.trim() || undefined,
        notes: combinedNotes || undefined,
        specialEventId: draft.specialEventId || undefined,
      };
      const parsed = BookingCreateSchema.safeParse(payload);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new Error(first?.message || "Dati non validi");
      }
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Errore durante l'invio");
      setStep("success");
    } catch (e: any) {
      setError(e?.message || "Errore sconosciuto");
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setDraft({ date: null, guests: 2, name: "", email: "", phone: "", allergies: "", preferences: "", notes: "", time: null, specialEventId: null });
    setError(null);
    setStep(1);
  }

  return (
    <div className="space-y-6">
      <StepperHeader current={step} />
      <ProgressBar current={step} />

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {step === 1 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-slide">
          <div>
            <label className="label block font-medium mb-2">Calendario disponibilità</label>
            <AvailabilityCalendar
              disabledDates={disabledDates}
              confirmedDates={confirmedDates}
              pendingDates={pendingDates}
              onSelect={(iso) => {
                if (disabledSet.has(iso)) return;
                setDraft((d) => ({ ...d, date: iso, time: null }));
              }}
              selectedDate={draft.date}
            />
          </div>
          <div className="space-y-4">
            <div className="card p-3">
              <label className="block text-sm mb-1">Data selezionata</label>
              <div className={`rounded-md border px-3 py-2 text-sm ${draft.date ? "" : "text-black/60 dark:text-white/60"}`}>
                {draft.date ? format(new Date(draft.date), "dd/MM/yyyy") : "Seleziona una data dal calendario"}
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Orario indicativo</label>
              <select
                className="input"
                value={draft.time ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value || null }))}
                disabled={!draft.date}
              >
                <option value="">Seleziona orario</option>
                {timeSlots.map((t) => (
                  <option key={t} value={t}>{`ore ${t}`}</option>
                ))}
              </select>
              <p className="text-xs mt-1 text-black/60 dark:text-white/60">L'orario è indicativo: accettiamo una sola prenotazione per data.</p>
            </div>
            <div>
              <label className="block text-sm mb-1">Persone</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={12}
                value={draft.guests}
                onChange={(e) => setDraft((d) => ({ ...d, guests: Number(e.target.value) }))}
                className="input"
              />
              <p className="text-xs mt-1 text-black/60 dark:text-white/60">Posti limitati: da 1 a 12 ospiti</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button type="button" className="btn btn-glow" onClick={nextFromStep1} disabled={!draft.date || !draft.time || draft.guests < 1 || draft.guests > 12}>
                Avanti
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4 animate-fade-slide">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Nome</label>
              <input className="input" autoComplete="name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input type="email" autoComplete="email" className="input" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm mb-1">Telefono</label>
              <input type="tel" inputMode="tel" autoComplete="tel" className="input" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Intolleranze</label>
              <input className="input" placeholder="es. lattosio, glutine" value={draft.allergies} onChange={(e) => setDraft((d) => ({ ...d, allergies: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm mb-1">Preferenze</label>
              <input className="input" placeholder="es. vegetariano, piccante leggero" value={draft.preferences} onChange={(e) => setDraft((d) => ({ ...d, preferences: e.target.value }))} />
            </div>
          </div>
          {!!(specialEvents && specialEvents.length) && (
            <div>
              <label className="block text-sm mb-1">Evento/Musica (opzionale)</label>
              <select
                className="input"
                value={draft.specialEventId ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, specialEventId: e.target.value || null }))}
              >
                <option value="">Nessuna preferenza</option>
                {specialEvents.map((ev) => {
                  const dateLabel = ev.eventDate ? new Date(ev.eventDate as any).toLocaleDateString("it-IT", { day: "2-digit", month: "long" }) : undefined;
                  return (
                    <option key={ev.id} value={String(ev.id)}>
                      {dateLabel ? `${dateLabel} — ${ev.title}` : ev.title}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs mt-1 text-black/60 dark:text-white/60">Seleziona la serata a tema che preferisci: faremo il possibile per accontentarti.</p>
            </div>
          )}
          <div>
            <label className="block text-sm mb-1">Note</label>
            <textarea className="input" rows={3} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Indietro</button>
            <button
              type="button"
              className="btn btn-glow"
              onClick={nextFromStep2}
              disabled={!draft.name || draft.name.trim().length < 2 || !draft.email || !/.+@.+\..+/.test(draft.email) || !draft.phone || draft.phone.trim().length < 6}
            >
              Avanti
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4 animate-fade-slide">
          <div className="rounded-2xl border glass p-4">
            <h3 className="font-medium mb-3">Riepilogo</h3>
            <ul className="text-sm space-y-1">
              <li><span className="text-black/60 dark:text-white/60">Data:</span> {draft.date ? format(new Date(draft.date), "dd/MM/yyyy") : "-"}</li>
              <li><span className="text-black/60 dark:text-white/60">Orario indicativo:</span> {draft.time ? draft.time : "-"}</li>
              <li><span className="text-black/60 dark:text-white/60">Ospiti:</span> {draft.guests}</li>
              <li><span className="text-black/60 dark:text-white/60">Nome:</span> {draft.name || "-"}</li>
              <li><span className="text-black/60 dark:text-white/60">Email:</span> {draft.email || "-"}</li>
              <li><span className="text-black/60 dark:text-white/60">Telefono:</span> {draft.phone || "-"}</li>
              {!!draft.allergies && <li><span className="text-black/60 dark:text-white/60">Intolleranze:</span> {draft.allergies}</li>}
              {!!draft.preferences && <li><span className="text-black/60 dark:text-white/60">Preferenze:</span> {draft.preferences}</li>}
              {!!draft.specialEventId && <li><span className="text-black/60 dark:text-white/60">Evento/Musica:</span> {(specialEvents || []).find((e) => String(e.id) === draft.specialEventId)?.title}</li>}
              {!!draft.notes && <li><span className="text-black/60 dark:text-white/60">Note:</span> {draft.notes}</li>}
            </ul>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>Indietro</button>
            <button type="button" className="btn btn-glow disabled:opacity-50" disabled={submitting} onClick={submit}>
              {submitting ? "Invio..." : "Conferma prenotazione"}
            </button>
          </div>
        </section>
      )}

      {step === "success" && (
        <section className="text-center space-y-3 animate-fade-slide">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center">✓</div>
          <h3 className="text-xl font-semibold">Richiesta inviata!</h3>
          <p className="text-sm text-black/70 dark:text-white/70">Ti contatteremo a breve per confermare la disponibilità. Grazie!</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button type="button" className="btn btn-secondary" onClick={resetAll}>Nuova prenotazione</button>
            <a href="#galleria" className="btn btn-ghost">Vai alla galleria</a>
          </div>
        </section>
      )}
    </div>
  );
}

function ProgressBar({ current }: { current: Step }) {
  const pct = current === "success" ? 100 : current === 1 ? 33 : current === 2 ? 66 : 100;
  return (
    <div className="progress" role="progressbar" aria-label="Avanzamento prenotazione" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="progress__bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

function StepperHeader({ current }: { current: Step }) {
  const steps: Array<{ id: StepNumber; label: string }> = [
    { id: 1, label: "Data & ospiti" },
    { id: 2, label: "Dati personali" },
    { id: 3, label: "Riepilogo" },
  ];

  if (current === "success") return null;

  const numericCurrent: StepNumber = current as StepNumber;

  return (
    <nav aria-label="Progressione step" className="flex items-center justify-between gap-3">
      {steps.map((s, i) => {
        const active = numericCurrent === s.id;
        const done = numericCurrent > s.id;
        return (
          <div key={s.label} className="flex-1 flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm ${
                active ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10" : done ? "border-green-300 text-green-700 bg-green-50" : "border-black/10 text-black/60 dark:text-white/60"
              }`}
              aria-current={active ? "step" : undefined}
              aria-label={`${s.label}${active ? " (attuale)" : done ? " (completato)" : ""}`}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs rounded-full border">
                {done ? "✓" : s.id}
              </span>
              <span className="hidden xs:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && <span className={`flex-1 h-px ${done ? "bg-[var(--accent)]/50" : "bg-black/10"}`} />}
          </div>
        );
      })}
    </nav>
  );
}