import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/api/login", "/api/logout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路径、静态资源不拦截
  if (
    publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
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
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};