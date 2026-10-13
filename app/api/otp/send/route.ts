import { NextResponse } from "next/server";
import { createHash, randomInt } from "node:crypto";
import { EncryptJWT } from "jose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function keyFromSecret(secret: string) {
  return createHash("sha256").update("KS-SMS-SEND-OTP:" + secret).digest();
}

export async function POST(request: Request) {
  const clientId = process.env.ORANGE_CLIENT_ID;
  const clientSecret = process.env.ORANGE_CLIENT_SECRET;
  const senderAddress = process.env.ORANGE_SENDER_ADDRESS || "tel:+2250000";

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Configuration Orange incomplète dans Vercel." }, { status: 503 });
  }

  let body: { phone?: unknown; senderName?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const phone = (typeof body.phone === "string" ? body.phone : "").replace(/[\s()-]/g, "");
  const senderName = typeof body.senderName === "string" ? body.senderName.trim() : "";
  if (!/^\+[1-9][0-9]{7,14}$/.test(phone)) {
    return NextResponse.json({ error: "Numéro invalide : utilise le format international, par exemple +2250700000000." }, { status: 400 });
  }
  if (senderName && (senderName.length > 11 || !/^[A-Za-z0-9 ]+$/.test(senderName))) {
    return NextResponse.json({ error: "Le nom d’expéditeur doit comporter au maximum 11 caractères alphanumériques ou espaces." }, { status: 400 });
  }
  if (!/^tel:\+[0-9]{6,15}$/.test(senderAddress)) {
    return NextResponse.json({ error: "Adresse d’expéditeur Orange invalide dans Vercel." }, { status: 503 });
  }

  try {
    const auth = await fetch("https://api.orange.com/oauth/v3/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!auth.ok) {
      return NextResponse.json({ error: "Orange refuse l’authentification. Vérifie les identifiants, l’abonnement SMS et le solde." }, { status: 502 });
    }
    const tokenData = await auth.json() as { access_token?: string };
    if (!tokenData.access_token) return NextResponse.json({ error: "Jeton Orange manquant." }, { status: 502 });

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const challengeToken = await new EncryptJWT({
      purpose: "ks-sms-otp",
      phone,
      codeHash: createHash("sha256").update(code).digest("hex"),
    })
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .encrypt(keyFromSecret(clientSecret));

    const endpoint = "https://api.orange.com/smsmessaging/v1/outbound/" + encodeURIComponent(senderAddress) + "/requests";
    const smsBody = {
      outboundSMSMessageRequest: {
        address: "tel:" + phone,
        senderAddress,
        ...(senderName ? { senderName } : {}),
        outboundSMSTextMessage: { message: "Votre code KS SMS Send est " + code + ". Il expire dans 5 minutes. Ne le partagez avec personne." },
      },
    };
    const sent = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: "Bearer " + tokenData.access_token, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(smsBody),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    if (!sent.ok) {
      const error = sent.status === 400 ? "Orange a rejeté l’envoi. Vérifie l’adresse d’expéditeur et le nom autorisé." :
        sent.status === 401 ? "Jeton Orange refusé." :
        sent.status === 403 ? "L’application Orange n’est pas autorisée à utiliser l’API SMS." :
        sent.status === 429 ? "Limite d’envoi Orange atteinte. Réessaie plus tard." :
        "Orange n’a pas accepté le SMS. Vérifie le contrat et le solde SMS.";
      return NextResponse.json({ error }, { status: 502 });
    }

    const result = await sent.json().catch(() => ({})) as { outboundSMSMessageRequest?: { resourceURL?: string } };
    return NextResponse.json({
      status: "accepted",
      message: "Orange a accepté la demande. La réception du SMS n’est pas confirmée par un accusé de réception.",
      challengeToken,
      expiresInSeconds: 300,
      resourceURL: result.outboundSMSMessageRequest?.resourceURL || null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Connexion à Orange impossible pour le moment." }, { status: 502 });
  }
}
