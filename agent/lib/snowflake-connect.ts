import { connect } from "@vercel/connect/eve";

/** Connector UID from Vercel Connect (account-intel-snowflake). */
export const SNOWFLAKE_CONNECTOR_UID = "snowflake/account-intel";

/**
 * Default session role from the connector settings. Overridable via
 * SNOWFLAKE_ROLE — Connect passes this as the token scope.
 */
export function snowflakeRole(): string {
  return process.env.SNOWFLAKE_ROLE?.trim() || "REPORTER";
}

/**
 * User-scoped Snowflake auth for interactive sessions. Eve parks for
 * browser consent on first use. Set autoProvision false because the
 * connector is already attached in the Internal Playground dashboard.
 */
export const snowflakeAuth = connect({
  connector: SNOWFLAKE_CONNECTOR_UID,
  displayName: "Snowflake",
  autoProvision: false,
  tokenParams: {
    scopes: [snowflakeRole()],
  },
});

/**
 * App-scoped auth for unattended schedules. Only works if the Snowflake
 * connector can issue app tokens; otherwise keep using interactive runs
 * or set SNOWFLAKE_PASSWORD as a fallback.
 */
export const snowflakeAppAuth = connect({
  connector: SNOWFLAKE_CONNECTOR_UID,
  principalType: "app",
  displayName: "Snowflake",
  autoProvision: false,
  tokenParams: {
    scopes: [snowflakeRole()],
  },
});
