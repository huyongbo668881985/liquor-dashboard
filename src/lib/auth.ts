// 认证模块
// 使用 HMAC-SHA256 对 token 签名，避免被伪造（token 自带签名，服务端用密钥验签）。
// 依赖 Web Crypto（crypto.subtle），在 Edge Runtime（middleware）和 Node Runtime（API 路由）均可运行。

const LOCKOUT_DURATION = 60 * 60 * 1000; // 1 小时
const MAX_ATTEMPTS = 3;

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
}

const attemptMap = new Map<string, AttemptRecord>();

function getClientIp(): string {
  return "global"; // 单用户系统，全局锁
}

export function checkRateLimit(): { allowed: boolean; remainingMinutes?: number } {
  const key = getClientIp();
  const now = Date.now();
  const record = attemptMap.get(key);

  if (record?.lockedUntil && record.lockedUntil > now) {
    const remaining = Math.ceil((record.lockedUntil - now) / 60000);
    return { allowed: false, remainingMinutes: remaining };
  }

  // 锁定已过期，重置
  if (record?.lockedUntil && record.lockedUntil <= now) {
    attemptMap.delete(key);
  }

  return { allowed: true };
}

export function recordFailedAttempt(): { remainingAttempts: number; locked: boolean } {
  const key = getClientIp();
  const now = Date.now();
  const record = attemptMap.get(key) || { count: 0, lockedUntil: null };

  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION;
    attemptMap.set(key, record);
    return { remainingAttempts: 0, locked: true };
  }

  attemptMap.set(key, record);
  return { remainingAttempts: MAX_ATTEMPTS - record.count, locked: false };
}

export function resetAttempts() {
  const key = getClientIp();
  attemptMap.delete(key);
}

// 校验账号密码：仅信任环境变量，未配置时直接拒绝，绝不回退到弱口令默认值。
export function validateCredentials(username: string, password: string): boolean {
  const envUser = process.env.AUTH_USERNAME;
  const envPass = process.env.AUTH_PASSWORD;
  if (!envUser || !envPass) return false;
  return username === envUser && password === envPass;
}

// ===== HMAC 签名 token =====

const enc = new TextEncoder();

function getSecret(): string {
  // 部署时必须通过环境变量提供 AUTH_SECRET； development 下给一个明确标注的开发用值，
  // 但生产环境务必配置真实随机值（见 .env.example）。
  return process.env.AUTH_SECRET || "DEV_ONLY_INSECURE_SECRET_CHANGE_ME";
}

function b64urlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlEncodeStr(s: string): string {
  return b64urlEncode(enc.encode(s));
}

function b64urlDecode(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return b64urlEncode(new Uint8Array(sig));
}

// 常量时间比较，避免签名被计时攻击。
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signToken(payload: { u: string; t: number }): Promise<string> {
  const body = b64urlEncodeStr(JSON.stringify(payload));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

export async function verifyToken(token: string): Promise<{ u: string; t: number } | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = await hmac(body);
  if (!constantTimeEqual(sig, expected)) return null;

  try {
    const payload = JSON.parse(b64urlDecode(body));
    if (!payload.u || !payload.t || payload.t < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
