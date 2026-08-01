export interface BriefingAccount {
  accountName: string;
  plan: string;
  arrUsd?: number | null;
  geography?: string | null;
  regionName?: string | null;
  daysSinceActivity?: number | null;
  lastActivityAt?: string | null;
  ownerName?: string | null;
  csmName?: string | null;
  salesEngineerName?: string | null;
  accountLink?: string | null;
  usageSummary: string;
  activationGap: string;
  suggestedSession: string;
  draftAsk: string;
}

export interface BriefingEmailContent {
  headline: string;
  intro?: string;
  accounts: BriefingAccount[];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatArr(arrUsd: number | null | undefined): string {
  if (arrUsd === null || arrUsd === undefined || Number.isNaN(arrUsd)) {
    return "ARR n/a";
  }
  return `ARR $${Math.round(arrUsd).toLocaleString("en-US")}`;
}

function formatLastActivity(
  lastActivityAt: string | null | undefined,
  daysSinceActivity: number | null | undefined,
): string {
  if (!lastActivityAt && (daysSinceActivity === null || daysSinceActivity === undefined)) {
    return "No recorded GTM activity";
  }
  if (!lastActivityAt) return `${daysSinceActivity} days since last GTM activity`;
  if (daysSinceActivity === null || daysSinceActivity === undefined) {
    return `Last GTM activity: ${lastActivityAt}`;
  }
  return `Last GTM activity: ${lastActivityAt} (${daysSinceActivity} days)`;
}

function teamLine(account: BriefingAccount): string {
  const parts = [
    account.ownerName ? `Owner: ${account.ownerName}` : null,
    account.csmName ? `CSM: ${account.csmName}` : null,
    account.salesEngineerName ? `SE: ${account.salesEngineerName}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Team: n/a";
}

function geoLine(account: BriefingAccount): string {
  const geo = [account.geography, account.regionName].filter(Boolean).join(" / ");
  return geo || "APAC";
}

/** Plain-text body that stays readable in Gmail. */
export function renderBriefingText(
  content: BriefingEmailContent,
  bookingLink?: string,
): string {
  const lines: string[] = [
    content.headline,
    "",
    content.intro?.trim() ||
      "APAC enterprise accounts with no recent workshop/meeting. Book time with the contact below.",
    "",
  ];

  content.accounts.forEach((account, index) => {
    lines.push(`${index + 1}) ${account.accountName}`);
    lines.push(
      `   ${account.plan} · ${formatArr(account.arrUsd)} · ${geoLine(account)}`,
    );
    lines.push(`   ${formatLastActivity(account.lastActivityAt, account.daysSinceActivity)}`);
    lines.push(`   ${teamLine(account)}`);
    if (account.accountLink) lines.push(`   Salesforce: ${account.accountLink}`);
    lines.push(`   Usage: ${account.usageSummary}`);
    lines.push(`   Gap: ${account.activationGap}`);
    lines.push(`   Suggested session: ${account.suggestedSession}`);
    lines.push(`   Draft ask: ${account.draftAsk}`);
    lines.push("");
  });

  if (bookingLink) {
    lines.push("Book time:");
    lines.push(bookingLink);
  }

  return lines.join("\n").trim() + "\n";
}

/**
 * Simple HTML for Gmail: inline styles, no markdown, real links.
 * Avoids tables-in-tables complexity; uses spaced blocks Gmail keeps intact.
 */
export function renderBriefingHtml(
  content: BriefingEmailContent,
  bookingLink?: string,
): string {
  const intro =
    content.intro?.trim() ||
    "APAC enterprise accounts with no recent workshop/meeting. Book time with the contact below.";

  const cards = content.accounts
    .map((account, index) => {
      const safeLink =
        account.accountLink && /^https?:\/\//i.test(account.accountLink)
          ? account.accountLink
          : null;
      const link = safeLink
        ? `<div style="margin:0 0 8px 0;font-size:14px;line-height:1.5;color:#444;">
            Salesforce:
            <a href="${escapeHtml(safeLink)}" style="color:#0070f3;text-decoration:underline;">
              Open account
            </a>
          </div>`
        : account.accountLink
          ? `<div style="margin:0 0 8px 0;font-size:14px;line-height:1.5;color:#444;">
              Salesforce: ${escapeHtml(account.accountLink)}
            </div>`
          : "";

      return `
      <div style="margin:0 0 20px 0;padding:16px 18px;border:1px solid #eaeaea;border-radius:8px;background:#ffffff;">
        <div style="margin:0 0 6px 0;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#666;">
          Account ${index + 1}
        </div>
        <div style="margin:0 0 8px 0;font-size:18px;font-weight:700;line-height:1.3;color:#111;">
          ${escapeHtml(account.accountName)}
        </div>
        <div style="margin:0 0 12px 0;font-size:14px;line-height:1.5;color:#444;">
          ${escapeHtml(account.plan)} · ${escapeHtml(formatArr(account.arrUsd))} · ${escapeHtml(geoLine(account))}
        </div>
        <div style="margin:0 0 6px 0;font-size:14px;line-height:1.5;color:#222;">
          <strong>Last activity:</strong> ${escapeHtml(formatLastActivity(account.lastActivityAt, account.daysSinceActivity))}
        </div>
        <div style="margin:0 0 6px 0;font-size:14px;line-height:1.5;color:#222;">
          <strong>Team:</strong> ${escapeHtml(teamLine(account))}
        </div>
        ${link}
        <div style="margin:0 0 6px 0;font-size:14px;line-height:1.5;color:#222;">
          <strong>Usage:</strong> ${escapeHtml(account.usageSummary)}
        </div>
        <div style="margin:0 0 6px 0;font-size:14px;line-height:1.5;color:#222;">
          <strong>Activation gap:</strong> ${escapeHtml(account.activationGap)}
        </div>
        <div style="margin:0 0 6px 0;font-size:14px;line-height:1.5;color:#222;">
          <strong>Suggested session:</strong> ${escapeHtml(account.suggestedSession)}
        </div>
        <div style="margin:10px 0 0 0;padding:10px 12px;background:#f6f8fa;border-radius:6px;font-size:14px;line-height:1.5;color:#111;">
          <strong>Draft ask:</strong> ${escapeHtml(account.draftAsk)}
        </div>
      </div>`;
    })
    .join("\n");

  const booking = bookingLink
    ? `<div style="margin:24px 0 0 0;padding-top:16px;border-top:1px solid #eaeaea;font-size:14px;line-height:1.5;color:#222;">
        <strong>Book time:</strong>
        <a href="${escapeHtml(bookingLink)}" style="color:#0070f3;text-decoration:underline;">
          ${escapeHtml(bookingLink)}
        </a>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
      <div style="margin:0 0 16px 0;padding:20px 18px;background:#111;border-radius:8px;">
        <div style="margin:0;font-size:20px;font-weight:700;line-height:1.3;color:#ffffff;">
          ${escapeHtml(content.headline)}
        </div>
        <div style="margin:8px 0 0 0;font-size:14px;line-height:1.5;color:#d4d4d8;">
          ${escapeHtml(intro)}
        </div>
      </div>
      ${cards}
      ${booking}
      <div style="margin:20px 0 0 0;font-size:12px;line-height:1.5;color:#71717a;">
        Sent by workshop-nudge-agent · for operator use only · do not forward to customers as-is without review
      </div>
    </div>
  </body>
</html>`;
}
