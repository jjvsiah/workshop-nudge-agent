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

## Automatic emails (no prompt)

`agent/schedules/daily_workshop_nudge.md` runs **09:00 UTC, Mon–Fri**: find APAC
stale accounts → research → `send_alert_email`.

`eve dev` does **not** fire cron. For hands-off email:

1. Put the same secrets on the Vercel project (Resend + Snowflake + AI Gateway):
   ```bash
   vercel env add RESEND_API_KEY
   vercel env add ALERT_EMAIL
   vercel env add ALERT_FROM_EMAIL
   # plus SNOWFLAKE_* if not already present
   ```
2. Deploy:
   ```bash
   npm run build && npx eve deploy
   # or: vercel deploy --prod
   ```
3. Cron runs in production. Confirm under the project’s Cron / schedule jobs.

**Unattended Snowflake auth:** scheduled runs have no interactive “Sign in with
Snowflake”. Prefer `SNOWFLAKE_AUTH_MODE=password` with a service user, or
`SNOWFLAKE_CONNECT_PRINCIPAL=app` if your connector issues app tokens.

**Local one-shot test** while `eve dev` is running:

```bash
curl -X POST http://localhost:2000/eve/v1/dev/schedules/daily_workshop_nudge
```

## Snowflake (Vercel Connect)

This agent uses the Internal Playground connector **`snowflake/account-intel`**
(`account-intel-snowflake`), already attached to the `workshop-nudge-agent` project.

```bash
# Must use the vercel-internal-playground team (not the similarly named one)
vercel link --project workshop-nudge-agent --scope vercel-internal-playground --yes
vercel env pull .env.local
```

Expected `.env.local` Snowflake block:

```bash
SNOWFLAKE_ACCOUNT=kzympaw-mozartvercel
SNOWFLAKE_ROLE=REPORTER
SNOWFLAKE_WAREHOUSE=REPORTING
SNOWFLAKE_DATABASE=GTM
SNOWFLAKE_SCHEMA=ANALYTICS
SF_ACCOUNTS_TABLE=ACCOUNTS
```

Queries read `GTM.ANALYTICS.ACCOUNTS` (active enterprise customers; stale by last GTM activity).

On first interactive tool call, Eve parks for **Sign in with Snowflake**. After
that, tools run SQL with the Connect OAuth token (`authenticator: OAUTH`).

| Mode | When |
| --- | --- |
| Connect (default) | Project linked + OIDC; authorize once in the TUI |
| Password fallback | Set `SNOWFLAKE_USERNAME` + `SNOWFLAKE_PASSWORD` |
| Fixtures | `SNOWFLAKE_USE_FIXTURES=1` or no auth available |

Expected tables/views: `agent/sandbox/workspace/schema.sql`. Override with
`SF_ACCOUNTS_TABLE`, `SF_ACTIVITIES_TABLE`, `SF_NOTES_TABLE`, `SF_USAGE_TABLE`.

**Schedules:** Connect user OAuth needs a user principal. For unattended cron,
try `SNOWFLAKE_CONNECT_PRINCIPAL=app` (if the connector issues app tokens) or
use password fallback.

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
