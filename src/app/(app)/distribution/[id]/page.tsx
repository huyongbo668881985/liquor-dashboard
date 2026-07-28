"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { formatMoney, formatPercent, EmptyState, ExportButton, exportToCSV } from "@/components/ui";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  spec: string;
  unit: string;
  cost: number;
}

interface Shipment {
  id: number;
  date: string;
  productId: number;
  product: Product;
  quantity: number;
  amount: number;
}

interface ExpensePlan {
  id: number;
  name: string;
  amount: number;
  remark: string;
}

interface DistributorExpense {
  id: number;
  type: string;
  amount: number;
  productId: number | null;
  product: Product | null;
  quantity: number;
  date: string;
  remark: string;
}

interface Distributor {
  id: number;
  name: string;
  region: string;
  remark: string;
}

export default function DistributorDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string);

  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [plans, setPlans] = useState<ExpensePlan[]>([]);
  const [expenses, setExpenses] = useState<DistributorExpense[]>([]);
  const [activeTab, setActiveTab] = useState<"shipments" | "plans" | "expenses">("shipments");

  // 发货表单
  const [shipForm, setShipForm] = useState({ date: "", productId: "", quantity: "", amount: "" });
  // 规划表单
  const [planForm, setPlanForm] = useState({ name: "", amount: "", remark: "" });
  // 费用表单
  const [expenseForm, setExpenseForm] = useState({ type: "cash", date: "", name: "", amount: "", productId: "", quantity: "", remark: "" });

  const loadData = async () => {
    const [dRes, pRes, sRes, plRes, eRes] = await Promise.all([
      fetch("/api/distributors"),
      fetch("/api/products"),
      fetch(`/api/shipments?distributorId=${id}`),
      fetch(`/api/expense-plans?distributorId=${id}`),
      fetch(`/api/distributor-expenses?distributorId=${id}`),
    ]);
    const dists = await dRes.json();
    setDistributor(dists.find((d: Distributor) => d.id === id) || null);
    setProducts(await pRes.json());
    setShipments(await sRes.json());
    setPlans(await plRes.json());
    setExpenses(await eRes.json());
  };

  useEffect(() => { loadData(); }, [id]);

  // 发货
  const handleShipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distributorId: id,
        productId: parseInt(shipForm.productId),
        date: shipForm.date,
        quantity: parseInt(shipForm.quantity),
        amount: parseFloat(shipForm.amount),
      }),
    });
    setShipForm({ date: "", productId: "", quantity: "", amount: "" });
    loadData();
  };

  const deleteShipment = async (shipId: number) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/shipments?id=${shipId}`, { method: "DELETE" });
    loadData();
  };

  // 规划
  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/expense-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distributorId: id,
        name: planForm.name,
        amount: parseFloat(planForm.amount),
        remark: planForm.remark,
      }),
    });
    setPlanForm({ name: "", amount: "", remark: "" });
    loadData();
  };

  const updatePlan = async (planId: number, name: string, amount: number, remark: string) => {
    await fetch("/api/expense-plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: planId, name, amount, remark }),
    });
    loadData();
  };

  const deletePlan = async (planId: number) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/expense-plans?id=${planId}`, { method: "DELETE" });
    loadData();
  };

  // 费用
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = {
      distributorId: id,
      type: expenseForm.type,
      date: expenseForm.date,
      remark: expenseForm.remark,
    };
    if (expenseForm.type === "cash") {
      body.amount = parseFloat(expenseForm.amount);
      body.remark = expenseForm.name;
    } else {
      body.productId = parseInt(expenseForm.productId);
      body.quantity = parseInt(expenseForm.quantity);
      body.remark = expenseForm.remark;
    }
    await fetch("/api/distributor-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setExpenseForm({ type: "cash", date: "", name: "", amount: "", productId: "", quantity: "", remark: "" });
    loadData();
  };

  const deleteExpense = async (expId: number) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/distributor-expenses?id=${expId}`, { method: "DELETE" });
    loadData();
  };

  // 计算汇总
  const totalShipAmount = shipments.reduce((s, sh) => s + sh.amount, 0);
  const totalShipCost = shipments.reduce((s, sh) => s + sh.quantity * sh.product.cost, 0);
  const totalShipProfit = totalShipAmount - totalShipCost;
  const totalPlanAmount = plans.reduce((s, p) => s + p.amount, 0);
  const totalExpenseAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const expectedProfit = totalShipProfit - totalExpenseAmount - totalPlanAmount;
  // 利润率 = 预计利润（毛利-已发生费用-规划费用）/ 发货金额
  const profitRate = totalShipAmount === 0 ? 0 : (expectedProfit / totalShipAmount) * 100;

  const exportShipments = () => {
    exportToCSV(
      `${distributor?.name || "客户"}_发货记录`,
      ["日期", "产品", "数量", "发货金额", "成本", "毛利"],
      shipments.map(sh => [
        new Date(sh.date).toLocaleDateString("zh-CN"),
        sh.product.name,
        sh.quantity,
        Math.round(sh.amount),
        (Math.round(sh.quantity * sh.product.cost)),
        (Math.round(sh.amount - sh.quantity * sh.product.cost)),
      ])
    );
  };

  const exportPlans = () => {
    exportToCSV(
      `${distributor?.name || "客户"}_费用规划`,
      ["费用名称", "规划金额", "备注"],
      plans.map(p => [p.name, Math.round(p.amount), p.remark || "-"])
    );
  };

  const exportExpenses = () => {
    exportToCSV(
      `${distributor?.name || "客户"}_实际费用`,
      ["日期", "类型", "明细", "金额", "备注"],
      expenses.map(e => [
        new Date(e.date).toLocaleDateString("zh-CN"),
        e.type === "cash" ? "现金" : "酒水",
        e.type === "cash" ? e.remark : (e.product ? `${e.product.name} × ${e.quantity}` : "-"),
        Math.round(e.amount),
        e.type === "product" ? e.remark || "-" : "-",
      ])
    );
  };

  if (!distributor) return <div className="text-center py-12 text-gray-400">加载中...</div>;

  return (
    <div>
      <div className="mb-6">
        <Link href="/distribution" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
          ← 返回分销管理
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{distributor.name}</h1>
        <p className="text-sm text-gray-500">{distributor.region && `${distributor.region} · `}{distributor.remark || ""}</p>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">累计发货金额</div>
          <div className="text-lg font-bold text-blue-600">{formatMoney(totalShipAmount)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">累计成本</div>
          <div className="text-lg font-bold text-gray-600">{formatMoney(totalShipCost)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">累计毛利</div>
          <div className="text-lg font-bold text-purple-600">{formatMoney(totalShipProfit)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">已发生费用</div>
          <div className="text-lg font-bold text-red-600">{formatMoney(totalExpenseAmount)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">预计利润</div>
          <div className={`text-lg font-bold ${expectedProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatMoney(expectedProfit)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">利润率</div>
          <div className={`text-lg font-bold ${expectedProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatPercent(profitRate)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button onClick={() => setActiveTab("shipments")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "shipments" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-900"}`}>
            发货记录
          </button>
          <button onClick={() => setActiveTab("plans")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "plans" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-900"}`}>
            费用规划 ({plans.length})
          </button>
          <button onClick={() => setActiveTab("expenses")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "expenses" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-900"}`}>
            实际费用 ({expenses.length})
          </button>
        </div>
        <ExportButton
          onClick={activeTab === "shipments" ? exportShipments : activeTab === "plans" ? exportPlans : exportExpenses}
          label={`导出${activeTab === "shipments" ? "发货记录" : activeTab === "plans" ? "费用规划" : "实际费用"}`}
        />
      </div>

      {/* TAB1: 发货记录 */}
      {activeTab === "shipments" && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">新增发货</h3>
            <form onSubmit={handleShipSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">日期</label>
                <input required type="date" value={shipForm.date}
                  onChange={e => setShipForm({ ...shipForm, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">产品</label>
                <select required value={shipForm.productId}
                  onChange={e => setShipForm({ ...shipForm, productId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">选择产品</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">数量</label>
                <input required type="number" value={shipForm.quantity}
                  onChange={e => setShipForm({ ...shipForm, quantity: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">发货金额</label>
                <input required type="number" step="0.01" value={shipForm.amount}
                  onChange={e => setShipForm({ ...shipForm, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 w-full">添加</button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            {shipments.length === 0 ? <EmptyState message="暂无发货记录" /> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">日期</th>
                    <th className="text-left px-4 py-3">产品</th>
                    <th className="text-right px-4 py-3">数量</th>
                    <th className="text-right px-4 py-3">发货金额</th>
                    <th className="text-right px-4 py-3">成本</th>
                    <th className="text-right px-4 py-3">毛利</th>
                    <th className="text-center px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shipments.map(sh => {
                    const cost = sh.quantity * sh.product.cost;
                    const profit = sh.amount - cost;
                    return (
                      <tr key={sh.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{new Date(sh.date).toLocaleDateString("zh-CN")}</td>
                        <td className="px-4 py-3">{sh.product.name}</td>
                        <td className="px-4 py-3 text-right">{sh.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(sh.amount)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{formatMoney(cost)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">{formatMoney(profit)}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => deleteShipment(sh.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* TAB2: 费用规划 */}
      {activeTab === "plans" && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">新增费用规划</h3>
            <form onSubmit={handlePlanSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">费用名称</label>
                <input required value={planForm.name}
                  onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：市场推广" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">规划金额</label>
                <input required type="number" step="0.01" value={planForm.amount}
                  onChange={e => setPlanForm({ ...planForm, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">备注</label>
                <input value={planForm.remark}
                  onChange={e => setPlanForm({ ...planForm, remark: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 w-full">添加</button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            {plans.length === 0 ? <EmptyState message="暂无费用规划" /> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">费用名称</th>
                    <th className="text-right px-4 py-3">规划金额</th>
                    <th className="text-left px-4 py-3">备注</th>
                    <th className="text-center px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {plans.map(p => (
                    <PlanRow key={p.id} plan={p} onUpdate={updatePlan} onDelete={deletePlan} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* TAB3: 实际费用 */}
      {activeTab === "expenses" && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">新增费用</h3>

            {/* 费用类型切换 */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setExpenseForm({ ...expenseForm, type: "cash" })}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${expenseForm.type === "cash" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                现金费用
              </button>
              <button onClick={() => setExpenseForm({ ...expenseForm, type: "product" })}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${expenseForm.type === "product" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                酒水费用
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">日期</label>
                  <input required type="date" value={expenseForm.date}
                    onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {expenseForm.type === "cash" ? (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">费用名称</label>
                      <input required value={expenseForm.name}
                        onChange={e => setExpenseForm({ ...expenseForm, name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：推广费" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">金额</label>
                      <input required type="number" step="0.01" value={expenseForm.amount}
                        onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">产品</label>
                      <select required value={expenseForm.productId}
                        onChange={e => setExpenseForm({ ...expenseForm, productId: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">选择产品</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">数量</label>
                      <input required type="number" value={expenseForm.quantity}
                        onChange={e => setExpenseForm({ ...expenseForm, quantity: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">备注</label>
                  <input value={expenseForm.remark}
                    onChange={e => setExpenseForm({ ...expenseForm, remark: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 w-full">添加</button>
                </div>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            {expenses.length === 0 ? <EmptyState message="暂无费用记录" /> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">日期</th>
                    <th className="text-left px-4 py-3">类型</th>
                    <th className="text-left px-4 py-3">明细</th>
                    <th className="text-right px-4 py-3">金额</th>
                    <th className="text-left px-4 py-3">备注</th>
                    <th className="text-center px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{new Date(e.date).toLocaleDateString("zh-CN")}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${e.type === "cash" ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"}`}>
                          {e.type === "cash" ? "现金" : "酒水"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {e.type === "cash" ? e.remark : (e.product ? `${e.product.name} × ${e.quantity}` : "-")}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">{formatMoney(e.amount)}</td>
                      <td className="px-4 py-3 text-gray-500">{e.type === "product" ? e.remark : "-"}</td>
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

// 可编辑的费用规划行
function PlanRow({ plan, onUpdate, onDelete }: {
  plan: ExpensePlan;
  onUpdate: (id: number, name: string, amount: number, remark: string) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(plan.name);
  const [amount, setAmount] = useState(plan.amount);
  const [remark, setRemark] = useState(plan.remark);

  const handleSave = () => {
    onUpdate(plan.id, name, amount, remark);
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-2">
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
        </td>
        <td className="px-4 py-2">
          <input type="number" step="0.01" value={amount} onChange={e => setAmount(parseFloat(e.target.value))}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right" />
        </td>
        <td className="px-4 py-2">
          <input value={remark} onChange={e => setRemark(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
        </td>
        <td className="px-4 py-2 text-center">
          <button onClick={handleSave} className="text-blue-600 hover:text-blue-800 text-xs mr-2">保存</button>
          <button onClick={() => setEditing(false)} className="text-gray-500 hover:text-gray-700 text-xs">取消</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium">{plan.name}</td>
      <td className="px-4 py-3 text-right text-amber-600">{formatMoney(plan.amount)}</td>
      <td className="px-4 py-3 text-gray-500">{plan.remark || "-"}</td>
      <td className="px-4 py-3 text-center">
        <button onClick={() => setEditing(true)} className="text-blue-500 hover:text-blue-700 text-xs mr-2">编辑</button>
        <button onClick={() => onDelete(plan.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
      </td>
    </tr>
  );
}