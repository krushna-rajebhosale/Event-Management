import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pool } from "../config/db.js";
import nodemailer from "nodemailer";
import { generateCertificatePdf } from "../utils/certificatePdf.js";
import { sendCertificateEmail } from "../utils/mailer.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-z0-9.\-_]/gi, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image/video files are allowed"));
    }
  },
});

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function ensureEventMediaTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.event_media (
      id SERIAL PRIMARY KEY,
      event_id INT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

/**
 * GET /api/event-media/events
 */
router.get("/events", async (req, res) => {
  try {
    await ensureEventMediaTable();

    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const r = await pool.query(
      `
      SELECT id, event_name, start_at, end_at
      FROM public.events
      WHERE created_by = $1
      ORDER BY start_at DESC
      `,
      [userId]
    );

    const now = new Date();

    const events = r.rows.map((e) => {
      const start = new Date(e.start_at);
      const end = new Date(e.end_at);

      let status = "Upcoming";
      if (start <= now && end >= now) status = "Ongoing";
      if (end < now) status = "Completed";

      return {
        id: e.id,
        name: e.event_name,
        date: e.start_at,
        status,
      };
    });

    return res.json(events);
  } catch (err) {
    console.error("Event list error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/event-media/:eventId/upload
 */
router.post("/:eventId/upload", (req, res) => {
  upload.array("files", 20)(req, res, async (err) => {
    try {
      await ensureEventMediaTable();

      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: err.message || "Upload error" });
      }

      const eventId = Number(req.params.eventId);
      const userId = Number(req.body.userId);

      if (!eventId || !userId) {
        return res.status(400).json({ message: "Invalid eventId or userId" });
      }

      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ message: "No files uploaded." });
      }

      const eventR = await pool.query(
        `SELECT id FROM public.events WHERE id = $1 AND created_by = $2`,
        [eventId, userId]
      );

      if (eventR.rowCount === 0) {
        return res.status(404).json({ message: "Event not found or access denied." });
      }

      const insertPromises = files.map((f) =>
        pool.query(
          `INSERT INTO public.event_media (event_id, file_name, file_path, mime_type)
           VALUES ($1, $2, $3, $4)
           RETURNING id, event_id, file_name, file_path, mime_type, uploaded_at`,
          [eventId, f.originalname, f.filename, f.mimetype]
        )
      );

      const inserted = await Promise.all(insertPromises);

      return res.status(201).json({
        message: "Files uploaded ✅",
        files: inserted.map((x) => x.rows[0]),
      });
    } catch (e) {
      console.error("Upload route error:", e);
      return res.status(500).json({ message: e?.message || "Server error." });
    }
  });
});

/**
 * GET /api/event-media/:eventId/files
 */
