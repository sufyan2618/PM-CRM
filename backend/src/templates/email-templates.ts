type OtpPurpose = "verify_email" | "reset_password";

interface OtpTemplateInput {
  otp: string;
  purpose: OtpPurpose;
}

function getTemplateContent(purpose: OtpPurpose) {
  if (purpose === "verify_email") {
    return {
      title: "Verify your email",
      subtitle: "Welcome to Infinity. Enter this code to activate your account.",
      preview: "Your Infinity verification code expires in 10 minutes.",
    };
  }

  return {
    title: "Reset your password",
    subtitle: "We received a request to reset your Infinity password.",
    preview: "Your Infinity password reset code expires in 10 minutes.",
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderCodeDigits(otp: string) {
  return otp
    .split("")
    .map(
      (digit) => `
        <td style="padding:0 4px;">
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td align="center" valign="middle" width="42" height="52" bgcolor="#eef2ff" style="width:42px;height:52px;background-color:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:22px;line-height:52px;font-weight:700;color:#312e81;text-align:center;">
                ${escapeHtml(digit)}
              </td>
            </tr>
          </table>
        </td>
      `,
    )
    .join("");
}

export function buildOtpEmailTemplate(input: OtpTemplateInput) {
  const content = getTemplateContent(input.purpose);
  const title = escapeHtml(content.title);
  const subtitle = escapeHtml(content.subtitle);
  const preview = escapeHtml(content.preview);

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
        ${preview}
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f8fafc" style="background-color:#f8fafc;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
              <tr>
                <td height="6" bgcolor="#4f46e5" style="height:6px;background-color:#4f46e5;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding:32px 28px 8px 28px;">
                  <p style="margin:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:13px;line-height:1;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#4f46e5;">
                    Infinity
                  </p>
                  <h1 style="margin:16px 0 0 0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-0.03em;color:#0f172a;">
                    ${title}
                  </h1>
                  <p style="margin:10px 0 0 0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#64748b;">
                    ${subtitle}
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:28px 20px 8px 20px;">
                  <p style="margin:0 0 14px 0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12px;line-height:1;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;">
                    Your code
                  </p>
                  <table role="presentation" cellspacing="0" cellpadding="0" align="center">
                    <tr>
                      ${renderCodeDigits(input.otp)}
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 28px 8px 28px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f8fafc" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                    <tr>
                      <td style="padding:14px 16px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#475569;">
                        This code is valid for <strong style="color:#0f172a;">10 minutes</strong>. Please do not share it with anyone.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 28px 28px 28px;">
                  <p style="margin:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#94a3b8;">
                    If you did not request this, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0 0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8;">
              Infinity
            </p>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}
