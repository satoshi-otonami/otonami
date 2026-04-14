'use client';

import { useState } from 'react';

export default function TestLoginPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async (action, email, password, name) => {
    setLoading(true);
    setResult(null);
    try {
      const body = { action, email, password };
      if (name) body.name = name;

      const res = await fetch('/api/curators/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult({ status: res.status, ok: res.ok, data });
    } catch (err) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Curator Login API Test</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          onClick={() => testAPI('register', 'contact@patrickmichel.net', 'test123456', 'Patrick St. Michel')}
          style={btnStyle}
          disabled={loading}
        >
          Test 1: Patrick St. Michel にパスワード設定 (register)
        </button>

        <button
          onClick={() => testAPI('login', 'contact@patrickmichel.net', 'test123456')}
          style={btnStyle}
          disabled={loading}
        >
          Test 2: Patrick St. Michel でログイン (login)
        </button>

        <button
          onClick={() => testAPI('register', 'leap250@gmail.com', 'test123456', 'Leap250')}
          style={btnStyle}
          disabled={loading}
        >
          Test 3: Leap250 にパスワード設定 (register)
        </button>

        <button
          onClick={() => testAPI('register', 'newcurator@test.com', 'test123456', 'New Test Curator')}
          style={btnStyle}
          disabled={loading}
        >
          Test 4: 完全新規キュレーター登録
        </button>
      </div>

      {loading && <p style={{ marginTop: '1rem', color: '#666' }}>Loading...</p>}

      {result && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: result.ok ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${result.ok ? '#86efac' : '#fca5a5'}`,
          borderRadius: '8px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          fontSize: '0.85rem',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {result.ok ? '✓ Success' : 'Error'} — Status: {result.status}
          </div>
          {JSON.stringify(result.data, null, 2)}
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  padding: '0.75rem 1.5rem',
  fontSize: '0.9rem',
  background: '#6366f1',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  textAlign: 'left',
};
