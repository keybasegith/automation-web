import { STATUS_META, type CalendarStatus } from "@/lib/content-calendar/workflow";

/** The status badge. One component so a stage looks the same everywhere. */
export default function StatusPill({
  status,
  size = "sm",
}: {
  status: CalendarStatus;
  size?: "xs" | "sm";
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-medium ring-1 ring-inset ${meta.pill} ${
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"
      }`}
    >
      {meta.label}
    </span>
  );
}
