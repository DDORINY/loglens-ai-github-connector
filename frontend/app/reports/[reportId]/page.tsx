"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import AnalysisPanel from "@/components/AnalysisPanel";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import ErrorBox from "@/components/ErrorBox";
import Header from "@/components/Header";
import IncidentCandidateCard from "@/components/IncidentCandidateCard";
import LoadingState from "@/components/LoadingState";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type {
  CIAnalysisReport,
  GithubRepository,
  IncidentAutoCreateRequest,
  IncidentCandidate,
  IncidentReport,
} from "@/types/api";

export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const router = useRouter();
  const [report, setReport] = useState<CIAnalysisReport | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<IncidentCandidate[]>([]);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [creatingIncident, setCreatingIncident] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [candidateError, setCandidateError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await apiFetch<CIAnalysisReport>(`/api/analysis-reports/${reportId}`);
      setReport(response.data);
      if (response.data) {
        const repositoryResponse = await apiFetch<GithubRepository>(
          `/api/github/repositories/${response.data.repository_id}`
        );
        setProjectId(repositoryResponse.data?.project_id ?? null);
      }
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

  async function loadCandidates() {
    if (!report || !projectId) return;

    setCandidatesLoading(true);
    setCandidateError("");
    try {
      const response = await apiFetch<IncidentCandidate[]>(
        `/api/incidents/candidates?project_id=${projectId}&github_analysis_report_id=${report.id}&limit=5`
      );
      setCandidates(response.data ?? []);
      setCandidatesLoaded(true);
    } catch (err) {
      setCandidates([]);
      setCandidatesLoaded(true);
      setCandidateError(err instanceof Error ? err.message : "서버 로그 후보를 불러오지 못했습니다.");
    } finally {
      setCandidatesLoading(false);
    }
  }

  async function createAutomaticIncident() {
    if (!report || !projectId) return;

    const payload: IncidentAutoCreateRequest = {
      project_id: projectId,
      github_analysis_report_id: report.id,
    };

    setCreatingIncident(true);
    setCandidateError("");
    try {
      const response = await apiFetch<IncidentReport>("/api/incidents/auto", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.data) {
        throw new Error("생성된 통합 장애 리포트 정보가 없습니다.");
      }
      router.push(`/incidents/${response.data.id}`);
    } catch (err) {
      setCandidateError(err instanceof Error ? err.message : "통합 장애 리포트를 생성하지 못했습니다.");
      setCreatingIncident(false);
    }
  }

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
                matched_patterns: report.matched_patterns,
                analysis_score: report.analysis_score,
                engine_version: report.engine_version,
              }} />
              <section className="panel p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">
                      Incident candidates
                    </p>
                    <h2 className="mt-2 text-xl font-black text-slate-900">서버 로그 후보 추천</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      같은 프로젝트의 최근 서버 로그 분석 리포트를 category 60%, 시간대 40% 기준으로 비교합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary shrink-0"
                    onClick={() => void loadCandidates()}
                    disabled={candidatesLoading || !projectId}
                  >
                    {candidatesLoading
                      ? "후보 분석 중..."
                      : candidatesLoaded
                        ? "서버 로그 후보 다시 추천"
                        : "서버 로그 후보 추천"}
                  </button>
                </div>

                {!projectId && (
                  <p className="mt-4 text-sm text-amber-700">
                    프로젝트 정보를 확인할 수 없어 후보 추천을 실행할 수 없습니다.
                  </p>
                )}
                <div className="mt-5">
                  <ErrorBox message={candidateError} />
                </div>

                {candidatesLoading ? (
                  <div className="mt-5">
                    <LoadingState label="연관 가능성이 높은 서버 로그 리포트를 찾는 중입니다..." />
                  </div>
                ) : candidatesLoaded && candidates.length ? (
                  <div className="mt-6 space-y-5">
                    {candidates.map((candidate, index) => (
                      <IncidentCandidateCard
                        key={candidate.server_log_analysis_report_id}
                        candidate={candidate}
                        recommended={index === 0}
                        creating={creatingIncident}
                        onCreate={() => void createAutomaticIncident()}
                      />
                    ))}
                  </div>
                ) : candidatesLoaded ? (
                  <div className="mt-5">
                    <EmptyState
                      title="추천할 서버 로그 분석 리포트가 없습니다."
                      description="같은 프로젝트에서 서버 로그를 업로드하고 분석 리포트를 먼저 생성하세요."
                    />
                  </div>
                ) : null}
              </section>
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
