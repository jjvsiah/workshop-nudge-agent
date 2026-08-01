import { defineTool } from "eve/tools";
import { z } from "zod";
import { findStaleWorkshopAccounts } from "../lib/snowflake";

export default defineTool({
  description:
    "Find enterprise accounts that have not had a Vercel workshop/meeting/enablement " +
    "activity in at least `minDays` days (default 60). Uses Snowflake when configured, " +
    "otherwise returns local fixture accounts.",
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
  }),
  async execute({ minDays, limit }) {
    const result = await findStaleWorkshopAccounts({ minDays, limit });
    return {
      source: result.source,
      count: result.accounts.length,
      accounts: result.accounts,
    };
  },
});
