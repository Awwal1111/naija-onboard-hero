/**
 * Client-side auth throttling (defence in depth).
 *
 * This does NOT replace server-side protection — an attacker hitting the auth
 * API directly bypasses it. Its job is to stop casual credential-stuffing and
 * password-reset/email flooding from the app itself, and to give users clear
 * feedback. Server-side protection is enabled via Supabase Auth Attack
 * Protection (CAPTCHA + rate limits).
 */

type Bucket = { count: number; first: number; lockedUntil?: number };

const PREFIX = "nl_throttle_";

const RULES = {
  login: { max: 5, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 },
  reset: { max: 3, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 },
  signup: { max: 3, windowMs: 60 * 60 * 1000, lockMs: 30 * 60 * 1000 },
} as const;

export type ThrottleAction = keyof typeof RULES;

const keyFor = (action: ThrottleAction, identifier: string) =>
  `${PREFIX}${action}_${identifier.trim().toLowerCase()}`;

const read = (key: string): Bucket | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Bucket) : null;
  } catch {
    return null;
  }
};

const write = (key: string, bucket: Bucket) => {
  try {
    localStorage.setItem(key, JSON.stringify(bucket));
  } catch {
    /* storage unavailable — fail open */
  }
};

/** Returns remaining lock time in ms (0 when the action is allowed). */
export function throttleCheck(action: ThrottleAction, identifier: string): number {
  const rule = RULES[action];
  const key = keyFor(action, identifier);
  const bucket = read(key);
  if (!bucket) return 0;

  const now = Date.now();
  if (bucket.lockedUntil && bucket.lockedUntil > now) return bucket.lockedUntil - now;

  if (now - bucket.first > rule.windowMs) {
    localStorage.removeItem(key);
    return 0;
  }
  return 0;
}

/** Record a failed / rate-limited attempt. Locks the action once the limit is hit. */
export function throttleRecord(action: ThrottleAction, identifier: string) {
  const rule = RULES[action];
  const key = keyFor(action, identifier);
  const now = Date.now();
  const existing = read(key);

  const bucket: Bucket =
    !existing || now - existing.first > rule.windowMs
      ? { count: 1, first: now }
      : { ...existing, count: existing.count + 1 };

  if (bucket.count >= rule.max) bucket.lockedUntil = now + rule.lockMs;
  write(key, bucket);
}

/** Clear the counter after a successful action. */
export function throttleReset(action: ThrottleAction, identifier: string) {
  try {
    localStorage.removeItem(keyFor(action, identifier));
  } catch {
    /* ignore */
  }
}

export function formatWait(ms: number): string {
  const mins = Math.ceil(ms / 60000);
  return mins <= 1 ? "a minute" : `${mins} minutes`;
}
