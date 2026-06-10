import Link from "next/link";
import Badge from "@/components/Badge";
import { formatDate } from "@/lib/format";
import type { GithubRepository } from "@/types/api";

export default function RepositoryCard({ repository }: { repository: GithubRepository }) {
  return (
    <article className="panel group p-6 hover:-translate-y-1 hover:border-teal-300">
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 font-mono text-sm font-bold text-white">&lt;/&gt;</span>
        <Badge value="success">연결됨</Badge>
      </div>
      <h3 className="mt-5 break-all text-lg font-black text-slate-850">{repository.owner}/{repository.repo}</h3>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1">기본 브랜치: {repository.default_branch || "-"}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">저장소 ID: {repository.id}</span>
      </div>
      <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-400">
        연결 {formatDate(repository.connected_at)}
      </p>
      <Link href={`/repositories/${repository.id}`} className="btn-primary mt-5 w-full">
        Actions 분석하기
      </Link>
    </article>
  );
}
