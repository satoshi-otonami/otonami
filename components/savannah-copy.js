/**
 * /savannah の JP/EN コピー。ページ本体（SavannahPageClient）から分離。
 * 数字・条件は MBT 公式発表で裏取りできた範囲のみ記載する（推測値を足さない）。
 */
export const COPY = {
  ja: {
    eyebrow: '公募のお知らせ',
    h1: 'Music Bridge Tokyo presents: Savannah Showcase 2027 — 日本のアーティスト1組を募集',
    sub: '開催 2027年4月16–18日 または 4月23–25日（米ジョージア州サバンナ・週末は調整中）',
    closed: '本募集は終了しました。',

    aboutTitle: 'Music Bridge Tokyo とは',
    aboutBody: [
      'Music Bridge Tokyo（MBT）は、国内外のインディペンデント・アーティストをつなぐ国際ショーケース+カンファレンスです。東京では複数のライブハウスを舞台に、海外と日本のアーティストが同じステージに立つ2日間のイベントとして開催されてきました。2027年はアメリカ・ジョージア州サバンナでの開催が予定されており、日本を拠点とするアーティスト1組が招待されます。',
      'OTONAMIに登録するキュレーター、Apryl Peredo氏（Inter Idoru）がこのプロジェクトに携わっています。',
    ],

    detailsTitle: '提供内容と参加条件（要点）',
    rows: [
      { label: '対象', value: ['日本を拠点に活動するアーティスト/バンド 1組'] },
      {
        label: '提供',
        value: [
          'ホテル4泊',
          '食事手当4日分',
          '必要な機材レンタル',
          '空港送迎・現地移動',
          '招待状の発行（助成金申請などに利用可）',
        ],
      },
      { label: '自己負担', value: ['日本〜アメリカ間の渡航費（航空券）'] },
    ],
    periodLabel: '応募期間',
    periodValue: '2026年8月14日〜10月15日',
    resultNote: '選抜結果は主催者から直接連絡されます。',

    officialTitle: '公式情報の確認',
    officialBody: '応募前に、必ずMBT公式Instagramの募集投稿で最新の条件をご確認ください。',
    officialLink: 'MBT公式Instagramの募集投稿を見る',

    ctaNote: 'フォームは日英併記です',
    cta: '応募フォームへ進む',

    role: 'OTONAMIは本公募の告知に協力しています。応募の受付・選考は主催者が行います。',
    back: '← OTONAMIトップへ',
  },
  en: {
    eyebrow: 'OPEN CALL',
    h1: 'Music Bridge Tokyo presents: Savannah Showcase 2027 — Open Call for One Japan-Based Artist',
    sub: 'April 16–18 or April 23–25, 2027 — Savannah, Georgia, USA (the exact weekend is still being finalized)',
    closed: 'This open call has closed.',

    aboutTitle: 'About Music Bridge Tokyo',
    aboutBody: [
      'Music Bridge Tokyo (MBT) is an international showcase and conference connecting independent artists from Japan and abroad. In Tokyo, it has been held as a two-day event across multiple live venues, putting overseas and Japanese artists on the same stages. In 2027, MBT heads to Savannah, Georgia (USA), where one Japan-based artist will be invited to perform.',
      'Apryl Peredo (Inter Idoru), a curator registered on OTONAMI, is involved in this project.',
    ],

    detailsTitle: 'What is provided and who can apply',
    rows: [
      { label: 'Eligibility', value: ['One artist or band based in Japan'] },
      {
        label: 'Provided',
        value: [
          '4 nights of hotel accommodation',
          'Meal stipend for 4 days',
          'Rental of the equipment you need',
          'Airport pickup and local transportation',
          'An official invitation letter (usable for grant applications)',
        ],
      },
      {
        label: 'At your own expense',
        value: ["Airfare between Japan and the US is at the artist's own expense."],
      },
    ],
    periodLabel: 'Application period',
    periodValue: 'August 14 – October 15, 2026',
    resultNote: 'Selection results are communicated directly by the organizers.',

    officialTitle: 'Check the official announcement',
    officialBody:
      "Before applying, please check the official announcement on MBT's Instagram for the latest conditions.",
    officialLink: "View the open call post on MBT's Instagram",

    ctaNote: 'The form is bilingual (JP/EN).',
    cta: 'Go to Application Form',

    role: 'OTONAMI is helping spread the word about this open call. Applications and selection are handled by the organizers.',
    back: '← Back to OTONAMI',
  },
};
