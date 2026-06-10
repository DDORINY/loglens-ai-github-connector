"use client";

import { useState, type FormEvent } from "react";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import ErrorBox from "@/components/ErrorBox";
import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import ReportCard from "@/components/ReportCard";
import { apiFetch } from "@/lib/api";
import type { CIAnalysisReport } from "@/types/api";

export default function ReportsPage() {
  const [repositoryId, setRepositoryId] = useState("2");
  const [reports, setReports] = useState<CIAnalysisReport[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<CIAnalysisReport[]>(`/api/analysis-reports?repository_id=${encodeURIComponent(repositoryId)}`);
      setReports(response.data ?? []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "리포트를 조회하지 못했습니다.");
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <Header title="Analysis Reports" description="저장소별 CI 실패 분석과 연결된 GitHub Issue 이력을 조회합니다." />
      <section className="panel p-6">
        <form onSubmit={search} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-bold text-slate-700">
            Repository ID
            <input className="input mt-2" type="number" min="1" value={repositoryId} onChange={(event) => setRepositoryId(event.target.value)} required />
          </label>
          <button className="btn-primary h-[50px]" disabled={loading}>{loading ? "조회 중..." : "리포트 조회"}</button>
        </form>
      </section>
      <div className="mt-5"><ErrorBox message={error} /></div>
      <section className="mt-8">
        <h2 className="mb-5 text-2xl font-black text-slate-900">리포트 목록</h2>
        {loading ? <LoadingState /> : reports.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{reports.map((report) => <ReportCard key={report.id} report={report} />)}</div>
        ) : (
          <EmptyState title={searched ? "조회된 리포트가 없습니다" : "저장소 ID를 입력하세요"} description={searched ? "이 저장소에서 Issue를 생성하면 리포트가 저장됩니다." : "기본 테스트 저장소 ID는 2입니다."} />
        )}
      </section>
    </AppShell>
  );
}
