"use client";
import { useState, useRef } from 'react';

const THEME = {
  bg: '#f8f7f4',
  card: '#ffffff',
  border: '#e5e2dc',
  borderLight: '#f0ede8',
  text: '#1a1a1a',
  textSub: '#6b6560',
  textMuted: '#9b9590',
  gold: '#c4956a',
  goldLight: '#c4956a20',
  goldDark: '#b8845e',
  coral: '#e85d3a',
  green: '#10b981',
  greenLight: '#10b98120',
  font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontDisplay: "'Playfair Display', Georgia, serif",
};

const ARTIST_TYPES = [
  { value: 'solo', label: 'ソロ' },
  { value: 'band', label: 'バンド' },
  { value: 'label', label: 'レーベル' },
  { value: 'producer', label: 'プロデューサー' },
];

const GENRE_OPTIONS = [
  'Rock', 'Pop', 'Jazz', 'Hip-Hop', 'R&B', 'Electronic', 'Classical', 'Folk',
  'Metal', 'Punk', 'Reggae', 'Blues', 'Country', 'Latin', 'World', 'Ambient',
  'Experimental', 'Indie', 'Singer-Songwriter', 'Funk', 'Soul', 'Dance',
  'J-Pop', 'J-Rock', 'City Pop', 'Enka', 'Anime', 'Game Music',
];

const MOOD_OPTIONS = [
  'Energetic', 'Chill', 'Melancholic', 'Upbeat', 'Dark', 'Dreamy',
  'Aggressive', 'Romantic', 'Nostalgic', 'Cinematic', 'Groovy',
  'Ethereal', 'Powerful', 'Playful', 'Intense',
];

