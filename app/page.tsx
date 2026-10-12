"use client";

import { FormEvent, useMemo, useState } from "react";

type Notice = { kind: "success" | "error"; text: string };

const normalizeNumber = (value: string) => value.trim().replace(/[\s().-]/g, "");
const isPlausiblePhone = (value: string) => /^\+[1-9]\d{7,14}$/.test(normalizeNumber(value));

export default function Home() {
  const [numbers, setNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const recipients = useMemo(() => [...new Set(numbers.split(/[\n,;]+/).map(normalizeNumber).filter(Boolean))], [numbers]);
  const invalidCount = recipients.filter((number) => !isPlausiblePhone(number)).length;
  const segments = useMemo(() => {
    if (!message) return 0;
    const limit = /[^\u0000-\u00ff]/.test(message) ? 70 : 160;
    return Math.ceil(message.length / limit);
  }, [message]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!recipients.length || invalidCount) {
      setNotice({ kind: "error", text: "Ajoutez des numéros uniques au format international (+225...), puis corrigez les numéros invalides." });
      return;
    }
    if (!message.trim()) {
      setNotice({ kind: "error", text: "Le contenu du SMS ne peut pas être vide." });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients, message: message.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setNotice({ kind: "error", text: data.error ?? "Envoi indisponible. Aucun SMS n'est confirmé comme envoyé." });
        return;
      }
      setNotice({ kind: "error", text: data.message ?? "Le serveur a accepté la requête, mais vérifiez le statut du fournisseur avant de considérer les SMS livrés." });
    } catch {
      setNotice({ kind: "error", text: "Impossible de joindre le serveur. Vérifiez la connexion puis réessayez." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="KS SMS Send accueil"><span className="brandIcon">KS</span><span>KS SMS <b>Send</b></span></a>
        <span className="environment"><i /> Espace SMS</span>
      </header>
      <section className="hero">
        <p className="eyebrow">MESSAGERIE PROFESSIONNELLE</p>
        <h1>Vos messages, <span>en toute simplicité.</span></h1>
        <p className="subheading">Préparez votre campagne SMS et vérifiez les destinataires avant l'envoi.</p>
      </section>
      <div className="grid">
        <section className="panel compose">
          <div className="panelHeading"><div><p className="eyebrow">NOUVEAU MESSAGE</p><h2>Composer un SMS</h2></div><span className="step">01 / COMPOSER</span></div>
          <form onSubmit={handleSubmit}>
            <label htmlFor="recipients">Destinataires</label>
            <textarea id="recipients" value={numbers} onChange={(event) => setNumbers(event.target.value)} placeholder={"+2250700000000\n+33123456789"} rows={4} autoComplete="off" spellCheck={false} aria-describedby="recipientHelp" />
            <div className="fieldMeta"><span id="recipientHelp">Séparez les numéros par une virgule ou un retour à la ligne.</span><span>{recipients.length} numéro(s)</span></div>
            {invalidCount > 0 && <p className="fieldError">{invalidCount} numéro(s) à corriger : utilisez le format international +...</p>}
            <div className="labelRow"><label htmlFor="message">Votre message</label><span>{message.length} caractères</span></div>
            <textarea id="message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Écrivez votre message ici…" rows={6} maxLength={2000} />
            <div className="fieldMeta"><span>Le coût dépend du pays et du fournisseur SMS.</span><span>{segments} segment(s) estimé(s)</span></div>
            {notice && <div className={"notice " + notice.kind} role="status" aria-live="polite">{notice.text}</div>}
            <button className="primaryButton" type="submit" disabled={busy}>{busy ? "Vérification en cours…" : "Vérifier et envoyer"} {!busy && <span aria-hidden="true">↗</span>}</button>
            <p className="legalNote">Envoyez uniquement des messages conformes aux règles applicables et aux préférences de vos destinataires.</p>
          </form>
        </section>
        <aside className="sideColumn">
          <section className="panel summary">
            <p className="eyebrow">RÉCAPITULATIF</p><h2>Votre campagne</h2>
            <div className="metric"><span>Destinataires uniques</span><strong>{recipients.length}</strong></div>
            <div className="metric"><span>Numéros valides</span><strong>{recipients.length - invalidCount}</strong></div>
            <div className="metric"><span>Segments estimés</span><strong>{segments * Math.max(0, recipients.length - invalidCount)}</strong></div>
            <div className="summaryFoot"><span className="statusDot" /> Envoi réel à configurer côté serveur</div>
          </section>
          <section className="panel infoPanel">
            <div className="infoIcon">i</div><h3>Avant le premier envoi</h3>
            <p>Le serveur doit être connecté à un fournisseur SMS et à une authentification avant tout envoi réel.</p>
            <button className="textButton" type="button" onClick={() => setShowSetup((value) => !value)} aria-expanded={showSetup}>{showSetup ? "Masquer les prérequis" : "Voir les prérequis"} →</button>
            {showSetup && <ul className="setupList"><li>Authentification et session serveur</li><li>Fournisseur SMS et clé conservée côté serveur</li><li>Limites d'envoi et contrôle anti-doublon</li><li>Journal des statuts et coûts par destination</li></ul>}
          </section>
        </aside>
      </div>
      <footer><span>© {new Date().getFullYear()} KS SMS Send</span><span>Simple · Clair · Contrôlé</span></footer>
    </main>
  );
}
