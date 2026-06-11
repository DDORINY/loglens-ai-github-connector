"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import ErrorBox from "@/components/ErrorBox";
import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import NextSteps from "@/components/NextSteps";
import ServerLogCard from "@/components/ServerLogCard";
import { apiFetch } from "@/lib/api";
import type {
  Project,
  ServerLog,
  ServerLogAnalysisReport,
  ServerLogListItem,
} from "@/types/api";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export default function ServerLogsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [source, setSource] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<ServerLogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadLogs = useCallback(async (selectedProjectId: string) => {
    if (!selectedProjectId) {
      setLogs([]);
      return;
    }

    setLogsLoading(true);
    setError("");
    try {
      const response = await apiFetch<ServerLogListItem[]>(
        `/api/server-logs?project_id=${encodeURIComponent(selectedProjectId)}`
      );
      setLogs(response.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "서버 로그 목록을 불러오지 못했습니다.");
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const response = await apiFetch<Project[]>("/api/projects");
      const nextProjects = response.data ?? [];
      setProjects(nextProjects);
      setProjectId((current) => current || (nextProjects[0] ? String(nextProjects[0].id) : ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로젝트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLogs(projectId);
  }, [loadLogs, projectId]);

  function selectFile(nextFile: File | null) {
    setError("");
    setMessage("");

    if (!nextFile) {
      setFile(null);
      return;
    }

    const validExtension = /\.(log|txt)$/i.test(nextFile.name);
    if (!validExtension) {
      setFile(null);
      setError(".log 또는 .txt 파일만 업로드할 수 있습니다.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("서버 로그 파일은 최대 2MB까지만 업로드할 수 있습니다.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setFile(nextFile);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!projectId) {
      setError("서버 로그를 연결할 프로젝트를 선택하세요.");
      return;
    }
    if (!file) {
      setError("업로드할 .log 또는 .txt 파일을 선택하세요.");
      return;
    }

    const formData = new FormData();
    formData.append("project_id", projectId);
    if (source.trim()) formData.append("source", source.trim());
    formData.append("file", file);

    setUploading(true);
    try {
      await apiFetch<ServerLog>("/api/server-logs/upload", {
        method: "POST",
        body: formData,
      });
      setMessage("서버 로그가 업로드되었습니다.");
      setSource("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadLogs(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "서버 로그 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function analyze(logId: number) {
    setAnalyzingId(logId);
    setError("");
    try {
      const response = await apiFetch<ServerLogAnalysisReport>(
        `/api/server-logs/${logId}/analyze`,
        { method: "POST" }
      );
      if (!response.data) throw new Error("서버 로그 분석 응답이 비어 있습니다.");
      router.push(`/server-log-reports/${response.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "서버 로그 분석에 실패했습니다.");
      setAnalyzingId(null);
    }
  }

  return (
    <AppShell>
      <Header
        title="서버 오류 로그 분석"
        description="운영 서버의 오류 기록을 업로드하고 ERROR, WARN, 5xx 패턴을 이해하기 쉽게 분석합니다."
      />
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <ErrorBox message={error} />
          {message && (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {message}
            </div>
          )}

          <section className="panel mt-5 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">
              Server log analysis
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">서버 로그 분석</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              운영 서버의 .log 또는 .txt 파일을 업로드하면 LogLens가 민감정보를 마스킹하고
              ERROR/WARN/5xx 패턴을 분석해 장애 후보 리포트를 생성합니다.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["1", "프로젝트 선택"],
                ["2", "서버 로그 업로드"],
                ["3", "로그 분석 실행"],
                ["4", "장애 후보 리포트 확인"],
              ].map(([number, label]) => (
                <div key={number} className="flex items-center gap-3 rounded-2xl bg-teal-50 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-sm font-black text-white">
                    {number}
                  </span>
                  <span className="text-sm font-bold text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-6">
            <NextSteps
              steps={[
                "오류가 발생한 프로젝트와 로그 파일을 선택합니다.",
                "서버 오류 로그를 업로드합니다.",
                "분석 버튼을 눌러 핵심 오류와 가능한 원인을 확인합니다.",
                "자동 검사 실패와 관련이 있다면 통합 장애 리포트를 만듭니다.",
              ]}
            />
          </div>

          <form onSubmit={upload} className="panel mt-6 p-6 sm:p-8">
            <div>
              <h2 className="text-xl font-black text-slate-900">서버 로그 업로드</h2>
              <p className="mt-2 text-sm text-slate-500">UTF-8 또는 CP949 형식의 최대 2MB 파일을 지원합니다.</p>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <label className="text-sm font-bold text-slate-700">
                프로젝트
                <select
                  className="input mt-2"
                  value={projectId}
                  onChange={(event) => {
                    setProjectId(event.target.value);
                    setMessage("");
                  }}
                  disabled={projects.length === 0}
                  required
                >
                  {projects.length === 0 && <option value="">프로젝트가 없습니다</option>}
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold text-slate-700">
                로그 출처
                <input
                  className="input mt-2"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="예: flask-vm, frontend-vm, nginx, api-server"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                로그 파일
                <input
                  ref={fileRef}
                  className="input mt-2 file:mr-3 file:rounded-full file:border-0 file:bg-teal-50 file:px-3 file:py-1 file:text-xs file:font-bold file:text-teal-700"
                  type="file"
                  accept=".log,.txt,text/plain"
                  onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
                  required
                />
              </label>
            </div>
            <button className="btn-primary mt-5" disabled={uploading || !projectId || projects.length === 0}>
              {uploading ? "업로드 중..." : "서버 로그 업로드"}
            </button>
          </form>

          <section className="mt-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-teal-600">{logs.length} server logs</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">업로드된 서버 로그</h2>
              </div>
            </div>
            {logsLoading ? (
              <LoadingState label="서버 로그 목록을 불러오는 중입니다..." />
            ) : logs.length ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {logs.map((log) => (
                  <ServerLogCard
                    key={log.id}
                    log={log}
                    analyzing={analyzingId === log.id}
                    onAnalyze={() => void analyze(log.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="아직 업로드된 서버 로그가 없습니다."
                description=".log 또는 .txt 파일을 업로드해 서버 로그 분석을 시작하세요."
              />
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
