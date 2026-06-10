import Badge from "@/components/Badge";
import type { IssueCreateResponse } from "@/types/api";

export default function IssueResultCard({ result }: { result: IssueCreateResponse }) {
  return (
    <section className={`rounded-3xl border p-6 ${result.duplicated ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Badge value={result.duplicated ? "warning" : "success"}>{result.duplicated ? "Existing issue" : "Created"}</Badge>
        <span className="text-xs font-bold text-slate-500">Report #{result.report_id}</span>
      </div>
      <h2 className="mt-4 text-lg font-black text-slate-900">
        {result.duplicated ? "이미 생성된 Issue입니다. 기존 Issue를 다시 연결했습니다." : "GitHub Issue가 생성되고 분석 리포트가 저장되었습니다."}
      </h2>
      <p className="mt-2 text-sm text-slate-600">#{result.issue.number ?? "-"} {result.issue.title}</p>
      {result.issue.html_url && <a href={result.issue.html_url} target="_blank" rel="noreferrer" className="btn-secondary mt-5">GitHub Issue 열기 ↗</a>}
    </section>
  );
}
