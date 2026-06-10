import Link from "next/link";
import Badge from "@/components/Badge";
import { formatDate } from "@/lib/format";
import type { CIAnalysisReport } from "@/types/api";

export default function ReportCard({ report }: { report: CIAnalysisReport }) {
  return (
    <article className="panel p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{report.category}</Badge>
        <Badge value={report.confidence}>{report.confidence}</Badge>
        <span className="ml-auto text-xs text-slate-400">{formatDate(report.created_at)}</span>
      </div>
      <h3 className="mt-4 font-black leading-6 text-slate-900">{report.summary}</h3>
      <p className="mt-2 text-xs text-slate-400">Run #{report.github_run_id} · Report #{report.id}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/reports/${report.id}`} className="btn-primary">상세 보기</Link>
        {report.github_issue_url && <a href={report.github_issue_url} target="_blank" rel="noreferrer" className="btn-secondary">Issue #{report.github_issue_number ?? "-"}</a>}
      </div>
    </article>
  );
}
