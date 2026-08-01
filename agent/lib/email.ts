import { Resend } from "resend";
import {
  renderBriefingHtml,
  renderBriefingText,
  type BriefingEmailContent,
} from "./email-template";

export interface AlertEmailInput {
  subject: string;
  briefing: BriefingEmailContent;
  to?: string;
}

export async function sendAlertEmail(input: AlertEmailInput): Promise<{
  id: string;
  to: string;
  subject: string;
  accountCount: number;
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
  if (!input.briefing.accounts.length) {
    throw new Error("briefing.accounts must include at least one account");
  }

  const booking = process.env.BOOKING_LINK?.trim();
  const text = renderBriefingText(input.briefing, booking);
  const html = renderBriefingHtml(input.briefing, booking);

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: input.subject,
    text,
    html,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Resend failed to send email");
  }

  return {
    id: data.id,
    to,
    subject: input.subject,
    accountCount: input.briefing.accounts.length,
  };
}
