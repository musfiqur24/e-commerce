/**
 * Lightweight nodemailer wrapper used by the admin scheduler routes to notify
 * patients of reschedule / reassign / cancel events.
 *
 * Returns `{ ok: false, reason: "smtp_not_configured" }` rather than throwing
 * when SMTP env is missing — partial-failure responses then surface this on
 * the response envelope as `notificationError` without rolling back the
 * underlying mutation.
 */

import nodemailer, { Transporter } from "nodemailer";

let _transport: Transporter | null = null;

interface SendResult {
  ok: boolean;
  messageId?: string;
  reason?: string;
}

function readSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM;
  return { host, port, user, pass, from };
}

export function getTransport(): Transporter | null {
  if (_transport) return _transport;
  const { host, port, user, pass } = readSmtpConfig();
  if (!host || !port) return null;
  _transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
  return _transport;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

async function send(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SendResult> {
  const transport = getTransport();
  const { from } = readSmtpConfig();
  if (!transport || !from) {
    return { ok: false, reason: "smtp_not_configured" };
  }
  try {
    const info = await transport.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err: any) {
    return { ok: false, reason: err?.message ?? "send_failed" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────────────

export interface RescheduleEmailArgs {
  to: string;
  patientName: string;
  treatment: string;
  doctorName: string;
  oldStartIso: string;
  newStartIso: string;
  meetLink?: string | null;
}

export async function sendRescheduleEmail(args: RescheduleEmailArgs): Promise<SendResult> {
  const subject = `Your appointment has been rescheduled`;
  const text =
    `Hi ${args.patientName},\n\n` +
    `Your ${args.treatment} consultation with ${args.doctorName} has been rescheduled.\n` +
    `Original time: ${formatAt(args.oldStartIso)}\n` +
    `New time: ${formatAt(args.newStartIso)}\n` +
    (args.meetLink ? `\nJoin link: ${args.meetLink}\n` : "") +
    `\nIf this time does not work, please contact us to reschedule.\n`;
  const html =
    `<p>Hi ${escapeHtml(args.patientName)},</p>` +
    `<p>Your <strong>${escapeHtml(args.treatment)}</strong> consultation with ${escapeHtml(args.doctorName)} has been rescheduled.</p>` +
    `<ul>` +
    `<li><strong>Original time:</strong> ${escapeHtml(formatAt(args.oldStartIso))}</li>` +
    `<li><strong>New time:</strong> ${escapeHtml(formatAt(args.newStartIso))}</li>` +
    `</ul>` +
    (args.meetLink
      ? `<p><a href="${escapeHtml(args.meetLink)}">Join your meeting</a></p>`
      : "") +
    `<p>If this time does not work, please contact us to reschedule.</p>`;
  return send({ to: args.to, subject, text, html });
}

export interface ReassignEmailArgs {
  to: string;
  patientName: string;
  treatment: string;
  oldDoctorName: string;
  newDoctorName: string;
  startIso: string;
  meetLink?: string | null;
}

export async function sendReassignEmail(args: ReassignEmailArgs): Promise<SendResult> {
  const subject = `A new doctor has been assigned to your appointment`;
  const text =
    `Hi ${args.patientName},\n\n` +
    `Your ${args.treatment} consultation has been reassigned from ${args.oldDoctorName} to ${args.newDoctorName}.\n` +
    `Time: ${formatAt(args.startIso)}\n` +
    (args.meetLink ? `\nJoin link: ${args.meetLink}\n` : "");
  const html =
    `<p>Hi ${escapeHtml(args.patientName)},</p>` +
    `<p>Your <strong>${escapeHtml(args.treatment)}</strong> consultation has been reassigned from ${escapeHtml(args.oldDoctorName)} to <strong>${escapeHtml(args.newDoctorName)}</strong>.</p>` +
    `<p><strong>Time:</strong> ${escapeHtml(formatAt(args.startIso))}</p>` +
    (args.meetLink
      ? `<p><a href="${escapeHtml(args.meetLink)}">Join your meeting</a></p>`
      : "");
  return send({ to: args.to, subject, text, html });
}

export interface CancelEmailArgs {
  to: string;
  patientName: string;
  treatment: string;
  doctorName: string;
  startIso: string;
  reason?: string | null;
}

export async function sendCancelEmail(args: CancelEmailArgs): Promise<SendResult> {
  const subject = `Your appointment has been cancelled`;
  const text =
    `Hi ${args.patientName},\n\n` +
    `Your ${args.treatment} consultation with ${args.doctorName} on ${formatAt(args.startIso)} has been cancelled.\n` +
    (args.reason ? `\nReason: ${args.reason}\n` : "") +
    `\nPlease contact us to reschedule.\n`;
  const html =
    `<p>Hi ${escapeHtml(args.patientName)},</p>` +
    `<p>Your <strong>${escapeHtml(args.treatment)}</strong> consultation with ${escapeHtml(args.doctorName)} on ${escapeHtml(formatAt(args.startIso))} has been cancelled.</p>` +
    (args.reason ? `<p><strong>Reason:</strong> ${escapeHtml(args.reason)}</p>` : "") +
    `<p>Please contact us to reschedule.</p>`;
  return send({ to: args.to, subject, text, html });
}
