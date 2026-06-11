"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import WorkflowRunCard from "@/components/WorkflowRunCard";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { ActionsAnalysis, AnalysisResponse, ChangeContext, GithubRepository, IssueCreateResponse, WorkflowLogs, WorkflowRun } from "@/types/api";

const RUNS_PER_PAGE = 3;

export default function RepositoryDetailPage() {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const id = Number(repositoryId);
  const [repository, setRepository] = useState<GithubRepository | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [logs, setLogs] = useState<WorkflowLogs | null>(null);
  const [analysis, setAnalysis] = useState<ActionsAnalysis | null>(null);
  const [issueResult, setIssueResult] = useState<IssueCreateResponse | null>(null);
  const [contexts, setContexts] = useState<Record<number, ChangeContext>>({});
  const [busy, setBusy] = useState<{ runId: number; action: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commitSearch, setCommitSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [runPage, setRunPage] = useState(1);

  const filteredRuns = useMemo(() => {
    const commitQuery = commitSearch.trim().toLowerCase();
    const branchQuery = branchSearch.trim().toLowerCase();

    return runs.filter((run) => {
      const matchesCommit =
        !commitQuery || (run.head_sha ?? "").toLowerCase().includes(commitQuery);
      const matchesBranch =
        !branchQuery || (run.head_branch ?? "").toLowerCase().includes(branchQuery);

      return matchesCommit && matchesBranch;
    });
  }, [branchSearch, commitSearch, runs]);

  const totalRunPages = Math.max(1, Math.ceil(filteredRuns.length / RUNS_PER_PAGE));
  const currentRunPage = Math.min(runPage, totalRunPages);
  const paginatedRuns = filteredRuns.slice(
    (currentRunPage - 1) * RUNS_PER_PAGE,
    currentRunPage * RUNS_PER_PAGE
  );

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    try {
      const [repositoryResponse, runsResponse] = await Promise.all([
        apiFetch<GithubRepository>(`/api/github/repositories/${id}`),
        apiFetch<WorkflowRun[]>(`/api/github/repositories/${id}/actions/runs?status=completed&conclusion=failure&per_page=20`),
      ]);
      setRepository(repositoryResponse.data);
      setRuns(runsResponse.data ?? []);
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

  function selectRun(runId: number) {
    if (selectedRunId !== null && selectedRunId !== runId) {
      setLogs(null);
      setAnalysis(null);
      setIssueResult(null);
    }
    setSelectedRunId(runId);
  }

  async function loadContext(runId: number, refresh = false) {
    selectRun(runId);
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
    selectRun(runId);
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청을 처리하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell>
      <Header title={repository ? `${repository.owner}/${repository.repo}` : "GitHub 저장소"} description="실패한 Actions run에서 실패 로그, 원인 분석, 커밋/PR 변경사항을 확인하고 GitHub Issue를 생성합니다." />
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
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-900">실패한 Actions run</h2>
                  <span className="text-sm font-bold text-red-500">
                    {filteredRuns.length} / {runs.length}
                  </span>
                </div>
                <div className="mt-4 space-y-3 rounded-3xl border border-teal-100 bg-white p-4 shadow-sm">
                  <label className="block text-xs font-bold text-slate-600">
                    커밋 해시 검색
                    <input
                      type="search"
                      className="input mt-2 font-mono text-sm"
                      value={commitSearch}
                      onChange={(event) => {
                        setCommitSearch(event.target.value);
                        setRunPage(1);
                      }}
                      placeholder="전체 또는 짧은 SHA 입력"
                    />
                  </label>
                  <label className="block text-xs font-bold text-slate-600">
                    브랜치 검색
                    <input
                      type="search"
                      className="input mt-2 text-sm"
                      value={branchSearch}
                      onChange={(event) => {
                        setBranchSearch(event.target.value);
                        setRunPage(1);
                      }}
                      placeholder="예: main, feature/login"
                    />
                  </label>
                  {(commitSearch || branchSearch) && (
                    <button
                      type="button"
                      className="text-xs font-bold text-teal-700 hover:underline"
                      onClick={() => {
                        setCommitSearch("");
                        setBranchSearch("");
                        setRunPage(1);
                      }}
                    >
                      검색 조건 초기화
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {paginatedRuns.length ? paginatedRuns.map((run) => (
                  <WorkflowRunCard
                    key={run.github_run_id}
                    run={run}
                    selected={selectedRunId === run.github_run_id}
                    busyAction={busy?.runId === run.github_run_id ? busy.action : null}
                    hasContext={Boolean(contexts[run.github_run_id])}
                    commitUrl={
                      repository && run.head_sha
                        ? `https://github.com/${repository.owner}/${repository.repo}/commit/${run.head_sha}`
                        : null
                    }
                    onContext={() => void loadContext(run.github_run_id)}
                    onLogs={() => void runAction(run.github_run_id, "logs")}
                    onAnalyze={() => void runAction(run.github_run_id, "analysis")}
                    onIssue={() => void runAction(run.github_run_id, "issue")}
                  />
                )) : (
                  <EmptyState
                    title={runs.length ? "검색 조건에 맞는 실패 run이 없습니다" : "실패한 run이 없습니다"}
                    description={
                      runs.length
                        ? "커밋 해시 또는 브랜치 검색어를 변경하거나 초기화하세요."
                        : "완료 상태이며 conclusion이 failure인 최근 run이 없습니다."
                    }
                  />
                )}
              </div>
              {filteredRuns.length > RUNS_PER_PAGE && (
                <nav
                  className="mt-5 flex flex-wrap items-center justify-center gap-2"
                  aria-label="실패한 Actions run 페이지"
                >
                  <button
                    type="button"
                    className="btn-secondary px-4 py-2"
                    disabled={currentRunPage === 1}
                    onClick={() => setRunPage((page) => Math.max(1, page - 1))}
                  >
                    이전
                  </button>
                  {Array.from({ length: totalRunPages }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      aria-current={page === currentRunPage ? "page" : undefined}
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${
                        page === currentRunPage
                          ? "bg-teal-500 text-white shadow-md shadow-teal-100"
                          : "border border-teal-100 bg-white text-teal-700 hover:bg-teal-50"
                      }`}
                      onClick={() => setRunPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn-secondary px-4 py-2"
                    disabled={currentRunPage === totalRunPages}
                    onClick={() => setRunPage((page) => Math.min(totalRunPages, page + 1))}
                  >
                    다음
                  </button>
                </nav>
              )}
              {filteredRuns.length > 0 && (
                <p className="mt-3 text-center text-xs text-slate-400">
                  페이지당 최대 {RUNS_PER_PAGE}개 · {currentRunPage} / {totalRunPages} 페이지
                </p>
              )}
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
              {!logs && !analysis && !issueResult && !selectedRunId && !busy && (
                <EmptyState
                  title="실패 run을 선택해 분석을 시작하세요"
                  description="왼쪽의 실패한 GitHub Actions run에서 원하는 작업을 실행하세요. 권장 순서는 실패 로그 확인 → 원인 분석 → 커밋/PR 확인 → Issue 생성입니다."
                  action={
                    <div className="mx-auto max-w-md rounded-2xl border border-teal-100 bg-white p-5 text-left shadow-sm">
                      <p className="text-sm font-black text-slate-900">권장 분석 순서</p>
                      <ol className="mt-3 space-y-2 text-sm text-slate-600">
                        <li>1. 실패 로그 보기</li>
                        <li>2. 원인 분석하기</li>
                        <li>3. 커밋/PR 변경사항 확인</li>
                        <li>4. GitHub Issue 생성</li>
                      </ol>
                    </div>
                  }
                />
              )}
            </div>
          </section>

        </>
      )}
    </AppShell>
  );
}
