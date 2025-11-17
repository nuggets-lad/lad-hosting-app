"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030a1c] px-4 py-12 text-white">
      <div className="text-sm text-slate-300">Завантаження…</div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const redirectTo = useMemo(() => {
    const target = searchParams.get("redirectTo");
    if (!target) {
      return "/";
    }
    try {
      const decoded = decodeURIComponent(target);
      return decoded.startsWith("/") ? decoded : "/";
    } catch {
      return target.startsWith("/") ? target : "/";
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    setIsLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);

    if (signInError) {
      console.error(signInError);
      setError("Не вдалося ввійти. Перевірте email і пароль.");
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030a1c] px-4 py-12 text-white">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-gradient-to-b from-[#111831] to-[#0b1023] p-10 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur">
        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Вхід</h1>
            {error && (
              <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-900/30 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="block text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-300" htmlFor="email">
                Електронна пошта
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="h-12 rounded-[28px] border border-white/5 bg-[#131b34]/90 px-5 text-base text-white placeholder:text-slate-500 shadow-inner shadow-black/30 transition focus-visible:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60"
              />
            </div>

            <div className="space-y-3">
              <Label className="block text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-300" htmlFor="password">
                Пароль
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="h-12 rounded-[28px] border border-white/5 bg-[#131b34]/90 px-5 text-base text-white placeholder:text-slate-500 shadow-inner shadow-black/30 transition focus-visible:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-[28px] bg-gradient-to-r from-amber-300 to-amber-400 text-base font-semibold text-slate-950 transition hover:from-amber-200 hover:to-amber-300"
            disabled={isLoading}
          >
            {isLoading ? "Авторизація…" : "Увійти"}
          </Button>
        </form>
      </div>
    </div>
  );
}
