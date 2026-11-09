import { Router } from "express";
import { pool } from "../config/db.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import QRCode from "qrcode";

dotenv.config();

const router = Router();

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * GET /api/registrations/events
 */
router.get("/events", async (req, res) => {
  try {
    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const result = await pool.query(
      `
      SELECT
        e.id,
        e.event_name,
        e.start_at,
        e.end_at,
        e.status AS db_status,
        e.registration_limit,
        COUNT(r.id)::int AS registration_count
      FROM public.events e
      LEFT JOIN public.registrations r
        ON r.event_id = e.id
        AND COALESCE(LOWER(r.status), 'pending') <> 'cancelled'
      WHERE e.created_by = $1
      GROUP BY
        e.id,
        e.event_name,
        e.start_at,
        e.end_at,
        e.status,
        e.registration_limit
      ORDER BY
        CASE
          WHEN e.start_at <= NOW() AND e.end_at >= NOW() THEN 1
          WHEN e.start_at > NOW() THEN 2
          ELSE 3
        END,
        e.start_at ASC;
      `,
      [userId]
    );

    const now = new Date();

    const events = result.rows.map((e) => {
      const start = new Date(e.start_at);
      const end = new Date(e.end_at);

      let uiStatus = "Upcoming";
      if (start <= now && end >= now) uiStatus = "Ongoing";
      if (end < now) uiStatus = "Completed";

      return {
        id: e.id,
        name: e.event_name,
        date: e.start_at,
        status: uiStatus,
        registrationCount: Number(e.registration_count || 0),
        capacity: Number(e.registration_limit || 0),
      };
    });

    return res.json(events);
  } catch (err) {
    console.error("Registrations events error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * GET /api/registrations/event/:eventId
 */
router.get("/event/:eventId", async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const ownerCheck = await pool.query(
      `SELECT id FROM public.events WHERE id = $1 AND created_by = $2`,
      [eventId, userId]
    );

    if (ownerCheck.rowCount === 0) {
      return res.status(404).json({ message: "Event not found or access denied." });
    }

    const result = await pool.query(
      `SELECT
         id,
         attendee_name,
         attendee_email,
         ticket_type,
         status,
         registered_at,
         qr_code
       FROM public.registrations
       WHERE event_id = $1
       ORDER BY registered_at DESC`,
      [eventId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Registrations list error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * GET /api/registrations/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const result = await pool.query(
      `SELECT
         r.id,
         r.event_id,
         r.attendee_name,
         r.attendee_email,
         r.ticket_type,
         r.status,
         r.registered_at,
         r.qr_code,
         r.checked_in_at,
         e.event_name,
         e.start_at,
         e.end_at,
         e.venue_name,
         e.venue_address
       FROM public.registrations r
       JOIN public.events e ON e.id = r.event_id
       WHERE r.id = $1
         AND e.created_by = $2`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Registration not found or access denied." });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Registration detail error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/registrations/:id/resend-confirmation
 */
router.post("/:id/resend-confirmation", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const result = await pool.query(
      `SELECT
         r.id,
         r.event_id,
         r.attendee_name,
         r.attendee_email,
         r.ticket_type,
         r.status,
         r.registered_at,
         r.qr_code,
         e.event_name,
         e.start_at,
         e.venue_name,
         e.venue_address
       FROM public.registrations r
       JOIN public.events e ON e.id = r.event_id
       WHERE r.id = $1
         AND e.created_by = $2`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Registration not found or access denied." });
    }

    const reg = result.rows[0];

    if (!reg.attendee_email) {
      return res.status(400).json({ message: "Attendee email not found." });
    }

    const transporter = createTransporter();

    const qrImageBuffer = await QRCode.toBuffer(reg.qr_code || "NO-QR", {
      type: "png",
      width: 260,
      margin: 2
    });

    await transporter.sendMail({
      from: `"Event Manager" <${process.env.SMTP_USER}>`,
      to: reg.attendee_email,
      subject: `Registration Confirmation - ${reg.event_name}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;">
          <h2>Registration Confirmation ✅</h2>
          <p>Hello <b>${reg.attendee_name}</b>,</p>
          <p>This is your registration confirmation for <b>${reg.event_name}</b>.</p>

          <p><b>Details:</b></p>
          <ul>
            <li><b>Name:</b> ${reg.attendee_name}</li>
            <li><b>Email:</b> ${reg.attendee_email}</li>
            <li><b>Ticket Type:</b> ${reg.ticket_type || "-"}</li>
            <li><b>Status:</b> ${reg.status || "-"}</li>
            <li><b>Date:</b> ${reg.start_at ? new Date(reg.start_at).toLocaleString("en-IN") : "-"}</li>
            <li><b>Venue:</b> ${reg.venue_name || reg.venue_address || "-"}</li>
          </ul>

          <p><b>Your QR Ticket:</b></p>
          <div style="margin:16px 0;">
            <img src="cid:event-qr-code" alt="QR Code" style="width:220px;height:220px;border:1px solid #ddd;padding:8px;border-radius:8px;background:#fff;" />
          </div>

          <p>Please show this QR code at the event check-in.</p>
          <p style="font-size:12px;color:#666;">QR Value: ${reg.qr_code || "-"}</p>

          <p>Thank you.</p>
        </div>
      `,
      attachments: [
        {
          filename: "event-qr.png",
          content: qrImageBuffer,
          cid: "event-qr-code"
        }
      ]
    });

    return res.json({ message: "Confirmation email resent successfully ✅" });
  } catch (err) {
    console.error("Resend confirmation error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * GET /api/registrations/event/:eventId/attendees
 */
router.get("/event/:eventId/attendees", async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const ownerCheck = await pool.query(
      `SELECT id FROM public.events WHERE id = $1 AND created_by = $2`,
      [eventId, userId]
    );

    if (ownerCheck.rowCount === 0) {
      return res.status(404).json({ message: "Event not found or access denied." });
    }

    const result = await pool.query(
      `SELECT
         id,
         attendee_name,
         attendee_email,
         status,
         qr_code,
         registered_at
       FROM public.registrations
       WHERE event_id = $1
       ORDER BY registered_at DESC`,
      [eventId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Attendees error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/registrations/event/:eventId
 */
router.post("/event/:eventId", async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    const { name, email, ticketType } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    const result = await pool.query(
      `INSERT INTO public.registrations(
         event_id,
         attendee_name,
         attendee_email,
         ticket_type,
         status,
         registered_at
       )
       VALUES ($1, $2, $3, $4, 'Pending', NOW())
       RETURNING *`,
      [eventId, name.trim(), email.toLowerCase().trim(), ticketType || "General Admission"]
    );

    return res.status(201).json({
      message: "Registration created ✅",
      registration: result.rows[0],
    });
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ message: "This email is already registered for the event." });
    }

    console.error("Registration create error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/registrations/:id/checkin
 */
router.post("/:id/checkin", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const existing = await pool.query(
      `SELECT r.id
       FROM public.registrations r
       JOIN public.events e ON e.id = r.event_id
       WHERE r.id = $1
         AND e.created_by = $2`,
      [id, userId]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Registration not found or access denied." });
    }

    const updated = await pool.query(
      `UPDATE public.registrations
       SET status = 'Checked In',
           checked_in_at = COALESCE(checked_in_at, NOW())
       WHERE id = $1
       RETURNING
         id,
         event_id,
         attendee_name,
         attendee_email,
         status,
         checked_in_at`,
      [id]
    );

    return res.json({
      message: "Checked in ✅",
      data: updated.rows[0]
    });
  } catch (err) {
    console.error("Manual checkin error:", err);
    return res.status(500).json({ message: err?.message || "Server error." });
  }
});

export default router;