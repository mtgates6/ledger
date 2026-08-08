import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "ledger_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

function secret(): string {
  const value = process.env.APP_SESSION_SECRET;
  if (!value) {
    throw new Error("APP_SESSION_SECRET is not set");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Build a signed session token to store in the passcode-gate cookie. */
export function createSessionToken(): string {
  const payload = `ok.${Math.floor(Date.now() / 1000)}`;
  return `${payload}.${sign(payload)}`;
}

/** Verify a session cookie value: correct signature and not expired. */
export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;

  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;

  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  const expected = sign(payload);

  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return false;

  const [, issuedAt] = payload.split(".");
  const issuedAtSeconds = parseInt(issuedAt, 10);
  if (!issuedAtSeconds) return false;

  const ageSeconds = Math.floor(Date.now() / 1000) - issuedAtSeconds;
  return ageSeconds >= 0 && ageSeconds <= SESSION_MAX_AGE_SECONDS;
}

/** Constant-time passcode comparison so guesses can't be timed. */
export function passcodeMatches(candidate: string): boolean {
  const expected = process.env.APP_PASSCODE;
  if (!expected) {
    throw new Error("APP_PASSCODE is not set");
  }

  const candidateBuf = Buffer.from(candidate);
  const expectedBuf = Buffer.from(expected);
  if (candidateBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(candidateBuf, expectedBuf);
}
