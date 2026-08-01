---
description: Use when drafting workshop angles, operator briefings, or booking asks for under-activated Vercel enterprise accounts.
---

# Workshop outreach playbook

## Goal

Get the operator on a calendar with the customer's technical champion. The agent
emails the **operator**, who then books or forwards the ask.

## Signal → angle map

| Signal | Angle |
| --- | --- |
| Deploy-only / preview-only | Move from hosting to product velocity: AI SDK, Workflow, Observability |
| Claude note-taking agents only | Multi-model AI SDK, structured generation, tool use, Workflow DevKit for durable agents |
| v0 blocked / curious | Compliance-friendly internal tools workshop + design-to-deploy loop |
| Firewall / bot protection off | Commerce or public-surface hardening workshop |
| Large team, no enablement | Team onboarding workshop: environments, reviews, ownership |
| High ARR, null last workshop | Executive + SE joint session; treat as activation risk |

## Email rules (Gmail)

Gmail does **not** render markdown. Never pass markdown to `send_alert_email`.
Fill the structured `accounts[]` fields with plain sentences only.

Call `send_alert_email` like this:

- `subject`: `APAC workshop candidates (N)`
- `headline`: same as subject (or shorter)
- `intro`: one plain sentence
- `accounts`: one object per account with:
  - `accountName`, `plan`, `arrUsd`, `geography`, `regionName`
  - `lastActivityAt`, `daysSinceActivity`
  - `ownerName`, `csmName`, `salesEngineerName`, `accountLink`
  - `usageSummary` — 1–2 plain sentences
  - `activationGap` — specific underuse
  - `suggestedSession` — e.g. `45-min AI SDK + Workflow workshop`
  - `draftAsk` — one sentence the operator can send

The tool renders a Gmail-safe HTML card layout + plain-text fallback.

## Tone

- Specific and commercial-aware, not hype.
- Assume the customer is successful at deploys; the gap is depth.
- Never invent product usage; quote notes/signals.
- No markdown characters (`#`, `*`, backticks) inside field values.
