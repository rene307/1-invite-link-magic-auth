import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendInviteEmail(to, link, expiresAt) {
  const when = new Date(expiresAt).toLocaleString();

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject: "Tu enlace de acceso (expira pronto)",
    text: `Aquí tu enlace: ${link}\nExpira: ${when}`,
    html: `
      <p>Aquí está tu enlace de acceso:</p>
      <p><a href="${link}">${link}</a></p>
      <p><b>Expira:</b> ${when}</p>
    `,
  });
}