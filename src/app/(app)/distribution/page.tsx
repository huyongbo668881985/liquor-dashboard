import { prisma } from "@/lib/prisma";
import { StatCard, SectionCard, formatMoney } from "@/components/ui";

// 该页面数据是实时的，且构建阶段可能连不上生产数据库/表结构还未迁移，
// 所以禁止在 `next build` 时静态预渲染，改为每次请求时动态渲染。
export const dynamic = "force-dynamic";

async function getDashboardData() {
  // 5 个查询之间互不依赖，改成并行发出，不用排队等
  const [directSales, directExpenses, directPurchases, distributors, manualFlows] = await Promise.all([
    prisma.directSale.findMany({ include: { product: true } }),
    prisma.directExpense.findMany(),
    prisma.directPurchase.findMany({ include: { product: true } }),
    prisma.distributor.findMany({
      include: {
        shipments: { include: { product: true } },
        expensePlans: true,
        distributorExpenses: { include: { product: true } },
      },
    }),
    prisma.cashFlow.findMany(),
  ]);

  // ===== 直营数据 =====
  const directTotalAmount = directSales.reduce((s, r) => s + r.amount, 0);
  const directTotalReceived = directSales.reduce((s, r) => s + r.received, 0);
  const directTotalReceivable = directTotalAmount - directTotalReceived;
  const directTotalCost = directSales.reduce((s, r) => s + r.quantity * r.product.cost, 0);
  const directGrossProfit = directTotalAmount - directTotalCost;
  const directTotalExpense = directExpenses.reduce((s, e) => s + e.amount, 0);
  const directNetProfit = directGrossProfit - directTotalExpense;
  const directPurchaseTotal = directPurchases.reduce((s, p) => s + p.amount, 0);

  // ===== 分销数据 =====
  const distTotalShipAmount = distributors.reduce((s, d) =>
    s + d.shipments.reduce((ss, sh) => ss + sh.amount, 0), 0);
  const distTotalShipCost = distributors.reduce((s, d) =>
    s + d.shipments.reduce((ss, sh) => ss + sh.quantity * sh.product.cost, 0), 0);
  const distGrossProfit = distTotalShipAmount - distTotalShipCost;
  const distTotalExpense = distributors.reduce((s, d) =>
    s + d.distributorExpenses.reduce((ss, e) => ss + e.amount, 0), 0);
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

  // ===== 现金流（自动计算） =====
  // 现金流入：直营已收 + 分销发货金额
  const autoCashIn = directTotalReceived + distTotalShipAmount;
  // 现金流出：直营采购成本 + 直营费用 + 分销成本 + 分销费用
  const autoCashOut = directPurchaseTotal + directTotalExpense + distTotalShipCost + distTotalExpense;

  // 手动流水记录作为调整项（比如初始资金注入、其他收支）
  let manualBalance = 0;
  for (const cf of manualFlows) {
    if (cf.type === "in") manualBalance += cf.amount;
    else manualBalance -= cf.amount;
  }

  // 现金余额 = 自动计算净现金流 + 手动调整
  const cashBalance = (autoCashIn - autoCashOut) + manualBalance;

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
    },
    distribution: {
      clientCount: distributors.length,
      totalShipAmount: distTotalShipAmount,
      totalCost: distTotalShipCost,
      grossProfit: distGrossProfit,
      totalExpense: distTotalExpense,
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
      autoIn: autoCashIn,
      autoOut: autoCashOut,
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
          <StatCard title="销售金额" value={formatMoney(direct.totalAmount)} color="blue" />
          <StatCard title="已收金额" value={formatMoney(direct.totalReceived)} color="green" />
          <StatCard title="应收金额" value={formatMoney(direct.totalReceivable)} color="yellow" />
          <StatCard title="销售成本" value={formatMoney(direct.totalCost)} color="gray" />
          <StatCard title="毛利" value={formatMoney(direct.grossProfit)} color="purple" />
          <StatCard title="采购发货成本" value={formatMoney(direct.purchaseTotal)} color="amber" />
          <StatCard title="已发生费用" value={formatMoney(direct.totalExpense)} color="red" />
          <StatCard title="净利润" value={formatMoney(direct.netProfit)}
            color={direct.netProfit >= 0 ? "green" : "red"} />
        </div>
      </SectionCard>

      {/* 分销经营 */}
      <SectionCard title="🚚 分销经营">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard title="客户数量" value={`${dist.clientCount} 家`} color="blue" />
          <StatCard title="累计发货金额" value={formatMoney(dist.totalShipAmount)} color="blue" />
          <StatCard title="商品成本" value={formatMoney(dist.totalCost)} color="gray" />
          <StatCard title="毛利" value={formatMoney(dist.grossProfit)} color="purple" />
          <StatCard title="已发生费用" value={formatMoney(dist.totalExpense)} color="red" />
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
          💡 现金余额 = 已收货款 + 分销发货金额 - 采购成本 - 直营费用 - 分销成本 - 分销费用 (± 手动流水调整)
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
