import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, sessionToken, authConfigured, safeEqual } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  // If no password is configured, don't lock anyone out (e.g. local dev).
  if (!authConfigured()) return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const token = await sessionToken();
  if (cookie && token && safeEqual(cookie, token)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const target = req.nextUrl.pathname + req.nextUrl.search;
  if (target && target !== "/") url.searchParams.set("next", target);
  return NextResponse.redirect(url);
}

export const config = {
  // Protect everything except the login flow, static assets and the favicon.
  matcher: ["/((?!login|api/login|api/logout|_next|favicon.ico|robots.txt).*)"],
};
