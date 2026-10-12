import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server-auth";
import { getOrangeAccessToken } from "@/lib/orange-sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth.user) {
    return NextResponse.json({ ok: false, error: auth.error ?? "Connectez-vous pour tester la configuration." }, { status: 401 });
  }

  try {
    await getOrangeAccessToken();
    return NextResponse.json({
      ok: true,
      supabase: "session vérifiée",
      orangeOAuth: "authentification réussie",
      smsSendingEnabled: process.env.ORANGE_SMS_ENABLED === "true",
      note: "Ce test vérifie l'authentification Orange uniquement; il n'envoie aucun SMS et ne vérifie pas le solde.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de tester Orange.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
