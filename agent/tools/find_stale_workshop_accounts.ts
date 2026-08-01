import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolveSnowflakeAuth } from "../lib/resolve-snowflake-auth";
import { findStaleWorkshopAccounts } from "../lib/snowflake";

export default defineTool({
  description:
    "Find active enterprise APAC (default) accounts in GTM.ANALYTICS.ACCOUNTS whose last " +
    "GTM/Salesforce activity is null or older than `minDays` (default 60). Optional " +
    "`ownerNames` filters OWNER_NAME (e.g. Ahmed, Gabriela). Auth via Vercel Connect Snowflake.",
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
    ownerNames: z
      .array(z.string().min(1))
      .optional()
      .describe(
        "Optional case-insensitive OWNER_NAME substrings (OR). Example: [\"Ahmed\", \"Gabriela\"].",
      ),
  }),
  async execute({ minDays, limit, geography, ownerNames }, ctx) {
    const auth = await resolveSnowflakeAuth(ctx);
    const result = await findStaleWorkshopAccounts({
      minDays,
      limit,
      geography,
      ownerNames,
      auth: auth ?? undefined,
    });
    return {
      source: result.source,
      geography,
      ownerNames: ownerNames ?? [],
      count: result.accounts.length,
      accounts: result.accounts,
    };
  },
});
