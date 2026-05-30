"use client";

import { useState } from "react";
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatUnits } from "viem";
import { monadTestnet, CONTRACTS, BACKEND_URL } from "@/lib/wagmi";
import { COMMITMENT_MANAGER_ABI, EVIDENCE_TYPES } from "@/lib/contracts";
import type { EvidenceType } from "@/lib/contracts";

type PublicCommitment = {
  id: string;
  contractId?: number;   // on-chain ID cuando está deployado
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

  const [publishEvidenceType, setPublishEvidenceType] = useState<EvidenceType>("URL");

  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
    chainId: monadTestnet.id,
    query: { enabled: isConnected },
  });

  const formattedBalance = balance
    ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(2)} MON`
    : null;

  const contractsDeployed = CONTRACTS.commitmentManager !== "0x0000000000000000000000000000000000000000";

  // ── Contract write hooks ──────────────────────────────────────────────────

  type TxStatus = "idle" | "signing" | "confirming" | "success" | "error";

  const {
    writeContractAsync: writeSupportAsync,
    isPending: isSupportSigning,
    data: supportHash,
    error: supportWriteError,
    reset: resetSupport,
  } = useWriteContract();

  const { isLoading: isSupportConfirming, isSuccess: isSupportConfirmed } =
    useWaitForTransactionReceipt({ hash: supportHash, chainId: monadTestnet.id, query: { enabled: !!supportHash } });

  const supportStatus: TxStatus = supportWriteError ? "error" : isSupportConfirmed ? "success" : isSupportConfirming ? "confirming" : isSupportSigning ? "signing" : "idle";

  const {
    writeContractAsync: writePublishAsync,
    isPending: isPublishSigning,
    data: publishHash,
    error: publishWriteError,
    reset: resetPublish,
  } = useWriteContract();

  const { isLoading: isPublishConfirming, isSuccess: isPublishConfirmed } =
    useWaitForTransactionReceipt({ hash: publishHash, chainId: monadTestnet.id, query: { enabled: !!publishHash } });

  const publishStatus: TxStatus = publishWriteError ? "error" : isPublishConfirmed ? "success" : isPublishConfirming ? "confirming" : isPublishSigning ? "signing" : "idle";

  // ── Helpers ───────────────────────────────────────────────────────────────

  function Spinner() {
    return (
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    );
  }

  function TxHashLink({ hash }: { hash: `0x${string}` }) {
    return (
      <a href={`https://monad-testnet.socialscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs underline underline-offset-2" style={{ color: "#F28B0C" }}>
        {hash.slice(0, 10)}…{hash.slice(-6)} ↗
      </a>
    );
  }

  const filtered = selectedCategory === "Todos"
    ? MOCK_PUBLIC
    : MOCK_PUBLIC.filter((p) => p.category === selectedCategory);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!supportTarget || !isConnected || !supportAmount) return;

    if (contractsDeployed && supportTarget.contractId !== undefined) {
      try {
        await writeSupportAsync({
          address: CONTRACTS.commitmentManager,
          abi: COMMITMENT_MANAGER_ABI,
          functionName: "supportCommitment",
          args: [BigInt(supportTarget.contractId)],
          value: parseEther(supportAmount),
          chainId: monadTestnet.id,
        });
        setSupported((prev) => new Set([...prev, supportTarget.id]));
      } catch {
        // error en supportWriteError
      }
    } else {
      // Mock: sin contractId o contratos no deployados
      setSupported((prev) => new Set([...prev, supportTarget.id]));
      setSupportTarget(null);
      setSupportAmount("");
    }
  }

  function closeSupport() {
    setSupportTarget(null);
    setSupportAmount("");
    resetSupport();
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!form.goal.trim() || !form.stake) return;

    const deadlineTs = form.deadline
      ? BigInt(Math.floor(new Date(form.deadline).getTime() / 1000))
      : BigInt(0);

    if (isConnected && contractsDeployed && deadlineTs > BigInt(0)) {
      try {
        await writePublishAsync({
          address: CONTRACTS.commitmentManager,
          abi: COMMITMENT_MANAGER_ABI,
          functionName: "createCommitment",
          args: [form.goal, deadlineTs, form.description || form.goal, publishEvidenceType, BigInt(0)],
          value: parseEther(form.stake),
          chainId: monadTestnet.id,
        });
      } catch {
        // error en publishWriteError
      }
    } else {
      // Sin wallet o contratos no deployados: cierra sin tx
      setShowNewCommitment(false);
      setForm({ goal: "", stake: "", deadline: "", category: "Proyectos", description: "" });
      resetPublish();
    }
  }

  function closePublish() {
    setShowNewCommitment(false);
    setForm({ goal: "", stake: "", deadline: "", category: "Proyectos", description: "" });
    resetPublish();
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

      {/* ── Support modal ─────────────────────────────────────────────────────── */}
      {supportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && closeSupport()}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)" }}>
            <h2 className="font-black text-xl text-white mb-1">Apoyar compromiso</h2>
            <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{supportTarget.user} · {supportTarget.goal.slice(0, 55)}…</p>
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>Si cumple, recuperás tu aporte. Si no cumple, va al fondo comunitario.</p>

            {isConnected ? (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(116,68,166,0.12)", border: "1px solid rgba(116,68,166,0.3)" }}>
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="font-mono text-white">{address?.slice(0,6)}…{address?.slice(-4)}</span>
                {formattedBalance && <span className="font-bold ml-auto" style={{ color: "#F28B0C" }}>{formattedBalance}</span>}
              </div>
            ) : (
              <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.08)", border: "1px solid rgba(242,139,12,0.2)", color: "rgba(255,255,255,0.5)" }}>Conectá tu wallet para apoyar con MON.</div>
            )}

            <form onSubmit={handleSupport} className="space-y-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Monto (MON)</label>
                <input type="number" placeholder="10" min={1} value={supportAmount} onChange={(e) => setSupportAmount(e.target.value)} disabled={!isConnected} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none disabled:opacity-40" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} autoFocus />
              </div>

              {supportStatus === "success" && supportHash && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.1)", border: "1px solid rgba(242,139,12,0.3)" }}>
                  ✓ Aporte on-chain · <TxHashLink hash={supportHash} />
                </div>
              )}
              {supportStatus === "error" && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", color: "#ff9090" }}>{(supportWriteError as Error | null)?.message ?? "Error"}</div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={closeSupport} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
                  {supportStatus === "success" ? "Cerrar" : "Cancelar"}
                </button>
                <button type="submit" disabled={!isConnected || !supportAmount || Number(supportAmount) < 1 || supportStatus === "signing" || supportStatus === "confirming" || supportStatus === "success"} className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
                  {supportStatus === "signing"    && <><Spinner /> Firmando…</>}
                  {supportStatus === "confirming" && <><Spinner /> Confirmando…</>}
                  {supportStatus === "success"    && "✓ Apoyado"}
                  {(supportStatus === "idle" || supportStatus === "error") && `Apoyar ${supportAmount || ""} MON →`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Publish modal ─────────────────────────────────────────────────────── */}
      {showNewCommitment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && closePublish()}>
          <div className="w-full max-w-md rounded-2xl p-6 overflow-y-auto" style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)", maxHeight: "90vh" }}>
            <h2 className="font-black text-xl text-white mb-1">Publicar compromiso</h2>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>La comunidad puede apoyarte. La IA valida el cumplimiento.</p>

            {isConnected ? (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(116,68,166,0.12)", border: "1px solid rgba(116,68,166,0.3)" }}>
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="font-mono text-white">{address?.slice(0,6)}…{address?.slice(-4)}</span>
                {formattedBalance && <span className="font-bold ml-auto" style={{ color: "#F28B0C" }}>{formattedBalance}</span>}
              </div>
            ) : (
              <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.08)", border: "1px solid rgba(242,139,12,0.2)", color: "rgba(255,255,255,0.5)" }}>Conectá tu wallet para fondear el stake en MON.</div>
            )}

            <form onSubmit={handlePublish} className="space-y-3">
              <textarea placeholder="Objetivo claro y verificable" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} rows={2} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} />
              <textarea placeholder="¿Por qué es importante? ¿Qué evidencia presentarás?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Categoría</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }}>
                    {CATEGORIES.filter((c) => c !== "Todos").map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Tipo evidencia</label>
                  <select value={publishEvidenceType} onChange={(e) => setPublishEvidenceType(e.target.value as EvidenceType)} className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }}>
                    {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Stake (MON)</label>
                  <input type="number" placeholder="100" min={1} value={form.stake} onChange={(e) => setForm({ ...form, stake: e.target.value })} disabled={!isConnected} className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none disabled:opacity-40" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Fecha límite</label>
                  <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }} />
                </div>
              </div>

              {publishStatus === "success" && publishHash && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.1)", border: "1px solid rgba(242,139,12,0.3)" }}>
                  ✓ Publicado on-chain · <TxHashLink hash={publishHash} />
                </div>
              )}
              {publishStatus === "error" && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", color: "#ff9090" }}>{(publishWriteError as Error | null)?.message ?? "Error"}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closePublish} disabled={publishStatus === "signing" || publishStatus === "confirming"} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
                  {publishStatus === "success" ? "Cerrar" : "Cancelar"}
                </button>
                <button type="submit" disabled={!form.goal.trim() || !form.stake || publishStatus === "signing" || publishStatus === "confirming" || publishStatus === "success"} className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
                  {publishStatus === "signing"    && <><Spinner /> Firmando…</>}
                  {publishStatus === "confirming" && <><Spinner /> Confirmando…</>}
                  {publishStatus === "success"    && "✓ Publicado on-chain"}
                  {(publishStatus === "idle" || publishStatus === "error") && (
                    isConnected && form.stake ? `Publicar + Stake ${form.stake} MON →` : "Publicar →"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
