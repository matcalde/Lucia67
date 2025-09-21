"use client";

import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isBefore, isAfter, format } from "date-fns";
import { it } from "date-fns/locale";
import { useMemo, useState } from "react";

export type AvailabilityCalendarProps = {
  disabledDates: string[]; // YYYY-MM-DD (all non-available)
  confirmedDates?: string[]; // YYYY-MM-DD (confirmed bookings)
  pendingDates?: string[]; // YYYY-MM-DD (pending confirmation)
  onSelect?: (dateISO: string) => void;
  initialMonth?: Date;
  selectedDate?: string | null; // YYYY-MM-DD
};

export function AvailabilityCalendar({ 
  disabledDates, 
  confirmedDates = [], 
  pendingDates = [], 
  onSelect, 
  initialMonth, 
  selectedDate 
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth ?? new Date());
  const disabledSet = useMemo(() => new Set(disabledDates), [disabledDates]);
  const confirmedSet = useMemo(() => new Set(confirmedDates), [confirmedDates]);
  const pendingSet = useMemo(() => new Set(pendingDates), [pendingDates]);

  const today = new Date();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Calcolo se il mese corrente ha almeno un giorno selezionabile
  const hasSelectable = useMemo(() => {
    const start = monthStart;
    const end = monthEnd;
    const todayNoTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let d = start;
    while (!isAfter(d, end)) {
      const notPast = !isBefore(d, todayNoTime);
      const iso = format(d, "yyyy-MM-dd");
      const selectable = notPast && !disabledSet.has(iso) && isSameMonth(d, currentMonth);
      if (selectable) return true;
      d = addDays(d, 1);
    }
    return false;
  }, [monthStart, monthEnd, today, disabledSet, currentMonth]);

  const weeks: Date[][] = [];
  let day = gridStart;
  while (!isAfter(day, gridEnd)) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  function isDateDisabled(d: Date) {
    const iso = format(d, "yyyy-MM-dd");
    return disabledSet.has(iso);
  }

  function isSelectable(d: Date) {
    const notPast = !isBefore(d, new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    return notPast && !isDateDisabled(d) && isSameMonth(d, currentMonth);
  }

  function handleSelect(d: Date) {
    if (!isSelectable(d)) return;
    const iso = format(d, "yyyy-MM-dd");
    onSelect?.(iso);
  }

  function goToday() {
    setCurrentMonth(new Date());
  }

  return (
    <div
      className="w-full card p-4"
      tabIndex={0}
      aria-label="Calendario disponibilità"
      onKeyDown={(e) => {
        if (e.altKey && e.key === "ArrowRight") {
          e.preventDefault();
          setCurrentMonth((m) => addMonths(m, 1));
        } else if (e.altKey && e.key === "ArrowLeft") {
          e.preventDefault();
          setCurrentMonth((m) => subMonths(m, 1));
        }
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="btn btn-glow btn-sm"
          aria-label="Mese precedente"
        >
          ←
        </button>
        <div className="font-medium select-none" role="status" aria-live="polite">
          {format(currentMonth, "MMMM yyyy", { locale: it })}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-glow btn-sm"
            onClick={goToday}
            aria-label="Vai al mese corrente"
          >
            Oggi
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="btn btn-glow btn-sm"
            aria-label="Mese successivo"
          >
            →
          </button>
        </div>
      </div>

      {!hasSelectable && (
        <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs flex items-center justify-between">
          <span>Nessuna data prenotabile in questo mese</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            Vai al mese successivo →
          </button>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 text-xs text-black/60 dark:text-white/60 mb-1">
        {[
          "Lun",
          "Mar",
          "Mer",
          "Gio",
          "Ven",
          "Sab",
          "Dom",
        ].map((d) => (
          <div key={d} className="text-center" aria-hidden>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="contents">
            {week.map((d) => {
              const inMonth = isSameMonth(d, currentMonth);
              const disabled = isDateDisabled(d);
              const selectable = isSelectable(d);
              const isPast = isBefore(d, new Date(today.getFullYear(), today.getMonth(), today.getDate()));
              const iso = format(d, "yyyy-MM-dd");
              const isSel = !!selectedDate && selectedDate === iso;
              const isConfirmed = confirmedSet.has(iso);
              const isPending = pendingSet.has(iso);
              const label = format(d, "d");
              
              const base = "aspect-square flex items-center justify-center rounded-md border text-sm select-none transition";
              let styles = base;
              
              if (!inMonth) {
                styles += " opacity-40";
              }
              
              if (isSel) {
                styles += " ring-2 ring-[var(--accent)] bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)] font-semibold";
              } else if (isConfirmed) {
                styles += " bg-green-100 text-green-800 border-green-300";
              } else if (isPending) {
                styles += " bg-yellow-100 text-yellow-800 border-yellow-300";
              } else if (disabled) {
                styles += " bg-red-50 text-red-700 border-red-200";
              } else if (selectable) {
                styles += " cursor-pointer hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/30 hover:scale-105";
              } else if (inMonth) {
                styles += " bg-black/5";
              }
              
              if (isPast && inMonth) {
                styles += " opacity-50";
              }
              
              let title = "";
              if (isConfirmed) title = "Prenotazione confermata";
              else if (isPending) title = "In attesa di conferma";
              else if (disabled) title = "Non disponibile";
              else if (selectable) title = "Disponibile per la prenotazione";
              else if (inMonth) title = "Non selezionabile";
              
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  className={styles}
                  onClick={() => handleSelect(d)}
                  aria-disabled={!selectable}
                  title={title}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legenda premium */}
      <div className="mt-4 p-3 bg-black/5 dark:bg-white/5 rounded-lg">
        <div className="text-xs font-medium text-[#0F1B2A] mb-2">Legenda:</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded border bg-green-100 border-green-300" />
            <span className="text-[#0F1B2A]">Confermata</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded border bg-yellow-100 border-yellow-300" />
            <span className="text-[#0F1B2A]">In conferma</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded border" />
            <span className="text-[#0F1B2A]">Disponibile</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded border bg-red-50 border-red-200" />
            <span className="text-[#0F1B2A]">Non disponibile</span>
          </div>
        </div>
      </div>
    </div>
  );
}