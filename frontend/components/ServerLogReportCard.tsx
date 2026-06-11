import Link from "next/link";
import Badge from "@/components/Badge";
import SeverityBadge from "@/components/SeverityBadge";
import { formatDate } from "@/lib/format";
import type { ServerLogAnalysisReport } from "@/types/api";

export default function ServerLogReportCard({
  report,
}: {
  report: ServerLogAnalysisReport;
}) {
  return (
    <article className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{report.category}</Badge>
        <SeverityBadge value={report.severity} />
        {report.analysis_score !== null && (
          <span className="ml-auto text-sm font-black text-teal-700">
            {report.analysis_score}/100
          </span>
        )}
      </div>
      <h3 className="mt-4 font-black leading-6 text-slate-900">{report.summary}</h3>
      {report.engine_version && (
        <p className="mt-2 font-mono text-xs text-slate-400">{report.engine_version}</p>
      )}
      <p className="mt-3 text-xs text-slate-400">{formatDate(report.created_at)}</p>
      <Link href={`/server-log-reports/${report.id}`} className="btn-primary mt-5">
        분석 결과 자세히 보기
      </Link>
    </article>
  );
}
