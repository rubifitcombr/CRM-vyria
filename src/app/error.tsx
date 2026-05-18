"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f0f0f] p-6 text-center">
      <h1 className="text-xl font-semibold text-white">Algo deu errado</h1>
      <p className="max-w-md text-sm text-gray-400">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-[#E8521A] px-4 py-2 text-sm text-white"
      >
        Tentar novamente
      </button>
    </div>
  );
}
