"use client";

import { useState, useCallback } from "react";

export type TxStatus = "idle" | "pending" | "success" | "error";

export interface MockTx {
  status: TxStatus;
  txHash: string | null;
  execute: (delayMs?: number) => Promise<void>;
  reset: () => void;
}

export function useMockTransaction(): MockTx {
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);

  const execute = useCallback(async (delayMs = 2200) => {
    setStatus("pending");
    await new Promise((res) => setTimeout(res, delayMs));
    const hash =
      "0x" +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");
    setTxHash(hash);
    setStatus("success");
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
  }, []);

  return { status, txHash, execute, reset };
}
