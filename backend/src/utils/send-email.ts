import { env } from "../config/env";
import { buildOtpEmailTemplate } from "../templates/email-templates";
import { HttpError } from "./errors";

interface SendOtpEmailInput {
  to: string;
  subject: string;
  otp: string;
  purpose: "verify_email" | "reset_password";
}

export async function sendOtpEmail(input: SendOtpEmailInput) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { email: env.EMAIL_FROM },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: buildOtpEmailTemplate({
        otp: input.otp,
        purpose: input.purpose,
      }),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new HttpError(500, `Failed to send email: ${body}`);
  }
}
