'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { T } from '@/lib/design-tokens';

/* ── Country flags ── */
const FL = {
  US:"🇺🇸", UK:"🇬🇧", JP:"🇯🇵", DE:"🇩🇪", FR:"🇫🇷",
  NL:"🇳🇱", AU:"🇦🇺", CL:"🇨🇱", IT:"🇮🇹", UA:"🇺🇦",
  KR:"🇰🇷", BR:"🇧🇷", SE:"🇸🇪", CA:"🇨🇦", MX:"🇲🇽",
};

/* ── Format follower counts ── */
const fmt = n => n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"k" : String(n);

/* ── Genre list for filter ── */
const GENRES = [
  "Jazz","Jazz fusion","Funk","Latin jazz","Fusion","City Pop",
  "Soul","Neo soul","R&B","Instrumental","Dance music","Film music",
  "Modern jazz","Ambient","Chill out","Lo-fi Hip Hop","Lo-Fi",
  "Electronic","Experimental","Indie pop","Indie Rock","Alt Rock",
  "J-pop","J-Rock","City pop","Pop","Noise","Post Rock","Dream Pop",
  "Hip-Hop","Afrobeat","World music","Prog","Punk","Visual Kei","Anime",
];

/* ── Curator type options ── */
const CURATOR_TYPES = [
  "Playlist Curator",
  "Media Outlet/Journalist",
  "Radio/Podcast",
  "Label/Management",
];

/* ── Region → country code mapping ── */
const REGION_TO_CODE = {
  'Japan':'JP','United States':'US','United Kingdom':'UK','Germany':'DE','France':'FR',
  'Australia':'AU','Canada':'CA','South Korea':'KR','Brazil':'BR','Mexico':'MX',
  'Spain':'ES','Italy':'IT','Netherlands':'NL','Sweden':'SE','Norway':'NO',
  'Denmark':'DK','Finland':'FI','Portugal':'PT','Poland':'PL','India':'IN',
  'Singapore':'SG','Thailand':'TH','Indonesia':'ID','Philippines':'PH',
  'South Africa':'ZA','Nigeria':'NG','Argentina':'AR','Colombia':'CO',
  'Chile':'CL','Ukraine':'UA',
};

/* ── DB type → display label ── */
const TYPE_LABEL = {
  playlist: 'Playlist Curator',
  blog: 'Media Outlet/Journalist',
  media: 'Media Outlet/Journalist',
  radio: 'Radio/Podcast',
  label: 'Label/Management',
  other: 'Curator',
};

/* ── Deterministic color from name ── */
const COLORS = ['#dc2626','#7c3aed','#059669','#0284c7','#ea580c','#4f46e5','#0d9488','#be123c','#f59e0b','#6366f1'];
const nameColor = (name) => COLORS[Math.abs([...name].reduce((a,c) => a + c.charCodeAt(0), 0)) % COLORS.length];

/* ── Map DB curator to card format ── */
function mapCurator(c) {
  return {
    id: c.id,
    name: c.name,
    country: REGION_TO_CODE[c.region] || null,
    type: TYPE_LABEL[c.type] || c.type || 'Curator',
    color: nameColor(c.name),
    certified: false,
    shareRate: 0,
    followers: c.followers ? { total: c.followers } : {},
    genres: c.genres || [],
    genresOpen: c.accepts || [],
    moods: c.preferredMoods || [],
    tags: (c.tags || []).filter(t => t !== 'pending_review'),
    matchTags: [],
    opportunities: c.opportunities || [],
    similarTo: c.similarArtists || [],
    recentArtists: [],
    bio: c.bio || '',
    creditCost: c.creditCost || 2,
    openToAllGenres: c.openToAllGenres || false,
    iconUrl: c.iconUrl || null,
  };
}

/* ── Match score (genre overlap + shareRate bonus) ── */
const calcMatch = (curator, trackGenres) => {
  if (!trackGenres || trackGenres.length === 0) return null;
  const all = [...(curator.genres || []), ...(curator.genresOpen || [])];
  const overlap = trackGenres.filter(g =>
    all.some(cg => cg.toLowerCase() === g.toLowerCase())
  ).length;
  if (overlap === 0) return null;
  return Math.min(100, Math.round(overlap / trackGenres.length * 100 + (curator.shareRate || 0) * 0.5));
};

