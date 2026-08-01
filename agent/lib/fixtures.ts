import type { AccountContext, StaleAccount } from "./types";

/** Demo accounts used when Snowflake credentials are not configured. */
export const FIXTURE_ACCOUNTS: StaleAccount[] = [
  {
    accountId: "001FIXTURENORTHWIND",
    accountName: "Northwind Analytics",
    plan: "enterprise",
    arrUsd: 180_000,
    lastWorkshopAt: "2025-12-10",
    daysSinceWorkshop: 234,
    lifecycleStage: "Production",
    ownerName: "Alex Owner",
    csmName: "Sam CSM",
    salesEngineerName: "Riley SE",
    primaryContactName: "Priya Shah",
    primaryContactEmail: "priya.shah@northwind.example",
    accountLink: "https://vercel.my.salesforce.com/001FIXTURENORTHWIND",
    geography: "APAC",
    regionName: "ANZ",
  },
  {
    accountId: "001FIXTURELUMEN",
    accountName: "Lumen Health",
    plan: "enterprise",
    arrUsd: 95_000,
    lastWorkshopAt: "2026-03-01",
    daysSinceWorkshop: 153,
    lifecycleStage: "Production",
    ownerName: "Jordan Owner",
    csmName: null,
    salesEngineerName: "Casey SE",
    primaryContactName: "Marcus Chen",
    primaryContactEmail: "marcus.chen@lumenhealth.example",
    accountLink: null,
    geography: "APAC",
    regionName: "Southeast Asia",
  },
  {
    accountId: "001FIXTUREORBIT",
    accountName: "Orbit Retail",
    plan: "enterprise",
    arrUsd: 320_000,
    lastWorkshopAt: null,
    daysSinceWorkshop: null,
    lifecycleStage: "Renewal",
    ownerName: "Taylor Owner",
    csmName: "Morgan CSM",
    salesEngineerName: null,
    primaryContactName: "Elena Rossi",
    primaryContactEmail: "elena.rossi@orbitretail.example",
    accountLink: null,
    geography: "AMER",
    regionName: "US West",
  },
];

const CONTEXTS: Record<string, Omit<AccountContext, "account" | "source">> = {
  "001FIXTURENORTHWIND": {
    notes: [
      {
        noteAt: "2026-05-12",
        author: "AE notes",
        body: "Enterprise customer. Currently using Vercel mainly for Next.js deploys. Internal team building note-taking agents with Claude only — not using AI SDK multi-provider or Workflow.",
      },
    ],
    activities: [
      {
        activityAt: "2025-12-10",
        activityType: "gtm_activity",
        subject: "Last GTM team activity",
        description: "Kickoff / platform walkthrough",
      },
    ],
    usage: [
      { signal: "highest_billing_plan", value: "enterprise", observedAt: null },
      { signal: "platform_type", value: "AI Coding Agent", observedAt: null },
      { signal: "is_using_next_js", value: "true", observedAt: null },
      { signal: "avg_builds_30d", value: "120", observedAt: null },
    ],
  },
  "001FIXTURELUMEN": {
    notes: [
      {
        noteAt: "2026-03-01",
        author: "AE notes",
        body: "Workshop on ISR and edge middleware. Team curious about v0 for internal tools but stuck on compliance review.",
      },
    ],
    activities: [
      {
        activityAt: "2026-03-01",
        activityType: "gtm_activity",
        subject: "Last GTM team activity",
        description: "Performance workshop",
      },
    ],
    usage: [
      { signal: "highest_billing_plan", value: "enterprise", observedAt: null },
      { signal: "intent_score_v0", value: "72", observedAt: null },
    ],
  },
  "001FIXTUREORBIT": {
    notes: [
      {
        noteAt: "2026-06-18",
        author: "AE notes",
        body: "Large commerce footprint on Vercel. No recorded enablement workshop since contract start.",
      },
    ],
    activities: [],
    usage: [
      { signal: "highest_billing_plan", value: "enterprise", observedAt: null },
      { signal: "teams_count", value: "42", observedAt: null },
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
