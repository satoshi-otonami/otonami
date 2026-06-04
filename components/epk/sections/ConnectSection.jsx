// EPK Connect — social links (from artist) + contact blocks (from EPK).
// lang-aware: heading, description, contact roles, and "Official Site" toggle;
// brand names (Spotify/YouTube/Instagram/X/Facebook) stay as-is.
import { externalHref } from '@/lib/url';

export default function ConnectSection({ artist, epk, lang = 'en', num = '03' }) {
  const a = artist || {};
  const e = epk || {};
  const t = (en, jp) => (lang === 'en' ? en : jp);

  const links = [
    { url: a.website_url, label: t('Official Site', '公式サイト') },
    { url: a.spotify_url, label: 'Spotify' },
    { url: a.youtube_url, label: 'YouTube' },
    { url: a.instagram_url, label: 'Instagram' },
    { url: a.twitter_url, label: 'X / Twitter' },
    { url: a.facebook_url, label: 'Facebook' },
  ].filter((l) => l.url);

  const contacts = [
    e.contact_management_email && {
      role: t('Management', 'マネジメント'),
      name: e.contact_management_name,
      email: e.contact_management_email,
    },
    e.contact_sync_email && {
      role: t('Sync / Licensing', 'シンク / ライセンス'),
      name: e.contact_sync_name,
      email: e.contact_sync_email,
    },
    e.contact_press_email && {
      role: t('Press Inquiries', 'プレスお問い合わせ'),
      name: 'OTONAMI Press Desk',
      email: e.contact_press_email,
    },
  ].filter(Boolean);

  return (
    <section className="connect" id="connect">
      <div className="section-label" data-no={num}>
        Connect
      </div>
      <div className="connect-grid">
        <div>
          <h2 className="connect-h">
            {lang === 'en' ? (
              <>
                Get in <em>touch.</em>
              </>
            ) : (
              <em>お問い合わせ</em>
            )}
          </h2>
          <p className="connect-desc">
            {t(
              'For licensing, sync, press inquiries, and curator partnerships, please reach the team directly.',
              'ライセンス、シンク、プレス、キュレーター連携のご相談は、直接チームまでご連絡ください。'
            )}
          </p>
          {links.length > 0 && (
            <div className="connect-buttons">
              {links.map((l, i) => (
                <a
                  key={i}
                  className="connect-button"
                  href={externalHref(l.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
        {contacts.length > 0 && (
          <div className="connect-contacts">
            {contacts.map((c, i) => (
              <div className="contact-block" key={i}>
                <div className="contact-role">{c.role}</div>
                {c.name && <div className="contact-name">{c.name}</div>}
                <a className="contact-email" href={`mailto:${c.email}`}>
                  {c.email}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
