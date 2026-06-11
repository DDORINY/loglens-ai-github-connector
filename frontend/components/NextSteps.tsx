import type { ReactNode } from "react";

export default function NextSteps({
  title = "다음 단계",
  steps,
  action,
}: {
  title?: string;
  steps: string[];
  action?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-teal-100 bg-teal-50/60 p-5">
      <p className="text-sm font-black text-slate-900">{title}</p>
      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => (
          <li key={`${index}-${step}`} className="flex gap-3 text-sm leading-6 text-slate-600">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-teal-700 shadow-sm">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}
