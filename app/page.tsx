"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

type Notice = { kind: "success" | "error" | "info"; text: string };
type DeliveryResult = { recipient: string; status: "queued" | "sent" | "delivered" | "failed" | "unknown"; detail?: string };

const normalizeNumber = (value: string) => value.trim().replace(/[\\s().-]/g, "");
const isPlausiblePhone = (value: string) => /^\\+[1-9]\\d{7,14}$/.test(normalizeNumber(value));
const statusLabels: Record<DeliveryResult["status"], string> = {
  queued: "En attente",
  sent: "Envoyé au fournisseur",
  delivered: "Reçu par le destinataire",
  failed: "Échec",
  unknown: "Non confirmé",
};

export default function Home() {
  const [senderId, setSenderId] = useState("");
  const [numbers, setNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [deliveryResults, setDeliveryResults] = useState<DeliveryResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const recipients = useMemo(() => [...new Set(numbers.split(/[\\n,;]+/).map(normalizeNumber).filter(Boolean))], [numbers]);
  const invalidCount = recipients.filter((number) => !isPlausiblePhone(number)).length;
  const segments = useMemo(() => {
    if (!message) return 0;
    const limit = /[^\\u0000-\\u00ff]/.test(message) ? 70 : 160;
    return Math.ceil(message.length / limit);
  }, [message]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setDeliveryResults([]);
    const normalizedSender = senderId.trim();
    if (!/^[A-Za-z0-9 ]{1,11}$/.test(normalizedSender)) {
      setNotice({ kind: "error", text: "L’identifiant expéditeur doit contenir de 1 à 11 lettres/chiffres (selon le pays et le fournisseur). Les espaces sont autorisés." });
      return;
    }
    if (!recipients.length || invalidCount) {
      setNotice({ kind: "error", text: "Ajoutez des numéros uniques au format international (+225...), puis corrigez les numéros invalides." });
      return;
    }
    if (!message.trim()) {
      setNotice({ kind: "error", text: "Le contenu du SMS ne peut pas être vide." });
      return;
    }
    if (message.trim().length > 2000) {
      setNotice({ kind: "error", text: "Le message ne peut pas dépasser 2 000 caractères." });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: normalizedSender, recipients, message: message.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string; results?: DeliveryResult[] };
      if (Array.isArray(data.results)) setDeliveryResults(data.results);
      if (!response.ok) {
        setNotice({ kind: "error", text: data.error ?? "Envoi indisponible. Aucun SMS n'est confirmé comme envoyé." });
        return;
      }
      setNotice({ kind: "success", text: data.message ?? "Demande traitée. Consultez les statuts ci-dessous pour vérifier la livraison." });
    } catch {
      setNotice({ kind: "error", text: "Impossible de joindre le serveur. Vérifiez la connexion puis réessayez." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="KS SMS Send accueil"><span className="brandIcon">KS</span><span>KS SMS <b>Send</b></span></Link>
        <div className="topActions"><Link className="registerLink" href="/register">Créer un compte</Link><span className="environment"><i /> Espace SMS</span></div>
      </header>
      <section className="hero">
        <p className="eyebrow">MESSAGERIE PROFESSIONNELLE</p>
        <h1>Vos messages, <span>en toute simplicité.</span></h1>
        <p className="subheading">Choisissez l’identifiant affiché comme expéditeur, rédigez votre SMS et consultez son statut de livraison lorsque le fournisseur le confirme.</p>
      </section>
      <div className="grid">
        <section className="panel compose">
          <div className="panelHeading"><div><p className="eyebrow">NOUVEAU MESSAGE</p><h2>Composer un SMS</h2></div><span className="step">01 / COMPOSER</span></div>
          <form onSubmit={handleSubmit}>
            <label htmlFor="senderId">ID de l’expéditeur</label>
            <input id="senderId" value={senderId} onChange={(event) => setSenderId(event.target.value)} placeholder="Ex. KS SMS" maxLength={11} autoComplete="off" aria-describedby="senderHelp" />
            <div className="fieldMeta"><span id="senderHelp">Nom affiché chez le destinataire, si son opérateur l’autorise (11 caractères maximum en général).</span><span>{senderId.length}/11</span></div>
            <label htmlFor="recipients">Numéro(s) du destinataire</label>
            <textarea id="recipients" value={numbers} onChange={(event) => setNumbers(event.target.value)} placeholder={"+2250700000000\n+33123456789"} rows={4} autoComplete="off" spellCheck={false} aria-describedby="recipientHelp" />
            <div className="fieldMeta"><span id="recipientHelp">Un numéro par ligne, ou séparez-les par une virgule/point-virgule.</span><span>{recipients.length} numéro(s)</span></div>
            {invalidCount > 0 && <p className="fieldError">{invalidCount} numéro(s) à corriger : utilisez le format international +...</p>}
            <div className="labelRow"><label htmlFor="message">Votre message</label><span>{message.length} caractères</span></div>
            <textarea id="message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Écrivez votre message ici…" rows={6} maxLength={2000} />
            <div className="fieldMeta"><span>Jusqu’à 2 000 caractères. Le coût dépend du pays et du fournisseur.</span><span>{segments} segment(s) estimé(s)</span></div>
            {notice && <div className={"notice " + notice.kind} role="status" aria-live="polite">{notice.text}</div>}
            <button className="primaryButton" type="submit" disabled={busy}>{busy ? "Vérification en cours…" : "Vérifier et envoyer"} {!busy && <span aria-hidden="true">↗</span>}</button>
            <p className="legalNote">L’identifiant expéditeur peut être modifié ou refusé par certains opérateurs. N’envoyez que des messages autorisés.</p>
          </form>
        </section>
        <aside className="sideColumn">
          <section className="panel summary">
            <p className="eyebrow">RÉCAPITULATIF</p><h2>Votre campagne</h2>
            <div className="metric"><span>ID expéditeur</span><strong>{senderId.trim() || "—"}</strong></div>
            <div className="metric"><span>Destinataires uniques</span><strong>{recipients.length}</strong></div>
            <div className="metric"><span>Numéros valides</span><strong>{recipients.length - invalidCount}</strong></div>
            <div className="metric"><span>Segments estimés</span><strong>{segments * Math.max(0, recipients.length - invalidCount)}</strong></div>
            <div className="summaryFoot"><span className="statusDot" /> Statut réel disponible après connexion d’un fournisseur SMS</div>
          </section>
          <section className="panel infoPanel">
            <div className="infoIcon">i</div><h3>Suivi de livraison</h3>
            <p>« Envoyé » signifie que le fournisseur a accepté le SMS. Seul un reçu de livraison du réseau permet d’afficher « Reçu par le destinataire ».</p>
            <button className="textButton" type="button" onClick={() => setShowSetup((value) => !value)} aria-expanded={showSetup}>{showSetup ? "Masquer les prérequis" : "Voir les prérequis"} →</button>
            {showSetup && <ul className="setupList"><li>Projet Supabase accessible et session utilisateur vérifiée côté serveur</li><li>Fournisseur SMS prenant en charge l’ID expéditeur dans le pays ciblé</li><li>URL de rappel (webhook) du fournisseur pour les reçus de livraison</li><li>Historique des envois et statuts enregistrés côté serveur</li></ul>}
          </section>
        </aside>
      </div>
      {deliveryResults.length > 0 && <section className="panel deliveryPanel" aria-live="polite">
        <div className="panelHeading"><div><p className="eyebrow">RAPPORT</p><h2>Statut par destinataire</h2></div></div>
        <div className="deliveryList">{deliveryResults.map((result) => <div className="deliveryRow" key={result.recipient}><strong>{result.recipient}</strong><span className={"deliveryStatus " + result.status}>{statusLabels[result.status]}</span>{result.detail && <small>{result.detail}</small>}</div>)}</div>
      </section>}
      <footer><span>© {new Date().getFullYear()} KS SMS Send</span><span>Simple · Clair · Contrôlé</span></footer>
    </main>
  );
}
