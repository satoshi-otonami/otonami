import { useState, useMemo, useCallback, useEffect } from "react";

/* ══════════════════════════════════════════════════════════════
   OTONAMI — Redesign Prototype (Groover-inspired, Sky Blue)
   White background + Card UI + Generous spacing
   Accent: #0ea5e9 (Sky Blue)
   ══════════════════════════════════════════════════════════════ */

const FontLoader = () => {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Playfair+Display:wght@600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
  return null;
};

/* ── Design Tokens ── */
const T = {
  bg: "#f8fafc",
  white: "#ffffff",
  text: "#0f172a",
  textSub: "#475569",
  textMuted: "#94a3b8",
  accent: "#0ea5e9",
  accentDark: "#0284c7",
  accentLight: "#f0f9ff",
  accentBorder: "#bae6fd",
  accentGrad: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
  green: "#16a34a",
  greenLight: "#f0fdf4",
  greenBorder: "#bbf7d0",
  amber: "#f59e0b",
  amberLight: "#fffbeb",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
  shadowMd: "0 4px 16px rgba(14,165,233,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  shadowLg: "0 16px 48px rgba(0,0,0,0.12)",
  radius: 12,
  radiusLg: 16,
  radiusXl: 24,
  font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontDisplay: "'Playfair Display', Georgia, serif",
};

const FL = {US:"\u{1F1FA}\u{1F1F8}",UK:"\u{1F1EC}\u{1F1E7}",JP:"\u{1F1EF}\u{1F1F5}",DE:"\u{1F1E9}\u{1F1EA}",FR:"\u{1F1EB}\u{1F1F7}",NL:"\u{1F1F3}\u{1F1F1}",AU:"\u{1F1E6}\u{1F1FA}",CL:"\u{1F1E8}\u{1F1F1}",IT:"\u{1F1EE}\u{1F1F9}",UA:"\u{1F1FA}\u{1F1E6}",KR:"\u{1F1F0}\u{1F1F7}",BR:"\u{1F1E7}\u{1F1F7}",SE:"\u{1F1F8}\u{1F1EA}",CA:"\u{1F1E8}\u{1F1E6}",MX:"\u{1F1F2}\u{1F1FD}",NZ:"\u{1F1F3}\u{1F1FF}",ES:"\u{1F1EA}\u{1F1F8}"};

const GENRES = ["Jazz fusion","Instrumental","Dance music","Film music","Modern jazz","Ambient","Chill out","Lo-fi Hip Hop","Experimental","Indie pop","J-pop","City pop","Electronic","R&B","Neo soul","World music","Classical crossover","Funk","Latin jazz","Afrobeat"];

