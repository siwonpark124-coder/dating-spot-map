import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "오로지",
  description: "오늘 로맨틱한 지점 — 오로지 당신의 성공적인 만남을 위해 준비된 소개팅 장소 지도",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // 지도 화면은 스스로 100dvh 안에서 스크롤을 처리한다. 여기서 overflow를 잠그면
    // 상세·후기·피드백처럼 길어지는 페이지가 통째로 스크롤되지 않는다.
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
