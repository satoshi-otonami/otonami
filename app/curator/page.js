"use client";
import { useState } from 'react';

const GENRE_OPTIONS = [
  'J-Pop','J-Rock','City Pop','Anime','Visual Kei','Vocaloid','Enka','Kayokyoku',
  'Indie Rock','Indie Pop','Shoegaze','Post Rock','Noise','Garage Rock',
  'Post Punk','Math Rock','Emo','Alt Rock','Dream Pop','Lo-Fi',
  'Electronic','Ambient','IDM','Techno','House','Club','Synth Pop','Chillout',
  'Jazz','Fusion','City Jazz','Soul','Funk','R&B','Neo Soul',
  'Hip-Hop','Trap','J-Hip-Hop','Boom Bap',
  'Folk','Acoustic','Singer-Songwriter','Americana',
  'Experimental','Avant-garde','Classical','Metal','Punk','Hardcore',
];

const TYPE_OPTIONS = [
  { value: 'blog',     en: 'Blog / Media',        ja: 'ブログ・メディア' },
  { value: 'playlist', en: 'Playlist Curator',     ja: 'プレイリスト' },
  { value: 'radio',    en: 'Radio / Podcast',      ja: 'ラジオ・ポッドキャスト' },
  { value: 'label',    en: 'Record Label',         ja: 'レコードレーベル' },
];

const REGION_OPTIONS = [
  'Global','EN/Global','JP/EN','JP/Global','Asia','Europe','US/Global','Latin America','Africa','Middle East'
];