const CURATORS = [
  {id:1,name:"Bizarreland Radio",type:"Playlist Curator",country:"CL",color:"#dc2626",certified:true,shareRate:7,followers:{spotify:18400,instagram:335000,facebook:22000,youtube:49},genres:["Dance music","Jazz fusion","Instrumental"],genresOpen:["Afrobeat","Lo-fi Hip Hop","Electronic"],moods:["Authentic","Eclectic","Creative","Danceable","Downbeat","Engaged"],tags:["Honest","High Impact"],matchTags:["Dance music","Jazz fusion","Japanese artists","Instrumental/Without lyrics","Released tracks"],recentArtists:[{n:"Burning Linga",by:"Maicky Miller"},{n:"The Quease",by:"Robin Mullarkey"},{n:"Outside",by:"just martin"},{n:"Last Night",by:"Rodney Hazard"}],bio:"My radio/playlist have a lot of style, but the most important is the attitude and the skills.",opportunities:["Add artists to my impactful playlist(s)","Create post or reel on social media","Add to story on social media"],similarTo:["Snoop Dogg","Wiz Khalifa","SFDK","Mucho Muchacho"]},
  {id:2,name:"Liminal Waves",type:"Playlist Curator",country:"NL",color:"#7c3aed",certified:false,shareRate:12,followers:{spotify:5200},genres:["Film music","Instrumental","Ambient"],genresOpen:["Experimental jazz","Minimal"],moods:["Atmospheric","Contemplative","Cinematic"],tags:["Honest"],matchTags:["Instrumental","Ambient","Japanese artists"],recentArtists:[],bio:"Curating music for introspective moments. Always looking for unique soundscapes.",opportunities:["Add artists to my impactful playlist(s)"],similarTo:[]},
  {id:3,name:"FusioNostalgia",type:"Media Outlet/Journalist",country:"US",color:"#059669",certified:false,shareRate:18,followers:{instagram:12000},genres:["Dance music","Jazz fusion","Instrumental","Disco"],genresOpen:["Indie pop","Funk","Neo soul"],moods:["Groovy","Energetic","Nostalgic"],tags:["High sharing rate","Shared 1 of your tracks"],matchTags:["Jazz fusion","Dance music","Instrumental"],recentArtists:[],bio:"Covering the intersection of jazz, funk, and electronic music worldwide.",opportunities:["Feature in online magazine","Social media post"],similarTo:[]},
  {id:4,name:"Gamadeus Playlist",type:"Playlist Curator",country:"IT",color:"#0284c7",certified:true,shareRate:15,followers:{spotify:8900},genres:["Film music","Instrumental","Ambient","Electronic"],genresOpen:["Minimal","Neo/Modern Classical","Solo Piano"],moods:["Minimal","Contemplative","Dreamy"],tags:["Honest","A Quick Sharer"],matchTags:["Film music","Instrumental","Ambient"],recentArtists:[],bio:"A certified playlist focused on cinematic and atmospheric sounds.",opportunities:["Add artists to my impactful playlist(s)"],similarTo:[]},
  {id:5,name:"Italian Summer Aesthetic",type:"Playlist Curator",country:"IT",color:"#ea580c",certified:false,shareRate:22,followers:{spotify:24000,instagram:8500},genres:["Film music","Instrumental","Modern jazz"],genresOpen:["Canzone Italiana","Dream pop","Indie folk"],moods:["Warm","Romantic","Breezy"],tags:["Honest","High Impact","Top curator/pro"],matchTags:["Film music","Instrumental","Modern jazz"],recentArtists:[],bio:"Curating the perfect soundtrack for golden hour moments.",opportunities:["Add artists to my impactful playlist(s)","Add to story on social media"],similarTo:[]},
  {id:6,name:"Max Panasiuk",type:"Playlist Curator",country:"UA",color:"#4f46e5",certified:false,shareRate:9,followers:{spotify:3200},genres:["Film music","Instrumental","Rap in English"],genresOpen:["Chill/Lo-fi Hip-Hop","Electropop"],moods:["Chill","Energetic","Groovy"],tags:["Honest"],matchTags:["Film music","Instrumental"],recentArtists:[],bio:"Ukrainian curator open to global sounds.",opportunities:["Add artists to my impactful playlist(s)"],similarTo:[]},
  {id:7,name:"Island Music",type:"Playlist Curator",country:"IT",color:"#0d9488",certified:false,shareRate:25,followers:{spotify:14500},genres:["Dance music","Film music","Instrumental"],genresOpen:["Ambient","Chill out","Classical music"],moods:["Relaxing","Uplifting","Tropical"],tags:["High sharing rate"],matchTags:["Dance music","Film music","Instrumental"],recentArtists:[],bio:"Island vibes and global grooves. High sharing rate.",opportunities:["Add artists to my impactful playlist(s)"],similarTo:[]},
  {id:8,name:"Hot Monkey Music",type:"Playlist Curator",country:"AU",color:"#be123c",certified:false,shareRate:11,followers:{spotify:31000,instagram:15000},genres:["Dance music","Bass music","Deep house"],genresOpen:["House music","Tech House"],moods:["Energetic","Danceable","Bold"],tags:["Honest","Clear about their musical style","Top curator/pro"],matchTags:["Dance music"],recentArtists:[],bio:"Australia's go-to curator for dance, bass, and groove.",opportunities:["Add artists to my impactful playlist(s)"],similarTo:[]},
];

const TRACK = {name:"Moment",artist:"Ryu Miho",band:"ROUTE14band",album:"GHIBLI REIMAGINED",genres:["Dance music","Film music","Jazz fusion","Instrumental","Modern jazz","Rap in English"]};

const fmt = n => n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"k":String(n);

const calcMatch = c => {
  const cAll = [...c.genres,...(c.genresOpen||[])];
  const ov = TRACK.genres.filter(g=>cAll.includes(g)).length;
  return Math.min(100,Math.round(ov/TRACK.genres.length*100+(c.shareRate||0)*0.5));
};

/* ═══ ATOMS ═══ */

const Avatar = ({name,color,size=48}) => (
  <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg, ${color}ee, ${color}99)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:size*.35,fontFamily:T.font,letterSpacing:-.5}}>
    {name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
  </div>
);

const Tag = ({children,variant="default",small=false}) => {
  const V = {default:{bg:T.borderLight,color:T.textSub,bd:T.border},match:{bg:T.greenLight,color:T.green,bd:T.greenBorder},accent:{bg:T.accentLight,color:T.accent,bd:T.accentBorder},amber:{bg:T.amberLight,color:"#b45309",bd:"#fde68a"}};
  const s = V[variant]||V.default;
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:small?"2px 8px":"4px 12px",background:s.bg,color:s.color,border:`1px solid ${s.bd}`,borderRadius:20,fontSize:small?11:12.5,fontWeight:500,fontFamily:T.font,whiteSpace:"nowrap"}}>{variant==="match"&&<span style={{fontSize:small?9:11}}>{"✓"}</span>}{children}</span>;
};

