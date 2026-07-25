"use client";

import { useState, useEffect } from "react";
import { PageHeader, formatMoney, EmptyState, SectionCard, ExportButton, exportToCSV } from "@/components/ui";

interface Product {
  id: number;
  name: string;
  spec: string;
  unit: string;
  cost: number;
}

interface DirectSale {
  id: number;
  date: string;
  productId: number;
  product: Product;
  quantity: number;
  amount: number;
  received: number;
}

interface DirectExpense {
  id: number;
  date: string;
  category: string;
  amount: number;
  remark: string;
}

interface DirectPurchase {
  id: number;
  date: string;
  productId: number;
  product: Product;
  quantity: number;
  amount: number;
  remark: string;
}

const expenseCategories = ["市场推广", "招待", "人员", "物流", "其他"];

export default function DirectPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<DirectSale[]>([]);
  const [expenses, setExpenses] = useState<DirectExpense[]>([]);
  const [purchases, setPurchases] = useState<DirectPurchase[]>([]);
  const [activeTab, setActiveTab] = useState<"sales" | "expenses" | "purchases">("sales");

  const [saleForm, setSaleForm] = useState({ date: "", productId: "", quantity: "", amount: "", received: "" });
  const [expenseForm, setExpenseForm] = useState({ date: "", category: "市场推广", amount: "", remark: "" });
  const [purchaseForm, setPurchaseForm] = useState({ date: "", productId: "", quantity: "", amount: "", remark: "" });

  const loadData = async () => {
    const [pRes, sRes, eRes, puRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/direct-sales"),
      fetch("/api/direct-expenses"),
      fetch("/api/direct-purchases"),
    ]);
    setProducts(await pRes.json());
    setSales(await sRes.json());
    setExpenses(await eRes.json());
    setPurchases(await puRes.json());
  };

  useEffect(() => { loadData(); }, []);

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/direct-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: saleForm.date,
        productId: parseInt(saleForm.productId),
        quantity: parseInt(saleForm.quantity),
        amount: parseFloat(saleForm.amount),
        received: parseFloat(saleForm.received) || 0,
      }),
    });
    setSaleForm({ date: "", productId: "", quantity: "", amount: "", received: "" });
    loadData();
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/direct-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: expenseForm.date,
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount),
        remark: expenseForm.remark,
      }),
    });
    setExpenseForm({ date: "", category: "市场推广", amount: "", remark: "" });
    loadData();
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/direct-purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: purchaseForm.date,
        productId: parseInt(purchaseForm.productId),
        quantity: parseInt(purchaseForm.quantity),
        amount: parseFloat(purchaseForm.amount),
        remark: purchaseForm.remark,
      }),
    });
    setPurchaseForm({ date: "", productId: "", quantity: "", amount: "", remark: "" });
    loadData();
  };

  const deleteSale = async (id: number) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/direct-sales?id=${id}`, { method: "DELETE" });
    loadData();
  };

  const deleteExpense = async (id: number) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/direct-expenses?id=${id}`, { method: "DELETE" });
    loadData();
  };

  const deletePurchase = async (id: number) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/direct-purchases?id=${id}`, { method: "DELETE" });
    loadData();
  };

  const calcCost = (sale: DirectSale) => sale.quantity * sale.product.cost;
  const calcProfit = (sale: DirectSale) => sale.amount - calcCost(sale);
  const calcReceivable = (sale: DirectSale) => sale.amount - sale.received;

  const totalAmount = sales.reduce((s, r) => s + r.amount, 0);
  const totalCost = sales.reduce((s, r) => s + calcCost(r), 0);
  const totalProfit = sales.reduce((s, r) => s + calcProfit(r), 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const totalPurchaseAmount = purchases.reduce((s, p) => s + p.amount, 0);

  const exportSales = () => {
    exportToCSV(
      `直营销售记录_${new Date().toLocaleDateString("zh-CN")}`,
      ["日期", "产品", "数量", "销售金额", "成本", "毛利", "已收", "应收"],
      sales.map(s => [
        new Date(s.date).toLocaleDateString("zh-CN"),
        s.product.name,
        s.quantity,
        Math.round(s.amount),
        Math.round(calcCost(s)),
        Math.round(calcProfit(s)),
        Math.round(s.received),
        Math.round(calcReceivable(s)),
      ])
    );
  };

  const exportPurchases = () => {
    exportToCSV(
      `直营采购发货_${new Date().toLocaleDateString("zh-CN")}`,
      ["日期", "产品", "数量", "采购金额", "备注"],
      purchases.map(p => [
        new Date(p.date).toLocaleDateString("zh-CN"),
        p.product.name,
        p.quantity,
        Math.round(p.amount),
        p.remark || "-",
      ])
    );
  };

  const exportExpenses = () => {
    exportToCSV(
      `直营费用记录_${new Date().toLocaleDateString("zh-CN")}`,
      ["日期", "类别", "金额", "备注"],
      expenses.map(e => [
        new Date(e.date).toLocaleDateString("zh-CN"),
        e.category,
        Math.round(e.amount),
        e.remark || "-",
      ])
    );
  };

  return (
    <div>
      <PageHeader title="🏪 直营管理" />

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">销售金额</div>
          <div className="text-lg font-bold text-blue-600">{formatMoney(totalAmount)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">销售成本</div>
          <div className="text-lg font-bold text-gray-600">{formatMoney(totalCost)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">总毛利</div>
          <div className="text-lg font-bold text-purple-600">{formatMoney(totalProfit)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">采购发货成本</div>
          <div className="text-lg font-bold text-amber-600">{formatMoney(totalPurchaseAmount)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">总费用</div>
          <div className="text-lg font-bold text-red-600">{formatMoney(totalExpense)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">净利润</div>
          <div className="text-lg font-bold text-emerald-600">{formatMoney(totalProfit - totalExpense)}</div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button onClick={() => setActiveTab("sales")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "sales" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-900"}`}>
            销售记录
          </button>
          <button onClick={() => setActiveTab("purchases")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "purchases" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-900"}`}>
            采购发货
          </button>
          <button onClick={() => setActiveTab("expenses")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "expenses" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-900"}`}>
            费用记录
          </button>
        </div>
        <ExportButton
          onClick={activeTab === "sales" ? exportSales : activeTab === "purchases" ? exportPurchases : exportExpenses}
          label={`导出${activeTab === "sales" ? "销售记录" : activeTab === "purchases" ? "采购发货" : "费用记录"}`}
        />
      </div>

      {activeTab === "sales" ? (
        <>
          <SectionCard title="新增销售记录">
            <form onSubmit={handleSaleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">日期</label>
                <input required type="date" value={saleForm.date}
                  onChange={e => setSaleForm({ ...saleForm, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">产品</label>
                <select required value={saleForm.productId}
                  onChange={e => setSaleForm({ ...saleForm, productId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">选择产品</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">数量</label>
                <input required type="number" value={saleForm.quantity}
                  onChange={e => setSaleForm({ ...saleForm, quantity: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">销售金额</label>
                <input required type="number" step="0.01" value={saleForm.amount}
                  onChange={e => setSaleForm({ ...saleForm, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">已收金额</label>
                <input type="number" step="0.01" value={saleForm.received}
                  onChange={e => setSaleForm({ ...saleForm, received: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 w-full">添加</button>
              </div>
            </form>
          </SectionCard>

          <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-x-auto">
            {sales.length === 0 ? <EmptyState message="暂无销售记录" /> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">日期</th>
                    <th className="text-left px-4 py-3">产品</th>
                    <th className="text-right px-4 py-3">数量</th>
                    <th className="text-right px-4 py-3">销售金额</th>
                    <th className="text-right px-4 py-3">成本</th>
                    <th className="text-right px-4 py-3">毛利</th>
                    <th className="text-right px-4 py-3">已收</th>
                    <th className="text-right px-4 py-3">应收</th>
                    <th className="text-center px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{new Date(s.date).toLocaleDateString("zh-CN")}</td>
                      <td className="px-4 py-3">{s.product.name}</td>
                      <td className="px-4 py-3 text-right">{s.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(s.amount)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{formatMoney(calcCost(s))}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{formatMoney(calcProfit(s))}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(s.received)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{formatMoney(calcReceivable(s))}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => deleteSale(s.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : activeTab === "purchases" ? (
        <>
          <SectionCard title="新增采购发货">
            <form onSubmit={handlePurchaseSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">日期</label>
                <input required type="date" value={purchaseForm.date}
                  onChange={e => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">产品</label>
                <select required value={purchaseForm.productId}
                  onChange={e => setPurchaseForm({ ...purchaseForm, productId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">选择产品</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">数量</label>
                <input required type="number" value={purchaseForm.quantity}
                  onChange={e => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">采购金额（成本价）</label>
                <input required type="number" step="0.01" value={purchaseForm.amount}
                  onChange={e => setPurchaseForm({ ...purchaseForm, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">备注</label>
                <input value={purchaseForm.remark}
                  onChange={e => setPurchaseForm({ ...purchaseForm, remark: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：进货一批" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 w-full">添加</button>
              </div>
            </form>
          </SectionCard>

          <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-x-auto">
            {purchases.length === 0 ? <EmptyState message="暂无采购发货记录" /> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">日期</th>
                    <th className="text-left px-4 py-3">产品</th>
                    <th className="text-right px-4 py-3">数量</th>
                    <th className="text-right px-4 py-3">采购金额</th>
                    <th className="text-left px-4 py-3">备注</th>
                    <th className="text-center px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchases.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{new Date(p.date).toLocaleDateString("zh-CN")}</td>
                      <td className="px-4 py-3">{p.product.name}</td>
                      <td className="px-4 py-3 text-right">{p.quantity}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{formatMoney(p.amount)}</td>
                      <td className="px-4 py-3 text-gray-500">{p.remark || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => deletePurchase(p.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <>
          <SectionCard title="新增费用">
            <form onSubmit={handleExpenseSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">日期</label>
                <input required type="date" value={expenseForm.date}
                  onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">费用类别</label>
                <select value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">金额</label>
                <input required type="number" step="0.01" value={expenseForm.amount}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">备注</label>
                <input value={expenseForm.remark}
                  onChange={e => setExpenseForm({ ...expenseForm, remark: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 w-full">添加</button>
              </div>
            </form>
          </SectionCard>

          <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-x-auto">
            {expenses.length === 0 ? <EmptyState message="暂无费用记录" /> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">日期</th>
                    <th className="text-left px-4 py-3">类别</th>
                    <th className="text-right px-4 py-3">金额</th>
                    <th className="text-left px-4 py-3">备注</th>
                    <th className="text-center px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{new Date(e.date).toLocaleDateString("zh-CN")}</td>
                      <td className="px-4 py-3">{e.category}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatMoney(e.amount)}</td>
                      <td className="px-4 py-3 text-gray-500">{e.remark || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => deleteExpense(e.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}