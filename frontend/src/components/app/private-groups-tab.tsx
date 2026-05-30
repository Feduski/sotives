"use client";

import { useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { monadTestnet } from "@/lib/wagmi";
import { useMockTransaction } from "@/hooks/use-mock-transaction";

type Group = {
  id: string;
  name: string;
  emoji: string;
  members: string[];
  activeCommitments: number;
  completionRate: number;
  code: string;
};

type Commitment = {
  id: string;
  groupId: string;
  user: string;
  goal: string;
  stake: number;
  deadline: string;
  status: "en curso" | "cumplido" | "fallido";
  daysLeft: number;
};

const MOCK_GROUPS: Group[] = [
  {
    id: "1",
    name: "Runners Matutinos",
    emoji: "🏃",
    members: ["@fede", "@lucas", "@sofi", "@martin"],
    activeCommitments: 3,
    completionRate: 82,
    code: "RUN24",
  },
  {
    id: "2",
    name: "Startup Launch Squad",
    emoji: "🚀",
    members: ["@fede", "@ana", "@diego"],
    activeCommitments: 5,
    completionRate: 91,
    code: "SLS99",
  },
];

const MOCK_COMMITMENTS: Commitment[] = [
  { id: "c1", groupId: "1", user: "@lucas", goal: "Correr 5km tres veces por semana durante 4 semanas", stake: 50, deadline: "14 jun", status: "en curso", daysLeft: 12 },
  { id: "c2", groupId: "1", user: "@sofi", goal: "No faltar al gym por 30 días consecutivos", stake: 80, deadline: "28 jun", status: "en curso", daysLeft: 26 },
  { id: "c3", groupId: "1", user: "@martin", goal: "Meditar 10 minutos diarios por 21 días", stake: 30, deadline: "10 jun", status: "cumplido", daysLeft: 0 },
  { id: "c4", groupId: "2", user: "@ana", goal: "Lanzar landing page del producto antes del 15 de junio", stake: 200, deadline: "15 jun", status: "cumplido", daysLeft: 0 },
  { id: "c5", groupId: "2", user: "@diego", goal: "Conseguir 100 usuarios en lista de espera", stake: 300, deadline: "30 jun", status: "en curso", daysLeft: 28 },
  { id: "c6", groupId: "2", user: "@fede", goal: "Completar backend MVP con autenticación y smart contracts", stake: 400, deadline: "30 jun", status: "en curso", daysLeft: 28 },
];

type ModalType = "create" | "join" | "commitment" | null;

export default function PrivateGroupsTab({ username }: { username: string }) {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [joinCode, setJoinCode] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newCommitment, setNewCommitment] = useState({ goal: "", stake: "", deadline: "" });
  const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);
  const [commitments, setCommitments] = useState<Commitment[]>(MOCK_COMMITMENTS);
  const [fundTarget, setFundTarget] = useState<Commitment | null>(null);
  const [fundAmount, setFundAmount] = useState("");

  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
    chainId: monadTestnet.id,
    query: { enabled: isConnected },
  });
  const stakeTx = useMockTransaction();
  const fundTx = useMockTransaction();

  const formattedBalance = balance
    ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(2)} MON`
    : null;

  function closeModal() {
    setModal(null);
    setJoinCode("");
    setNewGroupName("");
    setNewCommitment({ goal: "", stake: "", deadline: "" });
    stakeTx.reset();
  }

  function closeFundModal() {
    setFundTarget(null);
    setFundAmount("");
    fundTx.reset();
  }

  function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const emojis = ["💪", "📚", "🎯", "⚡", "🌟"];
    const newGroup: Group = {
      id: String(groups.length + 1),
      name: newGroupName.trim(),
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      members: [username],
      activeCommitments: 0,
      completionRate: 0,
      code: Math.random().toString(36).slice(2, 6).toUpperCase(),
    };
    setGroups([...groups, newGroup]);
    closeModal();
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    closeModal();
  }

  async function handleAddCommitment(e: React.FormEvent) {
    e.preventDefault();
    if (!newCommitment.goal.trim() || !selectedGroup) return;
    const stakeAmount = Number(newCommitment.stake) || 0;
    if (isConnected && stakeAmount > 0) {
      await stakeTx.execute();
    }
    const c: Commitment = {
      id: `c${commitments.length + 1}`,
      groupId: selectedGroup.id,
      user: username,
      goal: newCommitment.goal.trim(),
      stake: stakeAmount,
      deadline: newCommitment.deadline || "—",
      status: "en curso",
      daysLeft: 30,
    };
    setCommitments([...commitments, c]);
    closeModal();
  }

  async function handleFund(e: React.FormEvent) {
    e.preventDefault();
    if (!fundTarget || !fundAmount) return;
    await fundTx.execute();
    closeFundModal();
  }

  const groupCommitments = selectedGroup
    ? commitments.filter((c) => c.groupId === selectedGroup.id)
    : [];

  return (
    <>
      {/* List view */}
      {!selectedGroup && (
        <div>
          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setModal("create")}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
              style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Crear grupo
            </button>
            <button
              onClick={() => setModal("join")}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-colors"
              style={{ borderColor: "rgba(116,68,166,0.5)", color: "#c084fc" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6m0-6l6 6" />
              </svg>
              Unirse con código
            </button>
          </div>

          {/* Groups */}
          <div className="space-y-3">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.01]"
                style={{
                  backgroundColor: "rgba(88,2,89,0.2)",
                  border: "1px solid rgba(116,68,166,0.3)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: "rgba(116,68,166,0.2)" }}
                    >
                      {group.emoji}
                    </div>
                    <div>
                      <p className="font-bold text-base text-white">{group.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {group.members.length} miembros · {group.activeCommitments} compromisos activos
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-lg font-black" style={{ color: "#F28B0C" }}>
                      {group.completionRate}%
                    </div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      cumplimiento
                    </div>
                  </div>
                </div>

                {/* Member avatars */}
                <div className="flex items-center gap-1 mt-3">
                  {group.members.slice(0, 5).map((m, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white border"
                      style={{
                        background: "linear-gradient(135deg,#580259,#7544A6)",
                        borderColor: "#0d0010",
                        marginLeft: i > 0 ? "-6px" : "0",
                      }}
                    >
                      {m[1].toUpperCase()}
                    </div>
                  ))}
                  <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {group.members.slice(0, 3).join(", ")}
                    {group.members.length > 3 && ` +${group.members.length - 3}`}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${group.completionRate}%`, backgroundColor: "#F28B0C" }}
                  />
                </div>
              </button>
            ))}
          </div>

          {groups.length === 0 && (
            <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>
              <p className="text-lg font-light">Todavía no pertenecés a ningún grupo.</p>
              <p className="text-sm mt-1">Creá uno o unite con un código.</p>
            </div>
          )}
        </div>
      )}

      {/* Group detail view */}
      {selectedGroup && (
        <div>
          {/* Back + header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setSelectedGroup(null)}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Grupos
            </button>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedGroup.emoji}</span>
              <span className="font-bold text-white">{selectedGroup.name}</span>
            </div>
          </div>

          {/* Group meta */}
          <div
            className="rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-4"
            style={{ backgroundColor: "rgba(88,2,89,0.15)", border: "1px solid rgba(116,68,166,0.2)" }}
          >
            <div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Miembros</p>
              <p className="font-bold text-sm text-white">{selectedGroup.members.join(", ")}</p>
            </div>
            <div className="h-8 w-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
            <div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Código del grupo</p>
              <p className="font-black text-sm tracking-widest" style={{ color: "#F28B0C" }}>
                {selectedGroup.code}
              </p>
            </div>
            <div className="h-8 w-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
            <div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Cumplimiento</p>
              <p className="font-black text-sm" style={{ color: "#F28B0C" }}>
                {selectedGroup.completionRate}%
              </p>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setModal("commitment")}
                className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl"
                style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Nuevo compromiso
              </button>
            </div>
          </div>

          {/* Commitments list */}
          <div className="space-y-3">
            {groupCommitments.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: "rgba(88,2,89,0.2)",
                  border: `1px solid ${c.status === "cumplido" ? "rgba(242,139,12,0.3)" : "rgba(116,68,166,0.25)"}`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0 mt-0.5"
                      style={{ background: "linear-gradient(135deg,#580259,#7544A6)" }}
                    >
                      {c.user[1].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold" style={{ color: "#c084fc" }}>
                          {c.user}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor:
                              c.status === "cumplido"
                                ? "rgba(242,139,12,0.15)"
                                : c.status === "fallido"
                                ? "rgba(255,60,60,0.15)"
                                : "rgba(116,68,166,0.2)",
                            color:
                              c.status === "cumplido"
                                ? "#F28B0C"
                                : c.status === "fallido"
                                ? "#ff6060"
                                : "#c084fc",
                          }}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-sm text-white leading-snug">{c.goal}</p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-base" style={{ color: "#F28B0C" }}>
                      ${c.stake}
                    </div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {c.status === "cumplido" ? "recuperado" : c.daysLeft > 0 ? `${c.daysLeft}d` : "vence hoy"}
                    </div>
                  </div>
                </div>

                {c.status !== "cumplido" && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(5, 100 - (c.daysLeft / 30) * 100)}%`,
                          backgroundColor: "#7544A6",
                        }}
                      />
                    </div>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      hasta {c.deadline}
                    </span>
                  </div>
                )}

                {c.status === "cumplido" && (
                  <div className="mt-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="#F28B0C" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium" style={{ color: "#F28B0C" }}>
                      Cumplido · verificado por IA
                    </span>
                  </div>
                )}

                {c.status !== "cumplido" && c.user !== username && (
                  <button
                    onClick={() => setFundTarget(c)}
                    className="mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ backgroundColor: "rgba(116,68,166,0.15)", color: "#c084fc", border: "1px solid rgba(116,68,166,0.3)" }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Fondear con MON
                  </button>
                )}
              </div>
            ))}

            {groupCommitments.length === 0 && (
              <div className="text-center py-12" style={{ color: "rgba(255,255,255,0.3)" }}>
                <p className="text-base font-light">Sin compromisos en este grupo.</p>
                <p className="text-sm mt-1">Sé el primero en crear uno.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)" }}
          >
            {/* Create group */}
            {modal === "create" && (
              <>
                <h2 className="font-black text-xl text-white mb-1">Crear grupo</h2>
                <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Los miembros se unen con un código único.
                </p>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nombre del grupo"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                    style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }}
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40"
                      style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
                      disabled={!newGroupName.trim()}
                    >
                      Crear →
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Join group */}
            {modal === "join" && (
              <>
                <h2 className="font-black text-xl text-white mb-1">Unirse a un grupo</h2>
                <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Ingresá el código que te compartieron.
                </p>
                <form onSubmit={handleJoin} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Código del grupo (ej: RUN24)"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none font-mono tracking-widest uppercase"
                    style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }}
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40"
                      style={{ backgroundColor: "#7544A6", color: "white" }}
                      disabled={joinCode.length < 4}
                    >
                      Unirme →
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* New commitment */}
            {modal === "commitment" && (
              <>
                <h2 className="font-black text-xl text-white mb-1">Nuevo compromiso</h2>
                <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                  El grupo verá tu compromiso y la IA validará la evidencia.
                </p>

                {/* Wallet status */}
                {isConnected ? (
                  <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs"
                    style={{ backgroundColor: "rgba(116,68,166,0.12)", border: "1px solid rgba(116,68,166,0.3)" }}
                  >
                    <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    <span className="font-mono text-white">{address?.slice(0,6)}…{address?.slice(-4)}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>·</span>
                    <span className="font-bold" style={{ color: "#F28B0C" }}>{formattedBalance}</span>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs"
                    style={{ backgroundColor: "rgba(242,139,12,0.08)", border: "1px solid rgba(242,139,12,0.2)", color: "rgba(255,255,255,0.5)" }}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#F28B0C" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    Conectá tu wallet para fondear el stake en MON.
                  </div>
                )}

                <form onSubmit={handleAddCommitment} className="space-y-3">
                  <textarea
                    placeholder="Describí tu objetivo con claridad (qué, cuánto, cuándo)"
                    value={newCommitment.goal}
                    onChange={(e) => setNewCommitment({ ...newCommitment, goal: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
                    style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Stake (MON)
                      </label>
                      <input
                        type="number"
                        placeholder="50"
                        min={1}
                        value={newCommitment.stake}
                        onChange={(e) => setNewCommitment({ ...newCommitment, stake: e.target.value })}
                        disabled={!isConnected}
                        className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none disabled:opacity-40"
                        style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Fecha límite
                      </label>
                      <input
                        type="date"
                        value={newCommitment.deadline}
                        onChange={(e) => setNewCommitment({ ...newCommitment, deadline: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none"
                        style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)", colorScheme: "dark" }}
                      />
                    </div>
                  </div>

                  {/* Tx status */}
                  {stakeTx.status === "success" && stakeTx.txHash && (
                    <div
                      className="rounded-xl px-3 py-2 text-xs font-mono"
                      style={{ backgroundColor: "rgba(242,139,12,0.1)", border: "1px solid rgba(242,139,12,0.3)", color: "#F28B0C" }}
                    >
                      ✓ Stake enviado · {stakeTx.txHash.slice(0,14)}…
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={stakeTx.status === "pending"}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
                      style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!newCommitment.goal.trim() || stakeTx.status === "pending"}
                      className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2"
                      style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
                    >
                      {stakeTx.status === "pending" ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Enviando…
                        </>
                      ) : isConnected && newCommitment.stake ? (
                        `Crear + Stake ${newCommitment.stake} MON →`
                      ) : (
                        "Crear compromiso →"
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Fund modal */}
      {fundTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && closeFundModal()}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)" }}
          >
            <h2 className="font-black text-xl text-white mb-1">Fondear compromiso</h2>
            <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              {fundTarget.user} · {fundTarget.goal.slice(0, 55)}…
            </p>
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
              Agregás MON al escrow del compromiso. Si cumple, recupera todo. Si falla, va al fondo del grupo.
            </p>

            {isConnected ? (
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs"
                style={{ backgroundColor: "rgba(116,68,166,0.12)", border: "1px solid rgba(116,68,166,0.3)" }}
              >
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="font-mono text-white">{address?.slice(0,6)}…{address?.slice(-4)}</span>
                <span className="font-bold ml-auto" style={{ color: "#F28B0C" }}>{formattedBalance}</span>
              </div>
            ) : (
              <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ backgroundColor: "rgba(242,139,12,0.08)", border: "1px solid rgba(242,139,12,0.2)", color: "rgba(255,255,255,0.5)" }}>
                Conectá tu wallet para fondear.
              </div>
            )}

            <form onSubmit={handleFund} className="space-y-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Monto (MON)
                </label>
                <input
                  type="number"
                  placeholder="10"
                  min={1}
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  disabled={!isConnected}
                  className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none disabled:opacity-40"
                  style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(116,68,166,0.4)" }}
                  autoFocus
                />
              </div>

              {fundTx.status === "success" && (
                <div className="rounded-xl px-3 py-2 text-xs font-mono" style={{ backgroundColor: "rgba(242,139,12,0.1)", border: "1px solid rgba(242,139,12,0.3)", color: "#F28B0C" }}>
                  ✓ Fondeo confirmado · {fundTx.txHash?.slice(0,14)}…
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={closeFundModal} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isConnected || !fundAmount || fundTx.status === "pending"}
                  className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#7544A6", color: "white" }}
                >
                  {fundTx.status === "pending" ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Enviando…
                    </>
                  ) : `Fondear ${fundAmount || "0"} MON →`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
