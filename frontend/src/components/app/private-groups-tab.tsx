"use client";

import { useState } from "react";
import { useConnection } from "wagmi";
import { BACKEND_URL } from "@/lib/wagmi";
import { EVIDENCE_TYPES } from "@/lib/contracts";
import type { EvidenceType } from "@/lib/contracts";

// ── Types ──────────────────────────────────────────────────────────────────────

type MemberInfo = {
  handle: string;
  avatar: string;
  balance: number; // MON
};

type Group = {
  id: string;
  name: string;
  emoji: string;
  memberHandles: string[];
  completionRate: number;
  code: string;
};

type Contributor = { handle: string; amount: number };

type Commitment = {
  id: string;
  groupId: string;
  creator: string;
  goal: string;
  totalAmount: number;
  perMember: number;
  deadline: string;
  status: "en curso" | "cumplido" | "fallido";
  daysLeft: number;
  contributors: Contributor[];
};

// ── Mock data ──────────────────────────────────────────────────────────────────

const INITIAL_MEMBER_INFO: Record<string, MemberInfo> = {
  "@fede":  { handle: "@fede",  avatar: "F", balance: 12.47 },
  "@santi": { handle: "@santi", avatar: "S", balance: 9.18  },
  "@jere":  { handle: "@jere",  avatar: "J", balance: 7.04  },
  "@lucas": { handle: "@lucas", avatar: "L", balance: 8.33  },
  "@sofi":  { handle: "@sofi",  avatar: "S", balance: 15.61 },
  "@ana":   { handle: "@ana",   avatar: "A", balance: 11.85 },
  "@diego": { handle: "@diego", avatar: "D", balance: 6.74  },
};

const INITIAL_GROUPS: Group[] = [
  {
    id: "1", name: "Hackaton Monad", emoji: "⚡",
    memberHandles: ["@fede", "@santi", "@jere"],
    completionRate: 76, code: "HACK24",
  },
  {
    id: "2", name: "Startup Launch Squad", emoji: "🚀",
    memberHandles: ["@fede", "@ana", "@diego"],
    completionRate: 91, code: "SLS99",
  },
];

// Balances ya reflejan los aportes históricos deducidos.
// Compromisos en curso: dinero bloqueado. Cumplidos: devuelto.
const INITIAL_COMMITMENTS: Commitment[] = [
  {
    id: "c1", groupId: "1", creator: "@fede",
    goal: "Integrar el login de wallet y mostrar el estado conectado",
    totalAmount: 45, perMember: 15,
    deadline: "12 jun 18:00", status: "en curso", daysLeft: 10,
    contributors: [
      { handle: "@fede",  amount: 15 },
      { handle: "@santi", amount: 15 },
      { handle: "@jere",  amount: 15 },
    ],
  },
  {
    id: "c2", groupId: "1", creator: "@santi",
    goal: "Dejar listo el endpoint de compromisos y validacion de evidencia",
    totalAmount: 60, perMember: 20,
    deadline: "18 jun 22:00", status: "en curso", daysLeft: 16,
    contributors: [
      { handle: "@fede",  amount: 20 },
      { handle: "@santi", amount: 20 },
      { handle: "@jere",  amount: 20 },
    ],
  },
  {
    id: "c3", groupId: "1", creator: "@jere",
    goal: "Deploy de contratos y configurar direcciones en el frontend",
    totalAmount: 45, perMember: 15,
    deadline: "08 jun 20:00", status: "cumplido", daysLeft: 0,
    contributors: [
      { handle: "@fede",  amount: 15 },
      { handle: "@santi", amount: 15 },
      { handle: "@jere",  amount: 15 },
    ],
  },
  {
    id: "c4", groupId: "2", creator: "@ana",
    goal: "Lanzar landing page antes del 15 de junio",
    totalAmount: 40, perMember: 20,
    deadline: "15 jun 23:59", status: "cumplido", daysLeft: 0,
    contributors: [
      { handle: "@fede",  amount: 20 },
      { handle: "@diego", amount: 20 },
    ],
  },
  {
    id: "c5", groupId: "2", creator: "@diego",
    goal: "Conseguir 100 usuarios en lista de espera",
    totalAmount: 60, perMember: 30,
    deadline: "30 jun 18:00", status: "en curso", daysLeft: 28,
    contributors: [
      { handle: "@fede", amount: 30 },
      { handle: "@ana",  amount: 30 },
    ],
  },
  {
    id: "c6", groupId: "2", creator: "@fede",
    goal: "Completar backend MVP con auth y smart contracts",
    totalAmount: 60, perMember: 30,
    deadline: "30 jun 23:59", status: "en curso", daysLeft: 28,
    contributors: [
      { handle: "@ana",   amount: 30 },
      { handle: "@diego", amount: 30 },
    ],
  },
];

