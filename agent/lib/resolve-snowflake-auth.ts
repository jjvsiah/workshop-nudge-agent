import type { ToolContext } from "eve/tools";
import type { SnowflakeAuth } from "./snowflake";
import { passwordConfigured, useFixtures } from "./snowflake";
import { snowflakeAppAuth, snowflakeAuth } from "./snowflake-connect";

function envValue(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  // vercel env pull sometimes wraps values in quotes
  return raw.replace(/^['"]|['"]$/g, "").trim() || undefined;
}

/**
 * Prefer user OAuth for interactive sessions. Only use app tokens for
 * unattended runs (schedules) when explicitly configured — Snowflake Partner
 * Connect often cannot mint app tokens ("Token unresolved").
 */
function useAppConnectPrincipal(ctx: ToolContext): boolean {
  const principalType = ctx.session.auth.current?.principalType;
  if (principalType === "user") return false;

  const forced = envValue("SNOWFLAKE_CONNECT_PRINCIPAL")?.toLowerCase();
  if (forced === "user") return false;
  // Only honor forced app when there is no interactive user principal.
  if (forced === "app" && principalType !== "user") return true;

  // Default interactive / unknown → user OAuth (consent flow).
  return false;
}

/**
 * Resolve Snowflake credentials for a tool call.
 * Default: Vercel Connect user OAuth (`snowflake/account-intel`).
 * Set SNOWFLAKE_CONNECT_PRINCIPAL=app only for unattended cron (if supported).
 * Set SNOWFLAKE_AUTH_MODE=password for service-user fallback.
 * Set SNOWFLAKE_USE_FIXTURES=1 for demo data.
 */
export async function resolveSnowflakeAuth(
  ctx: ToolContext,
): Promise<SnowflakeAuth | null> {
  if (useFixtures()) return null;

  if (envValue("SNOWFLAKE_AUTH_MODE")?.toLowerCase() === "password") {
    if (!passwordConfigured()) {
      throw new Error(
        "SNOWFLAKE_AUTH_MODE=password but SNOWFLAKE_USERNAME/PASSWORD/WAREHOUSE/DATABASE are incomplete.",
      );
    }
    return { mode: "password" };
  }

  const useApp = useAppConnectPrincipal(ctx);
  const provider = useApp ? snowflakeAppAuth : snowflakeAuth;
  try {
    const { token } = await ctx.getToken(provider);
    return { mode: "oauth", token };
  } catch (err) {
    // If app token fails (common for Snowflake Connect), fall back to user OAuth.
    if (useApp) {
      const { token } = await ctx.getToken(snowflakeAuth);
      return { mode: "oauth", token };
    }
    throw err;
  }
}
