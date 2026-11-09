// backend/src/jobs/reminder.job.js
import cron from "node-cron";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { pool } from "../config/db.js";

dotenv.config();

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

// Create transporter once
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Safe mail sender
async function sendEmailSafe({ to, subject, html }) {
  try {
    if (!to || String(to).trim() === "") {
      console.warn("⚠️ Email skipped: recipient is empty");
      return { ok: false, skipped: true, reason: "Empty recipient" };
    }

    const info = await transporter.sendMail({
      from: `"Event Manager" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    return {
      ok: true,
      skipped: false,
      messageId: info.messageId,
    };
  } catch (err) {
    console.error("❌ Email send error:", err?.message || err);
    return {
      ok: false,
      skipped: true,
      reason: err?.message || "Unknown email error",
    };
  }
}

// Email HTML for attendee reminder
function buildAttendeeReminderEmail({ attendeeName, eventName, startAt, venue }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:600px;margin:auto;padding:20px;">
      <div style="border:1px solid #e5d7c3;border-radius:12px;padding:24px;background:#fffdf9;">
        <h2 style="margin-top:0;color:#5d5048;">Event Reminder 🔔</h2>

        <p>Hello <b>${attendeeName || "Attendee"}</b>,</p>

        <p>This is a reminder that your event is happening <b>tomorrow</b>.</p>

        <div style="background:#f8f1e7;border-radius:8px;padding:14px 16px;margin:16px 0;">
          <p style="margin:0 0 8px 0;"><b>Event:</b> ${eventName}</p>
          <p style="margin:0 0 8px 0;"><b>Date & Time:</b> ${startAt}</p>
          <p style="margin:0;"><b>Venue:</b> ${venue}</p>
        </div>

        <p>Please arrive on time and keep your ticket/QR ready for check-in.</p>

        <p style="margin-bottom:0;">See you there! 🎉</p>
      </div>
    </div>
  `;
}

// Email HTML for admin report
function buildAdminReportEmail({ eventName, startAt, totalSent, totalSkipped, note }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:600px;margin:auto;padding:20px;">
      <div style="border:1px solid #e5d7c3;border-radius:12px;padding:24px;background:#fffdf9;">
        <h2 style="margin-top:0;color:#5d5048;">Reminder Job Report ✅</h2>

        <p><b>Event:</b> ${eventName}</p>
        <p><b>Event Time:</b> ${startAt}</p>
        <p><b>Reminders Sent:</b> ${totalSent}</p>
        <p><b>Skipped / Failed:</b> ${totalSkipped}</p>

        ${note ? `<p><b>Note:</b> ${note}</p>` : ""}

        <p style="margin-bottom:0;color:#716040;">Generated automatically by Event Management System.</p>
      </div>
    </div>
  `;
}

async function runReminderJob() {
  try {
    console.log("🔔 Running event reminder job...");

    const eventsRes = await pool.query(`
      SELECT
        id,
        event_name,
        start_at,
        venue_name,
        venue_address
      FROM public.events
      WHERE DATE(start_at) = CURRENT_DATE + INTERVAL '1 day'
        AND LOWER(status) IN ('published', 'upcoming')
      ORDER BY start_at ASC
    `);

    if (eventsRes.rowCount === 0) {
      console.log("ℹ️ No events scheduled for tomorrow.");
      return;
    }

    for (const event of eventsRes.rows) {
      const venue = event.venue_name || event.venue_address || "—";
      const formattedStartAt = new Date(event.start_at).toLocaleString("en-IN", {
        timeZone: APP_TIMEZONE,
      });

      const regsRes = await pool.query(
        `
        SELECT
          attendee_email,
          attendee_name
        FROM public.registrations
        WHERE event_id = $1
          AND attendee_email IS NOT NULL
          AND TRIM(attendee_email) <> ''
        `,
        [event.id]
      );

      if (regsRes.rowCount === 0) {
        console.log(`ℹ️ No valid attendee emails for event ${event.id} (${event.event_name})`);

        await sendEmailSafe({
          to: process.env.SUPPORT_RECEIVER_EMAIL,
          subject: `Admin copy: No attendees for ${event.event_name}`,
          html: buildAdminReportEmail({
            eventName: event.event_name,
            startAt: formattedStartAt,
            totalSent: 0,
            totalSkipped: 0,
            note: "No attendee emails found for this event.",
          }),
        });

        continue;
      }

      let sentCount = 0;
      let skippedCount = 0;

      for (const reg of regsRes.rows) {
        const subject = `Reminder: ${event.event_name} is tomorrow`;

        const html = buildAttendeeReminderEmail({
          attendeeName: reg.attendee_name,
          eventName: event.event_name,
          startAt: formattedStartAt,
          venue,
        });

        const result = await sendEmailSafe({
          to: reg.attendee_email,
          subject,
          html,
        });

        if (result.ok) {
          sentCount++;
          console.log(`✅ Reminder sent to ${reg.attendee_email}`);
        } else {
          skippedCount++;
          console.warn(`⚠️ Reminder skipped/failed for ${reg.attendee_email}`);
        }
      }

      await sendEmailSafe({
        to: process.env.SUPPORT_RECEIVER_EMAIL,
        subject: `Admin copy: Reminder sent for ${event.event_name}`,
        html: buildAdminReportEmail({
          eventName: event.event_name,
          startAt: formattedStartAt,
          totalSent: sentCount,
          totalSkipped: skippedCount,
          note: "Reminder job completed successfully for this event.",
        }),
      });

      console.log(
        `📩 Reminder job finished for "${event.event_name}" | Sent: ${sentCount} | Skipped: ${skippedCount}`
      );
    }
  } catch (err) {
    console.error("❌ Reminder job error:", err?.message || err);
  }
}

export function startReminderJob() {
  console.log(`📅 Reminder job started... Timezone: ${APP_TIMEZONE}`);

  // Every day at 9:00 AM
  cron.schedule(
    "0 9 * * *",
    async () => {
      await runReminderJob();
    },
    {
      timezone: APP_TIMEZONE,
    }
  );

  // For testing, uncomment this:
  // runReminderJob();
}