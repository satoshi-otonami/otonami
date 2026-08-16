import SavannahPageClient from '@/components/SavannahPageClient';

export const metadata = {
  title: 'Savannah Showcase 2027 応募案内 | OTONAMI',
  description:
    'Music Bridge Tokyo presents: Savannah Showcase 2027 — 2027年4月に米ジョージア州サバンナで開催予定の国際ショーケースに、日本を拠点とするアーティスト1組が招待されます。提供内容・参加条件・応募方法のご案内。',
};

// 締切判定はクライアント側で行うが、静的HTMLも古いまま固定されないよう
// LP と同じ 1 時間 ISR を掛けておく。
export const revalidate = 3600;

export default function SavannahPage() {
  return <SavannahPageClient />;
}
