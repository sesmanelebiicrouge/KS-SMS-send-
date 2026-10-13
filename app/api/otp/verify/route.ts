import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { jwtDecrypt } from "jose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function keyFromSecret(secret: string) {
  return createHash("sha256").update("KS-SMS-SEND-OTP:" + secret).digest();
}

export async function POST(request: Request) {
  const clientSecret = process.env.ORANGE_CLIENT_SECRET;
  if (!clientSecret) return NextResponse.json({ error: "Configuration OTP incomplète dans Vercel." }, { status: 503 });

  let body: { challengeToken?: unknown; code?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const challengeToken = typeof body.challengeToken === "string" ? body.challengeToken : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!challengeToken || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ verified: false, error: "Fournis le code à 6 chiffres reçu par SMS." }, { status: 400 });
  }

  try {
    const { payload } = await jwtDecrypt(challengeToken, keyFromSecret(clientSecret), {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    });
    if (payload.purpose !== "ks-sms-otp" || typeof payload.codeHash !== "string" || typeof payload.phone !== "string") {
      return NextResponse.json({ verified: false, error: "Code OTP invalide." }, { status: 400 });
    }

    const submittedHash = createHash("sha256").update(code).digest();
    const expectedHash = Buffer.from(payload.codeHash, "hex");
    if (expectedHash.length !== submittedHash.length || !timingSafeEqual(expectedHash, submittedHash)) {
      return NextResponse.json({ verified: false, error: "Code OTP incorrect." }, { status: 400 });
    }

    return NextResponse.json({
      verified: true,
      phone: payload.phone,
      message: "Code vérifié. Pour une authentification de compte, relie cette vérification à une session utilisateur sécurisée.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ verified: false, error: "Code expiré ou invalide. Demande un nouveau code." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
