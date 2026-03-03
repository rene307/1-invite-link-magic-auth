import {
  all,
  get,
  run,
} from './db.js';
import {
  generateToken,
  hashToken,
  minutesToMs,
  nowMs,
} from './security.js';

export async function createInvite({ email, role }, ttlMinutes) {
  const token = generateToken();
  const tokenHash = hashToken(token);

  const createdAt = nowMs();
  const expiresAt = createdAt + minutesToMs(ttlMinutes);

  await run(
    `INSERT INTO invites (email, role, tokenHash, expiresAt, usedAt, createdAt)
     VALUES (?, ?, ?, ?, NULL, ?)`,
    [email, role, tokenHash, expiresAt, createdAt]
  );

  return { token, expiresAt };
}

export async function verifyInvite(token) {
  const tokenHash = hashToken(token);
  const row = await get(`SELECT * FROM invites WHERE tokenHash = ?`, [tokenHash]);

  if (!row) return { ok: false, reason: "NOT_FOUND" };

  const now = nowMs();
  if (row.usedAt) return { ok: false, reason: "USED" };
  if (now > row.expiresAt) return { ok: false, reason: "EXPIRED" };

  return {
    ok: true,
    invite: {
      email: row.email,
      role: row.role,
      expiresAt: row.expiresAt
    }
  };
}

export async function redeemInvite(token) {
  const tokenHash = hashToken(token);
  const row = await get(`SELECT * FROM invites WHERE tokenHash = ?`, [tokenHash]);

  if (!row) return { ok: false, reason: "NOT_FOUND" };

  const now = nowMs();
  if (row.usedAt) return { ok: false, reason: "USED" };
  if (now > row.expiresAt) return { ok: false, reason: "EXPIRED" };

  await run(`UPDATE invites SET usedAt = ? WHERE tokenHash = ?`, [now, tokenHash]);

  // Aquí normalmente: crear usuario / sesión / etc.
  return { ok: true, user: { email: row.email, role: row.role } };
}

export async function listInvites(limit = 10) {
  return all(
    `SELECT email, role, expiresAt, usedAt, createdAt
     FROM invites
     ORDER BY createdAt DESC
     LIMIT ?`,
    [limit]
  );
}