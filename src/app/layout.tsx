import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "酒水经营分析系统",
  description: "酒水老板经营数据驾驶舱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
