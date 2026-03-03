import React, { useEffect, useMemo, useState } from "react";
import { createInvite, recentInvites, redeemToken, verifyToken } from "./api";
import "./styles.css";

function getTokenFromHash() {
  // /welcome#token=XXXX
  const h = window.location.hash || "";
  const m = h.match(/token=([a-f0-9]+)/i);
  return m ? m[1] : "";
}

function formatCountdown(ms) {
  if (ms <= 0) return "Expirado";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function App() {
  const isWelcome = useMemo(() => window.location.pathname.includes("welcome"), []);
  return isWelcome ? <Welcome /> : <Generate />;
}

function Generate() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(false);

  const [link, setLink] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [toast, setToast] = useState("");
  const [recent, setRecent] = useState([]);

  async function loadRecent() {
    const r = await recentInvites();
    if (r.ok) setRecent(r.items);
  }

  useEffect(() => {
    loadRecent();
  }, []);

  async function onGenerate() {
    setLoading(true);
    setToast("");
    setLink("");
    setExpiresAt(null);

    const r = await createInvite(email, role);
    setLoading(false);

    if (!r.ok) {
      setToast(r.error || "Error generando enlace");
      return;
    }

    setLink(r.link);
    setExpiresAt(r.expiresAt);
    setToast("Enlace generado ✅");
    loadRecent();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setToast("Copiado ✅");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast("No se pudo copiar");
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Generar acceso</h1>

        <label>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@dominio.com"
        />

        <label>Rol</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="viewer">viewer</option>
          <option value="editor">editor</option>
          <option value="admin">admin</option>
        </select>

        <button disabled={loading} onClick={onGenerate}>
          {loading ? "Generando..." : "Generar enlace"}
        </button>

        {toast && <div className="toast">{toast}</div>}

        {link && (
          <div className="box">
            <div className="row">
              <a href={link} target="_blank" rel="noreferrer">{link}</a>
              <button className="secondary" onClick={copy}>Copiar</button>
            </div>
            <small>
              Expira: {expiresAt ? new Date(expiresAt).toLocaleString() : "-"}
            </small>
            <small className="hint">
              Pro-tip: usamos <b>#token=</b> para evitar que el token viaje en querystring.
            </small>
          </div>
        )}

        <h2>Invitaciones recientes</h2>
        <div className="table">
          <div className="thead">
            <span>Email</span><span>Rol</span><span>Estado</span>
          </div>
          {recent.map((x, i) => {
            const now = Date.now();
            const expired = now > x.expiresAt;
            const used = !!x.usedAt;
            const status = used ? "Usado" : expired ? "Expirado" : "Activo";
            return (
              <div key={i} className="trow">
                <span>{x.email}</span>
                <span>{x.role}</span>
                <span className={used ? "badge used" : expired ? "badge exp" : "badge ok"}>
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Welcome() {
  const [token] = useState(() => getTokenFromHash());
  const [state, setState] = useState({ loading: true, ok: false, reason: "", invite: null });
  const [msLeft, setMsLeft] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) {
        setState({ loading: false, ok: false, reason: "TOKEN_REQUIRED", invite: null });
        return;
      }
      const r = await verifyToken(token);
      if (!r.ok) {
        setState({ loading: false, ok: false, reason: r.reason || "INVALID", invite: null });
        return;
      }
      setState({ loading: false, ok: true, reason: "", invite: r.invite });
    })();
  }, [token]);

  useEffect(() => {
    if (!state.ok || !state.invite) return;
    const t = setInterval(() => {
      setMsLeft(state.invite.expiresAt - Date.now());
    }, 250);
    return () => clearInterval(t);
  }, [state.ok, state.invite]);

  async function onRedeem() {
    const r = await redeemToken(token);
    if (!r.ok) {
      setDone(false);
      alert(`No se pudo canjear: ${r.reason || "ERROR"}`);
      return;
    }
    setDone(true);
    alert(`Acceso OK: ${r.user.email} (${r.user.role})`);
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Bienvenido</h1>

        {state.loading && <p>Cargando...</p>}

        {!state.loading && !state.ok && (
          <div className="box">
            <p className="bad">Link inválido</p>
            <small>Motivo: {state.reason}</small>
          </div>
        )}

        {!state.loading && state.ok && state.invite && (
          <div className="box">
            <p><b>Email:</b> {state.invite.email}</p>
            <p><b>Rol:</b> {state.invite.role}</p>

            <div className="row">
              <span className={msLeft <= 0 ? "badge exp" : msLeft < 60_000 ? "badge warn" : "badge ok"}>
                {formatCountdown(msLeft)}
              </span>
              <button disabled={msLeft <= 0 || done} onClick={onRedeem}>
                {done ? "Canjeado ✅" : "Canjear acceso"}
              </button>
            </div>

            <small className="hint">
              Este token es <b>one-time</b> (se marca como usado) y tiene expiración.
            </small>
          </div>
        )}
      </div>
    </div>
  );
}