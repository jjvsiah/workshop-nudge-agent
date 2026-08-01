---
cron: "0 9 * * 1-5"
---

Run the weekday APAC workshop-nudge sweep (unattended).

1. Call `find_stale_workshop_accounts` with geography=APAC, minDays=60, limit=5.
2. For each returned account, call `get_account_context`.
3. Load the `workshop-outreach` skill and draft a concise APAC operator briefing.
4. Call `send_alert_email` once with all APAC accounts in a single email.
   Subject should mention APAC (e.g. "APAC workshop candidates (N)").
5. If there are zero APAC accounts, do not send email; finish successfully.

Use tools only — do not wait for a human. Snowflake should use app-scoped Connect
(or password) because this is a schedule run.
