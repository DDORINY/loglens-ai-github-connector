"use client";

import { getStoredUser } from "@/lib/auth";

export default function Header({ title, description }: { title: string; description?: string }) {
  const user = getStoredUser();
  return (
    <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Workspace</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      <div className="flex items-center gap-3 self-start rounded-full border border-teal-100 bg-white py-2 pl-2 pr-4 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-sm font-black text-white">
          {(user?.email?.[0] ?? "L").toUpperCase()}
        </div>
        <div>
          <p className="text-xs text-slate-400">Signed in as</p>
          <p className="text-sm font-bold text-slate-700">{user?.email ?? "LogLens user"}</p>
        </div>
      </div>
    </header>
  );
}
