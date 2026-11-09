import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendCertificateEmail({ to, attendeeName, eventName, pdfBuffer }) {
  if (!to || String(to).trim() === "") {
    console.warn("⚠️ No recipient email, skipping certificate.");
    return { ok: false, skipped: true, reason: "No recipient email" };
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Event Manager" <${process.env.SMTP_USER}>`,
    to,
    subject: `Participation Certificate - ${eventName || "Event"}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #222; max-width: 600px; margin: auto; padding: 20px;">
        <div style="border: 1px solid #e5d7c3; border-radius: 12px; padding: 24px; background: #fffdf9;">
          <h2 style="margin-top: 0; color: #5d5048;">Certificate of Participation 🎓</h2>

          <p>Hello <b>${attendeeName || "Participant"}</b>,</p>

          <p>
            Congratulations! Thank you for participating in
            <b>${eventName || "Event"}</b>.
          </p>

          <p>
            Your participation certificate is attached to this email as a PDF file.
          </p>

          <p>
            Please download and keep it safely for your records.
          </p>

          <div style="margin-top: 24px; padding: 14px; background: #f8f1e7; border-radius: 8px; color: #5d5048;">
            <b>Attached:</b> Participation Certificate (PDF)
          </div>

          <p style="margin-top: 24px;">
            Best regards,<br>
            <b>Event Management Team</b>
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `certificate-${String(eventName || "event").replace(/[^a-z0-9]/gi, "_")}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  return { ok: true, skipped: false, reason: "" };
}