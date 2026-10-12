import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reports configuration presence only. Never returns secrets or sends a test SMS.
 * Orange API credentials must use the exact names documented in .env.example.
 */
export async function GET() {
  const checks = {
    orangeClientIdConfigured: Boolean(process.env.ORANGE_CLIENT_ID),
    orangeClientSecretConfigured: Boolean(process.env.ORANGE_CLIENT_SECRET),
  };

  return NextResponse.json(
    {
      service: "KS SMS Send",
      status:
        checks.orangeClientIdConfigured && checks.orangeClientSecretConfigured
          ? "configuration_present"
          : "configuration_incomplete",
      checks,
      note: "This checks variable presence only; it does not verify Orange credentials or send SMS.",
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
