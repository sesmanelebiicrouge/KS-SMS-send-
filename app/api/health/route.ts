import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    app: "KS SMS Send",
    smsProviderConfigured: false,
    databaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    note: "Le statut ok confirme uniquement que l'API répond, pas que l'envoi SMS est activé.",
  });
}
