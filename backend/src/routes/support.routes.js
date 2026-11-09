import { Router } from "express";
import nodemailer from "nodemailer";

const router = Router();

router.post("/ticket", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || "true") === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const toEmail = process.env.SUPPORT_TO || process.env.SMTP_USER;

    const mailSubject = `[Support] ${subject}`;
    const textBody =
`New Support Ticket

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2>New Support Ticket</h2>
        <p><b>Name:</b> ${escapeHtml(name)}</p>
        <p><b>Email:</b> ${escapeHtml(email)}</p>
        <p><b>Subject:</b> ${escapeHtml(subject)}</p>
        <p><b>Message:</b><br/>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"${process.env.SUPPORT_FROM_NAME || "Support"}" <${process.env.SMTP_USER}>`,
      to: toEmail,
      replyTo: email, // so you can reply directly to the user
      subject: mailSubject,
      text: textBody,
      html: htmlBody,
    });

    return res.json({ message: "Ticket sent ✅ We will contact you soon." });
  } catch (err) {
    console.error("Support ticket error:", err);
    return res.status(500).json({ message: "Failed to send ticket." });
  }
});

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default router;