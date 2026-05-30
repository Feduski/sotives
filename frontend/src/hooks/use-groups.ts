"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { BACKEND_URL } from "@/lib/wagmi";

// ── Types ──────────────────────────────────────────────────────────────────────

export type LocalGroup = {
  id: number;       // on-chain groupId
  name: string;
  emoji: string;
};

export type OnChainGroup = {
  group_id: number;
  name: string;
  members: string[];
  required_signatures: number;
};

export type GroupCommitment = {
  id: number;
  creator: string;
  deadline: number;
  total_funds_mon: number;
  status: "Active" | "EvidenceSubmitted" | "Fulfilled" | "Failed";
  goal: string;
  criteria: string;
  evidence_type: string;
  group_id: number;
  join_price_mon: number;
};

// ── localStorage helpers ───────────────────────────────────────────────────────

const LS_KEY = "sotives_groups";

function loadGroups(): LocalGroup[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveGroups(groups: LocalGroup[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(groups));
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useGroups() {
  const [groups, setGroupsState] = useState<LocalGroup[]>([]);

  // Sync from localStorage on mount (client only)
  useEffect(() => {
    setGroupsState(loadGroups());
  }, []);

  const addGroup = useCallback((group: LocalGroup) => {
    setGroupsState((prev) => {
      if (prev.some((g) => g.id === group.id)) return prev;
      const next = [...prev, group];
      saveGroups(next);
      return next;
    });
  }, []);

  const removeGroup = useCallback((groupId: number) => {
    setGroupsState((prev) => {
      const next = prev.filter((g) => g.id !== groupId);
      saveGroups(next);
      return next;
    });
  }, []);

  return { groups, addGroup, removeGroup };
}

// ── Fetch on-chain group data ──────────────────────────────────────────────────

export function useGroupData(groupId: number | null) {
  return useQuery<OnChainGroup>({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/groups/${groupId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: groupId !== null,
    staleTime: 15_000,
    retry: 1,
  });
}

// ── Fetch group commitments ────────────────────────────────────────────────────

export function useGroupCommitments(groupId: number | null) {
  return useQuery<{ group_id: number; commitments: GroupCommitment[] }>({
    queryKey: ["group-commitments", groupId],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/commitments/group/${groupId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: groupId !== null,
    staleTime: 15_000,
    retry: 1,
    refetchInterval: 20_000,
  });
}

// ── Fetch AI result for a commitment ──────────────────────────────────────────

export function useAiResult(commitmentId: number | null, enabled: boolean) {
  return useQuery<{
    fulfilled: number;
    confidence: number;
    reasoning: string;
    evidence_summary: string;
    tx_hash: string | null;
    ts: string;
  }>({
    queryKey: ["ai-result", commitmentId],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/commitments/${commitmentId}/ai-result`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: enabled && commitmentId !== null,
    staleTime: 60_000,
    retry: false,
  });
}
