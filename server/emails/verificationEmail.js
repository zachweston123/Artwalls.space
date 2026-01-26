export function buildVerificationEmail({ verifyUrl, email, name, role, supportEmail }) {
  const safeUrl = String(verifyUrl || '').trim();
  if (!safeUrl) throw new Error('Verification URL is required');

  const displayName = (name && String(name).trim()) || 'there';
  const accountRole = role === 'venue' ? 'venue' : 'artist';
  const contactEmail = supportEmail || 'support@artwalls.space';

  const subject = 'Confirm your Artwalls email';
  const preview = 'Finish setting up your Artwalls account and start exploring new walls.';

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f1ea;color:#1a1a18;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
    <div style="display:none;font-size:1px;color:#f4f1ea;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preview}</div>
    <table role="presentation" width="100%" border="0" cellPadding="0" cellSpacing="0" style="background-color:#f4f1ea;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" width="100%" border="0" cellPadding="0" cellSpacing="0" style="max-width:640px;border-radius:28px;overflow:hidden;background-color:#ffffff;border:1px solid #e0ddd6;box-shadow:0 24px 60px rgba(24,26,32,0.14);">
            <tr>
              <td style="position:relative;padding:48px 40px;background:linear-gradient(145deg, rgba(37,99,235,0.88), rgba(16,185,129,0.82));color:#f8fafc;">
                <div style="position:absolute;top:-120px;right:-110px;width:320px;height:320px;background:radial-gradient(circle at 30% 30%, rgba(248,250,252,0.25), transparent 58%);filter:blur(0px);"></div>
                <div style="position:absolute;bottom:-140px;left:-100px;width:280px;height:280px;background:radial-gradient(circle at 70% 70%, rgba(251,191,36,0.16), transparent 60%);"></div>
                <table role="presentation" width="100%" style="position:relative;z-index:2;">
                  <tr>
                    <td style="font-size:20px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(248,250,252,0.88);">Artwalls</td>
                  </tr>
                  <tr>
                    <td style="padding-top:14px;font-size:34px;font-weight:600;line-height:1.25;color:#ffffff;">Confirm your email, ${displayName}</td>
                  </tr>
                  <tr>
                    <td style="padding-top:18px;font-size:17px;line-height:1.7;color:rgba(248,250,252,0.9);">You are moments away from showcasing local art. Confirm your email so we can finish setting up your ${accountRole} space on Artwalls.</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:48px 40px 36px 40px;background-color:#ffffff;">
                <table role="presentation" width="100%" border="0" cellPadding="0" cellSpacing="0" style="background-color:#fdfcf9;border-radius:20px;padding:32px;border:1px solid #ece7de;">
                  <tr>
                    <td style="font-size:16px;line-height:1.7;color:#1f2a37;">Hi ${displayName},</td>
                  </tr>
                  <tr>
                    <td style="padding-top:12px;font-size:16px;line-height:1.7;color:#1f2a37;">Tap the button below within the next 24 hours to verify your email. This keeps your account secure and unlocks access to venues, artwork submissions, and scheduling tools.</td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:32px;padding-bottom:16px;">
                      <a href="${safeUrl}" style="display:inline-block;padding:16px 38px;border-radius:999px;background:linear-gradient(135deg,#2563eb,#4338ca);color:#ffffff;font-size:18px;font-weight:600;text-decoration:none;box-shadow:0 18px 35px rgba(67,56,202,0.28);">Verify email</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;line-height:1.6;color:#64758b;text-align:center;">Button not working? Copy and paste this link into your browser:</td>
                  </tr>
                  <tr>
                    <td style="padding-top:6px;word-break:break-all;font-size:13px;color:#2563eb;text-align:center;"><a href="${safeUrl}" style="color:#2563eb;text-decoration:none;">${safeUrl}</a></td>
                  </tr>
                </table>

                <table role="presentation" width="100%" border="0" cellPadding="0" cellSpacing="0" style="margin-top:36px;">
                  <tr>
                    <td style="font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;color:#64758b;padding-bottom:18px;">What happens next</td>
                  </tr>
                  <tr>
                    <td>
                      <table role="presentation" width="100%" border="0" cellPadding="0" cellSpacing="0">
                        <tr>
                          <td style="vertical-align:top;width:32px;">
                            <div style="width:32px;height:32px;border-radius:999px;background-color:rgba(37,99,235,0.12);color:#2563eb;font-size:16px;font-weight:600;line-height:32px;text-align:center;">1</div>
                          </td>
                          <td style="padding-left:18px;padding-bottom:20px;font-size:15px;line-height:1.6;color:#1f2a37;border-left:2px solid #e3e8ef;">Confirm your email to activate your Artwalls dashboard and keep your account secure.</td>
                        </tr>
                        <tr>
                          <td style="vertical-align:top;width:32px;">
                            <div style="width:32px;height:32px;border-radius:999px;background-color:rgba(16,185,129,0.12);color:#0f766e;font-size:16px;font-weight:600;line-height:32px;text-align:center;">2</div>
                          </td>
                          <td style="padding-left:18px;padding-bottom:20px;font-size:15px;line-height:1.6;color:#1f2a37;border-left:2px solid #e3e8ef;">Complete your profile so venues or artists can get to know you at a glance.</td>
                        </tr>
                        <tr>
                          <td style="vertical-align:top;width:32px;">
                            <div style="width:32px;height:32px;border-radius:999px;background-color:rgba(79,70,229,0.12);color:#4338ca;font-size:16px;font-weight:600;line-height:32px;text-align:center;">3</div>
                          </td>
                          <td style="padding-left:18px;font-size:15px;line-height:1.6;color:#1f2a37;border-left:2px solid #e3e8ef;">Start booking walls, uploading artwork, and sharing new pieces with the Artwalls community.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" border="0" cellPadding="0" cellSpacing="0" style="margin-top:32px;background-color:#fbfaf6;border:1px solid #ede8de;border-radius:16px;padding:20px;">
                  <tr>
                    <td style="font-size:14px;line-height:1.6;color:#4b5565;">You are receiving this message because someone signed up for Artwalls using ${email}. If this was not you, you can safely ignore it and the link will expire.</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#101623;padding:26px 20px;color:rgba(248,250,252,0.72);font-size:13px;line-height:1.6;text-align:center;">
                Need help? Email <a href="mailto:${contactEmail}" style="color:#93c5fd;text-decoration:none;">${contactEmail}</a> or visit <a href="https://artwalls.space/support" style="color:#93c5fd;text-decoration:none;">artwalls.space/support</a>.<br />
                <span style="display:inline-block;margin-top:10px;color:rgba(148,163,184,0.7);font-size:12px;">&copy; ${new Date().getFullYear()} Artwalls. All rights reserved.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Confirm your Artwalls email\n\nHi ${displayName},\n\nYou are almost ready to explore Artwalls. Visit the link below within 24 hours to confirm your email and activate your ${accountRole} account.\n\nVerify email: ${safeUrl}\n\nAfter confirming you can:\n1. Secure your dashboard access.\n2. Complete your profile so the community knows who you are.\n3. Start discovering new wall opportunities and sharing artwork.\n\nIf you did not sign up with ${email}, you can ignore this message and the link will expire automatically.\n\nNeed help? Email ${contactEmail} or visit artwalls.space/support.\n\nArtwalls`;

  return { subject, html, text, preview };
}
