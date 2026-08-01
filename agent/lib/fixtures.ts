import type { AccountContext, StaleAccount } from "./types";

/** Demo accounts used when Snowflake credentials are not configured. */
export const FIXTURE_ACCOUNTS: StaleAccount[] = [
  {
    accountId: "acct_northwind",
    accountName: "Northwind Analytics",
    plan: "enterprise",
    arrUsd: 180_000,
    lastWorkshopAt: "2025-12-10",
    daysSinceWorkshop: 234,
    primaryContactName: "Priya Shah",
    primaryContactEmail: "priya.shah@northwind.example",
    ownerEmail: "you@example.com",
  },
  {
    accountId: "acct_lumen",
    accountName: "Lumen Health",
    plan: "enterprise",
    arrUsd: 95_000,
    lastWorkshopAt: "2026-03-01",
    daysSinceWorkshop: 153,
    primaryContactName: "Marcus Chen",
    primaryContactEmail: "marcus.chen@lumenhealth.example",
    ownerEmail: "you@example.com",
  },
  {
    accountId: "acct_orbit",
    accountName: "Orbit Retail",
    plan: "enterprise_plus",
    arrUsd: 320_000,
    lastWorkshopAt: null,
    daysSinceWorkshop: null,
    primaryContactName: "Elena Rossi",
    primaryContactEmail: "elena.rossi@orbitretail.example",
    ownerEmail: "you@example.com",
  },
];

const CONTEXTS: Record<string, Omit<AccountContext, "account" | "source">> = {
  acct_northwind: {
    notes: [
      {
        noteAt: "2026-05-12",
        author: "AE",
        body: "Enterprise customer. Currently using Vercel mainly for Next.js deploys. Internal team building note-taking agents with Claude only — not using AI SDK multi-provider or Workflow.",
      },
      {
        noteAt: "2025-12-10",
        author: "SE",
        body: "Kickoff workshop covered App Router deploy + preview comments. AI roadmap mentioned but not scheduled.",
      },
    ],
    activities: [
      {
        activityAt: "2025-12-10",
        activityType: "workshop",
        subject: "Platform kickoff",
        description: "Deploy + Preview + Environments walkthrough",
      },
      {
        activityAt: "2026-04-02",
        activityType: "email",
        subject: "QBR invite",
        description: "No reply",
      },
    ],
    usage: [
      { signal: "primary_use", value: "deployments", observedAt: "2026-07-20" },
      {
        signal: "ai_workload",
        value: "claude_note_agents_only",
        observedAt: "2026-07-20",
      },
      { signal: "ai_sdk", value: "not_detected", observedAt: "2026-07-20" },
      { signal: "observability", value: "basic_logs", observedAt: "2026-07-20" },
    ],
  },
  acct_lumen: {
    notes: [
      {
        noteAt: "2026-03-01",
        author: "SE",
        body: "Workshop on ISR and edge middleware. Team curious about v0 for internal tools but stuck on compliance review.",
      },
    ],
    activities: [
      {
        activityAt: "2026-03-01",
        activityType: "workshop",
        subject: "Performance workshop",
        description: "Caching + Edge Config",
      },
    ],
    usage: [
      { signal: "primary_use", value: "marketing_sites", observedAt: "2026-07-15" },
      { signal: "v0", value: "pilot_blocked", observedAt: "2026-06-01" },
      { signal: "firewall", value: "not_enabled", observedAt: "2026-07-15" },
    ],
  },
  acct_orbit: {
    notes: [
      {
        noteAt: "2026-06-18",
        author: "CSM",
        body: "Large commerce footprint on Vercel. No recorded enablement workshop since contract start. Platform eng lead wants AI shopping assistants.",
      },
    ],
    activities: [
      {
        activityAt: "2026-01-15",
        activityType: "meeting",
        subject: "Renewal kickoff",
        description: "Commercial only — no technical workshop",
      },
    ],
    usage: [
      { signal: "primary_use", value: "commerce_storefront", observedAt: "2026-07-22" },
      { signal: "ai_workload", value: "none", observedAt: "2026-07-22" },
      {
        signal: "team_size_active",
        value: "42",
        observedAt: "2026-07-22",
      },
    ],
  },
};

export function fixtureStaleAccounts(minDays: number): StaleAccount[] {
  return FIXTURE_ACCOUNTS.filter(
    (a) => a.daysSinceWorkshop === null || a.daysSinceWorkshop >= minDays,
  );
}

export function fixtureAccountContext(accountId: string): AccountContext | null {
  const account = FIXTURE_ACCOUNTS.find((a) => a.accountId === accountId);
  const rest = CONTEXTS[accountId];
  if (!account || !rest) return null;
  return { account, ...rest, source: "fixture" };
}
