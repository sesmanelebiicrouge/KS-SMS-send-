"use client";
import { useState } from "react";

const field = { width: "100%", boxSizing: "border-box" as const, padding: 14, borderRadius: 12, border: "1px solid #334155", background: "#0f172a", color: "#f8fafc", fontSize: 16 };

export default function Home() {
 const [sender, setSender] = useState("");
 const [phone, setPhone] = useState("");
 const [message, setMessage] = useState("");
 const [feedback, setFeedback] = useState("");
 const [busy, setBusy] = useState(false);
 const [ok, setOk] = useState(false);

 async function send(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault(); setFeedback(""); setOk(false);
  const recipient = phone.replace(/[\s()-]/g, "");
  if (!sender.trim()) { setFeedback("Saisis le nom ou l’identifiant d’expéditeur autorisé par Orange."); return; }
  if (!/^\+?[0-9]{8,15}$/.test(recipient)) { setFeedback("Numéro invalide. Utilise l’indicatif du pays, par exemple +2250700000000."); return; }
  if (!message.trim()) { setFeedback("Écris le texte du SMS."); return; }
  setBusy(true);
  try {
   const res = await fetch("/api/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senderName: sender.trim(), phone: recipient, message: message.trim() }) });
   const data = await res.json();
   if (!res.ok) throw new Error(data.error || "Échec de l’envoi.");
   setOk(true);
   setFeedback(data.deliveryConfirmed ? "SMS reçu par le destinataire (accusé de réception confirmé)." : "Demande acceptée par Orange. La réception sur le téléphone n’est pas encore confirmée.");
  } catch (e) { setFeedback(e instanceof Error ? e.message : "Impossible d’envoyer le SMS."); }
  finally { setBusy(false); }
 }

 return <main style={{ minHeight:"100vh", padding:"28px 16px", background:"#080f1f", color:"#f8fafc", fontFamily:"Arial,sans-serif" }}>
  <div style={{ maxWidth:700, margin:"0 auto" }}>
   <header style={{ display:"flex", alignItems:"center", gap:12, marginBottom:30 }}>
    <div style={{ width:48, height:48, borderRadius:14, display:"grid", placeItems:"center", background:"#e11d48", fontWeight:800, fontSize:20 }}>KS</div>
    <div><div style={{ fontWeight:800, fontSize:22 }}>KS SMS Send</div><div style={{ color:"#94a3b8", fontSize:13 }}>Envoi de SMS</div></div>
   </header>
   <p style={{ margin:"0 0 18px", color:"#cbd5e1" }}>Tu veux confirmer un numéro avec un code SMS ? <a href="/otp" style={{ color:"#fb7185", fontWeight:800 }}>Ouvrir la confirmation OTP →</a></p>
   <section style={{ border:"1px solid #253249", borderRadius:22, padding:"clamp(20px,5vw,34px)", background:"#111c30" }}>
    <h1 style={{ fontSize:"clamp(28px,6vw,40px)", marginTop:0 }}>Envoyer un SMS</h1>
    <form onSubmit={send} style={{ display:"grid", gap:18 }}>
     <label style={{ display:"grid", gap:8, fontWeight:700 }}>ID / nom de l’expéditeur
      <input value={sender} onChange={e=>setSender(e.target.value)} maxLength={11} placeholder="Nom autorisé par Orange" style={field} required />
      <span style={{ color:"#94a3b8", fontSize:12, fontWeight:400 }}>Le nom doit être validé par Orange. Maximum 11 caractères alphanumériques.</span>
     </label>
     <label style={{ display:"grid", gap:8, fontWeight:700 }}>Numéro du receveur
      <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+225 07 00 00 00 00" inputMode="tel" style={field} required />
     </label>
     <label style={{ display:"grid", gap:8, fontWeight:700 }}>Texte du message
      <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Écris ton message ici…" rows={5} maxLength={1000} style={{ ...field, resize:"vertical", lineHeight:1.5 }} required />
      <span style={{ color:"#94a3b8", fontSize:12, fontWeight:400, textAlign:"right" }}>{message.length}/1000 caractères</span>
     </label>
     <button type="submit" disabled={busy} style={{ border:0, borderRadius:12, padding:16, background:"#e11d48", color:"white", fontWeight:800, fontSize:16, cursor:busy?"wait":"pointer" }}>{busy?"Envoi en cours…":"Envoyer le SMS"}</button>
    </form>
    {feedback && <p role="status" aria-live="polite" style={{ padding:14, borderRadius:12, background:ok?"#14532d":"#1e293b", color:ok?"#bbf7d0":"#e2e8f0", lineHeight:1.5 }}>{feedback}</p>}
    <p style={{ color:"#94a3b8", fontSize:13, lineHeight:1.6 }}>La confirmation de réception réelle nécessite le service d’accusé de réception Orange. Ne saisis jamais de clé API sur cette page.</p>
   </section>
  </div>
 </main>;
}