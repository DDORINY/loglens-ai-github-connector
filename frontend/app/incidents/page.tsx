"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import ErrorBox from "@/components/ErrorBox";
import Header from "@/components/Header";
import IncidentReportCard from "@/components/IncidentReportCard";
import LoadingState from "@/components/LoadingState";
import { apiFetch } from "@/lib/api";
import type {
  IncidentReport,
  IncidentReportCreate,
  Project,
} from "@/types/api";

export default function IncidentsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [githubReportId, setGithubReportId] = useState("");
  const [serverLogReportId, setServerLogReportId] = useState("");
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReports(projectId);
  }, [loadReports, projectId]);

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
        description="GitHub Actions 분석과 서버 로그 분석을 연결해 하나의 장애 원인 후보와 조치 계획으로 확인합니다."
      />

      <section className="panel p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">
          Create incident report
        </p>
        <h2 className="mt-2 text-xl font-black text-slate-900">통합 리포트 생성</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          같은 프로젝트의 GitHub Actions 분석 리포트 ID와 서버 로그 분석 리포트 ID를 입력하세요.
          동일한 조합이 이미 존재하면 기존 리포트를 안전하게 반환합니다.
        </p>

        <form onSubmit={createReport} className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-end">
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

          <label className="text-sm font-bold text-slate-700">
            Actions 분석 리포트 ID
            <input
              className="input mt-2"
              type="number"
              min="1"
              inputMode="numeric"
              value={githubReportId}
              onChange={(event) => setGithubReportId(event.target.value)}
              placeholder="예: 1"
              required
            />
          </label>

          <label className="text-sm font-bold text-slate-700">
            서버 로그 분석 리포트 ID
            <input
              className="input mt-2"
              type="number"
              min="1"
              inputMode="numeric"
              value={serverLogReportId}
              onChange={(event) => setServerLogReportId(event.target.value)}
              placeholder="예: 1"
              required
            />
          </label>

          <button
            className="btn-primary h-[50px]"
            disabled={creating || projectsLoading || !projectId}
          >
            {creating ? "생성 중..." : "통합 리포트 생성"}
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
      </div>

      <section className="mt-8">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold text-teal-600">{reports.length} reports</p>
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
        ) : (
          <EmptyState
            title={projects.length ? "생성된 통합 장애 리포트가 없습니다." : "프로젝트가 없습니다."}
            description={
              projects.length
                ? "위 생성 영역에서 두 분석 리포트를 연결해 첫 통합 장애 리포트를 생성하세요."
                : "프로젝트를 먼저 생성한 뒤 분석 리포트를 연결할 수 있습니다."
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
