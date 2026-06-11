"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import ErrorBox from "@/components/ErrorBox";
import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import SeverityBadge from "@/components/SeverityBadge";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { IncidentReport } from "@/types/api";

function DetailList({
  title,
  description,
  items,
  tone,
}: {
  title: string;
  description: string;
  items: string[];
  tone: "slate" | "amber" | "teal";
}) {
  const dot = tone === "amber" ? "bg-amber-400" : tone === "teal" ? "bg-teal-500" : "bg-slate-400";

  return (
    <section className="panel p-6">
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {items.length ? (
        <ul className="mt-5 space-y-3">
          {items.map((item, index) => (
            <li key={`${index}-${item}`} className="flex gap-3 text-sm leading-6 text-slate-600">
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${dot}`} />
              <span className="min-w-0 break-words">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-slate-400">표시할 항목이 없습니다.</p>
      )}
    </section>
  );
}

function MetadataItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <dt className="text-xs font-bold text-slate-400">{label}</dt>
      <dd className="mt-2 break-words text-sm font-bold text-slate-800">{children}</dd>
    </div>
  );
}

export default function IncidentDetailPage() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const [report, setReport] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<IncidentReport>(`/api/incidents/${incidentId}`);
      setReport(response.data);
    } catch (err) {
      setReport(null);
      setError(err instanceof Error ? err.message : "통합 장애 리포트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

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
        title={`통합 장애 리포트 #${incidentId}`}
        description="GitHub Actions 실패와 서버 로그 장애 후보를 rule-based engine으로 연결한 결과입니다."
      />

      {loading ? (
        <LoadingState label="통합 장애 리포트를 불러오는 중입니다..." />
      ) : (
        <>
          <ErrorBox message={error} />

          {!report && !error && (
            <EmptyState title="통합 장애 리포트가 없습니다." />
          )}

          {report && (
            <div className="space-y-6">
              <section className="panel p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge value={report.severity} />
                  <Badge value={report.status}>{report.status}</Badge>
                  <span className="text-xs text-slate-400">{formatDate(report.created_at)}</span>
                </div>
                <h2 className="mt-5 max-w-5xl break-words text-2xl font-black leading-9 text-slate-900">
                  {report.title}
                </h2>
                <p className="mt-4 max-w-5xl whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                  {report.summary}
                </p>

                {score !== null && (
                  <div className={`mt-6 rounded-2xl border p-5 ${scoreTone}`}>
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-black">Analysis Score: {score} / 100</p>
                      <span className="text-xs font-bold opacity-70">Rule-based analysis</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
                      <div className="h-full rounded-full bg-current" style={{ width: `${score}%` }} />
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/incidents?project_id=${report.project_id}`} className="btn-secondary">
                    통합 리포트 목록으로
                  </Link>
                  <button type="button" onClick={() => void load()} className="btn-secondary">
                    새로고침
                  </button>
                </div>
              </section>

              <section className="panel p-6">
                <h2 className="text-xl font-black text-slate-900">리포트 메타데이터</h2>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <MetadataItem label="Severity">
                    <SeverityBadge value={report.severity} />
                  </MetadataItem>
                  <MetadataItem label="Analysis Score">
                    {report.analysis_score === null ? "-" : `${report.analysis_score} / 100`}
                  </MetadataItem>
                  <MetadataItem label="Engine Version">
                    <span className="font-mono text-xs">{report.engine_version}</span>
                  </MetadataItem>
                  <MetadataItem label="GitHub Actions 분석 리포트 ID">
                    #{report.github_analysis_report_id}
                  </MetadataItem>
                  <MetadataItem label="서버 로그 분석 리포트 ID">
                    #{report.server_log_analysis_report_id}
                  </MetadataItem>
                  <MetadataItem label="생성 일시">{formatDate(report.created_at)}</MetadataItem>
                </dl>
              </section>

              <DetailList
                title="통합 근거"
                description="두 분석 리포트의 연관성을 판단하는 데 사용된 핵심 근거입니다."
                items={report.combined_evidence ?? []}
                tone="slate"
              />

              <div className="grid gap-6 lg:grid-cols-2">
                <DetailList
                  title="원인 후보"
                  description="확정 원인이 아닌, 우선 검증해야 할 장애 원인 후보입니다."
                  items={report.root_cause_candidates ?? []}
                  tone="amber"
                />
                <DetailList
                  title="권장 조치"
                  description="원인 확인과 재발 방지를 위해 권장하는 작업입니다."
                  items={report.recommended_actions ?? []}
                  tone="teal"
                />
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
