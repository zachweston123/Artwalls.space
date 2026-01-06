import nodemailer from 'nodemailer';

let transporter = null;

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
  try {
    const t = getTransporter();
    if (!t) return { ok: false, skipped: true, reason: 'SMTP not configured' };
    const from = process.env.FROM_EMAIL || 'no-reply@artwalls.space';
    await t.sendMail({
      from,
      to,
      subject,
      text,
      attachments: ics
        ? [{ filename: icsFilename || 'event.ics', content: ics, contentType: 'text/calendar; charset=utf-8' }]
        : [],
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}
