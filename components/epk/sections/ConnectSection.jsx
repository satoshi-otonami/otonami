// EPK Connect — social links (from artist) + contact blocks (from EPK).
export default function ConnectSection({ artist, epk, num = '03' }) {
  const a = artist || {};
  const e = epk || {};

  const links = [
    { url: a.website_url, label: 'Official Site' },
    { url: a.spotify_url, label: 'Spotify' },
    { url: a.youtube_url, label: 'YouTube' },
    { url: a.instagram_url, label: 'Instagram' },
    { url: a.twitter_url, label: 'X / Twitter' },
    { url: a.facebook_url, label: 'Facebook' },
  ].filter((l) => l.url);

  const contacts = [
    e.contact_management_email && {
      role: 'Management',
      name: e.contact_management_name,
      email: e.contact_management_email,
    },
    e.contact_sync_email && {
      role: 'Sync / Licensing',
      name: e.contact_sync_name,
      email: e.contact_sync_email,
    },
    e.contact_press_email && {
      role: 'Press Inquiries',
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
            Get in <em>touch.</em>
          </h2>
          <p className="connect-desc">
            For licensing, sync, press inquiries, and curator partnerships,
            please reach the team directly.
          </p>
          {links.length > 0 && (
            <div className="connect-buttons">
              {links.map((l, i) => (
                <a
                  key={i}
                  className="connect-button"
                  href={l.url}
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
