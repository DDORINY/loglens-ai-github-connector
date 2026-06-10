"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import ErrorBox from "@/components/ErrorBox";
import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import ProjectCard from "@/components/ProjectCard";
import StatCard from "@/components/StatCard";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AuthUser, GithubRepository, Project } from "@/types/api";

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [userResponse, projectResponse] = await Promise.all([
        apiFetch<AuthUser>("/api/auth/me"),
        apiFetch<Project[]>("/api/projects"),
      ]);
      setUser(userResponse.data);
      const nextProjects = projectResponse.data ?? [];
      setProjects(nextProjects);
      const repositoryResponses = await Promise.all(
        nextProjects.map((project) =>
          apiFetch<GithubRepository[]>(`/api/github/repositories?project_id=${project.id}`)
        )
      );
      setRepositories(repositoryResponses.flatMap((response) => response.data ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "대시보드를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <AppShell>
      <Header title="대시보드" description="프로젝트 연결부터 GitHub Actions 실패 분석까지 한 단계씩 시작하세요." />
      {loading ? <LoadingState /> : (
        <>
          <ErrorBox message={error} />
          <section className="grid gap-5 md:grid-cols-3">
            <StatCard label="프로젝트" value={projects.length} description="현재 관리 중인 프로젝트" icon="P" />
            <StatCard label="GitHub 저장소" value={repositories.length} description="Actions run을 조회할 연결 저장소" icon="R" />
            <StatCard label="원인 분석" value="실패 run 분석" description="저장소 화면에서 실패한 GitHub Actions run을 선택하고 로그 분석과 Issue 생성을 실행하세요." icon="A" />
          </section>

          <section className="panel mt-6 p-6 sm:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Quick start</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">분석 시작하기</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">아래 순서대로 진행하면 첫 GitHub Actions 실패 분석과 리포트 생성을 완료할 수 있습니다.</p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["1", "프로젝트 선택", "분석 대상을 프로젝트 단위로 관리합니다."],
                ["2", "GitHub 저장소 연결", "PAT로 Actions run을 조회할 저장소를 연결합니다."],
                ["3", "실패한 Actions run 분석", "실패 로그와 원인, 커밋/PR 변경사항을 확인합니다."],
                ["4", "Issue 생성 및 리포트 저장", "분석 결과를 GitHub Issue와 분석 리포트로 남깁니다."],
              ].map(([number, title, description]) => (
                <article key={number} className="rounded-2xl border border-teal-100 bg-teal-50/50 p-5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500 text-sm font-black text-white">{number}</span>
                  <h3 className="mt-4 font-black text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                </article>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/projects" className="btn-primary">프로젝트 관리하기</Link>
              <Link href={repositories[0] ? `/repositories/${repositories[0].id}` : "/projects"} className="btn-secondary">저장소 보기</Link>
              <Link href="/reports" className="btn-secondary">분석 리포트 보기</Link>
              <Link href="/server-logs" className="btn-secondary">서버 로그 분석하기</Link>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="panel p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500 text-sm font-black text-white">CI</span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-600">GitHub</p>
                  <h2 className="mt-1 text-xl font-black text-slate-900">GitHub Actions 실패 분석</h2>
                </div>
              </div>
              <ul className="mt-5 space-y-2 text-sm leading-6 text-slate-600">
                <li>1. 실패한 Actions run 조회</li>
                <li>2. 실패 로그와 원인 분석</li>
                <li>3. 커밋/PR 확인 후 GitHub Issue 생성</li>
              </ul>
              <Link href={repositories[0] ? `/repositories/${repositories[0].id}` : "/projects"} className="btn-primary mt-5">
                Actions 실패 분석하기
              </Link>
            </article>

            <article className="panel p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 font-mono text-xs font-black text-white">LOG</span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-600">Operations</p>
                  <h2 className="mt-1 text-xl font-black text-slate-900">서버 로그 분석</h2>
                </div>
              </div>
              <ul className="mt-5 space-y-2 text-sm leading-6 text-slate-600">
                <li>1. .log 또는 .txt 파일 업로드</li>
                <li>2. ERROR, WARN, HTTP 5xx 패턴 탐지</li>
                <li>3. 장애 후보 분석 리포트 생성</li>
              </ul>
              <Link href="/server-logs" className="btn-primary mt-5">
                서버 로그 분석하기
              </Link>
            </article>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
            <article className="panel p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Account</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">사용자 정보</h2>
              <div className="mt-6 rounded-2xl bg-teal-50 p-5">
                <p className="text-sm font-bold text-slate-900">{user?.email ?? "-"}</p>
                <p className="mt-2 text-xs text-slate-500">User #{user?.id ?? "-"} · 가입 {formatDate(user?.created_at)}</p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <Link href="/projects" className="btn-primary">프로젝트 관리</Link>
                <Link href="/projects#new-project" className="btn-secondary">새 프로젝트 생성</Link>
                <Link href="/reports" className="btn-secondary">분석 리포트 보기</Link>
              </div>
            </article>

            <article className="panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Recent</p>
                  <h2 className="mt-2 text-xl font-black text-slate-900">최근 프로젝트</h2>
                </div>
                <Link href="/projects" className="text-sm font-bold text-teal-600">전체 보기 →</Link>
              </div>
              {projects.length ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {projects.slice(0, 2).map((project) => <ProjectCard key={project.id} project={project} />)}
                </div>
              ) : (
                <div className="mt-6">
                  <EmptyState title="아직 프로젝트가 없습니다" description="첫 프로젝트를 만들고 GitHub 저장소를 연결하세요." action={<Link href="/projects#new-project" className="btn-primary">프로젝트 만들기</Link>} />
                </div>
              )}
            </article>
          </section>

          <section className="panel mt-6 p-6">
            <h2 className="text-xl font-black text-slate-900">최근 분석 리포트</h2>
            <div className="mt-5">
              <EmptyState title="저장소를 선택하면 분석 이력이 표시됩니다" description="프로젝트의 연결 저장소에서 실패한 Actions run을 분석해 첫 리포트를 생성하세요." />
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
