import Badge from "@/components/Badge";
import { formatDate, shortSha } from "@/lib/format";
import type { WorkflowRun } from "@/types/api";

export default function WorkflowRunCard({
  run,
  selected,
  busyAction,
  hasContext,
  onContext,
  onLogs,
  onAnalyze,
  onIssue,
}: {
  run: WorkflowRun;
  selected: boolean;
  busyAction: string | null;
  hasContext: boolean;
  onContext: () => void;
  onLogs: () => void;
  onAnalyze: () => void;
  onIssue: () => void;
}) {
  return (
    <article className={`rounded-3xl border bg-white p-5 transition ${selected ? "border-teal-400 shadow-lg shadow-teal-100" : "border-teal-100 shadow-sm"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-900">{run.workflow_name || "Unnamed workflow"}</p>
          <p className="mt-1 text-xs text-slate-400">Run #{run.run_number ?? "-"} · attempt {run.run_attempt ?? "-"}</p>
        </div>
        <Badge value={run.conclusion}>{run.conclusion || "unknown"}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1">{run.head_branch || "-"}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 font-mono">{shortSha(run.head_sha)}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">{run.event || "-"}</span>
      </div>
      <p className="mt-4 text-xs text-slate-400">{formatDate(run.created_at)}</p>
      {run.html_url && <a href={run.html_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-teal-600 hover:underline">GitHub Actions에서 보기 ↗</a>}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={onContext} disabled={Boolean(busyAction)} className="rounded-full border border-teal-100 px-2 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-50">
          {busyAction === "context" ? "분석 중..." : hasContext ? "변경사항 보기" : "변경사항 분석"}
        </button>
        <button onClick={onLogs} disabled={Boolean(busyAction)} className="rounded-full border border-teal-100 px-2 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-50">
          {busyAction === "logs" ? "로딩..." : "로그"}
        </button>
        <button onClick={onAnalyze} disabled={Boolean(busyAction)} className="rounded-full border border-teal-100 px-2 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-50">
          {busyAction === "analysis" ? "분석..." : "분석"}
        </button>
        <button onClick={onIssue} disabled={Boolean(busyAction)} className="rounded-full bg-teal-500 px-2 py-2 text-xs font-bold text-white hover:bg-teal-600 disabled:opacity-50">
          {busyAction === "issue" ? "생성..." : "Issue"}
        </button>
      </div>
    </article>
  );
}
