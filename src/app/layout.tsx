import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

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
      <body className="min-h-full flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-h-screen overflow-auto">
          <div className="p-4 lg:p-8 pt-16 lg:pt-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
