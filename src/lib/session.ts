import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./auth";

// Check at every data entry point, independently of Proxy or the client UI.
export async function authorizeApi(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  // Same-origin browser mutations only. CLI clients using signed cookies may omit Origin.
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    // NextRequest.nextUrl can contain the internal/normalized hostname.
    // Follow Next.js's Server Action check against the externally received host.
    const host = request.headers.get("host");
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
    let originMatches = !origin;
    if (origin) {
      try {
        const originUrl = new URL(origin);
        originMatches = ["http:", "https:"].includes(originUrl.protocol) &&
          (originUrl.host === host || originUrl.host === forwardedHost);
      } catch {
        originMatches = false;
      }
    }
    if (request.headers.get("sec-fetch-site") === "cross-site" ||
        !originMatches) {
      return NextResponse.json({ error: "不允许跨站写入" }, { status: 403 });
    }
  }
  return null;
}

export async function requireSession() {
  const token = (await cookies()).get("auth_token")?.value;
  if (!token || !(await verifyToken(token))) redirect("/login");
}
