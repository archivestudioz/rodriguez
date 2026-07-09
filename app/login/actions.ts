"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  sessionToken,
  safeEqual,
} from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.APP_PASSWORD ?? "";
  const nextPath = String(formData.get("next") ?? "/");

  if (!expected) {
    return { error: "No password is configured on the server." };
  }
  if (!password || !safeEqual(password, expected)) {
    return { error: "Incorrect password." };
  }

  const token = await sessionToken();
  if (!token) return { error: "Server is missing its signing secret." };

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  const safeNext = nextPath.startsWith("/") ? nextPath : "/";
  redirect(safeNext);
}
