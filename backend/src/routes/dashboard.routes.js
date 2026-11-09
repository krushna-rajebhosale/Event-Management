import { Router } from "express";
import { pool } from "../config/db.js";

const router = Router();

router.get("/summary", async (req, res) => {
  try {
    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const upcoming = await pool.query(`
      SELECT 
        e.id,
        e.event_name,
        e.start_at,
        e.end_at,
        e.registration_limit,
        e.registration_deadline,
        e.venue_name,
        e.venue_address,
        e.status,
        COALESCE(COUNT(r.id), 0)::int AS registrations,
        COALESCE(SUM(CASE WHEN r.status = 'Checked In' THEN 1 ELSE 0 END), 0)::int AS checkins
      FROM public.events e
      LEFT JOIN public.registrations r ON r.event_id = e.id
      WHERE e.created_by = $1
        AND (
          (e.start_at >= NOW() AND LOWER(e.status) IN ('upcoming', 'published'))
          OR
          (e.start_at <= NOW() AND e.end_at >= NOW() AND LOWER(e.status) IN ('upcoming', 'published'))
        )
      GROUP BY
        e.id,
        e.event_name,
        e.start_at,
        e.end_at,
        e.registration_limit,
        e.registration_deadline,
        e.venue_name,
        e.venue_address,
        e.status
      ORDER BY
        CASE
          WHEN e.start_at <= NOW() AND e.end_at >= NOW() THEN 1
          WHEN e.start_at > NOW() THEN 2
          ELSE 3
        END,
        e.start_at ASC
      LIMIT 50
    `, [userId]);

    const upcomingCount = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM public.events
      WHERE created_by = $1
        AND (
          (start_at >= NOW() AND LOWER(status) IN ('upcoming', 'published'))
          OR
          (start_at <= NOW() AND end_at >= NOW() AND LOWER(status) IN ('upcoming', 'published'))
        )
    `, [userId]);

    const recentRegs = await pool.query(`
      SELECT
        r.id,
        r.attendee_name,
        r.attendee_email,
        r.status,
        r.registered_at,
        e.event_name
      FROM public.registrations r
      JOIN public.events e ON e.id = r.event_id
      WHERE e.created_by = $1
      ORDER BY r.registered_at DESC
      LIMIT 20
    `, [userId]);

    const totalRegs = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM public.registrations r
      JOIN public.events e ON e.id = r.event_id
      WHERE e.created_by = $1
    `, [userId]);

    const regsToday = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM public.registrations r
      JOIN public.events e ON e.id = r.event_id
      WHERE e.created_by = $1
        AND DATE(r.registered_at) = CURRENT_DATE
    `, [userId]);

    const checkinsOngoing = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM public.registrations r
      JOIN public.events e ON e.id = r.event_id
      WHERE e.created_by = $1
        AND r.status = 'Checked In'
    `, [userId]);

    const trends = await pool.query(`
      SELECT
        TO_CHAR(day_date, 'Dy') AS day,
        COALESCE(COUNT(r.id), 0)::int AS registrations
      FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS day_date
      LEFT JOIN public.registrations r
        ON DATE(r.registered_at) = DATE(day_date)
      LEFT JOIN public.events e
        ON e.id = r.event_id
       AND e.created_by = $1
      GROUP BY day_date
      ORDER BY day_date ASC
    `, [userId]);

    const kpi = {
      upcomingEvents: Number(upcomingCount.rows[0].count || 0),
      registrationsToday: Number(regsToday.rows[0].count || 0),
      totalRegistrations: Number(totalRegs.rows[0].count || 0),
      checkInsOngoing: Number(checkinsOngoing.rows[0].count || 0)
    };

    return res.json({
      kpi,
      upcomingEvents: upcoming.rows,
      recentRegistrations: recentRegs.rows,
      registrationTrends: trends.rows
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

export default router;