import bcrypt from "bcrypt";
import { pool } from "../config/db.js";

export async function register(req, res) {
  try {
    const { fullName, email, password } = req.body;

    // basic validation
    if (!fullName?.trim() || !email?.trim() || typeof password !== "string") {
      return res.status(400).json({ message: "All fields are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    // check existing email
    const existing = await pool.query(
  "SELECT id FROM public.users WHERE LOWER(email) = LOWER($1) LIMIT 1",
  [email.trim()]
);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Email already registered." });
    }

    // hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // insert user
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email, created_at`,
      [fullName.trim(), email.trim(), passwordHash]
    );

    return res.status(201).json({
      message: "User created successfully",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
}