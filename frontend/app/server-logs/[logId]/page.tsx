"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import ErrorBox from "@/components/ErrorBox";
import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import ServerLogReportCard from "@/components/ServerLogReportCard";
import { apiFetch } from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/format";
import type { ServerLog, ServerLogAnalysisReport } from "@/types/api";

function lineTone(line: string): string {
  const value = line.toLowerCase();
  if (value.includes("error") || value.includes("critical") || /\b5\d\d\b/.test(value)) {
    return "text-red-300";
  }
  if (value.includes("warn")) return "text-amber-300";
  return "text-slate-200";
}

export default function ServerLogDetailPage() {
  const { logId } = useParams<{ logId: string }>();
  const router = useRouter();
  const [log, setLog] = useState<ServerLog | null>(null);
  const [reports, setReports] = useState<ServerLogAnalysisReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [logResponse, reportResponse] = await Promise.all([
        apiFetch<ServerLog>(`/api/server-logs/${logId}`),
        apiFetch<ServerLogAnalysisReport[]>(`/api/server-logs/${logId}/reports`),
      ]);
      setLog(logResponse.data);
      setReports(reportResponse.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "서버 로그 상세를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [logId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function analyze() {
    setAnalyzing(true);
    setError("");
    try {
      const response = await apiFetch<ServerLogAnalysisReport>(
        `/api/server-logs/${logId}/analyze`,
        { method: "POST" }
      );
      if (!response.data) throw new Error("서버 로그 분석 응답이 비어 있습니다.");
      router.push(`/server-log-reports/${response.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "서버 로그 분석에 실패했습니다.");
      setAnalyzing(false);
    }
  }

  return (
    <AppShell>
      <Header
        title={log?.filename ?? "서버 로그 상세"}
        description="마스킹된 서버 로그 원문을 확인하고 장애 후보 분석을 실행합니다."
      />
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <ErrorBox message={error} />
          {log && (
            <>
              <section className="panel mt-5 p-6">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">
                      Server log #{log.id}
                    </p>
                    <h2 className="mt-2 break-all text-2xl font-black text-slate-900">{log.filename}</h2>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1">출처: {log.source || "-"}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">{formatBytes(log.size_bytes)}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">프로젝트 ID: {log.project_id}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">{formatDate(log.created_at)}</span>
                    </div>
                  </div>
                  <button className="btn-primary" disabled={analyzing} onClick={() => void analyze()}>
                    {analyzing ? "분석 중..." : "서버 로그 분석 실행"}
                  </button>
                </div>
              </section>

              <section className="panel mt-6 p-6">
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  <strong>민감정보 마스킹 안내</strong>
                  <p className="mt-1">
                    업로드된 로그는 저장 전 민감정보가 마스킹됩니다. 토큰, Authorization 헤더,
                    DB URL, API Key, 이메일 등은 [MASKED] 형태로 치환됩니다.
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <h2 className="text-xl font-black text-slate-900">마스킹된 로그 원문</h2>
                  <span className="text-xs font-bold text-slate-400">
                    {log.raw_content.split("\n").length} lines
                  </span>
                </div>
                <div className="mt-4 max-h-[600px] overflow-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs leading-6">
                  {log.raw_content.split("\n").map((line, index) => (
                    <div key={`${index}-${line.slice(0, 24)}`} className={`whitespace-pre-wrap break-words ${lineTone(line)}`}>
                      {line || " "}
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-8">
                <div className="mb-5">
                  <p className="text-sm font-bold text-teal-600">{reports.length} reports</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">기존 분석 리포트</h2>
                </div>
                {reports.length ? (
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {reports.map((report) => <ServerLogReportCard key={report.id} report={report} />)}
                  </div>
                ) : (
                  <EmptyState
                    title="아직 분석 리포트가 없습니다."
                    description="서버 로그 분석 실행 버튼을 눌러 리포트를 생성하세요."
                  />
                )}
              </section>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
