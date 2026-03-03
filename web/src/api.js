const API = "http://localhost:4000/api";

export async function createInvite(email, role) {
  const r = await fetch(`${API}/invites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role })
  });
  return r.json();
}

export async function verifyToken(token) {
  const r = await fetch(`${API}/invites/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });
  return r.json();
}

export async function redeemToken(token) {
  const r = await fetch(`${API}/invites/redeem`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });
  return r.json();
}

export async function recentInvites() {
  const r = await fetch(`${API}/invites/recent`);
  return r.json();
}