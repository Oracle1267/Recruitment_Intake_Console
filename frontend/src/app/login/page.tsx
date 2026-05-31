import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import { authIsEnabled, SESSION_COOKIE_NAME, sessionIsValid } from "@/lib/auth";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  if (sessionIsValid(cookieStore.get(SESSION_COOKIE_NAME)?.value)) {
    redirect("/");
  }

  const params = await searchParams;
  const hasError = params?.error === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-field px-4 py-8 text-ink">
      <section className="w-full max-w-md rounded-md border border-ink/10 bg-white p-6 shadow-panel">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-scarlet text-lg font-black text-white">
            KΣ
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald">
              Kappa Sigma
            </p>
            <h1 className="text-xl font-semibold">Rush Tracker</h1>
          </div>
        </div>

        <form action="/api/login" method="post" className="space-y-3">
          <label className="block text-sm font-semibold" htmlFor="password">
            Chapter password
          </label>
          <div className="flex items-center gap-2 rounded-md border border-ink/15 bg-field px-3 py-2 focus-within:border-scarlet">
            <LockKeyhole className="h-4 w-4 text-ink/45" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Enter shared password"
              required={authIsEnabled()}
            />
          </div>
          {hasError ? (
            <p className="rounded-md border border-scarlet/25 bg-scarlet/10 px-3 py-2 text-sm font-medium text-scarlet">
              That password did not work. Try again.
            </p>
          ) : null}
          {!authIsEnabled() ? (
            <p className="rounded-md border border-brass/25 bg-brass/10 px-3 py-2 text-sm text-ink/70">
              Login is disabled until `RUSH_TRACKER_APP_PASSWORD` is set.
            </p>
          ) : null}
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-scarlet px-4 py-2 text-sm font-semibold text-white"
            type="submit"
          >
            <ShieldCheck className="h-4 w-4" />
            Open console
          </button>
        </form>
      </section>
    </main>
  );
}
