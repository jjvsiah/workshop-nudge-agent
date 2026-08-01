export type AccountPlan =
  | "hobby"
  | "pro"
  | "enterprise"
  | "enterprise_plus"
  | string;

export interface StaleAccount {
  accountId: string;
  accountName: string;
  plan: AccountPlan;
  arrUsd: number | null;
  /** Proxy for last GTM touch: LAST_ACTIVITY_BY_GO_TO_MARKET_AT, else LAST_ACTIVITY_ON. */
  lastWorkshopAt: string | null;
  daysSinceWorkshop: number | null;
  lifecycleStage: string | null;
  ownerName: string | null;
  csmName: string | null;
  salesEngineerName: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  accountLink: string | null;
  geography: string | null;
  regionName: string | null;
}

export interface AccountNote {
  noteAt: string;
  author: string | null;
  body: string;
}

export interface AccountActivity {
  activityAt: string;
  activityType: string;
  subject: string | null;
  description: string | null;
}

export interface UsageSignal {
  signal: string;
  value: string;
  observedAt: string | null;
}

export interface AccountContext {
  account: StaleAccount;
  notes: AccountNote[];
  activities: AccountActivity[];
  usage: UsageSignal[];
  source: "snowflake" | "fixture";
}
