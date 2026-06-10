"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import Badge from "@/components/Badge";
import ErrorBox from "@/components/ErrorBox";
import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import SeverityBadge from "@/components/SeverityBadge";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { ServerLogAnalysisReport } from "@/types/api";

function evidenceTone(line: string): string {
  const value = line.toLowerCase();
  if (value.includes("error") || value.includes("critical") || /\b5\d\d\b/.test(value)) {
    return "border-red-900/60 bg-red-950/40 text-red-200";
  }
  if (value.includes("warn")) return "border-amber-900/60 bg-amber-950/40 text-amber-200";
  return "border-slate-800 bg-slate-900 text-slate-200";
}

function GuidanceList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "amber" | "teal";
}) {
  const dot = tone === "amber" ? "bg-amber-400" : "bg-teal-500";
  return (
    <section className="panel p-6">
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      <ul className="mt-5 space-y-3">
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="flex gap-3 text-sm leading-6 text-slate-600">
            <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ServerLogReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<ServerLogAnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await apiFetch<ServerLogAnalysisReport>(
        `/api/server-logs/reports/${reportId}`
      );
      setReport(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "서버 로그 분석 리포트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const errorGroups = useMemo(
    () => [...(report?.error_groups ?? [])].sort((left, right) => right.count - left.count),
    [report]
  );

  const score = report?.analysis_score === null || report?.analysis_score === undefined
    ? null
    : Math.max(0, Math.min(100, report.analysis_score));
  const scoreTone =
    score !== null && score >= 80
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : score !== null && score >= 50
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <AppShell>
      <Header
        title={`서버 로그 분석 리포트 #${reportId}`}
        description="서버 로그에서 탐지된 장애 후보와 반복 오류 패턴, 확인 및 조치 항목을 검토합니다."
      />
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <ErrorBox message={error} />
          {report && (
            <div className="mt-5 space-y-6">
              <section className="panel p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{report.category}</Badge>
                  <SeverityBadge value={report.severity} />
                  <span className="text-xs text-slate-400">{formatDate(report.created_at)}</span>
                </div>
                <h2 className="mt-5 max-w-4xl text-2xl font-black leading-9 text-slate-900">
                  {report.summary}
                </h2>
                {report.engine_version && (
                  <p className="mt-3 font-mono text-xs text-slate-400">
                    Engine: {report.engine_version}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={`/server-logs/${report.server_log_id}`} className="btn-secondary">
                    서버 로그 원문 보기
                  </Link>
                  <Link href="/server-logs" className="btn-secondary">
                    서버 로그 목록
                  </Link>
                </div>

                {score !== null && (
                  <div className={`mt-6 rounded-2xl border p-5 ${scoreTone}`}>
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-black">Analysis Score: {score} / 100</p>
                      <span className="text-xs font-bold opacity-70">
                        {score >= 80 ? "높은 분석 신뢰도" : score >= 50 ? "중간 분석 신뢰도" : "추가 확인 필요"}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
                      <div className="h-full rounded-full bg-current" style={{ width: `${score}%` }} />
                    </div>
                  </div>
                )}
              </section>

              <section className="panel p-6">
                <h2 className="text-xl font-black text-slate-900">핵심 근거 로그</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  서버 로그에서 장애 후보 판단에 사용된 핵심 라인입니다.
                </p>
                <div className="mt-5 space-y-2 rounded-2xl bg-slate-950 p-4">
                  {report.evidence.map((line, index) => (
                    <code
                      key={`${index}-${line}`}
                      className={`block whitespace-pre-wrap break-words rounded-xl border px-3 py-2 font-mono text-xs leading-5 ${evidenceTone(line)}`}
                    >
                      {line}
                    </code>
                  ))}
                </div>
              </section>

              <section className="panel p-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">에러 그룹</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    유사한 오류 라인을 fingerprint로 묶어 반복 발생 여부를 확인합니다.
                  </p>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {errorGroups.map((group) => (
                    <article key={group.fingerprint} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge value={group.severity} />
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                          {group.count}회 발생
                        </span>
                      </div>
                      <p className="mt-4 break-words text-sm font-bold leading-6 text-slate-800">
                        {group.message}
                      </p>
                      <code className="mt-3 block break-all rounded-xl bg-slate-900 px-3 py-2 font-mono text-xs leading-5 text-slate-200">
                        {group.sample_line}
                      </code>
                      <p className="mt-3 break-all font-mono text-[11px] text-slate-400">
                        fingerprint: {group.fingerprint}
                      </p>
                    </article>
                  ))}
                  {errorGroups.length === 0 && (
                    <p className="text-sm text-slate-500">그룹화된 오류가 없습니다.</p>
                  )}
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <GuidanceList title="원인 후보" items={report.suspected_causes} tone="amber" />
                <GuidanceList title="추천 조치" items={report.recommended_actions} tone="teal" />
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
