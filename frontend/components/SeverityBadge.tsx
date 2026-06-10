import type { ReactNode } from "react";

export default function SeverityBadge({
  value,
  children,
}: {
  value?: string | null;
  children?: ReactNode;
}) {
  const key = value?.toLowerCase() ?? "";
  const tone =
    key === "critical" || key === "error"
      ? "bg-red-50 text-red-600"
      : key === "high"
        ? "bg-rose-50 text-rose-600"
        : key === "medium" || key === "warning"
          ? "bg-amber-50 text-amber-700"
          : key === "low"
            ? "bg-sky-50 text-sky-700"
            : "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tone}`}>
      {children ?? value ?? "unknown"}
    </span>
  );
}
