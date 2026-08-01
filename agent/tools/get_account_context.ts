import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolveSnowflakeAuth } from "../lib/resolve-snowflake-auth";
import { getAccountContext } from "../lib/snowflake";

export default defineTool({
  description:
    "Load plan, CRM notes, recent activities, and usage signals for one account. " +
    "Uses Vercel Connect Snowflake when linked. Call after find_stale_workshop_accounts.",
  inputSchema: z.object({
    accountId: z.string().min(1).describe("Account id from the stale-account list."),
  }),
  async execute({ accountId }, ctx) {
    const auth = await resolveSnowflakeAuth(ctx);
    const context = await getAccountContext(accountId, auth ?? undefined);
    if (!context) {
      return { found: false as const, accountId };
    }
    return { found: true as const, ...context };
  },
});
