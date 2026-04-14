// ═══════════════════════════════════════════════
//  OTONAMI API Client
//  Frontend → Next.js API Routes → External Services
//  Replaces all direct API calls from Artifact sandbox
// ═══════════════════════════════════════════════

const API = {
  // ── Auth ──
  async login(email, password) {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.token) localStorage.setItem('otonami_token', data.token);
    return data;
  },

  async register(email, password, name, role = 'artist') {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', email, password, name, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.token) localStorage.setItem('otonami_token', data.token);
    return data;
  },

  async getUser() {
    const token = localStorage.getItem('otonami_token');
    if (!token) return null;
    const res = await fetch('/api/auth', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) { localStorage.removeItem('otonami_token'); return null; }
    return (await res.json()).user;
  },

  logout() {
    localStorage.removeItem('otonami_token');
  },

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
