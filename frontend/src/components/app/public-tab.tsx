"use client";

import { useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { monadTestnet } from "@/lib/wagmi";
import { useMockTransaction } from "@/hooks/use-mock-transaction";

type PublicCommitment = {
  id: string;
  user: string;
  avatar: string;
  goal: string;
  category: string;
  stake: number;
  deadline: string;
  supporters: number;
  supported: number;
  progress: number;
  verified: boolean;
  description: string;
};

const CATEGORIES = ["Todos", "Proyectos", "Fitness", "Educación", "Emprendimiento", "Arte"];

const MOCK_PUBLIC: PublicCommitment[] = [
  {
    id: "p1",
    user: "@maria_dev",
    avatar: "M",
    goal: "Lanzar mi SaaS de gestión de proyectos antes del 30 de junio",
    category: "Proyectos",
    stake: 500,
    deadline: "30 jun",
    supporters: 12,
    supported: 320,
    progress: 65,
    verified: true,
    description: "Necesito lanzar una MVP funcional con auth, dashboard y billing. Me comprometo a tener usuarios reales pagando antes de la fecha.",
  },
  {
    id: "p2",
    user: "@runner_max",
    avatar: "R",
    goal: "Completar el maratón de Buenos Aires (42km) en menos de 4 horas",
    category: "Fitness",
    stake: 200,
    deadline: "22 oct",
    supporters: 8,
    supported: 150,
    progress: 40,
    verified: false,
    description: "Entreno 5 días por semana desde hace 3 meses. Este es mi primer maratón.",
  },
  {
    id: "p3",
    user: "@leo_estudia",
    avatar: "L",
    goal: "Aprobar todas las materias del cuatrimestre con promedio mayor a 7",
    category: "Educación",
    stake: 150,
    deadline: "15 jul",
    supporters: 5,
    supported: 80,
    progress: 80,
    verified: false,
    description: "Último año de ingeniería. 4 materias pendientes, todas con parciales en junio.",
  },
  {
    id: "p4",
    user: "@fran_music",
    avatar: "F",
    goal: "Grabar y lanzar mi primer EP de 5 canciones antes de diciembre",
    category: "Arte",
    stake: 300,
    deadline: "1 dic",
    supporters: 18,
    supported: 560,
    progress: 25,
    verified: true,
    description: "Llevo 2 años componiendo. Este año me comprometo a terminar y lanzar formalmente.",
  },
  {
    id: "p5",
    user: "@startup_team",
    avatar: "S",
    goal: "MVP en producción con 50 usuarios activos para fin de Q2",
    category: "Emprendimiento",
    stake: 1000,
    deadline: "30 jun",
    supporters: 23,
    supported: 2400,
    progress: 90,
    verified: true,
    description: "Somos 3 fundadores comprometiendo stake personal. El equipo lleva 6 meses trabajando en esto.",
  },
  {
    id: "p6",
    user: "@pablo_code",
    avatar: "P",
    goal: "Completar bootcamp fullstack y conseguir mi primer trabajo en tech",
    category: "Educación",
    stake: 250,
    deadline: "31 ago",
    supporters: 9,
    supported: 200,
    progress: 55,
    verified: false,
    description: "Cambio de carrera a los 28. Vine de la contabilidad. Esto es real para mí.",
  },
];

export default function PublicTab({ username }: { username: string }) {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [showNewCommitment, setShowNewCommitment] = useState(false);
  const [supportTarget, setSupportTarget] = useState<PublicCommitment | null>(null);
  const [supportAmount, setSupportAmount] = useState("");
  const [supported, setSupported] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ goal: "", stake: "", deadline: "", category: "Proyectos", description: "" });

  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
    chainId: monadTestnet.id,
    query: { enabled: isConnected },
  });
  const supportTx = useMockTransaction();
  const publishTx = useMockTransaction();

  const formattedBalance = balance
    ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(2)} MON`
    : null;

  const filtered = selectedCategory === "Todos"
    ? MOCK_PUBLIC
    : MOCK_PUBLIC.filter((p) => p.category === selectedCategory);

  async function handleSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!supportTarget || !isConnected) return;
    await supportTx.execute();
    setSupported((prev) => new Set([...prev, supportTarget.id]));
    setSupportTarget(null);
    setSupportAmount("");
    supportTx.reset();
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (isConnected) await publishTx.execute();
    setShowNewCommitment(false);
    setForm({ goal: "", stake: "", deadline: "", category: "Proyectos", description: "" });
    publishTx.reset();
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-black text-xl text-white">Descubrir</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Proyectos y compromisos de la comunidad
          </p>
        </div>
        <button
          onClick={() => setShowNewCommitment(true)}
          className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Publicar compromiso
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className="flex-shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors"
            style={{
              backgroundColor:
                selectedCategory === cat ? "#F28B0C" : "rgba(88,2,89,0.3)",
              color: selectedCategory === cat ? "#40011E" : "rgba(255,255,255,0.55)",
              border: selectedCategory === cat ? "none" : "1px solid rgba(116,68,166,0.3)",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl p-5 flex flex-col gap-3"
            style={{
              backgroundColor: "rgba(88,2,89,0.2)",
              border: "1px solid rgba(116,68,166,0.25)",
            }}
          >
            {/* User + category */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white"
                  style={{ background: "linear-gradient(135deg,#580259,#7544A6)" }}
                >
                  {item.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white">{item.user}</span>
                    {item.verified && (
                      <svg className="w-3.5 h-3.5" fill="#F28B0C" viewBox="0 0 24 24">
                        <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <span
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    vence {item.deadline}
                  </span>
                </div>
              </div>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "rgba(116,68,166,0.2)", color: "#c084fc" }}
              >
                {item.category}
              </span>
            </div>

            {/* Goal */}
            <p className="text-sm text-white leading-snug font-medium">{item.goal}</p>

            {/* Description */}
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              {item.description}
            </p>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                <span>Progreso</span>
                <span>{item.progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${item.progress}%`,
                    backgroundColor: item.progress >= 75 ? "#F28B0C" : "#7544A6",
                  }}
                />
              </div>
            </div>

            {/* Stake + supporters */}
            <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold" style={{ color: "#F28B0C" }}>${item.stake}</span>
                <span>stake personal</span>
              </div>
              <div className="w-px h-3" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span>{item.supporters} apoyando</span>
                <span style={{ color: "#F28B0C" }}>+${item.supported}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {supported.has(item.id) ? (
                <div
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: "rgba(242,139,12,0.15)", color: "#F28B0C" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Apoyando
                </div>
              ) : (
                <button
                  onClick={() => setSupportTarget(item)}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition-colors"
                  style={{ backgroundColor: "#580259", color: "white", border: "1px solid #7544A6" }}
                >
                  Apoyar →
                </button>
              )}
              <button
                className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors"
                style={{ borderColor: "rgba(116,68,166,0.3)", color: "rgba(255,255,255,0.5)" }}
              >
                Seguir
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>
          <p className="text-lg font-light">Sin compromisos en esta categoría.</p>
        </div>
      )}

      {/* Support modal */}
      {supportTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setSupportTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)" }}
          >
            <h2 className="font-black text-xl text-white mb-1">Apoyar compromiso</h2>
            <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              {supportTarget.user} · {supportTarget.goal.slice(0, 55)}…
            </p>
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
              Si cumple, recuperás tu aporte. Si no cumple, va al fondo comunitario.
            </p>

            {isConnected ? (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(116,68,166,0.12)", border: "1px solid rgba(116,68,166,0.3)" }}>
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="font-mono text-white">{address?.slice(0,6)}…{address?.slice(-4)}</span>
                {formattedBalance && <span className="font-bold ml-auto" style={{ color: "#F28B0C" }}>{formattedBalance}</span>}
              </div>
            ) : (
              <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.08)", border: "1px solid rgba(242,139,12,0.2)", color: "rgba(255,255,255,0.5)" }}>
                Conectá tu wallet para apoyar con MON.
              </div>
            )}

            <form onSubmit={handleSupport} className="space-y-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Monto a aportar (MON)
                </label>
                <input
                  type="number"
                  placeholder="10"
                  min={1}
                  value={supportAmount}
                  onChange={(e) => setSupportAmount(e.target.value)}
                  disabled={!isConnected}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none disabled:opacity-40"
                  style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }}
                  autoFocus
                />
              </div>

              {supportTx.status === "success" && (
                <div className="rounded-xl px-3 py-2 text-xs font-mono" style={{ backgroundColor: "rgba(242,139,12,0.1)", border: "1px solid rgba(242,139,12,0.3)", color: "#F28B0C" }}>
                  ✓ Aporte enviado · {supportTx.txHash?.slice(0,14)}…
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setSupportTarget(null); supportTx.reset(); }}
                  disabled={supportTx.status === "pending"}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
                  style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isConnected || !supportAmount || Number(supportAmount) < 1 || supportTx.status === "pending"}
                  className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
                >
                  {supportTx.status === "pending" ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Enviando…
                    </>
                  ) : `Apoyar ${supportAmount || ""} MON →`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New public commitment modal */}
      {showNewCommitment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowNewCommitment(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 overflow-y-auto"
            style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)", maxHeight: "90vh" }}
          >
            <h2 className="font-black text-xl text-white mb-1">Publicar compromiso</h2>
            <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
              La comunidad puede apoyarte. La IA valida el cumplimiento.
            </p>
            <form onSubmit={handlePublish} className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Objetivo (claro y verificable)
                </label>
                <textarea
                  placeholder="Ej: Lanzar mi app antes del 30 de julio con al menos 10 usuarios"
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
                  style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Descripción (contexto para la comunidad)
                </label>
                <textarea
                  placeholder="¿Por qué es importante para vos? ¿Qué evidencia vas a presentar?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
                  style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Categoría
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                    style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }}
                  >
                    {CATEGORIES.filter((c) => c !== "Todos").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Stake personal (USD)
                  </label>
                  <input
                    type="number"
                    placeholder="100"
                    min={1}
                    value={form.stake}
                    onChange={(e) => setForm({ ...form, stake: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                    style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Fecha límite
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none"
                  style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }}
                />
              </div>
              <div
                className="rounded-xl p-3 text-xs"
                style={{ backgroundColor: "rgba(116,68,166,0.1)", border: "1px solid rgba(116,68,166,0.2)", color: "rgba(255,255,255,0.45)" }}
              >
                Al publicar, tu stake queda en escrow. La IA evalúa tu evidencia al vencimiento.
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewCommitment(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40"
                  style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
                  disabled={!form.goal.trim() || !form.stake}
                >
                  Publicar →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
