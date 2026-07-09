// Minimal app-level password gate. One shared password (APP_PASSWORD) unlocks
// the whole app; a signed session cookie proves the visitor got past it.
// Runs in both the edge middleware and server actions (Web Crypto only).

export const SESSION_COOKIE = "rodriguez_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** True only when both the password and signing secret are configured. */
export function authConfigured(): boolean {
  return !!process.env.APP_PASSWORD && !!process.env.AUTH_SECRET;
}

/** The value a valid session cookie must hold — a hash derived from the secret,
 *  so the raw secret is never stored in the cookie and can't be forged. */
export async function sessionToken(): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const bytes = new TextEncoder().encode(`rodriguez:v1:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time-ish string compare to avoid trivial timing leaks. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
