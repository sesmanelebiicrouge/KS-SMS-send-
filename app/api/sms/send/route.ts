import { NextResponse } from "next/server";

export const runtime = "nodejs";

const phonePattern = /^\+[1-9]\d{7,14}$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const payload = body as { recipients?: unknown; message?: unknown };
  if (!Array.isArray(payload.recipients) || payload.recipients.length < 1 || payload.recipients.length > 100) {
    return NextResponse.json({ error: "Fournissez entre 1 et 100 destinataires." }, { status: 400 });
  }
  if (!payload.recipients.every((item) => typeof item === "string" && phonePattern.test(item))) {
    return NextResponse.json({ error: "Chaque numéro doit être au format international, par exemple +2250700000000." }, { status: 400 });
  }
  if (new Set(payload.recipients).size !== payload.recipients.length) {
    return NextResponse.json({ error: "Les destinataires en double doivent être supprimés." }, { status: 400 });
  }
  if (typeof payload.message !== "string" || !payload.message.trim() || payload.message.length > 2000) {
    return NextResponse.json({ error: "Le message doit contenir entre 1 et 2000 caractères." }, { status: 400 });
  }

  // Fail closed: never report a successful send until a real provider, authenticated
  // user, durable rate limit and delivery logging have been configured.
  return NextResponse.json(
    { error: "Envoi désactivé : aucun fournisseur SMS n'est configuré. Aucun SMS n'a été envoyé." },
    { status: 503 },
  );
}
