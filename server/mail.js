import nodemailer from 'nodemailer';

let transporter = null;
const defaultFrom = process.env.FROM_EMAIL || 'no-reply@artwalls.space';

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendIcsEmail({ to, subject, text, ics, icsFilename }) {
  return sendEmail({
    to,
    subject,
    text,
    attachments: ics
      ? [{ filename: icsFilename || 'event.ics', content: ics, contentType: 'text/calendar; charset=utf-8' }]
      : [],
  });
}

export async function sendEmail({ to, subject, text, html, attachments, headers }) {
  try {
    const t = getTransporter();
    if (!t) return { ok: false, skipped: true, reason: 'SMTP not configured' };
    await t.sendMail({
      from: defaultFrom,
      to,
      subject,
      text,
      html,
      attachments: attachments || [],
      headers: headers || {},
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}
