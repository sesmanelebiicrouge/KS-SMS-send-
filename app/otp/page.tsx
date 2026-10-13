"use client";

import { useState } from "react";

const field = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 14,
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  fontSize: 16,
};

export default function OtpPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"request" | "verify" | "verified">("request");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setBusy(true);
    try {
      const response = await fetch(stage === "request" ? "/api/otp/request" : "/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stage === "request" ? { phone } : { phone, code }),
      });
      const data = (await response.json()) as { error?: string; message?: string; verified?: boolean };
      if (!response.ok) throw new Error(data.error || "La demande a échoué.");
      if (stage === "request") {
        setStage("verify");
        setFeedback(data.message || "Code envoyé. Il expire dans 5 minutes.");
      } else if (data.verified) {
        setStage("verified");
        setFeedback(data.message || "Numéro vérifié.");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Service temporairement indisponible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "28px 16px", background: "#080f1f", color: "#f8fafc", fontFamily: "Arial,sans-serif" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <a href="/" style={{ color: "#fb7185", textDecoration: "none" }}>← KS SMS Send</a>
        <header style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 30px" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", background: "#e11d48", fontWeight: 800, fontSize: 20 }}>KS</div>
          <div><div style={{ fontWeight: 800, fontSize: 22 }}>Confirmation OTP</div><div style={{ color: "#94a3b8", fontSize: 13 }}>Vérification de numéro par SMS</div></div>
        </header>
        <section style={{ border: "1px solid #253249", borderRadius: 22, padding: "clamp(20px,5vw,34px)", background: "#111c30" }}>
          <h1 style={{ fontSize: "clamp(27px,6vw,36px)", marginTop: 0 }}>Confirmer un numéro</h1>
          <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>Un code à 6 chiffres est envoyé par SMS. Il expire après 5 minutes et ne peut être utilisé qu’une seule fois. Après vérification, le navigateur reçoit une autorisation sécurisée de 10 minutes.</p>
          {stage !== "verified" && <form onSubmit={submit} style={{ display: "grid", gap: 18 }}>
            <label style={{ display: "grid", gap: 8, fontWeight: 700 }}>Numéro de téléphone
              <input value={phone} onChange={event => setPhone(event.target.value)} placeholder="+225 07 00 00 00 00" inputMode="tel" autoComplete="tel" style={field} required disabled={stage === "verify" || busy} />
            </label>
            {stage === "verify" && <label style={{ display: "grid", gap: 8, fontWeight: 700 }}>Code reçu par SMS
              <input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} style={field} required />
            </label>}
            <button type="submit" disabled={busy} style={{ border: 0, borderRadius: 12, padding: 16, background: "#e11d48", color: "white", fontWeight: 800, fontSize: 16, cursor: busy ? "wait" : "pointer" }}>
              {busy ? "Patiente…" : stage === "request" ? "Recevoir le code SMS" : "Vérifier le code"}
            </button>
          </form>}
          {feedback && <p role="status" aria-live="polite" style={{ padding: 14, borderRadius: 12, background: stage === "verified" ? "#14532d" : "#1e293b", color: stage === "verified" ? "#bbf7d0" : "#e2e8f0", lineHeight: 1.5 }}>{feedback}</p>}
          {stage === "verified" && <p><a href="/" style={{ color: "#fb7185", fontWeight: 800 }}>Retourner à l’envoi de SMS →</a></p>}
          {stage === "verify" && <button type="button" onClick={() => { setStage("request"); setCode(""); setFeedback(""); }} style={{ marginTop: 12, border: 0, background: "transparent", color: "#fb7185", cursor: "pointer" }}>Demander un autre code</button>}
        </section>
      </div>
    </main>
  );
}