router.get("/:eventId/files", async (req, res) => {
  try {
    await ensureEventMediaTable();

    const eventId = Number(req.params.eventId);
    const userId = Number(req.query.userId);

    if (!eventId || !userId) {
      return res.status(400).json({ message: "Invalid eventId or userId" });
    }

    const ownerCheck = await pool.query(
      `SELECT id FROM public.events WHERE id = $1 AND created_by = $2`,
      [eventId, userId]
    );

    if (ownerCheck.rowCount === 0) {
      return res.status(404).json({ message: "Event not found or access denied." });
    }

    const r = await pool.query(
      `SELECT id, file_name, file_path, mime_type, uploaded_at
       FROM public.event_media
       WHERE event_id = $1
       ORDER BY uploaded_at DESC`,
      [eventId]
    );

    return res.json(r.rows);
  } catch (err) {
    console.error("Files list error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/event-media/:eventId/send-certificates
 */
router.post("/:eventId/send-certificates", async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    const { userId } = req.body;

    if (!eventId || !userId) {
      return res.status(400).json({ message: "Invalid eventId or userId" });
    }

    const eventR = await pool.query(
      `SELECT event_name, start_at
       FROM public.events
       WHERE id = $1 AND created_by = $2`,
      [eventId, userId]
    );

    if (eventR.rowCount === 0) {
      return res.status(404).json({ message: "Event not found or access denied." });
    }

    const event = eventR.rows[0];
    const eventName = event.event_name;
    const eventDate = event.start_at
      ? new Date(event.start_at).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-IN");

    const checkedInR = await pool.query(
      `SELECT id, attendee_name, attendee_email, certificate_sent
       FROM public.registrations
       WHERE event_id = $1
         AND status = 'Checked In'`,
      [eventId]
    );

    if (checkedInR.rowCount === 0) {
      return res.status(400).json({ message: "No checked-in attendees found for this event." });
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const attendee of checkedInR.rows) {
      try {
        if (!attendee.attendee_email || attendee.attendee_email.trim() === "") {
          skipped++;
          continue;
        }

        if (attendee.certificate_sent === true) {
          skipped++;
          continue;
        }

        const pdfBuffer = await generateCertificatePdf({
          attendeeName: attendee.attendee_name,
          eventName,
          eventDate,
        });

        await sendCertificateEmail({
          to: attendee.attendee_email,
          attendeeName: attendee.attendee_name,
          eventName,
          pdfBuffer,
        });

        await pool.query(
          `UPDATE public.registrations
           SET certificate_sent = TRUE,
               certificate_sent_at = NOW()
           WHERE id = $1`,
          [attendee.id]
        );

        sent++;
      } catch (mailErr) {
        console.error(
          "Certificate send failed for:",
          attendee.attendee_email,
          mailErr?.message || mailErr
        );
        failed++;
      }
    }

    return res.json({
      message: "Certificates processed ✅",
      sentTo: sent,
      skipped,
      failed,
    });
  } catch (err) {
    console.error("Send certificates error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/event-media/:eventId/send
 */
router.post("/:eventId/send", async (req, res) => {
  try {
    await ensureEventMediaTable();

    const eventId = Number(req.params.eventId);
    const { userId } = req.body;

    if (!eventId || !userId) {
      return res.status(400).json({ message: "Invalid eventId or userId" });
    }

    const eventR = await pool.query(
      `SELECT event_name
       FROM public.events
       WHERE id = $1 AND created_by = $2`,
      [eventId, userId]
    );

    if (eventR.rowCount === 0) {
      return res.status(404).json({ message: "Event not found or access denied." });
    }

    const eventName = eventR.rows[0].event_name;

    const regR = await pool.query(
      `SELECT attendee_email, attendee_name
       FROM public.registrations
       WHERE event_id = $1`,
      [eventId]
    );

    const filesR = await pool.query(
      `SELECT file_name, file_path, mime_type
       FROM public.event_media
       WHERE event_id = $1
       ORDER BY uploaded_at DESC`,
      [eventId]
    );

    if (filesR.rowCount === 0) {
      return res.status(400).json({ message: "No uploaded files to send." });
    }

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

    const linksHtml = filesR.rows
      .map((f) => {
        const url = `${baseUrl}/uploads/${encodeURIComponent(f.file_path)}`;
        return `<li><a href="${url}" target="_blank">${f.file_name}</a> (${f.mime_type})</li>`;
      })
      .join("");

    const transporter = createTransporter();

    let sent = 0;
    let failed = 0;

    for (const r of regR.rows) {
      const to = (r.attendee_email || "").trim();
      if (!to) continue;

      try {
        await transporter.sendMail({
          from: `"Event Manager" <${process.env.SMTP_USER}>`,
          to,
          subject: `Event Media: ${eventName}`,
          html: `
            <div style="font-family:Arial;line-height:1.6">
              <h3>Hello ${r.attendee_name || "Student"} 👋</h3>
              <p>Here are the files for <b>${eventName}</b>.</p>
              <ul>${linksHtml}</ul>
            </div>
          `,
        });

        sent++;
      } catch (mailErr) {
        console.error("Send mail failed for:", to, mailErr?.message || mailErr);
        failed++;
      }
    }

    return res.json({
      message: "Media links sent ✅",
      sentTo: sent,
      failed,
    });
  } catch (err) {
    console.error("Send media error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

export default router;