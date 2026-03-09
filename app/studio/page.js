'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { T } from '@/lib/design-tokens';
import { analyzeTrack } from '@/lib/api-track';

/* ── Country flags ── */
const FL = {
  US:"🇺🇸", UK:"🇬🇧", JP:"🇯🇵", DE:"🇩🇪", FR:"🇫🇷",
  NL:"🇳🇱", AU:"🇦🇺", CL:"🇨🇱", IT:"🇮🇹", UA:"🇺🇦",
  KR:"🇰🇷", BR:"🇧🇷", SE:"🇸🇪", CA:"🇨🇦", MX:"🇲🇽",
};

const fmt = n => n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"k" : String(n);

const ARTIST_GENRES = [
  "Jazz","Funk","Latin","Soul","R&B","Pop","Indie Rock","Alt Rock","Electronic",
  "Ambient","Hip-Hop","Classical","Folk","Country","Metal","Punk","J-Pop","J-Rock",
  "Experimental","World Music","City Pop","Neo-Soul","Instrumental","Fusion",
  "Shoegaze","Dream Pop",
];

const GENRES = [
  "Jazz","Jazz fusion","Funk","Latin jazz","Fusion","City Pop",
  "Soul","Neo soul","R&B","Instrumental","Dance music","Film music",
  "Modern jazz","Ambient","Chill out","Lo-fi Hip Hop","Lo-Fi",
  "Electronic","Experimental","Indie pop","Indie Rock","Alt Rock",
  "J-pop","J-Rock","City pop","Pop","Noise","Post Rock","Dream Pop",
  "Hip-Hop","Afrobeat","World music","Prog","Punk","Visual Kei","Anime",
];

const CURATOR_TYPES = [
  "Playlist Curator",
  "Media Outlet/Journalist",
  "Radio/Podcast",
  "Label/Management",
];

const FEEDBACK_BANK = {
  positive: [
    "Love the sound! Adding to the playlist right away.",
    "This fits perfectly with our playlist.",
    "Incredible energy — added immediately!",
    "Refreshing sound from Japan! Added.",
  ],
  negative: [
    "Good track but doesn't fit our current direction.",
    "Quality production but not the right match right now.",
    "Interesting sound, but outside our playlist focus.",
  ],
};

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

const DEMO_CAMPAIGNS = [
  { id:1, curatorName:'mMarukudeibu', track:'Moment', status:'accepted', response:'Great jazz fusion sound! Adding to Jazz & Funk Japan playlist.', date:'2026-03-01', color:'#0284c7' },
  { id:2, curatorName:'Bizarreland Radio', track:'Moment', status:'accepted', response:'Love the energy! Added to our eclectic mix.', date:'2026-03-02', color:'#dc2626' },
  { id:3, curatorName:'FusioNostalgia', track:'Moment', status:'listened', response:'', date:'2026-03-03', color:'#059669' },
  { id:4, curatorName:'Italian Summer Aesthetic', track:'Moment', status:'declined', response:'Fantastic production but a bit too energetic for our current vibe.', date:'2026-03-04', color:'#ea580c' },
  { id:5, curatorName:'Patrick St. Michel', track:'Moment', status:'opened', response:'', date:'2026-03-05', color:'#7c3aed' },
  { id:6, curatorName:'Yamashita Satoshi', track:'Treasures of Time', status:'accepted', response:'Beautiful arrangement. Added to SXSW alumni playlist.', date:'2026-02-20', color:'#0d9488' },
  { id:7, curatorName:'Ian Martin', track:'Treasures of Time', status:'declined', response:'Not quite our noise/experimental focus, but well crafted.', date:'2026-02-21', color:'#dc2626' },
  { id:8, curatorName:'Leap250', track:'Treasures of Time', status:'listened', response:'', date:'2026-02-22', color:'#059669' },
  { id:9, curatorName:'JaME World', track:'Sepia', status:'accepted', response:'Great atmospheric track! Will feature in our monthly roundup.', date:'2026-02-10', color:'#f59e0b' },
  { id:10, curatorName:'Island Music', track:'Feeling Good', status:'sent', response:'', date:'2026-03-07', color:'#0d9488' },
];

const SONGS = [
  { title:'Moment', pitches:5 },
  { title:'Treasures of Time', pitches:3 },
  { title:'Sepia', pitches:1 },
  { title:'Feeling Good', pitches:1 },
];

/* ── Match score ── */
const calcMatch = (curator, trackGenres) => {
  if (!trackGenres || trackGenres.length === 0) return null;
  const all = [...(curator.genres || []), ...(curator.genresOpen || [])];
  const overlap = trackGenres.filter(g =>
    all.some(cg => cg.toLowerCase() === g.toLowerCase())
  ).length;
  if (overlap === 0) return null;
  return Math.min(100, Math.round(overlap / trackGenres.length * 100 + (curator.shareRate || 0) * 0.5));
};

/* ── PE Template Engine ── */
const PE = {
  generate: (artist, curator, style, userName) => {
    const curatorName = curator?.name || 'Curator';
    const typeMap = { playlist:'playlist', blog:'blog', radio:'radio show', label:'label', 'Media Outlet':'publication', 'Playlist Curator':'playlist' };
    const curType = typeMap[curator?.type] || 'platform';
    const genreStr = Array.isArray(artist.genre) ? artist.genre.join(', ') : (artist.genre || 'music');
    const songTitle = artist.songTitle || 'our latest track';
    const songLink = artist.songLink ? `\nListen: ${artist.songLink}` : '';
    let body = '';
    if (style === 'casual') {
      body = `Hey ${curatorName},\n\nBig fan of what you curate — the sound really resonates with what I'm creating.\n\nI'm ${artist.nameEn || artist.artistName}, a ${genreStr} artist from Japan. My latest track "${songTitle}" has ${artist.description ? artist.description : 'a sound I think your audience would connect with'}.\n\n${artist.influences ? `Influences: ${artist.influences}` : ''}${artist.achievements ? `\n${artist.achievements}` : ''}${songLink}\n\nWould love to have "${songTitle}" considered for your ${curType}. Thanks for all you do!\n\n${userName || 'OTONAMI Team'} via OTONAMI`;
    } else if (style === 'storytelling') {
      body = `Hi ${curatorName},\n\nClose your eyes for a moment. ${artist.description || `Imagine a ${genreStr} soundscape that bridges continents — that's the world of ${artist.nameEn || artist.artistName}.`}\n\n"${songTitle}" is a track that captures exactly that feeling. ${artist.influences ? `Drawing from ${artist.influences}, this is music that moves.` : ''} ${artist.achievements ? artist.achievements : ''}\n\nFrom Japan, this is a sound your audience hasn't heard yet.${songLink}\n\nI'd be honored to have this considered for your ${curType}.\n\nWith gratitude,\n${userName || 'OTONAMI Team'} via OTONAMI`;
    } else {
      body = `Hi ${curatorName},\n\n${artist.nameEn || artist.artistName} is a ${genreStr} artist from Japan. ${artist.achievements ? artist.achievements + ' ' : ''}${artist.description || ''}\n\nI'm reaching out to submit "${songTitle}" for consideration for your ${curType}.${artist.influences ? ` The track draws from ${artist.influences}.` : ''}${songLink}\n\n${artist.achievements ? `Notable: ${artist.achievements}` : 'We believe this track would resonate with your audience.'}\n\nThank you for your time and consideration.\n\n${userName || 'OTONAMI Team'} via OTONAMI`;
    }
    const subject = `Subject: ${genreStr} from Japan — ${artist.nameEn || artist.artistName} "${songTitle}"`;
    return `${subject}\n\n${body}`;
  },
};

/* ── Avatar ── */
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

