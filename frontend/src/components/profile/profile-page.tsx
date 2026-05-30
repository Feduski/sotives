"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { monadTestnet } from "@/lib/wagmi";
import ConnectButton from "@/components/wallet/connect-button";

type Commitment = {
  id: string;
  group: string;
  groupEmoji: string;
  goal: string;
  stake: number;
  deadline: string;
  status: "en curso" | "cumplido" | "fallido";
  daysLeft: number;
  isPublic: boolean;
};

const ALL_COMMITMENTS: Commitment[] = [
  { id: "c1", group: "Runners Matutinos", groupEmoji: "🏃", goal: "Correr 5km tres veces por semana durante 4 semanas", stake: 50, deadline: "14 jun", status: "en curso", daysLeft: 12, isPublic: false },
  { id: "c2", group: "Startup Launch Squad", groupEmoji: "🚀", goal: "Completar backend MVP con autenticación y smart contracts", stake: 400, deadline: "30 jun", status: "en curso", daysLeft: 28, isPublic: false },
  { id: "c3", group: "Startup Launch Squad", groupEmoji: "🚀", goal: "Lanzar landing page del producto antes del 15 de junio", stake: 200, deadline: "15 jun", status: "cumplido", daysLeft: 0, isPublic: false },
  { id: "c4", group: "Público", groupEmoji: "🌐", goal: "MVP en producción con 50 usuarios activos para fin de Q2", stake: 1000, deadline: "30 jun", status: "en curso", daysLeft: 28, isPublic: true },
  { id: "c5", group: "Runners Matutinos", groupEmoji: "🏃", goal: "Meditar 10 minutos diarios por 21 días", stake: 30, deadline: "10 jun", status: "cumplido", daysLeft: 0, isPublic: false },
  { id: "c6", group: "Público", groupEmoji: "🌐", goal: "Correr el maratón de Buenos Aires en menos de 4 horas", stake: 200, deadline: "22 oct", status: "en curso", daysLeft: 144, isPublic: true },
];

const GROUPS = ["Todos", "Runners Matutinos", "Startup Launch Squad", "Público"];

