'use client';
import { useState, useEffect, useRef } from "react";

const TOTAL_DURATION = 38000;

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
const easeInOutQuart = (t) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

function useA(s, d, gt) {
  const e = gt - s;
  return e < 0 ? 0 : e > d ? 1 : e / d;
}

/* ---- ICON SYSTEM (SVG, no emoji) ---- */
const Icon = ({ type, size = 24, color = "#FF6B4A" }) => {
  const s = { width: size, height: size, flexShrink: 0 };
  const icons = {
    globe: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
      </svg>
    ),
    target: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" fill={color} />
      </svg>
    ),
    clock: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
    music: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    ),
    cpu: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" rx="1" fill={color} opacity="0.3" />
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
      </svg>
    ),
    send: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
      </svg>
    ),
    messageCircle: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
    trumpet: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d="M3 14h2l3-3h6l2-2h5v6h-5l-2-2H8l-3-3H3z" />
        <circle cx="20" cy="12" r="1" fill={color} /><path d="M3 11v6" />
      </svg>
    ),
    zap: (
      <svg style={s} viewBox="0 0 24 24" fill={color} stroke="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    play: (
      <svg style={s} viewBox="0 0 24 24" fill={color} stroke="none">
        <path d="M8 5v14l11-7z" />
      </svg>
    ),
    headphones: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    ),
    users: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    barChart: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 20V10M18 20V4M6 20v-4" />
      </svg>
    ),
    arrowRight: (
      <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
    spotify: (
      <svg style={{ ...s, width: 16, height: 16 }} viewBox="0 0 24 24" fill={color}>
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381C8.64 5.801 15.6 6.061 20.04 8.82c.54.3.72 1.02.42 1.56-.299.421-1.02.599-1.379.3z" />
      </svg>
    ),
    apple: (
      <svg style={{ ...s, width: 16, height: 16 }} viewBox="0 0 24 24" fill={color}>
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    youtube: (
      <svg style={{ ...s, width: 16, height: 16 }} viewBox="0 0 24 24" fill={color}>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    bandcamp: (
      <svg style={{ ...s, width: 16, height: 16 }} viewBox="0 0 24 24" fill={color}>
        <path d="M0 18.75l7.437-13.5H24l-7.438 13.5z" />
      </svg>
    ),
  };
  return icons[type] || null;
};

/* ---- Shared VFX ---- */
function Particles({ count = 45, gt, color = "255,107,74" }) {
  const pts = useRef(
    Array.from({ length: count }, () => ({
      x: Math.random() * 100, y: Math.random() * 100,
      s: Math.random() * 2.2 + 0.6, sp: Math.random() * 0.014 + 0.003,
      o: Math.random() * 0.3 + 0.05, off: Math.random() * Math.PI * 2,
    }))
  ).current;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {pts.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${p.x + Math.sin(gt * 0.0008 + p.off) * 2.5}%`,
          top: `${(p.y + gt * p.sp) % 110 - 5}%`,
          width: p.s, height: p.s, borderRadius: "50%",
          background: `rgba(${color},${p.o})`,
        }} />
      ))}
    </div>
  );
}

function Orb({ x, y, size, color, gt, speed = 0.001 }) {
  return (
    <div style={{
      position: "absolute", width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      left: x, top: y, pointerEvents: "none",
      transform: `translate(${Math.sin(gt * speed) * 20}px, ${Math.cos(gt * speed * 0.7) * 18}px)`,
    }} />
  );
}

function SLabel({ gt, start, text }) {
  const a = useA(start, 600, gt);
  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
      color: "#FF6B4A", letterSpacing: 3, textTransform: "uppercase", marginBottom: 6,
      opacity: easeOutCubic(a), transform: `translateY(${(1 - easeOutCubic(a)) * 8}px)`,
    }}>{text}</div>
  );
}

function STitle({ gt, start, children }) {
  const a = useA(start + 100, 600, gt);
  return (
    <div style={{
      fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700, color: "#fff",
      letterSpacing: -0.5, marginBottom: 22, textAlign: "center", lineHeight: 1.3,
      opacity: easeOutCubic(a), transform: `translateY(${(1 - easeOutCubic(a)) * 10}px)`,
    }}>{children}</div>
  );
}

/* ===== SCENE 1: LOGO ===== */
function Scene1({ gt }) {
  const fadeIn = useA(0, 1000, gt);
  const lineW = useA(300, 1000, gt);
  const sub1 = useA(800, 700, gt);
  const sub2 = useA(1600, 700, gt);
  const badge = useA(2400, 600, gt);
  const fadeOut = useA(3300, 700, gt);
  const o = easeOutCubic(fadeIn) * (1 - easeOutCubic(fadeOut));
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
      <div style={{
        fontFamily: "'Sora', sans-serif", fontSize: 68, fontWeight: 800,
        color: "#fff", letterSpacing: -2,
        transform: `scale(${0.88 + easeOutCubic(fadeIn) * 0.12})`,
      }}>
        <span style={{ color: "#FF6B4A" }}>OTO</span>NAMI
      </div>
      <div style={{
        width: easeOutCubic(lineW) * 80, height: 2, borderRadius: 1,
        background: "linear-gradient(90deg, #FF6B4A, #FF3D6E)", marginBottom: 14,
      }} />
      <div style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 14,
        color: "rgba(255,255,255,0.55)", letterSpacing: 3, textTransform: "uppercase",
        opacity: easeOutCubic(sub1),
      }}>AI-Powered Music Pitch Platform</div>
      <div style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
        color: "rgba(255,255,255,0.35)", marginTop: 8, letterSpacing: 1,
        opacity: easeOutCubic(sub2),
      }}>日本のインディーズ音楽を、世界のキュレーターへ</div>
      <div style={{
        marginTop: 18, display: "flex", gap: 12, alignItems: "center",
        opacity: easeOutBack(badge), transform: `scale(${0.7 + easeOutBack(badge) * 0.3})`,
      }}>
        <div style={{
          background: "rgba(255,107,74,0.12)", border: "1px solid rgba(255,107,74,0.25)",
          borderRadius: 6, padding: "4px 12px", display: "flex", alignItems: "center", gap: 6,
        }}>
          <Icon type="zap" size={12} color="#FF6B4A" />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: "#FF6B4A" }}>Powered by AI</span>
        </div>
        <div style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6, padding: "4px 12px",
          fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.5)",
        }}>otonami.io</div>
      </div>
    </div>
  );
}

/* ===== SCENE 2: THE PROBLEM ===== */
function Scene2({ gt }) {
  const S = 4000;
  const fadeIn = useA(S, 700, gt);
  const fadeOut = useA(S + 4300, 700, gt);
  const o = easeOutCubic(fadeIn) * (1 - easeOutCubic(fadeOut));

  const problems = [
    { icon: "globe", title: "言語の壁", en: "Language barriers block global reach" },
    { icon: "target", title: "マッチングの非効率", en: "Blind outreach = <1% response" },
    { icon: "clock", title: "時間と労力", en: "No time to research every curator" },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
      <SLabel gt={gt} start={S + 200} text="THE PROBLEM" />
      <STitle gt={gt} start={S + 200}>
        Why great Japanese music<br /><span style={{ color: "#FF6B4A" }}>stays invisible</span> worldwide
      </STitle>
      <div style={{ display: "flex", gap: 14 }}>
        {problems.map((p, i) => {
          const cIn = useA(S + 800 + i * 500, 600, gt);
          return (
            <div key={p.title} style={{
              width: 135, background: "rgba(255,255,255,0.03)",
              borderRadius: 14, padding: "18px 12px", textAlign: "center",
              border: "1px solid rgba(255,255,255,0.06)",
              opacity: easeOutCubic(cIn),
              transform: `translateY(${(1 - easeOutBack(cIn)) * 20}px)`,
            }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, opacity: 0.9 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(255,107,74,0.08)", border: "1px solid rgba(255,107,74,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon type={p.icon} size={22} color="#FF6B4A" />
                </div>
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{p.title}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{p.en}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== SCENE 3: HOW IT WORKS ===== */
function Scene3({ gt }) {
  const S = 9000;
  const fadeIn = useA(S, 700, gt);
  const fadeOut = useA(S + 4800, 700, gt);
  const o = easeOutCubic(fadeIn) * (1 - easeOutCubic(fadeOut));

  const steps = [
    { n: "01", title: "Submit", desc: "楽曲をアップロード\nジャンル・ムード自動解析", icon: "music", color: "#FF6B4A" },
    { n: "02", title: "AI Match", desc: "キュレーターとの\n適合度をスコアリング", icon: "cpu", color: "#A78BFA" },
    { n: "03", title: "Pitch", desc: "バイリンガルピッチを\nAI翻訳・最適化", icon: "send", color: "#4ECDC4" },
    { n: "04", title: "Feedback", desc: "キュレーターから\nフィードバック受信", icon: "messageCircle", color: "#FFB347" },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
      <SLabel gt={gt} start={S + 200} text="HOW IT WORKS" />
      <STitle gt={gt} start={S + 200}>4 steps to <span style={{ color: "#FF6B4A" }}>global reach</span></STitle>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        {steps.map((s, i) => {
          const cIn = useA(S + 700 + i * 500, 600, gt);
          const isActive = Math.floor((gt - S - 1800) / 1100) % 4 === i && gt > S + 1800;
          return (
            <div key={s.n} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{
                width: 100, background: isActive ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.025)",
                borderRadius: 14, padding: "16px 8px", textAlign: "center",
                border: isActive ? `1px solid ${s.color}35` : "1px solid rgba(255,255,255,0.05)",
                opacity: easeOutCubic(cIn),
                transform: `translateY(${(1 - easeOutBack(cIn)) * 25}px) scale(${isActive ? 1.04 : 1})`,
                transition: "border 0.3s, background 0.3s, transform 0.3s",
                boxShadow: isActive ? `0 4px 16px ${s.color}15` : "none",
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: s.color, letterSpacing: 2, fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>
                  STEP {s.n}
                </div>
                <div style={{
                  display: "flex", justifyContent: "center", marginBottom: 8,
                  transform: isActive ? `scale(1.1) rotate(${Math.sin(gt * 0.006) * 4}deg)` : "scale(1)",
                  transition: "transform 0.3s",
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: isActive ? `${s.color}18` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isActive ? s.color + "30" : "rgba(255,255,255,0.06)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.3s, border 0.3s",
                  }}>
                    <Icon type={s.icon} size={20} color={isActive ? s.color : "rgba(255,255,255,0.4)"} />
                  </div>
                </div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700,
                  color: isActive ? s.color : "#fff", marginBottom: 4, transition: "color 0.3s",
                }}>{s.title}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 8, color: "rgba(255,255,255,0.35)", lineHeight: 1.4, whiteSpace: "pre-line" }}>{s.desc}</div>
              </div>
              {i < 3 && (
                <div style={{ marginTop: 42, opacity: easeOutCubic(useA(S + 900 + i * 500, 400, gt)) }}>
                  <Icon type="arrowRight" size={14} color="rgba(255,255,255,0.15)" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== SCENE 4: CASE STUDY ===== */
function Scene4({ gt }) {
  const S = 14500;
  const fadeIn = useA(S, 700, gt);
  const fadeOut = useA(S + 5800, 700, gt);
  const o = easeOutCubic(fadeIn) * (1 - easeOutCubic(fadeOut));

  const scoreStart = S + 2200;
  const scoreAnim = useA(scoreStart, 1200, gt);
  const score = Math.round(92 * easeOutCubic(scoreAnim));
  const sz = 100, stk = 5, r = (sz - stk) / 2, circ = 2 * Math.PI * r;
  const dashOff = circ * (1 - easeOutCubic(scoreAnim) * 0.92);

  const breakdowns = [
    { label: "Genre", pct: 95, weight: "35%", color: "#FF6B4A" },
    { label: "Audio", pct: 88, weight: "30%", color: "#A78BFA" },
    { label: "Mood", pct: 91, weight: "20%", color: "#4ECDC4" },
    { label: "Tempo", pct: 85, weight: "15%", color: "#FFB347" },
  ];

  const waveActive = gt > S + 800 && gt < S + 6000;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
      <SLabel gt={gt} start={S + 200} text="CASE STUDY" />
      <STitle gt={gt} start={S + 200}><span style={{ color: "#FF6B4A" }}>ROUTE14band</span> × OTONAMI</STitle>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Left: Track card */}
        <div style={{
          width: 185, background: "rgba(255,255,255,0.03)",
          borderRadius: 14, padding: "14px 12px",
          border: "1px solid rgba(255,255,255,0.06)",
          opacity: easeOutCubic(useA(S + 500, 700, gt)),
          transform: `translateX(${(1 - easeOutCubic(useA(S + 500, 700, gt))) * -20}px)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "linear-gradient(135deg, #FF6B4A, #FF3D6E)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon type="trumpet" size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "#fff" }}>ROUTE14band</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Kawasaki, Japan</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 1.2, alignItems: "center", height: 28, justifyContent: "center", marginBottom: 10 }}>
            {Array.from({ length: 42 }, (_, i) => {
              const h = waveActive ? 4 + Math.sin(gt * 0.007 + i * 0.6) * 10 + Math.cos(gt * 0.004 + i * 1.2) * 5 : 2;
              return <div key={i} style={{ width: 2, height: Math.max(2, h), borderRadius: 1, background: waveActive ? `hsl(${10 + (i / 42) * 20}, 80%, 58%)` : "rgba(255,255,255,0.1)" }} />;
            })}
          </div>

          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["Jazz", "Funk", "Instrumental", "SXSW"].map((t, i) => (
              <span key={t} style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 500,
                color: "rgba(255,255,255,0.45)", padding: "2px 8px",
                background: "rgba(255,255,255,0.05)", borderRadius: 12,
                opacity: easeOutCubic(useA(S + 1000 + i * 150, 300, gt)),
              }}>{t}</span>
            ))}
          </div>

          <div style={{
            marginTop: 10, padding: "8px 10px",
            background: "rgba(255,107,74,0.06)", borderRadius: 8,
            border: "1px solid rgba(255,107,74,0.1)",
            opacity: easeOutCubic(useA(S + 1500, 600, gt)),
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
              <Icon type="zap" size={10} color="#FF6B4A" />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 8, fontWeight: 600, color: "#FF6B4A", letterSpacing: 1 }}>AI PITCH PREVIEW</span>
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
              "A jazz-funk fusion band from Kawasaki with 11 years of SXSW history..."
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", padding: "1px 6px", borderRadius: 4 }}>EN</span>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", padding: "1px 6px", borderRadius: 4 }}>JA</span>
              <span style={{ fontSize: 8, color: "#FF6B4A" }}>← AI翻訳</span>
            </div>
          </div>
        </div>

        {/* Right: Match score */}
        <div style={{
          width: 185,
          opacity: easeOutCubic(useA(S + 1800, 700, gt)),
          transform: `translateX(${(1 - easeOutCubic(useA(S + 1800, 700, gt))) * 20}px)`,
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <div style={{ position: "relative", width: sz, height: sz }}>
              <svg width={sz} height={sz} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stk} />
                <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke="url(#sg3)" strokeWidth={stk} strokeDasharray={circ} strokeDashoffset={dashOff} strokeLinecap="round" />
                <defs><linearGradient id="sg3" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FF6B4A" /><stop offset="100%" stopColor="#FF3D6E" /></linearGradient></defs>
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 800, color: "#fff" }}>{score}</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: 2 }}>MATCH SCORE</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {breakdowns.map((b, i) => {
              const bIn = useA(S + 2800 + i * 300, 600, gt);
              return (
                <div key={b.label} style={{ opacity: easeOutCubic(bIn) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{b.label}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{b.weight}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                    <div style={{ height: "100%", width: `${easeOutCubic(bIn) * b.pct}%`, borderRadius: 2, background: b.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{
            marginTop: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 8,
            color: "rgba(255,255,255,0.25)", textAlign: "center",
            opacity: easeOutCubic(useA(S + 4200, 500, gt)),
          }}>Genre 35% • Audio 30% • Mood 20% • Tempo 15%</div>
        </div>
      </div>
    </div>
  );
}

/* ===== SCENE 5: CURATOR NETWORK ===== */
function Scene5({ gt }) {
  const S = 21000;
  const fadeIn = useA(S, 700, gt);
  const fadeOut = useA(S + 4300, 700, gt);
  const o = easeOutCubic(fadeIn) * (1 - easeOutCubic(fadeOut));

  const curators = [
    { name: "Sarah M.", region: "New York", flag: "US", genre: "Jazz", score: 92, pl: "12" },
    { name: "Lars K.", region: "Berlin", flag: "DE", genre: "Funk / Soul", score: 87, pl: "8" },
    { name: "Yuki T.", region: "Tokyo", flag: "JP", genre: "World Music", score: 78, pl: "15" },
    { name: "Ana R.", region: "São Paulo", flag: "BR", genre: "Latin Jazz", score: 84, pl: "6" },
    { name: "James L.", region: "London", flag: "UK", genre: "Contemporary", score: 81, pl: "10" },
  ];

  const flagColors = { US: "#3B82F6", DE: "#EF4444", JP: "#F43F5E", BR: "#22C55E", UK: "#6366F1" };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
      <SLabel gt={gt} start={S + 200} text="GLOBAL NETWORK" />
      <STitle gt={gt} start={S + 200}>Curators across <span style={{ color: "#FF6B4A" }}>5 continents</span></STitle>
      <div style={{ width: 380, display: "flex", flexDirection: "column", gap: 6 }}>
        {curators.map((c, i) => {
          const cIn = useA(S + 600 + i * 350, 500, gt);
          const isTop = i === 0;
          return (
            <div key={c.name} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: isTop ? "rgba(255,107,74,0.06)" : "rgba(255,255,255,0.025)",
              borderRadius: 10, padding: "8px 12px",
              border: isTop ? "1px solid rgba(255,107,74,0.2)" : "1px solid rgba(255,255,255,0.05)",
              opacity: easeOutCubic(cIn),
              transform: `translateX(${(1 - easeOutCubic(cIn)) * (i % 2 === 0 ? -15 : 15)}px)`,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: `${flagColors[c.flag]}18`,
                border: `1px solid ${flagColors[c.flag]}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Icon type="headphones" size={16} color={flagColors[c.flag]} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#fff" }}>{c.name}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{c.flag} · {c.region}</span>
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                  {c.genre} · {c.pl} playlists
                </div>
              </div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700,
                color: isTop ? "#FF6B4A" : "rgba(255,255,255,0.5)",
              }}>{c.score}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== SCENE 6: PRICING (CREDIT-BASED) ===== */
function Scene6({ gt }) {
  const S = 26000;
  const fadeIn = useA(S, 700, gt);
  const fadeOut = useA(S + 4800, 700, gt);
  const o = easeOutCubic(fadeIn) * (1 - easeOutCubic(fadeOut));

  // Animated counter
  const counterAnim = useA(S + 800, 1200, gt);
  const price = Math.round(160 * easeOutCubic(counterAnim));

  const steps = [
    { credits: "1", action: "1 pitch to a curator", price: "¥160" },
    { credits: "5", action: "5 pitches", price: "¥800" },
    { credits: "10", action: "10 pitches — campaign", price: "¥1,600" },
  ];

  const benefits = [
    { icon: "send", text: "AI-optimized bilingual pitch" },
    { icon: "cpu", text: "Match Score analysis" },
    { icon: "messageCircle", text: "Curator feedback included" },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
      <SLabel gt={gt} start={S + 200} text="SIMPLE PRICING" />
      <STitle gt={gt} start={S + 200}>Start from <span style={{ color: "#FF6B4A" }}>just 1 credit</span></STitle>

      {/* Big price hero */}
      <div style={{
        background: "rgba(255,107,74,0.06)", borderRadius: 16,
        border: "1px solid rgba(255,107,74,0.2)", padding: "18px 36px",
        textAlign: "center", marginBottom: 18,
        opacity: easeOutCubic(useA(S + 500, 700, gt)),
        transform: `scale(${0.85 + easeOutCubic(useA(S + 500, 700, gt)) * 0.15})`,
        boxShadow: "0 4px 24px rgba(255,107,74,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 42, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
            ¥{price}
          </span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
            / credit〜
          </span>
        </div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 6,
        }}>
          1 credit = 1 pitch to a curator
        </div>
      </div>

      {/* Credit examples */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {steps.map((s, i) => {
          const sIn = useA(S + 1400 + i * 350, 500, gt);
          return (
            <div key={s.credits} style={{
              width: 120, background: "rgba(255,255,255,0.03)",
              borderRadius: 10, padding: "10px 8px", textAlign: "center",
              border: "1px solid rgba(255,255,255,0.06)",
              opacity: easeOutCubic(sIn),
              transform: `translateY(${(1 - easeOutBack(sIn)) * 15}px)`,
            }}>
              <div style={{
                fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 800,
                color: "#FF6B4A", lineHeight: 1,
              }}>{s.credits}</div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 8,
                color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 6,
              }}>CREDITS</div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 9,
                color: "rgba(255,255,255,0.5)", lineHeight: 1.3, marginBottom: 4,
              }}>{s.action}</div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: "#fff",
              }}>{s.price}</div>
            </div>
          );
        })}
      </div>

      {/* What's included per credit */}
      <div style={{
        display: "flex", gap: 16,
        opacity: easeOutCubic(useA(S + 2800, 600, gt)),
      }}>
        {benefits.map((b, i) => (
          <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Icon type={b.icon} size={12} color="rgba(255,255,255,0.35)" />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{b.text}</span>
          </div>
        ))}
      </div>

      <div style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 12,
        opacity: easeOutCubic(useA(S + 3200, 500, gt)),
      }}>
        月額プランもあり — レーベル・法人向け
      </div>
    </div>
  );
}

/* ===== SCENE 7: CTA ===== */
function Scene7({ gt }) {
  const S = 31500;
  const fadeIn = useA(S, 800, gt);
  const o = easeOutCubic(fadeIn);
  const pulse = Math.sin(gt * 0.004) * 0.03 + 1;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
      <div style={{
        fontFamily: "'Sora', sans-serif", fontSize: 52, fontWeight: 800,
        color: "#fff", letterSpacing: -2, marginBottom: 6,
        opacity: easeOutCubic(useA(S + 200, 700, gt)),
        transform: `scale(${0.88 + easeOutCubic(useA(S + 200, 700, gt)) * 0.12})`,
      }}>
        <span style={{ color: "#FF6B4A" }}>OTO</span>NAMI
      </div>
      <div style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 500,
        color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 1.5,
        marginBottom: 6, maxWidth: 340,
        opacity: easeOutCubic(useA(S + 600, 600, gt)),
      }}>
        Your music deserves<br /><span style={{ fontWeight: 700, color: "#fff" }}>the right audience, worldwide.</span>
      </div>
      <div style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12,
        color: "rgba(255,255,255,0.35)", marginBottom: 24,
        opacity: easeOutCubic(useA(S + 900, 500, gt)),
      }}>あなたの音楽を、世界の耳へ届ける。</div>
      <a href="/studio" onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none', zIndex: 20, position: 'relative' }}>
        <div style={{
          background: "linear-gradient(135deg, #FF6B4A, #FF3D6E)",
          borderRadius: 12, padding: "14px 40px",
          fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700,
          color: "#fff", letterSpacing: 1, display: "flex", alignItems: "center", gap: 8,
          transform: `scale(${pulse})`,
          boxShadow: "0 6px 28px rgba(255,107,74,0.35)",
          opacity: easeOutCubic(useA(S + 1200, 600, gt)),
          cursor: "pointer",
        }}>
          Start Pitching <Icon type="arrowRight" size={14} color="#fff" />
        </div>
      </a>
      <a href="/" onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none', zIndex: 20, position: 'relative' }}>
        <div style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
          color: "rgba(255,255,255,0.3)", marginTop: 14, letterSpacing: 3,
          opacity: easeOutCubic(useA(S + 1500, 500, gt)),
        }}>otonami.io</div>
      </a>
      <div style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 9,
        color: "rgba(255,255,255,0.15)", marginTop: 16,
        opacity: easeOutCubic(useA(S + 1800, 500, gt)),
      }}>TYCompany合同会社</div>
    </div>
  );
}

/* ===== PROGRESS BAR ===== */
function PBar({ gt }) {
  const p = Math.min(gt / TOTAL_DURATION, 1);
  const scenes = [
    { at: 0, l: "INTRO" }, { at: 4000, l: "PROBLEM" },
    { at: 9000, l: "HOW" }, { at: 14500, l: "CASE" },
    { at: 21000, l: "CURATORS" }, { at: 26000, l: "PRICING" },
    { at: 31500, l: "CTA" },
  ];
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 10px", marginBottom: 3 }}>
        {scenes.map(s => (
          <span key={s.l} style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 6.5,
            color: gt >= s.at ? "rgba(255,107,74,0.6)" : "rgba(255,255,255,0.12)",
            letterSpacing: 0.5, transition: "color 0.3s",
          }}>{s.l}</span>
        ))}
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.04)" }}>
        <div style={{ height: "100%", width: `${p * 100}%`, background: "linear-gradient(90deg, #FF6B4A, #FF3D6E)" }} />
      </div>
    </div>
  );
}

/* ===== MAIN — LP-READY COMPONENT ===== */
/*
  Usage in Next.js (App Router):
  
  // app/page.tsx or any page
  import OTONAMIPromo from '@/components/OTONAMIPromo';
  
  export default function LandingPage() {
    return (
      <section style={{ background: '#0a0a10', padding: '80px 0' }}>
        <OTONAMIPromo />
      </section>
    );
  }

  // Add fonts in app/layout.tsx:
  // import { DM_Sans } from 'next/font/google';
  // Or keep the <link> tag approach below.
*/
export default function OTONAMIPromo() {
  const [gt, setGt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const af = useRef(null);
  const st = useRef(null);
  const containerRef = useRef(null);
  const playingRef = useRef(false);

  // Animation loop using ref to avoid stale closure
  useEffect(() => {
    if (!playing) return;
    playingRef.current = true;
    st.current = null;

    const tick = (ts) => {
      if (!playingRef.current) return;
      if (!st.current) st.current = ts;
      const elapsed = ts - st.current;
      setGt(elapsed);
      if (elapsed < TOTAL_DURATION) {
        af.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
        setEnded(true);
        playingRef.current = false;
      }
    };

    af.current = requestAnimationFrame(tick);
    return () => {
      playingRef.current = false;
      if (af.current) cancelAnimationFrame(af.current);
    };
  }, [playing]);

  const play = () => {
    setGt(0);
    setEnded(false);
    setPlaying(true);
  };

  // Auto-play on scroll into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let fired = false;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired) {
          fired = true;
          play();
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    const timer = setTimeout(() => obs.observe(el), 300);
    return () => {
      clearTimeout(timer);
      obs.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        padding: "0 16px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Video frame */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "56.25%",
          background:
            "radial-gradient(ellipse at 30% 35%, #161020 0%, #0a0a10 50%, #050508 100%)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 16px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
          cursor: ended ? "pointer" : "default",
        }}
        onClick={ended ? play : undefined}
      >
        <div style={{ position: "absolute", inset: 0 }}>
          <Particles gt={gt} count={40} />
          <Orb x="-5%" y="-8%" size={320} color="rgba(255,107,74,0.045)" gt={gt} speed={0.0009} />
          <Orb x="65%" y="55%" size={260} color="rgba(255,61,110,0.035)" gt={gt} speed={0.0011} />

          <Scene1 gt={gt} />
          <Scene2 gt={gt} />
          <Scene3 gt={gt} />
          <Scene4 gt={gt} />
          <Scene5 gt={gt} />
          <Scene6 gt={gt} />
          <Scene7 gt={gt} />
          <PBar gt={gt} />

          {/* Pre-play overlay — shown until first play */}
          {!playing && !ended && gt === 0 && (
            <div
              onClick={(e) => { e.stopPropagation(); play(); }}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(5,5,8,0.6)",
                backdropFilter: "blur(8px)",
                cursor: "pointer",
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #FF6B4A, #FF3D6E)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 24px rgba(255,107,74,0.4)",
                  marginBottom: 14,
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 3 }}>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.6)",
                  letterSpacing: 2,
                }}
              >
                WATCH HOW IT WORKS
              </span>
            </div>
          )}

          {/* Replay overlay */}
          {ended && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(5,5,8,0.5)",
                backdropFilter: "blur(4px)",
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.45)",
                  letterSpacing: 1,
                }}
              >
                REPLAY
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
