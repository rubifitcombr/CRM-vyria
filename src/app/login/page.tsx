"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/crm/inbox";
  const configError = searchParams.get("error") === "config";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2e2e2e] bg-[#1a1a1a] p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            Vyria <span className="text-[#E8521A]">CRM</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">Automação de funil via WhatsApp</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <span className="mb-1 block text-sm text-gray-400">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-[#2e2e2e] bg-[#252525] px-4 py-2.5 text-white outline-none focus:border-[#E8521A]"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <span className="mb-1 block text-sm text-gray-400">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-[#2e2e2e] bg-[#252525] px-4 py-2.5 text-white outline-none focus:border-[#E8521A]"
              placeholder="********"
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#E8521A] py-2.5 font-medium text-white transition hover:bg-[#c44516] disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-gray-400">
          Carregando...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
