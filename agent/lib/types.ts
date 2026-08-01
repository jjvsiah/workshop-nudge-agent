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
  lastWorkshopAt: string | null;
  daysSinceWorkshop: number | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  ownerEmail: string | null;
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
