import { NextResponse } from "next/server";

export function GET() {
  const supabaseEnvironmentPresent = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY,
  );

  return NextResponse.json({
    status: "ok",
    app: "KS SMS Send",
    smsProviderConfigured: false,
    supabaseEnvironmentPresent,
    note: "Ce contrôle confirme uniquement que l'application répond et que les variables Supabase sont présentes; il ne teste pas la connexion à la base.",
  });
}
