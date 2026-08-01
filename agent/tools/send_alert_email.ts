import { defineTool } from "eve/tools";
import { z } from "zod";
import { sendAlertEmail } from "../lib/email";

export default defineTool({
  description:
    "Email the operator a briefing about under-activated accounts and a suggested " +
    "booking ask. Sends to ALERT_EMAIL (or an override). Does NOT email the customer.",
  inputSchema: z.object({
    subject: z
      .string()
      .min(3)
      .max(180)
      .describe("Email subject, e.g. '3 enterprise accounts need a workshop'."),
    markdownBody: z
      .string()
      .min(20)
      .describe(
        "Markdown briefing: accounts, plan, last workshop, usage, angle, booking ask.",
      ),
    to: z
      .string()
      .email()
      .optional()
      .describe("Optional override recipient. Defaults to ALERT_EMAIL."),
  }),
  async execute(input) {
    const result = await sendAlertEmail(input);
    return { sent: true as const, ...result };
  },
});
