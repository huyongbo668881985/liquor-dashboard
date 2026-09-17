"use client";

import { useState, useEffect } from "react";
import { PageHeader, formatMoney, formatPercent, EmptyState, ExportButton, exportToCSV } from "@/components/ui";
import Link from "next/link";

interface Distributor {
  id: number;
  name: string;
  region: string;
  remark: string;
  shipments: { amount: number; quantity: number; product: { cost: number } }[];
  expensePlans: { amount: number }[];
  distributorExpenses: { amount: number }[];
}

interface GeneralExpense {
  id: number;
  date: string;
  category: string;
  amount: number;
  remark: string;
}

const generalExpenseCategories = ["市场推广", "物流", "人员", "招待", "其他"];

export default function DistributionPage() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", region: "", remark: "" });
  const [generalExpenses, setGeneralExpenses] = useState<GeneralExpense[]>([]);
  const [showGeneralExpenseForm, setShowGeneralExpenseForm] = useState(false);
  const [generalExpenseForm, setGeneralExpenseForm] = useState({ date: "", category: "市场推广", amount: "", remark: "" });

  const loadData = async () => {
    const [distributorsRes, expensesRes] = await Promise.all([
      fetch("/api/distributors"),
      fetch("/api/distribution-general-expenses"),
    ]);
    setDistributors(await distributorsRes.json());
    setGeneralExpenses(await expensesRes.json());
  };

  const handleGeneralExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/distribution-general-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...generalExpenseForm, amount: Number(generalExpenseForm.amount) }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "保存失败");
      return;
    }
    setGeneralExpenseForm({ date: "", category: "市场推广", amount: "", remark: "" });
    setShowGeneralExpenseForm(false);
    loadData();
  };

  const deleteGeneralExpense = async (id: number) => {
    if (!confirm("确定删除该分销整体费用？对应自动现金流也会一并删除。")) return;
    const res = await fetch(`/api/distribution-general-expenses?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "删除失败");
      return;
    }
    loadData();
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/distributors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", region: "", remark: "" });
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该客户？相关数据将一并删除。")) return;
    await fetch(`/api/distributors?id=${id}`, { method: "DELETE" });
    loadData();
  };

  const calcShipCost = (d: Distributor) =>
    d.shipments.reduce((s, sh) => s + sh.quantity * sh.product.cost, 0);
  const calcShipProfit = (d: Distributor) =>
    d.shipments.reduce((s, sh) => s + sh.amount, 0) - calcShipCost(d);
  const calcTotalExpense = (d: Distributor) =>
    d.distributorExpenses.reduce((s, e) => s + e.amount, 0);
  const calcTotalPlan = (d: Distributor) =>
    d.expensePlans.reduce((s, p) => s + p.amount, 0);
  const calcExpectedProfit = (d: Distributor) =>
    calcShipProfit(d) - calcTotalExpense(d) - calcTotalPlan(d);
  const calcShipAmount = (d: Distributor) => d.shipments.reduce((s, sh) => s + sh.amount, 0);
  // 利润率 = 预计利润（毛利-已发生费用-规划费用）/ 发货金额
  const calcProfitRate = (d: Distributor) => {
    const amount = calcShipAmount(d);
    return amount === 0 ? 0 : (calcExpectedProfit(d) / amount) * 100;
  };

  const handleExport = () => {
    exportToCSV(
      `分销客户汇总_${new Date().toLocaleDateString("zh-CN")}`,
      ["客户名称", "区域", "累计发货金额", "累计成本", "累计毛利", "已发生费用", "规划费用", "预计利润", "利润率"],
      distributors.map(d => [
        d.name,
        d.region || "-",
        Math.round(calcShipAmount(d)),
        (Math.round(calcShipAmount(d) - calcShipProfit(d))),
        Math.round(calcShipProfit(d)),
        Math.round(calcTotalExpense(d)),
        Math.round(calcTotalPlan(d)),
        Math.round(calcExpectedProfit(d)),
        calcProfitRate(d).toFixed(1) + "%",
      ])
    );
  };

  return (
    <div>
      <PageHeader title="🚚 分销管理" action={
        <div className="flex items-center gap-2">
          <ExportButton onClick={handleExport} label="导出客户汇总" />
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
            {showForm ? "取消" : "+ 新增客户"}
          </button>
        </div>
      } />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">客户名称</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：张三批发部" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">区域</label>
              <input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：华东" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <input value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700">
            保存
          </button>
        </form>
      )}

      <section className="mb-6 bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">分销整体费用</h2>
            <p className="text-xs text-gray-500 mt-1">不归属任何客户；只影响分销整体利润、首页已发生费用和现金流。</p>
          </div>
          <button onClick={() => setShowGeneralExpenseForm(!showGeneralExpenseForm)}
            className="border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors whitespace-nowrap">
            {showGeneralExpenseForm ? "取消" : "+ 新增整体费用"}
          </button>
        </div>

        {showGeneralExpenseForm && (
          <form onSubmit={handleGeneralExpenseSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 pb-4 mb-4 border-b border-gray-100">
            <div>
              <label className="block text-xs text-gray-500 mb-1">日期</label>
              <input required type="date" value={generalExpenseForm.date} onChange={e => setGeneralExpenseForm({ ...generalExpenseForm, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">费用类别</label>
              <select value={generalExpenseForm.category} onChange={e => setGeneralExpenseForm({ ...generalExpenseForm, category: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {generalExpenseCategories.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">金额</label>
              <input required min="0.01" type="number" step="0.01" value={generalExpenseForm.amount} onChange={e => setGeneralExpenseForm({ ...generalExpenseForm, amount: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">备注</label>
              <input value={generalExpenseForm.remark} onChange={e => setGeneralExpenseForm({ ...generalExpenseForm, remark: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex items-end"><button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 w-full">保存</button></div>
          </form>
        )}

        {generalExpenses.length === 0 ? <p className="text-sm text-gray-400 py-2">暂无分销整体费用</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600"><tr><th className="text-left px-3 py-2">日期</th><th className="text-left px-3 py-2">类别</th><th className="text-left px-3 py-2">备注</th><th className="text-right px-3 py-2">金额</th><th className="text-center px-3 py-2">操作</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {generalExpenses.map(expense => <tr key={expense.id}><td className="px-3 py-2">{new Date(expense.date).toLocaleDateString("zh-CN")}</td><td className="px-3 py-2">{expense.category}</td><td className="px-3 py-2 text-gray-500">{expense.remark || "-"}</td><td className="px-3 py-2 text-right text-red-600">{formatMoney(expense.amount)}</td><td className="px-3 py-2 text-center"><button onClick={() => deleteGeneralExpense(expense.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button></td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {distributors.length === 0 ? (
        <EmptyState message="暂无分销客户，请新增客户" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">客户名称</th>
                <th className="text-left px-4 py-3">区域</th>
                <th className="text-right px-4 py-3">累计发货金额</th>
                <th className="text-right px-4 py-3">累计毛利</th>
                <th className="text-right px-4 py-3">已发生费用</th>
                <th className="text-right px-4 py-3">规划费用</th>
                <th className="text-right px-4 py-3">预计利润</th>
                <th className="text-right px-4 py-3">利润率</th>
                <th className="text-center px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {distributors.map(d => {
                const shipAmount = d.shipments.reduce((s, sh) => s + sh.amount, 0);
                const profit = calcShipProfit(d);
                const expense = calcTotalExpense(d);
                const plan = calcTotalPlan(d);
                const expectedProfit = calcExpectedProfit(d);
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/distribution/${d.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                        {d.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d.region || "-"}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(shipAmount)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatMoney(profit)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatMoney(expense)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{formatMoney(plan)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${expectedProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatMoney(expectedProfit)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${expectedProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatPercent(calcProfitRate(d))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
