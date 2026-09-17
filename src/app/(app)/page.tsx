import { prisma } from "@/lib/prisma";
import { StatCard, SectionCard, formatMoney } from "@/components/ui";
import { getJxcDirectDashboard } from "@/lib/jxc";

// 该页面数据是实时的，且构建阶段可能连不上生产数据库/表结构还未迁移，
// 所以禁止在 `next build` 时静态预渲染，改为每次请求时动态渲染。
export const dynamic = "force-dynamic";

async function getDashboardData() {
  // 5 个查询之间互不依赖，改成并行发出，不用排队等
  const [jxcDirect, directExpenses, directPurchases, distributors, generalDistributionExpenses, manualFlows] = await Promise.all([
    getJxcDirectDashboard(),
    prisma.directExpense.findMany(),
    prisma.directPurchase.findMany({ include: { product: true } }),
    prisma.distributor.findMany({
      include: {
        shipments: { include: { product: true } },
        expensePlans: true,
        distributorExpenses: { include: { product: true } },
      },
    }),
    prisma.distributionGeneralExpense.findMany(),
    prisma.cashFlow.findMany(),
  ]);

  // ===== 直营数据 =====
  const directTotalAmount = jxcDirect.settled.sales_amount + jxcDirect.outstanding.sales_amount;
  const directTotalReceived = jxcDirect.settled.received_amount + jxcDirect.outstanding.received_amount;
  const directTotalReceivable = jxcDirect.settled.receivable_amount + jxcDirect.outstanding.receivable_amount;
  const directTotalCost = jxcDirect.settled.cost_amount + jxcDirect.outstanding.cost_amount;
  const directGrossProfit = jxcDirect.settled.gross_profit + jxcDirect.outstanding.gross_profit;
  const directTotalExpense = directExpenses.reduce((s, e) => s + e.amount, 0);
  const directNetProfit = directGrossProfit - directTotalExpense;
  const directPurchaseTotal = directPurchases.reduce((s, p) => s + p.amount, 0);

  // ===== 分销数据 =====
  const distTotalShipAmount = distributors.reduce((s, d) =>
    s + d.shipments.reduce((ss, sh) => ss + sh.amount, 0), 0);
  const distTotalShipCost = distributors.reduce((s, d) =>
    s + d.shipments.reduce((ss, sh) => ss + sh.quantity * sh.product.cost, 0), 0);
  const distGrossProfit = distTotalShipAmount - distTotalShipCost;
  const distClientExpense = distributors.reduce((s, d) =>
    s + d.distributorExpenses.reduce((ss, e) => ss + e.amount, 0), 0);
  const distGeneralExpense = generalDistributionExpenses.reduce((s, e) => s + e.amount, 0);
  const distTotalExpense = distClientExpense + distGeneralExpense;
  const distTotalPlan = distributors.reduce((s, d) =>
    s + d.expensePlans.reduce((ss, p) => ss + p.amount, 0), 0);
  const distExpectedProfit = distGrossProfit - distTotalExpense - distTotalPlan;

  // ===== 整体 =====
  const totalSales = directTotalAmount + distTotalShipAmount;
  const totalCost = directTotalCost + distTotalShipCost;
  const totalGrossProfit = directGrossProfit + distGrossProfit;
  const totalExpense = directTotalExpense + distTotalExpense;
  const currentProfit = directNetProfit + (distGrossProfit - distTotalExpense);
  const expectedProfit = directNetProfit + distExpectedProfit;

  // ===== 现金流 =====
  // CashFlow 表现在是唯一账本：直营销售回款/费用/采购、分销毛利/费用 在录入时都已经自动同步进去了，
  // 首页不再从原始数据重新推算一遍，直接把这张表加总即可，避免重复计入
  let cashBalance = 0;
  let cashInTotal = 0;
  let cashOutTotal = 0;
  for (const cf of manualFlows) {
    // 直营销售已改由进销存全历史净实收统一提供，旧自动流水仅保留备查，不能重复计入。
    if (cf.sourceType === "direct_sale") continue;
    if (cf.type === "in") {
      cashBalance += cf.amount;
      cashInTotal += cf.amount;
    } else {
      cashBalance -= cf.amount;
      cashOutTotal += cf.amount;
    }
  }
  const directNetReceived = jxcDirect.cash_adjustments.net_received_amount;
  cashBalance += directNetReceived;
  if (directNetReceived >= 0) cashInTotal += directNetReceived;
  else cashOutTotal += Math.abs(directNetReceived);

  // 应收 = 预期可收到的钱
  const receivable = directTotalReceivable;
  // 未来计划支出
  const futurePlan = distTotalPlan;

  // 现金压力 = 现金余额 + 应收 - 未来支出
  const cashPressure = cashBalance + receivable - futurePlan;

  return {
    direct: {
      totalAmount: directTotalAmount,
      totalReceived: directTotalReceived,
      totalReceivable: directTotalReceivable,
      totalCost: directTotalCost,
      grossProfit: directGrossProfit,
      totalExpense: directTotalExpense,
      netProfit: directNetProfit,
      purchaseTotal: directPurchaseTotal,
      settled: jxcDirect.settled,
      outstanding: jxcDirect.outstanding,
      refundAmount: jxcDirect.cash_adjustments.refund_amount,
      unlinkedReturnCount: jxcDirect.meta.unlinked_return_count,
    },
    distribution: {
      clientCount: distributors.length,
      totalShipAmount: distTotalShipAmount,
      totalCost: distTotalShipCost,
      grossProfit: distGrossProfit,
      totalExpense: distTotalExpense,
      clientExpense: distClientExpense,
      generalExpense: distGeneralExpense,
      totalPlan: distTotalPlan,
      expectedProfit: distExpectedProfit,
    },
    overall: {
      totalSales,
      totalCost,
      totalGrossProfit,
      totalExpense,
      currentProfit,
      expectedProfit,
    },
    cash: {
      balance: cashBalance,
      autoIn: cashInTotal,
      autoOut: cashOutTotal,
      receivable,
      futurePlan,
      pressure: cashPressure,
    },
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { direct, distribution: dist, overall, cash } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">经营总览</h1>
        <p className="text-sm text-gray-500 mt-1">酒水经营数据驾驶舱</p>
      </div>

      {/* 直营经营 */}
      <SectionCard title="🏪 直营经营">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard title="净销售金额" value={formatMoney(direct.totalAmount)} color="blue" />
          <StatCard title="已收金额" value={formatMoney(direct.totalReceived)} color="green" />
          <StatCard title="应收金额" value={formatMoney(direct.totalReceivable)} color="yellow" />
          <StatCard title="销售成本" value={formatMoney(direct.totalCost)} color="gray" />
          <StatCard title="毛利" value={formatMoney(direct.grossProfit)} color="purple" />
          <StatCard title="采购发货成本" value={formatMoney(direct.purchaseTotal)} color="amber" />
          <StatCard title="已发生费用" value={formatMoney(direct.totalExpense)} color="red" />
          <StatCard title="净利润" value={formatMoney(direct.netProfit)}
            color={direct.netProfit >= 0 ? "green" : "red"} />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">订单分类</th>
                <th className="text-right px-4 py-3">订单数</th>
                <th className="text-right px-4 py-3">净销售额</th>
                <th className="text-right px-4 py-3">实际已收</th>
                <th className="text-right px-4 py-3">未收金额</th>
                <th className="text-right px-4 py-3">成本</th>
                <th className="text-right px-4 py-3">毛利</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ["已结清订单", direct.settled],
                ["未收款 / 部分收款订单", direct.outstanding],
              ].map(([label, summary]) => {
                const row = summary as typeof direct.settled;
                return <tr key={label as string}>
                  <td className="px-4 py-3 font-medium">{label as string}</td>
                  <td className="px-4 py-3 text-right">{row.order_count}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(row.sales_amount)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatMoney(row.received_amount)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{formatMoney(row.receivable_amount)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatMoney(row.cost_amount)}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{formatMoney(row.gross_profit)}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500">数据来自进销存全历史已审核订单；实际退款 {formatMoney(direct.refundAmount)} 已从现金余额扣除。</p>
        {direct.unlinkedReturnCount > 0 && <p className="mt-2 text-xs text-amber-700">⚠️ 进销存中有 {direct.unlinkedReturnCount} 笔未关联销售单的退货，请处理关联关系以保证两行订单汇总完整。</p>}
      </SectionCard>

      {/* 分销经营 */}
      <SectionCard title="🚚 分销经营">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard title="客户数量" value={`${dist.clientCount} 家`} color="blue" />
          <StatCard title="累计发货金额" value={formatMoney(dist.totalShipAmount)} color="blue" />
          <StatCard title="商品成本" value={formatMoney(dist.totalCost)} color="gray" />
          <StatCard title="毛利" value={formatMoney(dist.grossProfit)} color="purple" />
          <StatCard title="已发生费用" value={formatMoney(dist.totalExpense)} color="red" />
          <StatCard title="其中：整体费用" value={formatMoney(dist.generalExpense)} color="red" />
          <StatCard title="未来规划费用" value={formatMoney(dist.totalPlan)} color="yellow" />
          <StatCard title="预计最终利润" value={formatMoney(dist.expectedProfit)}
            color={dist.expectedProfit >= 0 ? "green" : "red"} />
        </div>
      </SectionCard>

      {/* 整体经营 */}
      <SectionCard title="📊 整体经营">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard title="总销售额" value={formatMoney(overall.totalSales)} color="blue" />
          <StatCard title="总成本" value={formatMoney(overall.totalCost)} color="gray" />
          <StatCard title="总毛利" value={formatMoney(overall.totalGrossProfit)} color="purple" />
          <StatCard title="总费用" value={formatMoney(overall.totalExpense)} color="red" />
          <StatCard title="当前利润" value={formatMoney(overall.currentProfit)}
            color={overall.currentProfit >= 0 ? "green" : "red"} />
          <StatCard title="预计最终利润" value={formatMoney(overall.expectedProfit)}
            color={overall.expectedProfit >= 0 ? "green" : "red"} />
        </div>
      </SectionCard>

      {/* 现金情况 — 自动计算 */}
      <SectionCard title="💰 现金情况">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          💡 现金余额 = 直营净实收（已收款－实际退款）+ 分销净毛利 - 采购与实际费用 (± 手动流水调整)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard title="当前现金余额" value={formatMoney(cash.balance)}
            color={cash.balance >= 0 ? "green" : "red"} />
          <StatCard title="其中：自动收入" value={formatMoney(cash.autoIn)} color="green" />
          <StatCard title="其中：自动支出" value={formatMoney(cash.autoOut)} color="red" />
          <StatCard title="应收金额（预期）" value={formatMoney(cash.receivable)} color="yellow" />
          <StatCard title="未来计划支出" value={formatMoney(cash.futurePlan)} color="yellow" />
        </div>
        <div className="mt-3">
          <StatCard title="预计现金压力（余额 + 应收 - 未来支出）" value={formatMoney(cash.pressure)}
            color={cash.pressure >= 0 ? "green" : "red"} />
        </div>
        {cash.pressure < 0 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ⚠️ 预计现金压力为 {formatMoney(Math.abs(cash.pressure))}，请注意资金安排
          </div>
        )}
      </SectionCard>

      <div className="text-center text-xs text-gray-400 py-4">
        数据实时更新 · 最后更新于 {new Date().toLocaleString("zh-CN")}
      </div>
    </div>
  );
}
