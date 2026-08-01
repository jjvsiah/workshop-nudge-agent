-- Expected Snowflake shape for workshop-nudge-agent.
-- Point SF_*_TABLE env vars at views that match these columns if your CRM sync differs.

CREATE TABLE IF NOT EXISTS accounts (
  account_id STRING,
  account_name STRING,
  plan STRING,                    -- hobby | pro | enterprise | enterprise_plus
  arr_usd NUMBER,
  primary_contact_name STRING,
  primary_contact_email STRING,
  owner_email STRING
);

CREATE TABLE IF NOT EXISTS account_activities (
  account_id STRING,
  activity_at TIMESTAMP_NTZ,
  activity_type STRING,           -- workshop | meeting | enablement | email | call | ...
  subject STRING,
  description STRING
);

CREATE TABLE IF NOT EXISTS account_notes (
  account_id STRING,
  note_at TIMESTAMP_NTZ,
  author STRING,
  body STRING
);

CREATE TABLE IF NOT EXISTS account_usage_signals (
  account_id STRING,
  signal STRING,                  -- primary_use | ai_workload | ai_sdk | v0 | firewall | ...
  value STRING,
  observed_at TIMESTAMP_NTZ
);
