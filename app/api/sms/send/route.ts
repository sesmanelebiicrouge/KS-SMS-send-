import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server-auth";
import { getOrangeAccessToken, sendOrangeSms } from "@/lib/orange-sms";

export const runtime = "nodejs";

const phonePattern = /^\+[1-9]\d{7,14}$/;
const senderPattern = /^[A-Za-z0-9 ]{1,11}$/;

// Best-effort per-instance throttle. Production campaigns still need a durable,
// shared rate limiter and an audit log before allowing multiple recipients.
const lastSendByUser = new Map<string, number>();
const SEND_COOLDOWN_MS = 60_000;

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth.user) {
    return NextResponse.json({ error: auth.error ?? "Connectez-vous avant d'envoyer un SMS." }, { status: 401 });
  }

  if (process.env.ORANGE_SMS_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Envoi réel désactivé. Vérifiez d'abord la connexion Orange, achetez un forfait SMS, puis activez ORANGE_SMS_ENABLED=true." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const payload = body as { senderId?: unknown; recipients?: unknown; message?: unknown };
  if (typeof payload.senderId !== "string" || !senderPattern.test(payload.senderId.trim())) {
    return NextResponse.json({ error: "L'identifiant expéditeur doit contenir de 1 à 11 lettres/chiffres et espaces." }, { status: 400 });
  }
  // Keep initial integration in single-recipient test mode to limit accidental spend.
  if (!Array.isArray(payload.recipients) || payload.recipients.length !== 1) {
    return NextResponse.json({ error: "Mode test : envoyez un seul destinataire à la fois." }, { status: 400 });
  }
  const recipient = payload.recipients[0];
  if (typeof recipient !== "string" || !phonePattern.test(recipient)) {
    return NextResponse.json({ error: "Le numéro doit être au format international, par exemple +2250700000000." }, { status: 400 });
  }
  if (typeof payload.message !== "string" || !payload.message.trim() || payload.message.length > 1600) {
    return NextResponse.json({ error: "Le message doit contenir entre 1 et 1600 caractères." }, { status: 400 });
  }

  const now = Date.now();
  const lastSend = lastSendByUser.get(auth.user.id) ?? 0;
  if (now - lastSend < SEND_COOLDOWN_MS) {
    return NextResponse.json({ error: "Veuillez attendre une minute avant un nouvel envoi de test." }, { status: 429 });
  }

  try {
    // Validate credentials before marking this user as having sent.
    await getOrangeAccessToken();
    lastSendByUser.set(auth.user.id, now);
    const result = await sendOrangeSms({
      recipient,
      message: payload.message.trim(),
      senderName: payload.senderId.trim(),
    });
    return NextResponse.json({
      message: "Orange a accepté la requête SMS. Cela ne confirme pas encore la livraison.",
      results: [{ recipient, status: "sent", detail: "Accepté par l'API Orange; livraison non confirmée." }],
      providerResponse: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue du fournisseur SMS.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