/* ── Avatar component ── */
function Avatar({ name, color, size = 48, iconUrl }) {
  if (iconUrl) {
    return <img src={iconUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />;
  }
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color}ee, ${color}99)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.35,
      fontFamily: T.font, letterSpacing: -0.5,
    }}>{initials}</div>
  );
}

/* ── Tag pill ── */
function Tag({ children, variant = 'default', small = false }) {
  const V = {
    default: { bg: T.borderLight, color: T.textSub,  bd: T.border       },
    match:   { bg: T.greenLight,  color: T.green,     bd: T.greenBorder  },
    accent:  { bg: T.accentLight, color: T.accent,    bd: T.accentBorder },
  };
  const s = V[variant] || V.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: small ? '2px 8px' : '4px 12px',
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`,
      borderRadius: 20, fontSize: small ? 11 : 12.5,
      fontWeight: 500, fontFamily: T.font, whiteSpace: 'nowrap',
    }}>
      {variant === 'match' && <span style={{ fontSize: small ? 9 : 11 }}>✓</span>}
      {children}
    </span>
  );
}

/* ── Section block ── */
function SectionBlock({ title, children }) {
  return (
    <div>
      <h3 style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  );
}

/* ── Curator Card ── */
function CuratorCard({ c, score, selected, onToggle, onDetail }) {
  const [hovered, setHovered] = useState(false);

  const scoreBg    = score >= 75 ? T.greenLight  : score >= 60 ? T.accentLight  : T.amberLight;
  const scoreBd    = score >= 75 ? T.greenBorder : score >= 60 ? T.accentBorder : '#fde68a';
  const scoreColor = score >= 75 ? T.green       : score >= 60 ? T.accent       : '#b45309';

  const totalFollowers = Object.values(c.followers || {}).reduce((a, b) => a + (b || 0), 0);

  return (
    <div
      onClick={() => onDetail(c)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.white,
        borderRadius: T.radiusLg,
        border: `1.5px solid ${selected ? T.accent : hovered ? T.accentBorder : T.border}`,
        padding: 24,
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: hovered ? T.shadowMd : T.shadow,
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <Avatar name={c.name} color={c.color} size={52} iconUrl={c.iconUrl} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: T.font, fontSize: 16, fontWeight: 700, color: T.text }}>{c.name}</span>
            {c.country && FL[c.country] && <span style={{ fontSize: 16 }}>{FL[c.country]}</span>}
          </div>
          <div style={{ fontSize: 12.5, color: T.textSub, fontFamily: T.font, marginTop: 2 }}>{c.type}</div>
        </div>
        {score != null && score >= 50 && (
          <div style={{
            width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
            background: scoreBg, border: `2px solid ${scoreBd}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, fontFamily: T.font, color: scoreColor,
          }}>{score}%</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {c.certified && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: T.green, fontFamily: T.font }}>
            ♫ Certified Spotify playlist
          </span>
        )}
        {(c.tags || []).slice(0, 2).map((tag, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: T.textSub, fontFamily: T.font }}>
            {tag.toLowerCase().includes('honest') ? '♡' : tag.toLowerCase().includes('sharing') || tag.toLowerCase().includes('accept') ? '👍' : tag.toLowerCase().includes('top') || tag.toLowerCase().includes('verified') ? '★' : '●'} {tag}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {(c.genres || []).slice(0, 4).map((g, i) => (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 10px', background: T.borderLight, color: T.textSub,
            border: `1px solid ${T.border}`, borderRadius: 20,
            fontSize: 12, fontWeight: 500, fontFamily: T.font, whiteSpace: 'nowrap',
          }}>{g}</span>
        ))}
        {(c.genres || []).length > 4 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 10px', background: T.borderLight, color: T.textSub,
            border: `1px solid ${T.border}`, borderRadius: 20,
            fontSize: 12, fontWeight: 500, fontFamily: T.font,
          }}>+{c.genres.length - 4}</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {c.followers?.spotify   && <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.font }}>♫ {fmt(c.followers.spotify)}</span>}
          {c.followers?.instagram && <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.font }}>📷 {fmt(c.followers.instagram)}</span>}
          {c.followers?.total && !c.followers?.spotify && <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.font }}>👥 {fmt(c.followers.total)}</span>}
          {!totalFollowers && <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.font }}>🎵 curator</span>}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onToggle(c.id); }}
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            fontFamily: T.font, borderRadius: T.radius, cursor: 'pointer',
            transition: 'all 0.15s',
            background: selected ? T.accent : 'transparent',
            color: selected ? '#fff' : T.textSub,
            border: `1.5px solid ${selected ? T.accent : T.border}`,
          }}
        >{selected ? 'Selected ✓' : 'Select'}</button>
      </div>
    </div>
  );
}