const Btn = ({children,variant="primary",size="md",onClick,style:sx={},disabled}) => {
  const [h,setH] = useState(false);
  const sz = {sm:{padding:"8px 16px",fontSize:13},md:{padding:"12px 24px",fontSize:14},lg:{padding:"16px 36px",fontSize:16}};
  const vars = {primary:{background:h?T.accentDark:T.accent,color:"#fff",border:"none",boxShadow:h?"0 4px 16px rgba(14,165,233,0.3)":"none"},secondary:{background:h?T.bg:"transparent",color:T.text,border:`1.5px solid ${T.border}`},ghost:{background:h?T.accentLight:"transparent",color:T.accent,border:"none"},white:{background:"#fff",color:T.accent,border:"none",boxShadow:h?"0 4px 16px rgba(0,0,0,0.1)":"none"}};
  return <button onClick={disabled?undefined:onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,cursor:disabled?"not-allowed":"pointer",fontFamily:T.font,fontWeight:600,borderRadius:T.radius,transition:"all 0.2s",opacity:disabled?.5:1,...sz[size],...vars[variant],...sx}}>{children}</button>;
};

const Section = ({title,children}) => (
  <div><h3 style={{fontFamily:T.font,fontSize:14,fontWeight:700,color:T.text,marginBottom:12}}>{title}</h3>{children}</div>
);

/* ═══ HEADER ═══ */

