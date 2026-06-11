import Link from "next/link";
import Badge from "@/components/Badge";
import SeverityBadge from "@/components/SeverityBadge";
import { formatDate } from "@/lib/format";
import type { IncidentReport } from "@/types/api";

function scoreTone(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-slate-400";
}

export default function IncidentReportCard({ report }: { report: IncidentReport }) {
  const score = Math.max(0, Math.min(100, report.analysis_score ?? 0));

  return (
    <article className="panel flex h-full flex-col p-6">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge value={report.severity} />
        <Badge value={report.status}>{report.status}</Badge>
        <span className="ml-auto text-xs text-slate-400">{formatDate(report.created_at)}</span>
      </div>

      <h2 className="mt-5 break-words text-xl font-black leading-7 text-slate-900">
        {report.title}
      </h2>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
        {report.summary}
      </p>

      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-500">Analysis Score</span>
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

      <div className="mt-auto pt-5">
        <Link href={`/incidents/${report.id}`} className="btn-primary w-full">
          통합 리포트 상세 보기
        </Link>
      </div>
    </article>
  );
}
