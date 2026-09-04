'use client';

import { RESPONSE_WINDOW_DAYS } from '@/lib/pricing';

/**
 * Static inbox mock for the guarantee section.
 *
 * The order is the argument: the refund sits at the TOP, above the two good
 * outcomes. Showing the failure case first — and showing that it resolves
 * itself without the artist chasing anyone — is what makes the other two
 * rows believable. Do not reorder this to lead with the wins.
 *
 * Pure markup: no images, no data, nothing to load.
 */
export default function RefundInbox({ lang = 'ja' }) {
  const isJa = lang !== 'en';

  const rows = [
    {
      key: 'refund',
      tone: 'muted',
      from: isJa ? 'OTONAMI' : 'OTONAMI',
      subject: isJa
        ? `${RESPONSE_WINDOW_DAYS}日経過・クレジットを返却しました`
        : `${RESPONSE_WINDOW_DAYS} days passed — your credits are back`,
      preview: isJa
        ? '返信がなかったため、使用分は自動で残高に戻っています。'
        : 'No reply came in, so what you spent went back to your balance automatically.',
      when: isJa ? `${RESPONSE_WINDOW_DAYS}日後` : `Day ${RESPONSE_WINDOW_DAYS}`,
    },
    {
      key: 'feedback',
      tone: 'good',
      from: isJa ? 'キュレーター' : 'Curator',
      subject: isJa ? 'フィードバックが届きました' : 'Feedback arrived',
      preview: isJa
        ? '今回は見送りますが、ミックスとBメロについて所感を書きました。'
        : 'Passing this time — but here are notes on the mix and the B section.',
      when: isJa ? '3日後' : 'Day 3',
    },
    {
      key: 'offer',
      tone: 'good',
      from: isJa ? 'キュレーター' : 'Curator',
      subject: isJa ? '掲載の提案が届きました' : 'An offer arrived',
      preview: isJa
        ? 'プレイリストに追加しました。次のレビュー記事でも触れる予定です。'
        : 'Added to the playlist. Planning to mention it in the next review, too.',
      when: isJa ? '2日後' : 'Day 2',
    },
  ];

  return (
    <div
      role="img"
      aria-label={
        isJa
          ? `受信箱のイメージ。${RESPONSE_WINDOW_DAYS}日経過によるクレジット返却、フィードバック、掲載の提案の3件。`
          : `Illustrative inbox: a ${RESPONSE_WINDOW_DAYS}-day credit return, a feedback reply, and an offer.`
      }
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          fontSize: 11,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#b4b0a8',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="1.5" y="3" width="13" height="10" rx="2" /><path d="M1.5 5l6.5 4 6.5-4" />
        </svg>
        {isJa ? '送信後に届くもの' : 'What lands after you send'}
      </div>

      {rows.map((r, i) => (
        <div
          key={r.key}
          style={{
            display: 'flex',
            gap: 12,
            padding: '14px 16px',
            borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
            alignItems: 'flex-start',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              marginTop: 6,
              flexShrink: 0,
              background: r.tone === 'good' ? '#4ade80' : '#8f8b83',
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: r.tone === 'good' ? '#f0ede6' : '#d3cfc6',
                }}
              >
                {r.subject}
              </span>
              <span style={{ fontSize: 11, color: '#a5a199', whiteSpace: 'nowrap' }}>{r.when}</span>
            </div>
            <div
              style={{
                fontSize: 12.5,
                lineHeight: 1.6,
                marginTop: 3,
                color: r.tone === 'good' ? '#ddd9d0' : '#b4b0a8',
              }}
            >
              <span style={{ color: '#b4b0a8' }}>{r.from} — </span>
              {r.preview}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
