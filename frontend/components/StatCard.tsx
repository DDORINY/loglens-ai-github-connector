import type { ReactNode } from "react";

export default function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <article className="panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 font-bold text-teal-600">
          {icon ?? "↗"}
        </div>
      </div>
      {description && <p className="mt-4 text-sm text-slate-500">{description}</p>}
    </article>
  );
}
