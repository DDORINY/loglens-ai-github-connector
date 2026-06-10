import Badge from "@/components/Badge";
import type { ActionsAnalysis } from "@/types/api";

function List({ title, items, tone = "teal" }: { title: string; items: string[]; tone?: "teal" | "amber" | "slate" }) {
  const dot = tone === "amber" ? "bg-amber-400" : tone === "slate" ? "bg-slate-400" : "bg-teal-500";
  return (
    <div>
      <h3 className="text-sm font-black text-slate-800">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => <li key={`${index}-${item}`} className="flex gap-3 text-sm leading-6 text-slate-600"><span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${dot}`} />{item}</li>)}
      </ul>
    </div>
  );
}

export default function AnalysisPanel({ analysis }: { analysis: ActionsAnalysis }) {
  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">AI analysis</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">{analysis.summary}</h2>
        </div>
        <div className="flex gap-2"><Badge>{analysis.category}</Badge><Badge value={analysis.confidence}>{analysis.confidence}</Badge></div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <List title="근거 로그" items={analysis.evidence} tone="slate" />
        <List title="원인 후보" items={analysis.suspected_causes} tone="amber" />
        <div className="lg:col-span-2"><List title="추천 조치" items={analysis.recommended_actions} /></div>
      </div>
      <div className="mt-6 rounded-2xl bg-slate-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Issue preview</p>
        <h3 className="mt-2 font-black text-slate-900">{analysis.issue_title}</h3>
        <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap font-sans text-sm leading-6 text-slate-600">{analysis.issue_body}</pre>
      </div>
    </section>
  );
}
