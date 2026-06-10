import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { Project } from "@/types/api";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`} className="panel group block p-6 hover:-translate-y-1 hover:border-teal-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 font-black text-teal-600">
          {project.name.slice(0, 1).toUpperCase()}
        </div>
        <span className="text-sm font-bold text-teal-600 opacity-0 transition group-hover:opacity-100">열기 →</span>
      </div>
      <h3 className="mt-5 text-lg font-black text-slate-850">{project.name}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
        {project.description || "프로젝트 설명이 없습니다."}
      </p>
      <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-400">
        생성 {formatDate(project.created_at)}
      </p>
    </Link>
  );
}
