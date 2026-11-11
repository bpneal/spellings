/**
 * Wrong-passcode tracking. Kept at module level so leaving and re-opening Settings
 * doesn't reset the lockout (a page reload does, which is fine for a child lock).
 */

export const MAX_TRIES = 5;
export const LOCKOUT_MS = 30_000;

let failedTries = 0;
let lockedUntil = 0;

/** Whole seconds left in the current lockout (0 when not locked out). */
export function lockoutSecondsLeft(now: number = Date.now()): number {
  return Math.max(0, Math.ceil((lockedUntil - now) / 1000));
}

/** Record a wrong guess. Returns true if this guess started a lockout. */
export function recordFailedTry(now: number = Date.now()): boolean {
  failedTries++;
  if (failedTries < MAX_TRIES) return false;
  failedTries = 0;
  lockedUntil = now + LOCKOUT_MS;
  return true;
}

export function resetPasscodeAttempts(): void {
  failedTries = 0;
  lockedUntil = 0;
}
