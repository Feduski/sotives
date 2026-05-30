"use client";

import { useState } from "react";
import { useConnection, useBalance, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther, formatUnits } from "viem";
import { monadTestnet, CONTRACTS, BACKEND_URL } from "@/lib/wagmi";
import { COMMITMENT_MANAGER_ABI, EVIDENCE_TYPES } from "@/lib/contracts";
import type { EvidenceType } from "@/lib/contracts";
import { usePublicCommitments } from "@/hooks/use-public-commitments";
import type { PublicCommitment } from "@/hooks/use-public-commitments";

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusLabel(s: PublicCommitment["status"]) {
  if (s === "Fulfilled") return "Cumplido";
  if (s === "Failed") return "Fallido";
  if (s === "EvidenceSubmitted") return "En revisión";
  return "Activo";
}
function statusColor(s: PublicCommitment["status"]) {
  if (s === "Fulfilled") return "#F28B0C";
  if (s === "Failed") return "#ff7070";
  return "#c084fc";
}
function fmtDeadline(ts: number) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}
function daysLeft(ts: number) {
  return Math.max(0, Math.ceil((ts * 1000 - Date.now()) / 86_400_000));
}
function shortAddr(addr: string) {
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
    <a href={`https://monad-testnet.socialscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs underline underline-offset-2" style={{ color: "#F28B0C" }}>
      {hash.slice(0, 10)}…{hash.slice(-6)} ↗
    </a>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PublicTab({ username }: { username: string }) {
  const [joinTarget, setJoinTarget] = useState<PublicCommitment | null>(null);
  const [joined, setJoined] = useState<Set<number>>(new Set());
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    goal: "", joinPrice: "0.001", deadline: "", description: "", evidenceType: "URL" as EvidenceType,
  });

  const { address, isConnected } = useConnection();
  const { data: balance } = useBalance({ address, chainId: monadTestnet.id, query: { enabled: isConnected } });
  const formattedBalance = balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} MON` : null;

  const contractsDeployed = !!(CONTRACTS.commitmentManager && CONTRACTS.commitmentManager !== "0x0000000000000000000000000000000000000000");

  const { data: publicData, isLoading, isError, refetch } = usePublicCommitments();
  const commitments = publicData?.commitments ?? [];

  // ── Join (supportCommitment) ──────────────────────────────────────────────
  const {
    writeContractAsync: writeJoinAsync,
    isPending: isJoinSigning,
    data: joinHash,
    error: joinWriteError,
    reset: resetJoin,
  } = useWriteContract();
  const { isLoading: isJoinConfirming, isSuccess: isJoinConfirmed } =
    useWaitForTransactionReceipt({ hash: joinHash, chainId: monadTestnet.id, query: { enabled: !!joinHash } });
  const joinStatus: TxStatus = joinWriteError ? "error" : isJoinConfirmed ? "success" : isJoinConfirming ? "confirming" : isJoinSigning ? "signing" : "idle";

  // ── Create (createCommitment — gratuito) ──────────────────────────────────
  const {
    writeContractAsync: writeCreateAsync,
    isPending: isCreateSigning,
    data: createHash,
    error: createWriteError,
    reset: resetCreate,
  } = useWriteContract();
  const { isLoading: isCreateConfirming, isSuccess: isCreateConfirmed } =
    useWaitForTransactionReceipt({ hash: createHash, chainId: monadTestnet.id, query: { enabled: !!createHash } });
  const createStatus: TxStatus = createWriteError ? "error" : isCreateConfirmed ? "success" : isCreateConfirming ? "confirming" : isCreateSigning ? "signing" : "idle";

  if (isCreateConfirmed && createHash) {
    setTimeout(() => refetch(), 4000);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinTarget || !isConnected || !contractsDeployed) return;
    const joinPriceWei = BigInt(Math.round(joinTarget.join_price_mon * 1e18));
    try {
      await writeJoinAsync({
        address: CONTRACTS.commitmentManager,
        abi: COMMITMENT_MANAGER_ABI,
        functionName: "supportCommitment",
        args: [BigInt(joinTarget.id)],
        value: joinPriceWei,
        chainId: monadTestnet.id,
      });
      setJoined((prev) => new Set([...prev, joinTarget.id]));
      setTimeout(() => refetch(), 4000);
    } catch { /* error en joinWriteError */ }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.goal.trim() || !form.deadline || !isConnected || !contractsDeployed) return;
    const deadlineTs = BigInt(Math.floor(new Date(form.deadline).getTime() / 1000));
    const joinPriceWei = form.joinPrice ? BigInt(Math.round(Number(form.joinPrice) * 1e18)) : BigInt(0);
    try {
      await writeCreateAsync({
        address: CONTRACTS.commitmentManager,
        abi: COMMITMENT_MANAGER_ABI,
        functionName: "createCommitment",
        // Sin value — crear es GRATIS
        args: [form.goal, deadlineTs, form.description || form.goal, form.evidenceType, BigInt(0), joinPriceWei],
        chainId: monadTestnet.id,
      });
    } catch { /* error en createWriteError */ }
  }

  function closeJoin() { setJoinTarget(null); resetJoin(); }
  function closeCreate() { setShowNew(false); setForm({ goal: "", joinPrice: "0.001", deadline: "", description: "", evidenceType: "URL" }); resetCreate(); }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-black text-xl text-white">Descubrir</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {isLoading ? "Cargando desde Monad…" : isError ? "Error al conectar" : `${publicData?.total ?? 0} compromisos on-chain`}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Publicar compromiso
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ backgroundColor: "rgba(88,2,89,0.15)", height: "220px" }} />)}
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

      {!isLoading && !isError && commitments.length === 0 && (
        <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>
          <p className="text-lg font-light">Sin compromisos públicos aún.</p>
          <p className="text-sm mt-1">Publicá uno — es gratis. Otros pueden unirse pagando el precio que definas.</p>
        </div>
      )}

      {/* Cards */}
      {!isLoading && commitments.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {commitments.map((item) => {
            const dl = daysLeft(item.deadline);
            const progress = item.status === "Fulfilled" ? 100 : item.status === "Failed" ? 0 : Math.max(5, 100 - (dl / 90) * 100);
            const isActive = item.status === "Active" || item.status === "EvidenceSubmitted";
            return (
              <div key={item.id} className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: "rgba(88,2,89,0.2)", border: `1px solid ${item.status === "Fulfilled" ? "rgba(242,139,12,0.3)" : "rgba(116,68,166,0.25)"}` }}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white" style={{ background: "linear-gradient(135deg,#580259,#7544A6)" }}>
                      {item.creator.slice(2, 3).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-mono font-semibold text-white">{shortAddr(item.creator)}</span>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {isActive ? `vence ${fmtDeadline(item.deadline)}` : fmtDeadline(item.deadline)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(116,68,166,0.2)", color: statusColor(item.status) }}>{statusLabel(item.status)}</span>
                </div>

                <p className="text-sm text-white leading-snug font-medium">{item.goal}</p>

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

                {/* Funds + joinPrice */}
                <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <div className="flex items-center gap-1">
                    <span>Pool:</span>
                    <span className="font-bold" style={{ color: "#F28B0C" }}>{item.total_funds_mon.toFixed(4)} MON</span>
                  </div>
                  {item.join_price_mon > 0 && (
                    <>
                      <div className="w-px h-3" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
                      <div className="flex items-center gap-1">
                        <span>Unirse:</span>
                        <span className="font-bold" style={{ color: "#c084fc" }}>{item.join_price_mon} MON</span>
                      </div>
                    </>
                  )}
                  {item.join_price_mon === 0 && (
                    <>
                      <div className="w-px h-3" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>Unirse gratis</span>
                    </>
                  )}
                </div>

                {/* Actions */}
                {isActive && (
                  <div className="flex gap-2 pt-1">
                    {joined.has(item.id) ? (
                      <div className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: "rgba(242,139,12,0.15)", color: "#F28B0C" }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Unido
                      </div>
                    ) : (
                      <button
                        onClick={() => { setJoinTarget(item); resetJoin(); }}
                        disabled={!isConnected}
                        className="flex-1 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-40"
                        style={{ backgroundColor: "#580259", color: "white", border: "1px solid #7544A6" }}
                      >
                        {item.join_price_mon > 0 ? `Unirse · ${item.join_price_mon} MON →` : "Unirse gratis →"}
                      </button>
                    )}
                    <a href={`https://monad-testnet.socialscan.io/address/${item.creator}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl text-sm font-semibold border" style={{ borderColor: "rgba(116,68,166,0.3)", color: "rgba(255,255,255,0.5)" }}>↗</a>
                  </div>
                )}
                {item.status === "Fulfilled" && (
                  <div className="flex items-center gap-2 text-xs font-medium pt-1" style={{ color: "#F28B0C" }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Cumplido · verificado por IA · {item.total_funds_mon.toFixed(4)} MON al creador
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Unirse ─────────────────────────────────────────────────────── */}
      {joinTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && closeJoin()}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)" }}>
            <h2 className="font-black text-xl text-white mb-1">Unirse al compromiso</h2>
            <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{shortAddr(joinTarget.creator)} · {joinTarget.goal.slice(0, 55)}…</p>
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
              {joinTarget.join_price_mon > 0
                ? `Al unirte pagás ${joinTarget.join_price_mon} MON. Si el creador cumple, esos fondos van a él como recompensa. Si falla, van al pool comunitario.`
                : "Unirse es gratis. Podés apoyar opcionalmente con cualquier monto de MON."}
            </p>

            {isConnected ? (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(116,68,166,0.12)", border: "1px solid rgba(116,68,166,0.3)" }}>
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="font-mono text-white">{address?.slice(0,6)}…{address?.slice(-4)}</span>
                {formattedBalance && <span className="font-bold ml-auto" style={{ color: "#F28B0C" }}>{formattedBalance}</span>}
              </div>
            ) : (
              <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.08)", border: "1px solid rgba(242,139,12,0.2)", color: "rgba(255,255,255,0.5)" }}>Conectá tu wallet para unirte.</div>
            )}

            {joinTarget.join_price_mon > 0 && (
              <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between" style={{ backgroundColor: "rgba(116,68,166,0.15)", border: "1px solid rgba(116,68,166,0.3)" }}>
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Precio fijo para unirse</span>
                <span className="font-black text-lg" style={{ color: "#F28B0C" }}>{joinTarget.join_price_mon} MON</span>
              </div>
            )}

            {joinStatus === "success" && joinHash && (
              <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.1)", border: "1px solid rgba(242,139,12,0.3)" }}>
                ✓ On-chain · <TxHashLink hash={joinHash} />
              </div>
            )}
            {joinStatus === "error" && (
              <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", color: "#ff9090" }}>
                {(joinWriteError as Error | null)?.message ?? "Error"}
              </div>
            )}

            <form onSubmit={handleJoin} className="flex gap-3">
              <button type="button" onClick={closeJoin} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
                {joinStatus === "success" ? "Cerrar" : "Cancelar"}
              </button>
              <button type="submit" disabled={!isConnected || joinStatus === "signing" || joinStatus === "confirming" || joinStatus === "success"} className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
                {joinStatus === "signing"    && <><Spinner /> Firmando…</>}
                {joinStatus === "confirming" && <><Spinner /> Confirmando…</>}
                {joinStatus === "success"    && "✓ Unido"}
                {(joinStatus === "idle" || joinStatus === "error") && (
                  joinTarget.join_price_mon > 0 ? `Unirse · ${joinTarget.join_price_mon} MON →` : "Unirse →"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Publicar compromiso (GRATIS) ───────────────────────────────── */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && closeCreate()}>
          <div className="w-full max-w-md rounded-2xl p-6 overflow-y-auto" style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)", maxHeight: "90vh" }}>
            <h2 className="font-black text-xl text-white mb-1">Publicar compromiso</h2>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.08)", border: "1px solid rgba(242,139,12,0.2)", color: "#F28B0C" }}>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Crear es GRATIS. Definís cuánto cuesta que otros se unan.
            </div>

            {isConnected ? (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(116,68,166,0.12)", border: "1px solid rgba(116,68,166,0.3)" }}>
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="font-mono text-white">{address?.slice(0,6)}…{address?.slice(-4)}</span>
                {formattedBalance && <span className="font-bold ml-auto" style={{ color: "#F28B0C" }}>{formattedBalance}</span>}
              </div>
            ) : (
              <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(116,68,166,0.08)", border: "1px solid rgba(116,68,166,0.2)", color: "rgba(255,255,255,0.5)" }}>Conectá tu wallet para publicar.</div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <textarea placeholder="Objetivo claro y verificable" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} rows={2} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} />
              <textarea placeholder="¿Qué evidencia presentarás? (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Precio para unirse (MON)
                    <span className="ml-1" style={{ color: "rgba(255,255,255,0.25)" }}>— 0 = gratis</span>
                  </label>
                  <input type="number" placeholder="0.001" min={0} step="any" value={form.joinPrice} onChange={(e) => setForm({ ...form, joinPrice: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Deadline</label>
                  <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }} />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Tipo de evidencia</label>
                <select value={form.evidenceType} onChange={(e) => setForm({ ...form, evidenceType: e.target.value as EvidenceType })} className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }}>
                  {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {createStatus === "success" && createHash && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.1)", border: "1px solid rgba(242,139,12,0.3)" }}>
                  ✓ Publicado on-chain · <TxHashLink hash={createHash} />
                  <span className="ml-2" style={{ color: "rgba(255,255,255,0.4)" }}>(aparece en ~10s)</span>
                </div>
              )}
              {createStatus === "error" && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", color: "#ff9090" }}>{(createWriteError as Error | null)?.message ?? "Error"}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeCreate} disabled={createStatus === "signing" || createStatus === "confirming"} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
                  {createStatus === "success" ? "Cerrar" : "Cancelar"}
                </button>
                <button type="submit" disabled={!form.goal.trim() || !form.deadline || !isConnected || createStatus === "signing" || createStatus === "confirming" || createStatus === "success"} className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
                  {createStatus === "signing"    && <><Spinner /> Firmando…</>}
                  {createStatus === "confirming" && <><Spinner /> Confirmando…</>}
                  {createStatus === "success"    && "✓ Publicado"}
                  {(createStatus === "idle" || createStatus === "error") && "Publicar GRATIS →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
