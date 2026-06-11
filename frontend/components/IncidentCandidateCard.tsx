import Badge from "@/components/Badge";
import SeverityBadge from "@/components/SeverityBadge";
import { formatDate } from "@/lib/format";
import type { IncidentCandidate } from "@/types/api";

function scoreTone(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-slate-400";
}

function ScoreItem({ label, score }: { label: string; score: number }) {
  const value = Math.max(0, Math.min(100, score));

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-500">{label}</span>
        <span className="font-black text-slate-800">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
        <div className={`h-full rounded-full ${scoreTone(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function IncidentCandidateCard({
  candidate,
  recommended,
  creating,
  onCreate,
}: {
  candidate: IncidentCandidate;
  recommended: boolean;
  creating: boolean;
  onCreate: () => void;
}) {
  return (
    <article className={`rounded-3xl border bg-white p-6 ${recommended ? "border-teal-300 shadow-lg shadow-teal-100" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{candidate.category}</Badge>
        <SeverityBadge value={candidate.severity} />
        {recommended && <Badge value="open">추천 1순위</Badge>}
        <span className="ml-auto text-xs text-slate-400">{formatDate(candidate.created_at)}</span>
      </div>

      <p className="mt-4 break-words text-sm font-bold leading-6 text-slate-800">
        {candidate.summary}
      </p>
      <p className="mt-2 text-xs text-slate-400">
        서버 로그 분석 리포트 #{candidate.server_log_analysis_report_id} · 시간 차이 {candidate.time_delta_minutes}분
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ScoreItem label="Candidate" score={candidate.candidate_score} />
        <ScoreItem label="Category" score={candidate.category_match_score} />
        <ScoreItem label="Time" score={candidate.time_match_score} />
      </div>

      <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
        <p className="text-xs font-black uppercase tracking-wider text-teal-700">Match Reasons</p>
        {candidate.match_reasons.length ? (
          <ul className="mt-3 space-y-2">
            {candidate.match_reasons.map((reason, index) => (
              <li key={`${index}-${reason}`} className="flex gap-3 text-sm leading-6 text-slate-600">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                <span className="min-w-0 break-words">{reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-400">표시할 매칭 근거가 없습니다.</p>
        )}
      </div>

      {recommended && (
        <button type="button" className="btn-primary mt-5 w-full" onClick={onCreate} disabled={creating}>
          {creating ? "통합 리포트 생성 중..." : "이 후보로 통합 리포트 생성"}
        </button>
      )}
    </article>
  );
}
