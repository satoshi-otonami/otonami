// ═══════════════════════════════════════════════
//  OTONAMI API Client
//  Frontend → Next.js API Routes → External Services
//  Replaces all direct API calls from Artifact sandbox
// ═══════════════════════════════════════════════

const API = {
  // ── AI Pitch Generation ──
  async generatePitch(artist, curator, style, links, followers, userName, trackFeatures) {
    const res = await fetch('/api/pitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist, curator, style, links, followers, userName, trackFeatures: trackFeatures || null }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Pitch generation failed');
    return { pitch: data.pitch, epk: data.epk, usage: data.usage };
  },

  // ── Email Sending ──
  async sendPitchEmail(pitchId, toEmail, toName, pitchText, epk, artistName, trackUrl, artistEmail) {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'pitch',
        pitchId,
        toEmail,
        toName,
        pitchText,
        epk,
        artistName,
        artistEmail: artistEmail || null,
        trackUrl: trackUrl || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Email send failed');
    return data;
  },

  async sendReminder(toEmail, curatorName, artistName) {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'reminder', toEmail, curatorName, artistName }),
    });
    return res.json();
  },

  // ── Social Media Follower Fetch ──
  async fetchFollowers(links) {
    const res = await fetch('/api/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Fetch failed');
    return data; // { followers: { youtube: 1234, spotify: 5678, ... }, errors: {} }
  },

  // ── Stripe Payment ──
  async createCheckout(packageId, userId, userEmail) {
    const res = await fetch('/api/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId, userId, userEmail }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Payment error');
    return data; // { url, sessionId }
  },

  async verifyPayment(sessionId) {
    const res = await fetch('/api/stripe', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    return res.json();
  },
};

export default API;

// ═══════════════════════════════════════════════
//  認証付きAPIクライアント（コスト保護API用）
//  /api/pitch, /api/pitches, /api/track/analyze, /api/promo/* で使用
// ═══════════════════════════════════════════════

export class ApiError extends Error {
  constructor(name, message, status, retryAfter) {
    super(message);
    this.name = name;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/**
 * 認証付きfetchラッパー。
 * - artist_token を localStorage から取得して Authorization に付与
 * - 401/413/429 を ApiError に変換して throw
 * - その他のレスポンスはそのまま返す（呼び出し側で res.ok 判定）
 */
export async function authFetch(url, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('artist_token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError('Unauthorized', data.message || 'ログインが必要です', 401);
  }

  if (response.status === 429) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      'RateLimitExceeded',
      data.message || 'しばらく時間をおいてから再度お試しください',
      429,
      data.retryAfter
    );
  }

  if (response.status === 413) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError('InputTooLong', data.message || '入力が長すぎます', 413);
  }

  return response;
}