/* ── Tag ── */
function Tag({ children, variant = 'default', small = false }) {
  const V = {
    default: { bg: T.borderLight, color: T.textSub, bd: T.border },
    match:   { bg: T.greenLight,  color: T.green,   bd: T.greenBorder },
    accent:  { bg: T.accentLight, color: T.accent,  bd: T.accentBorder },
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

/* ── SectionBlock ── */
function SectionBlock({ title, children }) {
  return (
    <div>
      <h3 style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  );
}

/* ── Select styles ── */
const selStyle = {
  padding: '10px 16px', paddingRight: 36, borderRadius: T.radius,
  fontSize: 14, fontFamily: T.font, fontWeight: 500, cursor: 'pointer',
  outline: 'none', border: `1.5px solid ${T.border}`,
  background: T.white, color: T.text, appearance: 'none',
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '12px',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%2394a3b8' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
};

/* ── ProgressBar ── */
function ProgressBar({ step }) {
  const steps = [
    { n:1, label:'Track Info' },
    { n:2, label:'Curators' },
    { n:3, label:'Pitch' },
    { n:4, label:'Sent' },
  ];
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, marginBottom:32, padding:'0 16px' }}>
      {steps.map((s, i) => (
        <div key={s.n} style={{ display:'flex', alignItems:'center', flex: i < steps.length - 1 ? 1 : undefined }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{
              width:36, height:36, borderRadius:'50%', flexShrink:0,
              background: step >= s.n ? T.accent : T.borderLight,
              border: `2px solid ${step >= s.n ? T.accent : T.border}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:700, fontSize:14, fontFamily:T.font,
              color: step >= s.n ? '#fff' : T.textMuted, transition:'all 0.3s',
            }}>
              {step > s.n ? '✓' : s.n}
            </div>
            <span style={{ fontSize:11, fontFamily:T.font, fontWeight: step === s.n ? 700 : 500, color: step >= s.n ? T.accent : T.textMuted, whiteSpace:'nowrap' }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex:1, height:2, margin:'0 8px', marginTop:-18, background: step > s.n ? T.accent : T.border, transition:'background 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Field ── */
function Field({ label, value, onChange, placeholder, type='text', multiline=false, rows=3, required=false }) {
  const baseStyle = {
    width:'100%', padding:'11px 14px', border:`1.5px solid ${T.border}`,
    borderRadius:T.radius, fontSize:14, fontFamily:T.font, color:T.text,
    background:T.white, outline:'none', resize: multiline ? 'vertical' : undefined, transition:'border-color 0.15s',
  };
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:13, fontWeight:600, color:T.text, fontFamily:T.font }}>
        {label}{required && <span style={{ color:T.accent, marginLeft:3 }}>*</span>}
      </label>
      {multiline ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={baseStyle} />
      ) : (
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={baseStyle} />
      )}
    </div>
  );
}

/* ── Toast ── */
function Toast({ msg, onDismiss }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);
  if (!msg) return null;
  return (
    <div style={{
      position:'fixed', top:24, left:'50%', transform:'translateX(-50%)',
      zIndex:2000, background:T.accent, color:'#fff',
      padding:'12px 28px', borderRadius:T.radiusLg,
      fontSize:14, fontWeight:600, fontFamily:T.font,
      boxShadow:'0 8px 24px rgba(14,165,233,0.35)',
      animation:'toastIn 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>{msg}</div>
  );
}

/* ── StatusBadge ── */
function StatusBadge({ status }) {
  const MAP = {
    sent:     { icon:'📤', label:'送信済',  bg:T.borderLight, color:T.textSub  },
    opened:   { icon:'👁',  label:'開封済',  bg:T.accentLight, color:T.accent   },
    listened: { icon:'🎧', label:'試聴済',  bg:'#fffbeb',     color:'#b45309'  },
    accepted: { icon:'🎉', label:'採用！',  bg:T.greenLight,  color:T.green    },
    declined: { icon:'📋', label:'不採用',  bg:'#fef2f2',     color:'#dc2626'  },
  };
  const m = MAP[status] || MAP.sent;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'4px 12px', borderRadius:20, fontSize:12.5, fontWeight:600,
      background:m.bg, color:m.color, fontFamily:T.font,
    }}>
      {m.icon} {m.label}
    </span>
  );
}

/* ── PitchProgress ── */
function PitchProgress({ status }) {
  const positiveSteps = ['sent','opened','listened','accepted'];
  const isDeclined = status === 'declined';
  const activeSteps = isDeclined ? ['sent','opened','listened','declined'] : positiveSteps;
  const currentIdx = activeSteps.indexOf(status);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:8 }}>
      {positiveSteps.map((st, i) => {
        const isActive = i <= (isDeclined && st === 'accepted' ? -1 : (isDeclined ? activeSteps.indexOf(status) : currentIdx));
        const isDeclinedStep = isDeclined && i === 3;
        return (
          <div key={st} style={{ display:'flex', alignItems:'center', flex:1 }}>
            <div style={{ flex:1, height:4, borderRadius:4, background: isDeclinedStep ? '#fca5a5' : isActive ? T.accent : T.border, transition:'background 0.4s' }} />
          </div>
        );
      })}
    </div>
  );
}

/* ── CuratorCard ── */
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
        background:T.white, borderRadius:T.radiusLg,
        border:`1.5px solid ${selected ? T.accent : hovered ? T.accentBorder : T.border}`,
        padding:24, cursor:'pointer', transition:'all 0.2s',
        boxShadow: hovered ? T.shadowMd : T.shadow,
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ display:'flex', gap:14, marginBottom:14 }}>
        <Avatar name={c.name} color={c.color} size={52} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontFamily:T.font, fontSize:16, fontWeight:700, color:T.text }}>{c.name}</span>
            {c.country && FL[c.country] && <span style={{ fontSize:16 }}>{FL[c.country]}</span>}
          </div>
          <div style={{ fontSize:12.5, color:T.textSub, fontFamily:T.font, marginTop:2 }}>{c.type}</div>
        </div>
        {score != null && score >= 50 && (
          <div style={{
            width:46, height:46, borderRadius:'50%', flexShrink:0,
            background:scoreBg, border:`2px solid ${scoreBd}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:700, fontSize:13, fontFamily:T.font, color:scoreColor,
          }}>{score}%</div>
        )}
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
        {c.certified && <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11.5, fontWeight:600, color:T.green, fontFamily:T.font }}>♫ Certified Spotify playlist</span>}
        {(c.tags || []).slice(0,2).map((tag,i) => (
          <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11.5, color:T.textSub, fontFamily:T.font }}>
            {tag.toLowerCase().includes('honest') ? '♡' : tag.toLowerCase().includes('sharing') || tag.toLowerCase().includes('accept') ? '👍' : '●'} {tag}
          </span>
        ))}
      </div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
        {(c.genres || []).slice(0,4).map((g,i) => (
          <span key={i} style={{ display:'inline-flex', alignItems:'center', padding:'2px 10px', background:T.borderLight, color:T.textSub, border:`1px solid ${T.border}`, borderRadius:20, fontSize:12, fontWeight:500, fontFamily:T.font, whiteSpace:'nowrap' }}>{g}</span>
        ))}
        {(c.genres || []).length > 4 && (
          <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 10px', background:T.borderLight, color:T.textSub, border:`1px solid ${T.border}`, borderRadius:20, fontSize:12, fontWeight:500, fontFamily:T.font }}>+{c.genres.length - 4}</span>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:12 }}>
          {c.followers?.spotify   && <span style={{ fontSize:12, color:T.textMuted, fontFamily:T.font }}>♫ {fmt(c.followers.spotify)}</span>}
          {c.followers?.instagram && <span style={{ fontSize:12, color:T.textMuted, fontFamily:T.font }}>📷 {fmt(c.followers.instagram)}</span>}
          {!totalFollowers && <span style={{ fontSize:12, color:T.textMuted, fontFamily:T.font }}>🎵 curator</span>}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onToggle(c.id); }}
          style={{
            padding:'8px 16px', fontSize:13, fontWeight:600, fontFamily:T.font, borderRadius:T.radius, cursor:'pointer', transition:'all 0.15s',
            background: selected ? T.accentLight : 'transparent',
            color: selected ? T.accent : T.textSub,
            border: `1.5px solid ${selected ? T.accentBorder : T.border}`,
          }}
        >{selected ? 'Added ✓' : `Add for ${c.creditCost || 2} ©`}</button>
      </div>
    </div>
  );
}

