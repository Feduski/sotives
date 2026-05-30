"use client";

import { useState } from "react";
import { useConnection, useBalance, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatUnits } from "viem";
import { monadTestnet, CONTRACTS, BACKEND_URL } from "@/lib/wagmi";
import { COMMITMENT_MANAGER_ABI, EVIDENCE_TYPES } from "@/lib/contracts";
import type { EvidenceType } from "@/lib/contracts";
import { usePublicCommitments } from "@/hooks/use-public-commitments";
import type { PublicCommitment } from "@/hooks/use-public-commitments";

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusLabel(s: PublicCommitment["status"]): string {
  if (s === "Fulfilled") return "Cumplido";
  if (s === "Failed") return "Fallido";
  if (s === "EvidenceSubmitted") return "En revisión";
  return "Activo";
}

function statusColor(s: PublicCommitment["status"]): string {
  if (s === "Fulfilled") return "#F28B0C";
  if (s === "Failed") return "#ff7070";
  return "#c084fc";
}

function formatDeadline(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function daysLeft(ts: number): number {
  return Math.max(0, Math.ceil((ts * 1000 - Date.now()) / 86_400_000));
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

type TxStatus = "idle" | "signing" | "confirming" | "success" | "error";

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
    <a
      href={`https://monad-testnet.socialscan.io/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs underline underline-offset-2"
      style={{ color: "#F28B0C" }}
    >
      {hash.slice(0, 10)}…{hash.slice(-6)} ↗
    </a>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PublicTab({ username }: { username: string }) {
  const [supportTarget, setSupportTarget] = useState<PublicCommitment | null>(null);
  const [supportAmount, setSupportAmount] = useState("");
  const [supported, setSupported] = useState<Set<number>>(new Set());
  const [showNewCommitment, setShowNewCommitment] = useState(false);
  const [form, setForm] = useState({
    goal: "", stake: "0.0005", deadline: "", description: "", evidenceType: "URL" as EvidenceType,
  });

  const { address, isConnected } = useConnection();
  const { data: balance } = useBalance({ address, chainId: monadTestnet.id, query: { enabled: isConnected } });
  const formattedBalance = balance
    ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(2)} MON`
    : null;

  const contractsDeployed = !!(
    CONTRACTS.commitmentManager &&
    CONTRACTS.commitmentManager !== "0x0000000000000000000000000000000000000000"
  );

  // ── Real data ──────────────────────────────────────────────────────────────
  const { data: publicData, isLoading, isError, refetch } = usePublicCommitments();
  const commitments = publicData?.commitments ?? [];

  // ── Contract writes ────────────────────────────────────────────────────────
  const {
    writeContractAsync: writeSupportAsync,
    isPending: isSupportSigning,
    data: supportHash,
    error: supportWriteError,
    reset: resetSupport,
  } = useWriteContract();
  const { isLoading: isSupportConfirming, isSuccess: isSupportConfirmed } =
    useWaitForTransactionReceipt({ hash: supportHash, chainId: monadTestnet.id, query: { enabled: !!supportHash } });
  const supportStatus: TxStatus = supportWriteError
    ? "error"
    : isSupportConfirmed ? "success"
    : isSupportConfirming ? "confirming"
    : isSupportSigning ? "signing" : "idle";

  const {
    writeContractAsync: writePublishAsync,
    isPending: isPublishSigning,
    data: publishHash,
    error: publishWriteError,
    reset: resetPublish,
  } = useWriteContract();
  const { isLoading: isPublishConfirming, isSuccess: isPublishConfirmed } =
    useWaitForTransactionReceipt({ hash: publishHash, chainId: monadTestnet.id, query: { enabled: !!publishHash } });
  const publishStatus: TxStatus = publishWriteError
    ? "error"
    : isPublishConfirmed ? "success"
    : isPublishConfirming ? "confirming"
    : isPublishSigning ? "signing" : "idle";

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!supportTarget || !isConnected || !supportAmount) return;
    if (contractsDeployed) {
      try {
        await writeSupportAsync({
          address: CONTRACTS.commitmentManager,
          abi: COMMITMENT_MANAGER_ABI,
          functionName: "supportCommitment",
          args: [BigInt(supportTarget.id)],
          value: parseEther(supportAmount),
          chainId: monadTestnet.id,
        });
        setSupported((prev) => new Set([...prev, supportTarget.id]));
      } catch { /* error en supportWriteError */ }
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
          args: [form.goal, deadlineTs, form.description || form.goal, form.evidenceType, BigInt(0)],
          value: parseEther(form.stake),
          chainId: monadTestnet.id,
        });
      } catch { /* error en publishWriteError */ }
    }
  }

  // Cuando se publica con éxito, refrescamos la lista
  if (isPublishConfirmed && publishHash) {
    setTimeout(() => refetch(), 3000);
  }

  function closePublish() {
    setShowNewCommitment(false);
    setForm({ goal: "", stake: "0.0005", deadline: "", description: "", evidenceType: "URL" });
    resetPublish();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-black text-xl text-white">Descubrir</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {isLoading ? "Cargando desde Monad…" : isError ? "Error al conectar con el backend" : `${publicData?.total ?? 0} compromisos on-chain`}
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

      {/* Loading */}
      {isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ backgroundColor: "rgba(88,2,89,0.15)", border: "1px solid rgba(116,68,166,0.15)", height: "220px" }} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "rgba(255,60,60,0.06)", border: "1px solid rgba(255,60,60,0.2)" }}>
          <p className="text-sm font-medium" style={{ color: "#ff9090" }}>No se pudo conectar con el backend.</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Asegurate de que el servidor esté corriendo en {BACKEND_URL}.</p>
          <button onClick={() => refetch()} className="mt-3 text-xs font-semibold px-4 py-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>Reintentar</button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && commitments.length === 0 && (
        <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>
          <p className="text-lg font-light">Sin compromisos públicos aún.</p>
          <p className="text-sm mt-1">Sé el primero en publicar uno.</p>
        </div>
      )}

      {/* Cards grid */}
      {!isLoading && commitments.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {commitments.map((item) => {
            const dl = daysLeft(item.deadline);
            const progress = item.status === "Fulfilled" ? 100 : item.status === "Failed" ? 0 : Math.max(5, 100 - (dl / 90) * 100);
            return (
              <div
                key={item.id}
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ backgroundColor: "rgba(88,2,89,0.2)", border: `1px solid ${item.status === "Fulfilled" ? "rgba(242,139,12,0.3)" : "rgba(116,68,166,0.25)"}` }}
              >
                {/* User + status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white" style={{ background: "linear-gradient(135deg,#580259,#7544A6)" }}>
                      {item.creator.slice(2, 3).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-mono font-semibold text-white">{shortAddress(item.creator)}</span>
                        {item.status === "Fulfilled" && (
                          <svg className="w-3.5 h-3.5" fill="#F28B0C" viewBox="0 0 24 24">
                            <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {item.status === "Active" || item.status === "EvidenceSubmitted" ? `vence ${formatDeadline(item.deadline)}` : formatDeadline(item.deadline)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(116,68,166,0.2)", color: statusColor(item.status) }}>
                    {statusLabel(item.status)}
                  </span>
                </div>

                {/* Goal */}
                <p className="text-sm text-white leading-snug font-medium">{item.goal}</p>

                {/* Chain badge */}
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  Monad Testnet · ID #{item.id}
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <span>{dl > 0 ? `${dl} días restantes` : item.status === "Fulfilled" ? "Cumplido" : "Vencido"}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: item.status === "Fulfilled" ? "#F28B0C" : "#7544A6" }} />
                  </div>
                </div>

                {/* Stake */}
                <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-bold" style={{ color: "#F28B0C" }}>{item.total_funds_mon.toFixed(4)} MON</span>
                    <span>en escrow</span>
                  </div>
                </div>

                {/* Actions */}
                {(item.status === "Active" || item.status === "EvidenceSubmitted") && (
                  <div className="flex gap-2 pt-1">
                    {supported.has(item.id) ? (
                      <div className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: "rgba(242,139,12,0.15)", color: "#F28B0C" }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Apoyado
                      </div>
                    ) : (
                      <button
                        onClick={() => { setSupportTarget(item); setSupportAmount(""); resetSupport(); }}
                        disabled={!isConnected}
                        className="flex-1 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-40"
                        style={{ backgroundColor: "#580259", color: "white", border: "1px solid #7544A6" }}
                      >
                        Apoyar →
                      </button>
                    )}
                    <a
                      href={`https://monad-testnet.socialscan.io/address/${item.creator}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors"
                      style={{ borderColor: "rgba(116,68,166,0.3)", color: "rgba(255,255,255,0.5)" }}
                    >
                      Explorer ↗
                    </a>
                  </div>
                )}

                {item.status === "Fulfilled" && (
                  <div className="flex items-center gap-2 text-xs font-medium pt-1" style={{ color: "#F28B0C" }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Cumplido · verificado por IA · fondos devueltos
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Support modal ─────────────────────────────────────────────────────── */}
      {supportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && closeSupport()}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)" }}>
            <h2 className="font-black text-xl text-white mb-1">Apoyar compromiso</h2>
            <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{shortAddress(supportTarget.creator)} · {supportTarget.goal.slice(0, 55)}…</p>
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
                <input type="number" placeholder="0.0005" min={0.0001} step="any" value={supportAmount} onChange={(e) => setSupportAmount(e.target.value)} disabled={!isConnected} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none disabled:opacity-40" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} autoFocus />
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
                <button type="submit" disabled={!isConnected || !supportAmount || Number(supportAmount) <= 0 || supportStatus === "signing" || supportStatus === "confirming" || supportStatus === "success"} className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
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
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Stake (MON)</label>
                  <input type="number" placeholder="0.0005" min={0.0001} step="any" value={form.stake} onChange={(e) => setForm({ ...form, stake: e.target.value })} disabled={!isConnected} className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none disabled:opacity-40" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Fecha y hora límite</label>
                  <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }} />
                </div>
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Tipo de evidencia</label>
                <select value={form.evidenceType} onChange={(e) => setForm({ ...form, evidenceType: e.target.value as EvidenceType })} className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }}>
                  {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {publishStatus === "success" && publishHash && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.1)", border: "1px solid rgba(242,139,12,0.3)" }}>
                  ✓ Publicado on-chain · <TxHashLink hash={publishHash} />
                  <span className="ml-2" style={{ color: "rgba(255,255,255,0.4)" }}>(aparece en la lista en ~30 segundos)</span>
                </div>
              )}
              {publishStatus === "error" && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", color: "#ff9090" }}>{(publishWriteError as Error | null)?.message ?? "Error"}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closePublish} disabled={publishStatus === "signing" || publishStatus === "confirming"} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
                  {publishStatus === "success" ? "Cerrar" : "Cancelar"}
                </button>
                <button type="submit" disabled={!form.goal.trim() || !form.stake || !isConnected || !form.deadline || publishStatus === "signing" || publishStatus === "confirming" || publishStatus === "success"} className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
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
