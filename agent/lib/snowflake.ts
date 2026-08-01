import snowflake from "snowflake-sdk";
import {
  fixtureAccountContext,
  fixtureStaleAccounts,
} from "./fixtures";
import { snowflakeRole } from "./snowflake-connect";
import type {
  AccountActivity,
  AccountContext,
  AccountNote,
  StaleAccount,
  UsageSignal,
} from "./types";

snowflake.configure({ logLevel: "OFF" });

export type SnowflakeSource =
  | "snowflake-connect"
  | "snowflake-password"
  | "fixture";

export type SnowflakeAuth =
  | { mode: "oauth"; token: string }
  | { mode: "password" };

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** Force demo data even when Connect / password is available. */
export function useFixtures(): boolean {
  return process.env.SNOWFLAKE_USE_FIXTURES === "1";
}

export function passwordConfigured(): boolean {
  return Boolean(
    env("SNOWFLAKE_ACCOUNT") &&
      env("SNOWFLAKE_USERNAME") &&
      env("SNOWFLAKE_PASSWORD") &&
      env("SNOWFLAKE_WAREHOUSE") &&
      env("SNOWFLAKE_DATABASE"),
  );
}

function accountIdentifier(): string {
  return env("SNOWFLAKE_ACCOUNT") || "kzympaw-mozartvercel";
}

/** Fully-qualified or bare table name under SNOWFLAKE_DATABASE/SCHEMA. */
function accountsTable(): string {
  const raw = env("SF_ACCOUNTS_TABLE") ?? "ACCOUNTS";
  if (!/^[A-Za-z0-9_.$]+$/.test(raw)) {
    throw new Error("Invalid SF_ACCOUNTS_TABLE identifier");
  }
  if (raw.includes(".")) return raw;
  const database = env("SNOWFLAKE_DATABASE") || "GTM";
  const schema = env("SNOWFLAKE_SCHEMA") || "ANALYTICS";
  return `${database}.${schema}.${raw}`;
}

type Row = Record<string, unknown>;

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value).trim();
  return s.length ? s : null;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pick(row: Row, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in row && row[key] !== undefined) return row[key];
    const upper = key.toUpperCase();
    if (upper in row && row[upper] !== undefined) return row[upper];
    const lower = key.toLowerCase();
    if (lower in row && row[lower] !== undefined) return row[lower];
  }
  return undefined;
}

async function withConnection<T>(
  auth: SnowflakeAuth,
  run: (conn: snowflake.Connection) => Promise<T>,
): Promise<T> {
  const account = accountIdentifier();
  const warehouse = env("SNOWFLAKE_WAREHOUSE") || "REPORTING";
  const database = env("SNOWFLAKE_DATABASE") || "GTM";
  const schema = env("SNOWFLAKE_SCHEMA") || "ANALYTICS";
  const role = snowflakeRole();

  const connection =
    auth.mode === "oauth"
      ? snowflake.createConnection({
          account,
          authenticator: "OAUTH",
          token: auth.token,
          warehouse,
          database,
          schema,
          role,
        })
      : snowflake.createConnection({
          account,
          username: env("SNOWFLAKE_USERNAME")!,
          password: env("SNOWFLAKE_PASSWORD")!,
          warehouse,
          database,
          schema,
          role,
        });

  await new Promise<void>((resolve, reject) => {
    connection.connect((err) => (err ? reject(err) : resolve()));
  });

  try {
    return await run(connection);
  } finally {
    await new Promise<void>((resolve) => {
      connection.destroy(() => resolve());
    });
  }
}

function execute(
  connection: snowflake.Connection,
  sqlText: string,
  binds: snowflake.Binds = [],
): Promise<Row[]> {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete(err, _stmt, rows) {
        if (err) reject(err);
        else resolve((rows as Row[] | undefined) ?? []);
      },
    });
  });
}

