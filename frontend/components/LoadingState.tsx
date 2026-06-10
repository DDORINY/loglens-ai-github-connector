export default function LoadingState({ label = "데이터를 불러오는 중입니다..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-teal-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-100 border-t-teal-500" />
      {label}
    </div>
  );
}
