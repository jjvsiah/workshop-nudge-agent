import type { ToolContext } from "eve/tools";
import type { SnowflakeAuth } from "./snowflake";
import { passwordConfigured, useFixtures } from "./snowflake";
import { snowflakeAppAuth, snowflakeAuth } from "./snowflake-connect";

function useAppConnectPrincipal(ctx: ToolContext): boolean {
  const forced = process.env.SNOWFLAKE_CONNECT_PRINCIPAL?.trim().toLowerCase();
  if (forced === "app") return true;
  if (forced === "user") return false;

  // Schedules and other unattended runs typically have no user principal.
  // Interactive TUI / web sessions with a user keep user-scoped OAuth.
  const principalType = ctx.session.auth.current?.principalType;
  return principalType !== "user";
}

/**
 * Resolve Snowflake credentials for a tool call.
 * Default: Vercel Connect OAuth (`snowflake/account-intel`).
 * Unattended/schedule runs automatically use app-scoped Connect tokens.
 * Set SNOWFLAKE_AUTH_MODE=password to use username/password env instead.
 * Set SNOWFLAKE_USE_FIXTURES=1 for demo data.
 */
export async function resolveSnowflakeAuth(
  ctx: ToolContext,
): Promise<SnowflakeAuth | null> {
  if (useFixtures()) return null;

  if (process.env.SNOWFLAKE_AUTH_MODE?.trim() === "password") {
    if (!passwordConfigured()) {
      throw new Error(
        "SNOWFLAKE_AUTH_MODE=password but SNOWFLAKE_USERNAME/PASSWORD/WAREHOUSE/DATABASE are incomplete.",
      );
    }
    return { mode: "password" };
  }

  const provider = useAppConnectPrincipal(ctx) ? snowflakeAppAuth : snowflakeAuth;
  const { token } = await ctx.getToken(provider);
  return { mode: "oauth", token };
}