export default function ProfilePage() {
  const [username, setUsername] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [groupFilter, setGroupFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | "en curso" | "cumplido">("todos");

  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
    chainId: monadTestnet.id,
    query: { enabled: isConnected },
  });

  useEffect(() => {
    setMounted(true);
    setUsername(localStorage.getItem("sotives_username") || "usuario");
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d0010" }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "#F28B0C", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const displayName = username?.startsWith("@") ? username : `@${username}`;
  const formattedBalance = balance
    ? Number(formatUnits(balance.value, balance.decimals)).toFixed(3)
    : "—";

  const filtered = ALL_COMMITMENTS.filter((c) => {
    const groupMatch = groupFilter === "Todos" || c.group === groupFilter;
    const statusMatch = statusFilter === "todos" || c.status === statusFilter;
    return groupMatch && statusMatch;
  });

  const active = ALL_COMMITMENTS.filter((c) => c.status === "en curso");
  const completed = ALL_COMMITMENTS.filter((c) => c.status === "cumplido");
  const totalStaked = ALL_COMMITMENTS.reduce((s, c) => s + c.stake, 0);
  const completionRate = ALL_COMMITMENTS.length
    ? Math.round((completed.length / ALL_COMMITMENTS.length) * 100)
    : 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0d0010" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 h-14 border-b"
        style={{ backgroundColor: "rgba(13,0,16,0.92)", backdropFilter: "blur(12px)", borderColor: "#580259" }}
      >
        <Link href="/app" className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          App
        </Link>
        <Link href="/" className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" fill="#F28B0C" />
            <path d="M14 6 L18 12 L14 10 L10 12 Z" fill="#40011E" />
            <circle cx="14" cy="16" r="5" fill="#40011E" />
            <path d="M10 19 L14 22 L18 19" fill="#40011E" />
          </svg>
          <span className="font-black text-lg text-white tracking-tight">SoTives</span>
        </Link>
        <ConnectButton />
      </header>

      <main className="px-4 md:px-10 py-8 max-w-4xl mx-auto space-y-6">

        {/* Profile card */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: "rgba(88,2,89,0.2)", border: "1px solid rgba(116,68,166,0.35)" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#580259,#7544A6)" }}
            >
              {username?.[0]?.toUpperCase() ?? "?"}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-black text-2xl text-white">{displayName}</h1>
              {isConnected && address ? (
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {address.slice(0,8)}…{address.slice(-6)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "rgba(116,68,166,0.2)", color: "#c084fc" }}>
                    Monad Testnet
                  </span>
                </div>
              ) : (
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Wallet no conectada
                </p>
              )}
            </div>

            {/* MON balance */}
            <div
              className="rounded-2xl p-4 text-center flex-shrink-0 sm:min-w-[140px]"
              style={{ backgroundColor: "rgba(242,139,12,0.1)", border: "1px solid rgba(242,139,12,0.25)" }}
            >
              <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Balance</p>
              <p className="font-black text-2xl" style={{ color: "#F28B0C" }}>
                {isConnected ? formattedBalance : "—"}
              </p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: "rgba(242,139,12,0.7)" }}>MON</p>
              {!isConnected && (
                <div className="mt-2">
                  <ConnectButton />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: `${completionRate}%`, label: "Cumplimiento" },
            { value: String(active.length), label: "Activos" },
            { value: `${totalStaked} MON`, label: "En escrow" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-4 text-center"
              style={{ backgroundColor: "rgba(88,2,89,0.2)", border: "1px solid rgba(116,68,166,0.25)" }}
            >
              <p className="font-black text-xl md:text-2xl" style={{ color: "#F28B0C" }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Commitments */}
        <div>
          <h2 className="font-black text-lg text-white mb-4">Mis compromisos</h2>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Group filter */}
            <div className="flex gap-1.5 flex-wrap">
              {GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupFilter(g)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                  style={{
                    backgroundColor: groupFilter === g ? "#7544A6" : "rgba(88,2,89,0.3)",
                    color: groupFilter === g ? "white" : "rgba(255,255,255,0.5)",
                    border: groupFilter === g ? "none" : "1px solid rgba(116,68,166,0.3)",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Separator */}
            <div className="w-px self-stretch" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />

            {/* Status filter */}
            <div className="flex gap-1.5">
              {(["todos", "en curso", "cumplido"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors capitalize"
                  style={{
                    backgroundColor: statusFilter === s ? "#F28B0C" : "rgba(88,2,89,0.3)",
                    color: statusFilter === s ? "#40011E" : "rgba(255,255,255,0.5)",
                    border: statusFilter === s ? "none" : "1px solid rgba(116,68,166,0.3)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: "rgba(88,2,89,0.2)",
                  border: `1px solid ${c.status === "cumplido" ? "rgba(242,139,12,0.3)" : "rgba(116,68,166,0.25)"}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="text-xl flex-shrink-0 mt-0.5">{c.groupEmoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{ color: "#c084fc" }}>{c.group}</span>
                      {c.isPublic && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "rgba(116,68,166,0.2)", color: "#c084fc" }}>
                          público
                        </span>
                      )}
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: c.status === "cumplido" ? "rgba(242,139,12,0.15)" : "rgba(116,68,166,0.2)",
                          color: c.status === "cumplido" ? "#F28B0C" : "#c084fc",
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-sm text-white leading-snug">{c.goal}</p>

                    {c.status !== "cumplido" && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.max(5, 100 - (c.daysLeft / 150) * 100)}%`, backgroundColor: "#7544A6" }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {c.daysLeft}d · hasta {c.deadline}
                        </span>
                      </div>
                    )}

                    {c.status === "cumplido" && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "#F28B0C" }}>
                        ✓ Cumplido · verificado por IA
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-base" style={{ color: "#F28B0C" }}>{c.stake}</div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>MON</div>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-12" style={{ color: "rgba(255,255,255,0.3)" }}>
                <p className="font-light">Sin compromisos con ese filtro.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="pb-8 flex gap-3 justify-center">
          <Link
            href="/app"
            className="font-bold text-sm px-6 py-3 rounded-full transition-colors"
            style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
          >
            + Nuevo compromiso
          </Link>
        </div>
      </main>
    </div>
  );
}