function mapStaleAccount(row: Row): StaleAccount {
  const ownerName = asString(pick(row, "OWNER_NAME"));
  const csmName = asString(pick(row, "CUSTOMER_SUCCESS_MANAGER_NAME"));
  const seName = asString(pick(row, "SALES_ENGINEER_NAME"));
  const tcName = asString(pick(row, "TECHNICAL_CONSULTANT_NAME"));

  return {
    accountId: asString(pick(row, "SFDC_ACCOUNT_ID", "ACCOUNT_ID")) ?? "",
    accountName: asString(pick(row, "ACCOUNT_NAME")) ?? "Unknown",
    plan: asString(pick(row, "HIGHEST_BILLING_PLAN", "PLAN")) ?? "unknown",
    arrUsd: asNumber(pick(row, "ANNUAL_RECURRING_REVENUE", "ARR_USD")),
    lastWorkshopAt: asString(
      pick(row, "LAST_GTM_ACTIVITY_AT", "LAST_WORKSHOP_AT"),
    ),
    daysSinceWorkshop: asNumber(
      pick(row, "DAYS_SINCE_GTM_ACTIVITY", "DAYS_SINCE_WORKSHOP"),
    ),
    lifecycleStage: asString(pick(row, "ACCOUNT_LIFECYCLE_STAGE")),
    ownerName,
    csmName,
    salesEngineerName: seName,
    primaryContactName: csmName ?? seName ?? tcName ?? ownerName,
    primaryContactEmail: null,
    accountLink: asString(pick(row, "ACCOUNT_LINK")),
    geography: asString(pick(row, "GEOGRAPHY", "HIERARCHY_GEOGRAPHY")),
    regionName: asString(pick(row, "REGION_NAME")),
  };
}

function sourceFor(auth: SnowflakeAuth): SnowflakeSource {
  return auth.mode === "oauth" ? "snowflake-connect" : "snowflake-password";
}

function notesFromAccountRow(row: Row): AccountNote[] {
  const updatedAt = asString(pick(row, "UPDATED_AT")) ?? "";
  const candidates: Array<[string, string | null]> = [
    ["AE notes", asString(pick(row, "AE_NOTES"))],
    [
      "AE health sentiment notes",
      asString(pick(row, "ACCOUNT_EXECUTIVE_HEALTH_SENTIMENT_NOTES")),
    ],
    ["Bounty notes", asString(pick(row, "BOUNTY_NOTES"))],
    ["Industry reasoning", asString(pick(row, "INDUSTRY_REASONING"))],
    ["Bad-fit details", asString(pick(row, "BAD_FIT_DETAILS"))],
  ];
  return candidates
    .filter(([, body]) => body)
    .map(([author, body]) => ({
      noteAt: updatedAt,
      author,
      body: body!,
    }));
}

function activitiesFromAccountRow(row: Row): AccountActivity[] {
  const activities: AccountActivity[] = [];
  const gtmAt = asString(pick(row, "LAST_ACTIVITY_BY_GO_TO_MARKET_AT"));
  const lastAt = asString(pick(row, "LAST_ACTIVITY_ON"));
  const ownerAt = asString(pick(row, "LAST_ACTIVITY_BY_OWNER_ON"));

  if (gtmAt) {
    activities.push({
      activityAt: gtmAt,
      activityType: "gtm_activity",
      subject: "Last GTM team activity",
      description:
        "From LAST_ACTIVITY_BY_GO_TO_MARKET_AT (proxy until a workshop-specific table is wired).",
    });
  }
  if (lastAt) {
    activities.push({
      activityAt: lastAt,
      activityType: "account_activity",
      subject: "Last Salesforce activity",
      description: "From LAST_ACTIVITY_ON.",
    });
  }
  if (ownerAt) {
    activities.push({
      activityAt: ownerAt,
      activityType: "owner_activity",
      subject: "Last activity by account owner",
      description: "From LAST_ACTIVITY_BY_OWNER_ON.",
    });
  }
  return activities;
}

