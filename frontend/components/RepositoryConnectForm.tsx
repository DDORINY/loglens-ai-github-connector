"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import ErrorBox from "@/components/ErrorBox";
import type { GithubRepository } from "@/types/api";

export default function RepositoryConnectForm({
  projectId,
  onConnected,
}: {
  projectId: number;
  onConnected: (repository: GithubRepository) => void;
}) {
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<GithubRepository>("/api/github/repositories/connect", {
        method: "POST",
        body: JSON.stringify({ project_id: projectId, owner, repo, access_token: accessToken }),
      });
      if (!response.data) throw new Error("저장소 연결 응답이 비어 있습니다.");
      onConnected(response.data);
      setOwner("");
      setRepo("");
      setAccessToken("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장소 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Connect</p>
        <h2 className="mt-2 text-xl font-black text-slate-900">GitHub 저장소 연결</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">PAT는 연결 요청에만 사용되며 브라우저 저장소에 보관하지 않습니다.</p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          Owner
          <input className="input mt-2" value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="DDORINY" required />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Repository
          <input className="input mt-2" value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="loglens-ai-github-connector" required />
        </label>
      </div>
      <label className="mt-4 block text-sm font-bold text-slate-700">
        GitHub Personal Access Token
        <input
          className="input mt-2 font-mono"
          type="password"
          value={accessToken}
          onChange={(event) => setAccessToken(event.target.value)}
          autoComplete="off"
          placeholder="github_pat_..."
          required
        />
      </label>
      <div className="mt-4"><ErrorBox message={error} /></div>
      <button className="btn-primary mt-5 w-full sm:w-auto" disabled={loading}>
        {loading ? "연결 확인 중..." : "저장소 연결"}
      </button>
    </form>
  );
}
