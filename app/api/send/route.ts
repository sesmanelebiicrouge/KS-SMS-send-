import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
 const clientId = process.env.ORANGE_CLIENT_ID;
 const clientSecret = process.env.ORANGE_CLIENT_SECRET;
 // Orange documents tel:+2250000 as the default sender address for Côte d'Ivoire.
 const senderAddress = process.env.ORANGE_SENDER_ADDRESS || "tel:+2250000";
 if (!clientId || !clientSecret) return NextResponse.json({ error: "Configuration Orange incomplète dans Vercel : identifiants client obligatoires." }, { status: 503 });

 let body: { senderName?: unknown; phone?: unknown; message?: unknown };
 try { body = await request.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }
 const senderName = typeof body.senderName === "string" ? body.senderName.trim() : "";
 const phone = (typeof body.phone === "string" ? body.phone : "").replace(/[\s()-]/g, "");
 const message = typeof body.message === "string" ? body.message.trim() : "";
 if (!senderName || senderName.length > 11 || !/^[A-Za-z0-9 ]+$/.test(senderName)) return NextResponse.json({ error: "Le nom d’expéditeur doit être autorisé par Orange et contenir au plus 11 lettres/chiffres/espaces." }, { status: 400 });
 if (!/^\+[1-9][0-9]{7,14}$/.test(phone)) return NextResponse.json({ error: "Numéro invalide : utilise le format international +225…"} , { status: 400 });
 if (!message || message.length > 1000) return NextResponse.json({ error: "Le message doit contenir de 1 à 1000 caractères." }, { status: 400 });
 if (!/^tel:\+[0-9]{6,15}$/.test(senderAddress)) return NextResponse.json({ error: "Adresse d’expéditeur Orange invalide dans la configuration serveur." }, { status: 503 });

 try {
  const basic = Buffer.from(clientId + ":" + clientSecret).toString("base64");
  const auth = await fetch("https://api.orange.com/oauth/v3/token", {
   method: "POST", headers: { Authorization: "Basic " + basic, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
   body: "grant_type=client_credentials", cache: "no-store", signal: AbortSignal.timeout(15000)
  });
  if (!auth.ok) return NextResponse.json({ error: "Orange refuse l’authentification. Vérifie les identifiants et l’abonnement SMS." }, { status: 502 });
  const token = await auth.json() as { access_token?: string };
  if (!token.access_token) return NextResponse.json({ error: "Orange n’a pas fourni de jeton d’accès." }, { status: 502 });
  const endpoint = "https://api.orange.com/smsmessaging/v1/outbound/" + encodeURIComponent(senderAddress) + "/requests";
  const response = await fetch(endpoint, {
   method: "POST", headers: { Authorization: "Bearer " + token.access_token, "Content-Type": "application/json", Accept: "application/json" },
   body: JSON.stringify({ outboundSMSMessageRequest: { address: "tel:" + phone, senderAddress, senderName, outboundSMSTextMessage: { message } } }),
   cache: "no-store", signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) {
   const error = response.status === 400 ? "Orange a rejeté la demande. Vérifie le nom autorisé et le format du numéro." :
    response.status === 401 ? "Authentification Orange refusée." :
    response.status === 403 ? "Cette application n’est pas autorisée à utiliser l’API SMS." :
    response.status === 429 ? "Limite d’envoi atteinte. Réessaie plus tard." :
    "Orange n’a pas accepté le SMS. Vérifie le contrat et le solde SMS.";
   return NextResponse.json({ error }, { status: 502 });
  }
  const result = await response.json().catch(() => ({})) as { outboundSMSMessageRequest?: { resourceURL?: string } };
  return NextResponse.json({ status: "accepted", deliveryConfirmed: false, resourceURL: result.outboundSMSMessageRequest?.resourceURL || null }, { headers: { "Cache-Control": "no-store" } });
 } catch {
  return NextResponse.json({ error: "Connexion à Orange impossible pour le moment." }, { status: 502 });
 }
}
