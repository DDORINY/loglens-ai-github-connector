"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import ErrorBox from "@/components/ErrorBox";
import Header from "@/components/Header";
import IncidentReportCard from "@/components/IncidentReportCard";
import LoadingState from "@/components/LoadingState";
import NextSteps from "@/components/NextSteps";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type {
  CIAnalysisReport,
  GithubRepository,
  IncidentReport,
  IncidentReportCreate,
  Project,
  ServerLogAnalysisReport,
  ServerLogListItem,
} from "@/types/api";

type CIReportOption = CIAnalysisReport & {
  repositoryName: string;
};

type ServerReportOption = ServerLogAnalysisReport & {
  filename: string;
  source: string | null;
};

export default function IncidentsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [githubReportId, setGithubReportId] = useState("");
  const [serverLogReportId, setServerLogReportId] = useState("");
  const [ciReportOptions, setCIReportOptions] = useState<CIReportOption[]>([]);
  const [serverReportOptions, setServerReportOptions] = useState<ServerReportOption[]>([]);
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createdReport, setCreatedReport] = useState<IncidentReport | null>(null);

  const loadReports = useCallback(async (selectedProjectId: string) => {
    if (!selectedProjectId) {
      setReports([]);
      return;
    }

    setReportsLoading(true);
    setError("");
    try {
      const response = await apiFetch<IncidentReport[]>(
        `/api/incidents?project_id=${encodeURIComponent(selectedProjectId)}`
      );
      setReports(response.data ?? []);
    } catch (err) {
      setReports([]);
      setError(err instanceof Error ? err.message : "통합 장애 리포트를 불러오지 못했습니다.");
    } finally {
      setReportsLoading(false);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setError("");
    try {
      const response = await apiFetch<Project[]>("/api/projects");
      const nextProjects = response.data ?? [];
      const requestedProjectId =
        typeof window === "undefined"
          ? ""
          : new URLSearchParams(window.location.search).get("project_id") ?? "";
      setProjects(nextProjects);
      setProjectId((current) =>
        nextProjects.some((project) => String(project.id) === requestedProjectId)
          ? requestedProjectId
          : nextProjects.some((project) => String(project.id) === current)
            ? current
          : nextProjects[0]
            ? String(nextProjects[0].id)
            : ""
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로젝트를 불러오지 못했습니다.");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const loadReportOptions = useCallback(async (selectedProjectId: string) => {
    if (!selectedProjectId) {
      setCIReportOptions([]);
      setServerReportOptions([]);
      setGithubReportId("");
      setServerLogReportId("");
      return;
    }

    setOptionsLoading(true);
    setError("");
    try {
      const [repositoryResponse, logResponse] = await Promise.all([
        apiFetch<GithubRepository[]>(
          `/api/github/repositories?project_id=${encodeURIComponent(selectedProjectId)}`
        ),
        apiFetch<ServerLogListItem[]>(
          `/api/server-logs?project_id=${encodeURIComponent(selectedProjectId)}`
        ),
      ]);
      const repositories = repositoryResponse.data ?? [];
      const logs = logResponse.data ?? [];
      const [ciResponses, serverResponses] = await Promise.all([
        Promise.all(
          repositories.map(async (repository) => {
            const response = await apiFetch<CIAnalysisReport[]>(
              `/api/analysis-reports?repository_id=${repository.id}`
            );
            return (response.data ?? []).map((report) => ({
              ...report,
              repositoryName: `${repository.owner}/${repository.repo}`,
            }));
          })
        ),
        Promise.all(
          logs.map(async (log) => {
            const response = await apiFetch<ServerLogAnalysisReport[]>(
              `/api/server-logs/${log.id}/reports`
            );
            return (response.data ?? []).map((report) => ({
              ...report,
              filename: log.filename,
              source: log.source,
            }));
          })
        ),
      ]);
      const nextCIReports = ciResponses.flat().sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      );
      const nextServerReports = serverResponses.flat().sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      );
      setCIReportOptions(nextCIReports);
      setServerReportOptions(nextServerReports);
      setGithubReportId(nextCIReports[0] ? String(nextCIReports[0].id) : "");
      setServerLogReportId(nextServerReports[0] ? String(nextServerReports[0].id) : "");
    } catch (err) {
      setCIReportOptions([]);
      setServerReportOptions([]);
      setGithubReportId("");
      setServerLogReportId("");
      setError(err instanceof Error ? err.message : "통합할 분석 결과를 불러오지 못했습니다.");
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReports(projectId);
  }, [loadReports, projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReportOptions(projectId);
  }, [loadReportOptions, projectId]);

  async function createReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !githubReportId || !serverLogReportId) return;

    const payload: IncidentReportCreate = {
      project_id: Number(projectId),
      github_analysis_report_id: Number(githubReportId),
      server_log_analysis_report_id: Number(serverLogReportId),
    };

    setCreating(true);
    setError("");
    setSuccessMessage("");
    setCreatedReport(null);
    try {
      const response = await apiFetch<IncidentReport>("/api/incidents", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.data) {
        throw new Error("생성된 통합 장애 리포트 정보가 없습니다.");
      }

      setCreatedReport(response.data);
      setSuccessMessage(response.message ?? "통합 장애 리포트가 준비되었습니다.");
      await loadReports(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "통합 장애 리포트를 생성하지 못했습니다.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell>
      <Header
        title="통합 장애 리포트"
        description="자동 검사 실패와 서버 오류 분석 결과를 선택해 하나의 장애 원인과 다음 조치로 정리합니다."
      />

      <div className="mb-6">
        <NextSteps
          steps={[
            "프로젝트를 선택합니다.",
            "자동 검사 실패 분석 결과를 선택합니다.",
            "같은 시기의 서버 오류 분석 결과를 선택합니다.",
            "선택한 두 결과로 통합 장애 리포트를 생성합니다.",
          ]}
        />
      </div>

      <section className="panel p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">
          Create incident report
        </p>
        <h2 className="mt-2 text-xl font-black text-slate-900">두 분석 결과를 하나로 연결하기</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          숫자 ID를 찾을 필요 없이 아래 목록에서 자동 검사 실패와 서버 오류 분석 결과를 선택하세요.
        </p>

        <form onSubmit={createReport} className="mt-6 space-y-5">
          <label className="text-sm font-bold text-slate-700">
            프로젝트
            <select
              className="input mt-2"
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                setCreatedReport(null);
                setSuccessMessage("");
              }}
              disabled={projectsLoading || projects.length === 0}
              required
            >
              {projectsLoading && <option value="">프로젝트를 불러오는 중...</option>}
              {!projectsLoading && projects.length === 0 && <option value="">프로젝트가 없습니다</option>}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} (ID: {project.id})
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-5 lg:grid-cols-2">
            <label className="rounded-3xl border border-teal-100 bg-teal-50/40 p-5 text-sm font-bold text-slate-700">
              1. 자동 검사 실패 분석 결과 선택
              <select
                className="input mt-3"
                value={githubReportId}
                onChange={(event) => setGithubReportId(event.target.value)}
                disabled={optionsLoading || ciReportOptions.length === 0}
                required
              >
                {optionsLoading && <option value="">분석 결과를 불러오는 중...</option>}
                {!optionsLoading && ciReportOptions.length === 0 && <option value="">선택할 자동 검사 분석 결과가 없습니다</option>}
                {ciReportOptions.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.repositoryName} · {report.category} · {report.analysis_score ?? "-"}점 · {formatDate(report.created_at)}
                  </option>
                ))}
              </select>
              {githubReportId && (
                <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-normal text-slate-600">
                  {(() => {
                    const selected = ciReportOptions.find((report) => String(report.id) === githubReportId);
                    return selected ? (
                      <>
                        <p className="font-black text-slate-900">{selected.summary}</p>
                        <p className="mt-2">분류: {selected.category}</p>
                        <p className="mt-1">분석 점수: {selected.analysis_score ?? "-"} / 100</p>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </label>

            <label className="rounded-3xl border border-teal-100 bg-teal-50/40 p-5 text-sm font-bold text-slate-700">
              2. 서버 오류 로그 분석 결과 선택
              <select
                className="input mt-3"
                value={serverLogReportId}
                onChange={(event) => setServerLogReportId(event.target.value)}
                disabled={optionsLoading || serverReportOptions.length === 0}
                required
              >
                {optionsLoading && <option value="">분석 결과를 불러오는 중...</option>}
                {!optionsLoading && serverReportOptions.length === 0 && <option value="">선택할 서버 오류 분석 결과가 없습니다</option>}
                {serverReportOptions.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.source || report.filename} · {report.category} · {report.severity} · {report.analysis_score ?? "-"}점
                  </option>
                ))}
              </select>
              {serverLogReportId && (
                <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-normal text-slate-600">
                  {(() => {
                    const selected = serverReportOptions.find((report) => String(report.id) === serverLogReportId);
                    return selected ? (
                      <>
                        <p className="font-black text-slate-900">{selected.summary}</p>
                        <p className="mt-2">로그 출처: {selected.source || selected.filename}</p>
                        <p className="mt-1">심각도: {selected.severity} · 점수: {selected.analysis_score ?? "-"} / 100</p>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </label>
          </div>

          {!optionsLoading && (!ciReportOptions.length || !serverReportOptions.length) && (
            <EmptyState
              title="통합할 분석 결과가 없습니다."
              description="먼저 자동 검사 실패 분석 또는 서버 오류 로그 분석을 실행하세요."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/reports" className="btn-secondary">자동 검사 분석 결과 보기</Link>
                  <Link href="/server-logs" className="btn-secondary">서버 오류 로그 분석</Link>
                </div>
              }
            />
          )}

          <button
            className="btn-primary"
            disabled={
              creating ||
              optionsLoading ||
              !projectId ||
              !githubReportId ||
              !serverLogReportId
            }
          >
            {creating ? "생성 중..." : "선택한 결과로 통합 장애 리포트 생성"}
          </button>
        </form>

        {successMessage && createdReport && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold">{successMessage}</p>
              <p className="mt-1 text-xs text-emerald-700">리포트 #{createdReport.id} · 목록을 갱신했습니다.</p>
            </div>
            <Link href={`/incidents/${createdReport.id}`} className="btn-secondary shrink-0">
              생성된 리포트 보기
            </Link>
          </div>
        )}
      </section>

      <div className="mt-5">
        <ErrorBox message={error} />
        {error && (
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => projectId ? void loadReports(projectId) : void loadProjects()}
              disabled={projectsLoading || reportsLoading}
            >
              다시 시도
            </button>
          </div>
        )}
      </div>

      <section className="mt-8">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold text-teal-600">{reports.length}개 결과</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">통합 장애 리포트 목록</h2>
          </div>
          {projectId && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void loadReports(projectId)}
              disabled={reportsLoading}
            >
              {reportsLoading ? "새로고침 중..." : "목록 새로고침"}
            </button>
          )}
        </div>

        {projectsLoading || reportsLoading ? (
          <LoadingState label="통합 장애 리포트를 불러오는 중입니다..." />
        ) : reports.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {reports.map((report) => (
              <IncidentReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : error ? null : (
          <EmptyState
            title={projects.length ? "생성된 통합 장애 리포트가 없습니다." : "프로젝트가 없습니다."}
            description={
              projects.length
                ? "위 생성 영역에서 두 분석 결과를 연결해 첫 통합 장애 리포트를 생성하세요."
                : "프로젝트를 먼저 생성한 뒤 분석 결과를 연결할 수 있습니다."
            }
            action={
              projects.length === 0
                ? <Link href="/projects" className="btn-primary">프로젝트 관리</Link>
                : undefined
            }
          />
        )}
      </section>
    </AppShell>
  );
}
