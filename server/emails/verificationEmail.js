export function buildVerificationEmail({ verifyUrl, email, name, role, supportEmail }) {
  const safeUrl = String(verifyUrl || '').trim();
  if (!safeUrl) throw new Error('Verification URL is required');

  const displayName = (name && String(name).trim()) || 'there';
  const accountRole = role === 'venue' ? 'venue' : 'artist';
  const contactEmail = supportEmail || 'support@artwalls.space';

  const subject = 'Confirm your Artwalls email';
  const preview = 'Verify your email to unlock your Artwalls account.';

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f5f5f3;color:#1a1a18;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
    <div style="display:none;font-size:1px;color:#f5f5f3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preview}</div>
    <table role="presentation" width="100%" border="0" cellPadding="0" cellSpacing="0" style="background-color:#f5f5f3;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" border="0" cellPadding="0" cellSpacing="0" style="max-width:600px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 18px 48px rgba(15,18,34,0.12);border:1px solid #e5e7eb;">
            <tr>
              <td style="background:radial-gradient(circle at 10% 10%, rgba(37,99,235,0.16), transparent 55%), radial-gradient(circle at 80% 0%, rgba(16,185,129,0.16), transparent 45%),#0f172a;padding:40px 32px;color:#f8fafc;">
                <table role="presentation" width="100%" border="0" cellPadding="0" cellSpacing="0">
                  <tr>
                    <td style="font-size:18px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#cbd5f5;">Artwalls</td>
                  </tr>
                  <tr>
                    <td style="padding-top:12px;font-size:28px;font-weight:600;line-height:1.3;color:#f8fafc;">Verify your email, ${displayName}</td>
                  </tr>
                  <tr>
                    <td style="padding-top:16px;font-size:16px;line-height:1.6;color:#e2e8f0;">Welcome to Artwalls &mdash; where local artists connect with inspiring venues. Confirm your email so we can finish setting up your ${accountRole} account.</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 32px 32px 32px;color:#1e293b;">
                <table role="presentation" width="100%" border="0" cellPadding="0" cellSpacing="0">
                  <tr>
                    <td style="font-size:16px;line-height:1.6;color:#1a1a18;">Hi ${displayName},</td>
                  </tr>
                  <tr>
                    <td style="padding-top:12px;font-size:16px;line-height:1.6;color:#1a1a18;">Thanks for joining Artwalls. Click the button below within the next 24 hours to confirm your email address and start exploring the opportunities waiting for you.</td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:28px;padding-bottom:12px;">
                      <a href="${safeUrl}" style="display:inline-block;padding:14px 32px;border-radius:999px;background-color:#2563eb;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">Verify email</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:8px;font-size:13px;line-height:1.6;color:#64748b;text-align:center;">Button not working? Copy and paste this link into your browser:</td>
                  </tr>
                  <tr>
                    <td style="padding-top:6px;word-break:break-all;font-size:13px;color:#2563eb;text-align:center;"><a href="${safeUrl}" style="color:#2563eb;text-decoration:none;">${safeUrl}</a></td>
                  </tr>
                  <tr>
                    <td style="padding-top:28px;border-top:1px solid #e2e8f0;font-size:14px;line-height:1.6;color:#475569;">What comes next?</td>
                  </tr>
                  <tr>
                    <td style="padding-top:12px;">
                      <table role="presentation" width="100%" border="0" cellPadding="0" cellSpacing="0">
                        <tr>
                          <td style="padding-bottom:16px;">
                            <div style="display:flex;">
                              <div style="min-width:40px;height:40px;border-radius:12px;background-color:rgba(37,99,235,0.12);color:#2563eb;font-weight:600;font-size:16px;line-height:40px;text-align:center;margin-right:12px;">1</div>
                              <div style="font-size:15px;line-height:1.6;color:#1a1a18;">Confirm your email to activate your secure Artwalls account.</div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom:16px;">
                            <div style="display:flex;">
                              <div style="min-width:40px;height:40px;border-radius:12px;background-color:rgba(16,185,129,0.12);color:#0f766e;font-weight:600;font-size:16px;line-height:40px;text-align:center;margin-right:12px;">2</div>
                              <div style="font-size:15px;line-height:1.6;color:#1a1a18;">Complete your profile so venues and artists know who you are.</div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <div style="display:flex;">
                              <div style="min-width:40px;height:40px;border-radius:12px;background-color:rgba(79,70,229,0.12);color:#4338ca;font-weight:600;font-size:16px;line-height:40px;text-align:center;margin-right:12px;">3</div>
                              <div style="font-size:15px;line-height:1.6;color:#1a1a18;">Start discovering new walls to show art or curating fresh local talent.</div>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:28px;font-size:15px;line-height:1.6;color:#1a1a18;">You are receiving this email because you signed up for an Artwalls account with ${email}. If this was not you, ignore this message and the link will expire automatically.</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#0f172a;padding:24px 32px;color:#94a3b8;font-size:13px;line-height:1.6;text-align:center;">
                Need help? Email us at <a href="mailto:${contactEmail}" style="color:#bfdbfe;text-decoration:none;">${contactEmail}</a>.
                <div style="padding-top:12px;color:#475569;font-size:12px;">&copy; ${new Date().getFullYear()} Artwalls. All rights reserved.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Confirm your Artwalls email\n\nHi ${displayName},\n\nThanks for joining Artwalls. Visit the link below within 24 hours to confirm your email and activate your ${accountRole} account.\n\nVerify email: ${safeUrl}\n\nYou received this message because an Artwalls account was created with ${email}. If this was not you, ignore this email and the link will expire on its own.\n\nNeed help? Email ${contactEmail}.\n\nArtwalls`;

  return { subject, html, text, preview };
}