export default function ArtistRegistrationPage() {
  const [step, setStep] = useState(1);
  const avatarInputRef = useRef(null);

  // Form state
  const [form, setForm] = useState({
    name: '', email: '', password: '', artist_type: 'solo',
    region: 'Japan',
    genres: [], moods: [], influences: [], label_name: '',
    bio: '', hot_news: '',
    spotify_url: '', youtube_url: '', instagram_url: '',
    twitter_url: '', facebook_url: '', website_url: '',
    cover_url: '',
  });
  const [influenceInput, setInfluenceInput] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdArtist, setCreatedArtist] = useState(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleArray = (key, val, max) => {
    setForm(f => {
      const arr = f[key] || [];
      if (arr.includes(val)) return { ...f, [key]: arr.filter(x => x !== val) };
      if (max != null && arr.length >= max) return f;
      return { ...f, [key]: [...arr, val] };
    });
  };

  const addInfluence = () => {
    const val = influenceInput.trim();
    if (!val || form.influences.length >= 5) return;
    if (!form.influences.includes(val)) set('influences', [...form.influences, val]);
    setInfluenceInput('');
  };

  const applyAvatarFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { alert('ファイルサイズは5MB以下にしてください'); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Validation
  const validateStep1 = () => {
    if (!form.name.trim()) { setError('アーティスト名は必須です'); return false; }
    if (!form.email.trim()) { setError('メールアドレスは必須です'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('メールアドレスの形式が正しくありません'); return false; }
    if (form.password.length < 8) { setError('パスワードは8文字以上にしてください'); return false; }
    return true;
  };

  const goToStep = (target) => {
    setError('');
    if (target === 2 && step === 1) {
      if (!validateStep1()) return;
    }
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'already_registered') {
          setError('already_registered');
          return;
        }
        throw new Error(data.error || 'Registration failed');
      }

      setCreatedArtist(data.artist);
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const inp = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text,
    fontSize: 15, outline: 'none', marginTop: 6, boxSizing: 'border-box',
    fontFamily: THEME.font, minHeight: 48,
  };
  const lbl = { fontSize: 13, color: THEME.textSub, display: 'block', marginTop: 20, fontWeight: 600, fontFamily: THEME.font };

  // ── Success Screen ──
  if (success && createdArtist) return (
    <div style={{ minHeight: '100vh', background: THEME.bg, fontFamily: THEME.font }}>
      <style>{globalStyles}</style>
      {renderHeader()}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>✉️</div>
          <h1 style={{ fontFamily: THEME.fontDisplay, fontSize: 24, fontWeight: 700, color: THEME.text, marginBottom: 12 }}>
            認証メールを送信しました
          </h1>
          <p style={{ color: THEME.textSub, fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
            <strong>{form.email}</strong> に認証メールを送りました。<br />
            メール内のリンクをクリックして登録を完了してください。
          </p>
          <p style={{ color: THEME.textMuted, fontSize: 13, marginBottom: 32 }}>
            メールが届かない場合は迷惑メールフォルダをご確認ください
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button onClick={async () => {
              try {
                await fetch('/api/resend-verification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: form.email, type: 'artist' }),
                });
                alert('認証メールを再送信しました');
              } catch {}
            }} style={{
              padding: '12px 32px', borderRadius: 100,
              border: `1.5px solid ${THEME.gold}`, background: 'transparent',
              color: THEME.gold, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: THEME.font,
            }}>
              認証メールを再送信
            </button>
            <button onClick={() => { setSuccess(false); setStep(1); }}
              style={{ background: 'none', border: 'none', color: THEME.textMuted, fontSize: 13, cursor: 'pointer', fontFamily: THEME.font }}>
              別のメールアドレスで登録
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Main Form ──
  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, fontFamily: THEME.font }}>
      <style>{globalStyles}</style>
      {renderHeader()}

      {/* Progress bar */}
      <div style={{ maxWidth: 520, margin: '32px auto 0', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
          {[1, 2, 3].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Circle */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, fontFamily: THEME.font,
                ...(step > s
                  ? { background: THEME.gold, color: '#fff' }
                  : step === s
                    ? { background: THEME.card, color: THEME.gold, border: `2px solid ${THEME.gold}` }
                    : { background: THEME.card, color: THEME.textMuted, border: `2px solid ${THEME.border}` }),
              }}>
                {step > s ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : s}
              </div>
              {/* Line */}
              {i < 2 && (
                <div style={{ width: 60, height: 2, background: step > s ? THEME.gold : THEME.border, margin: '0 4px' }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 4px' }}>
          {['基本情報', '音楽情報', 'プロフィール'].map((label, i) => (
            <div key={i} style={{ fontSize: 11, fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? THEME.gold : THEME.textMuted, fontFamily: THEME.font, textAlign: 'center', flex: 1 }}>{label}</div>
          ))}
        </div>
      </div>

      {/* Form card */}
      <div style={{ maxWidth: 520, margin: '24px auto 80px', padding: '0 20px' }}>
        <div className="form-card" style={{ background: THEME.card, borderRadius: 16, padding: 32, border: `1px solid ${THEME.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>

          {/* ── STEP 1: Basic Info ── */}
          {step === 1 && (
            <>
              <h2 style={{ fontFamily: THEME.fontDisplay, fontSize: 28, fontWeight: 700, color: THEME.text, margin: '0 0 6px' }}>アーティスト登録</h2>
              <p style={{ color: THEME.textSub, fontSize: 15, margin: '0 0 28px', fontFamily: THEME.font }}>あなたの音楽を世界に届けましょう</p>

              <label style={lbl}>アーティスト名 / バンド名 <span style={{ color: THEME.coral, fontSize: 11 }}>*必須</span></label>
              <input className="artist-input" style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="例: Yuki Tanaka" />

              <label style={lbl}>メールアドレス <span style={{ color: THEME.coral, fontSize: 11 }}>*必須</span></label>
              <input className="artist-input" style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" autoComplete="email" />

              <label style={lbl}>パスワード <span style={{ color: THEME.coral, fontSize: 11 }}>*必須（8文字以上）</span></label>
              <input className="artist-input" style={inp} type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="8文字以上" autoComplete="new-password" />

              <label style={lbl}>アーティストタイプ</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {ARTIST_TYPES.map(t => (
                  <button key={t.value} onClick={() => set('artist_type', t.value)} className="pill-tag" style={{
                    padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600,
                    border: `1.5px solid ${form.artist_type === t.value ? THEME.gold : THEME.border}`,
                    background: form.artist_type === t.value ? THEME.gold : THEME.card,
                    color: form.artist_type === t.value ? '#fff' : THEME.text,
                    cursor: 'pointer', fontFamily: THEME.font, transition: 'all 0.15s',
                  }}>{t.label}</button>
                ))}
              </div>

              {/* Avatar upload */}
              <label style={lbl}>プロフィール写真（任意）</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  style={{ width: 96, height: 96, borderRadius: '50%', border: `2px dashed ${avatarPreview ? THEME.gold : THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: THEME.bg, flexShrink: 0, transition: 'all 0.15s' }}
                >
                  {avatarPreview
                    ? <img src={avatarPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ textAlign: 'center', color: THEME.textMuted }}><div style={{ fontSize: 24 }}>📷</div><div style={{ fontSize: 10, marginTop: 2 }}>Upload</div></div>}
                </div>
                <div>
                  <button onClick={() => avatarInputRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 13, cursor: 'pointer', fontFamily: THEME.font, fontWeight: 500 }}>写真を選択</button>
                  <p style={{ fontSize: 11, color: THEME.textMuted, marginTop: 6 }}>JPEG, PNG, WebP（5MB以下）</p>
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => applyAvatarFile(e.target.files?.[0])} />
              </div>

              <label style={lbl}>国・地域</label>
              <input className="artist-input" style={inp} value={form.region} onChange={e => set('region', e.target.value)} placeholder="Japan" />

              {error && <p style={{ color: THEME.coral, fontSize: 13, marginTop: 16, fontFamily: THEME.font }}>{error}</p>}

              <button onClick={() => goToStep(2)} className="btn-gold" style={{ width: '100%', marginTop: 28, padding: '14px', borderRadius: 100, background: THEME.gold, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: THEME.font }}>
                次へ →
              </button>
            </>
          )}

          {/* ── STEP 2: Music Info ── */}
          {step === 2 && (
            <>
              <h2 style={{ fontFamily: THEME.fontDisplay, fontSize: 24, fontWeight: 700, color: THEME.text, margin: '0 0 6px' }}>あなたの音楽について教えてください</h2>
              <p style={{ color: THEME.textSub, fontSize: 14, margin: '0 0 24px', fontFamily: THEME.font }}>ジャンルやムードを選択すると、最適なキュレーターとマッチングします</p>

              <label style={lbl}>ジャンル（最大8つ）</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {GENRE_OPTIONS.map(g => {
                  const sel = form.genres.includes(g);
                  return (
                    <button key={g} onClick={() => toggleArray('genres', g, 8)} className="pill-tag" style={{
                      padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 500,
                      border: `1.5px solid ${sel ? THEME.gold : THEME.border}`,
                      background: sel ? THEME.gold : THEME.card,
                      color: sel ? '#fff' : THEME.text,
                      cursor: 'pointer', fontFamily: THEME.font, transition: 'all 0.15s',
                    }}>{g}</button>
                  );
                })}
              </div>

              <label style={lbl}>ムード（最大5つ）</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {MOOD_OPTIONS.map(m => {
                  const sel = form.moods.includes(m);
                  return (
                    <button key={m} onClick={() => toggleArray('moods', m, 5)} className="pill-tag" style={{
                      padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 500,
                      border: `1.5px solid ${sel ? THEME.gold : THEME.border}`,
                      background: sel ? THEME.gold : THEME.card,
                      color: sel ? '#fff' : THEME.text,
                      cursor: 'pointer', fontFamily: THEME.font, transition: 'all 0.15s',
                    }}>{m}</button>
                  );
                })}
              </div>

              <label style={lbl}>影響を受けたアーティスト（最大5つ、Enterで追加）</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input className="artist-input" style={{ ...inp, flex: 1, marginTop: 0 }} value={influenceInput} onChange={e => setInfluenceInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInfluence(); }}} placeholder="例: Cornelius" disabled={form.influences.length >= 5} />
                <button onClick={addInfluence} disabled={form.influences.length >= 5} style={{ padding: '0 16px', borderRadius: 10, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.gold, fontSize: 13, cursor: form.influences.length >= 5 ? 'not-allowed' : 'pointer', fontFamily: THEME.font, fontWeight: 600, whiteSpace: 'nowrap', opacity: form.influences.length >= 5 ? 0.5 : 1 }}>追加</button>
              </div>
              {form.influences.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {form.influences.map(inf => (
                    <span key={inf} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, fontSize: 12, background: THEME.goldLight, color: THEME.gold, border: `1px solid ${THEME.gold}30`, fontFamily: THEME.font }}>
                      {inf}
                      <button onClick={() => set('influences', form.influences.filter(x => x !== inf))} style={{ background: 'none', border: 'none', color: THEME.gold, cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}

              <label style={lbl}>所属レーベル（任意）</label>
              <input className="artist-input" style={inp} value={form.label_name} onChange={e => set('label_name', e.target.value)} placeholder="例: Sony Music Japan" />

              {error && <p style={{ color: THEME.coral, fontSize: 13, marginTop: 16, fontFamily: THEME.font }}>{error}</p>}

              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button onClick={() => goToStep(1)} style={{ flex: 1, padding: '14px', borderRadius: 100, background: THEME.card, border: `1.5px solid ${THEME.border}`, color: THEME.textSub, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: THEME.font }}>
                  ← 戻る
                </button>
                <button onClick={() => goToStep(3)} className="btn-gold" style={{ flex: 1, padding: '14px', borderRadius: 100, background: THEME.gold, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: THEME.font }}>
                  次へ →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Profile ── */}
          {step === 3 && (
            <>
              <h2 style={{ fontFamily: THEME.fontDisplay, fontSize: 24, fontWeight: 700, color: THEME.text, margin: '0 0 6px' }}>プロフィールを充実させましょう</h2>
              <p style={{ color: THEME.textSub, fontSize: 14, margin: '0 0 24px', fontFamily: THEME.font }}>あなたの魅力をキュレーターに伝えましょう</p>

              <label style={lbl}>Bio（自己紹介）</label>
              <div style={{ position: 'relative' }}>
                <textarea className="artist-input" style={{ ...inp, minHeight: 120, resize: 'vertical' }} value={form.bio} onChange={e => { if (e.target.value.length <= 1000) set('bio', e.target.value); }} placeholder="あなたの音楽やバンドについて教えてください。活動拠点、音楽の特徴、これまでの実績など..." />
                <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: form.bio.length > 900 ? THEME.coral : THEME.textMuted, fontFamily: THEME.font }}>{form.bio.length}/1000</div>
              </div>

              <label style={lbl}>Hot News（最新情報・任意）</label>
              <input className="artist-input" style={inp} value={form.hot_news} onChange={e => set('hot_news', e.target.value)} placeholder="新譜リリース、イベント出演など最新情報を入力..." />

              {/* SNS Links */}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${THEME.borderLight}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text, marginBottom: 4, fontFamily: THEME.font }}>SNSリンク</div>
                <p style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 16 }}>キュレーターがあなたの活動を確認できるようになります</p>

                {[
                  { key: 'spotify_url', icon: '🎵', label: 'Spotify', ph: 'https://open.spotify.com/artist/...' },
                  { key: 'youtube_url', icon: '▶️', label: 'YouTube', ph: 'https://youtube.com/@...' },
                  { key: 'instagram_url', icon: '📷', label: 'Instagram', ph: 'https://instagram.com/...' },
                  { key: 'twitter_url', icon: '𝕏', label: 'Twitter / X', ph: 'https://x.com/...' },
                  { key: 'facebook_url', icon: '📘', label: 'Facebook', ph: 'https://facebook.com/...' },
                  { key: 'website_url', icon: '🔗', label: 'Webサイト', ph: 'https://...' },
                ].map(s => (
                  <div key={s.key} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: THEME.textSub, fontWeight: 500, fontFamily: THEME.font }}>
                      <span style={{ marginRight: 6 }}>{s.icon}</span>{s.label}
                    </label>
                    <input className="artist-input" style={{ ...inp, marginTop: 4 }} value={form[s.key]} onChange={e => set(s.key, e.target.value)} placeholder={s.ph} />
                  </div>
                ))}
              </div>

              {/* Cover image URL */}
              <label style={lbl}>カバー画像URL（任意）</label>
              <input className="artist-input" style={inp} value={form.cover_url} onChange={e => set('cover_url', e.target.value)} placeholder="https://..." />
              {form.cover_url && /^https?:\/\/.+/.test(form.cover_url) && (
                <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', border: `1px solid ${THEME.border}`, maxHeight: 160 }}>
                  <img src={form.cover_url} alt="cover preview" style={{ width: '100%', height: 160, objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                </div>
              )}

              {error && error === 'already_registered' && (
                <div style={{ background: '#fef9ee', border: '1px solid #f5e6c8', borderRadius: 10, padding: 16, marginTop: 16, fontFamily: THEME.font }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4956a" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Already registered / 登録済みです</span>
                  </div>
                  <p style={{ fontSize: 14, color: '#6b6560', marginBottom: 12, lineHeight: 1.6 }}>
                    This email is already registered.<br/>このメールアドレスは既に登録されています。
                  </p>
                  <a href="/artist/login" style={{ display: 'inline-block', background: '#c4956a', color: '#fff', borderRadius: 9999, padding: '10px 24px', fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: THEME.font }}>
                    Login instead / ログインへ →
                  </a>
                </div>
              )}
              {error && error !== 'already_registered' && <p style={{ color: THEME.coral, fontSize: 13, marginTop: 16, fontFamily: THEME.font }}>{error}</p>}

              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button onClick={() => goToStep(2)} style={{ flex: 1, padding: '14px', borderRadius: 100, background: THEME.card, border: `1.5px solid ${THEME.border}`, color: THEME.textSub, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: THEME.font }}>
                  ← 戻る
                </button>
                <button onClick={handleSubmit} disabled={loading} className="btn-coral" style={{
                  flex: 1, padding: '14px', borderRadius: 100, border: 'none',
                  background: loading ? THEME.border : THEME.coral,
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', fontFamily: THEME.font,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {loading ? <><Spinner /> 登録中...</> : '登録する'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  function renderHeader() {
    return (
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${THEME.border}`,
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: THEME.font,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="36" height="36" viewBox="0 0 40 40" style={{ flexShrink: 0 }}><circle cx="12" cy="20" r="3.5" fill="#FF6B4A"/><path d="M18 8 Q30 20 18 32" stroke="#FF6B4A" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.9"/><path d="M24 4 Q38 20 24 36" stroke="#c4956a" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.55"/><path d="M30 1 Q44 20 30 39" stroke="#A78BFA" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.3"/></svg>
          <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '3px', color: '#1a1a1a' }}>OTONAMI</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: THEME.textMuted, fontFamily: THEME.font }}>
            <span className="hide-mobile">すでにアカウントをお持ちの方</span>
          </span>
          <a href="/artist/login" style={{ padding: '8px 20px', borderRadius: 100, border: `1.5px solid ${THEME.gold}`, color: THEME.gold, textDecoration: 'none', fontSize: 13, fontWeight: 600, fontFamily: THEME.font, transition: 'all 0.15s' }}>ログイン</a>
        </div>
      </header>
    );
  }
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
      <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
    </svg>
  );
}

const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #f8f7f4; overflow-x: hidden; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .artist-input:focus { border-color: #c4956a !important; box-shadow: 0 0 0 3px rgba(196,149,106,0.12) !important; }
  .artist-input:hover { border-color: #9b9590 !important; }
  .pill-tag { transition: all 0.15s; }
  .pill-tag:hover { border-color: #c4956a !important; }
  .btn-gold:hover { background: #b8845e !important; }
  .btn-coral:hover { background: #d04e2e !important; }
  .hide-mobile { }
  @media (max-width: 640px) {
    .form-card { padding: 20px 16px !important; }
    .hide-mobile { display: none; }
    .artist-input { font-size: 16px !important; }
  }
`;
