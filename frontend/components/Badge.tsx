import type { ReactNode } from "react";

type Props = { children: ReactNode; value?: string | null };

export default function Badge({ children, value }: Props) {
  const key = (value ?? String(children)).toLowerCase();
  const tone =
    key.includes("fail") || key.includes("error")
      ? "bg-red-50 text-red-600"
      : key.includes("success") || key.includes("open") || key.includes("high")
        ? "bg-emerald-50 text-emerald-700"
        : key.includes("medium") || key.includes("warning")
          ? "bg-amber-50 text-amber-700"
          : key.includes("low")
            ? "bg-sky-50 text-sky-700"
            : "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tone}`}>
      {children}
    </span>
  );
}
