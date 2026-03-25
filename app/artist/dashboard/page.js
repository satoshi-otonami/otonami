"use client";
import { useState, useEffect, useRef } from 'react';

const THEME = {
  bg: '#f8f7f4', card: '#ffffff', border: '#e5e2dc', borderLight: '#f0ede8',
  text: '#1a1a1a', textSub: '#6b6560', textMuted: '#9b9590',
  gold: '#c4956a', goldLight: '#c4956a20', goldDark: '#b8845e',
  coral: '#e85d3a', coralDark: '#d04e2e',
  green: '#10b981', greenLight: '#10b98120',
  font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontDisplay: "'Playfair Display', Georgia, serif",
};

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

const TYPE_LABELS = { solo: 'Solo Artist', band: 'Band', label: 'Label', producer: 'Producer' };

/* ── SVG Icons for SNS ── */
const SpotifyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);
const YouTubeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

// YouTube URLからサムネイルURLを直接生成（API不要）
function getYoutubeThumbnail(url) {
  if (!url) return null;
  const m1 = url.match(/[?&]v=([^&#]+)/);
  const m2 = url.match(/youtu\.be\/([^?&#]+)/);
  const m3 = url.match(/shorts\/([^?&#]+)/);
  const m4 = url.match(/embed\/([^?&#]+)/);
  const videoId = m1?.[1] || m2?.[1] || m3?.[1] || m4?.[1];
  if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return null;
}

// Spotify URLからサムネイルURLを取得（oEmbed API）
async function getSpotifyThumbnail(url) {
  if (!url || !url.includes('spotify.com')) return null;
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const data = await res.json();
      return data.thumbnail_url || null;
    }
  } catch (e) { /* ignore */ }
  return null;
}

export default function ArtistDashboard() {
  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('profile');
  const [token, setToken] = useState('');
  const [pitchStats, setPitchStats] = useState(null);
  const [recentPitches, setRecentPitches] = useState([]);

  // Modals
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [trackMenu, setTrackMenu] = useState(null);
  const [editTrack, setEditTrack] = useState(null);
  const trackMenuRef = useRef(null);

  // Header dropdown
  const [headerMenu, setHeaderMenu] = useState(false);
  const headerMenuRef = useRef(null);

  // Read ?tab= param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'tracks') setTab('tracks');
  }, []);

  // Auth + load profile
  useEffect(() => {
    const t = localStorage.getItem('artist_token');
    if (!t) { window.location.href = '/artist/login'; return; }
    setToken(t);
    fetchProfile(t);
  }, []);

  const fetchProfile = async (t) => {
    try {
      const res = await fetch('/api/artists', { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) { localStorage.removeItem('artist_token'); window.location.href = '/artist/login'; return; }
      const data = await res.json();
      setArtist(data.artist);
      setTracks(data.artist.tracks || []);
      if (data.pitchStats) setPitchStats(data.pitchStats);
      if (data.recentPitches) setRecentPitches(data.recentPitches);
    } catch { window.location.href = '/artist/login'; }
    finally { setLoading(false); }
  };

  const fetchTracks = async () => {
    try {
      const res = await fetch('/api/artists/tracks', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setTracks(data.tracks || []); }
    } catch {}
  };

  // Close header menu on outside click
  useEffect(() => {
    if (!headerMenu) return;
    const handler = (e) => { if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setHeaderMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [headerMenu]);

  // Close track menu on outside click
  useEffect(() => {
    if (!trackMenu) return;
    const handler = (e) => {
      if (trackMenuRef.current && trackMenuRef.current.contains(e.target)) return;
      setTrackMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [trackMenu]);

  const handleLogout = () => {
    localStorage.removeItem('artist_token');
    window.location.href = '/artist/login';
  };

  const handleDeleteTrack = async (track) => {
    try {
      const res = await fetch(`/api/artists/tracks?id=${track.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { setTracks(prev => prev.filter(t => t.id !== track.id)); }
    } catch {}
    setDeleteConfirm(null);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: THEME.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', fontFamily: THEME.font, color: THEME.textMuted }}>
        <svg width="32" height="32" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }}>
          <circle cx="12" cy="12" r="10" stroke={THEME.gold} strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
        </svg>
        <div>Loading...</div>
      </div>
    </div>
  );

  if (!artist) return null;

  // Build pitch URL with query params for seamless studio handoff
  const buildPitchUrl = (track) => {
    const params = new URLSearchParams();
    params.set('role', 'artist');
    params.set('track_id', track.id);
    params.set('track_title', track.title);
    const songLink = track.spotify_url || track.youtube_url || track.soundcloud_url || track.bandcamp_url || '';
    if (songLink) params.set('song_link', songLink);
    if (artist?.name) params.set('artist_name', artist.name);
    if (artist?.genres?.length) params.set('artist_genre', artist.genres.join(', '));
    params.set('auto_analyze', 'true');
    return `/studio?${params.toString()}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, fontFamily: THEME.font }}>
      <style>{globalStyles}</style>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${THEME.border}`,
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: THEME.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17 }}>O</div>
            <span className="logo-text" style={{ fontFamily: THEME.fontDisplay, fontSize: 22, fontWeight: 700, color: THEME.gold, letterSpacing: -0.3 }}>OTONAMI</span>
          </a>
          <nav className="nav-links" style={{ display: 'flex', gap: 4 }}>
            <span style={{ padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 700, color: THEME.text, fontFamily: THEME.font }}>ダッシュボード</span>
            <a href="/studio?role=artist" style={{ padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: THEME.textSub, textDecoration: 'none', fontFamily: THEME.font, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = THEME.goldLight; e.currentTarget.style.color = THEME.gold; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = THEME.textSub; }}
            >ピッチを送る</a>
          </nav>
        </div>
        <div style={{ position: 'relative' }} ref={headerMenuRef}>
          <button onClick={() => setHeaderMenu(!headerMenu)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = THEME.goldLight}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: THEME.goldLight, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: `2px solid ${THEME.border}`, flexShrink: 0 }}>
              {artist.avatar_url ? <img src={artist.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 14 }}>🎵</span>}
            </div>
            <span className="header-name" style={{ fontSize: 13, fontWeight: 600, color: THEME.text, fontFamily: THEME.font }}>{artist.name}</span>
            <span style={{ fontSize: 10, color: THEME.textMuted }}>▼</span>
          </button>
          {headerMenu && (
            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', minWidth: 180, zIndex: 200, overflow: 'hidden' }}>
              <button onClick={() => { setHeaderMenu(false); setShowEditProfile(true); }} style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: THEME.text, fontFamily: THEME.font, display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = THEME.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >✏️ プロフィール編集</button>
              <div style={{ height: 1, background: THEME.borderLight }} />
              <button onClick={handleLogout} style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: THEME.coral, fontFamily: THEME.font, display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = THEME.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >🚪 ログアウト</button>
            </div>
          )}
        </div>
      </header>

      {/* ── Cover + Profile Hero ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 0' }}>
        <div style={{ position: 'relative', borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
          <div className="cover-area" style={{ height: 200, background: artist.cover_url ? `url(${artist.cover_url}) center/cover` : 'linear-gradient(135deg, #c4956a 0%, #e85d3a 100%)' }} />
          <button onClick={() => setShowEditProfile(true)} style={{
            position: 'absolute', top: 16, right: 16, padding: '8px 16px', borderRadius: 100,
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            border: `1px solid ${THEME.border}`, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: THEME.text, fontFamily: THEME.font,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>✏️ プロフィール編集</button>
        </div>

        {/* Profile info below cover */}
        <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderTop: 'none', borderRadius: '0 0 16px 16px', padding: '0 28px 28px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: -48 }}>
            <div className="avatar-hero" style={{ width: 96, height: 96, borderRadius: '50%', border: '4px solid #fff', background: THEME.goldLight, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
              {artist.avatar_url ? <img src={artist.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 40 }}>🎵</span>}
            </div>
            <div style={{ paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: THEME.fontDisplay, fontSize: 24, fontWeight: 700, color: THEME.text, margin: 0 }}>{artist.name}</h1>
                <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: THEME.goldLight, color: THEME.gold, border: `1px solid ${THEME.gold}30` }}>
                  {TYPE_LABELS[artist.artist_type] || artist.artist_type}
                </span>
                <span style={{ fontSize: 14 }}>{artist.region === 'Japan' || artist.region === 'JP' ? '🇯🇵' : '🌏'} {artist.region}</span>
              </div>
              {artist.label_name && <div style={{ fontSize: 13, color: THEME.textMuted, marginTop: 4 }}>🏷️ {artist.label_name}</div>}
            </div>
          </div>

          {/* Genres & Moods */}
          {((artist.genres?.length > 0) || (artist.moods?.length > 0)) && (
            <div style={{ marginTop: 20 }}>
              {artist.genres?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {artist.genres.map(g => (
                    <span key={g} style={{ padding: '4px 12px', borderRadius: 100, fontSize: 12, background: THEME.goldLight, color: THEME.gold, fontWeight: 500, fontFamily: THEME.font }}>{g}</span>
                  ))}
                </div>
              )}
              {artist.moods?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {artist.moods.map(m => (
                    <span key={m} style={{ padding: '4px 12px', borderRadius: 100, fontSize: 12, background: THEME.card, color: THEME.textSub, fontWeight: 500, fontFamily: THEME.font, border: `1px solid ${THEME.border}` }}>{m}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SNS Links (branded pill buttons) ── */}
          {(artist.spotify_url || artist.youtube_url || artist.instagram_url || artist.twitter_url || artist.facebook_url || artist.website_url) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
              {artist.spotify_url && (
                <a href={artist.spotify_url} target="_blank" rel="noopener noreferrer" className="sns-pill"
                   style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9999, background: '#1DB954', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  <SpotifyIcon /> Spotify
                </a>
              )}
              {artist.youtube_url && (
                <a href={artist.youtube_url} target="_blank" rel="noopener noreferrer" className="sns-pill"
                   style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9999, background: '#FF0000', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  <YouTubeIcon /> YouTube
                </a>
              )}
              {artist.instagram_url && (
                <a href={artist.instagram_url} target="_blank" rel="noopener noreferrer" className="sns-pill"
                   style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9999, background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  <InstagramIcon /> Instagram
                </a>
              )}
              {artist.twitter_url && (
                <a href={artist.twitter_url} target="_blank" rel="noopener noreferrer" className="sns-pill"
                   style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9999, background: '#000', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  𝕏
                </a>
              )}
              {artist.facebook_url && (
                <a href={artist.facebook_url} target="_blank" rel="noopener noreferrer" className="sns-pill"
                   style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9999, background: '#1877F2', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  Facebook
                </a>
              )}
              {artist.website_url && (
                <a href={artist.website_url} target="_blank" rel="noopener noreferrer" className="sns-pill"
                   style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9999, background: '#1a1a1a', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  🔗 Website
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', borderBottom: `2px solid ${THEME.borderLight}`, marginTop: 24 }}>
          {[{ key: 'profile', label: 'Profile' }, { key: 'tracks', label: 'Tracks' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '12px 24px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontWeight: tab === t.key ? 700 : 500, fontSize: 14,
              color: tab === t.key ? THEME.gold : THEME.textSub,
              borderBottom: tab === t.key ? `2px solid ${THEME.gold}` : '2px solid transparent',
              marginBottom: -2, fontFamily: THEME.font, transition: 'all 0.15s',
            }}>{t.label}{t.key === 'tracks' && tracks.length > 0 ? ` (${tracks.length})` : ''}</button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 80px' }}>

        {/* ── Profile Tab ── */}
        {tab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {artist.hot_news && (
              <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: '20px 24px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: THEME.text, margin: '0 0 8px', fontFamily: THEME.font, display: 'flex', alignItems: 'center', gap: 6 }}>🔥 Hot news</h3>
                <p style={{ fontSize: 14, color: THEME.textSub, lineHeight: 1.6, margin: 0 }}>{artist.hot_news}</p>
              </div>
            )}
            {artist.bio && (
              <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: '20px 24px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: THEME.text, margin: '0 0 8px', fontFamily: THEME.font }}>Bio</h3>
                <p style={{ fontSize: 14, color: THEME.textSub, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{artist.bio}</p>
              </div>
            )}
            {artist.influences?.length > 0 && (
              <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: '20px 24px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: THEME.text, margin: '0 0 12px', fontFamily: THEME.font }}>Influences</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {artist.influences.map(inf => (
                    <span key={inf} style={{ padding: '5px 14px', borderRadius: 100, fontSize: 13, background: THEME.card, color: THEME.textSub, border: `1px solid ${THEME.border}`, fontFamily: THEME.font }}>{inf}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { label: 'ピッチ送信', value: pitchStats?.total_sent || 0, color: THEME.gold },
                { label: 'レスポンス', value: pitchStats?.responded || 0, color: THEME.gold },
                { label: '採用', value: pitchStats?.interested || 0, color: THEME.green },
              ].map(stat => (
                <div key={stat.label} style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: '20px 24px', textAlign: 'center' }}>
                  <div style={{ fontFamily: THEME.fontDisplay, fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 13, color: THEME.textSub, marginTop: 4, fontFamily: THEME.font }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* 最近のピッチ */}
            {recentPitches.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: THEME.text, marginBottom: 12, fontFamily: THEME.font }}>最近のピッチ</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recentPitches.slice(0, 10).map(pitch => (
                    <div key={pitch.id} style={{ background: THEME.card, borderRadius: 12, padding: 16, border: `1px solid ${THEME.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: THEME.text, fontSize: 14, fontFamily: THEME.font }}>{pitch.curator_name}</span>
                          <span style={{ marginLeft: 8, fontSize: 12, color: THEME.textMuted }}>
                            {pitch.sent_at ? new Date(pitch.sent_at).toLocaleDateString('ja-JP') : ''}
                          </span>
                          {pitch.song_title && (
                            <span style={{ marginLeft: 8, fontSize: 12, color: THEME.textSub }}>"{pitch.song_title}"</span>
                          )}
                        </div>
                        <span style={{
                          padding: '4px 12px', borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: THEME.font,
                          background: pitch.status === 'interested' || pitch.status === 'accepted' ? THEME.greenLight :
                                     pitch.status === 'feedback' ? '#3b82f620' :
                                     pitch.status === 'declined' ? '#ef444420' :
                                     pitch.status === 'opened' ? '#f59e0b20' :
                                     THEME.borderLight,
                          color: pitch.status === 'interested' || pitch.status === 'accepted' ? THEME.green :
                                 pitch.status === 'feedback' ? '#3b82f6' :
                                 pitch.status === 'declined' ? '#ef4444' :
                                 pitch.status === 'opened' ? '#f59e0b' :
                                 THEME.textSub,
                        }}>
                          {pitch.status === 'interested' || pitch.status === 'accepted' ? '✅ 採用' :
                           pitch.status === 'feedback' ? '💬 FB受信' :
                           pitch.status === 'declined' ? '❌ 不採用' :
                           pitch.status === 'opened' ? '👀 開封済' :
                           pitch.status === 'listened' ? '🎧 試聴済' :
                           pitch.status === 'sent' ? '📤 送信済' :
                           pitch.status}
                        </span>
                      </div>
                      {pitch.feedback_message && (
                        <div style={{ marginTop: 10, padding: 12, background: THEME.bg, borderRadius: 8, borderLeft: `3px solid ${THEME.gold}` }}>
                          <p style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 4, fontFamily: THEME.font }}>{pitch.curator_name} からのフィードバック</p>
                          <p style={{ fontSize: 14, color: THEME.text, lineHeight: 1.5, margin: 0, fontFamily: THEME.font }}>{pitch.feedback_message}</p>
                        </div>
                      )}
                      {pitch.placement_url && (
                        <div style={{ marginTop: 8 }}>
                          <span style={{ fontSize: 12, color: THEME.green }}>🎉 掲載済み: </span>
                          <a href={pitch.placement_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: THEME.gold }}>{pitch.placement_url}</a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentPitches.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, background: THEME.bg, borderRadius: 12 }}>
                <p style={{ fontSize: 15, color: THEME.textSub, fontFamily: THEME.font }}>まだピッチを送信していません</p>
                <a href="/studio?role=artist" style={{
                  display: 'inline-block', marginTop: 12, padding: '10px 24px',
                  background: THEME.gold, color: '#fff', borderRadius: 9999,
                  textDecoration: 'none', fontWeight: 600, fontSize: 14, fontFamily: THEME.font,
                }}>キュレーターを探す →</a>
              </div>
            )}

            {!artist.bio && !artist.hot_news && (artist.influences?.length || 0) === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✏️</div>
                <p style={{ fontSize: 15, color: THEME.textSub, marginBottom: 20 }}>プロフィールを充実させてキュレーターにアピールしましょう</p>
                <button onClick={() => setShowEditProfile(true)} style={{ padding: '12px 28px', borderRadius: 100, background: THEME.gold, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: THEME.font }}>プロフィールを編集する</button>
              </div>
            )}
          </div>
        )}

        {/* ── Tracks Tab ── */}
        {tab === 'tracks' && (
          <>
            {tracks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🎵</div>
                <p style={{ fontSize: 16, color: THEME.textSub, fontWeight: 600, marginBottom: 8 }}>楽曲を登録してピッチを始めましょう</p>
                <p style={{ fontSize: 13, color: THEME.textMuted, marginBottom: 24 }}>YouTube、Spotify、SoundCloud、Bandcampのリンクを追加できます</p>
                <button onClick={() => setShowAddTrack(true)} className="btn-gold" style={{ padding: '14px 32px', borderRadius: 100, background: THEME.gold, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: THEME.font }}>楽曲を追加する</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                <button onClick={() => setShowAddTrack(true)} className="add-track-card" style={{
                  background: THEME.card, border: `2px dashed ${THEME.border}`, borderRadius: 16,
                  padding: 24, minHeight: 280, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 12, transition: 'all 0.2s',
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: THEME.goldLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: THEME.gold }}>+</div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: THEME.gold, fontFamily: THEME.font }}>楽曲を追加</span>
                </button>

                {tracks.map(track => {
                  const trackThumbnail = track.cover_image_url || getYoutubeThumbnail(track.youtube_url) || null;
                  return (
                  <div key={track.id} className="track-card" style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, overflow: 'hidden', transition: 'all 0.2s', position: 'relative' }}>
                    <div style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden' }}>
                      {trackThumbnail ? (
                        <img src={trackThumbnail} alt={track.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }}
                        />
                      ) : null}
                      <div style={{
                        display: trackThumbnail ? 'none' : 'flex',
                        width: '100%', height: '100%', position: trackThumbnail ? 'absolute' : 'relative', top: 0, left: 0,
                        background: 'linear-gradient(135deg, #c4956a 0%, #e85d3a 50%, #c4956a 100%)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: 48, opacity: 0.5 }}>🎵</span>
                      </div>
                      <div style={{ position: 'absolute', top: 8, right: 8 }}>
                        <button onClick={(e) => { e.stopPropagation(); setTrackMenu(trackMenu === track.id ? null : track.id); }} style={{
                          width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
                          backdropFilter: 'blur(4px)', border: 'none', cursor: 'pointer',
                          fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: THEME.text,
                        }}>•••</button>
                        {trackMenu === track.id && (
                          <div ref={trackMenuRef} style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', minWidth: 140, zIndex: 50, overflow: 'hidden' }}>
                            <button onClick={(e) => { e.stopPropagation(); setTrackMenu(null); setEditTrack(track); }} style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: THEME.text, fontFamily: THEME.font }}
                              onMouseEnter={e => e.currentTarget.style.background = THEME.bg}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >✏️ 編集</button>
                            <button onClick={(e) => { e.stopPropagation(); setTrackMenu(null); setDeleteConfirm(track); }} style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: THEME.coral, fontFamily: THEME.font }}
                              onMouseEnter={e => e.currentTarget.style.background = THEME.bg}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >🗑️ 削除</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: '16px 18px' }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: THEME.text, margin: '0 0 4px', fontFamily: THEME.font }}>{track.title}</h3>
                      {track.release_date && (
                        <div style={{ fontSize: 13, color: THEME.textMuted, marginBottom: 8 }}>
                          Release date: {new Date(track.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      )}
                      {track.genre && (
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 100, fontSize: 11, background: THEME.goldLight, color: THEME.gold, fontWeight: 500, marginBottom: 12 }}>{track.genre}</span>
                      )}
                      <a href={buildPitchUrl(track)} className="btn-gold" style={{ display: 'block', textAlign: 'center', padding: '8px 16px', borderRadius: 100, background: THEME.gold, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600, fontFamily: THEME.font }}>ピッチを送る →</a>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add Track Modal ── */}
      {showAddTrack && (
        <TrackModal
          token={token}
          onClose={() => setShowAddTrack(false)}
          onSuccess={() => { setShowAddTrack(false); fetchTracks(); }}
        />
      )}

      {/* ── Edit Track Modal ── */}
      {editTrack && (
        <TrackModal
          token={token}
          track={editTrack}
          onClose={() => setEditTrack(null)}
          onSuccess={() => { setEditTrack(null); fetchTracks(); }}
        />
      )}

      {/* ── Edit Profile Modal ── */}
      {showEditProfile && (
        <EditProfileModal
          token={token}
          artist={artist}
          onClose={() => setShowEditProfile(false)}
          onSuccess={() => { setShowEditProfile(false); fetchProfile(token); }}
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div style={{ background: THEME.card, borderRadius: 20, padding: 32, maxWidth: 400, width: '100%', boxShadow: '0 16px 48px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: THEME.text, margin: '0 0 12px', fontFamily: THEME.font }}>楽曲を削除</h3>
            <p style={{ fontSize: 14, color: THEME.textSub, lineHeight: 1.6, margin: '0 0 24px' }}>
              「{deleteConfirm.title}」を削除しますか？<br />
              <span style={{ fontSize: 12, color: THEME.textMuted }}>関連するピッチデータは残ります。</span>
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '12px', borderRadius: 100, background: THEME.card, border: `1.5px solid ${THEME.border}`, color: THEME.textSub, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: THEME.font }}>キャンセル</button>
              <button onClick={() => handleDeleteTrack(deleteConfirm)} style={{ flex: 1, padding: '12px', borderRadius: 100, background: THEME.coral, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: THEME.font }}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Track Add/Edit Modal
   ══════════════════════════════════════════════ */
function TrackModal({ token, track, onClose, onSuccess }) {
  const isEdit = !!track;
  const [form, setForm] = useState({
    title: track?.title || '',
    youtube_url: track?.youtube_url || '',
    spotify_url: track?.spotify_url || '',
    soundcloud_url: track?.soundcloud_url || '',
    bandcamp_url: track?.bandcamp_url || '',
    genre: track?.genre || '',
    release_date: track?.release_date || '',
    cover_image_url: track?.cover_image_url || '',
    is_public: track?.is_public !== undefined ? track.is_public : true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(track?.cover_image_url || '');
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleYoutubeUrlChange = (url) => {
    set('youtube_url', url);
    if (!coverFile) {
      const thumb = getYoutubeThumbnail(url);
      if (thumb) {
        setForm(f => ({ ...f, cover_image_url: thumb }));
        setCoverPreview(thumb);
      }
    }
  };

  const handleSpotifyUrlChange = async (url) => {
    set('spotify_url', url);
    if (!coverFile) {
      const thumb = await getSpotifyThumbnail(url);
      if (thumb) {
        setForm(f => ({ ...f, cover_image_url: thumb }));
        setCoverPreview(thumb);
      }
    }
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCoverFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { alert('ファイルサイズは5MB以下にしてください'); return; }
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('タイトルは必須です'); return; }
    if (!form.youtube_url && !form.spotify_url && !form.soundcloud_url && !form.bandcamp_url) {
      setError('少なくとも1つの楽曲URLを入力してください（YouTube / Spotify / SoundCloud / Bandcamp）'); return;
    }
    setLoading(true); setError('');
    try {
      // Upload cover image file if selected
      let coverUrl = form.cover_image_url;
      if (coverFile) {
        setCoverUploading(true);
        try {
          const fd = new FormData();
          fd.append('file', coverFile);
          const uploadRes = await fetch('/api/artists/tracks/cover', {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            coverUrl = uploadData.cover_url;
          }
        } catch {} finally { setCoverUploading(false); }
      }

      const body = isEdit
        ? { id: track.id, ...form, cover_image_url: coverUrl }
        : { ...form, cover_image_url: coverUrl };
      const res = await fetch('/api/artists/tracks', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onSuccess();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text,
    fontSize: 14, outline: 'none', marginTop: 5, boxSizing: 'border-box',
    fontFamily: THEME.font, minHeight: 44,
  };
  const lbl = { fontSize: 12, color: THEME.textSub, display: 'block', marginTop: 16, fontWeight: 600, fontFamily: THEME.font };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
      onClick={onClose}
    >
      <div style={{ background: THEME.card, borderRadius: 20, padding: 32, maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: THEME.textMuted, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
          onMouseEnter={e => e.currentTarget.style.background = THEME.bg}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >✕</button>

        <h2 style={{ fontFamily: THEME.fontDisplay, fontSize: 22, fontWeight: 700, color: THEME.text, margin: '0 0 4px' }}>{isEdit ? '楽曲を編集' : '楽曲を追加'}</h2>
        <p style={{ fontSize: 14, color: THEME.textSub, margin: '0 0 20px' }}>楽曲情報を入力してプロフィールに表示しましょう</p>

        <label style={lbl}>タイトル <span style={{ color: THEME.coral, fontSize: 10 }}>*必須</span></label>
        <input className="modal-input" style={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="楽曲名" />

        <label style={lbl}>▶️ YouTube リンク（任意）</label>
        <input className="modal-input" style={inp} value={form.youtube_url} onChange={e => handleYoutubeUrlChange(e.target.value)} placeholder="https://www.youtube.com/watch?v=... または https://youtu.be/..." />

        <label style={lbl}>🟢 Spotify リンク（任意）</label>
        <input className="modal-input" style={inp} value={form.spotify_url} onChange={e => handleSpotifyUrlChange(e.target.value)} placeholder="https://open.spotify.com/track/..." />

        <label style={lbl}>☁️ SoundCloud リンク（任意）</label>
        <input className="modal-input" style={inp} value={form.soundcloud_url} onChange={e => set('soundcloud_url', e.target.value)} placeholder="https://soundcloud.com/artist/track" />

        <label style={lbl}>📀 Bandcamp リンク（任意）</label>
        <input className="modal-input" style={inp} value={form.bandcamp_url} onChange={e => set('bandcamp_url', e.target.value)} placeholder="https://artist.bandcamp.com/track/..." />

        <label style={lbl}>ジャンル（任意）</label>
        <input className="modal-input" style={inp} value={form.genre} onChange={e => set('genre', e.target.value)} placeholder="例: J-Rock" />

        <label style={lbl}>リリース日（任意）</label>
        <input className="modal-input" style={{ ...inp, colorScheme: 'light' }} type="date" value={form.release_date} onChange={e => set('release_date', e.target.value)} />

        {/* Cover image: auto-fetched preview + file upload + URL fallback */}
        <label style={lbl}>サムネイル画像（任意）</label>
        {coverPreview && /^(https?:\/\/|data:)/.test(coverPreview) && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 13, color: THEME.textSub, marginBottom: 8 }}>カバー画像プレビュー</p>
            <img src={coverPreview} alt="Track cover"
              style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 12, border: `1px solid ${THEME.border}` }}
              onError={(e) => { e.target.style.display = 'none'; }} />
            <button onClick={() => { set('cover_image_url', ''); setCoverPreview(''); setCoverFile(null); }}
              style={{ display: 'block', marginTop: 8, fontSize: 12, color: THEME.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: THEME.font }}>
              画像をクリア
            </button>
          </div>
        )}
        <div style={{ marginTop: 8, padding: 16, border: `1px solid ${THEME.borderLight}`, borderRadius: 12, background: THEME.bg }}>
          <p style={{ fontSize: 12, color: THEME.textSub, marginBottom: 8, fontFamily: THEME.font }}>YouTube / Spotify リンク入力で自動取得されます</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Upload preview */}
            <div onClick={() => coverInputRef.current?.click()} style={{
              width: 80, height: 80, borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
              border: `2px dashed ${coverPreview ? THEME.gold : THEME.border}`,
              background: THEME.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {coverPreview && /^(https?:\/\/|data:)/.test(coverPreview)
                ? <img src={coverPreview} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                : <span style={{ fontSize: 28, color: THEME.textMuted }}>🖼️</span>}
            </div>
            <div>
              <button onClick={() => coverInputRef.current?.click()} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 12, cursor: 'pointer', fontFamily: THEME.font, fontWeight: 500 }}>
                {coverUploading ? '⏳ アップロード中...' : '画像をアップロード'}
              </button>
              <p style={{ fontSize: 11, color: THEME.textMuted, marginTop: 4 }}>JPEG, PNG, WebP（5MB以下）</p>
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleCoverFile(e.target.files?.[0])} />
          </div>
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 13, color: THEME.textMuted, cursor: 'pointer' }}>カバー画像URLを手動入力</summary>
            <input className="modal-input" style={{ ...inp, marginTop: 8, fontSize: 13 }} value={form.cover_image_url} onChange={e => { set('cover_image_url', e.target.value); if (!coverFile) setCoverPreview(e.target.value); }} placeholder="https://..." />
          </details>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_public} onChange={e => set('is_public', e.target.checked)} style={{ width: 18, height: 18, accentColor: THEME.gold }} />
          <span style={{ fontSize: 13, color: THEME.text, fontFamily: THEME.font }}>プロフィールに公開する</span>
        </label>

        {error && <p style={{ color: THEME.coral, fontSize: 13, marginTop: 12 }}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', marginTop: 24, padding: '14px', borderRadius: 100,
          background: loading ? THEME.border : THEME.coral, border: 'none',
          color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: THEME.font,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
              保存中...
            </>
          ) : isEdit ? '保存する' : '楽曲を追加'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Edit Profile Modal
   ══════════════════════════════════════════════ */
function EditProfileModal({ token, artist, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: artist.name || '',
    bio: artist.bio || '',
    hot_news: artist.hot_news || '',
    genres: artist.genres || [],
    moods: artist.moods || [],
    influences: artist.influences || [],
    label_name: artist.label_name || '',
    spotify_url: artist.spotify_url || '',
    youtube_url: artist.youtube_url || '',
    instagram_url: artist.instagram_url || '',
    twitter_url: artist.twitter_url || '',
    facebook_url: artist.facebook_url || '',
    website_url: artist.website_url || '',
    cover_url: artist.cover_url || '',
  });
  const [influenceInput, setInfluenceInput] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(artist.avatar_url || null);
  const avatarInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
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
    if (!val || form.influences.length >= 5 || form.influences.includes(val)) return;
    set('influences', [...form.influences, val]);
    setInfluenceInput('');
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = async () => {
    setLoading(true); setError('');
    try {
      if (avatarFile) {
        try {
          const fd = new FormData();
          fd.append('file', avatarFile);
          await fetch('/api/artists/avatar', {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
          });
        } catch {}
      }
      const res = await fetch('/api/artists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onSuccess();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text,
    fontSize: 14, outline: 'none', marginTop: 5, boxSizing: 'border-box',
    fontFamily: THEME.font, minHeight: 44,
  };
  const lbl = { fontSize: 12, color: THEME.textSub, display: 'block', marginTop: 16, fontWeight: 600, fontFamily: THEME.font };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
      onClick={onClose}
    >
      <div style={{ background: THEME.card, borderRadius: 20, padding: 32, maxWidth: 580, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: THEME.textMuted, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
          onMouseEnter={e => e.currentTarget.style.background = THEME.bg}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >✕</button>

        <h2 style={{ fontFamily: THEME.fontDisplay, fontSize: 22, fontWeight: 700, color: THEME.text, margin: '0 0 20px' }}>プロフィール編集</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div onClick={() => avatarInputRef.current?.click()} style={{ width: 72, height: 72, borderRadius: '50%', border: `2px dashed ${avatarPreview ? THEME.gold : THEME.border}`, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: THEME.bg, flexShrink: 0 }}>
            {avatarPreview ? <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28 }}>🎵</span>}
          </div>
          <div>
            <button onClick={() => avatarInputRef.current?.click()} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 12, cursor: 'pointer', fontFamily: THEME.font }}>写真を変更</button>
            <p style={{ fontSize: 11, color: THEME.textMuted, marginTop: 4 }}>JPEG, PNG, WebP（5MB以下）</p>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) { alert('5MB以下にしてください'); return; }
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setAvatarPreview(ev.target.result);
            reader.readAsDataURL(file);
          }} />
        </div>

        <label style={lbl}>アーティスト名</label>
        <input className="modal-input" style={inp} value={form.name} onChange={e => set('name', e.target.value)} />

        <label style={lbl}>Bio</label>
        <div style={{ position: 'relative' }}>
          <textarea className="modal-input" style={{ ...inp, minHeight: 100, resize: 'vertical' }} value={form.bio} onChange={e => { if (e.target.value.length <= 500) set('bio', e.target.value); }} placeholder="自己紹介..." />
          <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 10, color: form.bio.length > 450 ? THEME.coral : THEME.textMuted }}>{form.bio.length}/500</div>
        </div>

        <label style={lbl}>Hot News</label>
        <input className="modal-input" style={inp} value={form.hot_news} onChange={e => set('hot_news', e.target.value)} placeholder="最新情報..." />

        <label style={lbl}>ジャンル（最大8つ）</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
          {GENRE_OPTIONS.map(g => {
            const sel = form.genres.includes(g);
            return (
              <button key={g} onClick={() => toggleArray('genres', g, 8)} style={{
                padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 500,
                border: `1.5px solid ${sel ? THEME.gold : THEME.border}`,
                background: sel ? THEME.gold : THEME.card, color: sel ? '#fff' : THEME.text,
                cursor: 'pointer', fontFamily: THEME.font, transition: 'all 0.15s',
              }}>{g}</button>
            );
          })}
        </div>

        <label style={lbl}>ムード（最大5つ）</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
          {MOOD_OPTIONS.map(m => {
            const sel = form.moods.includes(m);
            return (
              <button key={m} onClick={() => toggleArray('moods', m, 5)} style={{
                padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 500,
                border: `1.5px solid ${sel ? THEME.gold : THEME.border}`,
                background: sel ? THEME.gold : THEME.card, color: sel ? '#fff' : THEME.text,
                cursor: 'pointer', fontFamily: THEME.font, transition: 'all 0.15s',
              }}>{m}</button>
            );
          })}
        </div>

        <label style={lbl}>影響を受けたアーティスト（最大5つ）</label>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input className="modal-input" style={{ ...inp, flex: 1, marginTop: 0 }} value={influenceInput} onChange={e => setInfluenceInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInfluence(); }}} placeholder="Enterで追加" disabled={form.influences.length >= 5} />
          <button onClick={addInfluence} disabled={form.influences.length >= 5} style={{ padding: '0 12px', borderRadius: 10, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.gold, fontSize: 12, cursor: form.influences.length >= 5 ? 'not-allowed' : 'pointer', fontFamily: THEME.font, fontWeight: 600, opacity: form.influences.length >= 5 ? 0.5 : 1 }}>追加</button>
        </div>
        {form.influences.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
            {form.influences.map(inf => (
              <span key={inf} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 100, fontSize: 11, background: THEME.goldLight, color: THEME.gold, border: `1px solid ${THEME.gold}30` }}>
                {inf}
                <button onClick={() => set('influences', form.influences.filter(x => x !== inf))} style={{ background: 'none', border: 'none', color: THEME.gold, cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}

        <label style={lbl}>所属レーベル</label>
        <input className="modal-input" style={inp} value={form.label_name} onChange={e => set('label_name', e.target.value)} />

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${THEME.borderLight}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text, marginBottom: 12 }}>SNSリンク</div>
          {[
            { key: 'spotify_url', icon: '🟢', label: 'Spotify' },
            { key: 'youtube_url', icon: '▶️', label: 'YouTube' },
            { key: 'instagram_url', icon: '📷', label: 'Instagram' },
            { key: 'twitter_url', icon: '𝕏', label: 'Twitter / X' },
            { key: 'facebook_url', icon: '📘', label: 'Facebook' },
            { key: 'website_url', icon: '🔗', label: 'Webサイト' },
          ].map(s => (
            <div key={s.key} style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 500 }}>{s.icon} {s.label}</label>
              <input className="modal-input" style={{ ...inp, marginTop: 3 }} value={form[s.key]} onChange={e => set(s.key, e.target.value)} placeholder="https://..." />
            </div>
          ))}
        </div>

        <label style={lbl}>カバー画像URL</label>
        <input className="modal-input" style={inp} value={form.cover_url} onChange={e => set('cover_url', e.target.value)} placeholder="https://..." />
        {form.cover_url && /^https?:\/\/.+/.test(form.cover_url) && (
          <div style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', border: `1px solid ${THEME.border}`, maxHeight: 100 }}>
            <img src={form.cover_url} alt="preview" style={{ width: '100%', height: 100, objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
          </div>
        )}

        {error && <p style={{ color: THEME.coral, fontSize: 13, marginTop: 12 }}>{error}</p>}

        <button onClick={handleSave} disabled={loading} style={{
          width: '100%', marginTop: 24, padding: '14px', borderRadius: 100,
          background: loading ? THEME.border : THEME.gold, border: 'none',
          color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: THEME.font,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
              保存中...
            </>
          ) : '保存する'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Global Styles
   ══════════════════════════════════════════════ */
const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #f8f7f4; overflow-x: hidden; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .modal-input:focus { border-color: #c4956a !important; box-shadow: 0 0 0 3px rgba(196,149,106,0.12) !important; }
  .modal-input:hover { border-color: #9b9590 !important; }
  .btn-gold:hover { background: #b8845e !important; }
  .track-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; }
  .add-track-card:hover { border-color: #c4956a !important; background: #c4956a10 !important; }
  .sns-pill:hover { opacity: 0.85; transform: translateY(-1px); }
  .sns-pill { transition: all 0.15s; }
  @media (max-width: 768px) {
    .cover-area { height: 140px !important; }
    .avatar-hero { width: 72px !important; height: 72px !important; margin-top: -36px !important; }
    .nav-links { display: none !important; }
    .header-name { display: none; }
    .logo-text { font-size: 18px !important; }
  }
`;