const Header = ({page,setPage}) => {
  const [lang,setLang] = useState("JP");
  return (
  <header style={{position:"sticky",top:0,zIndex:100,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${T.border}`,padding:"0 24px",height:64,display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:T.font}}>
    <div style={{display:"flex",alignItems:"center",gap:28}}>
      <div onClick={()=>setPage("landing")} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:34,height:34,borderRadius:10,background:T.accentGrad,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:17}}>O</div>
        <span style={{fontFamily:T.fontDisplay,fontSize:22,fontWeight:700,color:T.accent,letterSpacing:-.3}}>OTONAMI</span>
      </div>
      <nav style={{display:"flex",gap:4}}>
        {[{k:"landing",l:"使い方"},{k:"catalog",l:"キュレーターを探す"},{k:"submit",l:"アーティストの方"}].map(i=>(
          <button key={i.k} onClick={()=>setPage(i.k)} style={{background:page===i.k?T.accentLight:"transparent",color:page===i.k?T.accent:T.textSub,border:"none",padding:"8px 14px",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:T.font,transition:"all 0.15s"}}>{i.l}</button>
        ))}
      </nav>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:`1px solid ${T.border}`}}>
        {["EN","JP"].map(l=>(
          <button key={l} onClick={()=>setLang(l)} style={{padding:"6px 12px",fontSize:12,fontWeight:600,fontFamily:T.font,border:"none",cursor:"pointer",transition:"all .15s",background:lang===l?T.text:"transparent",color:lang===l?"#fff":T.textSub}}>{l==="JP"?"日本語":l}</button>
        ))}
      </div>
      <Btn size="sm" onClick={()=>setPage("catalog")}>キュレーター登録</Btn>
    </div>
  </header>
  );
};

/* ═══ LANDING ═══ */

const Landing = ({setPage}) => (
  <div>
    {/* Hero — Live photo background with dark overlay */}
    <section style={{
      position:"relative",overflow:"hidden",textAlign:"center",
      padding:"120px 24px 100px",
      background:"linear-gradient(180deg, rgba(15,23,42,0.72) 0%, rgba(15,23,42,0.82) 100%), url('https://images.unsplash.com/photo-1501386761578-0a55f6f059d6?w=1600&q=80') center/cover no-repeat",
    }}>
      {/* Subtle blue glow overlay */}
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 80%, rgba(14,165,233,0.15) 0%, transparent 60%)",pointerEvents:"none"}}/>
      <div style={{maxWidth:740,margin:"0 auto",position:"relative",zIndex:1}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 18px",background:"rgba(14,165,233,0.15)",borderRadius:24,fontSize:13,fontWeight:600,color:"#7dd3fc",marginBottom:28,border:"1px solid rgba(14,165,233,0.3)",backdropFilter:"blur(8px)"}}>
          ♪ キュレーターネットワーク — AIマッチング搭載
        </div>
        <h1 style={{fontFamily:T.fontDisplay,fontSize:50,fontWeight:700,color:"#fff",lineHeight:1.18,marginBottom:24,letterSpacing:-.5}}>
          日本のインディー音楽を、<br/><span style={{color:"#38bdf8"}}>世界のキュレーターへ</span>
        </h1>
        <p style={{fontSize:17,color:"rgba(255,255,255,0.75)",lineHeight:1.75,maxWidth:560,margin:"0 auto 44px",fontFamily:T.font}}>
          OTONAMIは厳選された日本のインディーアーティストとキュレーターをつなぎます。レビューで報酬を獲得。スパムなし — あなたの好みにマッチした楽曲だけが届きます。
        </p>
        <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
          <Btn size="lg" onClick={()=>setPage("catalog")} style={{background:"#10b981",boxShadow:"0 4px 20px rgba(16,185,129,0.35)"}}>キュレーターとして参加 →</Btn>
          <Btn variant="secondary" size="lg" onClick={()=>setPage("submit")} style={{color:"#fff",borderColor:"rgba(255,255,255,0.3)"}}>使い方を見る</Btn>
        </div>
      </div>
    </section>

    <section style={{padding:"36px 24px",background:T.white,borderBottom:`1px solid ${T.border}`}}>
      <div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"center",gap:64,flexWrap:"wrap"}}>
        {[{n:"3,449",l:"Curators & Pros"},{n:"70+",l:"Japanese Labels"},{n:"93%",l:"Response Rate"},{n:"10yr",l:"SXSW Track Record"}].map((s,i)=>(
          <div key={i} style={{textAlign:"center"}}>
            <div style={{fontFamily:T.fontDisplay,fontSize:32,fontWeight:700,color:T.accent}}>{s.n}</div>
            <div style={{fontSize:13,color:T.textMuted,fontFamily:T.font,marginTop:4}}>{s.l}</div>
          </div>
        ))}
      </div>
    </section>

    <section style={{padding:"88px 24px",background:T.bg}}>
      <div style={{maxWidth:960,margin:"0 auto"}}>
        <h2 style={{fontFamily:T.fontDisplay,fontSize:36,fontWeight:700,color:T.text,textAlign:"center",marginBottom:64}}>How OTONAMI Works</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:28}}>
          {[
            {s:"01",t:"Submit Your Track",d:"Add your Spotify or YouTube link. Our AI analyzes your sound profile and generates an English pitch automatically.",ic:"\u{1F3B5}"},
            {s:"02",t:"Find Matching Curators",d:"Browse 3,400+ curators with AI match scores. Filter by genre, country, and type to find your perfect fit.",ic:"\u{1F3AF}"},
            {s:"03",t:"Get Real Feedback",d:"Curators listen and respond within 7 days. Get playlist placements, blog features, or constructive feedback.",ic:"\u{1F4AC}"},
          ].map((item,i)=>(
            <div key={i} style={{background:T.white,borderRadius:T.radiusLg,padding:36,border:`1px solid ${T.border}`,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:T.accentGrad}}/>
              <div style={{width:52,height:52,borderRadius:14,background:T.accentLight,border:`1px solid ${T.accentBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,marginBottom:20}}>{item.ic}</div>
              <div style={{fontSize:11,fontWeight:700,color:T.accent,marginBottom:8,fontFamily:T.font,letterSpacing:1.5}}>STEP {item.s}</div>
              <h3 style={{fontFamily:T.font,fontSize:18,fontWeight:700,color:T.text,marginBottom:12}}>{item.t}</h3>
              <p style={{fontSize:14,color:T.textSub,lineHeight:1.75,fontFamily:T.font}}>{item.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section style={{padding:"64px 24px",background:T.accentGrad,textAlign:"center"}}>
      <h2 style={{fontFamily:T.fontDisplay,fontSize:32,fontWeight:700,color:"#fff",marginBottom:16}}>Ready to reach the world?</h2>
      <p style={{fontSize:16,color:"rgba(255,255,255,0.85)",marginBottom:36,fontFamily:T.font}}>Join 70+ Japanese labels already using OTONAMI</p>
      <Btn variant="white" size="lg" onClick={()=>setPage("submit")}>Start Your First Pitch →</Btn>
    </section>

    <footer style={{padding:"32px 24px",background:T.white,borderTop:`1px solid ${T.border}`,textAlign:"center",fontFamily:T.font,fontSize:13,color:T.textMuted}}>
      OTONAMI — Connecting Japanese Music to the World &nbsp;|&nbsp; TYCompany LLC / ILCJ
    </footer>
  </div>
);

/* ═══ CURATOR CARD ═══ */

const CuratorCard = ({c,onDetail,onToggle,selected}) => {
  const [h,setH] = useState(false);
  const score = calcMatch(c);
  return (
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} onClick={()=>onDetail(c)} style={{background:T.white,borderRadius:T.radiusLg,border:`1.5px solid ${selected?T.accent:h?T.accentBorder:T.border}`,padding:24,transition:"all 0.2s",cursor:"pointer",boxShadow:h?T.shadowMd:T.shadow,transform:h?"translateY(-2px)":"none"}}>
      <div style={{display:"flex",gap:14,marginBottom:14}}>
        <Avatar name={c.name} color={c.color} size={52}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontFamily:T.font,fontSize:16,fontWeight:700,color:T.text}}>{c.name}</span>
            <span style={{fontSize:16}}>{FL[c.country]}</span>
          </div>
          <div style={{fontSize:12.5,color:T.textSub,fontFamily:T.font,marginTop:2}}>{c.type}</div>
        </div>
        {score>=50&&(
          <div style={{width:46,height:46,borderRadius:"50%",flexShrink:0,background:score>=75?T.greenLight:score>=60?T.accentLight:T.amberLight,border:`2px solid ${score>=75?T.greenBorder:score>=60?T.accentBorder:"#fde68a"}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,fontFamily:T.font,color:score>=75?T.green:score>=60?T.accent:"#b45309"}}>{score}%</div>
        )}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
        {c.certified&&<span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11.5,fontWeight:600,color:T.green,fontFamily:T.font}}>♫ Certified Spotify playlist</span>}
        {c.tags.slice(0,2).map((t,i)=><span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11.5,color:T.textSub,fontFamily:T.font}}>{t.includes("Honest")?"♡":t.includes("sharing")?"👍":t.includes("Top")?"★":"●"} {t}</span>)}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {c.genres.slice(0,4).map((g,i)=><Tag key={i} small>{g}</Tag>)}
        {c.genres.length>4&&<Tag small>+{c.genres.length-4}</Tag>}
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:12}}>
          {c.followers.spotify&&<span style={{fontSize:12,color:T.textMuted,fontFamily:T.font}}>♫ {fmt(c.followers.spotify)}</span>}
          {c.followers.instagram&&<span style={{fontSize:12,color:T.textMuted,fontFamily:T.font}}>📷 {fmt(c.followers.instagram)}</span>}
        </div>
        <Btn variant={selected?"ghost":"secondary"} size="sm" onClick={e=>{e.stopPropagation();onToggle(c.id);}} style={selected?{background:T.accentLight,color:T.accent,border:`1.5px solid ${T.accentBorder}`}:{}}>{selected?"Added ✓":"Add for 2 ©"}</Btn>
      </div>
    </div>
  );
};

/* ═══ CURATOR MODAL ═══ */

const CuratorModal = ({c,onClose,onToggle,selected}) => {
  if(!c) return null;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(15,23,42,0.45)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.white,borderRadius:T.radiusXl,maxWidth:580,width:"100%",maxHeight:"88vh",overflow:"auto",boxShadow:T.shadowLg}}>
        <div style={{padding:"32px 32px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",gap:20}}>
          <Avatar name={c.name} color={c.color} size={72}/>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <h2 style={{fontFamily:T.font,fontSize:22,fontWeight:700,color:T.text,margin:0}}>{c.name}</h2>
              <span style={{fontSize:20}}>{FL[c.country]}</span>
            </div>
            <div style={{fontSize:14,color:T.textSub,fontFamily:T.font,marginTop:4}}>{c.type}</div>
            <div style={{display:"flex",gap:16,marginTop:12,flexWrap:"wrap"}}>
              {Object.entries(c.followers).map(([k,v])=><span key={k} style={{fontSize:12,color:T.textSub,fontFamily:T.font}}>{k==="spotify"?"♫":k==="instagram"?"📷":k==="facebook"?"👥":"🎬"} {fmt(v)}</span>)}
            </div>
            {c.certified&&<div style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:10,padding:"4px 12px",background:T.greenLight,borderRadius:12,fontSize:12,fontWeight:600,color:T.green,fontFamily:T.font}}>♫ Certified Spotify playlist</div>}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:24,color:T.textMuted,cursor:"pointer",padding:4,alignSelf:"flex-start"}}>×</button>
        </div>

        <div style={{padding:32,display:"flex",flexDirection:"column",gap:28}}>
          <p style={{fontSize:14,color:T.textSub,lineHeight:1.75,fontFamily:T.font,margin:0}}>{c.bio}</p>
          <div style={{display:"flex",alignItems:"center",gap:16,padding:"14px 18px",background:T.bg,borderRadius:T.radius,border:`1px solid ${T.border}`}}>
            <span style={{fontSize:13,color:T.textSub,fontFamily:T.font}}>Share rate</span>
            <span style={{fontWeight:700,fontSize:22,color:T.accent,fontFamily:T.font}}>{c.shareRate}%</span>
          </div>
          <Section title="How well you match"><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{c.matchTags.map((t,i)=><Tag key={i} variant="match">{t}</Tag>)}</div></Section>
          <Section title="Genres accepted most often"><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{c.genres.map((g,i)=><Tag key={i}>{g}</Tag>)}</div></Section>
          {c.genresOpen.length>0&&<Section title="Also open to receiving"><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{c.genresOpen.map((g,i)=><Tag key={i} variant="accent">{g}</Tag>)}</div></Section>}
          {c.similarTo&&c.similarTo.length>0&&<Section title="They want music similar to..."><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{c.similarTo.map((a,i)=><span key={i} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",background:T.bg,borderRadius:20,fontSize:13,fontWeight:500,color:T.text,border:`1px solid ${T.border}`,fontFamily:T.font}}>🎤 {a}</span>)}</div></Section>}
          <Section title="Moods they love"><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{c.moods.map((m,i)=><Tag key={i}>{m}</Tag>)}</div></Section>
          <Section title="Main opportunities">{c.opportunities.map((op,i)=><div key={i} style={{padding:"10px 14px",background:T.bg,borderRadius:T.radius,marginBottom:8,fontSize:13.5,color:T.text,fontFamily:T.font,border:`1px solid ${T.border}`}}>{op}</div>)}</Section>
          {c.recentArtists&&c.recentArtists.length>0&&<Section title="Recently gave opportunities to"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{c.recentArtists.map((a,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:T.bg,borderRadius:T.radius,border:`1px solid ${T.border}`}}><div style={{width:32,height:32,borderRadius:8,background:T.accentLight,border:`1px solid ${T.accentBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🎵</div><div><div style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font}}>{a.n}</div><div style={{fontSize:11,color:T.textMuted,fontFamily:T.font}}>{a.by}</div></div></div>)}</div></Section>}
        </div>

        <div style={{padding:"20px 32px",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",bottom:0,background:T.white,borderRadius:`0 0 ${T.radiusXl}px ${T.radiusXl}px`}}>
          <Btn variant="secondary" onClick={onClose}>View similar curators</Btn>
          <Btn onClick={()=>onToggle(c.id)}>{selected?"Added ✓":"Add for 2 ©"}</Btn>
        </div>
      </div>
    </div>
  );
};

/* ═══ CATALOG ═══ */

const Catalog = () => {
  const [sel,setSel] = useState(new Set());
  const [modal,setModal] = useState(null);
  const [gF,setGF] = useState(null);
  const [tF,setTF] = useState(null);
  const [q,setQ] = useState("");
  const toggle = useCallback(id=>{setSel(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});},[]);
  const list = useMemo(()=>CURATORS.filter(c=>{if(gF&&!c.genres.includes(gF)&&!(c.genresOpen||[]).includes(gF))return false;if(tF&&c.type!==tF)return false;if(q&&!c.name.toLowerCase().includes(q.toLowerCase()))return false;return true;}).sort((a,b)=>calcMatch(b)-calcMatch(a)),[gF,tF,q]);

  const selStyle = {padding:"10px 16px",borderRadius:T.radius,fontSize:14,fontFamily:T.font,fontWeight:500,cursor:"pointer",outline:"none",border:`1.5px solid ${T.border}`,background:T.white,color:T.text,appearance:"none",paddingRight:32,backgroundRepeat:"no-repeat",backgroundPosition:"right 12px center",backgroundSize:"12px",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%2394a3b8' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`};

  return (
    <div style={{maxWidth:1120,margin:"0 auto",padding:"32px 24px 140px"}}>
      <h1 style={{fontFamily:T.fontDisplay,fontSize:30,fontWeight:700,color:T.text,marginBottom:8}}>{CURATORS.length.toLocaleString()} curators & pros</h1>
      <p style={{fontSize:14,color:T.textSub,fontFamily:T.font,marginBottom:32}}>Artists who send to 50+ curators get the best results</p>

      <div style={{display:"flex",gap:12,marginBottom:32,flexWrap:"wrap",alignItems:"center"}}>
        <select value={gF||""} onChange={e=>setGF(e.target.value||null)} style={{...selStyle,...(gF?{borderColor:T.accent,background:T.accentLight,color:T.accent}:{})}}><option value="">Genres</option>{GENRES.map(g=><option key={g} value={g}>{g}</option>)}</select>
        <select value={tF||""} onChange={e=>setTF(e.target.value||null)} style={{...selStyle,...(tF?{borderColor:T.accent,background:T.accentLight,color:T.accent}:{})}}><option value="">Curator/Pro Types</option><option value="Playlist Curator">Playlist Curator</option><option value="Media Outlet/Journalist">Media / Journalist</option></select>
        <div style={{flex:1,minWidth:200}}><input type="text" placeholder="Search curators..." value={q} onChange={e=>setQ(e.target.value)} style={{width:"100%",padding:"10px 16px",borderRadius:T.radius,border:`1.5px solid ${T.border}`,fontSize:14,fontFamily:T.font,outline:"none",background:T.white,color:T.text}}/></div>
      </div>

      <div style={{display:"inline-flex",gap:16,marginBottom:28,padding:"14px 24px",background:T.white,borderRadius:T.radiusLg,border:`1px solid ${T.border}`,alignItems:"center",boxShadow:T.shadow}}>
        {[{n:50,p:60,c:"#fbbf24"},{n:100,p:72,c:"#fb923c"},{n:"200+",p:93,c:T.green}].map((x,i)=>(
          <div key={i} style={{textAlign:"center",minWidth:48}}>
            <div style={{fontWeight:800,fontSize:18,color:x.c,fontFamily:T.font}}>{x.p}%</div>
            <div style={{fontSize:10,color:T.textMuted,fontFamily:T.font,marginTop:2}}>{x.n} pros</div>
          </div>
        ))}
        <span style={{fontSize:13,color:T.textSub,fontFamily:T.font,marginLeft:8}}>success rate</span>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(330px, 1fr))",gap:20}}>
        {list.map(c=><CuratorCard key={c.id} c={c} onDetail={setModal} onToggle={toggle} selected={sel.has(c.id)}/>)}
      </div>
      {list.length===0&&<div style={{textAlign:"center",padding:60,color:T.textMuted,fontFamily:T.font,fontSize:15}}>No curators match your filters.</div>}

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderTop:`1px solid ${T.border}`,padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:200}}>
        <div style={{fontFamily:T.font,fontSize:14}}><span style={{fontWeight:700,color:T.accent}}>{sel.size} selected</span><span style={{color:T.textMuted}}> • {sel.size*2} ©</span></div>
        <Btn disabled={sel.size===0}>Next step →</Btn>
      </div>

      <CuratorModal c={modal} onClose={()=>setModal(null)} onToggle={toggle} selected={modal?sel.has(modal.id):false}/>
    </div>
  );
};

