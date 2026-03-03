"use client";
import { useState } from 'react';
// importからregisterCuratorを削除（API経由に変更）

const GENRE_OPTIONS = [
  // Japanese
  'J-Pop','J-Rock','City Pop','Anime','Visual Kei','Vocaloid','Enka','Kayokyoku',
  // Rock & Alternative
  'Indie Rock','Indie Pop','Shoegaze','Post Rock','Noise','Garage Rock',
  'Post Punk','Math Rock','Emo','Alt Rock','Dream Pop','Lo-Fi',
  // Electronic
  'Electronic','Ambient','IDM','Techno','House','Club','Synth Pop','Chillout',
  // Jazz & Soul
  'Jazz','Fusion','City Jazz','Soul','Funk','R&B','Neo Soul',
  // Hip-Hop
  'Hip-Hop','Trap','J-Hip-Hop','Boom Bap',
  // Folk & Acoustic
  'Folk','Acoustic','Singer-Songwriter','Americana',
  // World & Other
  'Experimental','Avant-garde','Classical','Metal','Punk','Hardcore',
];

const TYPE_OPTIONS = [
  { value: 'blog',     label: '📝 Blog / Media' },
  { value: 'playlist', label: '🎵 Playlist Curator' },
  { value: 'radio',    label: '📻 Radio / Podcast' },
  { value: 'label',    label: '🏷️ Record Label' },
];

export default function CuratorRegistrationPage() {
  const [form, setForm] = useState({
    name: '', email: '', type: 'blog', outletName: '',
    url: '', bio: '', followers: '', region: 'Global',
    genres: [], accepts: [],
  });
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleGenre = (g) => {
    set('genres', form.genres.includes(g)
      ? form.genres.filter(x => x !== g)
      : [...form.genres, g]);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.outletName) {
      setError('Name, email, and outlet name are required.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      await registerCurator(form);
      setStatus('success');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid #333', background: '#1a1a2e', color: '#fff',
    fontSize: 14, outline: 'none', marginTop: 6,
  };
  const labelStyle = {
    fontSize: 13, color: '#aaa', display: 'block', marginTop: 16,
  };

  if (status === 'success') {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d1a', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', color: '#fff', maxWidth: 480 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Registration Received!</h1>
          <p style={{ color: '#aaa', lineHeight: 1.7 }}>
            Thank you for joining OTONAMI as a curator.<br />
            We'll review your profile and be in touch within 2–3 business days.
          </p>
          <a href="https://otonami.vercel.app" style={{
            display: 'inline-block', marginTop: 24, padding: '12px 28px',
            background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
            borderRadius: 24, color: '#fff', textDecoration: 'none', fontWeight: 600,
          }}>
            Back to OTONAMI →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1a', padding: '40px 16px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
            Join OTONAMI as a Curator
          </h1>
          <p style={{ color: '#888', fontSize: 15, lineHeight: 1.6 }}>
            Discover emerging Japanese indie artists and receive<br />
            curated pitches matching your taste.
          </p>
        </div>

        <div style={{ background: '#13132a', borderRadius: 16, padding: 28,
                      border: '1px solid #2a2a4a' }}>

          <label style={labelStyle}>Your Name *</label>
          <input style={inputStyle} value={form.name}
                 placeholder="e.g. Jane Smith"
                 onChange={e => set('name', e.target.value)} />

          <label style={labelStyle}>Email Address *</label>
          <input style={inputStyle} type="email" value={form.email}
                 placeholder="curator@example.com"
                 onChange={e => set('email', e.target.value)} />

          <label style={labelStyle}>Outlet / Playlist Name *</label>
          <input style={inputStyle} value={form.outletName}
                 placeholder="e.g. Tokyo Sound Journal"
                 onChange={e => set('outletName', e.target.value)} />

          <label style={labelStyle}>Type</label>
          <select style={inputStyle} value={form.type}
                  onChange={e => set('type', e.target.value)}>
            {TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <label style={labelStyle}>Website / Playlist URL</label>
          <input style={inputStyle} value={form.url}
                 placeholder="https://..."
                 onChange={e => set('url', e.target.value)} />

          <label style={labelStyle}>Follower / Subscriber Count</label>
          <input style={inputStyle} type="number" value={form.followers}
                 placeholder="e.g. 5000"
                 onChange={e => set('followers', e.target.value)} />

          <label style={labelStyle}>Primary Region</label>
          <select style={inputStyle} value={form.region}
                  onChange={e => set('region', e.target.value)}>
            {['Global','EN/Global','JP/EN','JP/Global','Asia','Europe','US/Global'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <label style={labelStyle}>Genres You Cover</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {GENRE_OPTIONS.map(g => (
              <button key={g} onClick={() => toggleGenre(g)} style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 12,
                border: '1px solid',
                borderColor: form.genres.includes(g) ? '#7c3aed' : '#333',
                background: form.genres.includes(g) ? '#7c3aed22' : 'transparent',
                color: form.genres.includes(g) ? '#a78bfa' : '#888',
                cursor: 'pointer',
              }}>
                {g}
              </button>
            ))}
          </div>

          <label style={labelStyle}>Brief Bio</label>
          <textarea style={{ ...inputStyle, height: 100, resize: 'vertical' }}
                    value={form.bio}
                    placeholder="Tell artists what you do and what you're looking for..."
                    onChange={e => set('bio', e.target.value)} />

          {error && (
            <p style={{ color: '#f87171', fontSize: 13, marginTop: 12 }}>{error}</p>
          )}

          <button onClick={handleSubmit} disabled={status === 'loading'} style={{
            width: '100%', marginTop: 24, padding: '14px',
            background: status === 'loading'
              ? '#444'
              : 'linear-gradient(135deg, #7c3aed, #2563eb)',
            border: 'none', borderRadius: 12, color: '#fff',
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
          }}>
            {status === 'loading' ? 'Submitting...' : 'Join as Curator →'}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#555', fontSize: 12, marginTop: 20 }}>
          By submitting, you agree to receive pitch emails from Japanese indie artists via OTONAMI.
        </p>
      </div>
    </div>
  );
}
