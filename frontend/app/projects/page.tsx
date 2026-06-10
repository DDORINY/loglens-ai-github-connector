"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import ErrorBox from "@/components/ErrorBox";
import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import ProjectCard from "@/components/ProjectCard";
import { apiFetch } from "@/lib/api";
import type { Project } from "@/types/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await apiFetch<Project[]>("/api/projects");
      setProjects(response.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로젝트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const response = await apiFetch<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name, description: description || null }),
      });
      if (response.data) setProjects((current) => [response.data as Project, ...current]);
      setName("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로젝트 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell>
      <Header title="Projects" description="서비스와 저장소를 프로젝트 단위로 구성하고 관리합니다." />
      <ErrorBox message={error} />
      <section id="new-project" className="panel mt-5 p-6 sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">New project</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">프로젝트 생성</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">분석 목적이나 서비스 경계에 맞게 프로젝트를 만드세요.</p>
          </div>
          <form onSubmit={createProject} className="grid gap-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
            <label className="text-sm font-bold text-slate-700">
              이름
              <input className="input mt-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="STACCATO 장애 분석" required />
            </label>
            <label className="text-sm font-bold text-slate-700">
              설명
              <input className="input mt-2" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="GitHub Actions 실패를 분석합니다." />
            </label>
            <button className="btn-primary h-[50px]" disabled={creating}>{creating ? "생성 중..." : "생성"}</button>
          </form>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-sm font-bold text-teal-600">{projects.length} projects</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">프로젝트 목록</h2>
          </div>
        </div>
        {loading ? <LoadingState /> : projects.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => <ProjectCard key={project.id} project={project} />)}
          </div>
        ) : (
          <EmptyState title="프로젝트가 없습니다" description="위 폼에서 첫 프로젝트를 생성하세요." />
        )}
      </section>
    </AppShell>
  );
}
