import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports configuration presence only. Never returns secrets or sends test SMS. */
export async function GET() {
  const checks = {
    orangeClientIdConfigured: Boolean(process.env.ORANGE_CLIENT_ID),
    orangeClientSecretConfigured: Boolean(process.env.ORANGE_CLIENT_SECRET),
    orangeSenderAddressConfigured: Boolean(process.env.ORANGE_SENDER_ADDRESS && /^tel:\+[0-9]{6,15}$/.test(process.env.ORANGE_SENDER_ADDRESS)),
    orangeSenderNameConfigured: Boolean(process.env.ORANGE_SENDER_NAME && /^[A-Za-z0-9 ]{1,11}$/.test(process.env.ORANGE_SENDER_NAME)),
    redisConfigured: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    otpSecretConfigured: Boolean(process.env.OTP_SECRET && Buffer.byteLength(process.env.OTP_SECRET, "utf8") >= 32),
    smsSendingEnabled: process.env.ORANGE_SMS_ENABLED === "true",
  };

  const configurationComplete = checks.orangeClientIdConfigured &&
    checks.orangeClientSecretConfigured &&
    checks.orangeSenderAddressConfigured &&
    checks.orangeSenderNameConfigured &&
    checks.redisConfigured &&
    checks.otpSecretConfigured;

  return NextResponse.json(
    {
      service: "KS SMS Send",
      status: configurationComplete ? (checks.smsSendingEnabled ? "configuration_present_sms_enabled" : "configuration_present_sms_disabled") : "configuration_incomplete",
      checks,
      note: "Vérification de présence/format uniquement. Cela ne valide pas les identifiants Orange, le contrat, le solde ou l’autorisation réelle de l’expéditeur. Aucun SMS n’est envoyé.",
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