function usageFromAccountRow(row: Row): UsageSignal[] {
  const observedAt = asString(pick(row, "UPDATED_AT"));
  const pairs: Array<[string, unknown]> = [
    ["highest_billing_plan", pick(row, "HIGHEST_BILLING_PLAN")],
    ["lifecycle_stage", pick(row, "ACCOUNT_LIFECYCLE_STAGE")],
    ["platform_type", pick(row, "PLATFORM_TYPE")],
    ["current_software_framework", pick(row, "CURRENT_SOFTWARE_FRAMEWORK")],
    ["vray_frameworks", pick(row, "VRAY_FRAMEWORKS")],
    ["is_using_next_js", pick(row, "IS_USING_NEXT_JS")],
    ["avg_builds_30d", pick(row, "AVG_BUILDS_30D")],
    ["seat_utilization", pick(row, "SEAT_UTILIZATION")],
    ["teams_count", pick(row, "TEAMS_COUNT")],
    ["intent_score_v0", pick(row, "INTENT_SCORE_V0")],
    ["intent_score_infra", pick(row, "INTENT_SCORE_INFRA")],
    ["ae_health_sentiment", pick(row, "ACCOUNT_EXECUTIVE_HEALTH_SENTIMENT")],
    ["sales_play", pick(row, "SALES_PLAY_NAME")],
    ["segment", pick(row, "SEGMENT")],
  ];

  return pairs
    .map(([signal, value]) => {
      const text = asString(value);
      if (!text) return null;
      return { signal, value: text, observedAt };
    })
    .filter((x): x is UsageSignal => x !== null);
}

export async function findStaleWorkshopAccounts(options: {
  minDays: number;
  limit: number;
  geography?: string;
  auth?: SnowflakeAuth;
}): Promise<{ accounts: StaleAccount[]; source: SnowflakeSource }> {
  const geography = (options.geography ?? "APAC").trim().toUpperCase();

  if (useFixtures() || !options.auth) {
    return {
      accounts: fixtureStaleAccounts(options.minDays)
        .filter(
          (a) =>
            !geography ||
            (a.geography ?? "").toUpperCase() === geography ||
            (a.regionName ?? "").toUpperCase().includes(geography),
        )
        .slice(0, options.limit),
      source: "fixture",
    };
  }

  const table = accountsTable();

  // Workshop/meeting proxy: last GTM activity, else any SF activity.
  // Narrow to active enterprise customers in the requested geography (default APAC).
  const sql = `
    SELECT
      SFDC_ACCOUNT_ID,
      ACCOUNT_NAME,
      HIGHEST_BILLING_PLAN,
      ANNUAL_RECURRING_REVENUE,
      ACCOUNT_LIFECYCLE_STAGE,
      OWNER_NAME,
      CUSTOMER_SUCCESS_MANAGER_NAME,
      SALES_ENGINEER_NAME,
      TECHNICAL_CONSULTANT_NAME,
      ACCOUNT_LINK,
      GEOGRAPHY,
      HIERARCHY_GEOGRAPHY,
      REGION_NAME,
      COALESCE(LAST_ACTIVITY_BY_GO_TO_MARKET_AT, LAST_ACTIVITY_ON::TIMESTAMP_TZ) AS LAST_GTM_ACTIVITY_AT,
      DATEDIFF(
        'day',
        COALESCE(LAST_ACTIVITY_BY_GO_TO_MARKET_AT, LAST_ACTIVITY_ON::TIMESTAMP_TZ),
        CURRENT_TIMESTAMP()
      ) AS DAYS_SINCE_GTM_ACTIVITY
    FROM ${table}
    WHERE COALESCE(IS_ACTIVE_ENTERPRISE_CUSTOMER, FALSE) = TRUE
      AND COALESCE(IS_INTERNAL_TEST, FALSE) = FALSE
      AND (
        UPPER(COALESCE(GEOGRAPHY, '')) = ?
        OR UPPER(COALESCE(HIERARCHY_GEOGRAPHY, '')) = ?
      )
      AND (
        COALESCE(LAST_ACTIVITY_BY_GO_TO_MARKET_AT, LAST_ACTIVITY_ON::TIMESTAMP_TZ) IS NULL
        OR DATEDIFF(
          'day',
          COALESCE(LAST_ACTIVITY_BY_GO_TO_MARKET_AT, LAST_ACTIVITY_ON::TIMESTAMP_TZ),
          CURRENT_TIMESTAMP()
        ) >= ?
      )
    ORDER BY DAYS_SINCE_GTM_ACTIVITY DESC NULLS FIRST,
      ANNUAL_RECURRING_REVENUE DESC NULLS LAST
    LIMIT ?
  `;

  const rows = await withConnection(options.auth, (conn) =>
    execute(conn, sql, [geography, geography, options.minDays, options.limit]),
  );

  return {
    accounts: rows.map(mapStaleAccount).filter((a) => a.accountId),
    source: sourceFor(options.auth),
  };
}

