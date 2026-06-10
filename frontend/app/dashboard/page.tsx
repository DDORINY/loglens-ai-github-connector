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
import type { AuthUser, Project } from "@/types/api";

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [userResponse, projectResponse] = await Promise.all([
        apiFetch<AuthUser>("/api/auth/me"),
        apiFetch<Project[]>("/api/projects"),
      ]);
      setUser(userResponse.data);
      setProjects(projectResponse.data ?? []);
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
      <Header title="Dashboard" description="CI 실패 분석 워크스페이스의 현재 상태를 확인하세요." />
      {loading ? <LoadingState /> : (
        <>
          <ErrorBox message={error} />
          <section className="grid gap-5 md:grid-cols-3">
            <StatCard label="Projects" value={projects.length} description="현재 관리 중인 프로젝트" icon="P" />
            <StatCard label="Repositories" value="연결 준비" description="프로젝트에서 GitHub 저장소를 연결하세요." icon="R" />
            <StatCard label="Analysis" value="On demand" description="실패 run을 선택해 즉시 분석합니다." icon="A" />
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
                <Link href="/reports" className="btn-secondary">리포트 보기</Link>
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
