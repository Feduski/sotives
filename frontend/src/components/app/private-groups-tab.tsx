"use client";

import { useState, useEffect } from "react";
import {
  useConnection, useBalance,
  useWriteContract, useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, keccak256, toBytes, formatUnits } from "viem";
import { monadTestnet, CONTRACTS, BACKEND_URL } from "@/lib/wagmi";
import { COMMITMENT_MANAGER_ABI, GROUP_MULTISIG_ABI, EVIDENCE_TYPES } from "@/lib/contracts";
import type { EvidenceType } from "@/lib/contracts";
import {
  useGroups, useGroupData, useGroupCommitments, useAiResult,
} from "@/hooks/use-groups";
import type { LocalGroup, GroupCommitment } from "@/hooks/use-groups";

// ── Helpers ────────────────────────────────────────────────────────────────────

const EMOJIS = ["💪", "📚", "🎯", "⚡", "🌟", "🚀", "🏃", "🎨"];

function shortAddr(addr: string) { return `${addr.slice(0, 6)}…${addr.slice(-4)}`; }
function fmtDeadline(ts: number) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function daysLeft(ts: number) { return Math.max(0, Math.ceil((ts * 1000 - Date.now()) / 86_400_000)); }
function statusLabel(s: GroupCommitment["status"]) {
  if (s === "Fulfilled") return "cumplido";
  if (s === "Failed") return "fallido";
  if (s === "EvidenceSubmitted") return "en revisión";
  return "en curso";
}
function statusColor(s: GroupCommitment["status"]) {
  if (s === "Fulfilled") return { bg: "rgba(242,139,12,0.15)", text: "#F28B0C" };
  if (s === "Failed") return { bg: "rgba(255,60,60,0.15)", text: "#ff7070" };
  return { bg: "rgba(116,68,166,0.2)", text: "#c084fc" };
}

type TxStatus = "idle" | "signing" | "confirming" | "success" | "error";

function useTx() {
  const { writeContractAsync, isPending: isSigning, data: hash, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash, chainId: monadTestnet.id, query: { enabled: !!hash },
  });
  const status: TxStatus = writeError ? "error" : isSuccess ? "success" : isConfirming ? "confirming" : isSigning ? "signing" : "idle";
  return { writeContractAsync, status, hash, error: (writeError as Error | null)?.message, reset };
}

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

// ── AI Result badge ────────────────────────────────────────────────────────────

function AiResultBadge({ commitmentId, status }: { commitmentId: number; status: GroupCommitment["status"] }) {
  const [open, setOpen] = useState(false);
  const resolved = status === "Fulfilled" || status === "Failed";
  const { data } = useAiResult(commitmentId, resolved);
  if (!resolved || !data) return null;
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: status === "Fulfilled" ? "#F28B0C" : "#ff9090" }}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.607L5 14.5m14.8.5l1.196 4.784M5 14.5L3.804 19.284M12 12h.01" /></svg>
        IA · {Math.round(data.confidence * 100)}% confianza {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mt-2 rounded-xl p-3 text-xs leading-relaxed" style={{ backgroundColor: "rgba(116,68,166,0.1)", border: "1px solid rgba(116,68,166,0.2)", color: "rgba(255,255,255,0.6)" }}>
          {data.reasoning}
          {data.tx_hash && <div className="mt-2"><TxHashLink hash={data.tx_hash as `0x${string}`} /></div>}
        </div>
      )}
    </div>
  );
}

// ── Group detail ───────────────────────────────────────────────────────────────