export default function CuratorRegistrationPage() {
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  // Login state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginStatus, setLoginStatus] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [loggedInCurator, setLoggedInCurator] = useState(null);

  // Register state
  const [form, setForm] = useState({
    name: '', email: '', password: '', type: 'blog',
    outletName: '', url: '', bio: '', followers: '',
    region: 'Global', genres: [], paypalEmail: '',
  });
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleGenre = (g) => set('genres',
    form.genres.includes(g) ? form.genres.filter(x => x !== g) : [...form.genres, g]
  );

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      setLoginError('Email and password are required. / メールとパスワードを入力してください。');
      return;
    }
    setLoginStatus('loading');
    setLoginError('');
    try {
      const res = await fetch('/api/curators/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: loginForm.email, password: loginForm.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('curator_token', data.token);
      setLoggedInCurator(data.curator);
      setLoginStatus('success');
      window.location.href = '/curator/dashboard';
    } catch (e) {
      setLoginError(e.message);
      setLoginStatus('error');
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password || !form.outletName) {
      setError('Please fill in all required fields. / 必須項目を入力してください。');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters. / パスワードは8文字以上にしてください。');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/curator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setStatus('success');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  };

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    border: '1px solid #2a2a4a', background: '#0d0d1f', color: '#fff',
    fontSize: 14, outline: 'none', marginTop: 6, boxSizing: 'border-box',
  };
  const lbl = { fontSize: 13, color: '#888', display: 'block', marginTop: 18 };
  const sub = { fontSize: 11, color: '#555', marginLeft: 6 };

  // ── ログイン成功画面 ──
  if (loginStatus === 'success' && loggedInCurator) return (
    <div style={{ minHeight: '100vh', background: '#0a0a18', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', color: '#fff', maxWidth: 480 }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>👋</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
          Welcome back, {loggedInCurator.name}!
        </h1>
        <p style={{ color: '#888', lineHeight: 1.8, fontSize: 15 }}>
          You are now logged in as a curator.<br />
          <span style={{ color: '#666', fontSize: 13 }}>キュレーターとしてログインしました。</span>
        </p>
        <a href="https://otonami.vercel.app" style={{
          display: 'inline-block', marginTop: 28, padding: '13px 32px',
          background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
          borderRadius: 24, color: '#fff', textDecoration: 'none', fontWeight: 700,
        }}>← Back to OTONAMI</a>
      </div>
    </div>
  );

  // ── 登録成功画面 ──
  if (status === 'success') return (
    <div style={{ minHeight: '100vh', background: '#0a0a18', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', color: '#fff', maxWidth: 480 }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
          Registration Received!
        </h1>
        <p style={{ color: '#888', lineHeight: 1.8, fontSize: 15 }}>
          Thank you for joining OTONAMI as a curator.<br />
          <span style={{ color: '#666', fontSize: 13 }}>
            キュレーターとしてご登録いただきありがとうございます。
          </span><br /><br />
          We'll review your profile and be in touch within 2–3 business days.<br />
          <span style={{ color: '#666', fontSize: 13 }}>
            2〜3営業日以内にご連絡いたします。
          </span>
        </p>
        <a href="https://otonami.vercel.app" style={{
          display: 'inline-block', marginTop: 28, padding: '13px 32px',
          background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
          borderRadius: 24, color: '#fff', textDecoration: 'none', fontWeight: 700,
        }}>← Back to OTONAMI</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a18', padding: '48px 16px 80px' }}>
      <div style={{ maxWidth: 580, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="https://otonami.vercel.app" style={{
            display: 'inline-block', marginBottom: 24,
            fontSize: 22, fontWeight: 900, color: '#a78bfa',
            textDecoration: 'none', letterSpacing: 2,
          }}>OTONAMI</a>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
            Curator Portal
          </h1>
          <p style={{ color: '#666', fontSize: 14 }}>キュレーターポータル</p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', marginBottom: 28, background: '#0f0f2a',
                      borderRadius: 12, padding: 4, border: '1px solid #1e1e3a' }}>
          {[
            { key: 'login', en: 'Login', ja: 'ログイン' },
            { key: 'register', en: 'Join as Curator', ja: '新規登録' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '11px', border: 'none', borderRadius: 9,
              cursor: 'pointer', fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
              background: tab === t.key ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'transparent',
              color: tab === t.key ? '#fff' : '#666',
            }}>
              {t.en} <span style={{ fontSize: 11, fontWeight: 400 }}>/ {t.ja}</span>
            </button>
          ))}
        </div>

        {/* ── LOGIN TAB ── */}
        {tab === 'login' && (
          <div style={{ background: '#13132a', borderRadius: 16, padding: 28,
                        border: '1px solid #1e1e3a' }}>
            <p style={{ color: '#888', fontSize: 13, marginTop: 0, marginBottom: 20 }}>
              Already registered? Log in to your curator account.<br />
              <span style={{ color: '#555', fontSize: 12 }}>登録済みのキュレーターの方はこちら</span>
            </p>

            <label style={lbl}>
              Email Address <span style={sub}>メールアドレス</span>
            </label>
            <input style={inp} type="text" value={loginForm.email}
                   placeholder="your@email.com"
                   onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} />

            <label style={lbl}>
              Password <span style={sub}>パスワード</span>
            </label>
            <input style={inp} type="password" value={loginForm.password}
                   placeholder="Your password"
                   onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                   onKeyDown={e => e.key === 'Enter' && handleLogin()} />

            {loginError && (
              <p style={{ color: '#f87171', fontSize: 13, marginTop: 14 }}>{loginError}</p>
            )}

            <button onClick={handleLogin} disabled={loginStatus === 'loading'} style={{
              width: '100%', marginTop: 24, padding: '15px',
              background: loginStatus === 'loading'
                ? '#333' : 'linear-gradient(135deg,#7c3aed,#2563eb)',
              border: 'none', borderRadius: 12, color: '#fff',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}>
              {loginStatus === 'loading' ? 'Logging in... / ログイン中...' : 'Login / ログイン →'}
            </button>

            <p style={{ textAlign: 'center', color: '#555', fontSize: 12, marginTop: 16 }}>
              Not registered yet?{' '}
              <button onClick={() => setTab('register')} style={{
                background: 'none', border: 'none', color: '#a78bfa',
                cursor: 'pointer', fontSize: 12, textDecoration: 'underline',
              }}>Join as a Curator / 新規登録</button>
            </p>
          </div>
        )}

        {/* ── REGISTER TAB ── */}
        {tab === 'register' && (
          <>
            <p style={{ color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
              Discover emerging Japanese indie artists and receive curated pitches.<br />
              <span style={{ color: '#666', fontSize: 12 }}>
                日本のインディーアーティストから厳選されたピッチを受け取れます。
              </span>
            </p>

            {/* Payout notice */}
            <div style={{ background: '#0f0f2a', border: '1px solid #2a2a4a',
                          borderRadius: 12, padding: '14px 18px', marginBottom: 28,
                          display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 20 }}>💰</span>
              <div>
                <p style={{ color: '#a78bfa', fontWeight: 700, margin: 0, fontSize: 14 }}>
                  Curator Payout Policy
                </p>
                <p style={{ color: '#888', fontSize: 12, margin: '4px 0 0', lineHeight: 1.6 }}>
                  Minimum payout: <strong style={{ color: '#fff' }}>¥5,000 / $50 USD</strong> via PayPal.<br />
                  <span style={{ color: '#666' }}>最低支払い額：PayPal経由で5,000円 / 50ドル以上</span>
                </p>
              </div>
            </div>

            <div style={{ background: '#13132a', borderRadius: 16, padding: 28,
                          border: '1px solid #1e1e3a' }}>

              <label style={lbl}>Your Name * <span style={sub}>お名前</span></label>
              <input style={inp} value={form.name} placeholder="e.g. Taro Yamada"
                     onChange={e => set('name', e.target.value)} />

              <label style={lbl}>Email Address * <span style={sub}>メールアドレス</span></label>
              <input style={inp} type="text" value={form.email}
                     placeholder="your@email.com"
                     onChange={e => set('email', e.target.value)} />

              <label style={lbl}>Password * <span style={sub}>パスワード（8文字以上）</span></label>
              <input style={inp} type="password" value={form.password}
                     placeholder="Minimum 8 characters"
                     onChange={e => set('password', e.target.value)} />

              <label style={lbl}>Outlet / Playlist Name * <span style={sub}>媒体名・プレイリスト名</span></label>
              <input style={inp} value={form.outletName}
                     placeholder="e.g. Tokyo Sound Journal"
                     onChange={e => set('outletName', e.target.value)} />

              <label style={lbl}>Type <span style={sub}>種別</span></label>
              <select style={inp} value={form.type}
                      onChange={e => set('type', e.target.value)}>
                {TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.en} / {o.ja}</option>
                ))}
              </select>

              <label style={lbl}>Website / Playlist URL <span style={sub}>ウェブサイト・URL</span></label>
              <input style={inp} type="text" value={form.url}
                     placeholder="https://your-site.com"
                     onChange={e => set('url', e.target.value)} />

              <label style={lbl}>Followers / Subscribers <span style={sub}>フォロワー・読者数</span></label>
              <input style={inp} type="number" value={form.followers}
                     placeholder="e.g. 5000"
                     onChange={e => set('followers', e.target.value)} />

              <label style={lbl}>Primary Region <span style={sub}>主な活動地域</span></label>
              <select style={inp} value={form.region}
                      onChange={e => set('region', e.target.value)}>
                {REGION_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <label style={lbl}>Genres You Cover <span style={sub}>カバーするジャンル</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                {GENRE_OPTIONS.map(g => (
                  <button key={g} onClick={() => toggleGenre(g)} style={{
                    padding: '5px 11px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    border: '1px solid',
                    borderColor: form.genres.includes(g) ? '#7c3aed' : '#2a2a4a',
                    background: form.genres.includes(g) ? '#3b1f8c' : 'transparent',
                    color: form.genres.includes(g) ? '#c4b5fd' : '#666',
                  }}>{g}</button>
                ))}
              </div>

              <label style={lbl}>Brief Bio <span style={sub}>自己紹介</span></label>
              <textarea style={{ ...inp, height: 100, resize: 'vertical' }}
                        value={form.bio}
                        placeholder="Tell artists what you cover and what you're looking for... / どんな音楽を探しているか教えてください"
                        onChange={e => set('bio', e.target.value)} />

              <div style={{ background: '#0d0d1f', border: '1px solid #2a2a4a',
                            borderRadius: 10, padding: '16px', marginTop: 20 }}>
                <label style={{ ...lbl, marginTop: 0, color: '#a78bfa' }}>
                  💰 PayPal Email <span style={sub}>支払い受取用PayPalメール</span>
                </label>
                <input style={{ ...inp, marginTop: 8 }} type="text"
                       value={form.paypalEmail}
                       placeholder="paypal@email.com"
                       onChange={e => set('paypalEmail', e.target.value)} />
                <p style={{ color: '#555', fontSize: 11, marginTop: 8, lineHeight: 1.6 }}>
                  Payouts processed via PayPal when balance reaches ¥5,000 / $50 USD.<br />
                  残高が5,000円/$50に達した時点でPayPal経由でお支払いします。
                </p>
              </div>

              {error && (
                <p style={{ color: '#f87171', fontSize: 13, marginTop: 14 }}>{error}</p>
              )}

              <button onClick={handleSubmit} disabled={status === 'loading'} style={{
                width: '100%', marginTop: 24, padding: '15px',
                background: status === 'loading'
                  ? '#333' : 'linear-gradient(135deg,#7c3aed,#2563eb)',
                border: 'none', borderRadius: 12, color: '#fff',
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}>
                {status === 'loading' ? 'Submitting... / 送信中...' : 'Join as Curator / キュレーターとして参加 →'}
              </button>
            </div>

            <p style={{ textAlign: 'center', color: '#444', fontSize: 11, marginTop: 20, lineHeight: 1.7 }}>
              By submitting, you agree to receive pitch emails from Japanese indie artists via OTONAMI.<br />
              送信することで、OTONAMIを通じて日本のインディーアーティストからのピッチメール受信に同意します。
            </p>
          </>
        )}

      </div>
    </div>
  );
}
