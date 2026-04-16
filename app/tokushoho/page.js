import LegalPageLayout from '@/components/LegalPageLayout';

export const metadata = {
  title: '特定商取引法に基づく表記 | OTONAMI',
  description: 'OTONAMI（運営:TYCompany合同会社）の特定商取引法に基づく表記です。',
};

export default function TokushohoPage() {
  return (
    <LegalPageLayout
      title="特定商取引法に基づく表記"
      subtitle="本サービスは、特定商取引法第11条に基づく表記を以下のとおり記載いたします。"
      lastUpdated="2026年4月16日"
    >
      <table>
        <tbody>
          <tr>
            <th style={{ width: 180 }}>販売業者</th>
            <td>TYCompany合同会社</td>
          </tr>
          <tr>
            <th>運営統括責任者</th>
            <td>山下 智</td>
          </tr>
          <tr>
            <th>所在地</th>
            <td>請求があったら遅滞なく開示します</td>
          </tr>
          <tr>
            <th>電話番号</th>
            <td>請求があったら遅滞なく開示します</td>
          </tr>
          <tr>
            <th>メールアドレス</th>
            <td>info@otonami.io</td>
          </tr>
          <tr>
            <th>ホームページURL</th>
            <td>https://otonami.io</td>
          </tr>
          <tr>
            <th>販売価格</th>
            <td>
              各サービス申込画面に表示される金額（消費税込み）
              <br /><br />
              ピッチクレジット：1クレジット ¥80（税込）〜
              <br />
              Tier 1（1クレジット）：¥80 / ピッチ
              <br />
              Tier 2（2クレジット）：¥160 / ピッチ
              <br />
              Tier 3（3クレジット）：¥240 / ピッチ
              <br />
              Tier 4（4クレジット）：¥320 / ピッチ
              <br />
              Tier 5（5クレジット）：¥400 / ピッチ
            </td>
          </tr>
          <tr>
            <th>商品代金以外の必要料金</th>
            <td>
              ・消費税（販売価格に含む）
              <br />
              ・インターネット接続料金、通信料金等（お客様のご負担）
            </td>
          </tr>
          <tr>
            <th>お支払い方法</th>
            <td>
              クレジットカード決済（Stripe）
              <br />
              対応ブランド：Visa / Mastercard / American Express / JCB / Diners Club / Discover
            </td>
          </tr>
          <tr>
            <th>お支払い時期</th>
            <td>クレジット購入時に即時決済されます。</td>
          </tr>
          <tr>
            <th>サービスの提供時期</th>
            <td>
              クレジット：決済完了後、即時アカウントに付与されます。
              <br />
              ピッチサービス：キュレーターへの送信は即時。フィードバックは最長7日以内にキュレーターから返信されます。
            </td>
          </tr>
          <tr>
            <th>返品・キャンセルについて</th>
            <td>
              <strong>デジタルコンテンツの性質上、購入済みクレジットの返金には原則応じられません。</strong>
              <br /><br />
              ただし以下の場合は例外的に対応いたします：
              <br />
              ・ピッチ送信後、7日以内にキュレーターから回答がなかった場合：該当ピッチに使用したクレジットを自動的に返還します。
              <br />
              ・システム不具合により当社の責に帰すべき事由でサービスをご利用いただけなかった場合：個別に対応いたします。info@otonami.io までご連絡ください。
            </td>
          </tr>
          <tr>
            <th>動作環境</th>
            <td>
              ・推奨ブラウザ：Google Chrome、Safari、Firefox、Microsoft Edge の各最新版
              <br />
              ・JavaScript および Cookie を有効にしてご利用ください。
              <br />
              ・モバイル端末からもご利用いただけます。
            </td>
          </tr>
        </tbody>
      </table>
    </LegalPageLayout>
  );
}
