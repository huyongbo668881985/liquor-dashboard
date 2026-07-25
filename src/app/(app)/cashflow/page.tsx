"use client";

import { useState, useEffect } from "react";
import { PageHeader, formatMoney, EmptyState, SectionCard } from "@/components/ui";

interface CashFlow {
  id: number;
  date: string;
  type: string;
  amount: number;
  remark: string;
}

export default function CashflowPage() {
  const [records, setRecords] = useState<CashFlow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: "", type: "in", amount: "", remark: "" });

  const loadData = async () => {
    const res = await fetch("/api/cashflows");
    setRecords(await res.json());
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/cashflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date,
        type: form.type,
        amount: parseFloat(form.amount),
        remark: form.remark,
      }),
    });
    setForm({ date: "", type: "in", amount: "", remark: "" });
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/cashflows?id=${id}`, { method: "DELETE" });
    loadData();
  };

  // 计算
  let cashBalance = 0;
  const futureExpenses: { date: string; remark: string; amount: number }[] = [];
  for (const r of records) {
    if (r.type === "in") cashBalance += r.amount;
    else cashBalance -= r.amount;
    if (r.type === "out" && new Date(r.date) > new Date()) {
      futureExpenses.push({ date: r.date, remark: r.remark, amount: r.amount });
    }
  }

  const totalFutureExpense = futureExpenses.reduce((s, f) => s + f.amount, 0);

  return (
    <div>
      <PageHeader title="💰 现金流管理" action={
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
          {showForm ? "取消" : "+ 新增记录"}
        </button>
      } />

      {/* 资金概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">当前现金余额</div>
          <div className={`text-3xl font-bold ${cashBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatMoney(cashBalance)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">未来计划支出</div>
          <div className="text-3xl font-bold text-amber-600">{formatMoney(totalFutureExpense)}</div>
          <div className="text-xs text-gray-400 mt-1">{futureExpenses.length} 笔未来支出</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">预计现金压力</div>
          <div className={`text-3xl font-bold ${cashBalance - totalFutureExpense >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatMoney(cashBalance - totalFutureExpense)}
          </div>
          {cashBalance - totalFutureExpense < 0 && (
            <div className="text-xs text-red-500 mt-1">⚠️ 存在资金缺口</div>
          )}
        </div>
      </div>

      {/* 新增表单 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
              <input required type="date" value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="in">收入</option>
                <option value="out">支出</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">金额</label>
              <input required type="number" step="0.01" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">项目/备注</label>
              <input value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：8月市场费用" />
            </div>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700">
            保存
          </button>
        </form>
      )}

      {/* 记录列表 */}
      <SectionCard title="资金流水">
        {records.length === 0 ? <EmptyState message="暂无资金记录" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">日期</th>
                  <th className="text-left px-4 py-3">类型</th>
                  <th className="text-left px-4 py-3">项目</th>
                  <th className="text-right px-4 py-3">金额</th>
                  <th className="text-center px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(r.date).toLocaleDateString("zh-CN")}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${r.type === "in" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {r.type === "in" ? "收入" : "支出"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.remark || "-"}</td>
                    <td className={`px-4 py-3 text-right font-medium ${r.type === "in" ? "text-emerald-600" : "text-red-600"}`}>
                      {r.type === "in" ? "+" : "-"}{formatMoney(r.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}