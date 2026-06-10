"use client";

import { useState } from "react";
import type { WorkflowLogs } from "@/types/api";

export default function LogViewer({ logs }: { logs: WorkflowLogs }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">Failure logs</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">GitHub Actions 실패 로그</h2>
        </div>
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">{logs.error_lines.length} lines</span>
      </div>
      <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
        GitHub Actions에서 내려받은 원본 실패 로그입니다. 색상 코드나 timestamp가 포함될 수 있습니다.
        정제된 핵심 로그는 원인 분석 결과에서 확인하세요.
      </p>
      <div className="mt-5 space-y-2">
        {logs.error_lines.length ? logs.error_lines.map((line, index) => (
          <div key={`${index}-${line.slice(0, 20)}`} className="overflow-x-auto rounded-xl border border-red-100 bg-red-50 px-3 py-2 font-mono text-xs leading-5 text-red-700">{line}</div>
        )) : <p className="text-sm text-slate-500">추출된 에러 라인이 없습니다.</p>}
      </div>
      <button onClick={() => setExpanded((value) => !value)} className="btn-secondary mt-5">
        전체 원본 로그 {expanded ? "접기" : "펼치기"}
      </button>
      {expanded && <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100">{logs.raw_log || "로그가 비어 있습니다."}</pre>}
      {logs.files.length > 0 && (
        <div className="mt-6">
          <h3 className="font-black text-slate-900">로그 파일</h3>
          <div className="mt-3 space-y-3">
            {logs.files.map((file) => (
              <details key={file.file_name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer text-sm font-bold text-slate-700">{file.file_name}</summary>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-slate-600">{file.content}</pre>
              </details>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
