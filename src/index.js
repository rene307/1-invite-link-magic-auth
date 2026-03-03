import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { initDb } from './db.js';
import {
  createInvite,
  listInvites,
  redeemInvite,
  verifyInvite,
} from './invite.service.js';
import { buildInvitePdf } from './pdf.service.js';
import { validateInvite } from './validate.js';

initDb();

const app = express();

app.use(helmet());
app.use(express.json());

app.use(cors({
  origin: process.env.APP_ORIGIN,
  credentials: false
}));

const inviteLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

// health
app.get("/api/health", (_, res) => res.json({ ok: true }));

// generar
app.post("/api/invites", inviteLimiter, async (req, res, next) => {
  try {
    const data = validateInvite(req.body);
    const ttl = Number(process.env.TOKEN_TTL_MINUTES || 60);

    const { token, expiresAt } = await createInvite(data, ttl);

    // OJO: mejor en producción usar fragment "#token=" (no query)
    const link = `${process.env.APP_ORIGIN}/welcome#token=${token}`;

    res.json({
      ok: true,
      link,
      expiresAt
    });
  } catch (e) {
    next(e);
  }
});

// verificar (no consume)
app.post("/api/invites/verify", async (req, res, next) => {
  try {
    const token = String(req.body?.token || "");
    if (!token) return res.status(400).json({ ok: false, reason: "TOKEN_REQUIRED" });

    const result = await verifyInvite(token);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (e) {
    next(e);
  }
});

// canjear (consume)
app.post("/api/invites/redeem", async (req, res, next) => {
  try {
    const token = String(req.body?.token || "");
    if (!token) return res.status(400).json({ ok: false, reason: "TOKEN_REQUIRED" });

    const result = await redeemInvite(token);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (e) {
    next(e);
  }
});

// lista reciente (portfolio)
app.get("/api/invites/recent", async (req, res, next) => {
  try {
    const items = await listInvites(10);
    res.json({ ok: true, items });
  } catch (e) {
    next(e);
  }
});

// (opcional) PDF con watermark
app.post("/api/invites/pdf", async (req, res, next) => {
  try {
    const { email, role } = validateInvite(req.body);
    const bytes = await buildInvitePdf({ email, role });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=invite.pdf");
    res.send(Buffer.from(bytes));
  } catch (e) {
    next(e);
  }
});

// error handler
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    ok: false,
    error: err.message || "SERVER_ERROR"
  });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API on http://localhost:${port}`));