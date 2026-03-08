import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

export async function POST(request) {
  try {
    const { type, pitchId, toEmail, toName, subject, pitchText, epk, artistName, curatorName } = await request.json();

    if (!toEmail || !type) {
      return NextResponse.json({ error: 'toEmail and type required' }, { status: 400 });
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
        // Convert pitch text to HTML (preserve line breaks, add styling)
        const pitchBody = pitchText
          .replace(/^Subject:.*\n\n?/m, '') // Remove subject line from body
          .replace(/\n/g, '<br>');
        
        htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
            ${pitchBody}
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
              <a href="https://otonami.io/curator/respond?pitch=${pitchId}" style="color: #7c3aed;">📩 Respond to this pitch</a>
            </div>
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
            <p><a href="https://otonami.io/curator/inbox" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 8px;">Review Pitch</a></p>
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
    const sendTo = testMode ? 'satoshiy339@gmail.com' : toEmail;
    const sendSubject = testMode ? `[TEST] ${emailSubject || 'OTONAMI Notification'}` : (emailSubject || 'OTONAMI Notification');
    if (testMode) {
      htmlBody = `<p style="background:#fef9c3;border:1px solid #fbbf24;padding:10px 14px;border-radius:6px;font-size:12px;color:#92400e;margin-bottom:16px;">⚠️ <strong>TEST MODE</strong> — Original recipient: ${toEmail}</p>` + htmlBody;
    }

    const { data, error } = await resend.emails.send({
      from: `OTONAMI <${FROM}>`,
      to: [sendTo],
      subject: sendSubject,
      html: htmlBody,
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
