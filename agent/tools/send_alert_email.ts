import { defineTool } from "eve/tools";
import { z } from "zod";
import { sendAlertEmail } from "../lib/email";

const accountSchema = z.object({
  accountName: z.string().min(1),
  plan: z.string().min(1),
  arrUsd: z.number().nullable().optional(),
  geography: z.string().nullable().optional(),
  regionName: z.string().nullable().optional(),
  daysSinceActivity: z.number().int().nullable().optional(),
  lastActivityAt: z.string().nullable().optional(),
  ownerName: z.string().nullable().optional(),
  csmName: z.string().nullable().optional(),
  salesEngineerName: z.string().nullable().optional(),
  accountLink: z.string().nullable().optional(),
  usageSummary: z
    .string()
    .min(1)
    .describe("1-2 sentences on what they use Vercel for, from notes/usage."),
  activationGap: z
    .string()
    .min(1)
    .describe("Specific underuse / expansion opportunity."),
  suggestedSession: z
    .string()
    .min(1)
    .describe("Workshop topic + length, e.g. '45-min AI SDK enablement'."),
  draftAsk: z
    .string()
    .min(1)
    .describe("One sentence the operator can send to the customer."),
});

export default defineTool({
  description:
    "Email the operator a Gmail-friendly HTML briefing (plus plain-text fallback). " +
    "Pass structured account fields — do NOT pass markdown. Sends to ALERT_EMAIL. " +
    "Does NOT email the customer.",
  inputSchema: z.object({
    subject: z
      .string()
      .min(3)
      .max(180)
      .describe('Email subject, e.g. "APAC workshop candidates (3)".'),
    headline: z
      .string()
      .min(3)
      .max(120)
      .describe('Email hero title, e.g. "APAC workshop candidates (3)".'),
    intro: z
      .string()
      .max(400)
      .optional()
      .describe("One short plain sentence under the headline."),
    accounts: z
      .array(accountSchema)
      .min(1)
      .max(25)
      .describe("Structured account cards rendered into the HTML email template."),
    to: z
      .string()
      .email()
      .optional()
      .describe("Optional override recipient. Defaults to ALERT_EMAIL."),
  }),
  async execute({ subject, headline, intro, accounts, to }) {
    const result = await sendAlertEmail({
      subject,
      to,
      briefing: { headline, intro, accounts },
    });
    return { sent: true as const, ...result };
  },
});