/* ── CuratorModal ── */
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
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, animation:'overlayIn 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.white, borderRadius:T.radiusXl, maxWidth:580, width:'100%', maxHeight:'88vh', boxShadow:T.shadowLg, animation:'modalIn 0.25s cubic-bezier(0.16,1,0.3,1)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'32px 32px 24px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:20, flexShrink:0 }}>
          <Avatar name={c.name} color={c.color} size={72} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <h2 style={{ fontFamily:T.font, fontSize:22, fontWeight:700, color:T.text, margin:0 }}>{c.name}</h2>
              {c.country && FL[c.country] && <span style={{ fontSize:20 }}>{FL[c.country]}</span>}
            </div>
            <div style={{ fontSize:14, color:T.textSub, fontFamily:T.font, marginTop:4 }}>{c.type}</div>
            <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
              {Object.entries(c.followers || {}).map(([k, v]) => v ? (
                <span key={k} style={{ fontSize:12, color:T.textSub, fontFamily:T.font }}>
                  {k==='spotify'?'♫':k==='instagram'?'📷':k==='facebook'?'👥':'🎬'} {fmt(v)}
                </span>
              ) : null)}
            </div>
            {c.certified && <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:10, padding:'4px 12px', background:T.greenLight, borderRadius:12, fontSize:12, fontWeight:600, color:T.green, fontFamily:T.font }}>♫ Certified Spotify playlist</div>}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, color:T.textMuted, cursor:'pointer', alignSelf:'flex-start', lineHeight:1, padding:4, flexShrink:0 }}>×</button>
        </div>
        <div style={{ padding:32, display:'flex', flexDirection:'column', gap:28, overflowY:'auto', flex:1 }}>
          <p style={{ fontSize:14, color:T.textSub, lineHeight:1.75, fontFamily:T.font, margin:0 }}>{c.bio}</p>
          <div style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 18px', background:T.bg, borderRadius:T.radius, border:`1px solid ${T.border}` }}>
            <span style={{ fontSize:13, color:T.textSub, fontFamily:T.font }}>Share rate</span>
            <span style={{ fontWeight:700, fontSize:22, color:T.accent, fontFamily:T.font }}>{c.shareRate}%</span>
            {score != null && (<><span style={{ flex:1 }} /><span style={{ fontSize:13, color:T.textSub, fontFamily:T.font }}>Match score</span><span style={{ fontWeight:700, fontSize:22, color:scoreColor, fontFamily:T.font }}>{score}%</span></>)}
          </div>
          {(c.matchTags||[]).length > 0 && <SectionBlock title="How well you match"><div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>{c.matchTags.map((t,i) => <Tag key={i} variant="match">{t}</Tag>)}</div></SectionBlock>}
          <SectionBlock title="Genres accepted most often"><div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>{(c.genres||[]).map((g,i) => <Tag key={i}>{g}</Tag>)}</div></SectionBlock>
          {(c.genresOpen||[]).length > 0 && <SectionBlock title="Also open to receiving"><div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>{c.genresOpen.map((g,i) => <Tag key={i} variant="accent">{g}</Tag>)}</div></SectionBlock>}
          {(c.similarTo||[]).length > 0 && <SectionBlock title="They want music similar to..."><div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>{c.similarTo.map((a,i) => (<span key={i} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', background:T.bg, borderRadius:20, fontSize:13, fontWeight:500, color:T.text, border:`1px solid ${T.border}`, fontFamily:T.font }}>🎤 {a}</span>))}</div></SectionBlock>}
          {(c.moods||[]).length > 0 && <SectionBlock title="Moods they love"><div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>{c.moods.map((m,i) => <Tag key={i}>{m}</Tag>)}</div></SectionBlock>}
          {(c.opportunities||[]).length > 0 && <SectionBlock title="Main opportunities">{c.opportunities.map((op,i) => (<div key={i} style={{ padding:'10px 14px', background:T.bg, borderRadius:T.radius, marginBottom:8, fontSize:13.5, color:T.text, fontFamily:T.font, border:`1px solid ${T.border}` }}>{op}</div>))}</SectionBlock>}
          {(c.recentArtists||[]).length > 0 && <SectionBlock title="Recently gave opportunities to"><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>{c.recentArtists.map((a,i) => (<div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:T.bg, borderRadius:T.radius, border:`1px solid ${T.border}` }}><div style={{ width:32, height:32, borderRadius:8, flexShrink:0, background:T.accentLight, border:`1px solid ${T.accentBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🎵</div><div style={{ minWidth:0 }}><div style={{ fontSize:13, fontWeight:600, color:T.text, fontFamily:T.font, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.n}</div><div style={{ fontSize:11, color:T.textMuted, fontFamily:T.font }}>{a.by}</div></div></div>))}</div></SectionBlock>}
        </div>
        <div style={{ padding:'20px 32px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:T.white, flexShrink:0, borderRadius:`0 0 ${T.radiusXl}px ${T.radiusXl}px` }}>
          <button onClick={onClose} style={{ padding:'10px 20px', fontSize:14, fontWeight:600, fontFamily:T.font, background:'transparent', color:T.textSub, border:`1.5px solid ${T.border}`, borderRadius:T.radius, cursor:'pointer' }}>View similar curators</button>
          <button onClick={() => onToggle(c.id)} style={{ padding:'10px 24px', fontSize:14, fontWeight:600, fontFamily:T.font, background: selected ? T.accentLight : T.accent, color: selected ? T.accent : '#fff', border:`1.5px solid ${selected ? T.accentBorder : T.accent}`, borderRadius:T.radius, cursor:'pointer', transition:'all 0.15s' }}>{selected ? 'Added ✓' : `Add for ${c.creditCost || 2} ©`}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */
export default function StudioPage() {
  const [loginState, setLoginState] = useState('login');
  const [campaignStep, setCampaignStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeSong, setActiveSong] = useState('Moment');
  const [statusFilter, setStatusFilter] = useState('');
  const [lang, setLang] = useState('ja');
  const [credits, setCredits] = useState(20);
  const [notif, setNotif] = useState(null);

  /* Campaign state */
  const [artist, setArtist] = useState({ artistName:'ROUTE14', songTitle:'', songLink:'', genre:'', mood:'', description:'', influences:'', achievements:'' });
  const [trackData, setTrackData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const debounceRef = useRef(null);

  const [curators] = useState(DEMO_CURATORS);
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal] = useState(null);
  const [genreFilter, setGenreFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');

  const [pitchStep, setPitchStep] = useState(0);
  const [pitchStyle, setPitchStyle] = useState('professional');
  const [pitchText, setPitchText] = useState('');
  const [pitchJa, setPitchJa] = useState('');
  const [pitchTab, setPitchTab] = useState('ja');
  const [aiLoading, setAiLoading] = useState(false);
  const [translating, setTranslating] = useState(false);

  const [sentPitches, setSentPitches] = useState([]);
  const [newPitches, setNewPitches] = useState([]);
  const timersRef = useRef([]);

  /* sessionStorage load on mount */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('otonami_campaign_state');
      if (saved) {
        const s = JSON.parse(saved);
        if (s.artist) setArtist(prev => ({ ...prev, ...s.artist }));
        if (s.pitchText) setPitchText(s.pitchText);
      }
      const savedSelected = sessionStorage.getItem('otonami_selected_curators');
      if (savedSelected) {
        setSelected(new Set(JSON.parse(savedSelected)));
        setLoginState('campaign');
        setCampaignStep(2);
      }
    } catch {}
  }, []);

  /* sessionStorage save on change */
  useEffect(() => {
    try { sessionStorage.setItem('otonami_campaign_state', JSON.stringify({ artist, pitchText })); } catch {}
  }, [artist, pitchText]);

  useEffect(() => {
    return () => { timersRef.current.forEach(t => clearTimeout(t)); };
  }, []);

  /* Auto-debounce analyze */
  useEffect(() => {
    if (!artist.songTitle || !artist.artistName) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { handleAnalyze(); }, 1500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [artist.songTitle, artist.artistName]); // eslint-disable-line

  const trackGenres = useMemo(() => {
    if (!artist.genre) return [];
    if (Array.isArray(artist.genre)) return artist.genre;
    return artist.genre.split(',').map(s => s.trim()).filter(Boolean);
  }, [artist.genre]);

  const handleAnalyze = useCallback(async () => {
    if (!artist.songTitle && !artist.songLink) return;
    setAnalyzing(true); setAnalyzeError('');
    try {
      const result = await analyzeTrack({ trackUrl: artist.songLink || undefined, songName: artist.songTitle || undefined, artistName: artist.artistName || undefined });
      setTrackData(result);
    } catch (err) { setAnalyzeError(err.message || 'Analysis failed'); }
    finally { setAnalyzing(false); }
  }, [artist.songTitle, artist.songLink, artist.artistName]);

  const toggle = useCallback(id => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);

  const filtered = useMemo(() => {
    return curators
      .filter(c => {
        if (genreFilter && ![...(c.genres||[]),...(c.genresOpen||[])].includes(genreFilter)) return false;
        if (typeFilter && c.type !== typeFilter) return false;
        if (searchQ && !c.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
        return true;
      })
      .map(c => ({ ...c, matchScore: calcMatch(c, trackGenres) }))
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }, [curators, genreFilter, typeFilter, searchQ, trackGenres]);

  const selectedCurators = useMemo(() => curators.filter(c => selected.has(c.id)), [curators, selected]);
  const totalCreditCost = useMemo(() => selectedCurators.reduce((sum, c) => sum + (c.creditCost || 2), 0), [selectedCurators]);

  const handleAIPitch = useCallback(async () => {
    setAiLoading(true);
    try {
      const firstCurator = selectedCurators[0];
      const res = await fetch('/api/pitch', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          artist: { name:artist.artistName, nameEn:artist.artistName, genre: Array.isArray(artist.genre) ? artist.genre.join(', ') : artist.genre, mood:artist.mood, description:artist.description, songTitle:artist.songTitle, influences:artist.influences, achievements:artist.achievements },
          curator: firstCurator ? { name:firstCurator.name, type:firstCurator.type, platform:firstCurator.type, genres:firstCurator.genres } : null,
          style: pitchStyle, links:{ songLink:artist.songLink },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pitch generation failed');
      setPitchText(data.pitch || ''); setPitchStep(1); setNotif('AIピッチを生成しました！');
    } catch {
      setNotif('AI生成に失敗しました。テンプレートをお試しください。');
      const tmpl = PE.generate({ ...artist, nameEn:artist.artistName, genre: Array.isArray(artist.genre) ? artist.genre.join(', ') : artist.genre }, selectedCurators[0], pitchStyle, '');
      setPitchText(tmpl); setPitchStep(1);
    } finally { setAiLoading(false); }
  }, [artist, pitchStyle, selectedCurators]);

  const handleTemplatePitch = useCallback(() => {
    const tmpl = PE.generate({ ...artist, nameEn:artist.artistName, genre: Array.isArray(artist.genre) ? artist.genre.join(', ') : artist.genre }, selectedCurators[0], pitchStyle, '');
    setPitchText(tmpl); setPitchStep(1);
  }, [artist, pitchStyle, selectedCurators]);

  const handleTranslateToJa = useCallback(async () => {
    if (!pitchText) return;
    setTranslating(true);
    try {
      const res = await fetch('/api/pitch/translate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text:pitchText, reverse:false }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPitchJa(data.translated || ''); setPitchTab('ja'); setNotif('日本語に翻訳しました');
    } catch { setNotif('翻訳に失敗しました'); } finally { setTranslating(false); }
  }, [pitchText]);

  const handleTranslateToEn = useCallback(async () => {
    if (!pitchJa) return;
    setTranslating(true);
    try {
      const res = await fetch('/api/pitch/translate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text:pitchJa, reverse:true }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPitchText(data.translated || ''); setPitchTab('en'); setNotif('英語に反映しました');
    } catch { setNotif('翻訳に失敗しました'); } finally { setTranslating(false); }
  }, [pitchJa]);

  const startAutoProgress = useCallback((pitchId) => {
    const d1 = 3000 + Math.random() * 5000;
    const d2 = 5000 + Math.random() * 7000;
    const d3 = 6000 + Math.random() * 9000;
    const t1 = setTimeout(() => { setSentPitches(prev => prev.map(p => p.id === pitchId ? { ...p, status:'opened' } : p)); }, d1);
    const t2 = setTimeout(() => { setSentPitches(prev => prev.map(p => p.id === pitchId ? { ...p, status:'listened' } : p)); }, d1+d2);
    const t3 = setTimeout(() => {
      const accepted = Math.random() < 0.6;
      const pool = accepted ? FEEDBACK_BANK.positive : FEEDBACK_BANK.negative;
      const feedback = pool[Math.floor(Math.random() * pool.length)];
      setSentPitches(prev => prev.map(p => p.id === pitchId ? { ...p, status: accepted ? 'accepted' : 'declined', feedback } : p));
    }, d1+d2+d3);
    timersRef.current.push(t1, t2, t3);
  }, []);

  const sendAll = useCallback(async () => {
    const now = new Date();
    const deadline = new Date(now.getTime() + 7*24*60*60*1000);
    const pitches = selectedCurators.map(curator => ({
      id:`pitch_${Date.now()}_${curator.id}`, artistName:artist.artistName, songTitle:artist.songTitle, songLink:artist.songLink,
      genre: Array.isArray(artist.genre) ? artist.genre.join(', ') : artist.genre,
      pitchText, curatorId:curator.id, curatorName:curator.name, curatorPlatform:curator.type,
      status:'sent', sentAt:now.toISOString(), deadline:deadline.toISOString(), feedback:null,
    }));
    setSentPitches(pitches);
    setNewPitches(pitches);
    setCredits(prev => Math.max(0, prev - totalCreditCost));
    for (const pitch of pitches) {
      try { await fetch('/api/email', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to:`curator+${pitch.curatorId}@otonami.com`, subject:`New pitch from ${pitch.artistName}`, body:pitch.pitchText }) }); } catch {}
    }
    pitches.forEach(p => startAutoProgress(p.id));
    setCampaignStep(4);
    setNotif(`${pitches.length}件送信しました！`);
  }, [selectedCurators, artist, pitchText, totalCreditCost, startAutoProgress]);

  const setField = (key) => (e) => setArtist(prev => ({ ...prev, [key]: e.target.value }));

  const toggleGenre = useCallback((g) => {
    setArtist(prev => {
      const genres = prev.genre ? prev.genre.split(',').map(s => s.trim()).filter(Boolean) : [];
      const idx = genres.indexOf(g);
      if (idx >= 0) genres.splice(idx, 1); else genres.push(g);
      return { ...prev, genre: genres.join(', ') };
    });
  }, []);

  const selectedGenres = useMemo(() => {
    if (!artist.genre) return [];
    return artist.genre.split(',').map(s => s.trim()).filter(Boolean);
  }, [artist.genre]);

  const hasFilters = genreFilter || typeFilter || searchQ;

  const handleNewTrack = () => {
    setArtist({ artistName:'ROUTE14', songTitle:'', songLink:'', genre:'', mood:'', description:'', influences:'', achievements:'' });
    setTrackData(null); setAnalyzeError(''); setSelected(new Set());
    setGenreFilter(''); setTypeFilter(''); setSearchQ('');
    setPitchStep(0); setPitchStyle('professional'); setPitchText(''); setPitchJa(''); setPitchTab('ja');
    setSentPitches([]); setAiLoading(false); setTranslating(false);
    setLoginState('campaign'); setCampaignStep(1);
  };

  const handleBackToDashboard = () => {
    setLoginState('dashboard');
  };

  /* ── STYLES ── */
  const globalStyles = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    textarea:focus, input:focus { border-color: ${T.accent} !important; outline: none; }
    select:focus { outline: none; }
    @media (max-width: 768px) { .nav-center { display: none !important; } .studio-layout { flex-direction: column !important; } .studio-sidebar { width: 100% !important; } }
  `;

  /* ═══════════ LOGIN SCREEN ═══════════ */
  if (loginState === 'login') {
    return (
      <div style={{ minHeight:'100vh', background:T.bg, fontFamily:T.font, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <style>{globalStyles}</style>
        <div style={{ width:'100%', maxWidth:420 }}>
          {/* Logo */}
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:12, marginBottom:12 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:T.accentGrad, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:26 }}>O</div>
              <span style={{ fontFamily:T.fontDisplay, fontSize:32, fontWeight:700, color:T.accent, letterSpacing:-0.5 }}>OTONAMI</span>
            </div>
            <p style={{ fontSize:14, color:T.textSub, fontFamily:T.font }}>アーティスト ダッシュボード</p>
          </div>

          {/* Card */}
          <div style={{ background:T.white, borderRadius:T.radiusXl, padding:40, boxShadow:T.shadowMd, border:`1px solid ${T.border}` }}>
            <h1 style={{ fontFamily:T.fontDisplay, fontSize:22, fontWeight:700, color:T.text, marginBottom:28, textAlign:'center' }}>ログイン</h1>

            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              <Field label="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" required />
              <Field label="パスワード" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" required />

              <button
                onClick={() => setLoginState('dashboard')}
                style={{
                  width:'100%', padding:'14px', fontSize:16, fontWeight:700, fontFamily:T.font,
                  background:T.accent, color:'#fff', border:'none', borderRadius:T.radius, cursor:'pointer',
                  boxShadow:'0 4px 16px rgba(14,165,233,0.3)', transition:'all 0.15s', marginTop:8,
                }}
              >ログイン</button>

              <div style={{ textAlign:'center' }}>
                <button style={{ background:'none', border:'none', color:T.accent, fontSize:13, fontFamily:T.font, cursor:'pointer', fontWeight:600 }}>
                  アカウントを作成
                </button>
              </div>
            </div>
          </div>

          <p style={{ textAlign:'center', fontSize:12, color:T.textMuted, fontFamily:T.font, marginTop:20 }}>
            デモ用: 任意のメールアドレスとパスワードでログインできます
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════ DASHBOARD + CAMPAIGN LAYOUT ═══════════ */
  const allCampaigns = [...DEMO_CAMPAIGNS, ...newPitches.map((p, i) => ({
    id: 1000 + i, curatorName: p.curatorName, track: p.songTitle || artist.songTitle,
    status: p.status, response: p.feedback || '', date: new Date(p.sentAt).toISOString().split('T')[0],
    color: DEMO_CURATORS.find(c => c.id === p.curatorId)?.color || T.accent,
  }))];

  const filteredCampaigns = allCampaigns.filter(c => {
    if (activeSong && c.track !== activeSong) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:T.font }}>
      <style>{globalStyles}</style>
      <Toast msg={notif} onDismiss={() => setNotif(null)} />

      {/* ── Site Header ── */}
      <header style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)',
        borderBottom:`1px solid ${T.border}`,
        padding:'0 24px', height:64,
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:28 }}>
          <a href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
            <div style={{ width:34, height:34, borderRadius:10, background:T.accentGrad, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:17 }}>O</div>
            <span style={{ fontFamily:T.fontDisplay, fontSize:22, fontWeight:700, color:T.accent, letterSpacing:-0.3 }}>OTONAMI</span>
          </a>
          <nav className="nav-center" style={{ display:'flex', gap:4 }}>
            {[
              { href:'/', label: lang==='ja' ? '使い方' : 'How It Works' },
              { href:'/curators', label: lang==='ja' ? 'キュレーターを探す' : 'Find Curators' },
              { href:'/studio', label: lang==='ja' ? 'アーティストの方' : 'For Artists', active:true },
            ].map((item, idx) => (
              <a key={idx} href={item.href} style={{
                padding:'8px 14px', borderRadius:8, fontSize:14, fontWeight:500,
                textDecoration:'none', fontFamily:T.font,
                background: item.active ? T.accentLight : 'transparent',
                color: item.active ? T.accent : T.textSub,
              }}>{item.label}</a>
            ))}
          </nav>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ padding:'6px 14px', background:T.accentLight, borderRadius:T.radius, border:`1px solid ${T.accentBorder}`, fontSize:13, fontWeight:700, color:T.accent, fontFamily:T.font }}>
            {credits} cr
          </div>
          <div style={{ display:'flex', borderRadius:8, overflow:'hidden', border:`1px solid ${T.border}` }}>
            {['EN','JP'].map(l => (
              <button key={l} onClick={() => { const v=l==='JP'?'ja':'en'; setLang(v); try{localStorage.setItem('otonami_locale',v);}catch{} }} style={{
                padding:'6px 12px', fontSize:12, fontWeight:600, fontFamily:T.font, border:'none', cursor:'pointer',
                background: (l==='JP'?lang==='ja':lang==='en') ? T.text : 'transparent',
                color:      (l==='JP'?lang==='ja':lang==='en') ? '#fff' : T.textSub,
              }}>{l==='JP'?'日本語':l}</button>
            ))}
          </div>
          <button
            onClick={() => setLoginState('login')}
            style={{ padding:'8px 16px', fontSize:13, fontWeight:600, background:'transparent', color:T.textSub, border:`1.5px solid ${T.border}`, borderRadius:T.radius, cursor:'pointer', fontFamily:T.font }}
          >ログアウト</button>
        </div>
      </header>

      {/* ── Two-column layout ── */}
      <div className="studio-layout" style={{ display:'flex', minHeight:'calc(100vh - 64px)' }}>

        {/* ── Left Sidebar ── */}
        <aside className="studio-sidebar" style={{
          width:280, flexShrink:0, background:T.white, borderRight:`1px solid ${T.border}`,
          padding:24, display:'flex', flexDirection:'column', gap:24,
        }}>
          {/* Artist profile */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, paddingBottom:24, borderBottom:`1px solid ${T.border}` }}>
            <div style={{
              width:80, height:80, borderRadius:'50%', background:T.accentGrad,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontWeight:800, fontSize:28, fontFamily:T.font,
            }}>R</div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:T.font, fontSize:18, fontWeight:700, color:T.text }}>ROUTE14</div>
              <div style={{ fontSize:13, color:T.textSub, fontFamily:T.font, marginTop:4 }}>Jazz Fusion · Tokyo</div>
            </div>
          </div>

          {/* Stats grid */}
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:T.textMuted, fontFamily:T.font, textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>Stats</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { label:'Responses', value:12 },
                { label:'Shares', value:5 },
                { label:'Promises', value:3 },
                { label:'Asks more', value:4 },
              ].map(stat => (
                <div key={stat.label} style={{ background:T.bg, borderRadius:T.radius, padding:'12px 14px', border:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:22, fontWeight:800, color:T.accent, fontFamily:T.font }}>{stat.value}</div>
                  <div style={{ fontSize:11, color:T.textMuted, fontFamily:T.font, marginTop:2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sent tracks */}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.textMuted, fontFamily:T.font, textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>Sent tracks</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {SONGS.map(song => {
                const isActive = activeSong === song.title;
                return (
                  <button
                    key={song.title}
                    onClick={() => { setActiveSong(song.title); if (loginState === 'campaign') setLoginState('dashboard'); }}
                    style={{
                      width:'100%', textAlign:'left', padding:'10px 14px',
                      borderRadius:T.radius, border:`1.5px solid ${isActive ? T.accent : 'transparent'}`,
                      background: isActive ? T.accentLight : 'transparent',
                      cursor:'pointer', transition:'all 0.15s',
                      fontFamily:T.font,
                    }}
                  >
                    <div style={{ fontSize:14, fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : T.text }}>{song.title}</div>
                    <div style={{ fontSize:11, color: isActive ? T.accent : T.textMuted, marginTop:2 }}>{song.pitches} pitches sent</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button
              onClick={handleNewTrack}
              style={{
                width:'100%', padding:'12px', fontSize:14, fontWeight:700, fontFamily:T.font,
                background:T.accent, color:'#fff', border:'none', borderRadius:T.radius, cursor:'pointer',
                boxShadow:'0 4px 16px rgba(14,165,233,0.3)',
              }}
            >+ Send new track</button>
            <button style={{ width:'100%', padding:'10px', fontSize:13, fontWeight:500, fontFamily:T.font, background:'transparent', color:T.textSub, border:`1px solid ${T.border}`, borderRadius:T.radius, cursor:'pointer' }}>
              My email list
            </button>
          </div>
        </aside>

        {/* ── Main area ── */}
        <main style={{ flex:1, minWidth:0, padding:32, overflowY:'auto' }}>

          {/* DASHBOARD */}
          {loginState === 'dashboard' && (
            <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
              {/* Header row */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
                <div>
                  <h1 style={{ fontFamily:T.fontDisplay, fontSize:26, fontWeight:700, color:T.text, marginBottom:4 }}>Campaign Results</h1>
                  <p style={{ fontSize:13, color:T.textSub, fontFamily:T.font }}>{activeSong} — {filteredCampaigns.length} responses</p>
                </div>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <select value={activeSong} onChange={e => setActiveSong(e.target.value)} style={selStyle}>
                    <option value="">All tracks</option>
                    {SONGS.map(s => <option key={s.title} value={s.title}>{s.title}</option>)}
                  </select>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selStyle}>
                    <option value="">All statuses</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                    <option value="listened">Listened</option>
                    <option value="opened">Opened</option>
                    <option value="sent">Sent</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div style={{ background:T.white, borderRadius:T.radiusLg, border:`1px solid ${T.border}`, overflow:'hidden' }}>
                {/* Table header */}
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 1fr 2fr 1fr', gap:0, padding:'12px 24px', borderBottom:`1px solid ${T.border}`, background:T.bg }}>
                  {['Curator','Track','Status','Response','Date'].map(h => (
                    <div key={h} style={{ fontSize:12, fontWeight:700, color:T.textMuted, fontFamily:T.font, textTransform:'uppercase', letterSpacing:0.6 }}>{h}</div>
                  ))}
                </div>

                {filteredCampaigns.length === 0 ? (
                  <div style={{ padding:48, textAlign:'center', color:T.textMuted, fontFamily:T.font, fontSize:14 }}>No results for current filters.</div>
                ) : (
                  filteredCampaigns.map((row, i) => (
                    <div
                      key={row.id}
                      style={{
                        display:'grid', gridTemplateColumns:'2fr 1.2fr 1fr 2fr 1fr', gap:0,
                        padding:'16px 24px', borderBottom: i < filteredCampaigns.length-1 ? `1px solid ${T.borderLight}` : 'none',
                        alignItems:'center', transition:'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = T.bg}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Curator */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                        <Avatar name={row.curatorName} color={row.color} size={36} />
                        <span style={{ fontSize:14, fontWeight:600, color:T.text, fontFamily:T.font, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.curatorName}</span>
                      </div>
                      {/* Track */}
                      <div style={{ fontSize:13, color:T.textSub, fontFamily:T.font }}>{row.track}</div>
                      {/* Status */}
                      <div><StatusBadge status={row.status} /></div>
                      {/* Response */}
                      <div style={{ fontSize:12.5, color:T.textSub, fontFamily:T.font, fontStyle: row.response ? 'italic' : 'normal', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:12 }}>
                        {row.response || <span style={{ color:T.textMuted }}>—</span>}
                      </div>
                      {/* Date */}
                      <div style={{ fontSize:12, color:T.textMuted, fontFamily:T.font }}>{row.date}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* CAMPAIGN FLOW */}
          {loginState === 'campaign' && (
            <div style={{ maxWidth:880 }}>
              <ProgressBar step={campaignStep} />

              {/* ── STEP 1: Track Info ── */}
              {campaignStep === 1 && (
                <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
                  <div>
                    <h1 style={{ fontFamily:T.fontDisplay, fontSize:26, fontWeight:700, color:T.text, marginBottom:8 }}>楽曲情報を入力</h1>
                    <p style={{ fontSize:14, color:T.textSub, fontFamily:T.font }}>あなたの楽曲について教えてください。AIがキュレーターとのマッチングを最適化します。</p>
                  </div>

                  <div style={{ background:T.white, borderRadius:T.radiusLg, padding:32, border:`1px solid ${T.border}`, display:'flex', flexDirection:'column', gap:20 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                      <Field label="アーティスト名 (EN)" value={artist.artistName} onChange={setField('artistName')} placeholder="e.g. Hiromi Uehara" required />
                      <Field label="曲名" value={artist.songTitle} onChange={setField('songTitle')} placeholder="e.g. Spark" required />
                    </div>
                    <Field label="曲のリンク (YouTube / Spotify)" value={artist.songLink} onChange={setField('songLink')} placeholder="https://open.spotify.com/track/... or https://youtu.be/..." />

                    <div>
                      <label style={{ fontSize:13, fontWeight:600, color:T.text, fontFamily:T.font, display:'block', marginBottom:10 }}>
                        ジャンル<span style={{ color:T.accent, marginLeft:3 }}>*</span>
                        <span style={{ fontSize:11, color:T.textMuted, fontWeight:400, marginLeft:8 }}>複数選択可</span>
                      </label>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {ARTIST_GENRES.map(g => {
                          const isSel = selectedGenres.includes(g);
                          return (
                            <button key={g} onClick={() => toggleGenre(g)} style={{
                              padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:500, fontFamily:T.font, cursor:'pointer', transition:'all 0.15s',
                              background: isSel ? T.accent : T.borderLight, color: isSel ? '#fff' : T.textSub, border:`1.5px solid ${isSel ? T.accent : T.border}`,
                            }}>{g}</button>
                          );
                        })}
                      </div>
                    </div>

                    <Field label="ムード / サウンドの雰囲気" value={artist.mood} onChange={setField('mood')} placeholder="e.g. Energetic, Cinematic, Groovy" />
                    <Field label="楽曲の説明" value={artist.description} onChange={setField('description')} placeholder="楽曲のサウンドや世界観を英語で説明してください" multiline rows={3} />
                    <Field label="影響を受けたアーティスト" value={artist.influences} onChange={setField('influences')} placeholder="e.g. Herbie Hancock, Snarky Puppy, Khruangbin" />
                    <Field label="実績・受賞歴" value={artist.achievements} onChange={setField('achievements')} placeholder="e.g. SXSW 2024出演, Spotify Japan推薦" />
                  </div>

                  {/* SoundNet */}
                  <div style={{ background:T.white, borderRadius:T.radiusLg, padding:24, border:`1px solid ${T.border}` }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                      <div>
                        <h2 style={{ fontFamily:T.font, fontSize:16, fontWeight:700, color:T.text, marginBottom:4 }}>SoundNet 分析</h2>
                        <p style={{ fontSize:12.5, color:T.textSub, fontFamily:T.font }}>曲名・アーティスト名を入力すると自動で分析します</p>
                      </div>
                      <button onClick={handleAnalyze} disabled={analyzing || (!artist.songTitle && !artist.songLink)} style={{ padding:'10px 20px', fontSize:13, fontWeight:600, fontFamily:T.font, borderRadius:T.radius, cursor: analyzing ? 'wait' : 'pointer', background: analyzing ? T.borderLight : T.accent, color: analyzing ? T.textMuted : '#fff', border:'none', transition:'all 0.15s', opacity: (!artist.songTitle && !artist.songLink) ? 0.5 : 1 }}>
                        {analyzing ? '分析中...' : '分析する'}
                      </button>
                    </div>
                    {analyzeError && <div style={{ padding:'10px 14px', background:'#fef2f2', borderRadius:T.radius, fontSize:13, color:'#dc2626', fontFamily:T.font, marginBottom:12 }}>{analyzeError}</div>}
                    {analyzing && (
                      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 0', color:T.textSub, fontFamily:T.font, fontSize:14 }}>
                        <div style={{ width:20, height:20, border:`2px solid ${T.accentBorder}`, borderTopColor:T.accent, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                        SoundNetで分析しています...
                      </div>
                    )}
                    {trackData && !analyzing && (
                      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                        {trackData.audioFeatures ? (
                          <>
                            {[{key:'energy',label:'Energy',color:'#f97316'},{key:'danceability',label:'Danceability',color:'#a855f7'},{key:'tempo',label:'Tempo',color:T.accent,max:200}].map(({key,label,color,max=1}) => {
                              const raw = trackData.audioFeatures?.[key];
                              if (raw == null) return null;
                              const pct = max===1 ? Math.round(raw*100) : Math.min(100, Math.round(raw/max*100));
                              return (
                                <div key={key}>
                                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                                    <span style={{ fontSize:12.5, fontWeight:600, color:T.text, fontFamily:T.font }}>{label}</span>
                                    <span style={{ fontSize:12.5, color:T.textSub, fontFamily:T.font }}>{key==='tempo' ? `${Math.round(raw)} BPM` : `${pct}%`}</span>
                                  </div>
                                  <div style={{ height:8, background:T.borderLight, borderRadius:4, overflow:'hidden' }}>
                                    <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4, transition:'width 0.8s ease' }} />
                                  </div>
                                </div>
                              );
                            })}
                            <div style={{ padding:'8px 14px', background:T.accentLight, borderRadius:T.radius, fontSize:12.5, color:T.accent, fontFamily:T.font, marginTop:4 }}>
                              ✓ 分析完了 — {trackData.source || 'SoundNet'} より取得{trackData.metadata?.title && ` | "${trackData.metadata.title}"`}
                            </div>
                          </>
                        ) : (
                          <div style={{ padding:'10px 14px', background:T.borderLight, borderRadius:T.radius, fontSize:13, color:T.textSub, fontFamily:T.font }}>
                            分析データを取得しました。{trackData.soundnetError && ` (SoundNet: ${trackData.soundnetError})`}
                          </div>
                        )}
                      </div>
                    )}
                    {!trackData && !analyzing && (
                      <div style={{ textAlign:'center', padding:'20px 0', color:T.textMuted, fontSize:13, fontFamily:T.font }}>曲名とアーティスト名を入力すると自動で分析が始まります</div>
                    )}
                  </div>

                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <button onClick={() => setCampaignStep(2)} disabled={!artist.artistName || !artist.genre} style={{ padding:'14px 32px', fontSize:15, fontWeight:700, fontFamily:T.font, background: (!artist.artistName || !artist.genre) ? T.borderLight : T.accent, color: (!artist.artistName || !artist.genre) ? T.textMuted : '#fff', border:'none', borderRadius:T.radius, cursor: (!artist.artistName || !artist.genre) ? 'not-allowed' : 'pointer', boxShadow: (!artist.artistName || !artist.genre) ? 'none' : '0 4px 16px rgba(14,165,233,0.3)', transition:'all 0.15s' }}>
                      Next: キュレーターを選ぶ →
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Curator Selection ── */}
              {campaignStep === 2 && (
                <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
                  <div>
                    <h1 style={{ fontFamily:T.fontDisplay, fontSize:26, fontWeight:700, color:T.text, marginBottom:6 }}>{filtered.length.toLocaleString()} キュレーター</h1>
                    <p style={{ fontSize:14, color:T.textSub, fontFamily:T.font }}>50件以上に送るアーティストが最も良い結果を得ています</p>
                  </div>

                  <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
                    <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)} style={{ ...selStyle, ...(genreFilter ? {borderColor:T.accent, background:T.accentLight, color:T.accent} : {}) }}>
                      <option value="">Genres</option>
                      {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...selStyle, ...(typeFilter ? {borderColor:T.accent, background:T.accentLight, color:T.accent} : {}) }}>
                      <option value="">Curator/Pro Types</option>
                      {CURATOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div style={{ flex:1, minWidth:200 }}>
                      <input type="text" placeholder="Search curators..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ width:'100%', padding:'10px 16px', borderRadius:T.radius, border:`1.5px solid ${searchQ ? T.accent : T.border}`, fontSize:14, fontFamily:T.font, outline:'none', background:T.white, color:T.text }} />
                    </div>
                    {hasFilters && <button onClick={() => { setGenreFilter(''); setTypeFilter(''); setSearchQ(''); }} style={{ fontSize:13, color:T.accent, background:'none', border:'none', cursor:'pointer', fontFamily:T.font, fontWeight:600, whiteSpace:'nowrap' }}>Clear filters</button>}
                  </div>

                  <div style={{ display:'inline-flex', gap:20, padding:'14px 24px', background:T.accentLight, borderRadius:T.radiusLg, border:`1px solid ${T.accentBorder}`, alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontSize:13, color:T.accent, fontFamily:T.font, fontWeight:500 }}>💡 50件以上に送るアーティストが最も良い結果を得ています</span>
                    <div style={{ display:'flex', gap:16 }}>
                      {[{n:50,p:60,c:"#fbbf24"},{n:100,p:72,c:"#fb923c"},{n:"200+",p:93,c:T.green}].map((x,i) => (
                        <div key={i} style={{ textAlign:'center', minWidth:48 }}>
                          <div style={{ fontWeight:800, fontSize:18, color:x.c, fontFamily:T.font }}>{x.p}%</div>
                          <div style={{ fontSize:10, color:T.textMuted, fontFamily:T.font, marginTop:2 }}>{x.n} pros</div>
                        </div>
                      ))}
                      <span style={{ fontSize:13, color:T.textSub, fontFamily:T.font, alignSelf:'center', marginLeft:4 }}>success rate</span>
                    </div>
                  </div>

                  {filtered.length > 0 ? (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:20 }}>
                      {filtered.map(c => (
                        <CuratorCard key={c.id} c={c} score={c.matchScore} selected={selected.has(c.id)} onToggle={toggle} onDetail={setModal} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign:'center', padding:60, color:T.textMuted, fontFamily:T.font, fontSize:15 }}>No curators match your filters.</div>
                  )}
                </div>
              )}

              {/* ── STEP 3: Pitch Creation ── */}
              {campaignStep === 3 && (
                <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
                  <div>
                    <h1 style={{ fontFamily:T.fontDisplay, fontSize:26, fontWeight:700, color:T.text, marginBottom:8 }}>ピッチを作成</h1>
                    <p style={{ fontSize:14, color:T.textSub, fontFamily:T.font }}>{selectedCurators.length}件のキュレーターに送るピッチメールを作成します</p>
                  </div>

                  {/* pitchStep 0: Style */}
                  {pitchStep === 0 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                      <div style={{ background:T.white, borderRadius:T.radiusLg, padding:24, border:`1px solid ${T.border}` }}>
                        <h2 style={{ fontFamily:T.font, fontSize:15, fontWeight:700, color:T.text, marginBottom:16 }}>選択中のキュレーター ({selectedCurators.length}件)</h2>
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                          {selectedCurators.map(c => (
                            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:T.bg, borderRadius:T.radius, border:`1px solid ${T.border}` }}>
                              <Avatar name={c.name} color={c.color} size={36} />
                              <div style={{ flex:1 }}>
                                <div style={{ fontFamily:T.font, fontSize:14, fontWeight:600, color:T.text }}>{c.name}</div>
                                <div style={{ fontFamily:T.font, fontSize:12, color:T.textSub }}>{c.type} {c.country && FL[c.country] ? FL[c.country] : ''}</div>
                              </div>
                              <div style={{ fontSize:13, color:T.accent, fontWeight:700, fontFamily:T.font }}>{c.creditCost || 2} cr</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop:16, padding:'12px 16px', background:T.accentLight, borderRadius:T.radius, border:`1px solid ${T.accentBorder}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:14, fontWeight:600, color:T.text, fontFamily:T.font }}>合計クレジット</span>
                          <span style={{ fontSize:18, fontWeight:800, color:T.accent, fontFamily:T.font }}>{totalCreditCost} cr</span>
                        </div>
                      </div>

                      <div style={{ background:T.white, borderRadius:T.radiusLg, padding:24, border:`1px solid ${T.border}` }}>
                        <h2 style={{ fontFamily:T.font, fontSize:15, fontWeight:700, color:T.text, marginBottom:16 }}>ピッチスタイルを選択</h2>
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                          {[
                            { value:'professional', label:'Professional', desc:'業界標準の洗練されたトーン。実績を前面に出した説得力のあるメール。' },
                            { value:'casual', label:'Casual', desc:'親しみやすく温かみのあるトーン。音楽への愛を共有する友人のように。' },
                            { value:'storytelling', label:'Storytelling', desc:'まず音楽の世界観を描写するスタイル。感情に訴える表現で興味を引く。' },
                          ].map(opt => (
                            <label key={opt.value} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px', borderRadius:T.radius, cursor:'pointer', border:`1.5px solid ${pitchStyle===opt.value ? T.accent : T.border}`, background: pitchStyle===opt.value ? T.accentLight : T.white, transition:'all 0.15s' }}>
                              <input type="radio" name="pitchStyle" value={opt.value} checked={pitchStyle===opt.value} onChange={() => setPitchStyle(opt.value)} style={{ marginTop:2, accentColor:T.accent }} />
                              <div>
                                <div style={{ fontSize:14, fontWeight:700, color:T.text, fontFamily:T.font }}>{opt.label}</div>
                                <div style={{ fontSize:12.5, color:T.textSub, fontFamily:T.font, marginTop:3 }}>{opt.desc}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                        <button onClick={handleAIPitch} disabled={aiLoading} style={{ flex:1, minWidth:200, padding:'14px 24px', fontSize:15, fontWeight:700, fontFamily:T.font, borderRadius:T.radius, cursor: aiLoading ? 'wait' : 'pointer', background: aiLoading ? T.borderLight : T.accent, color: aiLoading ? T.textMuted : '#fff', border:'none', boxShadow: aiLoading ? 'none' : '0 4px 16px rgba(14,165,233,0.3)', transition:'all 0.15s' }}>
                          {aiLoading ? '🤖 生成中...' : '🤖 AIピッチ生成'}
                        </button>
                        <button onClick={handleTemplatePitch} disabled={aiLoading} style={{ flex:1, minWidth:200, padding:'14px 24px', fontSize:15, fontWeight:700, fontFamily:T.font, borderRadius:T.radius, cursor:'pointer', background:'transparent', color:T.textSub, border:`1.5px solid ${T.border}`, transition:'all 0.15s' }}>
                          📝 テンプレート
                        </button>
                      </div>
                      <div>
                        <button onClick={() => setCampaignStep(2)} style={{ padding:'10px 20px', fontSize:14, fontWeight:600, fontFamily:T.font, background:'transparent', color:T.textSub, border:`1.5px solid ${T.border}`, borderRadius:T.radius, cursor:'pointer' }}>
                          ← キュレーター選択に戻る
                        </button>
                      </div>
                    </div>
                  )}

                  {/* pitchStep 1: Review */}
                  {pitchStep === 1 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                      <div style={{ background:T.white, borderRadius:T.radiusLg, padding:24, border:`1px solid ${T.border}` }}>
                        <div style={{ display:'flex', gap:0, marginBottom:20, borderRadius:T.radius, overflow:'hidden', border:`1px solid ${T.border}`, alignSelf:'flex-start', width:'fit-content' }}>
                          {[{id:'en',label:'English'},{id:'ja',label:'日本語'}].map(tab => (
                            <button key={tab.id} onClick={() => setPitchTab(tab.id)} style={{ padding:'10px 24px', fontSize:14, fontWeight:600, fontFamily:T.font, cursor:'pointer', border:'none', transition:'all 0.15s', background: pitchTab===tab.id ? T.accent : T.white, color: pitchTab===tab.id ? '#fff' : T.textSub }}>{tab.label}</button>
                          ))}
                        </div>
                        {pitchTab === 'en' && (
                          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                            <textarea value={pitchText} onChange={e => setPitchText(e.target.value)} rows={14} style={{ width:'100%', padding:'14px', border:`1.5px solid ${T.border}`, borderRadius:T.radius, fontSize:13.5, fontFamily:T.font, color:T.text, background:T.bg, resize:'vertical', lineHeight:1.7 }} />
                            <button onClick={handleTranslateToJa} disabled={translating || !pitchText} style={{ padding:'10px 20px', fontSize:13, fontWeight:600, fontFamily:T.font, borderRadius:T.radius, cursor: translating ? 'wait' : 'pointer', background: translating ? T.borderLight : T.accentLight, color: translating ? T.textMuted : T.accent, border:`1.5px solid ${T.accentBorder}`, transition:'all 0.15s', alignSelf:'flex-start' }}>
                              {translating ? '翻訳中...' : '🔄 日本語に反映'}
                            </button>
                          </div>
                        )}
                        {pitchTab === 'ja' && (
                          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                            <textarea value={pitchJa} onChange={e => setPitchJa(e.target.value)} rows={14} placeholder="「日本語に反映」ボタンで翻訳、または直接入力" style={{ width:'100%', padding:'14px', border:`1.5px solid ${T.border}`, borderRadius:T.radius, fontSize:13.5, fontFamily:T.font, color:T.text, background:T.bg, resize:'vertical', lineHeight:1.7 }} />
                            <button onClick={handleTranslateToEn} disabled={translating || !pitchJa} style={{ padding:'10px 20px', fontSize:13, fontWeight:600, fontFamily:T.font, borderRadius:T.radius, cursor: translating ? 'wait' : 'pointer', background: translating ? T.borderLight : T.accentLight, color: translating ? T.textMuted : T.accent, border:`1.5px solid ${T.accentBorder}`, transition:'all 0.15s', alignSelf:'flex-start' }}>
                              {translating ? '翻訳中...' : '🔄 英語に反映'}
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                        <button onClick={() => setPitchStep(0)} style={{ padding:'12px 24px', fontSize:14, fontWeight:600, fontFamily:T.font, background:'transparent', color:T.textSub, border:`1.5px solid ${T.border}`, borderRadius:T.radius, cursor:'pointer' }}>← 戻る</button>
                        <button onClick={() => setPitchStep(2)} disabled={!pitchText} style={{ padding:'12px 32px', fontSize:15, fontWeight:700, fontFamily:T.font, background: !pitchText ? T.borderLight : T.accent, color: !pitchText ? T.textMuted : '#fff', border:'none', borderRadius:T.radius, cursor: !pitchText ? 'not-allowed' : 'pointer', boxShadow: !pitchText ? 'none' : '0 4px 16px rgba(14,165,233,0.3)' }}>送信へ →</button>
                      </div>
                    </div>
                  )}

                  {/* pitchStep 2: Confirm */}
                  {pitchStep === 2 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                      <div style={{ background:T.white, borderRadius:T.radiusLg, padding:32, border:`1px solid ${T.border}` }}>
                        <h2 style={{ fontFamily:T.fontDisplay, fontSize:20, fontWeight:700, color:T.text, marginBottom:20 }}>送信確認</h2>
                        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                          {[
                            { label:'アーティスト', value:artist.artistName },
                            { label:'楽曲', value:artist.songTitle || '(未入力)' },
                            { label:'ジャンル', value: Array.isArray(artist.genre) ? artist.genre.join(', ') : (artist.genre || '(未入力)') },
                            { label:'送信先キュレーター数', value:`${selectedCurators.length}件` },
                          ].map(item => (
                            <div key={item.label} style={{ display:'flex', alignItems:'baseline', gap:16, padding:'12px 0', borderBottom:`1px solid ${T.border}` }}>
                              <span style={{ fontSize:13, color:T.textSub, fontFamily:T.font, minWidth:160 }}>{item.label}</span>
                              <span style={{ fontSize:15, fontWeight:600, color:T.text, fontFamily:T.font }}>{item.value}</span>
                            </div>
                          ))}
                          <div style={{ display:'flex', alignItems:'baseline', gap:16, padding:'12px 0' }}>
                            <span style={{ fontSize:13, color:T.textSub, fontFamily:T.font, minWidth:160 }}>消費クレジット</span>
                            <span style={{ fontSize:20, fontWeight:800, color:T.accent, fontFamily:T.font }}>{totalCreditCost} cr</span>
                            <span style={{ fontSize:13, color:T.textMuted, fontFamily:T.font }}>（残高: {credits} cr → {credits - totalCreditCost} cr）</span>
                          </div>
                        </div>
                        {credits < totalCreditCost && (
                          <div style={{ padding:'12px 16px', background:'#fef2f2', borderRadius:T.radius, fontSize:13.5, color:'#dc2626', fontFamily:T.font, marginTop:16 }}>
                            クレジットが不足しています。キュレーターの数を減らすか、クレジットを購入してください。
                          </div>
                        )}
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                        <button onClick={() => setPitchStep(1)} style={{ padding:'12px 24px', fontSize:14, fontWeight:600, fontFamily:T.font, background:'transparent', color:T.textSub, border:`1.5px solid ${T.border}`, borderRadius:T.radius, cursor:'pointer' }}>← 戻る</button>
                        <button onClick={sendAll} disabled={credits < totalCreditCost} style={{ padding:'14px 36px', fontSize:16, fontWeight:700, fontFamily:T.font, background: credits < totalCreditCost ? T.borderLight : T.green, color: credits < totalCreditCost ? T.textMuted : '#fff', border:'none', borderRadius:T.radius, cursor: credits < totalCreditCost ? 'not-allowed' : 'pointer', boxShadow: credits < totalCreditCost ? 'none' : '0 4px 16px rgba(22,163,74,0.3)' }}>
                          ✅ 送信する ({totalCreditCost}cr)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 4: Sent + Tracking ── */}
              {campaignStep === 4 && (
                <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
                  <div style={{ background:T.white, borderRadius:T.radiusLg, padding:32, border:`1.5px solid ${T.greenBorder}`, textAlign:'center' }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
                    <h1 style={{ fontFamily:T.fontDisplay, fontSize:24, fontWeight:700, color:T.green, marginBottom:8 }}>✅ {sentPitches.length}件送信完了！</h1>
                    <p style={{ fontSize:14, color:T.textSub, fontFamily:T.font }}>キュレーターへのピッチが送信されました。ステータスはリアルタイムで更新されます。</p>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {sentPitches.map(pitch => (
                      <div key={pitch.id} style={{ background:T.white, borderRadius:T.radiusLg, padding:24, border:`1px solid ${pitch.status==='accepted' ? T.greenBorder : pitch.status==='declined' ? '#fca5a5' : T.border}`, transition:'border-color 0.3s' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                              <span style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:T.font }}>{pitch.curatorName}</span>
                              <span style={{ fontSize:12, color:T.textMuted, fontFamily:T.font }}>{pitch.curatorPlatform}</span>
                            </div>
                            <div style={{ fontSize:13, color:T.textSub, fontFamily:T.font, marginBottom:8 }}>{pitch.artistName} — {pitch.songTitle || '(楽曲未設定)'}</div>
                            {pitch.feedback && (
                              <div style={{ padding:'10px 14px', background: pitch.status==='accepted' ? T.greenLight : '#fef2f2', borderRadius:T.radius, fontSize:13, fontStyle:'italic', color: pitch.status==='accepted' ? T.green : '#dc2626', fontFamily:T.font, marginTop:8, border:`1px solid ${pitch.status==='accepted' ? T.greenBorder : '#fca5a5'}` }}>
                                "{pitch.feedback}"
                              </div>
                            )}
                          </div>
                          <StatusBadge status={pitch.status} />
                        </div>
                        <PitchProgress status={pitch.status} />
                        <div style={{ fontSize:11.5, color:T.textMuted, fontFamily:T.font, marginTop:8 }}>
                          送信: {new Date(pitch.sentAt).toLocaleDateString('ja-JP')} | 期限: {new Date(pitch.deadline).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:12 }}>
                    {[
                      { label:'送信済', status:'sent', icon:'📤', color:T.textSub },
                      { label:'開封済', status:'opened', icon:'👁', color:T.accent },
                      { label:'試聴済', status:'listened', icon:'🎧', color:'#b45309' },
                      { label:'採用', status:'accepted', icon:'🎉', color:T.green },
                      { label:'不採用', status:'declined', icon:'📋', color:'#dc2626' },
                    ].map(item => {
                      const count = sentPitches.filter(p => p.status === item.status).length;
                      return (
                        <div key={item.status} style={{ background:T.white, borderRadius:T.radiusLg, padding:'16px 20px', border:`1px solid ${T.border}`, textAlign:'center' }}>
                          <div style={{ fontSize:22 }}>{item.icon}</div>
                          <div style={{ fontSize:22, fontWeight:800, color:item.color, fontFamily:T.font, marginTop:4 }}>{count}</div>
                          <div style={{ fontSize:12, color:T.textMuted, fontFamily:T.font }}>{item.label}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display:'flex', justifyContent:'center', paddingTop:8 }}>
                    <button
                      onClick={handleBackToDashboard}
                      style={{ padding:'14px 36px', fontSize:15, fontWeight:700, fontFamily:T.font, background:T.accent, color:'#fff', border:'none', borderRadius:T.radius, cursor:'pointer', boxShadow:'0 4px 16px rgba(14,165,233,0.3)' }}
                    >ダッシュボードに戻る</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Sticky bottom bar for Step 2 ── */}
      {loginState === 'campaign' && campaignStep === 2 && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'rgba(255,255,255,0.97)', backdropFilter:'blur(12px)', borderTop:`1px solid ${T.border}`, padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:200 }}>
          <div style={{ fontFamily:T.font, fontSize:14 }}>
            <span style={{ fontWeight:700, color:T.accent }}>{selected.size} selected</span>
            <span style={{ color:T.textMuted }}> • {totalCreditCost} credits</span>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setCampaignStep(1)} style={{ padding:'10px 20px', fontSize:13, fontWeight:600, fontFamily:T.font, background:'transparent', color:T.textSub, border:`1.5px solid ${T.border}`, borderRadius:T.radius, cursor:'pointer' }}>← 戻る</button>
            <button onClick={() => { setPitchStep(0); setCampaignStep(3); }} disabled={selected.size === 0} style={{ padding:'12px 28px', fontSize:14, fontWeight:600, background: selected.size===0 ? T.borderLight : T.accent, color: selected.size===0 ? T.textMuted : '#fff', borderRadius:T.radius, border:'none', cursor: selected.size===0 ? 'not-allowed' : 'pointer', fontFamily:T.font, boxShadow: selected.size===0 ? 'none' : '0 4px 16px rgba(14,165,233,0.3)' }}>次へ: ピッチ作成 →</button>
          </div>
        </div>
      )}

      {/* ── Curator Modal ── */}
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
