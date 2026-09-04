"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RecoveryNav() {
  const pathname = usePathname();

  const isRecovery =
    pathname.startsWith("/recovery-test");

  const isDashboard =
    pathname.startsWith("/dashboard");

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

        <Link
          href="/recovery-test"
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-lg font-bold text-white">
            R
          </div>

          <div>
            <p className="font-bold text-slate-950">
              RecoverAI
            </p>

            <p className="text-xs text-slate-500">
              Revenue Recovery Intelligence
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/recovery-test"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              isRecovery
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Live Recovery
          </Link>

          <Link
            href="/dashboard"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              isDashboard
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Revenue Analytics
          </Link>
        </nav>
      </div>
    </header>
  );
}