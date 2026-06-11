import Badge from "@/components/Badge";
import { formatDate, shortSha } from "@/lib/format";
import type { WorkflowRun } from "@/types/api";

export default function WorkflowRunCard({
  run,
  selected,
  busyAction,
  hasContext,
  commitUrl,
  onContext,
  onLogs,
  onAnalyze,
  onIssue,
}: {
  run: WorkflowRun;
  selected: boolean;
  busyAction: string | null;
  hasContext: boolean;
  commitUrl?: string | null;
  onContext: () => void;
  onLogs: () => void;
  onAnalyze: () => void;
  onIssue: () => void;
}) {
  return (
    <article className={`rounded-3xl border bg-white p-5 transition ${selected ? "border-teal-400 shadow-lg shadow-teal-100" : "border-teal-100 shadow-sm"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-teal-600">무엇이 실패했나요?</p>
          <p className="mt-1 font-black text-slate-900">자동 빌드/테스트 실패</p>
          <p className="mt-1 text-xs text-slate-400">{run.workflow_name || "이름 없는 자동 검사"}</p>
        </div>
        <Badge value={run.conclusion}>{run.conclusion || "unknown"}</Badge>
      </div>
      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-black text-slate-800">어디에서 실패했나요?</p>
        <p className="mt-2">브랜치: <strong>{run.head_branch || "-"}</strong></p>
        <p className="mt-1">실행 번호: <strong>#{run.run_number ?? "-"}</strong></p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        {commitUrl && run.head_sha ? (
          <a
            href={commitUrl}
            target="_blank"
            rel="noreferrer"
            title="GitHub에서 실제 커밋 변경 내역 보기"
            className="rounded-full bg-slate-100 px-3 py-1 font-mono font-bold text-teal-700 hover:bg-teal-50 hover:underline"
          >
            {shortSha(run.head_sha)} ↗
          </a>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 font-mono">
            {shortSha(run.head_sha)}
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-3 py-1">
          분류: GitHub Actions · {run.conclusion || "unknown"} · {run.event || "-"}
        </span>
      </div>
      <p className="mt-4 text-xs text-slate-400">{formatDate(run.created_at)}</p>
      {run.html_url && <a href={run.html_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-teal-600 hover:underline">GitHub 원본 화면 보기 ↗</a>}
      <p className="mt-5 text-sm font-black text-slate-900">다음 단계</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button title="GitHub Actions 원본 실패 로그를 확인합니다." onClick={onLogs} disabled={Boolean(busyAction)} className="rounded-full border border-teal-100 px-2 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-50">
          {busyAction === "logs" ? "불러오는 중..." : "1. 실패 내용 보기"}
        </button>
        <button title="LogLens Analysis Engine v2로 실패 원인을 분석합니다." onClick={onAnalyze} disabled={Boolean(busyAction)} className="rounded-full border border-teal-100 px-2 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-50">
          {busyAction === "analysis" ? "분석 중..." : "2. AI로 원인 분석"}
        </button>
        <button title="실패 run의 head_sha 기준 변경 파일과 Pull Request를 확인합니다." onClick={onContext} disabled={Boolean(busyAction)} className="rounded-full border border-teal-100 px-2 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-50">
          {busyAction === "context" ? "불러오는 중..." : hasContext ? "3. 코드 변경 다시 보기" : "3. 최근 코드 변경 확인"}
        </button>
        <button title="분석 결과를 바탕으로 GitHub에 수정 작업을 등록하고 분석 결과를 저장합니다." onClick={onIssue} disabled={Boolean(busyAction)} className="rounded-full bg-teal-500 px-2 py-2 text-xs font-bold text-white hover:bg-teal-600 disabled:opacity-50">
          {busyAction === "issue" ? "등록 중..." : "4. 수정 작업 등록"}
        </button>
      </div>
    </article>
  );
}
