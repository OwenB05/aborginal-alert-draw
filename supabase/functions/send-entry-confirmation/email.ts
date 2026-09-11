// Thin Resend client. Plain fetch, no SDK: one POST, a hard timeout, and it
// never throws — callers get { ok } or { ok: false, reason } and decide what
// to tell the user. Kept identical in every function that sends email.

// The sender domain must be verified in Resend or every send is refused.
// Override with an EMAIL_FROM function secret to change it without a deploy.
export const FROM = Deno.env.get("EMAIL_FROM") ??
  "Aboriginal Alert Events <noreply@aboriginalalert.ca>";

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: string };

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

type HtmlOptions = {
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  small?: string[];
};

// A small single-column layout that survives every mail client: inline
// styles, no images, the maroon from the site. Every string passes through
// escapeHtml, so titles and addresses can't break out of the markup.
export function renderHtml(o: HtmlOptions): string {
  const body = "font-size:16px;line-height:1.5;color:#2a1516";
  const fine = "font-size:13px;line-height:1.5;color:#57534e";
  const paragraphs = o.paragraphs
    .map((t) => `<p style='margin:0 0 16px;${body}'>${escapeHtml(t)}</p>`)
    .join("");
  const cta = o.cta
    ? `<p style='margin:24px 0'><a href='${escapeHtml(o.cta.url)}' style='display:inline-block;background:#631515;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px'>${escapeHtml(o.cta.label)}</a></p>` +
      `<p style='margin:0 0 16px;${fine}'>If the button doesn't work, copy this address into your browser:<br><a href='${escapeHtml(o.cta.url)}' style='color:#631515;word-break:break-all'>${escapeHtml(o.cta.url)}</a></p>`
    : "";
  const small = (o.small ?? [])
    .map((t) => `<p style='margin:0 0 8px;${fine}'>${escapeHtml(t)}</p>`)
    .join("");
  return `<!doctype html><html><body style='margin:0;padding:24px;background:#f7efe2;font-family:Arial,Helvetica,sans-serif'>` +
    `<div style='max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e8dcc8;border-radius:12px;overflow:hidden'>` +
    `<div style='background:#5a0c0b;color:#ffffff;padding:14px 24px;font-weight:700;font-size:15px'>Aboriginal Alert Events</div>` +
    // Awareness colours at equal weight (table cells: gradients don't survive
    // Outlook). Red Dress Red — women & girls; Burnt Copper — men & boys.
    `<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='border-collapse:collapse'><tr>` +
    `<td width='50%' height='4' style='background:#c90d0e;font-size:0;line-height:0'>&nbsp;</td>` +
    `<td width='50%' height='4' style='background:#b05a2c;font-size:0;line-height:0'>&nbsp;</td>` +
    `</tr></table>` +
    `<div style='padding:24px'><h1 style='margin:0 0 16px;font-size:22px;line-height:1.3;color:#5a0c0b'>${escapeHtml(o.heading)}</h1>` +
    `${paragraphs}${cta}${small}</div></div></body></html>`;
}

export async function sendEmail(
  apiKey: string,
  msg: { to: string; subject: string; text: string; html: string },
): Promise<SendResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const reason = typeof body?.message === "string"
        ? body.message
        : `the email service returned ${res.status}`;
      return { ok: false, reason };
    }
    return { ok: true, id: typeof body?.id === "string" ? body.id : null };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      reason: timedOut
        ? "the email service timed out"
        : "the email service could not be reached",
    };
  } finally {
    clearTimeout(timer);
  }
}
