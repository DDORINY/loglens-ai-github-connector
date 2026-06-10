import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LogLens AI GitHub Connector",
  description: "GitHub Actions 실패 로그 분석과 Issue 생성을 자동화합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
