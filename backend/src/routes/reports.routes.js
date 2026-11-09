import { Router } from "express";
import { pool } from "../config/db.js";

const router = Router();

/**
 * GET /api/reports/events
 * List completed events only for logged-in user's data
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
        id,
        event_name,
        start_at,
        end_at
      FROM public.events
      WHERE end_at < NOW()
        AND created_by = $1
      ORDER BY end_at DESC
      `,
      [userId]
    );

    const events = result.rows.map((e) => ({
      id: e.id,
      name: e.event_name,
      date: e.end_at || e.start_at,
      status: "Completed"
    }));

    return res.json(events);
  } catch (err) {
    console.error("Reports events error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * GET /api/reports/:eventId
 * Generate report only if event belongs to logged-in user
 */
router.get("/:eventId", async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const eventR = await pool.query(
      `
      SELECT
        id,
        event_name,
        is_ticketed,
        ticket_price
      FROM public.events
      WHERE id = $1
        AND created_by = $2
      `,
      [eventId, userId]
    );

    if (eventR.rowCount === 0) {
      return res.status(404).json({ message: "Event not found or access denied." });
    }

    const regs = await pool.query(
      `
      SELECT
        attendee_name,
        attendee_email,
        ticket_type,
        status
      FROM public.registrations
      WHERE event_id = $1
      `,
      [eventId]
    );

    const event = eventR.rows[0];

    const registrations = regs.rows.filter(
      (r) => String(r.status || "").toLowerCase() !== "cancelled"
    );

    const checkedIn = registrations.filter((r) => r.status === "Checked In");

    const totalRegistrations = registrations.length;
    const checkedInCount = checkedIn.length;
    const attendancePercentage =
      totalRegistrations > 0 ? (checkedInCount / totalRegistrations) * 100 : 0;

    let totalRevenue = 0;
    if (event.is_ticketed && Number(event.ticket_price || 0) > 0) {
      totalRevenue = registrations.length * Number(event.ticket_price || 0);
    }

    const ticketSalesMap = {};
    for (const reg of registrations) {
      const type = reg.ticket_type || "General Admission";
      ticketSalesMap[type] = (ticketSalesMap[type] || 0) + 1;
    }

    const ticketSales = Object.entries(ticketSalesMap).map(([type, count]) => ({
      type,
      count
    }));

    const demographicsMap = {
      "Checked In": checkedInCount,
      "Pending": registrations.filter((r) => r.status === "Pending").length,
      "Cancelled": regs.rows.filter((r) => r.status === "Cancelled").length
    };

    const demographics = Object.entries(demographicsMap)
      .filter(([, count]) => Number(count) > 0)
      .map(([group, count]) => ({
        group,
        count
      }));

    return res.json({
      totalRegistrations,
      checkedInCount,
      attendancePercentage,
      totalRevenue,
      ticketSales,
      demographics
    });
  } catch (err) {
    console.error("Generate report error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

export default router;