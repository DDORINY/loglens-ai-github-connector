import type { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-teal-200 bg-teal-50/50 px-6 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl text-teal-600 shadow-sm">
        +
      </div>
      <h3 className="mt-4 font-bold text-slate-800">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
