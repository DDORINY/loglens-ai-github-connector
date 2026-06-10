"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import AnalysisPanel from "@/components/AnalysisPanel";
import Badge from "@/components/Badge";
import ChangeContextPanel from "@/components/ChangeContextPanel";
import EmptyState from "@/components/EmptyState";
import ErrorBox from "@/components/ErrorBox";
import Header from "@/components/Header";
import IssueResultCard from "@/components/IssueResultCard";
import LoadingState from "@/components/LoadingState";
import LogViewer from "@/components/LogViewer";
import ReportCard from "@/components/ReportCard";
import WorkflowRunCard from "@/components/WorkflowRunCard";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { ActionsAnalysis, AnalysisResponse, ChangeContext, CIAnalysisReport, GithubRepository, IssueCreateResponse, WorkflowLogs, WorkflowRun } from "@/types/api";

export default function RepositoryDetailPage() {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const id = Number(repositoryId);
  const [repository, setRepository] = useState<GithubRepository | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [reports, setReports] = useState<CIAnalysisReport[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [logs, setLogs] = useState<WorkflowLogs | null>(null);
  const [analysis, setAnalysis] = useState<ActionsAnalysis | null>(null);
  const [issueResult, setIssueResult] = useState<IssueCreateResponse | null>(null);
  const [contexts, setContexts] = useState<Record<number, ChangeContext>>({});
  const [busy, setBusy] = useState<{ runId: number; action: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    const response = await apiFetch<CIAnalysisReport[]>(`/api/analysis-reports?repository_id=${id}`);
    setReports(response.data ?? []);
  }, [id]);

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    try {
      const [repositoryResponse, runsResponse, reportsResponse] = await Promise.all([
        apiFetch<GithubRepository>(`/api/github/repositories/${id}`),
        apiFetch<WorkflowRun[]>(`/api/github/repositories/${id}/actions/runs?status=completed&conclusion=failure&per_page=20`),
        apiFetch<CIAnalysisReport[]>(`/api/analysis-reports?repository_id=${id}`),
      ]);
      setRepository(repositoryResponse.data);
      setRuns(runsResponse.data ?? []);
      setReports(reportsResponse.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장소 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function loadContext(runId: number, refresh = false) {
    setSelectedRunId(runId);
    if (contexts[runId] && !refresh) return;

    setBusy({ runId, action: "context" });
    setError("");
    try {
      const response = await apiFetch<ChangeContext>(
        `/api/github/repositories/${id}/actions/runs/${runId}/context`
      );
      if (!response.data) throw new Error("변경사항 분석 응답이 비어 있습니다.");
      setContexts((current) => ({ ...current, [runId]: response.data as ChangeContext }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "변경사항 컨텍스트를 불러오지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function runAction(runId: number, action: "logs" | "analysis" | "issue") {
    setSelectedRunId(runId);
    setBusy({ runId, action });
    setError("");
    try {
      if (action === "logs") {
        const response = await apiFetch<WorkflowLogs>(`/api/github/repositories/${id}/actions/runs/${runId}/logs`);
        setLogs(response.data);
      } else if (action === "analysis") {
        const response = await apiFetch<AnalysisResponse>(`/api/github/repositories/${id}/actions/runs/${runId}/analysis`);
        setAnalysis(response.data?.analysis ?? null);
      } else {
        const response = await apiFetch<IssueCreateResponse>(`/api/github/repositories/${id}/actions/runs/${runId}/issues`, {
          method: "POST",
          body: JSON.stringify({ labels: ["ci-failure", "loglens"] }),
        });
        setIssueResult(response.data);
        if (response.data) setAnalysis(response.data.analysis);
        await loadReports();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청을 처리하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell>
      <Header title={repository ? `${repository.owner}/${repository.repo}` : "Repository"} description="실패한 workflow run을 살펴보고 로그 분석과 Issue 생성을 실행합니다." />
      {loading ? <LoadingState /> : (
        <>
          <ErrorBox message={error} />
          {repository && (
            <section className="panel mt-5 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 font-mono text-sm font-bold text-white">&lt;/&gt;</span>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{repository.owner}/{repository.repo}</h2>
                  <p className="mt-1 text-xs text-slate-400">연결 {formatDate(repository.connected_at)}</p>
                </div>
                <div className="ml-auto"><Badge value="success">{repository.default_branch || "default branch"}</Badge></div>
              </div>
            </section>
          )}

          <section className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">실패한 Actions runs</h2>
                <span className="text-sm font-bold text-red-500">{runs.length}</span>
              </div>
              <div className="space-y-4">
                {runs.length ? runs.map((run) => (
                  <WorkflowRunCard
                    key={run.github_run_id}
                    run={run}
                    selected={selectedRunId === run.github_run_id}
                    busyAction={busy?.runId === run.github_run_id ? busy.action : null}
                    hasContext={Boolean(contexts[run.github_run_id])}
                    onContext={() => void loadContext(run.github_run_id)}
                    onLogs={() => void runAction(run.github_run_id, "logs")}
                    onAnalyze={() => void runAction(run.github_run_id, "analysis")}
                    onIssue={() => void runAction(run.github_run_id, "issue")}
                  />
                )) : <EmptyState title="실패한 run이 없습니다" description="완료 상태이며 conclusion이 failure인 최근 run이 없습니다." />}
              </div>
            </div>

            <div className="space-y-5">
              {busy && <LoadingState label={busy.action === "context" ? "변경사항과 실패 로그의 연관도를 분석하는 중입니다..." : busy.action === "logs" ? "로그를 다운로드하는 중입니다..." : busy.action === "analysis" ? "실패 원인을 분석하는 중입니다..." : "GitHub Issue를 생성하는 중입니다..."} />}
              {issueResult && <IssueResultCard result={issueResult} />}
              {selectedRunId && contexts[selectedRunId] && (
                <ChangeContextPanel
                  context={contexts[selectedRunId]}
                  refreshing={busy?.runId === selectedRunId && busy.action === "context"}
                  onRefresh={() => void loadContext(selectedRunId, true)}
                />
              )}
              {analysis && <AnalysisPanel analysis={analysis} />}
              {logs && <LogViewer logs={logs} />}
              {!logs && !analysis && !issueResult && !selectedRunId && !busy && <EmptyState title="분석할 run을 선택하세요" description="왼쪽 run 카드에서 변경사항 분석, 로그 보기, 분석하기 또는 Issue 생성을 실행할 수 있습니다." />}
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-5">
              <p className="text-sm font-bold text-teal-600">{reports.length} reports</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">분석 리포트 이력</h2>
            </div>
            {reports.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{reports.map((report) => <ReportCard key={report.id} report={report} />)}</div> : <EmptyState title="저장된 분석 리포트가 없습니다" description="Issue를 생성하면 분석 결과가 리포트로 저장됩니다." />}
          </section>
        </>
      )}
    </AppShell>
  );
}
