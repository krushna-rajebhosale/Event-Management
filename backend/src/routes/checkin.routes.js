import { Router } from "express";
import { pool } from "../config/db.js";
import { generateCertificatePdf } from "../utils/certificatePdf.js";
import { sendCertificateEmail } from "../utils/mailer.js";

const router = Router();

/**
 * POST /api/checkin/scan
 * Body: { qrPayload, userId }
 */
router.post("/scan", async (req, res) => {
  try {
    const { qrPayload, userId } = req.body;

    if (!qrPayload) {
      return res.status(400).json({ message: "qrPayload is required" });
    }

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const existing = await pool.query(
      `SELECT
         r.id,
         r.event_id,
         r.attendee_name,
         r.attendee_email,
         r.status,
         r.qr_code,
         COALESCE(r.certificate_sent, FALSE) AS certificate_sent
       FROM public.registrations r
       JOIN public.events e ON e.id = r.event_id
       WHERE r.qr_code = $1
         AND e.created_by = $2`,
      [qrPayload, userId]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Invalid / Unknown QR or access denied." });
    }

    const reg = existing.rows[0];

    if (reg.status === "Checked In") {
      return res.json({
        message: "Already checked in ✅",
        attendee: reg
      });
    }

    const updated = await pool.query(
      `UPDATE public.registrations
       SET status = 'Checked In',
           checked_in_at = NOW()
       WHERE id = $1
       RETURNING id, event_id, attendee_name, attendee_email, status, checked_in_at`,
      [reg.id]
    );

    const attendee = updated.rows[0];

    const eventRes = await pool.query(
      `SELECT event_name, start_at
       FROM public.events
       WHERE id = $1`,
      [attendee.event_id]
    );

    const eventRow = eventRes.rows[0] || {};
    const eventName = eventRow.event_name || "Event";
    const eventDate = eventRow.start_at
      ? new Date(eventRow.start_at).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-IN");

    let certificateStatus = { ok: false, skipped: true, reason: "Not processed" };

    try {
      if (attendee.attendee_email) {
        const pdfBuffer = await generateCertificatePdf({
          attendeeName: attendee.attendee_name,
          eventName,
          eventDate,
        });

        const mailRes = await sendCertificateEmail({
          to: attendee.attendee_email,
          attendeeName: attendee.attendee_name,
          eventName,
          pdfBuffer,
        });

        certificateStatus = mailRes.ok
          ? { ok: true, skipped: false, reason: "" }
          : { ok: false, skipped: true, reason: mailRes.reason || "Skipped" };

        if (mailRes.ok) {
          await pool.query(
            `UPDATE public.registrations
             SET certificate_sent = TRUE,
                 certificate_sent_at = NOW()
             WHERE id = $1`,
            [attendee.id]
          );
        }
      } else {
        certificateStatus = { ok: false, skipped: true, reason: "No attendee email" };
      }
    } catch (mailErr) {
      console.error("⚠️ Certificate email failed:", mailErr?.message || mailErr);
      certificateStatus = { ok: false, skipped: false, reason: "Email failed" };
    }

    return res.json({
      message: certificateStatus.ok
        ? "Check-in successful ✅ (Certificate sent)"
        : certificateStatus.skipped
        ? `Check-in successful ✅ (Certificate skipped: ${certificateStatus.reason})`
        : "Check-in successful ✅ (Certificate send failed)",
      attendee,
      certificate: certificateStatus,
    });
  } catch (err) {
    console.error("Check-in scan error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;