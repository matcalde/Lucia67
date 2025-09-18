"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { AvailabilityCalendar } from "@/app/components/AvailabilityCalendar";
import { TIME_SLOTS } from "@/lib/constants";

const schema = z.object({
  date: z.string().min(1, "Seleziona una data"),
  time: z.string().min(1, "Seleziona un orario"),
  guests: z.number().min(1).max(12),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  allergies: z.string().optional(),
  preferences: z.string().optional(),
  notes: z.string().optional(),
});

export type BookingFormValues = z.infer<typeof schema>;

export function BookingClientForm({ disabledDates, confirmedDates = [], pendingDates = [] }: { disabledDates: string[]; confirmedDates?: string[]; pendingDates?: string[] }) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<BookingFormValues>({ resolver: zodResolver(schema), defaultValues: { guests: 2 } as any });

  const watchTime = watch("time");

  const onSubmit = async (values: BookingFormValues) => {
    setSubmitting(true);
    try {
      const { time, ...rest } = values;
      const payload = { ...rest, date: `${values.date}T${time}:00` };
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore");
      alert("Prenotazione inviata! Ti contatteremo per conferma.");
      reset({ guests: 2 } as any);
      setSelectedDate(null);
    } catch (e: any) {
      alert(e.message || "Errore del server");
    } finally {
      setSubmitting(false);
    }
  };

  const disabledSet = useMemo(() => new Set(disabledDates), [disabledDates]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colonna sinistra: Calendario */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="label block font-medium">Calendario disponibilità</label>
          </div>
          <AvailabilityCalendar
            disabledDates={disabledDates}
            confirmedDates={confirmedDates}
            pendingDates={pendingDates}
            onSelect={(iso) => {
              if (disabledSet.has(iso)) return; // safety
              setSelectedDate(iso);
              setValue("date", iso, { shouldValidate: true, shouldDirty: true });
              setValue("time", "");
            }}
            selectedDate={selectedDate}
          />
          {/* Campi nascosti per react-hook-form */}
          <input type="hidden" {...register("date")} value={selectedDate ?? ""} readOnly />
          {errors.date && <p className="text-red-600 text-sm mt-2">{errors.date.message}</p>}
        </div>

        {/* Colonna destra: Dati prenotazione */}
        <div className="space-y-4">
          <div className="card p-3">
            <label className="block text-sm mb-1">Data selezionata</label>
            <div className={`rounded-md border px-3 py-2 text-sm ${selectedDate ? "" : "text-black/60 dark:text-white/60"}`}>
              {selectedDate ? format(new Date(selectedDate), "dd/MM/yyyy") : "Seleziona una data dal calendario a sinistra"}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Orario indicativo</label>
            <select className="w-full rounded border px-3 py-2" {...register("time")} disabled={!selectedDate}>
              <option value="">Seleziona orario</option>
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{`ore ${t}`}</option>
              ))}
            </select>
            <p className="text-xs mt-1 text-black/60 dark:text-white/60">L'orario è indicativo: accettiamo una sola prenotazione per data.</p>
            {errors.time && <p className="text-red-600 text-sm mt-1">{errors.time.message}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1">Persone</label>
            <input type="number" min={1} max={12} className="w-full rounded border px-3 py-2" {...register("guests", { valueAsNumber: true })} />
            {errors.guests && <p className="text-red-600 text-sm mt-1">{errors.guests.message as any}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Nome</label>
              <input className="w-full rounded border px-3 py-2" {...register("name")} />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input type="email" className="w-full rounded border px-3 py-2" {...register("email")} />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1">Telefono</label>
              <input className="w-full rounded border px-3 py-2" {...register("phone")} />
              {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Intolleranze</label>
              <input className="w-full rounded border px-3 py-2" placeholder="es. lattosio, glutine" {...register("allergies")} />
            </div>
            <div>
              <label className="block text-sm mb-1">Preferenze</label>
              <input className="w-full rounded border px-3 py-2" placeholder="es. vegetariano, piccante leggero" {...register("preferences")} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Note</label>
        <textarea className="w-full rounded border px-3 py-2" rows={3} {...register("notes")} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm muted">Scegli una data disponibile, un orario indicativo e compila i tuoi dati. Ti ricontatteremo per confermare.</p>
        <button disabled={submitting || !selectedDate || !watchTime} className="btn btn-glow disabled:opacity-50">
           {submitting ? "Invio..." : "Invia prenotazione"}
         </button>
      </div>
    </form>
  );
}