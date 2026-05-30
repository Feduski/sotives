"use client";

import { useState } from "react";
import Image from "next/image";

const steps = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
      </svg>
    ),
    label: "Definí tu meta",
    desc: "Objetivo, fecha límite y criterios claros de éxito.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
      </svg>
    ),
    label: "Setá la stake",
    desc: "Depositá fondos. El costo del abandono se vuelve real.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label: "Elegí y avisá",
    desc: "Público o privado. Con amigos, equipo o la comunidad.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    label: "Verificación por IA",
    desc: "Presentás evidencia. La IA evalúa sin conflicto de interés.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    label: "Distribución automática",
    desc: "On-chain. Sin intermediarios. Según las reglas que acordaste.",
  },
];

const incentives = [
  {
    num: "01",
    title: "Stake personal",
    desc: "Depositá fondos propios. Si cumplís los recuperás. Si no, los perdés. El costo real del abandono.",
    accent: "#F28B0C",
  },
  {
    num: "02",
    title: "Accountability grupal",
    desc: "Amigos, equipo o familia. La presión social se convierte en un segundo incentivo.",
    accent: "#7544A6",
  },
  {
    num: "03",
    title: "Incentivos de terceros",
    desc: "Seguidores, sponsors o comunidades financian tu compromiso. La responsabilidad deja de ser solo tuya.",
    accent: "#F2A679",
  },
  {
    num: "04",
    title: "Compromisos públicos",
    desc: "Publicá tu meta. Construí reputación verificable. La ejecución se convierte en una dinámica social.",
    accent: "#580259",
  },
];

