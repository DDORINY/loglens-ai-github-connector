"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import type { LoginData } from "@/types/api";
import ErrorBox from "@/components/ErrorBox";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiFetch<LoginData>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!response.data) {
        throw new Error("로그인 응답이 비어 있습니다.");
      }

      saveAuth(response.data);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f3fbfa] px-6 py-12">
      <section className="panel w-full max-w-md p-8 sm:p-10">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500 font-black text-white">L</span>
          <span className="font-black text-slate-900">LogLens</span>
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">다시 만나 반갑습니다</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          GitHub Actions 실패 로그 분석 대시보드에 접속합니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700">이메일</label>
            <input
              className="input mt-2"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700">비밀번호</label>
            <input
              className="input mt-2"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
            />
          </div>

          <ErrorBox message={error} />

          <button
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          계정이 없으신가요? <Link href="/signup" className="font-bold text-teal-600 hover:text-teal-700">회원가입</Link>
        </p>
      </section>
    </main>
  );
}
