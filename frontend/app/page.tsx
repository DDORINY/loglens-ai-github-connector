import Link from "next/link";

export default function HomePage() {
  const features = [
    ["01", "Actions 실패 감지", "완료된 워크플로에서 실패한 run을 빠르게 모아봅니다."],
    ["02", "로그 분석", "에러 라인과 전체 로그를 함께 확인합니다."],
    ["03", "원인 후보 생성", "근거 로그를 바탕으로 가능한 원인을 정리합니다."],
    ["04", "GitHub Issue 생성", "분석 결과를 실행 가능한 Issue로 바로 전환합니다."],
    ["05", "분석 리포트 관리", "실패 분석과 연결된 Issue 이력을 보관합니다."],
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#f3fbfa]">
      <div className="mx-auto max-w-7xl px-6 py-6 lg:px-10">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500 font-black text-white shadow-lg shadow-teal-200">L</span>
            <span className="text-xl font-black tracking-tight text-slate-900">LogLens</span>
          </Link>
          <Link href="/login" className="btn-secondary">로그인</Link>
        </nav>

        <section className="relative py-20 text-center lg:py-28">
          <div className="absolute left-10 top-10 h-52 w-52 rounded-full bg-teal-200/30 blur-3xl" />
          <div className="absolute right-10 top-40 h-64 w-64 rounded-full bg-cyan-200/30 blur-3xl" />
          <div className="relative">
            <p className="inline-flex rounded-full border border-teal-100 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700 shadow-sm">
              AI-powered CI operations
            </p>
            <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-6xl">
              GitHub Actions 실패 로그
              <span className="block text-teal-500">분석 자동화</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
              실패한 CI 로그를 분석하고 원인 후보, 조치 항목, GitHub Issue를 자동 생성합니다.
              흩어진 디버깅 맥락을 한 화면에서 연결하세요.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="btn-primary px-7 py-4">대시보드 시작하기</Link>
              <Link href="/signup" className="btn-secondary px-7 py-4">회원가입</Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-16 md:grid-cols-2 lg:grid-cols-5">
          {features.map(([number, title, description]) => (
            <article key={number} className="panel p-5 text-left">
              <span className="text-xs font-black text-teal-500">{number}</span>
              <h2 className="mt-5 font-bold text-slate-800">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
