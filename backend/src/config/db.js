import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),   // ✅ FIX
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// ✅ Recommended: don't keep a permanent client open
pool.query("SELECT 1")
  .then(r => console.log("📦 Connected to PostgreSQL Database",r.rows[0]))
  .catch(err => console.error("❌ Database connection error:", err.message));