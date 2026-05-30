"use client";

import { useQuery } from "@tanstack/react-query";
import { BACKEND_URL } from "@/lib/wagmi";

// ── Types que reflejan la respuesta de GET /wallet/{address} ──────────────────

export type CommitmentStatus =
  | "Active"
  | "EvidenceSubmitted"
  | "Fulfilled"
  | "Failed";

export type OnChainCommitment = {
  id: number;
  creator: string;
  deadline: number;
  total_funds_mon: number;
  status: CommitmentStatus;
  goal: string;
  criteria: string;
  evidence_type: string;
  evidence_hash: string;
  group_id: number;
};

export type WalletProfile = {
  address: string;
  balance_mon: number;
  transaction_count: number;
  reputation: number;
  commitments: OnChainCommitment[];
  stats: {
    total_commitments: number;
    active: number;
    fulfilled: number;
    failed: number;
    total_staked_mon: number;
    completion_rate: number;
  };
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useWalletProfile(address?: string) {
  return useQuery<WalletProfile>({
    queryKey: ["wallet-profile", address],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/wallet/${address}`);
      if (!res.ok) {
        const err = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(err);
      }
      return res.json() as Promise<WalletProfile>;
    },
    enabled: !!address,
    staleTime: 30_000,   // refresca cada 30s
    retry: 1,
  });
}

// ── Helpers de display ─────────────────────────────────────────────────────────

export function mapOnChainStatus(
  s: CommitmentStatus
): "en curso" | "cumplido" | "fallido" {
  if (s === "Fulfilled") return "cumplido";
  if (s === "Failed") return "fallido";
  return "en curso";
}

export function formatDeadlineTs(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

export function daysLeftFromTs(ts: number): number {
  const diff = ts * 1000 - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}
