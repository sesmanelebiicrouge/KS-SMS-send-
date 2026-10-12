"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Stage = "email" | "otp";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [stage, setStage] = useState<Stage>("email");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setNotice({ kind: "error", text: "Saisissez une adresse e-mail valide." });
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setEmail(normalizedEmail);
      setStage("otp");
      setNotice({ kind: "success", text: "Si cette adresse peut recevoir un code, consultez votre boîte mail et vos courriers indésirables." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Impossible d'envoyer le code. Réessayez plus tard." });
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const cleanToken = token.replace(/\s/g, "");
    if (!/^\d{6,8}$/.test(cleanToken)) {
      setNotice({ kind: "error", text: "Entrez le code numérique reçu par e-mail." });
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanToken,
        type: "email",
      });
      if (error) throw error;
      setNotice({ kind: "success", text: "Adresse e-mail confirmée. Votre session est ouverte." });
      router.push("/");
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Code invalide ou expiré. Demandez un nouveau code." });
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setNotice(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setNotice({ kind: "success", text: "Si l'adresse est autorisée, un nouveau code a été demandé. Vérifiez votre boîte mail." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Impossible de renvoyer le code pour le moment." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell authShell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="KS SMS Send accueil">
          <span className="brandIcon">KS</span><span>KS SMS <b>Send</b></span>
        </Link>
        <span className="environment"><i /> Création de compte</span>
      </header>
      <section className="authCard panel">
        <p className="eyebrow">VOTRE ESPACE PROFESSIONNEL</p>
        <h1>{stage === "email" ? "Créer votre compte" : "Confirmez votre e-mail"}</h1>
        <p className="authDescription">
          {stage === "email"
            ? "Saisissez votre adresse e-mail pour recevoir un code de confirmation à usage unique."
            : <>Un code a été demandé pour <strong>{email}</strong>. Saisissez-le ci-dessous pour confirmer votre adresse.</>}
        </p>

        {stage === "email" ? (
          <form onSubmit={requestCode}>
            <label htmlFor="email">Adresse e-mail</label>
            <input className="authInput" id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.com" />
            <button className="primaryButton authButton" type="submit" disabled={busy}>{busy ? "Envoi en cours…" : "Recevoir mon code"} {!busy && <span aria-hidden="true">→</span>}</button>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <label htmlFor="otp">Code de confirmation</label>
            <input className="authInput otpInput" id="otp" inputMode="numeric" autoComplete="one-time-code" required maxLength={8} value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, ""))} placeholder="123456" />
            <button className="primaryButton authButton" type="submit" disabled={busy}>{busy ? "Vérification…" : "Confirmer mon e-mail"}</button>
            <div className="authActions">
              <button className="textButton" type="button" disabled={busy} onClick={resendCode}>Renvoyer un code</button>
              <button className="textButton" type="button" disabled={busy} onClick={() => { setStage("email"); setToken(""); setNotice(null); }}>Modifier l&apos;e-mail</button>
            </div>
          </form>
        )}

        {notice && <div className={"notice " + notice.kind} role="status" aria-live="polite">{notice.text}</div>}
        <p className="authFoot"><Link className="textButton" href="/reset-password">Mot de passe oublié ? Récupérer par e-mail</Link></p>
        <p className="authFoot">En créant un compte, vous acceptez d&apos;utiliser le service conformément aux règles applicables et aux préférences de vos destinataires.</p>
      </section>
      <footer><span>© {new Date().getFullYear()} KS SMS Send</span><Link className="textButton" href="/">Retour à l&apos;accueil</Link></footer>
    </main>
  );
}
