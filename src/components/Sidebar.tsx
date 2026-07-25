"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { href: "/", label: "首页", icon: "📊" },
  { href: "/products", label: "产品管理", icon: "🍾" },
  { href: "/direct", label: "直营管理", icon: "🏪" },
  { href: "/distribution", label: "分销管理", icon: "🚚" },
  { href: "/cashflow", label: "现金流", icon: "💰" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <>
      {/* 移动端遮罩 */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* 侧边栏 - 固定定位，不随页面滚动 */}
      <aside
        className={`fixed top-0 left-0 h-full z-30 bg-slate-800 text-white transition-all duration-300 flex flex-col overflow-y-auto
          ${collapsed ? "-translate-x-full" : "translate-x-0"}
          lg:translate-x-0 w-64`}
      >
        <div className="p-5 border-b border-slate-700 flex-shrink-0">
          <h1 className="text-lg font-bold tracking-wide">🍷 酒水经营分析</h1>
          <p className="text-xs text-slate-400 mt-1">经营数据驾驶舱</p>
        </div>

        <nav className="flex-1 py-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors
                  ${isActive
                    ? "bg-slate-700 text-white border-r-2 border-blue-400"
                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700 text-xs text-slate-500 flex-shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2 w-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            退出登录
          </button>
          V1.0 · 单机版
        </div>
      </aside>

      {/* 移动端汉堡按钮 */}
      <button
        className="fixed top-3 left-3 z-40 lg:hidden bg-slate-800 text-white p-2 rounded-lg shadow-lg"
        onClick={() => setCollapsed(!collapsed)}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M4 6h16M4 12h16M4 18h16" : "M6 18L18 6M6 6l12 12"} />
        </svg>
      </button>
    </>
  );
}