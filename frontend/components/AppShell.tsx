"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import LoadingState from "@/components/LoadingState";

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    // Client storage is only available after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, [router]);

  if (!ready) {
    return <main className="grid min-h-screen place-items-center bg-[#f3fbfa] p-6"><LoadingState label="인증을 확인하는 중입니다..." /></main>;
  }

  return (
    <div className="min-h-screen bg-[#f3fbfa]">
      <Sidebar />
      <main className="px-5 py-7 sm:px-8 lg:ml-64 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
