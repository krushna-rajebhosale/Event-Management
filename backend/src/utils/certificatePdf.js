import PDFDocument from "pdfkit";

export function generateCertificatePdf({ attendeeName, eventName, eventDate }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40
    });

    const buffers = [];
    doc.on("data", (d) => buffers.push(d));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Background
    doc.rect(0, 0, pageWidth, pageHeight).fill("#fffdf8");

    // Outer border
    doc
      .lineWidth(5)
      .strokeColor("#8c7851")
      .rect(20, 20, pageWidth - 40, pageHeight - 40)
      .stroke();

    // Inner border
    doc
      .lineWidth(1.5)
      .strokeColor("#d8c3a5")
      .rect(35, 35, pageWidth - 70, pageHeight - 70)
      .stroke();

    // Top heading
    doc
      .fillColor("#716040")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text("EVENT MANAGEMENT SYSTEM", 0, 55, { align: "center" });

    doc
      .fillColor("#020826")
      .font("Helvetica-Bold")
      .fontSize(32)
      .text("CERTIFICATE", 0, 95, { align: "center" });

    doc
      .fillColor("#8c7851")
      .font("Helvetica")
      .fontSize(20)
      .text("OF PARTICIPATION", 0, 132, { align: "center" });

    // Decorative line
    doc
      .moveTo(250, 170)
      .lineTo(pageWidth - 250, 170)
      .lineWidth(2)
      .strokeColor("#8c7851")
      .stroke();

    // Body text
    doc
      .fillColor("#4b4b4b")
      .font("Helvetica")
      .fontSize(18)
      .text("This certificate is proudly presented to", 0, 200, {
        align: "center"
      });

    // Attendee name
    doc
      .fillColor("#020826")
      .font("Helvetica-Bold")
      .fontSize(30)
      .text(attendeeName || "Participant", 0, 245, {
        align: "center",
        underline: true
      });

    doc
      .fillColor("#4b4b4b")
      .font("Helvetica")
      .fontSize(18)
      .text("for successfully participating in", 0, 300, {
        align: "center"
      });

    // Event name
    doc
      .fillColor("#8c7851")
      .font("Helvetica-Bold")
      .fontSize(24)
      .text(eventName || "Event", 0, 338, {
        align: "center"
      });

    // Date section
    doc
      .fillColor("#4b4b4b")
      .font("Helvetica")
      .fontSize(16)
      .text(`Held on: ${eventDate || "-"}`, 0, 388, {
        align: "center"
      });

    // Footer lines
    const footerY = 470;

    doc
      .strokeColor("#8c7851")
      .lineWidth(1)
      .moveTo(120, footerY)
      .lineTo(280, footerY)
      .stroke();

    doc
      .moveTo(pageWidth - 280, footerY)
      .lineTo(pageWidth - 120, footerY)
      .stroke();

    doc
      .fillColor("#020826")
      .font("Helvetica")
      .fontSize(14)
      .text("Authorized Signature", 120, footerY + 8, {
        width: 160,
        align: "center"
      });

    doc
      .text("Event Coordinator", pageWidth - 280, footerY + 8, {
        width: 160,
        align: "center"
      });

    // Bottom note
    doc
      .fillColor("#716040")
      .font("Helvetica-Oblique")
      .fontSize(12)
      .text("Issued by Event Management System", 0, pageHeight - 60, {
        align: "center"
      });

    doc.end();
  });
}