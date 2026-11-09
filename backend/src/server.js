import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import registrationsRoutes from "./routes/registrations.routes.js";
import publicRoutes from "./routes/public.routes.js";
import checkinRoutes from "./routes/checkin.routes.js";
import supportRoutes from "./routes/support.routes.js";
import eventMediaRoutes from "./routes/eventMedia.routes.js";
import { startReminderJob } from "./jobs/reminder.job.js";
import settingsRoutes from "./routes/settings.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import reportsRoutes from "./routes/reports.routes.js";

dotenv.config();

const app = express();

// ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// uploads folder
const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// middlewares
app.use(cors({ origin: "http://localhost:4200" }));
app.use(express.json());

// serve uploaded files
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/api/health", (req, res) => res.json({ ok: true }));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/registrations", registrationsRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/checkin", checkinRoutes);
app.use("/api/event-media", eventMediaRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/reports", reportsRoutes);

// safety logs
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

// start server
app.listen(process.env.PORT || 3000, () => {
  console.log(`✅ Server running on port ${process.env.PORT || 3000}`);
  startReminderJob();
});