const commitments = [
  { label: "Lanzar MVP antes del 15 jun", done: true },
  { label: "Estudiar 2hs diarias x 30 días", done: false },
  { label: "Correr 5k tres veces por semana", done: true },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="min-h-screen text-white font-sans antialiased"
      style={{ backgroundColor: "#0d0010" }}
    >
      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b"
        style={{
          backgroundColor: "rgba(13,0,16,0.85)",
          backdropFilter: "blur(12px)",
          borderColor: "#580259",
        }}
      >
        <a href="#" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" fill="#F28B0C" />
            <path d="M14 6 L18 12 L14 10 L10 12 Z" fill="#40011E" />
            <circle cx="14" cy="16" r="5" fill="#40011E" />
            <path d="M10 19 L14 22 L18 19" fill="#40011E" />
          </svg>
          <span className="font-black text-xl tracking-tight text-white">SoTives</span>
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: "#c084fc" }}>
          <a href="#inicio" className="hover:text-white transition-colors">Inicio</a>
          <a href="#como-funciona" className="hover:text-white transition-colors">Cómo Funciona</a>
          <a href="#incentivos" className="hover:text-white transition-colors">Incentivos</a>
          <a href="#discover" className="hover:text-white transition-colors">Descubrir</a>
        </div>

        <a
          href="/app"
          className="hidden md:inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-full transition-colors"
          style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
        >
          Comprometerse
        </a>

        <button
          className="md:hidden"
          style={{ color: "#c084fc" }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden px-6 py-5 flex flex-col gap-4 border-b text-sm font-medium"
          style={{ backgroundColor: "#1a0020", borderColor: "#580259" }}
        >
          <a href="#inicio" style={{ color: "#c084fc" }} onClick={() => setMenuOpen(false)}>Inicio</a>
          <a href="#como-funciona" style={{ color: "#c084fc" }} onClick={() => setMenuOpen(false)}>Cómo Funciona</a>
          <a href="#incentivos" style={{ color: "#c084fc" }} onClick={() => setMenuOpen(false)}>Incentivos</a>
          <a href="#discover" style={{ color: "#c084fc" }} onClick={() => setMenuOpen(false)}>Descubrir</a>
          <a
            href="/app"
            className="font-bold px-5 py-2.5 rounded-full text-center"
            style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
            onClick={() => setMenuOpen(false)}
          >
            Comprometerse
          </a>
        </div>
      )}

      {/* Hero */}
      <section id="inicio" className="relative px-6 md:px-12 pt-12 pb-0 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 60% 40%, rgba(116,68,166,0.25) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto grid md:grid-cols-2 gap-8 items-end">
          {/* Text */}
          <div className="pb-16">
            <h1
              className="font-black leading-none tracking-tight mb-4"
              style={{ fontSize: "clamp(2.8rem, 5.5vw, 4.5rem)", color: "#F28B0C" }}
            >
              SoTives
            </h1>

            <p
              className="font-medium leading-tight mb-6"
              style={{ fontSize: "clamp(1.2rem, 2.4vw, 1.9rem)", color: "#7544A6" }}
            >
              El precio real<br />de abandonar.
            </p>

            <ul className="space-y-2 mb-8">
              {[
                { text: "Aumenta tu ejecución.", color: "#F28B0C" },
                { text: "Verificable, Incentivado.", color: "#c084fc" },
                { text: "Sin intermediarios.", color: "rgba(255,255,255,0.3)" },
              ].map((item) => (
                <li
                  key={item.text}
                  className="flex items-start gap-2 font-light"
                  style={{ fontSize: "clamp(0.8rem, 1.4vw, 0.95rem)", color: item.color }}
                >
                  <span className="mt-0.5 select-none">—</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3">
              <a
                href="/app"
                className="font-black text-base px-7 py-3.5 rounded-full transition-colors"
                style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
              >
                Comprometerse →
              </a>
              <a
                href="#como-funciona"
                className="font-semibold text-base px-7 py-3.5 rounded-full border transition-colors hover:bg-white/5"
                style={{ borderColor: "#7544A6", color: "#c084fc" }}
              >
                Cómo funciona
              </a>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative min-h-[320px] md:min-h-[480px]">
            <Image
              src="/hero2.png"
              alt="SoTives — El precio real de abandonar"
              fill
              className="object-contain object-bottom md:object-right-bottom"
              priority
            />
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section
        id="como-funciona"
        className="px-6 md:px-12 py-20"
        style={{ backgroundColor: "#1a0020" }}
      >
        <div className="max-w-7xl mx-auto">
          <p
            className="font-black text-sm uppercase tracking-widest mb-10"
            style={{ color: "#F28B0C" }}
          >
            ¿CÓMO FUNCIONA?
          </p>

          <div className="flex flex-col md:flex-row items-stretch gap-0">
            {steps.map((step, i) => (
              <div key={i} className="flex md:flex-col items-start md:items-center flex-1">
                <div
                  className="flex flex-col items-center text-center p-5 rounded-2xl flex-1 w-full"
                  style={{
                    backgroundColor: "rgba(88,2,89,0.25)",
                    border: "1px solid rgba(116,68,166,0.3)",
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: "rgba(116,68,166,0.2)", color: "#F2A679" }}
                  >
                    {step.icon}
                  </div>
                  <p className="font-bold text-sm mb-2 text-white">{step.label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {step.desc}
                  </p>
                </div>

                {i < steps.length - 1 && (
                  <div
                    className="hidden md:flex items-center justify-center flex-shrink-0 mx-1"
                    style={{ color: "#F28B0C" }}
                  >
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Incentivos */}
      <section id="incentivos" className="px-6 md:px-12 py-20">
        <div className="max-w-7xl mx-auto">
          <p
            className="font-black text-sm uppercase tracking-widest mb-3"
            style={{ color: "#F28B0C" }}
          >
            INCENTIVOS
          </p>
          <h2
            className="font-black leading-tight mb-12 text-white"
            style={{ fontSize: "clamp(2rem,4vw,3.5rem)" }}
          >
            Cuatro fuerzas que te hacen
            <br />
            <span style={{ color: "#7544A6" }}>cumplir lo que prometés.</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {incentives.map((item) => (
              <div
                key={item.num}
                className="rounded-2xl p-6 flex flex-col gap-4"
                style={{
                  backgroundColor: "rgba(88,2,89,0.2)",
                  border: "1px solid rgba(116,68,166,0.25)",
                }}
              >
                <span
                  className="text-4xl font-black opacity-30 leading-none"
                  style={{ color: item.accent }}
                >
                  {item.num}
                </span>
                <h3 className="font-bold text-base text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {item.desc}
                </p>
                <div
                  className="mt-auto h-1 w-10 rounded-full"
                  style={{ backgroundColor: item.accent }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reputación */}
      <section
        id="discover"
        className="px-6 md:px-12 py-20"
        style={{
          background: "linear-gradient(180deg, #0d0010 0%, #1a0035 50%, #0d0010 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p
              className="font-black text-sm uppercase tracking-widest mb-3"
              style={{ color: "#F28B0C" }}
            >
              REPUTACIÓN VERIFICABLE
            </p>
            <h2
              className="font-black leading-tight mb-6 text-white"
              style={{ fontSize: "clamp(1.8rem,3.5vw,3rem)" }}
            >
              Lo que prometes
              <br />
              <span style={{ color: "#7544A6" }}>define quién sos.</span>
              <br />
              Lo que cumplís,
              <br />
              <span style={{ color: "#F28B0C" }}>define tu valor.</span>
            </h2>
            <p
              className="text-base leading-relaxed mb-8"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Tu historial de cumplimiento es público y verificable on-chain.
              Usuarios con mejor track record acceden a más financiamiento,
              visibilidad en Discover y mayor confianza del ecosistema.
            </p>
            <a
              href="/app"
              className="inline-flex items-center gap-2 font-bold text-sm px-7 py-3.5 rounded-full transition-colors"
              style={{ backgroundColor: "#580259", color: "white", border: "1px solid #7544A6" }}
            >
              Empezar a construir mi reputación →
            </a>
          </div>

          {/* Score card */}
          <div
            className="rounded-2xl p-8"
            style={{
              backgroundColor: "rgba(88,2,89,0.25)",
              border: "1px solid rgba(116,68,166,0.4)",
            }}
          >
            <div className="flex items-center gap-4 mb-8">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black"
                style={{ background: "linear-gradient(135deg,#580259,#7544A6)" }}
              >
                F
              </div>
              <div>
                <div className="font-black text-lg text-white">@fede</div>
                <div className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Ejecutor verificado
                </div>
              </div>
              <div
                className="ml-auto text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  backgroundColor: "rgba(242,139,12,0.15)",
                  color: "#F28B0C",
                  border: "1px solid rgba(242,139,12,0.3)",
                }}
              >
                ★ Top 5%
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { v: "94%", l: "Cumplimiento" },
                { v: "28", l: "Completados" },
                { v: "$1.2k", l: "Gestionado" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-xl p-3 text-center"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                >
                  <div className="text-2xl font-black" style={{ color: "#F28B0C" }}>
                    {s.v}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {s.l}
                  </div>
                </div>
              ))}
            </div>

            {commitments.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-3 py-2"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: c.done
                      ? "rgba(242,139,12,0.2)"
                      : "rgba(116,68,166,0.2)",
                  }}
                >
                  {c.done ? (
                    <svg className="w-3 h-3" fill="none" stroke="#F28B0C" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="#7544A6" strokeWidth={2.5} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  )}
                </div>
                <span
                  className="text-sm flex-1 truncate"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {c.label}
                </span>
                <span
                  className="text-xs font-medium"
                  style={{ color: c.done ? "#F28B0C" : "#7544A6" }}
                >
                  {c.done ? "cumplido" : "en curso"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-7xl mx-auto">
          <div
            className="rounded-3xl px-8 md:px-16 py-16 text-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #580259 0%, #40011E 50%, #1a0010 100%)",
              border: "1px solid rgba(116,68,166,0.4)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(116,68,166,0.3) 0%, transparent 70%)",
              }}
            />
            <div className="relative">
              <h2
                className="font-black leading-none tracking-tight mb-4"
                style={{ fontSize: "clamp(2.5rem,5vw,4.5rem)" }}
              >
                <span className="block" style={{ color: "#F28B0C" }}>CONVERTÍ TUS</span>
                <span className="block text-white">INTENCIONES EN</span>
                <span className="block" style={{ color: "#7544A6" }}>COMPROMISOS REALES.</span>
              </h2>
              <p className="text-lg mb-10" style={{ color: "rgba(255,255,255,0.6)" }}>
                Poné fondos en juego. Involucré tu comunidad. Demostrá que lo cumplís.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/app"
                  className="font-black text-lg px-10 py-4 rounded-full transition-colors"
                  style={{ backgroundColor: "#F28B0C", color: "#40011E" }}
                >
                  Crear mi primer compromiso →
                </a>
                <a
                  href="#como-funciona"
                  className="font-semibold text-lg px-10 py-4 rounded-full border transition-colors"
                  style={{ borderColor: "rgba(255,255,255,0.2)", color: "white" }}
                >
                  Ver cómo funciona
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 md:px-12 py-10 border-t"
        style={{ borderColor: "rgba(88,2,89,0.5)" }}
      >
        <div
          className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" fill="#F28B0C" opacity="0.8" />
              <path d="M14 6 L18 12 L14 10 L10 12 Z" fill="#40011E" />
              <circle cx="14" cy="16" r="5" fill="#40011E" />
              <path d="M10 19 L14 22 L18 19" fill="#40011E" />
            </svg>
            <span className="font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>SoTives</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Inicio</a>
            <a href="#" className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#" className="hover:text-white transition-colors">Términos</a>
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
          </div>
          <p>© 2025 SoTives. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
