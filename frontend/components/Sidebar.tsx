"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "대시보드", icon: "D", section: "dashboard" },
  { href: "/projects", label: "프로젝트", icon: "P", section: "projects" },
  { href: "/projects", label: "GitHub 저장소", icon: "R", section: "repositories" },
  { href: "/reports", label: "분석 리포트", icon: "A", section: "reports" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-teal-100 bg-white/90 p-4 backdrop-blur lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r lg:p-6">
      <Link href="/dashboard" className="flex items-center gap-3 px-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500 font-black text-white shadow-lg shadow-teal-200">
          L
        </span>
        <span>
          <span className="block text-lg font-black tracking-tight text-slate-900">LogLens</span>
          <span className="block text-xs font-medium text-slate-400">AI GitHub Connector</span>
        </span>
      </Link>
      <nav className="mt-5 flex gap-2 overflow-x-auto lg:mt-10 lg:flex-1 lg:flex-col">
        {links.map((link, index) => {
          const active =
            link.section === "repositories"
              ? pathname.startsWith("/repositories")
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={`${link.label}-${index}`}
              href={link.href}
              className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                active ? "bg-teal-500 text-white shadow-md shadow-teal-100" : "text-slate-500 hover:bg-teal-50 hover:text-teal-700"
              }`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${active ? "bg-white/20" : "bg-slate-100"}`}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={() => {
          clearAuth();
          router.replace("/login");
        }}
        className="mt-3 rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-500 hover:border-red-100 hover:bg-red-50 hover:text-red-600 lg:mt-auto"
      >
        로그아웃
      </button>
    </aside>
  );
}
