---
cron: "0 9 * * 1-5"
---

Run the weekday workshop-nudge sweep.

1. Call `find_stale_workshop_accounts` with minDays=60 and limit=5.
2. For each returned account, call `get_account_context`.
3. Load the `workshop-outreach` skill and draft a concise operator briefing.
4. Call `send_alert_email` once with all accounts in a single email.
5. If there are zero accounts, do not send email; finish successfully.
