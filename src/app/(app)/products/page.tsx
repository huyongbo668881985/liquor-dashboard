"use client";

import { useState, useEffect } from "react";
import { PageHeader, formatMoney, EmptyState } from "@/components/ui";

interface Product {
  id: number;
  name: string;
  spec: string;
  unit: string;
  cost: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", spec: "", unit: "箱", cost: "" });

  const loadProducts = async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
  };

  useEffect(() => { loadProducts(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cost: parseFloat(form.cost) }),
    });
    setForm({ name: "", spec: "", unit: "箱", cost: "" });
    setShowForm(false);
    loadProducts();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该产品？")) return;
    await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    loadProducts();
  };

  return (
    <div>
      <PageHeader title="🍾 产品管理" action={
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
          {showForm ? "取消" : "+ 新增产品"}
        </button>
      } />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">产品名称</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：45元酒" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">规格</label>
              <input value={form.spec} onChange={e => setForm({ ...form, spec: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：500ml×12瓶" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
              <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">成本价格 (元/{form.unit})</label>
              <input required type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：300" />
            </div>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
            保存
          </button>
        </form>
      )}

      {products.length === 0 ? (
        <EmptyState message="暂无产品，请新增产品" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">产品名称</th>
                <th className="text-left px-4 py-3 font-medium">规格</th>
                <th className="text-left px-4 py-3 font-medium">单位</th>
                <th className="text-right px-4 py-3 font-medium">成本价格</th>
                <th className="text-center px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.spec || "-"}</td>
                  <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(p.cost)}/{p.unit}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleDelete(p.id)}
                      className="text-red-500 hover:text-red-700 text-xs">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}