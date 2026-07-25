import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, recordFailedAttempt, validateCredentials, resetAttempts } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  // 1. 检查是否被锁定
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    return NextResponse.json({
      success: false,
      locked: true,
      remainingMinutes: rateCheck.remainingMinutes,
      message: `密码错误次数过多，请在 ${rateCheck.remainingMinutes} 分钟后再试`,
    });
  }

  // 2. 验证凭证
  if (!validateCredentials(username, password)) {
    const result = recordFailedAttempt();
    if (result.locked) {
      return NextResponse.json({
        success: false,
        locked: true,
        remainingMinutes: 60,
        message: "密码错误次数过多，请在 60 分钟后再试",
      });
    }
    return NextResponse.json({
      success: false,
      remainingAttempts: result.remainingAttempts,
      message: `用户名或密码错误，还剩 ${result.remainingAttempts} 次机会`,
    });
  }

  // 3. 登录成功
  resetAttempts();

  const response = NextResponse.json({ success: true });

  // 设置 cookie，7 天有效期
  const authToken = Buffer.from(
    JSON.stringify({
      u: username,
      t: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString("base64");

  response.cookies.set("auth_token", authToken, {
    httpOnly: true,
    secure: false, // 内网部署，不需要 HTTPS
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}