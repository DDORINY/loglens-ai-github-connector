import Badge from "@/components/Badge";
import type { ActionsAnalysis } from "@/types/api";

function List({ title, items, tone = "teal" }: { title: string; items: string[]; tone?: "teal" | "amber" }) {
  const dot = tone === "amber" ? "bg-amber-400" : "bg-teal-500";
  return (
    <div>
      <h3 className="text-sm font-black text-slate-800">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => <li key={`${index}-${item}`} className="flex gap-3 text-sm leading-6 text-slate-600"><span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${dot}`} />{item}</li>)}
      </ul>
    </div>
  );
}

function EvidenceList({ items }: { items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-black text-slate-800">핵심 근거 로그</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        원본 로그에서 실패 원인 판단에 필요한 라인만 정제해 표시합니다.
      </p>
      <div className="mt-3 space-y-2">
        {items.map((item, index) => {
          const value = item.toLowerCase();
          const tone =
            value.includes("error") || value.includes("failed")
              ? "border-red-100 bg-red-50 text-red-700"
              : value.includes("exit code")
                ? "border-amber-100 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-slate-50 text-slate-700";

          return (
            <code
              key={`${index}-${item}`}
              className={`block break-words rounded-xl border px-3 py-2 font-mono text-xs leading-5 ${tone}`}
            >
              {item}
            </code>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalysisPanel({ analysis }: { analysis: ActionsAnalysis }) {
  const hasScore = typeof analysis.analysis_score === "number";
  const score = hasScore
    ? Math.max(0, Math.min(100, analysis.analysis_score as number))
    : null;
  const scoreTone =
    score !== null && score >= 80
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : score !== null && score >= 50
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">원인 분석 결과</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">{analysis.summary}</h2>
          {analysis.engine_version && (
            <p className="mt-2 font-mono text-xs text-slate-400">
              Engine: {analysis.engine_version}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-2 text-xs font-bold text-slate-500">오류 분류: <Badge>{analysis.category}</Badge></span>
          <span className="flex items-center gap-2 text-xs font-bold text-slate-500">판단 신뢰도: <Badge value={analysis.confidence}>{analysis.confidence}</Badge></span>
        </div>
      </div>

      {score !== null && (
        <div className={`mt-6 rounded-2xl border p-5 ${scoreTone}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-black">분석 점수: {score} / 100</p>
            <span className="text-xs font-bold opacity-70">
              {score >= 80 ? "근거가 충분합니다" : score >= 50 ? "추가 확인이 필요합니다" : "근거가 제한적입니다"}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
            <div
              className="h-full rounded-full bg-current transition-[width]"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}

      {analysis.matched_patterns && analysis.matched_patterns.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-black text-slate-800">감지된 패턴</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.matched_patterns.map((pattern, index) => (
              <code
                key={`${index}-${pattern}`}
                className="max-w-full break-all rounded-lg border border-teal-100 bg-teal-50 px-3 py-1.5 font-mono text-xs font-bold text-teal-700"
              >
                {pattern}
              </code>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <EvidenceList items={analysis.evidence} />
        <List title="원인 후보" items={analysis.suspected_causes} tone="amber" />
        <div className="lg:col-span-2"><List title="추천 조치" items={analysis.recommended_actions} /></div>
      </div>
      <div className="mt-6 rounded-2xl bg-slate-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">수정 작업 미리보기 · GitHub Issue</p>
        <h3 className="mt-2 font-black text-slate-900">{analysis.issue_title}</h3>
        <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap font-sans text-sm leading-6 text-slate-600">{analysis.issue_body}</pre>
      </div>
    </section>
  );
}
