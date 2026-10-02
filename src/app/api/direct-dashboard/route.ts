import { authorizeApi } from "@/lib/session";
import { getJxcDirectDashboard } from "@/lib/jxc";
import { NextRequest, NextResponse } from "next/server";

// 给浏览器页面的安全代理；进销存 API Key 始终只保留在服务端环境变量中。
export async function GET(req: NextRequest) {
  const denied = await authorizeApi(req);
  if (denied) return denied;
  try {
    return NextResponse.json(await getJxcDirectDashboard());
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取进销存直营汇总失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
