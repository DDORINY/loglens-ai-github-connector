"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import ErrorBox from "@/components/ErrorBox";
import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import NextSteps from "@/components/NextSteps";
import RepositoryCard from "@/components/RepositoryCard";
import RepositoryConnectForm from "@/components/RepositoryConnectForm";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { GithubRepository, Project } from "@/types/api";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const [project, setProject] = useState<Project | null>(null);
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    try {
      const [projectResponse, repositoryResponse] = await Promise.all([
        apiFetch<Project>(`/api/projects/${id}`),
        apiFetch<GithubRepository[]>(`/api/github/repositories?project_id=${id}`),
      ]);
      setProject(projectResponse.data);
      setRepositories(repositoryResponse.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로젝트 상세를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <AppShell>
      <Header title={project?.name ?? "프로젝트 상세"} description="자동 검사를 확인할 코드 저장소와 분석 시작점을 관리합니다." />
      {loading ? <LoadingState /> : (
        <>
          <ErrorBox message={error} />
          {project && (
            <section className="panel mt-5 p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Project #{project.id}</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">{project.name}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{project.description || "프로젝트 설명이 없습니다."}</p>
                  <p className="mt-3 text-xs text-slate-400">생성 {formatDate(project.created_at)}</p>
                </div>
                <Link href="/projects" className="btn-secondary">프로젝트 목록</Link>
              </div>
            </section>
          )}

          <div className="mt-6"><RepositoryConnectForm projectId={id} onConnected={(repository) => {
            setRepositories((current) => [repository, ...current.filter((item) => item.id !== repository.id)]);
          }} /></div>

          <div className="mt-6">
            <NextSteps
              steps={[
                "GitHub 코드 저장소를 연결합니다.",
                "연결된 저장소에서 실패한 자동 검사를 확인합니다.",
                "실패 내용과 원인을 분석합니다.",
                "필요하면 서버 오류 로그와 연결해 장애 리포트를 만듭니다.",
              ]}
            />
          </div>

          <section className="mt-8">
            <p className="text-sm font-bold text-teal-600">{repositories.length} repositories</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">연결된 코드 저장소</h2>
            {repositories.length ? (
              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {repositories.map((repository) => <RepositoryCard key={repository.id} repository={repository} />)}
              </div>
            ) : (
              <div className="mt-5"><EmptyState title="연결된 코드 저장소가 없습니다" description="위 연결 영역에서 GitHub 코드 저장소와 접근 토큰(PAT)을 입력하세요." /></div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
