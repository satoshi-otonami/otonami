import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

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
        // Extract subject from pitch text if not provided
        if (!emailSubject && pitchText) {
          const subMatch = pitchText.match(/^Subject:\s*(.+)/m);
          emailSubject = subMatch ? subMatch[1].trim() : `Music Pitch: ${artistName}`;
        }
        // Strip the "Subject: ..." line, then wrap each non-empty line in a <p> tag
        const bodyText = pitchText
          .replace(/^Subject:[^\n]*\n*/m, '') // Remove subject line
          .trimStart();
        const pitchBody = bodyText
          .split('\n')
          .filter(line => line.trim())
          .map(line => `<p style="margin:0 0 12px 0;line-height:1.6;color:#334155;">${line}</p>`)
          .join('');

        // Email-safe track block: no iframes — thumbnail image (YouTube) or button (Spotify)
        const trackBlock = (() => {
          if (!trackUrl) return '';
          const ytMatch = trackUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
          if (ytMatch) {
            const vid = ytMatch[1];
            return `
              <div style="margin:16px 0;">
                <a href="${trackUrl}" style="display:block;text-decoration:none;">
                  <img src="https://img.youtube.com/vi/${vid}/mqdefault.jpg" alt="Watch on YouTube" width="320" height="180" style="border-radius:12px;display:block;max-width:100%;"/>
                  <span style="display:inline-block;margin-top:8px;color:#0ea5e9;font-size:14px;font-weight:600;">▶ Watch on YouTube</span>
                </a>
              </div>`;
          }
          const spMatch = trackUrl.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
          if (spMatch) {
            return `
              <div style="margin:16px 0;">
                <a href="${trackUrl}" style="display:inline-block;background:#1DB954;color:#fff;padding:10px 22px;border-radius:20px;text-decoration:none;font-size:14px;font-weight:700;">
                  ▶ Listen on Spotify
                </a>
              </div>`;
          }
          return `<p style="margin:8px 0;"><a href="${trackUrl}" style="color:#0ea5e9;font-size:14px;">▶ Listen to Track</a></p>`;
        })();

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.vercel.app';
        const trackingPixel = pitchId
          ? `<img src="${appUrl}/api/track/open?pid=${pitchId}" width="1" height="1" alt="" style="display:none;border:0;"/>`
          : '';
        // Use direct pitch link if UUID available, otherwise fallback to dashboard
        const respondUrl = pitchId
          ? `${appUrl}/curator/pitch/${pitchId}`
          : `${appUrl}/curator/dashboard`;

        const replyLine = artistEmail
          ? `<div style="margin-top:16px;padding:12px 16px;background:#f8fafc;border-left:3px solid #7c3aed;border-radius:6px;font-size:13px;color:#475569;">
              💬 Reply directly to ${artistName || 'the artist'}: <a href="mailto:${artistEmail}" style="color:#7c3aed;font-weight:600;text-decoration:none;">${artistEmail}</a>
            </div>`
          : '';

        htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
            ${pitchBody}
            ${trackBlock}
            ${replyLine}
            ${epk ? `
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; font-size: 14px;">
                <strong style="color: #7c3aed;">📄 Electronic Press Kit</strong><br><br>
                ${epk.replace(/\n/g, '<br>')}
              </div>
            ` : ''}
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              Sent via <a href="https://otonami.io" style="color: #7c3aed; text-decoration: none;">OTONAMI</a> — Connecting Japanese Artists with the World
              <br>
              <a href="${respondUrl}" style="display:inline-block;margin-top:8px;padding:10px 22px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">📩 Respond to this pitch</a>
            </div>
            ${trackingPixel}
          </div>
        `;
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
      htmlBody = '<div style="background:#fef3c7;padding:12px;border-radius:8px;margin-bottom:16px;font-size:13px;color:#92400e;">⚠️ TEST MODE — Original recipient: <strong>' + toEmail + '</strong></div>' + htmlBody;
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
