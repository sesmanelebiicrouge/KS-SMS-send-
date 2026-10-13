import { NextResponse } from "next/server";
import { verifyVerificationToken } from "../../../../lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { token?: unknown };
  try {
    body = (await request.json()) as { token?: unknown };
  } catch {
    return NextResponse.json({ valid: false, error: "Requête invalide." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const result = verifyVerificationToken(body.token);
  if (!result) {
    return NextResponse.json({ valid: false, error: "Jeton invalide ou expiré." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { valid: true, phone: result.phone, expiresAt: result.expiresAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
