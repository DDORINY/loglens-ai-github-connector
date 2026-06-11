import Link from "next/link";
import Badge from "@/components/Badge";
import SeverityBadge from "@/components/SeverityBadge";
import { formatDate } from "@/lib/format";
import { friendlyIncidentTitle, incidentCategories, severityLabel } from "@/lib/incident";
import type { IncidentReport } from "@/types/api";

function scoreTone(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-slate-400";
}

export default function IncidentReportCard({ report }: { report: IncidentReport }) {
  const score = Math.max(0, Math.min(100, report.analysis_score ?? 0));
  const categories = incidentCategories(report.title);

  return (
    <article className="panel flex h-full flex-col p-6">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge value={report.severity} />
        <Badge value={report.status}>{report.status}</Badge>
        <span className="ml-auto text-xs text-slate-400">{formatDate(report.created_at)}</span>
      </div>

      <h2 className="mt-5 break-words text-xl font-black leading-7 text-slate-900">
        {friendlyIncidentTitle(report)}
      </h2>
      <p className="mt-3 text-sm text-slate-500">심각도: <strong>{severityLabel(report.severity)}</strong></p>

      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-500">분석 점수</span>
          <span className="font-black text-slate-800">
            {report.analysis_score === null ? "-" : `${score} / 100`}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
          <div
            className={`h-full rounded-full ${scoreTone(score)}`}
            style={{ width: `${report.analysis_score === null ? 0 : score}%` }}
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-black text-slate-900">가능한 원인</p>
        <ul className="mt-2 space-y-2">
          {(report.root_cause_candidates ?? []).slice(0, 3).map((cause, index) => (
            <li key={`${index}-${cause}`} className="flex gap-2 text-sm leading-6 text-slate-600">
              <span className="text-amber-500">•</span>
              <span className="line-clamp-2">{cause}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <p className="text-sm font-black text-slate-900">추천 조치</p>
        <ol className="mt-2 space-y-2">
          {(report.recommended_actions ?? []).slice(0, 3).map((action, index) => (
            <li key={`${index}-${action}`} className="flex gap-2 text-sm leading-6 text-slate-600">
              <span className="font-black text-teal-600">{index + 1}.</span>
              <span className="line-clamp-2">{action}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-5 break-words rounded-2xl bg-slate-50 px-4 py-3 font-mono text-xs text-slate-500">
        분류: {categories.length ? categories.join(" · ") : report.title}
      </p>

      <div className="mt-auto pt-5">
        <Link href={`/incidents/${report.id}`} className="btn-primary w-full">
          장애 리포트 자세히 보기
        </Link>
      </div>
    </article>
  );
}
