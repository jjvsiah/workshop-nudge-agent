import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolveSnowflakeAuth } from "../lib/resolve-snowflake-auth";
import { findStaleWorkshopAccounts } from "../lib/snowflake";

export default defineTool({
  description:
    "Find active enterprise APAC (default) accounts in GTM.ANALYTICS.ACCOUNTS whose last " +
    "GTM/Salesforce activity is null or older than `minDays` (default 60). Filters on " +
    "GEOGRAPHY / HIERARCHY_GEOGRAPHY. Uses LAST_ACTIVITY_BY_GO_TO_MARKET_AT with fallback " +
    "to LAST_ACTIVITY_ON. Auth via Vercel Connect Snowflake.",
  inputSchema: z.object({
    minDays: z
      .number()
      .int()
      .min(1)
      .max(730)
      .default(60)
      .describe("Minimum days since last workshop/meeting."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(25)
      .default(5)
      .describe("Max accounts to return."),
    geography: z
      .enum(["APAC", "AMER", "EMEA"])
      .default("APAC")
      .describe("Account geography filter. Default APAC."),
  }),
  async execute({ minDays, limit, geography }, ctx) {
    const auth = await resolveSnowflakeAuth(ctx);
    const result = await findStaleWorkshopAccounts({
      minDays,
      limit,
      geography,
      auth: auth ?? undefined,
    });
    return {
      source: result.source,
      geography,
      count: result.accounts.length,
      accounts: result.accounts,
    };
  },
});
