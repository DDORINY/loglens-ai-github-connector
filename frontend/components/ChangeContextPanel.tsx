import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import { formatDate, shortSha } from "@/lib/format";
import type { ChangeContext } from "@/types/api";

function fileStatusTone(status?: string | null): string {
  switch (status?.toLowerCase()) {
    case "added":
      return "bg-emerald-50 text-emerald-700";
    case "modified":
      return "bg-sky-50 text-sky-700";
    case "removed":
    case "deleted":
      return "bg-red-50 text-red-600";
    case "renamed":
      return "bg-purple-50 text-purple-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function ChangeContextPanel({
  context,
  refreshing,
  onRefresh,
}: {
  context: ChangeContext;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const score = Math.max(0, Math.min(100, context.relevance.score));
  const scoreTone =
    score >= 70
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : score >= 30
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">
            Change Context
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-900">
            실패 run 변경사항 분석
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {context.workflow_name || "Workflow"} · {context.head_branch || "-"}
          </p>
        </div>
        <button className="btn-secondary" disabled={refreshing} onClick={onRefresh}>
          {refreshing ? "새로고침 중..." : "새로고침"}
        </button>
      </div>

      <div className={`mt-6 rounded-3xl border p-5 ${scoreTone}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">
              Relevance Score
            </p>
            <p className="mt-2 text-4xl font-black">{score}</p>
          </div>
          <div className="w-full max-w-xs rounded-full bg-white/70 p-1">
            <div
              className="h-2 rounded-full bg-current transition-[width]"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
        <ul className="mt-5 space-y-2">
          {context.relevance.reasons.map((reason, index) => (
            <li key={`${index}-${reason}`} className="flex gap-3 text-sm leading-6">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-current" />
              {reason}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {context.relevance.matched_keywords.length ? (
            context.relevance.matched_keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-current/15 bg-white/70 px-3 py-1 text-xs font-bold"
              >
                {keyword}
              </span>
            ))
          ) : (
            <span className="text-xs opacity-70">일치한 키워드가 없습니다.</span>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-teal-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-600">
            Related Commit
          </p>
          <h3 className="mt-3 break-words font-black leading-6 text-slate-900">
            {context.commit.message || "커밋 메시지가 없습니다."}
          </h3>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {context.commit.author || "Unknown author"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-mono">
              {shortSha(context.commit.sha || context.head_sha)}
            </span>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            {formatDate(context.commit.committed_at)}
          </p>
          {context.commit.html_url && (
            <a
              href={context.commit.html_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm font-bold text-teal-600 hover:underline"
            >
              GitHub commit 보기 ↗
            </a>
          )}
        </article>

        <article className="rounded-3xl border border-teal-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-600">
            Pull Requests
          </p>
          {context.pull_requests.length ? (
            <div className="mt-3 space-y-3">
              {context.pull_requests.map((pullRequest) => (
                <div
                  key={pullRequest.number}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-slate-900">
                      #{pullRequest.number}
                    </span>
                    <Badge value={pullRequest.state}>{pullRequest.state || "unknown"}</Badge>
                  </div>
                  <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-700">
                    {pullRequest.title || "제목 없는 Pull Request"}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    병합 {formatDate(pullRequest.merged_at)}
                  </p>
                  {pullRequest.html_url && (
                    <a
                      href={pullRequest.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-xs font-bold text-teal-600 hover:underline"
                    >
                      GitHub PR 보기 ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="연결된 Pull Request가 없습니다."
                description="해당 workflow run은 직접 commit 또는 merge commit 기준으로 분석되었습니다."
              />
            </div>
          )}
        </article>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-black text-slate-900">변경 파일</h3>
          <span className="text-sm font-bold text-teal-600">
            {context.changed_files.length} files
          </span>
        </div>
        {context.changed_files.length ? (
          <div className="mt-4 space-y-3">
            {context.changed_files.map((file, index) => (
              <div
                key={`${file.filename}-${index}`}
                className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center"
              >
                <p className="min-w-0 flex-1 break-all font-mono text-sm font-bold text-slate-700">
                  {file.filename || "Unknown file"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${fileStatusTone(file.status)}`}
                  >
                    {file.status || "unknown"}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    +{file.additions}
                  </span>
                  <span className="text-xs font-bold text-red-500">
                    -{file.deletions}
                  </span>
                  <span className="text-xs text-slate-400">
                    {file.changes} changes
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState title="변경 파일 정보가 없습니다." />
          </div>
        )}
      </div>
    </section>
  );
}
