import { z } from 'zod';

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(["viewer", "editor", "admin"])
});

export function validateInvite(body) {
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(" | ");
    const err = new Error(msg);
    err.status = 400;
    throw err;
  }
  return parsed.data;
}