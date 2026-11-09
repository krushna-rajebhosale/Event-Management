import { Router } from "express";
import { pool } from "../config/db.js";

const router = Router();

async function ensureSettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.app_settings (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

// GET all settings
router.get("/", async (req, res) => {
  try {
    await ensureSettingsTable();

    const r = await pool.query(`
      SELECT key, value
      FROM public.app_settings
      ORDER BY key
    `);

    const data = {};
    for (const row of r.rows) {
      data[row.key] = row.value;
    }

    return res.json(data);
  } catch (err) {
    console.error("Get settings error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST save one settings group
router.post("/", async (req, res) => {
  try {
    await ensureSettingsTable();

    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ message: "key and value are required" });
    }

    await pool.query(
      `INSERT INTO public.app_settings(key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key)
       DO UPDATE SET
         value = EXCLUDED.value,
         updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );

    return res.json({ message: "Settings saved ✅" });
  } catch (err) {
    console.error("Save settings error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

export default router;