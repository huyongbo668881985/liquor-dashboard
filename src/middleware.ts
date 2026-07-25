import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/api/login", "/api/logout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路径不拦截
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // 静态资源不拦截
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    // 即使是根路径也要检查，但先检查 cookie
  }

  const authToken = request.cookies.get("auth_token")?.value;

  if (!authToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 验证 token 格式和有效期
  try {
    const decoded = JSON.parse(Buffer.from(authToken, "base64").toString("utf-8"));
    if (!decoded.u || !decoded.t || decoded.t < Date.now()) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，排除:
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     */
    "/((?!_next/static|_next/image).*)",
  ],
};