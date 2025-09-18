"use client";

import dynamic from "next/dynamic";
import type { BookingStepperProps } from "@/app/components/BookingStepper";

const BookingStepper = dynamic(() => import("@/app/components/BookingStepper"), {
  ssr: false,
  loading: () => <div className="text-sm text-[#5C6672]">Caricamento modulo prenotazione…</div>,
});

type Props = {
  disabledDates: BookingStepperProps["disabledDates"];
  dateStatuses: { confirmed: string[]; pending: string[] };
  specialEvents?: Array<{ id: string; title: string; eventDate?: string | null | Date }>;
};

export default function ClientBooking({ disabledDates, dateStatuses, specialEvents }: Props) {
  return (
    <BookingStepper
      disabledDates={disabledDates}
      confirmedDates={dateStatuses.confirmed}
      pendingDates={dateStatuses.pending}
      specialEvents={specialEvents}
    />
  );
}