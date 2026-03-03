import {
  degrees,
  PDFDocument,
  rgb,
  StandardFonts,
} from 'pdf-lib';

export async function buildInvitePdf({ email, role }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4 aprox
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  // contenido simple
  page.drawText("INVITACION DE ACCESO", { x: 50, y: 780, size: 18, font });
  page.drawText(`Email: ${email}`, { x: 50, y: 740, size: 12, font });
  page.drawText(`Rol: ${role}`, { x: 50, y: 720, size: 12, font });

  // watermark
  const wmFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText("CONFIDENCIAL", {
    x: 80,
    y: 420,
    size: 60,
    font: wmFont,
    color: rgb(0.7, 0.7, 0.7),
    rotate: degrees(35),
    opacity: 0.25
  });

  return await pdf.save();
}