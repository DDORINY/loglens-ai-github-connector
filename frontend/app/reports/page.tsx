"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import ErrorBox from "@/components/ErrorBox";
import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import NextSteps from "@/components/NextSteps";
import ReportCard from "@/components/ReportCard";
import { apiFetch } from "@/lib/api";
import type { CIAnalysisReport, GithubRepository, Project } from "@/types/api";

type RepositoryOption = GithubRepository & {
  projectName: string;
};

export default function ReportsPage() {
  const [repositoryId, setRepositoryId] = useState("2");
  const [repositories, setRepositories] = useState<RepositoryOption[]>([]);
  const [reports, setReports] = useState<CIAnalysisReport[]>([]);
  const [searched, setSearched] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRepositories = useCallback(async () => {
    try {
      const projectResponse = await apiFetch<Project[]>("/api/projects");
      const projects = projectResponse.data ?? [];
      const responses = await Promise.all(
        projects.map(async (project) => {
          const response = await apiFetch<GithubRepository[]>(
            `/api/github/repositories?project_id=${project.id}`
          );
          return (response.data ?? []).map((repository) => ({
            ...repository,
            projectName: project.name,
          }));
        })
      );
      const nextRepositories = responses.flat();
      setRepositories(nextRepositories);
      setRepositoryId((current) =>
        nextRepositories.some((repository) => String(repository.id) === current)
          ? current
          : nextRepositories[0]
            ? String(nextRepositories[0].id)
            : ""
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "연결된 코드 저장소를 불러오지 못했습니다.");
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRepositories();
  }, [loadRepositories]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!repositoryId) return;
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
      <Header title="분석 결과 보기" description="코드 저장소를 선택해 자동 검사 실패 원인과 등록된 수정 작업을 확인합니다." />
      <div className="mb-6">
        <NextSteps
          steps={[
            "분석 결과를 확인할 코드 저장소를 선택합니다.",
            "실패 원인과 핵심 근거 로그를 확인합니다.",
            "관련 서버 오류 로그 후보를 추천받습니다.",
            "필요하면 통합 장애 리포트를 생성합니다.",
          ]}
        />
      </div>
      <section className="panel p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Repository reports</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">코드 저장소별 분석 결과 조회</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            분석 결과를 조회할 코드 저장소를 선택하세요. 저장소가 없다면 프로젝트 설정에서 먼저 연결해야 합니다.
          </p>
        </div>
        <form onSubmit={search} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-bold text-slate-700">
            코드 저장소
            <select
              className="input mt-2"
              value={repositoryId}
              onChange={(event) => setRepositoryId(event.target.value)}
              disabled={optionsLoading || repositories.length === 0}
              required
            >
              {optionsLoading && <option value="">저장소 목록을 불러오는 중...</option>}
              {!optionsLoading && repositories.length === 0 && <option value="">연결된 저장소가 없습니다</option>}
              {repositories.map((repository) => (
                <option key={repository.id} value={repository.id}>
                  {repository.owner}/{repository.repo} · {repository.projectName}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary h-[50px]" disabled={loading || optionsLoading || !repositoryId}>{loading ? "조회 중..." : "분석 결과 조회"}</button>
        </form>
      </section>
      <div className="mt-5"><ErrorBox message={error} /></div>
      <section className="mt-8">
        <h2 className="mb-5 text-2xl font-black text-slate-900">분석 결과 목록</h2>
        {loading ? <LoadingState /> : reports.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{reports.map((report) => <ReportCard key={report.id} report={report} />)}</div>
        ) : (
          <EmptyState
            title={searched ? "조회된 분석 결과가 없습니다" : repositories.length ? "코드 저장소를 선택해 분석 결과를 조회하세요" : "연결된 코드 저장소가 없습니다"}
            description={searched ? "이 저장소의 실패한 자동 검사에서 수정 작업을 등록하면 분석 결과가 저장됩니다." : repositories.length ? "코드 저장소를 선택한 뒤 분석 결과 조회 버튼을 누르세요." : "프로젝트 설정에서 GitHub 코드 저장소를 먼저 연결하세요."}
          />
        )}
      </section>
    </AppShell>
  );
}
