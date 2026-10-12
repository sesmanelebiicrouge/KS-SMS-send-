import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reports configuration presence only. Never returns secrets or sends test SMS.
 */
export async function GET() {
  const checks = {
    orangeClientIdConfigured: Boolean(process.env.ORANGE_CLIENT_ID),
    orangeClientSecretConfigured: Boolean(process.env.ORANGE_CLIENT_SECRET),
    orangeSenderAddressConfigured: Boolean(process.env.ORANGE_SENDER_ADDRESS),
  };

  const complete = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      service: "KS SMS Send",
      status: complete ? "configuration_present" : "configuration_incomplete",
      checks,
      note: "This checks variable presence only. It does not validate Orange credentials, authorize the sender, or send SMS.",
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
