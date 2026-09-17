export interface DirectOrderSummary {
  order_count: number;
  sales_amount: number;
  received_amount: number;
  receivable_amount: number;
  cost_amount: number;
  gross_profit: number;
}

export interface JxcDirectDashboard {
  settled: DirectOrderSummary;
  outstanding: DirectOrderSummary;
  cash_adjustments: {
    refund_amount: number;
    net_received_amount: number;
  };
  meta: {
    currency: string;
    scope: string;
    unlinked_return_count: number;
  };
}

// 直营累计经营数据不需要实时刷新；最多每 6 小时向进销存回源一次。
// Vercel/Next 数据缓存命中时不会请求进销存，也不会把订单复制到 Supabase。
const JXC_REVALIDATE_SECONDS = 6 * 60 * 60;

function asNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function parseSummary(value: unknown): DirectOrderSummary {
  const row = value as Record<string, unknown>;
  return {
    order_count: asNumber(row.order_count),
    sales_amount: asNumber(row.sales_amount),
    received_amount: asNumber(row.received_amount),
    receivable_amount: asNumber(row.receivable_amount),
    cost_amount: asNumber(row.cost_amount),
    gross_profit: asNumber(row.gross_profit),
  };
}

/** 直营订单唯一来自进销存；此函数只能在服务端调用，避免泄露 API Key。 */
export async function getJxcDirectDashboard(): Promise<JxcDirectDashboard> {
  const baseUrl = process.env.JXC_API_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.JXC_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("尚未配置 JXC_API_BASE_URL 或 JXC_API_KEY");
  }

  const response = await fetch(`${baseUrl}/api/v1/reports/direct-dashboard`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: JXC_REVALIDATE_SECONDS },
  });
  if (!response.ok) {
    throw new Error(`进销存接口请求失败（HTTP ${response.status}）`);
  }

  const value = await response.json() as Record<string, unknown>;
  return {
    settled: parseSummary(value.settled),
    outstanding: parseSummary(value.outstanding),
    cash_adjustments: {
      refund_amount: asNumber((value.cash_adjustments as Record<string, unknown>)?.refund_amount),
      net_received_amount: asNumber((value.cash_adjustments as Record<string, unknown>)?.net_received_amount),
    },
    meta: {
      currency: String((value.meta as Record<string, unknown>)?.currency || "CNY"),
      scope: String((value.meta as Record<string, unknown>)?.scope || ""),
      unlinked_return_count: asNumber((value.meta as Record<string, unknown>)?.unlinked_return_count),
    },
  };
}
