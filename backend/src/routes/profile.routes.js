import { Router } from "express";
import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";

const router = Router();

// GET profile
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    console.log("✅ profile route hit, id =", id);

    const result = await pool.query(
      `SELECT "id", "full_name", "email"
       FROM public."users"
       WHERE "id" = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const row = result.rows[0];

    return res.json({
      id: row.id,
      name: row.full_name || "",
      email: row.email || "",
      profile_image: ""
    });
  } catch (err) {
    console.error("Get profile error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// UPDATE profile
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    const result = await pool.query(
      `UPDATE public."users"
       SET "full_name" = $1,
           "email" = $2
       WHERE "id" = $3
       RETURNING "id", "full_name", "email"`,
      [name.trim(), email.toLowerCase().trim(), id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const row = result.rows[0];

    return res.json({
      message: "Profile updated ✅",
      user: {
        id: row.id,
        name: row.full_name || "",
        email: row.email || "",
        profile_image: ""
      }
    });
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ message: "Email already exists." });
    }

    console.error("Update profile error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// CHANGE password
router.put("/:id/password", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required." });
    }

    const userResult = await pool.query(
      `SELECT "id", "password_hash"
       FROM public."users"
       WHERE "id" = $1`,
      [id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = userResult.rows[0];

    if (!user.password_hash) {
      return res.status(400).json({ message: "Password is not available for this user." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE public."users"
       SET "password_hash" = $1
       WHERE "id" = $2`,
      [hashedPassword, id]
    );

    return res.json({ message: "Password changed ✅" });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

export default router;