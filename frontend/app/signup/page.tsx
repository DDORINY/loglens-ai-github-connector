"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import ErrorBox from "@/components/ErrorBox";
import Link from "next/link";
import type { AuthUser } from "@/types/api";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiFetch<AuthUser>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입 실패");
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
        <h1 className="text-3xl font-black tracking-tight text-slate-900">워크스페이스 만들기</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">CI 실패 분석을 시작할 계정을 생성합니다.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700">이메일</label>
            <input
              className="input mt-2"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="user@example.com"
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
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          이미 계정이 있나요? <Link href="/login" className="font-bold text-teal-600 hover:text-teal-700">로그인</Link>
        </p>
      </section>
    </main>
  );
}
