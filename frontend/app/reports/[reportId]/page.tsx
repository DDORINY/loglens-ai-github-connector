"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import AnalysisPanel from "@/components/AnalysisPanel";
import Badge from "@/components/Badge";
import ErrorBox from "@/components/ErrorBox";
import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { CIAnalysisReport } from "@/types/api";

export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<CIAnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await apiFetch<CIAnalysisReport>(`/api/analysis-reports/${reportId}`);
      setReport(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "리포트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <AppShell>
      <Header title={`Report #${reportId}`} description="분석 근거, 원인 후보, 조치 항목과 생성된 Issue를 확인합니다." />
      {loading ? <LoadingState /> : (
        <>
          <ErrorBox message={error} />
          {report && (
            <div className="mt-5 space-y-6">
              <section className="panel p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{report.category}</Badge>
                  <Badge value={report.confidence}>{report.confidence}</Badge>
                  <span className="text-xs text-slate-400">Run #{report.github_run_id} · {formatDate(report.created_at)}</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={`/repositories/${report.repository_id}`} className="btn-secondary">저장소로 이동</Link>
                  {report.github_issue_url && <a href={report.github_issue_url} target="_blank" rel="noreferrer" className="btn-primary">Issue #{report.github_issue_number ?? "-"} 열기 ↗</a>}
                </div>
              </section>
              <AnalysisPanel analysis={{
                category: report.category,
                summary: report.summary,
                confidence: report.confidence,
                evidence: report.evidence,
                suspected_causes: report.suspected_causes,
                recommended_actions: report.recommended_actions,
                issue_title: report.issue_title,
                issue_body: report.issue_body,
              }} />
              <section className="panel p-6">
                <h2 className="text-xl font-black text-slate-900">저장된 Issue 본문</h2>
                <pre className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 font-sans text-sm leading-7 text-slate-600">{report.issue_body}</pre>
              </section>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
