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

## Briefing template (operator email)

```md
## Workshop candidates (N)

### {Account} — {plan} · ARR ${arr}
- Last workshop: {date or never} ({days} days)
- Contact: {name} <{email}>
- What they use Vercel for: {1-2 sentences from notes/usage}
- Activation gap: {specific underuse}
- Suggested session: {30/45/60 min topic}
- Draft ask: "{one sentence the operator can send}"
```

## Tone

- Specific and commercial-aware, not hype.
- Assume the customer is successful at deploys; the gap is depth.
- Never invent product usage; quote notes/signals.
