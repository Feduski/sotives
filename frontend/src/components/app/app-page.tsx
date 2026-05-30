"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PrivateGroupsTab from "./private-groups-tab";
import PublicTab from "./public-tab";
import ConnectButton from "@/components/wallet/connect-button";

type Tab = "privado" | "publico";

export default function AppPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [inputName, setInputName] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("privado");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sotives_username");
    if (saved) setUsername(saved);
  }, []);

  function handleStart(e: React.FormEvent) {
    e.preventDefault();
    const name = inputName.trim();
    if (!name) return;
    localStorage.setItem("sotives_username", name);
    setUsername(name);
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d0010" }}>
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "#F28B0C", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!username) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: "#0d0010" }}
      >
        <div className="w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2 mb-12 justify-center">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" fill="#F28B0C" />
              <path d="M14 6 L18 12 L14 10 L10 12 Z" fill="#40011E" />
              <circle cx="14" cy="16" r="5" fill="#40011E" />
              <path d="M10 19 L14 22 L18 19" fill="#40011E" />
            </svg>
            <span className="font-black text-2xl text-white tracking-tight">SoTives</span>
          </Link>

          <div
            className="rounded-2xl p-8"
            style={{
              backgroundColor: "rgba(88,2,89,0.25)",
              border: "1px solid rgba(116,68,166,0.4)",
            }}
          >
            <h1 className="font-black text-2xl text-white mb-2">¿Cómo te llamamos?</h1>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
              Tu nombre o @usuario para identificarte en la plataforma.
            </p>
            <form onSubmit={handleStart} className="space-y-4">
              <input
                type="text"
                placeholder="Tu nombre o @usuario"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(116,68,166,0.4)",
                }}
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-black text-sm transition-opacity disabled:opacity-40"
                style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
                disabled={!inputName.trim()}
              >
                Empezar →
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const displayName = username.startsWith("@") ? username : `@${username}`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0d0010" }}>
      {/* App header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 h-14 border-b"
        style={{
          backgroundColor: "rgba(13,0,16,0.92)",
          backdropFilter: "blur(12px)",
          borderColor: "#580259",
        }}
      >
        <Link href="/" className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" fill="#F28B0C" />
            <path d="M14 6 L18 12 L14 10 L10 12 Z" fill="#40011E" />
            <circle cx="14" cy="16" r="5" fill="#40011E" />
            <path d="M10 19 L14 22 L18 19" fill="#40011E" />
          </svg>
          <span className="font-black text-lg text-white tracking-tight">SoTives</span>
        </Link>

        <div className="flex items-center gap-2">
          <ConnectButton />
          <Link
            href="/perfil"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors hover:bg-white/10"
            style={{ backgroundColor: "rgba(116,68,166,0.2)", color: "#c084fc" }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white"
              style={{ background: "linear-gradient(135deg,#580259,#7544A6)" }}
            >
              {username[0].toUpperCase()}
            </div>
            <span className="hidden sm:inline">{displayName}</span>
          </Link>
        </div>
      </header>

      {/* Tab bar */}
      <div
        className="sticky top-14 z-40 flex border-b px-6 md:px-10"
        style={{ backgroundColor: "#0d0010", borderColor: "#580259" }}
      >
        {(["privado", "publico"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="relative py-3.5 mr-8 text-sm font-semibold transition-colors"
            style={{ color: activeTab === tab ? "#F28B0C" : "rgba(255,255,255,0.4)" }}
          >
            {tab === "privado" ? "Grupos Privados" : "Público"}
            {activeTab === tab && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: "#F28B0C" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="px-4 md:px-10 py-6 max-w-5xl mx-auto">
        {activeTab === "privado" ? (
          <PrivateGroupsTab username={displayName} />
        ) : (
          <PublicTab username={displayName} />
        )}
      </main>
    </div>
  );
}
