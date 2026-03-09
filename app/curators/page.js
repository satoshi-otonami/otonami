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

/* ── Demo curators (from docs/otonami-redesign.jsx + OTONAMI seeds) ── */
const DEMO_CURATORS = [
  {
    id:"dc_1", name:"Bizarreland Radio", country:"CL", type:"Playlist Curator", color:"#dc2626",
    certified:true, shareRate:7, followers:{spotify:18400,instagram:335000,facebook:22000,youtube:49},
    genres:["Dance music","Jazz fusion","Instrumental"],
    genresOpen:["Afrobeat","Lo-fi Hip Hop","Electronic"],
    moods:["Authentic","Eclectic","Creative","Danceable","Downbeat","Engaged"],
    tags:["Honest","High Impact"],
    matchTags:["Dance music","Jazz fusion","Japanese artists","Instrumental/Without lyrics","Released tracks"],
    opportunities:["Add artists to my impactful playlist(s)","Create post or reel on social media","Add to story on social media"],
    similarTo:["Snoop Dogg","Wiz Khalifa","SFDK","Mucho Muchacho"],
    recentArtists:[{n:"Burning Linga",by:"Maicky Miller"},{n:"The Quease",by:"Robin Mullarkey"},{n:"Outside",by:"just martin"},{n:"Last Night",by:"Rodney Hazard"}],
    bio:"My radio/playlist have a lot of style, but the most important is the attitude and the skills.", creditCost:2,
  },
  {
    id:"dc_2", name:"Liminal Waves", country:"NL", type:"Playlist Curator", color:"#7c3aed",
    certified:false, shareRate:12, followers:{spotify:5200},
    genres:["Film music","Instrumental","Ambient"],
    genresOpen:["Experimental","Minimal"],
    moods:["Atmospheric","Contemplative","Cinematic"],
    tags:["Honest"],
    matchTags:["Film music","Instrumental","Ambient","Japanese artists"],
    opportunities:["Add artists to my impactful playlist(s)"],
    similarTo:[], recentArtists:[],
    bio:"Curating music for introspective moments. Always looking for unique soundscapes.", creditCost:2,
  },
  {
    id:"dc_3", name:"FusioNostalgia", country:"US", type:"Media Outlet/Journalist", color:"#059669",
    certified:false, shareRate:18, followers:{instagram:12000},
    genres:["Dance music","Jazz fusion","Instrumental","Disco"],
    genresOpen:["Indie pop","Funk","Neo soul"],
    moods:["Groovy","Energetic","Nostalgic"],
    tags:["High sharing rate","Shared 1 of your tracks"],
    matchTags:["Jazz fusion","Dance music","Instrumental","Japanese artists"],
    opportunities:["Feature in online magazine","Social media post"],
    similarTo:["Herbie Hancock","Tower of Power","Snarky Puppy"],
    recentArtists:[],
    bio:"Covering the intersection of jazz, funk, and electronic music worldwide.", creditCost:3,
  },
  {
    id:"dc_4", name:"Gamadeus Playlist", country:"IT", type:"Playlist Curator", color:"#0284c7",
    certified:true, shareRate:15, followers:{spotify:8900},
    genres:["Film music","Instrumental","Ambient","Electronic"],
    genresOpen:["Minimal","Neo/Modern Classical","Solo Piano"],
    moods:["Minimal","Contemplative","Dreamy"],
    tags:["Honest","A Quick Sharer"],
    matchTags:["Film music","Instrumental","Ambient","Cinematic"],
    opportunities:["Add artists to my impactful playlist(s)"],
    similarTo:["Nils Frahm","Max Richter","Ólafur Arnalds"],
    recentArtists:[],
    bio:"A certified playlist focused on cinematic and atmospheric sounds.", creditCost:2,
  },
  {
    id:"dc_5", name:"Italian Summer Aesthetic", country:"IT", type:"Playlist Curator", color:"#ea580c",
    certified:false, shareRate:22, followers:{spotify:24000,instagram:8500},
    genres:["Film music","Instrumental","Modern jazz"],
    genresOpen:["Dream pop","Indie folk","City pop"],
    moods:["Warm","Romantic","Breezy"],
    tags:["Honest","High Impact","Top curator/pro"],
    matchTags:["Film music","Instrumental","Modern jazz","Japanese artists"],
    opportunities:["Add artists to my impactful playlist(s)","Add to story on social media"],
    similarTo:["Nicola Cruz","Khruangbin","Flamingosis"],
    recentArtists:[],
    bio:"Curating the perfect soundtrack for golden hour moments.", creditCost:3,
  },
  {
    id:"dc_6", name:"Max Panasiuk", country:"UA", type:"Playlist Curator", color:"#4f46e5",
    certified:false, shareRate:9, followers:{spotify:3200},
    genres:["Film music","Instrumental"],
    genresOpen:["Chill/Lo-fi Hip-Hop","Electropop"],
    moods:["Chill","Energetic","Groovy"],
    tags:["Honest"],
    matchTags:["Film music","Instrumental","Japanese artists"],
    opportunities:["Add artists to my impactful playlist(s)"],
    similarTo:[], recentArtists:[],
    bio:"Ukrainian curator open to global sounds.", creditCost:2,
  },
  {
    id:"dc_7", name:"Island Music", country:"IT", type:"Playlist Curator", color:"#0d9488",
    certified:false, shareRate:25, followers:{spotify:14500},
    genres:["Dance music","Film music","Instrumental"],
    genresOpen:["Ambient","Chill out","Classical music"],
    moods:["Relaxing","Uplifting","Tropical"],
    tags:["High sharing rate"],
    matchTags:["Dance music","Film music","Instrumental"],
    opportunities:["Add artists to my impactful playlist(s)"],
    similarTo:["Bonobo","Floating Points","Maribou State"],
    recentArtists:[],
    bio:"Island vibes and global grooves. High sharing rate.", creditCost:2,
  },
  {
    id:"dc_8", name:"Hot Monkey Music", country:"AU", type:"Playlist Curator", color:"#be123c",
    certified:false, shareRate:11, followers:{spotify:31000,instagram:15000},
    genres:["Dance music","Bass music","Deep house"],
    genresOpen:["House music","Tech House"],
    moods:["Energetic","Danceable","Bold"],
    tags:["Honest","Clear about their musical style","Top curator/pro"],
    matchTags:["Dance music","Japanese artists"],
    opportunities:["Add artists to my impactful playlist(s)"],
    similarTo:["Fisher","Chris Lake","Skrillex"],
    recentArtists:[],
    bio:"Australia's go-to curator for dance, bass, and groove.", creditCost:3,
  },
  /* ── OTONAMI seed curators ── */
  {
    id:"c_pstm", name:"Patrick St. Michel", country:"US", type:"Media Outlet/Journalist", color:"#7c3aed",
    certified:false, shareRate:15, followers:{spotify:28000},
    genres:["Electronic","Jazz","Funk","Ambient","Experimental"],
    genresOpen:["Post-rock","Noise pop"],
    moods:["Sophisticated","Experimental","Eclectic"],
    tags:["Verified","High quality FB"],
    matchTags:["Japanese artists","Electronic","Jazz","Experimental","Independent releases"],
    opportunities:["Review on Make Believe Melodies","Newsletter feature","Bandcamp Daily recommendation"],
    similarTo:["Cornelius","Foodman","Seiho"],
    recentArtists:[{n:"Awesome City Club",by:"AWCC"},{n:"Tohji",by:"独立"}],
    bio:"東京在住のアメリカ人音楽ライター。2009年よりMake Believe Melodiesを運営。Japan Times, Pitchfork, Bandcamp Daily寄稿。日本の電子音楽・実験音楽に特化。", creditCost:3,
  },
  {
    id:"c_leap", name:"Leap250", country:"JP", type:"Media Outlet/Journalist", color:"#059669",
    certified:false, shareRate:10, followers:{spotify:5000},
    genres:["J-Rock","Indie Rock","Pop","Dream Pop","J-Pop"],
    genresOpen:["Math Rock","Shoegaze","Emo"],
    moods:["Dreamy","Nostalgic","Energetic","Indie"],
    tags:["High answer rate","High quality FB"],
    matchTags:["J-Music","Indie Rock","Dream Pop","Japanese artists","International appeal"],
    opportunities:["J-Music Monthly Roundup feature","Spotify playlist add","Blog review"],
    similarTo:["くるり","eastern youth","Homecomings"],
    recentArtists:[],
    bio:"J-Music Monthly Roundup運営。毎月の日本音楽レコメンデーション。Spotify J-Music Playlist Draft主催。英語圏向けに日本インディーを紹介。", creditCost:2,
  },
  {
    id:"c_ian", name:"Ian Martin", country:"UK", type:"Media Outlet/Journalist", color:"#dc2626",
    certified:false, shareRate:8, followers:{},
    genres:["Noise","Indie Rock","Experimental","Punk","Post-Punk"],
    genresOpen:["Math Rock","Art Rock","No Wave"],
    moods:["Aggressive","Experimental","Heavy","Raw"],
    tags:["Verified","Selective"],
    matchTags:["Japanese underground","Noise","Experimental","Punk","Independent labels"],
    opportunities:["Review on Clear And Refreshing","Call And Response Records interest","Live booking connection"],
    similarTo:["Melt-Banana","Bo Ningen","Otoboke Beaver"],
    recentArtists:[],
    bio:"東京在住の英国人ライター。Call And Response Records主宰。著書『Quit Your Band』。日本地下音楽シーンに特化した唯一無二の視点。", creditCost:2,
  },
  {
    id:"c_mrk", name:"mMarukudeibu", country:"JP", type:"Playlist Curator", color:"#0284c7",
    certified:true, shareRate:20, followers:{spotify:34800},
    genres:["Jazz","Fusion","Funk","City Pop"],
    genresOpen:["Soul","R&B","Groove"],
    moods:["Groovy","Sophisticated","Smooth","Energetic"],
    tags:["High accept rate"],
    matchTags:["Jazz fusion","City Pop","Japanese artists","Funk","Instrumental"],
    opportunities:["Add to Japanese Jazz Fusion playlist (34.8k saves)","Featured artist slot"],
    similarTo:["T-Square","Casiopea","Soil & Pimp Sessions"],
    recentArtists:[{n:"ROUTE14band",by:"ROUTE14band"},{n:"WONK",by:"WONK"}],
    bio:"Spotify最大級の日本ジャズフュージョンプレイリスト。34,800+ saves。日本のジャズ・ファンク・シティポップを世界に届けるキュレーター。", creditCost:3,
  },
  {
    id:"c_jame", name:"JaME World", country:"JP", type:"Media Outlet/Journalist", color:"#f59e0b",
    certified:false, shareRate:12, followers:{},
    genres:["J-Pop","J-Rock","Visual Kei","Anime"],
    genresOpen:["K-Pop","Asian Pop","Electronic"],
    moods:["Energetic","Dramatic","Heavy","Indie"],
    tags:["High answer rate"],
    matchTags:["J-Pop","J-Rock","Visual Kei","Japanese artists","International audience"],
    opportunities:["Review","Interview","News Feature","Artist spotlight"],
    similarTo:["BABYMETAL","ONE OK ROCK","Kenshi Yonezu"],
    recentArtists:[],
    bio:"多言語対応の日本音楽エンターテイメントメディア。インタビュー、レビュー、ニュース。欧米・アジア向けに日本音楽を発信。", creditCost:3,
  },
  {
    id:"c_yama", name:"Yamashita Satoshi", country:"JP", type:"Playlist Curator", color:"#0d9488",
    certified:true, shareRate:18, followers:{spotify:8500},
    genres:["Jazz","Funk","Latin","Soul","Fusion"],
    genresOpen:["Afrobeat","Brazilian","Groove"],
    moods:["Groovy","Energetic","Latin","Soulful"],
    tags:["High accept rate","Verified"],
    matchTags:["Jazz","Funk","Latin","Japanese artists","SXSW alumni"],
    opportunities:["Jazz & Funk Japan playlist add","Featured artist spotlight","SXSW network introduction"],
    similarTo:["Hiromi","Makoto Ozone","Snarky Puppy"],
    recentArtists:[{n:"ROUTE14band",by:"ROUTE14band"},{n:"Chihiro Yamazaki",by:"山崎千裕"}],
    bio:"東京のジャズ・ファンク・ラテン専門プレイリストキュレーター。SXSW常連アーティストを中心に厳選。Jazz & Funk Japan（8,500 saves）運営。", creditCost:2,
  },
];

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
function Avatar({ name, color, size = 48 }) {
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
      {/* Top row: avatar + name + flag + match score */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <Avatar name={c.name} color={c.color} size={52} />
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

      {/* Certified + tags */}
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

      {/* Genre pills */}
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

      {/* Bottom row: followers + add button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {c.followers?.spotify   && <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.font }}>♫ {fmt(c.followers.spotify)}</span>}
          {c.followers?.instagram && <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.font }}>📷 {fmt(c.followers.instagram)}</span>}
          {!totalFollowers && <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.font }}>🎵 curator</span>}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onToggle(c.id); }}
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            fontFamily: T.font, borderRadius: T.radius, cursor: 'pointer',
            transition: 'all 0.15s',
            background: selected ? T.accentLight : 'transparent',
            color: selected ? T.accent : T.textSub,
            border: `1.5px solid ${selected ? T.accentBorder : T.border}`,
          }}
        >{selected ? 'Added ✓' : `Add for ${c.creditCost || 2} ©`}</button>
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
        {/* ── Header ── */}
        <div style={{ padding: '32px 32px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 20, flexShrink: 0 }}>
          <Avatar name={c.name} color={c.color} size={72} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: T.font, fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>{c.name}</h2>
              {c.country && FL[c.country] && <span style={{ fontSize: 20 }}>{FL[c.country]}</span>}
            </div>
            <div style={{ fontSize: 14, color: T.textSub, fontFamily: T.font, marginTop: 4 }}>{c.type}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              {Object.entries(c.followers || {}).map(([k, v]) => v ? (
                <span key={k} style={{ fontSize: 12, color: T.textSub, fontFamily: T.font }}>
                  {k === 'spotify' ? '♫' : k === 'instagram' ? '📷' : k === 'facebook' ? '👥' : '🎬'} {fmt(v)}
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

        {/* ── Scrollable body ── */}
        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 28, overflowY: 'auto', flex: 1 }}>
          {/* Bio */}
          <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.75, fontFamily: T.font, margin: 0 }}>{c.bio}</p>

          {/* Share rate + match score */}
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

          {/* How well you match */}
          {(c.matchTags || []).length > 0 && (
            <SectionBlock title="How well you match">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {c.matchTags.map((t, i) => <Tag key={i} variant="match">{t}</Tag>)}
              </div>
            </SectionBlock>
          )}

          {/* Genres accepted */}
          <SectionBlock title="Genres accepted most often">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(c.genres || []).map((g, i) => <Tag key={i}>{g}</Tag>)}
            </div>
          </SectionBlock>

          {/* Also open to */}
          {(c.genresOpen || []).length > 0 && (
            <SectionBlock title="Also open to receiving">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {c.genresOpen.map((g, i) => <Tag key={i} variant="accent">{g}</Tag>)}
              </div>
            </SectionBlock>
          )}

          {/* Similar to */}
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

          {/* Moods */}
          {(c.moods || []).length > 0 && (
            <SectionBlock title="Moods they love">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {c.moods.map((m, i) => <Tag key={i}>{m}</Tag>)}
              </div>
            </SectionBlock>
          )}

          {/* Opportunities */}
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

          {/* Recently gave opportunities to */}
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

        {/* ── Sticky footer ── */}
        <div style={{
          padding: '20px 32px', borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: T.white, flexShrink: 0,
          borderRadius: `0 0 ${T.radiusXl}px ${T.radiusXl}px`,
        }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, fontFamily: T.font, background: 'transparent', color: T.textSub, border: `1.5px solid ${T.border}`, borderRadius: T.radius, cursor: 'pointer' }}
          >View similar curators</button>
          <button
            onClick={() => onToggle(c.id)}
            style={{
              padding: '10px 24px', fontSize: 14, fontWeight: 600, fontFamily: T.font,
              background: selected ? T.accentLight : T.accent,
              color: selected ? T.accent : '#fff',
              border: `1.5px solid ${selected ? T.accentBorder : T.accent}`,
              borderRadius: T.radius, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >{selected ? 'Added ✓' : `Add for ${c.creditCost || 2} ©`}</button>
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

/* ── Main Page ── */
export default function CuratorsPage() {
  const [curators, setCurators]   = useState(DEMO_CURATORS);
  const [selected, setSelected]   = useState(new Set());
  const [modal, setModal]         = useState(null);
  const [genreFilter, setGenreFilter] = useState('');
  const [typeFilter, setTypeFilter]   = useState('');
  const [searchQ, setSearchQ]         = useState('');
  const [trackGenres, setTrackGenres] = useState([]);
  const [lang, setLang]           = useState('ja');

  /* Load locale + track data from localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('otonami_locale');
      if (saved === 'ja' || saved === 'en') setLang(saved);
      /* Track genre context for match scores */
      const td = localStorage.getItem('otonami-track-data');
      if (td) {
        const parsed = JSON.parse(td);
        const g = parsed.genre || '';
        if (g) setTrackGenres(g.split(',').map(s => s.trim()).filter(Boolean));
      }
    } catch {}
  }, []);

  /* Attempt Supabase fetch and merge */
  useEffect(() => {
    (async () => {
      try {
        const { loadCurators } = await import('@/lib/db');
        const data = await loadCurators();
        if (!data || data.length === 0) return;
        /* Merge: Supabase curators override demo curators with same id */
        const adapted = data.map(c => ({
          id: c.id,
          name: c.name,
          country: c.region?.includes('JP') ? 'JP' : 'US',
          type: c.type === 'playlist' ? 'Playlist Curator'
               : c.type === 'blog'    ? 'Media Outlet/Journalist'
               : c.type === 'radio'   ? 'Radio/Podcast'
               : c.type === 'label'   ? 'Label/Management'
               : c.type || 'Playlist Curator',
          color: ['#0284c7','#7c3aed','#059669','#dc2626','#0d9488','#ea580c','#4f46e5'][Math.abs(c.id.charCodeAt?.(0) || 0) % 7],
          certified: (c.tags || []).includes('verified'),
          shareRate: 10,
          followers: typeof c.followers === 'number' ? { spotify: c.followers } : (c.followers || {}),
          genres: c.genres || [],
          genresOpen: [],
          tags: c.tags || [],
          bio: c.bio || '',
          creditCost: c.creditCost || 2,
        }));
        const existingIds = new Set(DEMO_CURATORS.map(d => d.id));
        const newOnes = adapted.filter(c => !existingIds.has(c.id));
        if (newOnes.length > 0) setCurators(prev => [...prev, ...newOnes]);
      } catch { /* silently fall back to DEMO_CURATORS */ }
    })();
  }, []);

  const toggle = useCallback(id => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const hasFilters = genreFilter || typeFilter || searchQ;

  const filtered = useMemo(() => {
    return curators
      .filter(c => {
        if (genreFilter && ![...(c.genres || []), ...(c.genresOpen || [])].includes(genreFilter)) return false;
        if (typeFilter && c.type !== typeFilter) return false;
        if (searchQ && !c.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
        return true;
      })
      .map(c => ({ ...c, matchScore: calcMatch(c, trackGenres) }))
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }, [curators, genreFilter, typeFilter, searchQ, trackGenres]);

  const totalCost = selected.size * 2; // approx

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
        @media (max-width: 768px) {
          .nav-center { display: none !important; }
          .filter-bar { flex-direction: column !important; }
          .filter-bar select, .filter-bar input { width: 100% !important; }
        }
      `}</style>

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
            <div style={{ width: 34, height: 34, borderRadius: 10, background: T.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17 }}>O</div>
            <span style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 700, color: T.accent, letterSpacing: -0.3 }}>OTONAMI</span>
          </a>
          <nav className="nav-center" style={{ display: 'flex', gap: 4 }}>
            {[{href:'/',label: lang==='ja'?'使い方':'How It Works'},{href:'/curators',label:lang==='ja'?'キュレーターを探す':'Find Curators'},{href:'/studio',label:lang==='ja'?'アーティストの方':'For Artists'}].map(item => (
              <a key={item.href} href={item.href} style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                textDecoration: 'none', fontFamily: T.font, color: T.textSub,
                background: item.href === '/curators' ? T.accentLight : 'transparent',
                color: item.href === '/curators' ? T.accent : T.textSub,
              }}>{item.label}</a>
            ))}
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

      {/* ── Page content ── */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px 120px' }}>

        {/* Page header */}
        <h1 style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 700, color: T.text, marginBottom: 6 }}>
          {filtered.length.toLocaleString()} curators &amp; pros
        </h1>
        <p style={{ fontSize: 14, color: T.textSub, fontFamily: T.font, marginBottom: 28 }}>
          {lang === 'ja'
            ? '50件以上に送るアーティストが最も良い結果を得ています'
            : 'Artists who send to 50+ curators get the best results'}
        </p>

        {/* Filter bar */}
        <div className="filter-bar" style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={genreFilter}
            onChange={e => setGenreFilter(e.target.value)}
            style={{ ...selStyle, ...(genreFilter ? { borderColor: T.accent, background: T.accentLight, color: T.accent } : {}) }}
          >
            <option value="">Genres</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ ...selStyle, ...(typeFilter ? { borderColor: T.accent, background: T.accentLight, color: T.accent } : {}) }}
          >
            <option value="">Curator/Pro Types</option>
            {CURATOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              type="text"
              placeholder="Search curators..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              style={{
                width: '100%', padding: '10px 16px', borderRadius: T.radius,
                border: `1.5px solid ${searchQ ? T.accent : T.border}`,
                fontSize: 14, fontFamily: T.font, outline: 'none',
                background: T.white, color: T.text,
              }}
            />
          </div>

          {hasFilters && (
            <button
              onClick={() => { setGenreFilter(''); setTypeFilter(''); setSearchQ(''); }}
              style={{ fontSize: 13, color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.font, fontWeight: 600, whiteSpace: 'nowrap' }}
            >Clear filters</button>
          )}
        </div>

        {/* Stats hint bar */}
        <div style={{
          display: 'inline-flex', gap: 20, marginBottom: 28,
          padding: '14px 24px', background: T.accentLight,
          borderRadius: T.radiusLg, border: `1px solid ${T.accentBorder}`,
          alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, color: T.accent, fontFamily: T.font, fontWeight: 500 }}>
            💡 {lang === 'ja' ? '50件以上に送るアーティストが最も良い結果を得ています' : 'Artists who send to 50+ curators get the best results'}
          </span>
          <div style={{ display: 'flex', gap: 16 }}>
            {[{n:50,p:60,c:"#fbbf24"},{n:100,p:72,c:"#fb923c"},{n:"200+",p:93,c:T.green}].map((x,i) => (
              <div key={i} style={{ textAlign: 'center', minWidth: 48 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: x.c, fontFamily: T.font }}>{x.p}%</div>
                <div style={{ fontSize: 10, color: T.textMuted, fontFamily: T.font, marginTop: 2 }}>{x.n} pros</div>
              </div>
            ))}
            <span style={{ fontSize: 13, color: T.textSub, fontFamily: T.font, alignSelf: 'center', marginLeft: 4 }}>success rate</span>
          </div>
        </div>

        {/* Curator grid */}
        {filtered.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 20 }}>
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
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontFamily: T.font, fontSize: 15 }}>
            No curators match your filters.
          </div>
        )}
      </div>

      {/* ── Sticky bottom bar (shown when something selected) ── */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${T.border}`,
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 200,
        }}>
          <div style={{ fontFamily: T.font, fontSize: 14 }}>
            <span style={{ fontWeight: 700, color: T.accent }}>{selected.size} selected</span>
            <span style={{ color: T.textMuted }}> • {totalCost} credits</span>
          </div>
          <a
            href="/studio"
            style={{
              padding: '12px 28px', fontSize: 14, fontWeight: 600,
              background: T.accent, color: '#fff', borderRadius: T.radius,
              textDecoration: 'none', fontFamily: T.font,
              boxShadow: '0 4px 16px rgba(14,165,233,0.3)',
            }}
          >Next step →</a>
        </div>
      )}

      {/* ── Detail Modal ── */}
      <CuratorModal
        c={modal}
        score={modal ? calcMatch(modal, trackGenres) : null}
        selected={modal ? selected.has(modal.id) : false}
        onClose={() => setModal(null)}
        onToggle={toggle}
      />
    </div>
  );
}
