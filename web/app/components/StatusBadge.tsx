import React from "react";
import { BookingStatus } from "@/lib/constants";

export function StatusBadge({ status, className = "" }: { status: BookingStatus | string; className?: string }) {
  const variant =
    status === "CONFIRMED"
      ? "badge--success"
      : status === "CANCELLED"
      ? "badge--danger"
      : "badge--warning"; // PENDING o fallback

  return (
    <span className={["badge", variant, className].filter(Boolean).join(" ")}>{status}</span>
  );
}

export default StatusBadge;