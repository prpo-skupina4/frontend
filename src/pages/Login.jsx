import React from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../api";
import { getUserIdFromToken } from "../utils/funkcije";

export default function Login() {
  const [mode, setMode] = React.useState("login"); // "login" ali "register"
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [userId, setUserId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

   
try {
      if (mode === "register") {
        const reg = await register(email, password, Number(userId));// backend: POST /auth/register expects JSON { email, password , userId}
        if (reg?.id != null) localStorage.setItem("userId", Number(reg.id));
      }

      const res = await login(email, password);// po loginu ali po registraciji -> login (da dobiš token)
      localStorage.setItem("token", res.access_token);
      const uid = getUserIdFromToken(res.access_token);
      if (uid == null || Number.isNaN(uid)) throw new Error("Token nima veljavnega userId (sub).");
      localStorage.setItem("userId", Number(uid));

      nav("/dashboard");
    } catch (err) {
      setError(err?.message || "Napaka");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", fontFamily: "system-ui" }}>
      <h1>{mode === "login" ? "Login" : "Register"}</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => { setMode("login"); setError(""); }}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ddd",
            background: mode === "login" ? "#eee" : "white",
            fontWeight: mode === "login" ? 700 : 400,
          }}
        >
          Login
        </button>

        <button
          type="button"
          onClick={() => { setMode("register"); setError(""); }}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ddd",
            background: mode === "register" ? "#eee" : "white",
            fontWeight: mode === "register" ? 700 : 400,
          }}
        >
          Register
        </button>
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        {mode === "register" && (
          <label>
            Vpisna številka
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="12345678"
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>
        )}

        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="email@example.com"
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <label>
          Geslo
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        {error && <div style={{ color: "crimson" }}>{error}</div>}

        <button disabled={loading} style={{ padding: 10 }}>
          {loading
            ? "Pošiljam..."
            : mode === "login"
              ? "Prijavi se"
              : "Registriraj se"}
        </button>
      </form>
    </div>
  );
}
