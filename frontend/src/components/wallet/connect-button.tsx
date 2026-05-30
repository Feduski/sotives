"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { formatUnits } from "viem";
import { monadTestnet } from "@/lib/wagmi";

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ConnectButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({
    address,
    chainId: monadTestnet.id,
    query: { enabled: isConnected },
  });
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== monadTestnet.id;
  const formattedBalance = balance
    ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(2)} MON`
    : "— MON";

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Wrong network state
  if (isWrongNetwork) {
    return (
      <button
        onClick={() => switchChain({ chainId: monadTestnet.id })}
        disabled={isSwitching}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
        style={{ backgroundColor: "rgba(242,139,12,0.2)", border: "1px solid #F28B0C", color: "#F28B0C" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        {isSwitching ? "Cambiando..." : "Cambiar a Monad"}
      </button>
    );
  }

  // Connected state
  if (isConnected && address) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
          style={{
            backgroundColor: "rgba(116,68,166,0.2)",
            border: "1px solid rgba(116,68,166,0.4)",
            color: "#c084fc",
          }}
        >
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          <span className="font-mono">{truncate(address)}</span>
          <span className="font-bold" style={{ color: "#F28B0C" }}>{formattedBalance}</span>
          <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-52 rounded-xl py-1.5 z-50"
            style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.4)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
          >
            <div className="px-4 py-2">
              <p className="text-xs font-mono truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{address}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Monad Testnet</p>
            </div>
            <div className="mx-3 my-1 h-px" style={{ backgroundColor: "rgba(116,68,166,0.2)" }} />
            <Link
              href="/perfil"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-white transition-colors hover:bg-white/5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Mi perfil
            </Link>
            <button
              onClick={() => { disconnect(); setDropdownOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors hover:bg-white/5"
              style={{ color: "#ff7070" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Desconectar
            </button>
          </div>
        )}
      </div>
    );
  }

  // Disconnected state
  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        disabled={isConnecting}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors"
        style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6m18 0V5.25A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25V6" />
        </svg>
        Conectar Wallet
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: "#1a0020", border: "1px solid rgba(116,68,166,0.5)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-xl text-white">Conectar Wallet</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Network info */}
            <div
              className="flex items-center gap-2 rounded-xl p-3 mb-5 text-xs"
              style={{ backgroundColor: "rgba(116,68,166,0.12)", border: "1px solid rgba(116,68,166,0.25)" }}
            >
              <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Monad Testnet</span>
                <span className="ml-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Chain ID: 10143 · Token: MON</span>
              </div>
            </div>

            {/* Connectors */}
            <div className="space-y-2">
              {connectors
                .filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i)
                .map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => {
                      connect({ connector, chainId: monadTestnet.id });
                      setModalOpen(false);
                    }}
                    disabled={isConnecting}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:opacity-50"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(116,68,166,0.3)" }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                      style={{ backgroundColor: "rgba(116,68,166,0.25)" }}
                    >
                      {connector.name.includes("MetaMask") ? "🦊" : "🔌"}
                    </div>
                    <span>{connector.name}</span>
                    <svg className="w-4 h-4 ml-auto opacity-40" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                ))}
            </div>

            <p className="text-xs mt-4 text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
              Al conectar aceptás operar en Monad Testnet.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
