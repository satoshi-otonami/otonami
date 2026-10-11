'use client';
import { useState } from 'react';
import { authFetch } from '@/lib/api-client';

// ─── Reply Assist（共有コンポーネント）───
// フィードバックへの返信文を日本語で書き、そのまま送れる英文メール本文に整えて
// メーラー（mailto）へ渡す。送信は本人のメールアプリから（既存のメール直結
// 経路を維持）。アプリ内スレッド化（Phase B）は本機能の利用状況を見て判断
//（2026/10/11 山下さん決定）。
//
// 使用箇所:
//   - components/OtonamiApp.jsx（トラッキングカード・ピッチ詳細モーダル）
//   - app/artist/dashboard/page.js（最近のピッチ・楽曲別フィードバック一覧）
// notify が渡されない画面ではコンポーネント内にインライン表示する。
export default function ReplyAssist({ pitchId, curatorName, notify }) {
  const [open, setOpen] = useState(false);
  const [ja, setJa] = useState('');
  const [en, setEn] = useState('');
  const [contact, setContact] = useState(null); // { email, subject }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const say = (text, type = 'success') => {
    if (notify) { notify(text, type); return; }
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const translate = async () => {
    if (!ja.trim() || busy) return;
    setBusy(true);
    try {
      const res = await authFetch('/api/pitch/reply-assist', {
        method: 'POST',
        body: JSON.stringify({ pitchId, text: ja }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { say(data.message || data.error || '英訳に失敗しました', 'error'); return; }
      setEn(data.en || '');
      setContact({ email: data.curatorEmail || null, subject: data.subject || '' });
    } catch (e) {
      say(e?.message || '英訳に失敗しました', 'error');
    } finally { setBusy(false); }
  };

  const mailtoHref = contact?.email && en
    ? `mailto:${contact.email}?subject=${encodeURIComponent(contact.subject)}&body=${encodeURIComponent(en)}`
    : null;
  const copyEn = async () => {
    try { await navigator.clipboard.writeText(en); say('英文をコピーしました'); }
    catch { say('コピーできませんでした', 'error'); }
  };

  const taStyle = { width: '100%', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '0.6rem', fontFamily: 'inherit', fontSize: '0.82rem', lineHeight: 1.6, boxSizing: 'border-box', resize: 'vertical', background: '#ffffff', color: '#1a1a1a', outline: 'none' };
  const btnSub = { padding: '0.45rem 1rem', background: 'rgba(196,149,106,0.08)', border: '1px solid rgba(196,149,106,0.3)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem', color: '#c4956a', fontWeight: 600 };
  const btnMain = { padding: '0.45rem 1rem', background: '#c4956a', border: '1px solid #c4956a', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.75rem', color: '#ffffff', fontWeight: 600, textDecoration: 'none', display: 'inline-block', cursor: 'pointer' };

  if (!open) return <button onClick={(e) => { e.stopPropagation(); setOpen(true); }} style={{ ...btnSub, marginTop: 8 }}>返信を書く</button>;

  return <div style={{ marginTop: 10, padding: '0.8rem', background: '#ffffff', border: '1px solid rgba(196,149,106,0.3)', borderRadius: 12 }} onClick={(e) => e.stopPropagation()}>
    <div style={{ fontWeight: 700, fontSize: '0.78rem', marginBottom: 6, color: '#1a1a1a' }}>{curatorName}へ返信</div>
    <textarea value={ja} onChange={(e) => setJa(e.target.value)} placeholder="日本語で返信内容を入力（例: カラオケ音源があります。ファイルかリンクをお送りできます）" style={{ ...taStyle, minHeight: 80 }} />
    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
      <button onClick={translate} disabled={busy || !ja.trim()} style={{ ...btnSub, opacity: (busy || !ja.trim()) ? 0.5 : 1, cursor: (busy || !ja.trim()) ? 'not-allowed' : 'pointer' }}>{busy ? '英訳中…' : (en ? 'もう一度英訳する' : '英訳する')}</button>
      <button onClick={() => setOpen(false)} style={{ ...btnSub, background: 'none', border: '1px solid rgba(0,0,0,0.08)', color: '#9a958e' }}>閉じる</button>
    </div>
    {en && <>
      <div style={{ fontSize: '0.7rem', color: '#9a958e', margin: '10px 0 4px', fontWeight: 600 }}>英訳（このまま編集できます）</div>
      <textarea value={en} onChange={(e) => setEn(e.target.value)} style={{ ...taStyle, minHeight: 110 }} />
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {mailtoHref && <a href={mailtoHref} style={btnMain}>メールを作成</a>}
        <button onClick={copyEn} style={btnSub}>英文をコピー</button>
      </div>
      <div style={{ fontSize: '0.68rem', color: '#9a958e', marginTop: 6 }}>
        {contact?.email
          ? '「メールを作成」を押すと、宛先と本文が入った状態でお使いのメールアプリが開きます。'
          : 'このキュレーターの連絡先が取得できないため、英文をコピーしてフィードバック通知メールへの返信に貼り付けてください。'}
      </div>
    </>}
    {msg && <div style={{ fontSize: '0.72rem', color: msg.type === 'error' ? '#ef4444' : '#1f9e8f', marginTop: 6, fontWeight: 600 }}>{msg.text}</div>}
  </div>;
}
