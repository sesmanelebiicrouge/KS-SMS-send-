"use client";

import { useState } from "react";

type Health = {
  status?: string;
  checks?: {
    orangeClientIdConfigured?: boolean;
    orangeClientSecretConfigured?: boolean;
  };
  note?: string;
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "13px 14px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  fontSize: 16,
  outline: "none",
};

export default function Home() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const [checking, setChecking] = useState(false);

  async function checkConfiguration() {
    setChecking(true);
    setFeedback("");
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) throw new Error("Vérification indisponible.");
      setHealth((await response.json()) as Health);
    } catch {
      setFeedback("Impossible de vérifier le serveur. Réessaie dans quelques instants.");
    } finally {
      setChecking(false);
    }
  }

  function validateDemo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPhone = phone.replace(/[\s()-]/g, "");
    if (!/^\+?[0-9]{8,15}$/.test(normalizedPhone)) {
      setFeedback("Vérifie le numéro : saisis l’indicatif du pays, par exemple +225…");
      return;
    }
    if (!message.trim()) {
      setFeedback("Écris le contenu du SMS avant de continuer.");
      return;
    }
    setFeedback("Le formulaire est valide. Aucun SMS n’a été envoyé : la fonction d’envoi réelle doit encore être connectée et testée.");
  }

  return (
    <main style={{ minHeight: "100vh", padding: "28px 16px", background: "#080f1f", color: "#f8fafc", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 34 }}>
          <div aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", background: "#e11d48", fontWeight: 800, fontSize: 20 }}>KS</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>KS SMS Send</div>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Espace de test</div>
          </div>
        </header>

        <section style={{ border: "1px solid #253249", borderRadius: 22, padding: "clamp(20px, 5vw, 34px)", background: "#111c30", boxShadow: "0 20px 60px #0003" }}>
          <div style={{ color: "#fb7185", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>Version de test</div>
          <h1 style={{ fontSize: "clamp(28px, 6vw, 40px)", lineHeight: 1.12, margin: "12px 0" }}>Préparez votre SMS en toute simplicité.</h1>
          <p style={{ color: "#b8c4d8", lineHeight: 1.65, marginTop: 0 }}>Vérifiez le formulaire et l’état de configuration avant d’activer l’envoi réel.</p>

          <form onSubmit={validateDemo} style={{ display: "grid", gap: 16, marginTop: 28 }}>
            <label style={{ display: "grid", gap: 8, fontWeight: 700, fontSize: 14 }}>
              Numéro du destinataire
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+225 07 00 00 00 00" inputMode="tel" autoComplete="tel" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 8, fontWeight: 700, fontSize: 14 }}>
              Message
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Saisis ton message ici…" rows={4} maxLength={1000} style={{ ...inputStyle, resize: "vertical" }} />
              <span style={{ color: "#94a3b8", fontWeight: 400, textAlign: "right" }}>{message.length}/1000 caractères</span>
            </label>
            <button type="submit" style={{ border: 0, borderRadius: 12, padding: 15, background: "#e11d48", color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>Vérifier le formulaire</button>
          </form>

          {feedback && <p role="status" style={{ borderRadius: 12, padding: 13, background: "#1e293b", color: "#e2e8f0", lineHeight: 1.5 }}>{feedback}</p>}

          <div style={{ marginTop: 28, borderTop: "1px solid #253249", paddingTop: 22 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Configuration du service SMS</div>
            <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.55 }}>Cette vérification indique uniquement si les variables Orange sont présentes sur le serveur. Elle ne révèle aucune clé et ne garantit pas que l’envoi fonctionne.</p>
            <button type="button" onClick={checkConfiguration} disabled={checking} style={{ width: "100%", border: "1px solid #475569", borderRadius: 12, padding: 13, background: "transparent", color: "#f8fafc", fontWeight: 700, cursor: checking ? "wait" : "pointer" }}>{checking ? "Vérification…" : "Vérifier la configuration"}</button>
            {health && <div role="status" style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#0b1425", color: "#cbd5e1", lineHeight: 1.7, fontSize: 14 }}>
              <div><strong>État :</strong> {health.status === "configuration_present" ? "Variables détectées" : "Configuration incomplète"}</div>
              <div>Identifiant Orange : {health.checks?.orangeClientIdConfigured ? "présent" : "absent"}</div>
              <div>Secret Orange : {health.checks?.orangeClientSecretConfigured ? "présent" : "absent"}</div>
              <div style={{ color: "#94a3b8", marginTop: 6 }}>{health.note}</div>
            </div>}
          </div>
        </section>

        <footer style={{ textAlign: "center", color: "#64748b", fontSize: 12, lineHeight: 1.7, padding: "22px 8px" }}>
          KS SMS Send · Version de test<br />
          N’entre jamais de mot de passe, code OTP ou clé API dans ce formulaire.
        </footer>
      </div>
    </main>
  );
}