function GroupDetail({
  localGroup, userAddress, isConnected, contractsDeployed, formattedBalance, onBack,
}: {
  localGroup: LocalGroup; userAddress?: string; isConnected: boolean;
  contractsDeployed: boolean; formattedBalance: string | null; onBack: () => void;
}) {
  const { data: groupData } = useGroupData(localGroup.id);
  const { data: commitmentsData, isLoading: cLoading, refetch: refetchC } = useGroupCommitments(localGroup.id);
  const commitments = commitmentsData?.commitments ?? [];

  const [showCommitmentModal, setShowCommitmentModal] = useState(false);
  const [joinTarget, setJoinTarget] = useState<GroupCommitment | null>(null);
  const [evidenceTarget, setEvidenceTarget] = useState<GroupCommitment | null>(null);
  const [evidenceForm, setEvidenceForm] = useState({ type: "URL" as EvidenceType, value: "" });
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ fulfilled: boolean; confidence: number; reasoning: string } | null>(null);
  const [newC, setNewC] = useState({ goal: "", joinPrice: "0.001", deadline: "", criteria: "", evidenceType: "URL" as EvidenceType });

  const createTx   = useTx();
  const joinTx     = useTx();
  const evidenceTx = useTx();

  // After commitment created → refresh list
  useEffect(() => {
    if (createTx.status === "success") {
      const t = setTimeout(() => refetchC(), 4000);
      return () => clearTimeout(t);
    }
  }, [createTx.status]);

  // After join confirmed → refresh
  useEffect(() => {
    if (joinTx.status === "success") {
      const t = setTimeout(() => refetchC(), 4000);
      return () => clearTimeout(t);
    }
  }, [joinTx.status]);

  async function handleCreateCommitment(e: React.FormEvent) {
    e.preventDefault();
    if (!newC.goal.trim() || !newC.deadline || !isConnected || !contractsDeployed) return;
    const deadlineTs = BigInt(Math.floor(new Date(newC.deadline).getTime() / 1000));
    const joinPriceWei = newC.joinPrice ? BigInt(Math.round(Number(newC.joinPrice) * 1e18)) : BigInt(0);
    const criteria = newC.criteria.trim() || newC.goal;
    try {
      await createTx.writeContractAsync({
        address: CONTRACTS.commitmentManager,
        abi: COMMITMENT_MANAGER_ABI,
        functionName: "createCommitment",
        // Crear es GRATIS — sin value
        args: [newC.goal, deadlineTs, criteria, newC.evidenceType, BigInt(localGroup.id), joinPriceWei],
        chainId: monadTestnet.id,
      });
    } catch { /* error en createTx.error */ }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinTarget || !isConnected || !contractsDeployed) return;
    const joinPriceWei = BigInt(Math.round(joinTarget.join_price_mon * 1e18));
    try {
      await joinTx.writeContractAsync({
        address: CONTRACTS.commitmentManager,
        abi: COMMITMENT_MANAGER_ABI,
        functionName: "supportCommitment",
        args: [BigInt(joinTarget.id)],
        value: joinPriceWei,
        chainId: monadTestnet.id,
      });
    } catch { /* error en joinTx.error */ }
  }

  async function handleSubmitEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!evidenceTarget || !evidenceForm.value.trim()) return;

    if (isConnected && contractsDeployed) {
      try {
        const evidenceHash = keccak256(toBytes(evidenceForm.value.trim()));
        await evidenceTx.writeContractAsync({
          address: CONTRACTS.commitmentManager,
          abi: COMMITMENT_MANAGER_ABI,
          functionName: "submitEvidence",
          args: [BigInt(evidenceTarget.id), evidenceHash],
          chainId: monadTestnet.id,
        });
      } catch { return; }
    }

    setValidating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/commitments/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commitment_id: evidenceTarget.id,
          evidence_type: evidenceForm.type,
          evidence_value: evidenceForm.value.trim(),
          auto_resolve: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setValidationResult({ fulfilled: data.fulfilled, confidence: data.confidence, reasoning: data.reasoning });
        setTimeout(() => refetchC(), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setValidationResult({ fulfilled: false, confidence: 0, reasoning: err?.detail?.reasoning ?? "Error en el servidor." });
      }
    } catch {
      setValidationResult({ fulfilled: false, confidence: 0, reasoning: "Backend no disponible." });
    } finally {
      setValidating(false);
    }
  }

  function closeCommitmentModal() {
    setShowCommitmentModal(false);
    setNewC({ goal: "", joinPrice: "0.001", deadline: "", criteria: "", evidenceType: "URL" });
    createTx.reset();
  }
  function closeJoinModal() { setJoinTarget(null); joinTx.reset(); }
  function closeEvidenceModal() {
    setEvidenceTarget(null); setEvidenceForm({ type: "URL", value: "" });
    evidenceTx.reset(); setValidating(false); setValidationResult(null);
  }

  return (
    <div>
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          Grupos
        </button>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
        <span className="text-xl">{localGroup.emoji}</span>
        <span className="font-bold text-white">{localGroup.name}</span>
      </div>

      {/* Group info */}
      <div className="rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-4" style={{ backgroundColor: "rgba(88,2,89,0.15)", border: "1px solid rgba(116,68,166,0.2)" }}>
        <div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Código para unirse</p>
          <p className="font-black text-sm tracking-widest" style={{ color: "#F28B0C" }}>#{localGroup.id}</p>
        </div>
        {groupData && (
          <>
            <div className="h-8 w-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
            <div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Miembros multisig</p>
              <p className="font-bold text-sm text-white">{groupData.members.map(shortAddr).join(", ")}</p>
            </div>
          </>
        )}
        <div className="ml-auto">
          <button onClick={() => setShowCommitmentModal(true)} className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Nuevo compromiso
          </button>
        </div>
      </div>

      {/* Commitments */}
      {cLoading && <div className="space-y-3">{[1,2].map(i => <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ backgroundColor: "rgba(88,2,89,0.15)", height: "80px" }} />)}</div>}

      {!cLoading && commitments.length === 0 && (
        <div className="text-center py-12" style={{ color: "rgba(255,255,255,0.3)" }}>
          <p className="text-base font-light">Sin compromisos en este grupo.</p>
          <p className="text-sm mt-1">Creá uno — es gratis. Otros pueden unirse pagando el precio que definas.</p>
        </div>
      )}

      {!cLoading && commitments.length > 0 && (
        <div className="space-y-3">
          {commitments.map((c) => {
            const dl = daysLeft(c.deadline);
            const sc = statusColor(c.status);
            const isOwn = userAddress?.toLowerCase() === c.creator.toLowerCase();
            const isActive = c.status === "Active";
            return (
              <div key={c.id} className="rounded-2xl p-5" style={{ backgroundColor: "rgba(88,2,89,0.2)", border: `1px solid ${c.status === "Fulfilled" ? "rgba(242,139,12,0.3)" : "rgba(116,68,166,0.25)"}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg,#580259,#7544A6)" }}>{c.creator.slice(2,3).toUpperCase()}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-mono font-semibold" style={{ color: "#c084fc" }}>{shortAddr(c.creator)}</span>
                        {isOwn && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "rgba(242,139,12,0.15)", color: "#F28B0C" }}>vos</span>}
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: sc.bg, color: sc.text }}>{statusLabel(c.status)}</span>
                        <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>#{c.id}</span>
                      </div>
                      <p className="text-sm text-white leading-snug">{c.goal}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-base" style={{ color: "#F28B0C" }}>{c.total_funds_mon.toFixed(4)}</div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>MON pool</div>
                  </div>
                </div>

                {/* join price */}
                {(isActive || c.status === "EvidenceSubmitted") && (
                  <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {c.join_price_mon > 0
                      ? <span>Unirse: <span className="font-semibold" style={{ color: "#c084fc" }}>{c.join_price_mon} MON</span></span>
                      : <span>Unirse: <span className="font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>gratis</span></span>
                    }
                    {c.deadline > 0 && <span className="ml-auto">hasta {fmtDeadline(c.deadline)}</span>}
                  </div>
                )}

                {isActive && c.deadline > 0 && (
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(5, 100 - (dl/60)*100)}%`, backgroundColor: "#7544A6" }} />
                  </div>
                )}

                <AiResultBadge commitmentId={c.id} status={c.status} />

                <div className="mt-3 flex gap-2 flex-wrap">
                  {/* Unirse — cualquiera que no sea el dueño */}
                  {isActive && !isOwn && (
                    <button onClick={() => { setJoinTarget(c); joinTx.reset(); }} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(116,68,166,0.15)", color: "#c084fc", border: "1px solid rgba(116,68,166,0.3)" }}>
                      {c.join_price_mon > 0 ? `Unirse · ${c.join_price_mon} MON` : "Unirse gratis"}
                    </button>
                  )}
                  {/* Presentar evidencia — solo el dueño */}
                  {isActive && isOwn && (
                    <button onClick={() => { setEvidenceTarget(c); setEvidenceForm({ type: "URL", value: "" }); evidenceTx.reset(); setValidationResult(null); }} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(242,139,12,0.1)", color: "#F28B0C", border: "1px solid rgba(242,139,12,0.3)" }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                      Presentar evidencia
                    </button>
                  )}
                  <a href={`https://monad-testnet.socialscan.io/address/${c.creator}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>Explorer ↗</a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Nuevo compromiso ───────────────────────────────────────────── */}
      {showCommitmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && closeCommitmentModal()}>
          <div className="w-full max-w-md rounded-2xl p-6 overflow-y-auto" style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)", maxHeight: "90vh" }}>
            <h2 className="font-black text-xl text-white mb-1">Nuevo compromiso</h2>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.08)", border: "1px solid rgba(242,139,12,0.2)", color: "#F28B0C" }}>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Crear es GRATIS. Definís cuánto cuesta que otros se unan.
            </div>
            {isConnected ? (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(116,68,166,0.12)", border: "1px solid rgba(116,68,166,0.3)" }}>
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="font-mono text-white">{userAddress?.slice(0,6)}…{userAddress?.slice(-4)}</span>
                {formattedBalance && <span className="font-bold ml-auto" style={{ color: "#F28B0C" }}>{formattedBalance}</span>}
              </div>
            ) : (
              <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.08)", border: "1px solid rgba(242,139,12,0.2)", color: "rgba(255,255,255,0.5)" }}>Conectá tu wallet para publicar.</div>
            )}
            <form onSubmit={handleCreateCommitment} className="space-y-3">
              <textarea placeholder="Describí tu objetivo" value={newC.goal} onChange={(e) => setNewC({ ...newC, goal: e.target.value })} rows={3} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} />
              <textarea placeholder="Criterios de éxito (opcional)" value={newC.criteria} onChange={(e) => setNewC({ ...newC, criteria: e.target.value })} rows={2} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Precio p/ unirse (MON)</label>
                  <input type="number" placeholder="0.001" min={0} step="any" value={newC.joinPrice} onChange={(e) => setNewC({ ...newC, joinPrice: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Deadline</label>
                  <input type="datetime-local" value={newC.deadline} onChange={(e) => setNewC({ ...newC, deadline: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Evidencia</label>
                  <select value={newC.evidenceType} onChange={(e) => setNewC({ ...newC, evidenceType: e.target.value as EvidenceType })} className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }}>
                    {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {createTx.status === "success" && createTx.hash && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.1)", border: "1px solid rgba(242,139,12,0.3)" }}>
                  ✓ On-chain · <TxHashLink hash={createTx.hash} /> <span style={{ color: "rgba(255,255,255,0.4)" }}>(aparece en ~10s)</span>
                </div>
              )}
              {createTx.status === "error" && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", color: "#ff9090" }}>{createTx.error ?? "Error"}</div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeCommitmentModal} disabled={createTx.status === "signing" || createTx.status === "confirming"} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
                  {createTx.status === "success" ? "Cerrar" : "Cancelar"}
                </button>
                <button type="submit" disabled={!newC.goal.trim() || !newC.deadline || !isConnected || createTx.status === "signing" || createTx.status === "confirming" || createTx.status === "success"} className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
                  {createTx.status === "signing"    && <><Spinner /> Firmando…</>}
                  {createTx.status === "confirming" && <><Spinner /> Confirmando…</>}
                  {createTx.status === "success"    && "✓ Creado on-chain"}
                  {createTx.status === "error"      && "Reintentar"}
                  {createTx.status === "idle"       && "Publicar GRATIS →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Unirse al compromiso ───────────────────────────────────────── */}
      {joinTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && closeJoinModal()}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)" }}>
            <h2 className="font-black text-xl text-white mb-1">Unirse al compromiso</h2>
            <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{shortAddr(joinTarget.creator)} · {joinTarget.goal.slice(0, 55)}…</p>
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
              {joinTarget.join_price_mon > 0
                ? `Si el creador cumple, esos fondos van a él como recompensa. Si falla, van al pool comunitario.`
                : "Unirse a este compromiso es gratis."}
            </p>
            {isConnected ? (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(116,68,166,0.12)", border: "1px solid rgba(116,68,166,0.3)" }}>
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="font-mono text-white">{userAddress?.slice(0,6)}…{userAddress?.slice(-4)}</span>
                {formattedBalance && <span className="font-bold ml-auto" style={{ color: "#F28B0C" }}>{formattedBalance}</span>}
              </div>
            ) : (
              <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.08)", border: "1px solid rgba(242,139,12,0.2)", color: "rgba(255,255,255,0.5)" }}>Conectá tu wallet.</div>
            )}
            {joinTarget.join_price_mon > 0 && (
              <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between" style={{ backgroundColor: "rgba(116,68,166,0.15)", border: "1px solid rgba(116,68,166,0.3)" }}>
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Precio fijo</span>
                <span className="font-black text-lg" style={{ color: "#F28B0C" }}>{joinTarget.join_price_mon} MON</span>
              </div>
            )}
            {joinTx.status === "success" && joinTx.hash && (
              <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.1)", border: "1px solid rgba(242,139,12,0.3)" }}>
                ✓ On-chain · <TxHashLink hash={joinTx.hash} />
              </div>
            )}
            {joinTx.status === "error" && (
              <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", color: "#ff9090" }}>{joinTx.error ?? "Error"}</div>
            )}
            <form onSubmit={handleJoin} className="flex gap-3">
              <button type="button" onClick={closeJoinModal} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
                {joinTx.status === "success" ? "Cerrar" : "Cancelar"}
              </button>
              <button type="submit" disabled={!isConnected || joinTx.status === "signing" || joinTx.status === "confirming" || joinTx.status === "success"} className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2" style={{ backgroundColor: "#7544A6", color: "white" }}>
                {joinTx.status === "signing"    && <><Spinner /> Firmando…</>}
                {joinTx.status === "confirming" && <><Spinner /> Confirmando…</>}
                {joinTx.status === "success"    && "✓ Unido"}
                {(joinTx.status === "idle" || joinTx.status === "error") && (joinTarget.join_price_mon > 0 ? `Unirse · ${joinTarget.join_price_mon} MON →` : "Unirse →")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Evidencia ──────────────────────────────────────────────────── */}
      {evidenceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && closeEvidenceModal()}>
          <div className="w-full max-w-md rounded-2xl p-6 overflow-y-auto" style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)", maxHeight: "90vh" }}>
            <h2 className="font-black text-xl text-white mb-1">Presentar evidencia</h2>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>{evidenceTarget.goal.slice(0, 70)}…</p>
            {validationResult ? (
              <div className="space-y-4">
                <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: validationResult.fulfilled ? "rgba(242,139,12,0.1)" : "rgba(255,60,60,0.08)", border: `1px solid ${validationResult.fulfilled ? "rgba(242,139,12,0.3)" : "rgba(255,60,60,0.2)"}` }}>
                  <p className="font-black text-2xl mb-1" style={{ color: validationResult.fulfilled ? "#F28B0C" : "#ff7070" }}>{validationResult.fulfilled ? "✓ Cumplido" : "✗ No cumplido"}</p>
                  <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Confianza: {Math.round(validationResult.confidence * 100)}%</p>
                  <p className="text-xs mt-3 leading-relaxed text-left" style={{ color: "rgba(255,255,255,0.6)" }}>{validationResult.reasoning}</p>
                </div>
                {evidenceTx.hash && <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(116,68,166,0.1)", border: "1px solid rgba(116,68,166,0.3)" }}>Hash on-chain · <TxHashLink hash={evidenceTx.hash} /></div>}
                <button onClick={closeEvidenceModal} className="w-full py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>Cerrar</button>
              </div>
            ) : (
              <form onSubmit={handleSubmitEvidence} className="space-y-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Tipo de evidencia</label>
                  <select value={evidenceForm.type} onChange={(e) => setEvidenceForm({ ...evidenceForm, type: e.target.value as EvidenceType })} className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }}>
                    {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <textarea placeholder={evidenceForm.type === "GITHUB" ? "https://github.com/…" : evidenceForm.type === "URL" ? "https://…" : "Descripción detallada…"} value={evidenceForm.value} onChange={(e) => setEvidenceForm({ ...evidenceForm, value: e.target.value })} rows={4} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} />
                {(evidenceTx.status === "signing" || evidenceTx.status === "confirming" || evidenceTx.status === "success") && (
                  <div className="rounded-xl px-3 py-2 text-xs flex items-center gap-2" style={{ backgroundColor: "rgba(116,68,166,0.1)", border: "1px solid rgba(116,68,166,0.3)", color: "#c084fc" }}>
                    {evidenceTx.status !== "success" && <Spinner />}
                    {evidenceTx.status === "signing" && "Firmando hash on-chain…"}
                    {evidenceTx.status === "confirming" && "Confirmando en Monad…"}
                    {evidenceTx.status === "success" && <>✓ Hash on-chain · <TxHashLink hash={evidenceTx.hash!} /></>}
                  </div>
                )}
                {evidenceTx.status === "error" && <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", color: "#ff9090" }}>{evidenceTx.error ?? "Error on-chain"}</div>}
                {validating && <div className="rounded-xl px-3 py-2 text-xs flex items-center gap-2" style={{ backgroundColor: "rgba(242,139,12,0.08)", border: "1px solid rgba(242,139,12,0.2)", color: "rgba(255,255,255,0.5)" }}><Spinner /> Validando con IA…</div>}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeEvidenceModal} disabled={evidenceTx.status === "signing" || evidenceTx.status === "confirming" || validating} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>Cancelar</button>
                  <button type="submit" disabled={!evidenceForm.value.trim() || evidenceTx.status === "signing" || evidenceTx.status === "confirming" || validating} className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
                    {validating ? <><Spinner /> Validando…</> : evidenceTx.status === "signing" ? <><Spinner /> Firmando…</> : evidenceTx.status === "confirming" ? <><Spinner /> Confirmando…</> : "Enviar evidencia →"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Group card ─────────────────────────────────────────────────────────────────

function GroupCard({ group, onOpen, onLeave }: { group: LocalGroup; onOpen: () => void; onLeave: () => void }) {
  const { data } = useGroupData(group.id);
  const { data: cd } = useGroupCommitments(group.id);
  const commitments = cd?.commitments ?? [];
  const active = commitments.filter(c => c.status === "Active" || c.status === "EvidenceSubmitted").length;
  const fulfilled = commitments.filter(c => c.status === "Fulfilled").length;
  const rate = commitments.length > 0 ? Math.round((fulfilled / commitments.length) * 100) : 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "rgba(88,2,89,0.2)", border: "1px solid rgba(116,68,166,0.3)" }}>
      <button onClick={onOpen} className="w-full text-left p-5 hover:scale-[1.005] transition-transform block">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: "rgba(116,68,166,0.2)" }}>{group.emoji}</div>
            <div>
              <p className="font-bold text-base text-white">{group.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                ID #{group.id} · {data ? `${data.members.length} miembros` : "…"} · {active} activos
              </p>
            </div>
          </div>
          <div className="text-right ml-4">
            <div className="text-lg font-black" style={{ color: "#F28B0C" }}>{commitments.length > 0 ? `${rate}%` : "—"}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>cumplimiento</div>
          </div>
        </div>
        {commitments.length > 0 && (
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: "#F28B0C" }} />
          </div>
        )}
      </button>
      <div className="px-5 pb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Monad Testnet
        </span>
        <button onClick={(e) => { e.stopPropagation(); onLeave(); }} className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Salir</button>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function PrivateGroupsTab({ username }: { username: string }) {
  const { groups, addGroup, removeGroup } = useGroups();
  const [selectedGroup, setSelectedGroup] = useState<LocalGroup | null>(null);
  const [modal, setModal] = useState<"create" | "join" | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const { address, isConnected } = useConnection();
  const { data: balance } = useBalance({ address, chainId: monadTestnet.id, query: { enabled: isConnected } });
  const formattedBalance = balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} MON` : null;

  const contractsDeployed = !!(CONTRACTS.groupMultisig && CONTRACTS.groupMultisig !== "0x0000000000000000000000000000000000000000");
  const createGroupTx = useTx();
  const [pendingGroup, setPendingGroup] = useState<{ id: number; name: string; emoji: string } | null>(null);

  // ✅ useEffect — no side effects in render body
  useEffect(() => {
    if (createGroupTx.status === "success" && pendingGroup) {
      const g: LocalGroup = pendingGroup;
      addGroup(g);
      const t = setTimeout(() => {
        setModal(null);
        setNewGroupName("");
        setPendingGroup(null);
        createGroupTx.reset();
        setSelectedGroup(g);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [createGroupTx.status, pendingGroup]);

  async function fetchNextGroupId(): Promise<number> {
    const res = await fetch(`${BACKEND_URL}/groups/next-id`);
    const data = await res.json();
    return data.next_group_id as number;
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim() || !isConnected || !contractsDeployed) return;
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    try {
      const nextId = await fetchNextGroupId();
      setPendingGroup({ id: nextId, name: newGroupName.trim(), emoji });
      await createGroupTx.writeContractAsync({
        address: CONTRACTS.groupMultisig,
        abi: GROUP_MULTISIG_ABI,
        functionName: "createGroup",
        // Contrato deployado exige >= 2 miembros; se pasa el address dos veces
        // como workaround hasta que se redespliege con el fix de >= 1 miembro.
        args: [[address!, address!], BigInt(1), newGroupName.trim()],
        chainId: monadTestnet.id,
      });
    } catch {
      setPendingGroup(null);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinError("");
    const id = parseInt(joinCode.trim(), 10);
    if (isNaN(id)) { setJoinError("Ingresá un ID numérico válido."); return; }
    if (groups.some(g => g.id === id)) { setJoinError("Ya estás en ese grupo."); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/groups/${id}`);
      if (!res.ok) { setJoinError("Grupo no encontrado on-chain."); return; }
      const data = await res.json();
      const g: LocalGroup = { id, name: data.name || `Grupo #${id}`, emoji: EMOJIS[id % EMOJIS.length] };
      addGroup(g);
      setModal(null);
      setJoinCode("");
      setSelectedGroup(g);
    } catch { setJoinError("Error al conectar con el backend."); }
  }

  if (selectedGroup) {
    return (
      <GroupDetail
        localGroup={selectedGroup}
        userAddress={address}
        isConnected={isConnected}
        contractsDeployed={contractsDeployed}
        formattedBalance={formattedBalance}
        onBack={() => setSelectedGroup(null)}
      />
    );
  }

  return (
    <>
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <button onClick={() => { setModal("create"); createGroupTx.reset(); setPendingGroup(null); }} disabled={!isConnected} className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-40" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Crear grupo
        </button>
        <button onClick={() => { setModal("join"); setJoinCode(""); setJoinError(""); }} className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border" style={{ borderColor: "rgba(116,68,166,0.5)", color: "#c084fc" }}>
          Unirse con ID →
        </button>
        {!isConnected && <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Conectá tu wallet para crear grupos.</p>}
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>
          <p className="text-lg font-light">Sin grupos aún.</p>
          <p className="text-sm mt-1">Creá uno o unite con el ID de un grupo existente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => <GroupCard key={g.id} group={g} onOpen={() => setSelectedGroup(g)} onLeave={() => removeGroup(g.id)} />)}
        </div>
      )}

      {/* ── Modal: Crear grupo ────────────────────────────────────────────────── */}
      {modal === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)" }}>
            <h2 className="font-black text-xl text-white mb-1">Crear grupo</h2>
            <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>El grupo se registra en GroupMultisig on-chain. Compartí el ID numérico para que otros se unan.</p>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <input type="text" placeholder="Nombre del grupo" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} autoFocus />
              {createGroupTx.status === "success" && createGroupTx.hash && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.1)", border: "1px solid rgba(242,139,12,0.3)" }}>
                  ✓ Grupo #{pendingGroup?.id} creado · <TxHashLink hash={createGroupTx.hash} />
                </div>
              )}
              {createGroupTx.status === "error" && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", color: "#ff9090" }}>{createGroupTx.error ?? "Error"}</div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setModal(null)} disabled={createGroupTx.status === "signing" || createGroupTx.status === "confirming"} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>Cancelar</button>
                <button type="submit" disabled={!newGroupName.trim() || createGroupTx.status === "signing" || createGroupTx.status === "confirming" || createGroupTx.status === "success"} className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
                  {createGroupTx.status === "signing"    && <><Spinner /> Firmando…</>}
                  {createGroupTx.status === "confirming" && <><Spinner /> Confirmando…</>}
                  {createGroupTx.status === "success"    && "✓ Creado"}
                  {(createGroupTx.status === "idle" || createGroupTx.status === "error") && "Crear on-chain →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Unirse ─────────────────────────────────────────────────────── */}
      {modal === "join" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)" }}>
            <h2 className="font-black text-xl text-white mb-1">Unirse a un grupo</h2>
            <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>Ingresá el ID numérico del grupo (lo ve el creador cuando lo crea).</p>
            <form onSubmit={handleJoin} className="space-y-4">
              <input type="number" placeholder="ID del grupo (ej: 1)" value={joinCode} onChange={(e) => { setJoinCode(e.target.value); setJoinError(""); }} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none font-mono" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} autoFocus />
              {joinError && <p className="text-xs" style={{ color: "#ff9090" }}>{joinError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setModal(null); setJoinCode(""); setJoinError(""); }} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>Cancelar</button>
                <button type="submit" disabled={!joinCode} className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40" style={{ backgroundColor: "#7544A6", color: "white" }}>Unirme →</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
