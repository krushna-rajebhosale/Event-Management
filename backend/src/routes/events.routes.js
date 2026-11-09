import { Router } from "express";
import { pool } from "../config/db.js";

const router = Router();

/**
 * GET /api/events
 * list only current user's events
 */
router.get("/", async (req, res) => {
  try {
    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const q = `
      SELECT
        e.id,
        e.event_name,
        e.start_at,
        e.end_at,
        e.venue_name,
        e.venue_address,
        e.registration_limit,
        e.status,
        COALESCE(reg_counts.registration_count, 0)::int AS registration_count,
        COALESCE(ci_counts.checkin_count, 0)::int AS checkin_count
      FROM public.events e
      LEFT JOIN (
        SELECT event_id, COUNT(*) AS registration_count
        FROM public.registrations
        GROUP BY event_id
      ) reg_counts ON reg_counts.event_id = e.id
      LEFT JOIN (
        SELECT event_id, COUNT(*) AS checkin_count
        FROM public.registrations
        WHERE status = 'Checked In'
        GROUP BY event_id
      ) ci_counts ON ci_counts.event_id = e.id
      WHERE e.created_by = $1
      ORDER BY
        CASE
          WHEN e.start_at <= NOW() AND e.end_at >= NOW() THEN 1
          WHEN e.start_at > NOW() THEN 2
          ELSE 3
        END ASC,
        e.start_at ASC;
    `;

    const result = await pool.query(q, [userId]);
    return res.json(result.rows);
  } catch (err) {
    console.error("Get events error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * GET /api/events/:id
 * fetch one event only if it belongs to current user
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const r = await pool.query(
      `SELECT
         id,
         event_name,
         event_description,
         event_category,
         organizer_name,
         organizer_contact,
         start_at,
         end_at,
         venue_name,
         venue_address,
         google_maps_link,
         registration_limit,
         registration_deadline,
         enable_qrcode,
         is_ticketed,
         ticket_type,
         ticket_price,
         max_tickets_per_user,
         status,
         created_by
       FROM public.events
       WHERE id = $1 AND created_by = $2`,
      [id, userId]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Event not found or access denied." });
    }

    return res.json(r.rows[0]);
  } catch (err) {
    console.error("Get event by id error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/events
 * create event
 */
router.post("/", async (req, res) => {
  try {
    const {
      eventName,
      eventDescription,
      eventCategory,
      organizerName,
      organizerContact,
      startDate,
      startTime,
      endDate,
      endTime,
      venueName,
      venueAddress,
      googleMapsLink,
      registrationLimit,
      registrationDeadline,
      enableQRCode,
      isTicketed,
      ticketType,
      ticketPrice,
      maxTicketsPerUser,
      status,
      createdBy
    } = req.body;

    if (!eventName || !eventDescription || !eventCategory) {
      return res.status(400).json({ message: "Event details are required." });
    }

    const startAt = `${startDate} ${startTime}`;
    const endAt = `${endDate} ${endTime}`;

    const q = `
      INSERT INTO public.events(
        event_name, event_description, event_category,
        organizer_name, organizer_contact,
        start_at, end_at,
        venue_name, venue_address, google_maps_link,
        registration_limit, registration_deadline, enable_qrcode,
        is_ticketed, ticket_type, ticket_price, max_tickets_per_user,
        status, created_by
      )
      VALUES(
        $1,$2,$3,
        $4,$5,
        $6,$7,
        $8,$9,$10,
        $11,$12,$13,
        $14,$15,$16,$17,
        $18,$19
      )
      RETURNING *;
    `;

    const values = [
      eventName,
      eventDescription,
      eventCategory,
      organizerName || null,
      organizerContact || null,
      startAt,
      endAt,
      venueName || null,
      venueAddress || null,
      googleMapsLink || null,
      Number(registrationLimit || 0),
      registrationDeadline || null,
      Boolean(enableQRCode),
      Boolean(isTicketed),
      isTicketed ? (ticketType || "general") : null,
      isTicketed ? Number(ticketPrice || 0) : null,
      isTicketed ? Number(maxTicketsPerUser || 1) : null,
      status || "published",
      createdBy || null
    ];

    const result = await pool.query(q, values);
    return res.status(201).json({
      message: "Event created ✅",
      event: result.rows[0]
    });
  } catch (err) {
    console.error("Create event error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * PUT /api/events/:id
 * update only own event
 */
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      eventName,
      eventDescription,
      eventCategory,
      organizerName,
      organizerContact,
      startDate,
      startTime,
      endDate,
      endTime,
      venueName,
      venueAddress,
      googleMapsLink,
      registrationLimit,
      registrationDeadline,
      enableQRCode,
      isTicketed,
      ticketType,
      ticketPrice,
      maxTicketsPerUser,
      status,
      createdBy
    } = req.body;

    const startAt = `${startDate} ${startTime}`;
    const endAt = `${endDate} ${endTime}`;

    const q = `
      UPDATE public.events SET
        event_name = $1,
        event_description = $2,
        event_category = $3,
        organizer_name = $4,
        organizer_contact = $5,
        start_at = $6,
        end_at = $7,
        venue_name = $8,
        venue_address = $9,
        google_maps_link = $10,
        registration_limit = $11,
        registration_deadline = $12,
        enable_qrcode = $13,
        is_ticketed = $14,
        ticket_type = $15,
        ticket_price = $16,
        max_tickets_per_user = $17,
        status = $18
      WHERE id = $19 AND created_by = $20
      RETURNING *;
    `;

    const values = [
      eventName,
      eventDescription,
      eventCategory,
      organizerName || null,
      organizerContact || null,
      startAt,
      endAt,
      venueName || null,
      venueAddress || null,
      googleMapsLink || null,
      Number(registrationLimit || 0),
      registrationDeadline || null,
      Boolean(enableQRCode),
      Boolean(isTicketed),
      Boolean(isTicketed) ? (ticketType || "general") : null,
      Boolean(isTicketed) ? Number(ticketPrice || 0) : null,
      Boolean(isTicketed) ? Number(maxTicketsPerUser || 1) : null,
      status || "published",
      id,
      createdBy
    ];

    const r = await pool.query(q, values);

    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Event not found or access denied." });
    }

    return res.json({ message: "Event updated ✅", event: r.rows[0] });
  } catch (err) {
    console.error("Update event error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/events/:id/duplicate
 */
router.post("/:id/duplicate", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { userId } = req.body;

    const existing = await pool.query(
      `SELECT *
       FROM public.events
       WHERE id = $1 AND created_by = $2`,
      [id, userId]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Event not found or access denied." });
    }

    const e = existing.rows[0];

    const result = await pool.query(
      `INSERT INTO public.events(
        event_name, event_description, event_category,
        organizer_name, organizer_contact,
        start_at, end_at,
        venue_name, venue_address, google_maps_link,
        registration_limit, registration_deadline, enable_qrcode,
        is_ticketed, ticket_type, ticket_price, max_tickets_per_user,
        status, created_by
      )
      VALUES(
        $1,$2,$3,
        $4,$5,
        $6,$7,
        $8,$9,$10,
        $11,$12,$13,
        $14,$15,$16,$17,
        $18,$19
      )
      RETURNING *`,
      [
        `${e.event_name} (Copy)`,
        e.event_description,
        e.event_category,
        e.organizer_name,
        e.organizer_contact,
        e.start_at,
        e.end_at,
        e.venue_name,
        e.venue_address,
        e.google_maps_link,
        e.registration_limit,
        e.registration_deadline,
        e.enable_qrcode,
        e.is_ticketed,
        e.ticket_type,
        e.ticket_price,
        e.max_tickets_per_user,
        "published",
        userId
      ]
    );

    return res.status(201).json({
      message: "Event duplicated ✅",
      event: result.rows[0]
    });
  } catch (err) {
    console.error("Duplicate event error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * DELETE /api/events/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.query.userId);

    const result = await pool.query(
      `DELETE FROM public.events
       WHERE id = $1 AND created_by = $2
       RETURNING id`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Event not found or access denied." });
    }

    return res.json({ message: "Event deleted ✅" });
  } catch (err) {
    console.error("Delete event error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

export default router;