import { defineTool } from "eve/tools";
import { z } from "zod";
import { getAccountContext } from "../lib/snowflake";

export default defineTool({
  description:
    "Load plan, CRM notes, recent activities, and usage signals for one account. " +
    "Use after find_stale_workshop_accounts to understand what they use Vercel for.",
  inputSchema: z.object({
    accountId: z.string().min(1).describe("Account id from the stale-account list."),
  }),
  async execute({ accountId }) {
    const context = await getAccountContext(accountId);
    if (!context) {
      return { found: false as const, accountId };
    }
    return { found: true as const, ...context };
  },
});
