'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function CuratorSubmitPage() {
  const { curatorId } = useParams();
  const [curator, setCurator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!curatorId) return;
    fetch(`/api/curators/${encodeURIComponent(curatorId)}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setCurator(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [curatorId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#fff', background: '#0d0d1a', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF6B4A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !curator) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#fff', background: '#0d0d1a', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ width: 48, height: 2, background: '#c4956a', borderRadius: 1, margin: '0 auto 16px' }} />
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.5rem', marginBottom: 8 }}>Curator not found</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>This curator may no longer be accepting submissions.</p>
        <a href="/curators" style={{ color: '#FF6B4A', textDecoration: 'none', fontWeight: 600 }}>Browse all curators →</a>
      </div>
    );
  }

  const typeLabel = curator.type === 'blog' ? 'Blog' : curator.type === 'playlist' ? 'Playlist' : curator.type === 'radio' ? 'Radio' : curator.type === 'label' ? 'Label' : 'Curator';

  return (
    <div style={{ background: '#0d0d1a', minHeight: '100vh', padding: '40px 20px', color: '#fff', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        {/* OTONAMI logo */}
        <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <svg width="32" height="32" viewBox="0 0 40 40" style={{ flexShrink: 0 }}><circle cx="20" cy="20" r="16" fill="none" stroke="#FF6B4A" strokeWidth="5"/><g style={{clipPath:'circle(32.5% at 50% 50%)'}} fill="#FF6B4A"><rect x="8" y="17" width="2" height="6" rx="1"/><rect x="12" y="14" width="2" height="12" rx="1"/><rect x="16" y="11" width="2" height="18" rx="1"/><rect x="20" y="8" width="2" height="24" rx="1"/><rect x="24" y="11" width="2" height="18" rx="1"/><rect x="28" y="14" width="2" height="12" rx="1"/><rect x="32" y="17" width="2" height="6" rx="1"/></g></svg>
          <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '1.1rem', letterSpacing: 2, color: '#fff' }}>OTONAMI</span>
        </a>

        {/* Curator avatar */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: curator.icon_url ? `url(${curator.icon_url}) center/cover` : 'linear-gradient(135deg,#FF6B4A,#A78BFA)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 700, color: '#fff',
          margin: '0 auto 20px',
          border: '3px solid rgba(255,107,74,0.3)',
        }}>
          {!curator.icon_url && (curator.name?.charAt(0) || '?')}
        </div>

        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.6rem', marginBottom: 8, fontWeight: 700 }}>
          Submit to {curator.name}
        </h1>

        {curator.platform && (
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 16, fontSize: '0.95rem' }}>
            {typeLabel} · {curator.platform}
          </p>
        )}

        {curator.region && (
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 20, fontSize: '0.85rem' }}>
            {curator.region}{curator.followers > 0 ? ` · ${Number(curator.followers).toLocaleString()} followers` : ''}
          </p>
        )}

        {/* Genres */}
        {curator.genres && curator.genres.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {curator.open_to_all_genres && (
              <div style={{ fontSize: '0.8rem', color: '#FF6B4A', fontWeight: 600, marginBottom: 8 }}>
                Open to all genres
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {curator.genres.slice(0, 8).map(g => (
                <span key={g} style={{
                  padding: '4px 14px', borderRadius: 20, fontSize: '0.8rem',
                  background: 'rgba(255,107,74,0.12)', color: '#FF6B4A', border: '1px solid rgba(255,107,74,0.25)',
                }}>{g}</span>
              ))}
            </div>
          </div>
        )}

        {/* Opportunities */}
        {curator.opportunities && curator.opportunities.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
            {curator.opportunities.map(o => (
              <span key={o} style={{
                padding: '3px 10px', borderRadius: 14, fontSize: '0.75rem',
                background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)',
              }}>{o}</span>
            ))}
          </div>
        )}

        {/* Bio */}
        {curator.bio && (
          <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 30, fontSize: '0.9rem', maxWidth: 480, margin: '0 auto 30px' }}>
            {curator.bio}
          </p>
        )}

        {/* CTA Button */}
        <a href={`/artist?submit_to=${encodeURIComponent(curatorId)}`} style={{
          display: 'inline-block', padding: '15px 44px', borderRadius: 30,
          background: 'linear-gradient(135deg,#FF6B4A,#FF3D6E)',
          color: '#fff', fontWeight: 700, fontSize: '1.05rem', textDecoration: 'none',
          boxShadow: '0 4px 24px rgba(255,107,74,0.3)', transition: 'transform 0.2s, box-shadow 0.2s',
        }}>
          Submit Your Music →
        </a>

        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem', marginTop: 48 }}>
          Powered by <a href="https://otonami.io" style={{ color: '#FF6B4A', textDecoration: 'none' }}>OTONAMI</a>
        </p>
      </div>
    </div>
  );
}
