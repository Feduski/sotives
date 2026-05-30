"use client";

import { useQuery } from "@tanstack/react-query";
import { BACKEND_URL } from "@/lib/wagmi";

export type PublicCommitment = {
  id: number;
  creator: string;
  deadline: number;
  total_funds_mon: number;
  status: "Active" | "EvidenceSubmitted" | "Fulfilled" | "Failed";
  goal: string;
  criteria: string;
  evidence_type: string;
  group_id: number;
};

type Response = {
  commitments: PublicCommitment[];
  total: number;
};

export function usePublicCommitments() {
  return useQuery<Response>({
    queryKey: ["public-commitments"],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/commitments/public?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
    retry: 1,
  });
}
