"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Stage = "email" | "otp" | "password";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [stage, setStage] = useState<Stage>("email");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
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
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
      if (error) throw error;
      setEmail(normalizedEmail);
      setStage("otp");
      setNotice({ kind: "success", text: "Si un compte correspond à cette adresse, un e-mail de récupération a été demandé. Consultez aussi vos courriers indésirables." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Impossible de demander la récupération. Réessayez plus tard." });
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
        type: "recovery",
      });
      if (error) throw error;
      setStage("password");
      setNotice({ kind: "success", text: "Adresse vérifiée. Choisissez maintenant un nouveau mot de passe." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Code invalide ou expiré. Demandez un nouvel e-mail de récupération." });
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (password.length < 8) {
      setNotice({ kind: "error", text: "Choisissez un mot de passe d'au moins 8 caractères." });
      return;
    }
    if (password !== confirmPassword) {
      setNotice({ kind: "error", text: "Les deux mots de passe ne correspondent pas." });
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setNotice({ kind: "success", text: "Votre mot de passe a été modifié. Vous pouvez maintenant utiliser votre compte." });
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Impossible de modifier le mot de passe. Réessayez." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell authShell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="KS SMS Send accueil"><span className="brandIcon">KS</span><span>KS SMS <b>Send</b></span></Link>
        <span className="environment"><i /> Récupération du compte</span>
      </header>
      <section className="authCard panel">
        <p className="eyebrow">SÉCURITÉ DU COMPTE</p>
        <h1>{stage === "email" ? "Mot de passe oublié ?" : stage === "otp" ? "Vérifiez votre e-mail" : "Choisissez un nouveau mot de passe"}</h1>
        <p className="authDescription">
          {stage === "email"
            ? "Indiquez l'adresse e-mail associée à votre compte. Nous demanderons un code de récupération par e-mail."
            : stage === "otp"
              ? <>Saisissez le code reçu à <strong>{email}</strong>.</>
              : "Votre adresse est vérifiée. Utilisez au moins 8 caractères pour votre nouveau mot de passe."}
        </p>
        {stage === "email" && <form onSubmit={requestReset}>
          <label htmlFor="resetEmail">Adresse e-mail</label>
          <input className="authInput" id="resetEmail" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.com" />
          <button className="primaryButton authButton" type="submit" disabled={busy}>{busy ? "Demande en cours…" : "Recevoir le code de récupération"}</button>
        </form>}
        {stage === "otp" && <form onSubmit={verifyCode}>
          <label htmlFor="recoveryOtp">Code de récupération</label>
          <input className="authInput otpInput" id="recoveryOtp" inputMode="numeric" autoComplete="one-time-code" required maxLength={8} value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, ""))} placeholder="123456" />
          <button className="primaryButton authButton" type="submit" disabled={busy}>{busy ? "Vérification…" : "Vérifier le code"}</button>
          <div className="authActions">
            <button className="textButton" type="button" disabled={busy} onClick={() => { setStage("email"); setToken(""); setNotice(null); }}>Utiliser une autre adresse</button>
          </div>
        </form>}
        {stage === "password" && <form onSubmit={savePassword}>
          <label htmlFor="newPassword">Nouveau mot de passe</label>
          <input className="authInput" id="newPassword" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 caractères minimum" />
          <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
          <input className="authInput" id="confirmPassword" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Répétez le mot de passe" />
          <button className="primaryButton authButton" type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer le nouveau mot de passe"}</button>
        </form>}
        {notice && <div className={"notice " + notice.kind} role="status" aria-live="polite">{notice.text}</div>}
        <p className="authFoot">La récupération par code nécessite que le modèle e-mail « Reset Password » de Supabase contienne {{ .Token }}. La configuration et l'envoi réel doivent être testés dans le projet Supabase.</p>
      </section>
      <footer><span>© {new Date().getFullYear()} KS SMS Send</span><Link className="textButton" href="/register">Créer un compte</Link></footer>
    </main>
  );
}
