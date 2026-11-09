import { Router } from "express";
import { pool } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";
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

// GET public event info
router.get("/events/:eventId", async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId) {
      return res.status(400).json({ message: "Invalid event id." });
    }

    const r = await pool.query(
      `SELECT
         id,
         event_name,
         start_at,
         end_at,
         venue_name,
         venue_address,
         enable_qrcode,
         registration_deadline,
         registration_limit,
         status
       FROM events
       WHERE id = $1`,
      [eventId]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ message: "Event not found." });
    }

    return res.json(r.rows[0]);
  } catch (err) {
    console.error("Public event error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST public registration
router.post("/events/:eventId/register", async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    const { name, email, ticketType } = req.body;

    if (!eventId) {
      return res.status(400).json({ message: "Invalid event id." });
    }

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    const ev = await pool.query(
      `SELECT
         id,
         event_name,
         start_at,
         venue_name,
         venue_address,
         enable_qrcode,
         registration_deadline,
         registration_limit,
         status
       FROM events
       WHERE id = $1`,
      [eventId]
    );

    if (ev.rows.length === 0) {
      return res.status(404).json({ message: "Event not found." });
    }

    const event = ev.rows[0];
    const eventStatus = String(event.status || "").toLowerCase();

    if (eventStatus === "draft") {
      return res.status(400).json({ message: "Registration is not open for this event." });
    }

    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return res.status(400).json({ message: "Registration deadline has passed." });
    }

    if (event.registration_limit) {
      const countR = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM registrations
         WHERE event_id = $1`,
        [eventId]
      );

      const currentCount = Number(countR.rows[0].count || 0);

      if (currentCount >= Number(event.registration_limit)) {
        return res.status(400).json({ message: "Registration is full for this event." });
      }
    }

    const duplicateR = await pool.query(
      `SELECT id
       FROM registrations
       WHERE event_id = $1 AND LOWER(attendee_email) = LOWER($2)
       LIMIT 1`,
      [eventId, email.trim()]
    );

    if (duplicateR.rows.length > 0) {
      return res.status(409).json({ message: "This email is already registered for this event." });
    }

    const qrCode = uuidv4();
    const qrToken = uuidv4();

    const result = await pool.query(
      `INSERT INTO registrations(
         event_id,
         attendee_name,
         attendee_email,
         ticket_type,
         status,
         registered_at,
         qr_code,
         qr_token
       )
       VALUES($1,$2,$3,$4,'Pending',NOW(),$5,$6)
       RETURNING
         id,
         event_id,
         attendee_name,
         attendee_email,
         ticket_type,
         status,
         registered_at,
         qr_code,
         qr_token`,
      [
        eventId,
        name.trim(),
        email.toLowerCase().trim(),
        ticketType || "General Admission",
        qrCode,
        qrToken
      ]
    );

    const reg = result.rows[0];
    const qrPayload = reg.qr_code;

    // QR as PNG buffer
    const qrImageBuffer = await QRCode.toBuffer(qrPayload, {
      type: "png",
      width: 260,
      margin: 2
    });

    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = createTransporter();

        await transporter.sendMail({
          from: `"Event Manager" <${process.env.SMTP_USER}>`,
          to: reg.attendee_email,
          subject: `Registration Successful - ${event.event_name}`,
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;">
              <h2>Registration Successful ✅</h2>
              <p>Hello <b>${reg.attendee_name}</b>,</p>
              <p>You have successfully registered for <b>${event.event_name}</b>.</p>

              <p><b>Registration Details:</b></p>
              <ul>
                <li><b>Name:</b> ${reg.attendee_name}</li>
                <li><b>Email:</b> ${reg.attendee_email}</li>
                <li><b>Ticket Type:</b> ${reg.ticket_type}</li>
                <li><b>Date:</b> ${event.start_at ? new Date(event.start_at).toLocaleString("en-IN") : "-"}</li>
                <li><b>Venue:</b> ${event.venue_name || event.venue_address || "-"}</li>
              </ul>

              <p><b>Your QR Ticket:</b></p>
              <div style="margin:16px 0;">
                <img src="cid:event-qr-code" alt="QR Code" style="width:220px;height:220px;border:1px solid #ddd;padding:8px;border-radius:8px;background:#fff;" />
              </div>

              <p>Please show this QR code at the event check-in.</p>
              <p style="font-size:12px;color:#666;">QR Value: ${reg.qr_code}</p>

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

        console.log(`✅ Registration confirmation mail sent to ${reg.attendee_email}`);
      } else {
        console.warn("⚠️ SMTP credentials missing, email skipped.");
      }
    } catch (mailErr) {
      console.error("Confirmation email failed:", mailErr?.message || mailErr);
    }

    return res.status(201).json({
      message: "Registration successful ✅ Confirmation email sent.",
      registration: reg,
      qrPayload
    });

  } catch (err) {
    console.error("Public register error:", err);

    if (err?.code === "23505") {
      return res.status(409).json({ message: "This email is already registered for this event." });
    }

    return res.status(500).json({
      message: err?.message || "Server error."
    });
  }
});

export default router;