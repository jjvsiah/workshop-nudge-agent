import { Resend } from "resend";

export interface AlertEmailInput {
  subject: string;
  markdownBody: string;
  to?: string;
}

export async function sendAlertEmail(input: AlertEmailInput): Promise<{
  id: string;
  to: string;
  subject: string;
}> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = (input.to ?? process.env.ALERT_EMAIL)?.trim();
  const from =
    process.env.ALERT_FROM_EMAIL?.trim() ||
    "Workshop Nudge <onboarding@resend.dev>";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  if (!to) {
    throw new Error("ALERT_EMAIL is not set and no `to` override was provided");
  }

  const booking = process.env.BOOKING_LINK?.trim();
  const footer = booking
    ? `\n\n---\nBook time: ${booking}`
    : "\n\n---\nAdd BOOKING_LINK to include a scheduling URL.";

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: input.subject,
    text: `${input.markdownBody}${footer}`,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Resend failed to send email");
  }

  return { id: data.id, to, subject: input.subject };
}