/* ── Curator Detail Modal ── */
function CuratorModal({ c, score, selected, onClose, onToggle }) {
  useEffect(() => {
    if (!c) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [c, onClose]);

  if (!c) return null;

  const scoreColor = score >= 75 ? T.green : score >= 60 ? T.accent : '#b45309';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        animation: 'overlayIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.white, borderRadius: T.radiusXl,
          maxWidth: 580, width: '100%', maxHeight: '88vh',
          boxShadow: T.shadowLg,
          animation: 'modalIn 0.25s cubic-bezier(0.16,1,0.3,1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '32px 32px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 20, flexShrink: 0 }}>
          <Avatar name={c.name} color={c.color} size={72} iconUrl={c.iconUrl} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: T.font, fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>{c.name}</h2>
              {c.country && FL[c.country] && <span style={{ fontSize: 20 }}>{FL[c.country]}</span>}
            </div>
            <div style={{ fontSize: 14, color: T.textSub, fontFamily: T.font, marginTop: 4 }}>{c.type}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              {Object.entries(c.followers || {}).map(([k, v]) => v ? (
                <span key={k} style={{ fontSize: 12, color: T.textSub, fontFamily: T.font }}>
                  {k === 'spotify' ? '♫' : k === 'instagram' ? '📷' : k === 'facebook' ? '👥' : k === 'total' ? '👥' : '🎬'} {fmt(v)}
                </span>
              ) : null)}
            </div>
            {c.certified && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
                padding: '4px 12px', background: T.greenLight, borderRadius: 12,
                fontSize: 12, fontWeight: 600, color: T.green, fontFamily: T.font,
              }}>♫ Certified Spotify playlist</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 24, color: T.textMuted, cursor: 'pointer', alignSelf: 'flex-start', lineHeight: 1, padding: 4, flexShrink: 0 }}
          >×</button>
        </div>

        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 28, overflowY: 'auto', flex: 1 }}>
          <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.75, fontFamily: T.font, margin: 0 }}>{c.bio}</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: T.bg, borderRadius: T.radius, border: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 13, color: T.textSub, fontFamily: T.font }}>Share rate</span>
            <span style={{ fontWeight: 700, fontSize: 22, color: T.accent, fontFamily: T.font }}>{c.shareRate}%</span>
            {score != null && (
              <>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 13, color: T.textSub, fontFamily: T.font }}>Match score</span>
                <span style={{ fontWeight: 700, fontSize: 22, color: scoreColor, fontFamily: T.font }}>{score}%</span>
              </>
            )}
          </div>

          {(c.matchTags || []).length > 0 && (
            <SectionBlock title="How well you match">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {c.matchTags.map((t, i) => <Tag key={i} variant="match">{t}</Tag>)}
              </div>
            </SectionBlock>
          )}

          {c.openToAllGenres && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(255,107,74,0.08)', borderRadius: 12, border: '1px solid rgba(255,107,74,0.2)', fontSize: 13, fontWeight: 600, color: '#FF6B4A', fontFamily: T.font }}>
              🌍 Open to all genres
            </div>
          )}

          <SectionBlock title="Genres accepted most often">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(c.genres || []).map((g, i) => <Tag key={i}>{g}</Tag>)}
            </div>
          </SectionBlock>

          {(c.genresOpen || []).length > 0 && (
            <SectionBlock title="Also open to receiving">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {c.genresOpen.map((g, i) => <Tag key={i} variant="accent">{g}</Tag>)}
              </div>
            </SectionBlock>
          )}

          {(c.similarTo || []).length > 0 && (
            <SectionBlock title="They want music similar to...">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {c.similarTo.map((a, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', background: T.bg, borderRadius: 20,
                    fontSize: 13, fontWeight: 500, color: T.text,
                    border: `1px solid ${T.border}`, fontFamily: T.font,
                  }}>🎤 {a}</span>
                ))}
              </div>
            </SectionBlock>
          )}

          {(c.moods || []).length > 0 && (
            <SectionBlock title="Moods they love">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {c.moods.map((m, i) => <Tag key={i}>{m}</Tag>)}
              </div>
            </SectionBlock>
          )}

          {(c.opportunities || []).length > 0 && (
            <SectionBlock title="Main opportunities">
              {c.opportunities.map((op, i) => (
                <div key={i} style={{
                  padding: '10px 14px', background: T.bg, borderRadius: T.radius,
                  marginBottom: 8, fontSize: 13.5, color: T.text,
                  fontFamily: T.font, border: `1px solid ${T.border}`,
                }}>{op}</div>
              ))}
            </SectionBlock>
          )}

          {(c.recentArtists || []).length > 0 && (
            <SectionBlock title="Recently gave opportunities to">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {c.recentArtists.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: T.bg,
                    borderRadius: T.radius, border: `1px solid ${T.border}`,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: T.accentLight, border: `1px solid ${T.accentBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>🎵</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.n}</div>
                      <div style={{ fontSize: 11, color: T.textMuted, fontFamily: T.font }}>{a.by}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionBlock>
          )}
        </div>

        <div style={{
          padding: '20px 32px', borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          background: T.white, flexShrink: 0,
          borderRadius: `0 0 ${T.radiusXl}px ${T.radiusXl}px`,
        }}>
          <button
            onClick={() => { onToggle(c.id); onClose(); }}
            style={{
              padding: '10px 24px', fontSize: 14, fontWeight: 600, fontFamily: T.font,
              background: selected ? T.accentLight : T.accent,
              color: selected ? T.accent : '#fff',
              border: `1.5px solid ${selected ? T.accentBorder : T.accent}`,
              borderRadius: T.radius, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >{selected ? 'Deselect' : 'Select'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Select styles ── */
const selStyle = {
  padding: '10px 16px',
  paddingRight: 36,
  borderRadius: T.radius,
  fontSize: 14,
  fontFamily: T.font,
  fontWeight: 500,
  cursor: 'pointer',
  outline: 'none',
  border: `1.5px solid ${T.border}`,
  background: T.white,
  color: T.text,
  appearance: 'none',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  backgroundSize: '12px',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%2394a3b8' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
};

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */
export default function CuratorsPage() {
  /* ── State ── */
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal] = useState(null);
  const [genreFilter, setGenreFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [lang, setLang] = useState('ja');
  const [curators, setCurators] = useState([]);
  const [loadingCurators, setLoadingCurators] = useState(true);

  /* ── Load locale from localStorage ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('otonami_locale');
      if (saved === 'ja' || saved === 'en') setLang(saved);
    } catch {}
  }, []);

  /* ── Fetch curators from DB ── */
  useEffect(() => {
    fetch('/api/curators/list')
      .then(r => r.json())
      .then(data => {
        setCurators((data.curators || []).map(mapCurator));
        setLoadingCurators(false);
      })
      .catch(() => setLoadingCurators(false));
  }, []);

  /* ── Toggle curator selection ── */
  const toggle = useCallback(id => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  /* ── Filtered curator list ── */
  const filtered = useMemo(() => {
    return curators
      .filter(c => {
        if (genreFilter && ![...(c.genres || []), ...(c.genresOpen || [])].includes(genreFilter)) return false;
        if (typeFilter && c.type !== typeFilter) return false;
        if (searchQ && !c.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
        return true;
      })
      .map(c => ({ ...c, matchScore: calcMatch(c, []) }));
  }, [curators, genreFilter, typeFilter, searchQ]);

  const hasFilters = genreFilter || typeFilter || searchQ;

  /* ── Start Campaign handler ── */
  const handleStartCampaign = useCallback(() => {
    sessionStorage.setItem('otonami_selected_curators', JSON.stringify([...selected]));
    window.location.href = '/studio';
  }, [selected]);

  /* ── Nav links ── */
  const navLinks = [
    { href: '/',         label: lang === 'ja' ? '使い方'              : 'How It Works'   },
    { href: '/curators', label: lang === 'ja' ? 'キュレーターを探す'  : 'Find Curators'  },
    { href: '/studio',   label: lang === 'ja' ? 'アーティストの方'    : 'For Artists'    },
  ];

  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.font }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .nav-center { display: none !important; }
          .filter-bar { flex-direction: column !important; }
          .filter-bar select, .filter-bar input { width: 100% !important; }
          .curator-grid { grid-template-columns: 1fr !important; }
        }
        input:focus, select:focus { border-color: ${T.accent} !important; outline: none; }
      `}</style>

      {/* ── Curator Modal ── */}
      {modal && (
        <CuratorModal
          c={modal}
          score={calcMatch(modal, [])}
          selected={selected.has(modal.id)}
          onClose={() => setModal(null)}
          onToggle={toggle}
        />
      )}

      {/* ── Site Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.border}`,
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <svg width="36" height="36" viewBox="0 0 40 40" style={{ flexShrink: 0 }}><circle cx="20" cy="20" r="16" fill="none" stroke="#FF6B4A" strokeWidth="5"/><g style={{clipPath:'circle(32.5% at 50% 50%)'}} fill="#FF6B4A"><rect x="8" y="17" width="2" height="6" rx="1"/><rect x="12" y="14" width="2" height="12" rx="1"/><rect x="16" y="11" width="2" height="18" rx="1"/><rect x="20" y="8" width="2" height="24" rx="1"/><rect x="24" y="11" width="2" height="18" rx="1"/><rect x="28" y="14" width="2" height="12" rx="1"/><rect x="32" y="17" width="2" height="6" rx="1"/></g></svg>
            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '3px', color: '#1a1a1a' }}>OTONAMI</span>
          </a>
          <nav className="nav-center" style={{ display: 'flex', gap: 4 }}>
            {navLinks.map((item) => {
              const isActive = item.href === '/curators';
              return (
                <a key={item.href} href={item.href} style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: isActive ? 600 : 500,
                  textDecoration: 'none', fontFamily: T.font,
                  background: isActive ? T.accentLight : 'transparent',
                  color: isActive ? T.accent : T.textSub,
                }}>{item.label}</a>
              );
            })}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.border}` }}>
            {['EN','JP'].map(l => (
              <button key={l} onClick={() => { const v = l==='JP'?'ja':'en'; setLang(v); try{localStorage.setItem('otonami_locale',v);}catch{} }} style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 600, fontFamily: T.font, border: 'none', cursor: 'pointer',
                background: (l==='JP'?lang==='ja':lang==='en') ? T.text : 'transparent',
                color:      (l==='JP'?lang==='ja':lang==='en') ? '#fff' : T.textSub,
              }}>{l==='JP'?'日本語':l}</button>
            ))}
          </div>
          <a href="/curator" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, background: T.accent, color: '#fff', borderRadius: T.radius, textDecoration: 'none', fontFamily: T.font }}>
            {lang==='ja'?'キュレーター登録':'Join as Curator'}
          </a>
        </div>
      </header>

      {/* ── Page Content ── */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '48px 24px 160px' }}>

        {/* ── Page Title ── */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{
            fontFamily: T.fontDisplay, fontSize: 38, fontWeight: 700,
            color: T.text, letterSpacing: -0.5, marginBottom: 12,
            lineHeight: 1.2,
          }}>
            キュレーター一覧 / Curator Network
          </h1>
          <p style={{ fontSize: 16, color: T.textSub, fontFamily: T.font, maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            {lang === 'ja'
              ? '世界中のプレイリストキュレーター・音楽メディアを探して、あなたの音楽を届けよう。'
              : 'Discover playlist curators and music media outlets worldwide. Select curators and start your campaign.'}
          </p>
        </div>

        {/* ── Stats hint bar ── */}
        <div style={{
          display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center',
          marginBottom: 36, flexWrap: 'wrap',
        }}>
          {[
            { icon: '🌍', label: lang === 'ja' ? '14カ国以上のキュレーター' : '14+ curators worldwide' },
            { icon: '♫',  label: lang === 'ja' ? 'Spotifyプレイリスト収録' : 'Spotify playlists included' },
            { icon: '📰', label: lang === 'ja' ? 'メディア・ブログ多数'   : 'Media & blogs coverage'  },
            { icon: '✓',  label: lang === 'ja' ? '審査済みのキュレーター' : 'Vetted curators only'    },
          ].map((stat, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', background: T.white,
              border: `1px solid ${T.border}`, borderRadius: T.radiusLg,
              fontSize: 13, color: T.textSub, fontFamily: T.font,
              boxShadow: T.shadow,
            }}>
              <span style={{ fontSize: 16 }}>{stat.icon}</span>
              {stat.label}
            </div>
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <div className="filter-bar" style={{
          display: 'flex', gap: 12, alignItems: 'center',
          marginBottom: 28, flexWrap: 'wrap',
          padding: '18px 20px',
          background: T.white, borderRadius: T.radiusLg,
          border: `1px solid ${T.border}`, boxShadow: T.shadow,
        }}>
          <select
            value={genreFilter}
            onChange={e => setGenreFilter(e.target.value)}
            style={{ ...selStyle, minWidth: 170 }}
          >
            <option value="">{lang === 'ja' ? 'すべてのジャンル' : 'All Genres'}</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ ...selStyle, minWidth: 180 }}
          >
            <option value="">{lang === 'ja' ? 'すべてのタイプ' : 'All Types'}</option>
            {CURATOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <input
            type="text"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder={lang === 'ja' ? 'キュレーター名で検索…' : 'Search by name…'}
            style={{
              flex: 1, minWidth: 180, padding: '10px 16px',
              borderRadius: T.radius, fontSize: 14, fontFamily: T.font,
              border: `1.5px solid ${T.border}`, background: T.white,
              color: T.text, outline: 'none',
            }}
          />

          {hasFilters && (
            <button
              onClick={() => { setGenreFilter(''); setTypeFilter(''); setSearchQ(''); }}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 600,
                fontFamily: T.font, border: `1.5px solid ${T.border}`,
                borderRadius: T.radius, background: T.borderLight,
                color: T.textSub, cursor: 'pointer',
              }}
            >{lang === 'ja' ? 'クリア' : 'Clear'}</button>
          )}

          <span style={{ fontSize: 13, color: T.textMuted, fontFamily: T.font, marginLeft: 'auto' }}>
            {filtered.length}{lang === 'ja' ? '件' : ' curators'}
          </span>
        </div>

        {/* ── Curator Grid ── */}
        {loadingCurators ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${T.border}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: 14, color: T.textMuted, fontFamily: T.font }}>{lang === 'ja' ? 'キュレーターを読み込み中...' : 'Loading curators...'}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            background: T.white, borderRadius: T.radiusLg,
            border: `1px solid ${T.border}`,
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <p style={{ fontSize: 16, color: T.textSub, fontFamily: T.font }}>
              {lang === 'ja' ? '条件に合うキュレーターが見つかりませんでした。' : 'No curators found matching your filters.'}
            </p>
          </div>
        ) : (
          <div className="curator-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {filtered.map(c => (
              <CuratorCard
                key={c.id}
                c={c}
                score={c.matchScore}
                selected={selected.has(c.id)}
                onToggle={toggle}
                onDetail={setModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Sticky Bottom Bar ── */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)',
          borderTop: `1px solid ${T.accentBorder}`,
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 -4px 24px rgba(14,165,233,0.12)',
          animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: T.accentGrad,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 16, fontFamily: T.font,
            }}>{selected.size}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.font }}>
                {selected.size}{lang === 'ja' ? '名を選択中' : selected.size === 1 ? ' curator selected' : ' curators selected'}
              </div>
              <div style={{ fontSize: 12, color: T.textSub, fontFamily: T.font, marginTop: 2 }}>
                {lang === 'ja' ? 'キャンペーンを開始してピッチを送ろう' : 'Start a campaign to pitch your music'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => setSelected(new Set())}
              style={{
                padding: '10px 18px', fontSize: 13, fontWeight: 600,
                fontFamily: T.font, border: `1.5px solid ${T.border}`,
                borderRadius: T.radius, background: 'transparent',
                color: T.textSub, cursor: 'pointer',
              }}
            >{lang === 'ja' ? '選択解除' : 'Clear'}</button>
            <button
              onClick={handleStartCampaign}
              style={{
                padding: '12px 28px', fontSize: 15, fontWeight: 700,
                fontFamily: T.font, border: 'none',
                borderRadius: T.radius, background: T.accentGrad,
                color: '#fff', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(14,165,233,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(14,165,233,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(14,165,233,0.35)'; }}
            >
              {lang === 'ja' ? 'キャンペーン開始 →' : 'Start Campaign →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