function fmtDeadline(dt: string): string {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

type ModalType = "create" | "join" | "commitment" | null;

// ── Component ──────────────────────────────────────────────────────────────────

export default function PrivateGroupsTab({ username }: { username: string }) {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [joinCode, setJoinCode] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newCommitment, setNewCommitment] = useState({
    goal: "", totalAmount: "0.0005", deadline: "", evidenceType: "URL" as EvidenceType,
  });
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [commitments, setCommitments] = useState<Commitment[]>(INITIAL_COMMITMENTS);
  const [memberInfo, setMemberInfo] = useState<Record<string, MemberInfo>>(INITIAL_MEMBER_INFO);

  const [evidenceTarget, setEvidenceTarget] = useState<Commitment | null>(null);
  const [evidenceForm, setEvidenceForm] = useState({ type: "URL" as EvidenceType, value: "" });
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    fulfilled: boolean; confidence: number; reasoning: string;
  } | null>(null);

  const { isConnected } = useConnection();

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const groupMembers = (g: Group) => g.memberHandles.map(h => memberInfo[h]).filter(Boolean);
  const otherMembers = (g: Group) => groupMembers(g).filter(m => m.handle !== username);

  function closeCommitmentModal() {
    setModal(null);
    setNewCommitment({ goal: "", totalAmount: "0.0005", deadline: "", evidenceType: "URL" });
  }

  function closeEvidenceModal() {
    setEvidenceTarget(null);
    setEvidenceForm({ type: "URL", value: "" });
    setValidating(false);
    setValidationResult(null);
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const emojis = ["💪", "📚", "🎯", "⚡", "🌟"];
    setGroups([...groups, {
      id: String(groups.length + 1),
      name: newGroupName.trim(),
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      memberHandles: [username],
      completionRate: 0,
      code: Math.random().toString(36).slice(2, 6).toUpperCase(),
    }]);
    setModal(null);
    setNewGroupName("");
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setModal(null);
    setJoinCode("");
  }

  function handleAddCommitment(e: React.FormEvent) {
    e.preventDefault();
    if (!newCommitment.goal.trim() || !selectedGroup) return;

    const total = Number(newCommitment.totalAmount) || 0;
    const others = otherMembers(selectedGroup);
    if (others.length === 0) return;
    const perMember = total > 0 ? total / others.length : 0;

    // Deduct from other members' mock balances
    if (perMember > 0) {
      setMemberInfo(prev => {
        const next = { ...prev };
        others.forEach(m => {
          next[m.handle] = { ...m, balance: Math.max(0, m.balance - perMember) };
        });
        return next;
      });
    }

    setCommitments(prev => [...prev, {
      id: `c${prev.length + 1}`,
      groupId: selectedGroup.id,
      creator: username,
      goal: newCommitment.goal.trim(),
      totalAmount: total,
      perMember,
      deadline: fmtDeadline(newCommitment.deadline),
      status: "en curso",
      daysLeft: 30,
      contributors: others.map(m => ({ handle: m.handle, amount: perMember })),
    }]);

    closeCommitmentModal();
  }

  async function handleSubmitEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!evidenceTarget || !evidenceForm.value.trim()) return;

    setValidating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/commitments/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commitment_id: 0,
          evidence_type: evidenceForm.type,
          evidence_value: evidenceForm.value.trim(),
          auto_resolve: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setValidationResult({ fulfilled: data.fulfilled, confidence: data.confidence, reasoning: data.reasoning });
      } else {
        setValidationResult({ fulfilled: false, confidence: 0, reasoning: "Error en el servidor." });
      }
    } catch {
      // Backend no disponible: simulación demo
      setValidationResult({
        fulfilled: true,
        confidence: 0.87,
        reasoning: "La evidencia presentada es consistente con el cumplimiento del objetivo. Se validó el progreso descrito y se consideró suficiente según los criterios definidos.",
      });
    } finally {
      setValidating(false);
    }
  }

  const groupCommitments = selectedGroup
    ? commitments.filter(c => c.groupId === selectedGroup.id)
    : [];

  const totalAmount = Number(newCommitment.totalAmount) || 0;
  const others = selectedGroup ? otherMembers(selectedGroup) : [];
  const perMemberPreview = others.length > 0 && totalAmount > 0 ? totalAmount / others.length : 0;
  const canAfford = others.every(m => m.balance >= perMemberPreview);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── List view ─────────────────────────────────────────────────────────── */}
      {!selectedGroup && (
        <div>
          <div className="flex gap-3 mb-6">
            <button onClick={() => setModal("create")} className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Crear grupo
            </button>
            <button onClick={() => setModal("join")} className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border" style={{ borderColor: "rgba(116,68,166,0.5)", color: "#c084fc" }}>
              Unirse con código
            </button>
          </div>

          <div className="space-y-3">
            {groups.map(group => {
              const members = groupMembers(group);
              return (
                <button key={group.id} onClick={() => setSelectedGroup(group)} className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.01]" style={{ backgroundColor: "rgba(88,2,89,0.2)", border: "1px solid rgba(116,68,166,0.3)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: "rgba(116,68,166,0.2)" }}>{group.emoji}</div>
                      <div>
                        <p className="font-bold text-base text-white">{group.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{members.length} miembros · {commitments.filter(c => c.groupId === group.id && c.status === "en curso").length} activos</p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-black" style={{ color: "#F28B0C" }}>{group.completionRate}%</div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>cumplimiento</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3">
                    {members.slice(0, 5).map((m, i) => (
                      <div key={m.handle} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white border" style={{ background: "linear-gradient(135deg,#580259,#7544A6)", borderColor: "#0d0010", marginLeft: i > 0 ? "-6px" : "0" }}>{m.avatar}</div>
                    ))}
                    <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.4)" }}>{members.map(m => m.handle).slice(0, 3).join(", ")}{members.length > 3 && ` +${members.length - 3}`}</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: `${group.completionRate}%`, backgroundColor: "#F28B0C" }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Group detail ──────────────────────────────────────────────────────── */}
      {selectedGroup && (
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setSelectedGroup(null)} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
              Grupos
            </button>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedGroup.emoji}</span>
              <span className="font-bold text-white">{selectedGroup.name}</span>
            </div>
          </div>

          {/* Group info + member balances */}
          <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: "rgba(88,2,89,0.15)", border: "1px solid rgba(116,68,166,0.2)" }}>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div><p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Código</p><p className="font-black text-sm tracking-widest" style={{ color: "#F28B0C" }}>{selectedGroup.code}</p></div>
              <div className="h-8 w-px hidden sm:block" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
              <div><p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Cumplimiento</p><p className="font-black text-sm" style={{ color: "#F28B0C" }}>{selectedGroup.completionRate}%</p></div>
              <div className="ml-auto">
                <button onClick={() => setModal("commitment")} className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Nuevo compromiso
                </button>
              </div>
            </div>

            {/* Member balances */}
            <div className="border-t pt-3" style={{ borderColor: "rgba(116,68,166,0.15)" }}>
              <p className="text-xs mb-2.5" style={{ color: "rgba(255,255,255,0.35)" }}>Balances del grupo</p>
              <div className="flex flex-wrap gap-2">
                {groupMembers(selectedGroup).map(m => (
                  <div key={m.handle} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: "rgba(116,68,166,0.12)", border: "1px solid rgba(116,68,166,0.25)" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: "linear-gradient(135deg,#580259,#7544A6)" }}>{m.avatar}</div>
                    <span style={{ color: "rgba(255,255,255,0.7)" }}>{m.handle}</span>
                    <span className="font-bold" style={{ color: m.handle === username ? "#c084fc" : "#F28B0C" }}>{m.balance.toFixed(2)} MON</span>
                    {m.handle === username && <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>(vos)</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Commitment cards */}
          <div className="space-y-3">
            {groupCommitments.map(c => {
              const isOwn = c.creator === username;
              return (
                <div key={c.id} className="rounded-2xl p-5" style={{ backgroundColor: "rgba(88,2,89,0.2)", border: `1px solid ${c.status === "cumplido" ? "rgba(242,139,12,0.3)" : "rgba(116,68,166,0.25)"}` }}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0" style={{ background: "linear-gradient(135deg,#580259,#7544A6)" }}>
                        {memberInfo[c.creator]?.avatar ?? c.creator[1].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: "#c084fc" }}>{c.creator}</span>
                          {isOwn && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(116,68,166,0.2)", color: "#c084fc" }}>vos</span>}
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                            backgroundColor: c.status === "cumplido" ? "rgba(242,139,12,0.15)" : "rgba(116,68,166,0.2)",
                            color: c.status === "cumplido" ? "#F28B0C" : "#c084fc"
                          }}>{c.status}</span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>hasta {c.deadline}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-lg" style={{ color: "#F28B0C" }}>{c.totalAmount}</div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>MON total</div>
                    </div>
                  </div>

                  {/* Goal */}
                  <p className="text-sm text-white leading-snug mb-3">{c.goal}</p>

                  {/* Contributors */}
                  <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(0,0,0,0.2)", border: "1px solid rgba(116,68,166,0.15)" }}>
                    <p className="text-xs mb-2 font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {c.status === "cumplido" ? "Aporte devuelto · " : "Aportado por el grupo · "}
                      <span style={{ color: c.status === "cumplido" ? "#F28B0C" : "rgba(255,255,255,0.55)" }}>{c.totalAmount} MON</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {c.contributors.map(ct => (
                        <div key={ct.handle} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(116,68,166,0.1)", border: "1px solid rgba(116,68,166,0.2)" }}>
                          <div className="w-4 h-4 rounded-full flex items-center justify-center font-black text-white flex-shrink-0 text-xs" style={{ background: "linear-gradient(135deg,#580259,#7544A6)" }}>
                            {memberInfo[ct.handle]?.avatar ?? ct.handle[1].toUpperCase()}
                          </div>
                          <span style={{ color: "rgba(255,255,255,0.65)" }}>{ct.handle}</span>
                          <span className="font-bold" style={{ color: c.status === "cumplido" ? "rgba(255,255,255,0.4)" : "#F28B0C" }}>
                            {ct.amount % 1 === 0 ? ct.amount : ct.amount.toFixed(4)} MON
                          </span>
                          {c.status === "cumplido" && <span style={{ color: "#F28B0C" }}>↩</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {c.status === "en curso" && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.max(5, 100 - (c.daysLeft / 30) * 100)}%`, backgroundColor: "#7544A6" }} />
                      </div>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{c.daysLeft}d restantes</span>
                    </div>
                  )}

                  {c.status === "cumplido" && (
                    <div className="mt-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="#F28B0C" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-xs font-medium" style={{ color: "#F28B0C" }}>Cumplido · aporte devuelto al grupo</span>
                    </div>
                  )}

                  {/* Presentar evidencia — solo el creador */}
                  {c.status === "en curso" && isOwn && (
                    <div className="mt-3">
                      <button onClick={() => setEvidenceTarget(c)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(242,139,12,0.1)", color: "#F28B0C", border: "1px solid rgba(242,139,12,0.3)" }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                        Presentar evidencia
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {groupCommitments.length === 0 && (
              <div className="text-center py-12" style={{ color: "rgba(255,255,255,0.3)" }}>
                <p className="text-base font-light">Sin compromisos en este grupo.</p>
                <p className="text-sm mt-1">Sé el primero en crear uno.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Create / Join group ────────────────────────────────────────── */}
      {modal && modal !== "commitment" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)" }}>
            {modal === "create" && (
              <>
                <h2 className="font-black text-xl text-white mb-1">Crear grupo</h2>
                <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>Los miembros se unen con un código único.</p>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <input type="text" placeholder="Nombre del grupo" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} autoFocus />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>Cancelar</button>
                    <button type="submit" disabled={!newGroupName.trim()} className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>Crear →</button>
                  </div>
                </form>
              </>
            )}
            {modal === "join" && (
              <>
                <h2 className="font-black text-xl text-white mb-1">Unirse a un grupo</h2>
                <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>Ingresá el código que te compartieron.</p>
                <form onSubmit={handleJoin} className="space-y-4">
                  <input type="text" placeholder="Código del grupo (ej: RUN24)" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none font-mono tracking-widest uppercase" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }} autoFocus />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setModal(null); setJoinCode(""); }} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>Cancelar</button>
                    <button type="submit" disabled={joinCode.length < 4} className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40" style={{ backgroundColor: "#7544A6", color: "white" }}>Unirme →</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Nuevo compromiso ────────────────────────────────────────────── */}
      {modal === "commitment" && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && closeCommitmentModal()}>
          <div className="w-full max-w-md rounded-2xl p-6 overflow-y-auto" style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)", maxHeight: "90vh" }}>
            <h2 className="font-black text-xl text-white mb-1">Nuevo compromiso</h2>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>El grupo financia tu compromiso. Si fallás, el aporte se pierde.</p>

            {/* Mecánica */}
            <div className="rounded-xl px-3 py-2.5 mb-4 text-xs" style={{ backgroundColor: "rgba(116,68,166,0.08)", border: "1px solid rgba(116,68,166,0.25)" }}>
              <p className="font-semibold text-white mb-1">¿Cómo funciona?</p>
              <p style={{ color: "rgba(255,255,255,0.5)" }}>Vos te comprometés con un objetivo. Los demás miembros aportan igual en MON. Si cumplís, recuperan el aporte. Si fallás, los MON se pierden.</p>
            </div>

            <form onSubmit={handleAddCommitment} className="space-y-3">
              <textarea
                placeholder="Describí tu objetivo (qué, cuánto, cuándo)"
                value={newCommitment.goal}
                onChange={(e) => setNewCommitment({ ...newCommitment, goal: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Monto total (MON)</label>
                  <input
                    type="number"
                    placeholder="0.0005"
                    min={0.0001}
                    step="any"
                    value={newCommitment.totalAmount}
                    onChange={(e) => setNewCommitment({ ...newCommitment, totalAmount: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                    style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Fecha y hora límite</label>
                  <input
                    type="datetime-local"
                    value={newCommitment.deadline}
                    onChange={(e) => setNewCommitment({ ...newCommitment, deadline: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                    style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Tipo de evidencia</label>
                <select
                  value={newCommitment.evidenceType}
                  onChange={(e) => setNewCommitment({ ...newCommitment, evidenceType: e.target.value as EvidenceType })}
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                  style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }}
                >
                  {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Desglose de aportes */}
              {totalAmount > 0 && others.length > 0 && (
                <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(0,0,0,0.25)", border: `1px solid ${canAfford ? "rgba(116,68,166,0.3)" : "rgba(255,60,60,0.3)"}` }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Desglose · {others.length} {others.length === 1 ? "miembro aporta" : "miembros aportan"}
                  </p>
                  <div className="space-y-1.5">
                    {others.map(m => {
                      const cant = m.balance < perMemberPreview;
                      return (
                        <div key={m.handle} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center font-black text-white text-xs" style={{ background: "linear-gradient(135deg,#580259,#7544A6)" }}>{m.avatar}</div>
                            <span style={{ color: "rgba(255,255,255,0.7)" }}>{m.handle}</span>
                            <span style={{ color: "rgba(255,255,255,0.3)" }}>({m.balance.toFixed(2)} MON)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold" style={{ color: cant ? "#ff7070" : "#F28B0C" }}>
                              {perMemberPreview % 1 === 0 ? perMemberPreview : perMemberPreview.toFixed(4)} MON
                            </span>
                            {cant && <span style={{ color: "#ff7070" }}>✗</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!canAfford && (
                    <p className="text-xs mt-2" style={{ color: "#ff9090" }}>Algún miembro no tiene saldo suficiente.</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeCommitmentModal} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newCommitment.goal.trim() || totalAmount <= 0 || !canAfford}
                  className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
                >
                  {totalAmount > 0 && canAfford
                    ? `Comprometer · grupo aporta ${perMemberPreview % 1 === 0 ? perMemberPreview : perMemberPreview.toFixed(4)} MON c/u →`
                    : "Comprometer →"
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Presentar evidencia ────────────────────────────────────────── */}
      {evidenceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && closeEvidenceModal()}>
          <div className="w-full max-w-md rounded-2xl p-6 overflow-y-auto" style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)", maxHeight: "90vh" }}>
            <h2 className="font-black text-xl text-white mb-1">Presentar evidencia</h2>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>{evidenceTarget.goal.slice(0, 70)}{evidenceTarget.goal.length > 70 ? "…" : ""}</p>

            {validationResult ? (
              <div className="space-y-4">
                <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: validationResult.fulfilled ? "rgba(242,139,12,0.1)" : "rgba(255,60,60,0.08)", border: `1px solid ${validationResult.fulfilled ? "rgba(242,139,12,0.3)" : "rgba(255,60,60,0.2)"}` }}>
                  <p className="font-black text-2xl mb-1" style={{ color: validationResult.fulfilled ? "#F28B0C" : "#ff7070" }}>
                    {validationResult.fulfilled ? "✓ Cumplido" : "✗ No cumplido"}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Confianza: {Math.round(validationResult.confidence * 100)}%</p>
                  <p className="text-xs mt-3 leading-relaxed text-left" style={{ color: "rgba(255,255,255,0.6)" }}>{validationResult.reasoning}</p>
                </div>
                {validationResult.fulfilled && (
                  <div className="rounded-xl px-3 py-2 text-xs text-center" style={{ backgroundColor: "rgba(116,68,166,0.1)", border: "1px solid rgba(116,68,166,0.3)", color: "#c084fc" }}>
                    El aporte del grupo ({evidenceTarget.totalAmount} MON) será devuelto a los contribuyentes.
                  </div>
                )}
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
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {evidenceForm.type === "URL" || evidenceForm.type === "GITHUB" ? "URL de la evidencia" : "Descripción de la evidencia"}
                  </label>
                  <textarea
                    placeholder={evidenceForm.type === "URL" ? "https://..." : evidenceForm.type === "GITHUB" ? "https://github.com/..." : "Describí en detalle cómo cumpliste el objetivo..."}
                    value={evidenceForm.value}
                    onChange={(e) => setEvidenceForm({ ...evidenceForm, value: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
                    style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }}
                  />
                </div>

                {validating && (
                  <div className="rounded-xl px-3 py-2 text-xs flex items-center gap-2" style={{ backgroundColor: "rgba(242,139,12,0.08)", border: "1px solid rgba(242,139,12,0.2)", color: "rgba(255,255,255,0.5)" }}>
                    <Spinner /> Validando con IA…
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeEvidenceModal} disabled={validating} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>Cancelar</button>
                  <button type="submit" disabled={!evidenceForm.value.trim() || validating} className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2" style={{ backgroundColor: "#F28B0C", color: "#40011E" }}>
                    {validating ? <><Spinner /> Validando…</> : "Enviar evidencia →"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
