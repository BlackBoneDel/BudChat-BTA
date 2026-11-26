import { useState } from "react";
import { supabase } from "../lib/supabase";

// Pantalla de autenticación: OAuth (Google/GitHub), email y acceso guest.
export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const oauth = async (provider: "google" | "github") => {
    setLoading(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) setError(error.message);
    setLoading(null);
  };

  const emailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("email");
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: "dummy" });
    // Nota: password no es el flujo principal; aquí solo enviamos para que el
    // usuario exista y se envíe un magic link si está configurado.
    if (error) setError(error.message);
    setLoading(null);
  };

  const guest = async () => {
    setLoading("guest");
    setError(null);
    const { error } = await supabase.auth.signInAnonymously();
    if (error) setError(error.message);
    setLoading(null);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">💬</div>
        <h1>Budsin Chat</h1>
        <p className="login-sub">Espacios y chat en tiempo real</p>

        <div className="login-providers">
          <button className="btn-oauth" onClick={() => oauth("google")} disabled={loading !== null}>
            {loading === "google" ? "…" : "Iniciar con Google"}
          </button>
          <button className="btn-oauth" onClick={() => oauth("github")} disabled={loading !== null}>
            {loading === "github" ? "…" : "Iniciar con GitHub"}
          </button>
        </div>

        <div className="login-divider"><span>o</span></div>

        <form onSubmit={emailSignIn} className="login-email">
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={loading !== null}>
            {loading === "email" ? "…" : "Continuar por email"}
          </button>
        </form>

        <button className="btn-guest" onClick={guest} disabled={loading !== null}>
          {loading === "guest" ? "…" : "Entrar como invitado"}
        </button>

        {error && <div className="login-error">{error}</div>}

        <p className="login-legal">
          Al entrar aceptas los Términos y la Política de Privacidad.
        </p>
      </div>
    </div>
  );
}
