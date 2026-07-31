import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

const publicPaths = ["/login", "/api/login", "/api/logout"];

export async function middleware(request: NextRequest) {
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

  // 验证 token 签名与有效期（HMAC 验签，无法伪造）
  const payload = await verifyToken(authToken);
  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};