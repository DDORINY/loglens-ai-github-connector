import Link from "next/link";
import { formatBytes, formatDate } from "@/lib/format";
import type { ServerLogListItem } from "@/types/api";

export default function ServerLogCard({
  log,
  analyzing,
  onAnalyze,
}: {
  log: ServerLogListItem;
  analyzing: boolean;
  onAnalyze: () => void;
}) {
  return (
    <article className="panel p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 font-mono text-sm font-bold text-white">
          LOG
        </span>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
          {log.source || "source 미지정"}
        </span>
      </div>
      <h3 className="mt-5 break-all text-lg font-black text-slate-900">{log.filename}</h3>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1">{formatBytes(log.size_bytes)}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">로그 ID: {log.id}</span>
      </div>
      <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-400">
        업로드 {formatDate(log.created_at)}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link href={`/server-logs/${log.id}`} className="btn-secondary">
          상세 보기
        </Link>
        <button className="btn-primary" disabled={analyzing} onClick={onAnalyze}>
          {analyzing ? "분석 중..." : "분석하기"}
        </button>
      </div>
    </article>
  );
}
