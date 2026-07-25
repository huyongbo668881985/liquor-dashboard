"use client";

import { useState, useEffect } from "react";
import { PageHeader, formatMoney, EmptyState } from "@/components/ui";
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

export default function DistributionPage() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", region: "", remark: "" });

  const loadData = async () => {
    const res = await fetch("/api/distributors");
    setDistributors(await res.json());
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

  return (
    <div>
      <PageHeader title="🚚 分销管理" action={
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
          {showForm ? "取消" : "+ 新增客户"}
        </button>
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