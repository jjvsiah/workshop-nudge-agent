# workshop-nudge-agent

Eve agent that finds **enterprise Vercel accounts without a workshop/meeting in 60+ days**, reads plan + notes + usage signals from **Snowflake**, and emails **you** a briefing to book time.

Inspired by enterprise customers who are on plan but only using Vercel for deploys and light Claude note-taking agents.

## Quick start

```bash
cp .env.example .env.local
# set AI_GATEWAY_API_KEY (and optionally RESEND_* / ALERT_EMAIL)
npm run dev
```

In the eve TUI, try:

```text
Find accounts that need a workshop and email me a briefing.
```

Without Snowflake credentials, the agent uses built-in fixture accounts (including a deploy + Claude-notes enterprise example).

## Weekday schedule

`agent/schedules/daily_workshop_nudge.md` runs **09:00 UTC, Mon–Fri**.

- Production / `eve start`: cron fires automatically.
- Local `eve dev`: trigger once with:

```bash
curl -X POST http://localhost:2000/eve/v1/dev/schedules/daily_workshop_nudge
```

## Snowflake

Set `SNOWFLAKE_*` in `.env.local`. Expected tables/views are documented in `agent/sandbox/workspace/schema.sql`. Override names with:

- `SF_ACCOUNTS_TABLE`
- `SF_ACTIVITIES_TABLE`
- `SF_NOTES_TABLE`
- `SF_USAGE_TABLE`

## Email

Uses [Resend](https://resend.com). Set:

- `RESEND_API_KEY`
- `ALERT_EMAIL` (you)
- `ALERT_FROM_EMAIL` (verified domain in production)
- optional `BOOKING_LINK`

The agent emails the operator only — it does not email the customer.

## Tools

| Tool | Purpose |
| --- | --- |
| `find_stale_workshop_accounts` | Enterprise accounts with no workshop/meeting ≥ N days |
| `get_account_context` | Notes, activities, usage signals for one account |
| `send_alert_email` | Operator briefing via Resend |
