'use client';

import { useEffect, useState } from 'react';
import { RESPONSE_WINDOW_DAYS } from '@/lib/pricing';

/**
 * The four things a first-time visitor needs settled before they will read
 * anything else. Reused verbatim under the landing hero, in the artist
 * pricing block, and above the artist registration form — one component so
 * the four promises can never drift apart between pages.
 *
 * The curator figure is never a literal. Pass `curatorCount` when the page
 * already has it server-side (the landing page does, via the ISR marquee);
 * otherwise this fetches /api/curators/count, which applies the same is_seed
 * predicate as /api/curators/list.
 */
export default function TrustBar({ curatorCount = null, lang = 'ja', tone = 'dark' }) {
  const [count, setCount] = useState(curatorCount);

  useEffect(() => {
    if (curatorCount != null) { setCount(curatorCount); return; }
    let alive = true;
    fetch('/api/curators/count')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && typeof d?.count === 'number') setCount(d.count); })
      .catch(() => {});
    return () => { alive = false; };
  }, [curatorCount]);

  const isJa = lang !== 'en';

  const items = [
    {
      key: 'curators',
      // Hidden entirely until the real number is known — a placeholder digit
      // here would be exactly the hardcoded figure this bar exists to avoid.
      hide: count == null,
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="5" r="2.4" /><path d="M1.5 13.5c0-2.3 2-3.8 4.5-3.8s4.5 1.5 4.5 3.8" /><path d="M11 3.2a2.4 2.4 0 0 1 0 4.6M12.2 9.9c1.5.5 2.4 1.7 2.4 3.6" />
        </svg>
      ),
      label: isJa ? `登録キュレーター${count}組` : `${count} registered curators`,
    },
    {
      key: 'refund',
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 8a6 6 0 1 1 1.8 4.3" /><path d="M2 12.5V9h3.5" /><path d="M8 5v3.2l2 1.2" />
        </svg>
      ),
      label: isJa
        ? `${RESPONSE_WINDOW_DAYS}日以内に返信・なければクレジット自動返却`
        : `A reply within ${RESPONSE_WINDOW_DAYS} days, or your credits come back automatically`,
    },
    {
      key: 'nosub',
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1.5" y="3.5" width="13" height="9" rx="2" /><path d="M1.5 6.8h13" />
        </svg>
      ),
      label: isJa ? '都度課金・サブスクなし' : 'Pay per pitch — no subscription',
    },
    {
      key: 'human',
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 14s5.5-3 5.5-6.8V3.4L8 1.5 2.5 3.4v3.8C2.5 11 8 14 8 14z" /><path d="M5.9 7.6l1.5 1.5 2.7-2.8" />
        </svg>
      ),
      label: isJa
        ? '人の手によるレビュー（AI生成楽曲は受け付けません）'
        : 'Reviewed by people (fully AI-generated tracks are not accepted)',
    },
  ].filter(i => !i.hide);

  const dark = tone === 'dark';

  return (
    <ul
      className="trust-bar"
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px 18px',
        color: dark ? 'rgba(240,237,230,0.62)' : '#6b6560',
      }}
    >
      {items.map(item => (
        <li key={item.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, lineHeight: 1.5 }}>
          <span style={{ display: 'inline-flex', color: '#c4956a', flexShrink: 0 }}>{item.icon}</span>
          <span>{item.label}</span>
        </li>
      ))}
      <style>{`
        @media (max-width: 767px) {
          .trust-bar { flex-direction: column; align-items: flex-start; gap: 8px; text-align: left; }
        }
      `}</style>
    </ul>
  );
}