export async function getAccountContext(
  accountId: string,
  auth?: SnowflakeAuth,
): Promise<AccountContext | null> {
  if (useFixtures() || !auth) {
    return fixtureAccountContext(accountId);
  }

  const table = accountsTable();

  return withConnection(auth, async (conn) => {
    const rows = await execute(
      conn,
      `
      SELECT
        SFDC_ACCOUNT_ID,
        ACCOUNT_NAME,
        HIGHEST_BILLING_PLAN,
        ANNUAL_RECURRING_REVENUE,
        ACCOUNT_LIFECYCLE_STAGE,
        OWNER_NAME,
        CUSTOMER_SUCCESS_MANAGER_NAME,
        SALES_ENGINEER_NAME,
        TECHNICAL_CONSULTANT_NAME,
        ACCOUNT_LINK,
        GEOGRAPHY,
        HIERARCHY_GEOGRAPHY,
        REGION_NAME,
        AE_NOTES,
        ACCOUNT_EXECUTIVE_HEALTH_SENTIMENT,
        ACCOUNT_EXECUTIVE_HEALTH_SENTIMENT_NOTES,
        BOUNTY_NOTES,
        INDUSTRY_REASONING,
        BAD_FIT_DETAILS,
        PLATFORM_TYPE,
        CURRENT_SOFTWARE_FRAMEWORK,
        VRAY_FRAMEWORKS,
        IS_USING_NEXT_JS,
        AVG_BUILDS_30D,
        SEAT_UTILIZATION,
        TEAMS_COUNT,
        INTENT_SCORE_V0,
        INTENT_SCORE_INFRA,
        SALES_PLAY_NAME,
        SEGMENT,
        LAST_ACTIVITY_ON,
        LAST_ACTIVITY_BY_OWNER_ON,
        LAST_ACTIVITY_BY_GO_TO_MARKET_AT,
        UPDATED_AT,
        COALESCE(LAST_ACTIVITY_BY_GO_TO_MARKET_AT, LAST_ACTIVITY_ON::TIMESTAMP_TZ) AS LAST_GTM_ACTIVITY_AT,
        DATEDIFF(
          'day',
          COALESCE(LAST_ACTIVITY_BY_GO_TO_MARKET_AT, LAST_ACTIVITY_ON::TIMESTAMP_TZ),
          CURRENT_TIMESTAMP()
        ) AS DAYS_SINCE_GTM_ACTIVITY
      FROM ${table}
      WHERE SFDC_ACCOUNT_ID = ?
      LIMIT 1
      `,
      [accountId],
    );

    const row = rows[0];
    if (!row) return null;

    return {
      account: mapStaleAccount(row),
      notes: notesFromAccountRow(row),
      activities: activitiesFromAccountRow(row),
      usage: usageFromAccountRow(row),
      source: "snowflake",
    };
  });
}
