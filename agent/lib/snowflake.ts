import snowflake from "snowflake-sdk";
import {
  fixtureAccountContext,
  fixtureStaleAccounts,
} from "./fixtures";
import type {
  AccountActivity,
  AccountContext,
  AccountNote,
  StaleAccount,
  UsageSignal,
} from "./types";

snowflake.configure({ logLevel: "OFF" });

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function snowflakeConfigured(): boolean {
  return Boolean(
    env("SNOWFLAKE_ACCOUNT") &&
      env("SNOWFLAKE_USERNAME") &&
      env("SNOWFLAKE_PASSWORD") &&
      env("SNOWFLAKE_WAREHOUSE") &&
      env("SNOWFLAKE_DATABASE"),
  );
}

function table(name: string, fallback: string): string {
  const raw = env(name) ?? fallback;
  // Allow database.schema.table or bare table name within configured schema.
  if (!/^[A-Za-z0-9_.]+$/.test(raw)) {
    throw new Error(`Invalid table identifier for ${name}`);
  }
  return raw.includes(".") ? raw : raw;
}

type Row = Record<string, unknown>;

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function withConnection<T>(
  run: (conn: snowflake.Connection) => Promise<T>,
): Promise<T> {
  const connection = snowflake.createConnection({
    account: env("SNOWFLAKE_ACCOUNT")!,
    username: env("SNOWFLAKE_USERNAME")!,
    password: env("SNOWFLAKE_PASSWORD")!,
    warehouse: env("SNOWFLAKE_WAREHOUSE")!,
    database: env("SNOWFLAKE_DATABASE")!,
    schema: env("SNOWFLAKE_SCHEMA") ?? "PUBLIC",
    role: env("SNOWFLAKE_ROLE"),
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
  return {
    accountId: asString(row.ACCOUNT_ID ?? row.account_id) ?? "",
    accountName: asString(row.ACCOUNT_NAME ?? row.account_name) ?? "Unknown",
    plan: asString(row.PLAN ?? row.plan) ?? "unknown",
    arrUsd: asNumber(row.ARR_USD ?? row.arr_usd),
    lastWorkshopAt: asString(row.LAST_WORKSHOP_AT ?? row.last_workshop_at),
    daysSinceWorkshop: asNumber(
      row.DAYS_SINCE_WORKSHOP ?? row.days_since_workshop,
    ),
    primaryContactName: asString(
      row.PRIMARY_CONTACT_NAME ?? row.primary_contact_name,
    ),
    primaryContactEmail: asString(
      row.PRIMARY_CONTACT_EMAIL ?? row.primary_contact_email,
    ),
    ownerEmail: asString(row.OWNER_EMAIL ?? row.owner_email),
  };
}

export async function findStaleWorkshopAccounts(options: {
  minDays: number;
  limit: number;
}): Promise<{ accounts: StaleAccount[]; source: "snowflake" | "fixture" }> {
  if (!snowflakeConfigured()) {
    return {
      accounts: fixtureStaleAccounts(options.minDays).slice(0, options.limit),
      source: "fixture",
    };
  }

  const accountsTable = table("SF_ACCOUNTS_TABLE", "accounts");
  const activitiesTable = table("SF_ACTIVITIES_TABLE", "account_activities");

  const sql = `
    WITH workshops AS (
      SELECT
        account_id,
        MAX(activity_at) AS last_workshop_at
      FROM ${activitiesTable}
      WHERE LOWER(activity_type) IN ('workshop', 'meeting', 'enablement')
      GROUP BY 1
    )
    SELECT
      a.account_id AS ACCOUNT_ID,
      a.account_name AS ACCOUNT_NAME,
      a.plan AS PLAN,
      a.arr_usd AS ARR_USD,
      w.last_workshop_at AS LAST_WORKSHOP_AT,
      DATEDIFF('day', w.last_workshop_at, CURRENT_DATE()) AS DAYS_SINCE_WORKSHOP,
      a.primary_contact_name AS PRIMARY_CONTACT_NAME,
      a.primary_contact_email AS PRIMARY_CONTACT_EMAIL,
      a.owner_email AS OWNER_EMAIL
    FROM ${accountsTable} a
    LEFT JOIN workshops w ON w.account_id = a.account_id
    WHERE LOWER(a.plan) LIKE 'enterprise%'
      AND (
        w.last_workshop_at IS NULL
        OR DATEDIFF('day', w.last_workshop_at, CURRENT_DATE()) >= ?
      )
    ORDER BY DAYS_SINCE_WORKSHOP DESC NULLS FIRST, a.arr_usd DESC NULLS LAST
    LIMIT ?
  `;

  const rows = await withConnection((conn) =>
    execute(conn, sql, [options.minDays, options.limit]),
  );

  return {
    accounts: rows.map(mapStaleAccount).filter((a) => a.accountId),
    source: "snowflake",
  };
}

export async function getAccountContext(
  accountId: string,
): Promise<AccountContext | null> {
  if (!snowflakeConfigured()) {
    return fixtureAccountContext(accountId);
  }

  const accountsTable = table("SF_ACCOUNTS_TABLE", "accounts");
  const activitiesTable = table("SF_ACTIVITIES_TABLE", "account_activities");
  const notesTable = table("SF_NOTES_TABLE", "account_notes");
  const usageTable = table("SF_USAGE_TABLE", "account_usage_signals");

  return withConnection(async (conn) => {
    const accountRows = await execute(
      conn,
      `
      WITH workshops AS (
        SELECT account_id, MAX(activity_at) AS last_workshop_at
        FROM ${activitiesTable}
        WHERE LOWER(activity_type) IN ('workshop', 'meeting', 'enablement')
        GROUP BY 1
      )
      SELECT
        a.account_id AS ACCOUNT_ID,
        a.account_name AS ACCOUNT_NAME,
        a.plan AS PLAN,
        a.arr_usd AS ARR_USD,
        w.last_workshop_at AS LAST_WORKSHOP_AT,
        DATEDIFF('day', w.last_workshop_at, CURRENT_DATE()) AS DAYS_SINCE_WORKSHOP,
        a.primary_contact_name AS PRIMARY_CONTACT_NAME,
        a.primary_contact_email AS PRIMARY_CONTACT_EMAIL,
        a.owner_email AS OWNER_EMAIL
      FROM ${accountsTable} a
      LEFT JOIN workshops w ON w.account_id = a.account_id
      WHERE a.account_id = ?
      LIMIT 1
      `,
      [accountId],
    );

    if (!accountRows[0]) return null;

    const noteRows = await execute(
      conn,
      `
      SELECT note_at AS NOTE_AT, author AS AUTHOR, body AS BODY
      FROM ${notesTable}
      WHERE account_id = ?
      ORDER BY note_at DESC
      LIMIT 20
      `,
      [accountId],
    );

    const activityRows = await execute(
      conn,
      `
      SELECT
        activity_at AS ACTIVITY_AT,
        activity_type AS ACTIVITY_TYPE,
        subject AS SUBJECT,
        description AS DESCRIPTION
      FROM ${activitiesTable}
      WHERE account_id = ?
      ORDER BY activity_at DESC
      LIMIT 20
      `,
      [accountId],
    );

    const usageRows = await execute(
      conn,
      `
      SELECT
        signal AS SIGNAL,
        value AS VALUE,
        observed_at AS OBSERVED_AT
      FROM ${usageTable}
      WHERE account_id = ?
      ORDER BY observed_at DESC NULLS LAST
      LIMIT 50
      `,
      [accountId],
    );

    const notes: AccountNote[] = noteRows.map((row) => ({
      noteAt: asString(row.NOTE_AT) ?? "",
      author: asString(row.AUTHOR),
      body: asString(row.BODY) ?? "",
    }));

    const activities: AccountActivity[] = activityRows.map((row) => ({
      activityAt: asString(row.ACTIVITY_AT) ?? "",
      activityType: asString(row.ACTIVITY_TYPE) ?? "unknown",
      subject: asString(row.SUBJECT),
      description: asString(row.DESCRIPTION),
    }));

    const usage: UsageSignal[] = usageRows.map((row) => ({
      signal: asString(row.SIGNAL) ?? "unknown",
      value: asString(row.VALUE) ?? "",
      observedAt: asString(row.OBSERVED_AT),
    }));

    return {
      account: mapStaleAccount(accountRows[0]),
      notes,
      activities,
      usage,
      source: "snowflake",
    };
  });
}
