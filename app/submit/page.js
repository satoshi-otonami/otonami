'use client';
import { useState, useEffect } from 'react';
import { T } from '@/lib/design-tokens';

/* ── Genre options ── */
const GENRE_OPTIONS = [
  "Jazz fusion","Instrumental","Dance music","Film music","Modern jazz",
  "Ambient","Chill out","Lo-fi Hip Hop","Experimental","Indie pop","J-pop",
  "City pop","Electronic","R&B","Neo soul","World music","Funk","Latin jazz",
  "Jazz","Indie Rock","Alt Rock","Pop","Soul","Hip-Hop","Shoegaze","Dream Pop",
];

/* ── Dummy suggested tracks (Spotify API未連携時) ── */
const SUGGESTED = [
  { id:"s1", name:"君をのせて (天空の城ラピュタ...)", artist:"RYU MIHO", color:"#7c3aed" },
  { id:"s2", name:"Ready for the Party",             artist:"山崎千裕",   color:"#0284c7" },
  { id:"s3", name:"Shojokyoku (Ouverture miniatu...)", artist:"Chihiro Yamazaki", color:"#059669" },
];

/* ── Site header (shared) ── */
function SiteHeader({ lang, setLang }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${T.border}`,
      padding: '0 24px', height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: T.font,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: T.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17 }}>O</div>
          <span style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 700, color: T.accent, letterSpacing: -0.3 }}>OTONAMI</span>
        </a>
        <nav style={{ display: 'flex', gap: 4 }}>
          {[{href:'/',l:lang==='ja'?'使い方':'How It Works'},{href:'/curators',l:lang==='ja'?'キュレーターを探す':'Find Curators'},{href:'/submit',l:lang==='ja'?'アーティストの方':'For Artists'}].map(item => (
            <a key={item.href} href={item.href} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500,
              textDecoration: 'none', fontFamily: T.font,
              background: item.href === '/submit' ? T.accentLight : 'transparent',
              color:      item.href === '/submit' ? T.accent       : T.textSub,
            }}>{item.l}</a>
          ))}
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.border}` }}>
          {['EN','JP'].map(l => (
            <button key={l} onClick={() => setLang(l === 'JP' ? 'ja' : 'en')} style={{
              padding: '6px 12px', fontSize: 12, fontWeight: 600, fontFamily: T.font, border: 'none', cursor: 'pointer',
              background: (l === 'JP' ? lang === 'ja' : lang === 'en') ? T.text : 'transparent',
              color:      (l === 'JP' ? lang === 'ja' : lang === 'en') ? '#fff' : T.textSub,
            }}>{l === 'JP' ? '日本語' : l}</button>
          ))}
        </div>
        <a href="/curator" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, background: T.accent, color: '#fff', borderRadius: T.radius, textDecoration: 'none', fontFamily: T.font }}>
          {lang === 'ja' ? 'キュレーター登録' : 'Join as Curator'}
        </a>
      </div>
    </header>
  );
}

/* ── Btn component ── */
function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, style: sx = {} }) {
  const [hovered, setHovered] = useState(false);
  const sz = { sm: { padding: '8px 16px', fontSize: 13 }, md: { padding: '12px 24px', fontSize: 14 }, lg: { padding: '16px 36px', fontSize: 16 } };
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: T.font, fontWeight: 600,
    borderRadius: T.radius, transition: 'all 0.2s', opacity: disabled ? 0.45 : 1,
    border: 'none', ...sz[size],
  };
  const vars = {
    primary:   { background: hovered && !disabled ? T.accentDark : T.accent, color: '#fff', boxShadow: hovered && !disabled ? '0 4px 16px rgba(14,165,233,0.3)' : 'none' },
    secondary: { background: hovered && !disabled ? T.bg : 'transparent', color: T.text, border: `1.5px solid ${T.border}` },
    ghost:     { background: hovered && !disabled ? T.accentLight : 'transparent', color: T.accent, border: 'none' },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...base, ...vars[variant], ...sx }}
    >{children}</button>
  );
}

/* ── Genre tag pill (removable) ── */
function GenrePill({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px 4px 12px',
      background: T.accentLight, color: T.accent,
      border: `1px solid ${T.accentBorder}`, borderRadius: 20,
      fontSize: 12.5, fontWeight: 500, fontFamily: T.font,
    }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.accent, fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
    </span>
  );
}

