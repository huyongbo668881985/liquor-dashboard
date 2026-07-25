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

export function validateCredentials(username: string, password: string): boolean {
  const envUser = process.env.AUTH_USERNAME || "admin";
  const envPass = process.env.AUTH_PASSWORD || "admin123";
  return username === envUser && password === envPass;
}