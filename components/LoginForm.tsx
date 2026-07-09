"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";
import { Sigil } from "./Sigil";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    <div className="halo flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Sigil size={52} />
          <div className="wordmark mt-4 text-2xl">Rodriguez</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Ledger of Provision
          </div>
        </div>

        <form action={formAction} className="card p-6">
          <div className="mx-auto mb-5 rule-gold w-16" />
          <label className="label" htmlFor="password">
            Enter the password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            className="field mt-1.5"
            placeholder="••••••••"
          />
          <input type="hidden" name="next" value={next} />

          {state.error && (
            <p className="mt-3 text-[13px]" style={{ color: "hsl(0,55%,42%)" }}>
              {state.error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary mt-5 w-full"
            disabled={pending}
          >
            {pending ? "Opening…" : "Enter"}
          </button>
        </form>

        <p className="mt-6 text-center font-serif text-[13px] italic text-muted-foreground">
          &ldquo;Give us this day our daily bread.&rdquo;
        </p>
      </div>
    </div>
  );
}