/* ═══ SUBMIT TRACK ═══ */

const SubmitTrack = ({setPage}) => {
  const [step,setStep] = useState(1);
  return (
    <div style={{maxWidth:720,margin:"0 auto",padding:"48px 24px 100px"}}>
      <div style={{display:"flex",gap:8,marginBottom:48}}>{[1,2,3].map(s=><div key={s} style={{flex:1,height:4,borderRadius:2,background:s<=step?T.accent:T.border,transition:"all 0.3s"}}/>)}</div>

      {step===1&&<div>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:40}}>
          <Avatar name="ROUTE14" color={T.accent} size={52}/>
          <h1 style={{fontFamily:T.fontDisplay,fontSize:28,fontWeight:700,color:T.text,margin:0}}>Which track do you have in mind?</h1>
        </div>
        <div style={{border:`2px dashed ${T.border}`,borderRadius:T.radiusLg,padding:"28px 24px",display:"flex",alignItems:"center",gap:16,cursor:"pointer",marginBottom:32}}>
          <div style={{width:44,height:44,borderRadius:12,background:T.bg,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:T.textMuted}}>+</div>
          <span style={{fontSize:15,color:T.textSub,fontFamily:T.font}}>Add a new track</span>
        </div>
        <h3 style={{fontFamily:T.font,fontSize:14,fontWeight:700,color:T.text,marginBottom:16}}>Suggested for you</h3>
        {[{name:"君をのせて (天空の城ラピュタ...)",artist:"RYU MIHO"},{name:"Ready for the Party",artist:"山崎千裕"},{name:"Shojokyoku (Ouverture miniatu...)",artist:"Chihiro Yamazaki"}].map((t,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:T.white,borderRadius:T.radius,marginBottom:10,border:`1px solid ${T.border}`,cursor:"pointer"}}>
            <div style={{width:44,height:44,borderRadius:8,background:`linear-gradient(135deg, ${T.accentLight}, ${T.bg})`,border:`1px solid ${T.accentBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🎵</div>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:T.text,fontFamily:T.font}}>{t.name}</div><div style={{fontSize:12,color:T.textMuted,fontFamily:T.font,marginTop:2}}>{t.artist}</div></div>
            <span style={{fontSize:16,color:T.green}}>♫</span>
          </div>
        ))}
        <h3 style={{fontFamily:T.font,fontSize:14,fontWeight:700,color:T.text,marginBottom:16,marginTop:32}}>Your added tracks</h3>
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:T.accentLight,borderRadius:T.radius,border:`2px solid ${T.accent}`}}>
          <div style={{width:44,height:44,borderRadius:8,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#fff",fontWeight:700}}>M</div>
          <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:T.font}}>Moment</div><div style={{fontSize:12,color:T.textSub,fontFamily:T.font,marginTop:2}}>Ryu Miho - Topic</div></div>
          <span style={{fontSize:14,color:T.accent,fontWeight:700}}>✓</span>
        </div>
        <div style={{marginTop:40,textAlign:"center"}}><Btn size="lg" onClick={()=>setStep(2)} style={{width:"100%",maxWidth:400}}>Next</Btn></div>
      </div>}

      {step===2&&<div>
        <h1 style={{fontFamily:T.fontDisplay,fontSize:28,fontWeight:700,color:T.text,marginBottom:8}}>Add info to help us find the best curators.</h1>
        <p style={{fontSize:14,color:T.textSub,fontFamily:T.font,marginBottom:36}}>This helps our AI match you with the right curators.</p>
        <label style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font,marginBottom:8,display:"block"}}>Track name <span style={{color:T.textMuted,fontWeight:400}}>(Required)</span></label>
        <input defaultValue="Moment" style={{width:"100%",padding:"12px 16px",borderRadius:T.radius,border:`1.5px solid ${T.border}`,fontSize:15,fontFamily:T.font,outline:"none",marginBottom:28,background:T.white,color:T.text}}/>
        <label style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font,marginBottom:12,display:"block"}}>Track genres <span style={{color:T.textMuted,fontWeight:400}}>(Required)</span></label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:28}}>
          {TRACK.genres.map((g,i)=><Tag key={i} variant="accent">{g} ×</Tag>)}
          <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:28,height:28,borderRadius:"50%",background:T.bg,border:`1px solid ${T.border}`,fontSize:16,color:T.textMuted,cursor:"pointer"}}>+</span>
        </div>
        <label style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font,marginBottom:12,display:"block"}}>YouTube / SoundCloud track link</label>
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:T.white,borderRadius:T.radius,marginBottom:20,border:`1px solid ${T.border}`}}>
          <div style={{width:40,height:40,borderRadius:8,background:"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>▶</div>
          <div><div style={{fontSize:14,fontWeight:600,color:T.text,fontFamily:T.font}}>Moment</div><div style={{fontSize:12,color:T.textMuted,fontFamily:T.font}}>Ryu Miho - Topic</div></div>
        </div>
        <label style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font,marginBottom:12,display:"block"}}>Spotify track link</label>
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:T.white,borderRadius:T.radius,marginBottom:20,border:`1px solid ${T.border}`}}>
          <div style={{width:40,height:40,borderRadius:8,background:T.greenLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>♫</div>
          <div><div style={{fontSize:14,fontWeight:600,color:T.text,fontFamily:T.font}}>Moment</div><div style={{fontSize:12,color:T.textMuted,fontFamily:T.font}}>RYU MIHO</div></div>
        </div>
        <label style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font,marginBottom:12,display:"block"}}>EP/LP link, if relevant</label>
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:T.white,borderRadius:T.radius,marginBottom:28,border:`1px solid ${T.border}`}}>
          <div style={{width:40,height:40,borderRadius:8,background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:T.textMuted}}>🔗</div>
          <div><div style={{fontSize:14,fontWeight:500,color:T.accent,fontFamily:T.font}}>https://lnk.to/GR_RR</div><div style={{fontSize:12,color:T.textMuted,fontFamily:T.font}}>ROUTE14</div></div>
        </div>
        <label style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font,marginBottom:12,display:"block"}}>Artists I sound like <span style={{color:T.textMuted,fontWeight:400}}>(max. 5)</span></label>
        <div style={{border:`2px dashed ${T.border}`,borderRadius:T.radius,padding:16,display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:28}}>
          <span style={{fontSize:20,color:T.textMuted}}>+</span><span style={{fontSize:13,color:T.textMuted,fontFamily:T.font}}>Add similar artists</span>
        </div>
        <div style={{display:"flex",gap:12,marginTop:40}}><Btn variant="secondary" size="lg" onClick={()=>setStep(1)}>Back</Btn><Btn size="lg" onClick={()=>setStep(3)} style={{flex:1}}>Next</Btn></div>
      </div>}

      {step===3&&<div style={{textAlign:"center",paddingTop:40}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:T.greenLight,border:`2px solid ${T.greenBorder}`,margin:"0 auto 24px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>✓</div>
        <h1 style={{fontFamily:T.fontDisplay,fontSize:32,fontWeight:700,color:T.text,marginBottom:12}}>Track ready!</h1>
        <p style={{fontSize:16,color:T.textSub,fontFamily:T.font,marginBottom:40,lineHeight:1.7}}>{"\"Moment\" by Ryu Miho is ready to pitch."}<br/>Now find the best curators for your music.</p>
        <Btn size="lg" onClick={()=>setPage("catalog")}>Find Curators →</Btn>
      </div>}
    </div>
  );
};

/* ═══ APP ═══ */

export default function OtonamiRedesign() {
  const [page,setPage] = useState("landing");
  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:T.font}}>
      <FontLoader/>
      <style>{`*{margin:0;padding:0;box-sizing:border-box}body{background:${T.bg}}::selection{background:${T.accentLight};color:${T.accent}}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <Header page={page} setPage={setPage}/>
      <main key={page} style={{animation:"fadeUp 0.4s ease"}}>
        {page==="landing"&&<Landing setPage={setPage}/>}
        {page==="catalog"&&<Catalog/>}
        {page==="submit"&&<SubmitTrack setPage={setPage}/>}
      </main>
    </div>
  );
}
