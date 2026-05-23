import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { escapeHtml } from '@/lib/html-escape';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = process.env.EMAIL_FROM || 'info@otonami.io';

// Pre-launch gate (server-side enforcement)
function isPreLaunchLocked() {
  const launchDate = process.env.NEXT_PUBLIC_LAUNCH_DATE;
  if (!launchDate) return false;
  const launch = new Date(launchDate);
  if (Number.isNaN(launch.getTime())) return false;
  return new Date() < launch;
}

// AI prompt forbids URLs in the pitch body, but models occasionally
// regress. Layer-B safety net: strip "Stream:/Spotify:/YouTube: <url>"
// lines and bare URL-only lines so the body never duplicates the CTA.
export function stripUrlsFromPitchBody(body) {
  if (!body) return body;
  return body
    .replace(/^(Stream|Listen|Spotify|YouTube|Apple Music|Apple|SoundCloud|Bandcamp|Instagram|X|Twitter|Website)(\s*\(.*?\))?\s*:\s*https?:\/\/\S+\s*$/gim, '')
    .replace(/^\s*https?:\/\/\S+\s*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function pitchEmailHtml({
  artistName,
  trackTitle,
  foundingNumber,
  curatorName,
  pitchBody,
  artistBio,
  artistSocials,
  artistEmail,
  respondUrl,
  trackingPixel = '',
}) {
  const safeArtistName = escapeHtml(artistName);
  const safeTrackTitle = escapeHtml(trackTitle);
  const safeCuratorName = escapeHtml(curatorName);
  const safeArtistBio = escapeHtml(artistBio);
  const safeArtistEmail = escapeHtml(artistEmail);

  const bodyParagraphs = (pitchBody || '')
    .split(/\n\n+/)
    .filter(p => p.trim())
    .map(p => `<p style="margin: 0 0 14px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');

  const foundingBadge = foundingNumber ? `
            <div style="display: inline-block; padding: 5px 12px; background-color: #f5e9d3; border-radius: 999px; margin-bottom: 20px;">
              <span style="color: #c4956a; font-size: 11px; vertical-align: middle;">◆</span>
              <span style="font-size: 12px; color: #6b4a1a; font-weight: 600; vertical-align: middle; margin-left: 4px;">Founding artist #${foundingNumber}</span>
            </div>` : '';

  const socialBtnStyle = "display: inline-block; padding: 8px 14px; background-color: #f9f7f2; border: 1px solid #e8e6e0; border-radius: 6px; text-decoration: none; font-size: 13px; color: #1a1612; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;";
  const socialCell = (url, label) => url
    ? `<td style="padding-right: 8px; padding-bottom: 8px;"><a href="${escapeHtml(url)}" style="${socialBtnStyle}">${label}</a></td>`
    : '';
  const socialCells = [
    socialCell(artistSocials?.spotify, 'Spotify'),
    socialCell(artistSocials?.youtube, 'YouTube'),
    socialCell(artistSocials?.instagram, 'Instagram'),
    socialCell(artistSocials?.x, 'X'),
  ].join('');
  const hasSocials = !!socialCells;
  const hasAboutSection = !!(safeArtistBio || hasSocials);

  const ctaButton = `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 4px 0 8px;">
              <tr>
                <td style="background-color: #FF6B4A; border-radius: 8px;">
                  <a href="${escapeHtml(respondUrl)}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
                    ▶ Listen &amp; respond
                  </a>
                </td>
              </tr>
            </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>A pitch from ${safeArtistName} via OTONAMI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0ede6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

<div style="display: none; max-height: 0; overflow: hidden;">
A new pitch from ${safeArtistName}${safeTrackTitle ? ` — &ldquo;${safeTrackTitle}&rdquo;` : ''}. Listen and respond on OTONAMI.
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f0ede6; padding: 24px 16px;">
  <tr>
    <td align="center">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e8e6e0;">

        <tr>
          <td style="padding: 16px 28px; border-bottom: 1px solid #e8e6e0;">
            <span style="color: #c4956a; font-size: 14px; vertical-align: middle;">◆</span>
            <span style="font-size: 12px; letter-spacing: 0.15em; color: #1a1612; font-weight: 600; vertical-align: middle; margin-left: 6px;">OTONAMI</span>
          </td>
        </tr>

        <tr>
          <td style="padding: 28px; background-color: #f9f7f2;">
            <p style="font-size: 11px; letter-spacing: 0.12em; color: #6b665d; margin: 0 0 8px; text-transform: uppercase;">A pitch from</p>
            <p style="font-size: 22px; font-weight: 600; color: #1a1612; margin: 0 0 6px; line-height: 1.3;">${safeArtistName}</p>
            ${safeTrackTitle ? `<p style="font-size: 15px; color: #4a4640; margin: 0 0 16px;">Track: &ldquo;${safeTrackTitle}&rdquo;</p>` : ''}
${foundingBadge}
${ctaButton}
            <p style="font-size: 12px; color: #6b665d; margin: 4px 0 0;">Stream the track and reply in one place.</p>
          </td>
        </tr>

        <tr>
          <td style="padding: 28px;">
            <p style="font-size: 11px; letter-spacing: 0.12em; color: #6b665d; margin: 0 0 14px; text-transform: uppercase;">The pitch</p>
            <p style="font-size: 15px; color: #1a1612; line-height: 1.7; margin: 0 0 12px;">Hi ${safeCuratorName || 'there'},</p>
            <div style="font-size: 15px; color: #1a1612; line-height: 1.7;">
              ${bodyParagraphs}
            </div>
            <p style="font-size: 14px; color: #6b665d; margin: 18px 0 0;">&mdash; ${safeArtistName}</p>
          </td>
        </tr>

        ${hasAboutSection ? `
        <tr><td style="padding: 0 28px;"><div style="height: 1px; background-color: #e8e6e0;"></div></td></tr>

        <tr>
          <td style="padding: 28px;">
            <p style="font-size: 11px; letter-spacing: 0.12em; color: #6b665d; margin: 0 0 14px; text-transform: uppercase;">About the artist</p>
            ${safeArtistBio ? `<p style="font-size: 14px; color: #4a4640; line-height: 1.7; margin: 0 0 20px;">${safeArtistBio.replace(/\n/g, '<br>')}</p>` : ''}
            ${hasSocials ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${socialCells}</tr></table>` : ''}
          </td>
        </tr>
        ` : ''}

        <tr><td style="padding: 0 28px;"><div style="height: 1px; background-color: #e8e6e0;"></div></td></tr>

        <tr>
          <td style="padding: 28px; background-color: #f9f7f2;">
            ${safeArtistEmail ? `<p style="font-size: 11px; letter-spacing: 0.12em; color: #6b665d; margin: 0 0 6px; text-transform: uppercase;">Reply directly</p>
            <p style="font-size: 14px; color: #1a1612; margin: 0 0 20px;">
              <a href="mailto:${safeArtistEmail}" style="color: #1a1612; text-decoration: underline;">${safeArtistEmail}</a>
            </p>` : ''}
${ctaButton}
          </td>
        </tr>

        <tr>
          <td style="padding: 16px 28px; border-top: 1px solid #e8e6e0; background-color: #fafaf7;">
            <p style="font-size: 11px; color: #6b665d; margin: 0; line-height: 1.5;">
              Sent via <a href="https://otonami.io" style="color: #c4956a; text-decoration: none; font-weight: 600;">OTONAMI</a> &middot; Connecting Japanese artists with the world
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>
${trackingPixel}
</body>
</html>`;
}

export async function POST(request) {
  try {
    const { type, pitchId, toEmail: _toEmail, toName, subject, pitchText, epk, artistName, artistEmail, curatorName, trackUrl } = await request.json();
    let toEmail = _toEmail;

    if (!toEmail || !type) {
      return NextResponse.json({ error: 'toEmail and type required' }, { status: 400 });
    }

    if (type === 'pitch' && isPreLaunchLocked()) {
      return NextResponse.json(
        { error: 'Pitch notifications are disabled until launch.' },
        { status: 403 }
      );
    }

    let emailSubject = subject;
    let htmlBody = '';

    switch (type) {
      case 'pitch': {
        // Single artists-table lookup: bio + socials + founding_number.
        // is_founding is no longer a filter — we want the bio/socials for
        // every pitching artist; founding_number is only rendered when set.
        let foundingNumber = null;
        let artistBio = null;
        const artistSocials = { spotify: null, youtube: null, instagram: null, x: null };
        if (artistEmail) {
          try {
            const db = getServiceSupabase();
            const { data: artistRow } = await db
              .from('artists')
              .select('bio, founding_number, is_founding, spotify_url, youtube_url, instagram_url, twitter_url')
              .eq('email', artistEmail.toLowerCase().trim())
              .maybeSingle();
            if (artistRow) {
              if (artistRow.is_founding) foundingNumber = artistRow.founding_number ?? null;
              artistBio = artistRow.bio?.trim() || null;
              artistSocials.spotify = artistRow.spotify_url || null;
              artistSocials.youtube = artistRow.youtube_url || null;
              artistSocials.instagram = artistRow.instagram_url || null;
              artistSocials.x = artistRow.twitter_url || null;
            }
          } catch (e) {
            console.warn('Artist lookup failed (non-fatal):', e?.message);
          }
        }

        // Track title from pitches.subject — distinct from the AI-generated
        // email Subject line. Falls back to null (template hides the row).
        let trackTitle = null;
        if (pitchId) {
          try {
            const db = getServiceSupabase();
            const { data: pitchRow } = await db
              .from('pitches')
              .select('subject')
              .eq('id', pitchId)
              .maybeSingle();
            trackTitle = pitchRow?.subject?.trim() || null;
          } catch (e) {
            console.warn('Pitch subject lookup failed (non-fatal):', e?.message);
          }
        }

        // Extract email Subject line from AI output if caller didn't provide one
        if (!emailSubject && pitchText) {
          const subMatch = pitchText.match(/^Subject:\s*(.+)/m);
          emailSubject = subMatch ? subMatch[1].trim() : `Music Pitch: ${artistName}`;
        }

        // Strip the "Subject: ..." prefix and any leading "Hi [Curator Name],"
        // line — the template renders its own greeting from curatorName.
        const rawBody = (pitchText || '')
          .replace(/^Subject:[^\n]*\n*/m, '')
          .replace(/^\s*Hi\s+\[?Curator Name\]?[^\n]*\n+/i, '')
          .replace(/^\s*Hi\s+[^,\n]+,\s*\n+/i, '')
          .trimStart();
        const cleanBody = stripUrlsFromPitchBody(rawBody);

        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim();
        const trackingPixel = pitchId
          ? `<img src="${appUrl}/api/track/open?pid=${pitchId}" width="1" height="1" alt="" style="display:none;border:0;"/>`
          : '';
        const respondUrl = pitchId
          ? `${appUrl}/curator/pitch/${pitchId}`
          : `${appUrl}/curator/dashboard`;

        // EPK from the request is intentionally not rendered as a separate
        // block — the redesigned About-the-artist section uses artists.bio
        // (richer and curator-facing) instead of the per-pitch AI EPK.
        void epk;
        void trackUrl;

        htmlBody = pitchEmailHtml({
          artistName,
          trackTitle,
          foundingNumber,
          curatorName,
          pitchBody: cleanBody,
          artistBio,
          artistSocials,
          artistEmail,
          respondUrl,
          trackingPixel,
        });
        break;
      }
      case 'reminder': {
        emailSubject = `Reminder: Pitch from ${artistName} awaiting your response`;
        htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Hi ${curatorName || toName},</p>
            <p>You have a pending pitch from <strong>${artistName}</strong> that's awaiting your feedback.</p>
            <p>Your response helps artists improve and ensures you continue receiving quality submissions.</p>
            <p><a href="https://otonami.io/curator/dashboard" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 8px;">Review Pitch</a></p>
            <p style="color: #94a3b8; font-size: 12px;">OTONAMI Team</p>
          </div>
        `;
        break;
      }
      case 'notification': {
        htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>${pitchText}</p>
            <p style="color: #94a3b8; font-size: 12px;">OTONAMI Team</p>
          </div>
        `;
        break;
      }
    }

    // ── Test mode: redirect all emails to developer ──
    const testMode = process.env.EMAIL_TEST_MODE === 'true';
    const safeEmail = process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com';
    if (testMode) {
      emailSubject = '[TEST] ' + emailSubject;
      htmlBody = '<div style="background:#fef3c7;padding:12px;border-radius:8px;margin-bottom:16px;font-size:13px;color:#92400e;">TEST MODE — Original recipient: <strong>' + toEmail + '</strong></div>' + htmlBody;
      toEmail = safeEmail;
    }

    // For pitch emails, route replies straight to the artist so curators can
    // respond to them directly. System emails (reminders, notifications) keep
    // info@otonami.io as the reply target.
    const replyTo = type === 'pitch' && artistEmail ? artistEmail : 'info@otonami.io';

    const { data, error } = await resend.emails.send({
      from: `OTONAMI <${FROM}>`,
      to: [toEmail],
      reply_to: replyTo,
      subject: emailSubject || 'OTONAMI Notification',
      html: htmlBody,
      headers: {
        'List-Unsubscribe': '<mailto:info@otonami.io?subject=unsubscribe>',
      },
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log to database
    const db = getServiceSupabase();
    await db.from('email_log').insert({
      pitch_id: pitchId || null,
      to_email: toEmail,
      subject: emailSubject,
      type,
      status: 'sent',
      resend_id: data?.id,
    });

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