/* ── Link preview card ── */
function LinkCard({ icon, iconBg, title, sub, placeholder, value, onChange }) {
  return (
    <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}` }}>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: T.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
            {sub && <div style={{ fontSize: 12, color: T.textMuted, fontFamily: T.font, marginTop: 2 }}>{sub}</div>}
          </div>
          <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, fontSize: 16, padding: 4 }}>×</button>
        </div>
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', border: 'none', borderRadius: T.radius,
            fontSize: 14, fontFamily: T.font, outline: 'none',
            background: 'transparent', color: T.text,
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export default function SubmitPage() {
  const [step, setStep]           = useState(1);
  const [lang, setLang]           = useState('ja');
  const [selectedTrack, setSelectedTrack] = useState(null); // {id, name, artist}

  /* Step 2 state */
  const [trackName, setTrackName]   = useState('');
  const [genres, setGenres]         = useState([]);
  const [genreInput, setGenreInput] = useState('');
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [youtubeUrl, setYoutubeUrl]   = useState('');
  const [spotifyUrl, setSpotifyUrl]   = useState('');
  const [epkUrl, setEpkUrl]           = useState('');
  const [similarArtists, setSimilarArtists] = useState([]);
  const [similarInput, setSimilarInput]     = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('otonami_locale');
      if (saved === 'ja' || saved === 'en') setLang(saved);
    } catch {}
  }, []);

  const switchLang = l => { setLang(l); try { localStorage.setItem('otonami_locale', l); } catch {} };

  /* Pre-populate from selected suggested track */
  const pickTrack = (t) => {
    setSelectedTrack(t);
    setTrackName(t.name);
  };

  const addGenre = (g) => {
    if (!g || genres.includes(g) || genres.length >= 6) return;
    setGenres(prev => [...prev, g]);
    setGenreInput('');
    setShowGenreDropdown(false);
  };

  const addSimilarArtist = () => {
    const v = similarInput.trim();
    if (!v || similarArtists.includes(v) || similarArtists.length >= 5) return;
    setSimilarArtists(prev => [...prev, v]);
    setSimilarInput('');
  };

  const canGoNext1 = !!selectedTrack;
  const canGoNext2 = trackName.trim().length > 0 && genres.length > 0;

  const filteredGenres = GENRE_OPTIONS.filter(g =>
    !genres.includes(g) && g.toLowerCase().includes(genreInput.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.font }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        input:focus { outline: none; border-color: ${T.accent} !important; }
        @media (max-width: 640px) {
          .submit-nav { display: none !important; }
        }
      `}</style>

      <SiteHeader lang={lang} setLang={switchLang} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 100px' }}>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 48 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: s <= step ? T.accent : T.border,
              transition: 'background 0.3s',
            }}/>
          ))}
        </div>

        {/* ═══ STEP 1: Track selection ═══ */}
        {step === 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: T.accentGrad,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 20,
              }}>R</div>
              <h1 style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 700, color: T.text, margin: 0, lineHeight: 1.2 }}>
                {lang === 'ja' ? 'どの楽曲をピッチしますか？' : 'Which track do you have in mind?'}
              </h1>
            </div>

            {/* Add new track */}
            <div style={{
              border: `2px dashed ${T.border}`, borderRadius: T.radiusLg,
              padding: '28px 24px', display: 'flex', alignItems: 'center', gap: 16,
              cursor: 'pointer', marginBottom: 32, transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = T.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
            onClick={() => { setSelectedTrack({id:'new',name:'',artist:''}); setTrackName(''); }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: T.bg, border: `1px solid ${T.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, color: T.textMuted,
              }}>+</div>
              <span style={{ fontSize: 15, color: T.textSub, fontFamily: T.font }}>
                {lang === 'ja' ? '新しい楽曲を追加' : 'Add a new track'}
              </span>
            </div>

            {/* Suggested */}
            <h3 style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 16 }}>
              {lang === 'ja' ? 'おすすめ楽曲' : 'Suggested for you'}
            </h3>
            {SUGGESTED.map(t => (
              <div
                key={t.id}
                onClick={() => pickTrack(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', background: T.white,
                  borderRadius: T.radius, marginBottom: 10,
                  border: `1px solid ${T.border}`, cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.accentBorder; e.currentTarget.style.boxShadow = T.shadowMd; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                  background: `linear-gradient(135deg, ${T.accentLight}, ${T.bg})`,
                  border: `1px solid ${T.accentBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>🎵</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: T.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: T.textMuted, fontFamily: T.font, marginTop: 2 }}>{t.artist}</div>
                </div>
                <span style={{ fontSize: 16, color: T.green, flexShrink: 0 }}>♫</span>
              </div>
            ))}

            {/* Your added tracks */}
            {selectedTrack && (
              <>
                <h3 style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 16, marginTop: 32 }}>
                  {lang === 'ja' ? '選択中の楽曲' : 'Your added tracks'}
                </h3>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', background: T.accentLight,
                  borderRadius: T.radius, border: `2px solid ${T.accent}`,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                    background: T.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, color: '#fff', fontWeight: 700,
                  }}>
                    {(selectedTrack.name || '?')[0]?.toUpperCase() || '♪'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedTrack.id === 'new' ? (lang === 'ja' ? '新しい楽曲' : 'New track') : selectedTrack.name}
                    </div>
                    {selectedTrack.artist && <div style={{ fontSize: 12, color: T.textSub, fontFamily: T.font, marginTop: 2 }}>{selectedTrack.artist}</div>}
                  </div>
                  <span style={{ fontSize: 14, color: T.accent, fontWeight: 700, flexShrink: 0 }}>✓</span>
                </div>
              </>
            )}

            <div style={{ marginTop: 40, textAlign: 'center' }}>
              <Btn size="lg" onClick={() => setStep(2)} disabled={!canGoNext1} sx={{ width: '100%', maxWidth: 400 }}>
                {lang === 'ja' ? '次へ →' : 'Next'}
              </Btn>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Track info ═══ */}
        {step === 2 && (
          <div>
            <h1 style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 700, color: T.text, marginBottom: 8 }}>
              {lang === 'ja' ? '楽曲情報を入力してください。' : 'Add info to help us find the best curators.'}
            </h1>
            <p style={{ fontSize: 14, color: T.textSub, fontFamily: T.font, marginBottom: 36 }}>
              {lang === 'ja' ? 'AIが最適なキュレーターを見つけるために使います。' : 'This helps our AI match you with the right curators.'}
            </p>

            {/* Track name */}
            <label style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.font, marginBottom: 8, display: 'block' }}>
              {lang === 'ja' ? '楽曲名' : 'Track name'} <span style={{ color: T.textMuted, fontWeight: 400 }}>({lang === 'ja' ? '必須' : 'Required'})</span>
            </label>
            <input
              value={trackName}
              onChange={e => setTrackName(e.target.value)}
              placeholder={lang === 'ja' ? '曲名を入力...' : 'Enter track name...'}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: T.radius,
                border: `1.5px solid ${trackName ? T.accent : T.border}`,
                fontSize: 15, fontFamily: T.font, outline: 'none',
                marginBottom: 28, background: T.white, color: T.text,
              }}
            />

            {/* Track genres */}
            <label style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.font, marginBottom: 12, display: 'block' }}>
              {lang === 'ja' ? 'ジャンル' : 'Track genres'} <span style={{ color: T.textMuted, fontWeight: 400 }}>({lang === 'ja' ? '必須' : 'Required'})</span>
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {genres.map((g, i) => (
                <GenrePill key={i} label={g} onRemove={() => setGenres(prev => prev.filter(x => x !== g))} />
              ))}
              {genres.length < 6 && (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder={lang === 'ja' ? 'ジャンルを追加...' : 'Add genre...'}
                    value={genreInput}
                    onChange={e => { setGenreInput(e.target.value); setShowGenreDropdown(true); }}
                    onFocus={() => setShowGenreDropdown(true)}
                    onBlur={() => setTimeout(() => setShowGenreDropdown(false), 150)}
                    onKeyDown={e => { if (e.key === 'Enter') addGenre(genreInput); }}
                    style={{
                      padding: '4px 12px', border: `1px solid ${T.border}`, borderRadius: 20,
                      fontSize: 12.5, fontFamily: T.font, outline: 'none',
                      width: 140, color: T.text, background: T.white,
                    }}
                  />
                  {showGenreDropdown && filteredGenres.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, marginTop: 4,
                      background: T.white, border: `1px solid ${T.border}`,
                      borderRadius: T.radius, boxShadow: T.shadowMd,
                      zIndex: 50, maxHeight: 200, overflowY: 'auto', minWidth: 180,
                    }}>
                      {filteredGenres.slice(0, 8).map(g => (
                        <div
                          key={g}
                          onMouseDown={() => addGenre(g)}
                          style={{ padding: '8px 14px', fontSize: 13, fontFamily: T.font, cursor: 'pointer', color: T.text }}
                          onMouseEnter={e => e.currentTarget.style.background = T.accentLight}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >{g}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, fontFamily: T.font, marginBottom: 28 }}>
              {lang === 'ja' ? `${genres.length}/6 ジャンル選択中` : `${genres.length}/6 selected`}
            </div>

            {/* YouTube / SoundCloud link */}
            <label style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.font, marginBottom: 12, display: 'block' }}>
              YouTube / SoundCloud {lang === 'ja' ? 'リンク' : 'track link'}
            </label>
            <div style={{ marginBottom: 20 }}>
              <LinkCard
                icon="▶" iconBg="#fee2e2"
                title={trackName || (lang === 'ja' ? '楽曲名' : 'Track name')}
                sub={lang === 'ja' ? 'YouTube / SoundCloud' : 'YouTube / SoundCloud'}
                placeholder="https://youtube.com/..."
                value={youtubeUrl}
                onChange={setYoutubeUrl}
              />
            </div>

            {/* Spotify link */}
            <label style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.font, marginBottom: 12, display: 'block' }}>
              Spotify {lang === 'ja' ? 'リンク' : 'track link'}
            </label>
            <div style={{ marginBottom: 20 }}>
              <LinkCard
                icon="♫" iconBg={T.greenLight}
                title={trackName || (lang === 'ja' ? '楽曲名' : 'Track name')}
                sub="Spotify"
                placeholder="https://open.spotify.com/track/..."
                value={spotifyUrl}
                onChange={setSpotifyUrl}
              />
            </div>

            {/* EP/LP link */}
            <label style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.font, marginBottom: 12, display: 'block' }}>
              EP/LP {lang === 'ja' ? 'リンク（任意）' : 'link, if relevant'}
            </label>
            <div style={{ marginBottom: 28 }}>
              <LinkCard
                icon="🔗" iconBg={T.bg}
                title="" sub=""
                placeholder="https://lnk.to/..."
                value={epkUrl}
                onChange={setEpkUrl}
              />
            </div>

            {/* Artists I sound like */}
            <label style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.font, marginBottom: 12, display: 'block' }}>
              {lang === 'ja' ? '似ているアーティスト' : 'Artists I sound like'} <span style={{ color: T.textMuted, fontWeight: 400 }}>(max. 5)</span>
            </label>
            {similarArtists.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {similarArtists.map((a, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px 4px 12px', background: T.borderLight,
                    color: T.textSub, border: `1px solid ${T.border}`,
                    borderRadius: 20, fontSize: 12.5, fontWeight: 500, fontFamily: T.font,
                  }}>
                    🎤 {a}
                    <button onClick={() => setSimilarArtists(prev => prev.filter(x => x !== a))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            {similarArtists.length < 5 && (
              <div style={{
                border: `2px dashed ${T.border}`, borderRadius: T.radius,
                padding: 16, display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 28,
              }}>
                <span style={{ fontSize: 20, color: T.textMuted }}>+</span>
                <input
                  type="text"
                  placeholder={lang === 'ja' ? '似ているアーティストを追加...' : 'Add similar artists'}
                  value={similarInput}
                  onChange={e => setSimilarInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSimilarArtist(); }}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: T.textSub, fontFamily: T.font, background: 'transparent' }}
                />
                {similarInput && (
                  <button onClick={addSimilarArtist} style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, background: T.accentLight, color: T.accent, border: `1px solid ${T.accentBorder}`, borderRadius: 8, cursor: 'pointer', fontFamily: T.font }}>
                    {lang === 'ja' ? '追加' : 'Add'}
                  </button>
                )}
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
              <Btn variant="secondary" size="lg" onClick={() => setStep(1)}>
                {lang === 'ja' ? '← 戻る' : 'Back'}
              </Btn>
              <Btn size="lg" onClick={() => setStep(3)} disabled={!canGoNext2} sx={{ flex: 1 }}>
                {lang === 'ja' ? '次へ →' : 'Next'}
              </Btn>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Complete ═══ */}
        {step === 3 && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            {/* Green check */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: T.greenLight, border: `2px solid ${T.greenBorder}`,
              margin: '0 auto 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36,
            }}>✓</div>

            <h1 style={{ fontFamily: T.fontDisplay, fontSize: 32, fontWeight: 700, color: T.text, marginBottom: 12 }}>
              {lang === 'ja' ? 'トラック準備完了！' : 'Track ready!'}
            </h1>
            <p style={{ fontSize: 16, color: T.textSub, fontFamily: T.font, marginBottom: 40, lineHeight: 1.7 }}>
              {trackName
                ? <>"{trackName}"<br/></>
                : null}
              {lang === 'ja'
                ? 'キュレーターを探す準備ができました。'
                : 'is ready to pitch. Now find the best curators for your music.'}
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Btn size="lg" onClick={() => window.location.href = '/curators'}>
                {lang === 'ja' ? 'キュレーターを探す →' : 'Find Curators →'}
              </Btn>
              <Btn variant="secondary" size="lg" onClick={() => { setStep(1); setSelectedTrack(null); setTrackName(''); setGenres([]); setYoutubeUrl(''); setSpotifyUrl(''); setEpkUrl(''); setSimilarArtists([]); }}>
                {lang === 'ja' ? '別の楽曲を追加' : 'Add another track'}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
