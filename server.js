import 'dotenv/config';

import cors from 'cors';
import crypto from 'crypto';
import express from 'express';
import helmet from 'helmet';
import nodemailer from 'nodemailer';
import {
  degrees,
  PDFDocument,
  rgb,
  StandardFonts,
} from 'pdf-lib';

const app = express();

// --- Config ---
const API_PORT = Number(process.env.API_PORT || 4000);

// Si sirves los HTML desde Express (public/), usa 4000.
// Si tu React está en 3000, cambia WEB_ORIGIN a http://localhost:3000
const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:4000";

const TOKEN_TTL = 15 * 60 * 1000; // 15 min
const DOMAINS = ["privmail.example", "alias.example", "secure.example"];

// --- Middlewares ---
app.use(helmet());
app.use(express.json());

// CORS: permite que un front (React) te consuma.
// Si todo está en 4000 (public/), CORS ni siquiera es necesario, pero no molesta.
app.use(cors({ origin: WEB_ORIGIN }));

// Sirve /public (index.html, welcome.html, styles.css)
app.use(express.static("public"));

// tokenHash -> data (demo: memoria)
const sessions = new Map();

// --- Mailer ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendInviteEmail({ to, link, expiresAt, pdfBytes }) {
  const when = new Date(expiresAt).toLocaleString();

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME || "Invite Demo"}" <${process.env.FROM_EMAIL}>`,
    to,
    subject: "Tu invitación + PDF",
    html: `
      <p>Hola 👋</p>
      <p>Tu enlace de acceso:</p>
      <p><a href="${link}">${link}</a></p>
      <p><b>Expira:</b> ${when}</p>
      <p>Adjunto va tu PDF.</p>
    `,
    attachments: [
      {
        filename: "invite.pdf",
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf",
      },
    ],
  });
}

// --- Helpers ---
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeUsername(u) {
  return String(u || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

async function buildInvitePdf({ email, alt }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([600, 400]);

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText("INVITE LINK DEMO", {
    x: 50,
    y: 350,
    size: 20,
    font: bold,
    color: rgb(0, 0, 0),
  });

  page.drawText(email, { x: 50, y: 300, size: 16, font });
  page.drawText(`Alt: ${alt}`, { x: 50, y: 270, size: 16, font });

  page.drawText("CONFIDENCIAL", {
    x: 90,
    y: 170,
    size: 48,
    font: bold,
    color: rgb(0.7, 0.7, 0.7),
    rotate: degrees(25),
    opacity: 0.25,
  });

  return await pdf.save(); // Uint8Array
}

// --- Base ---
app.get("/", (req, res) => res.send("API OK ✅ Usa /api/health"));
app.get("/api/health", (req, res) => res.json({ ok: true }));

// --- INVITE (ahora envía correo + PDF adjunto) ---
app.post("/api/invite", async (req, res) => {
  try {
    const usernameRaw = req.body?.username;
    const domain = req.body?.domain;

    const username = normalizeUsername(usernameRaw);

    if (!username || username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: "Username inválido (3-30, solo a-z 0-9 . _ -)" });
    }
    if (!DOMAINS.includes(domain)) {
      return res.status(400).json({ error: "Dominio inválido" });
    }

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = Date.now() + TOKEN_TTL;

    sessions.set(tokenHash, {
      username,
      domain,
      alt: "alt.example",
      expiresAt,
      usedAt: null,
      createdAt: Date.now(),
    });

    const link = `${WEB_ORIGIN}/welcome.html#token=${token}`;

    // ⚠️ Email real para prueba:
    // - Si quieres mandar a username@domain (falso), NO va a llegar.
    // - Para test, usa MAIL_TO en .env
    const to = process.env.MAIL_TO || `${username}@${domain}`;

    const email = `${username}@${domain}`;
    const alt = `${username}@alt.example`;

    const pdfBytes = await buildInvitePdf({ email, alt });

    await sendInviteEmail({ to, link, expiresAt, pdfBytes });

    res.json({ ok: true, link, expiresAt, sentTo: to });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo enviar el correo (revisa SMTP/.env)" });
  }
});

// --- VERIFICAR SESION (NO consume) ---
app.get("/api/session/:token", (req, res) => {
  const token = String(req.params.token || "");
  if (!token) return res.status(400).json({ error: "Token requerido" });

  const tokenHash = hashToken(token);
  const data = sessions.get(tokenHash);

  if (!data) return res.status(404).json({ error: "Token inválido" });
  if (Date.now() > data.expiresAt) return res.status(404).json({ error: "Token expirado" });
  if (data.usedAt) return res.status(409).json({ error: "Token ya usado" });

  res.json({
    username: data.username,
    domain: data.domain,
    alt: data.alt,
    expiresAt: data.expiresAt,
  });
});

// --- REDEEM (consume one-time) ---
app.post("/api/redeem/:token", (req, res) => {
  const token = String(req.params.token || "");
  if (!token) return res.status(400).json({ error: "Token requerido" });

  const tokenHash = hashToken(token);
  const data = sessions.get(tokenHash);

  if (!data) return res.status(404).json({ error: "Token inválido" });
  if (Date.now() > data.expiresAt) return res.status(404).json({ error: "Token expirado" });
  if (data.usedAt) return res.status(409).json({ error: "Token ya usado" });

  data.usedAt = Date.now();
  sessions.set(tokenHash, data);

  res.json({ ok: true, user: { email: `${data.username}@${data.domain}`, role: "viewer" } });
});

// --- PDF (sigue disponible por endpoint) ---
app.get("/api/pdf/:token", async (req, res) => {
  const token = String(req.params.token || "");
  if (!token) return res.status(400).send("Token requerido");

  const tokenHash = hashToken(token);
  const data = sessions.get(tokenHash);

  if (!data) return res.status(404).send("Token inválido");
  if (Date.now() > data.expiresAt) return res.status(404).send("Token expirado");
  if (data.usedAt) return res.status(409).send("Token ya usado");

  const email = `${data.username}@${data.domain}`;
  const alt = `${data.username}@${data.alt}`;
  const bytes = await buildInvitePdf({ email, alt });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=invite.pdf");
  res.send(Buffer.from(bytes));
});

app.listen(API_PORT, () => {
  console.log(`API corriendo en http://localhost:${API_PORT}`);
});