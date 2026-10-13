import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports safe configuration checks; never returns secrets or sends SMS. */
export async function GET() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "");
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  let redisConnectionOk = false;

  if (redisUrl && redisToken) {
    try {
      const response = await fetch(`${redisUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([["PING"]]),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const payload = (await response.json()) as Array<{ result?: unknown; error?: string }>;
        redisConnectionOk = Array.isArray(payload) && payload[0]?.result === "PONG" && !payload[0]?.error;
      }
    } catch {
      // Do not expose URL, token, or provider details in the public health response.
      redisConnectionOk = false;
    }
  }

  const checks = {
    orangeClientIdConfigured: Boolean(process.env.ORANGE_CLIENT_ID),
    orangeClientSecretConfigured: Boolean(process.env.ORANGE_CLIENT_SECRET),
    orangeSenderAddressConfigured: Boolean(
      process.env.ORANGE_SENDER_ADDRESS &&
      /^tel:\\+[0-9]{6,15}$/.test(process.env.ORANGE_SENDER_ADDRESS),
    ),
    orangeSenderNameConfigured: Boolean(
      process.env.ORANGE_SENDER_NAME &&
      /^[A-Za-z0-9 ]{1,11}$/.test(process.env.ORANGE_SENDER_NAME),
    ),
    redisConfigured: Boolean(redisUrl && redisToken),
    redisConnectionOk,
    otpSecretConfigured: Boolean(
      process.env.OTP_SECRET &&
      Buffer.byteLength(process.env.OTP_SECRET, "utf8") >= 32,
    ),
    smsSendingEnabled: process.env.ORANGE_SMS_ENABLED === "true",
  };

  const configurationComplete =
    checks.orangeClientIdConfigured &&
    checks.orangeClientSecretConfigured &&
    checks.orangeSenderAddressConfigured &&
    checks.orangeSenderNameConfigured &&
    checks.redisConfigured &&
    checks.redisConnectionOk &&
    checks.otpSecretConfigured;

  return NextResponse.json(
    {
      service: "KS SMS Send",
      status: configurationComplete
        ? checks.smsSendingEnabled
          ? "configuration_present_sms_enabled"
          : "configuration_present_sms_disabled"
        : "configuration_incomplete",
      checks,
      note: "Contrôle de présence/format et test PING Redis. Cela ne valide pas les identifiants Orange, le contrat, le solde ou l’autorisation réelle de l’expéditeur. Aucun SMS n’est envoyé.",
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
