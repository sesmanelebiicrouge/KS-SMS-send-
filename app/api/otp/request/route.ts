import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { sendOrangeSms } from "../../../../lib/orange";
import { getClientIp, normalizePhone, otpDigest, sha256 } from "../../../../lib/otp";
import { incrementRateLimit, redisCommand } from "../../../../lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  let body: { phone?: unknown };
  try {
    body = (await request.json()) as { phone?: unknown };
  } catch {
    return reply({ error: "Requête invalide." }, 400);
  }

  const phone = normalizePhone(body.phone);
  if (!phone) {
    return reply({ error: "Numéro invalide. Utilise le format international, par exemple +2250700000000." }, 400);
  }

  // Fail closed: OTP SMS sending must be deliberately enabled after configuration and testing.
  if (process.env.ORANGE_SMS_ENABLED !== "true") {
    return reply({ error: "L’envoi SMS est désactivé. Configure Orange et Redis, teste la connexion, puis active ORANGE_SMS_ENABLED=true." }, 503);
  }

  try {
    if (
      !process.env.ORANGE_CLIENT_ID ||
      !process.env.ORANGE_CLIENT_SECRET ||
      !process.env.ORANGE_SENDER_ADDRESS ||
      !process.env.OTP_SECRET ||
      Buffer.byteLength(process.env.OTP_SECRET, "utf8") < 32 ||
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      return reply({ error: "Configuration serveur incomplète. Vérifie Orange, Redis et le secret OTP." }, 503);
    }

    const ipKey = sha256(getClientIp(request));
    const phoneKey = sha256(phone);
    const ipCount = await incrementRateLimit(`rl:otp:req:ip:${ipKey}`, 600);
    const phoneCount = await incrementRateLimit(`rl:otp:req:phone:${phoneKey}`, 600);
    if (ipCount > 10 || phoneCount > 3) {
      return reply({ error: "Trop de demandes. Attends quelques minutes avant de réessayer." }, 429);
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const key = `otp:code:${phoneKey}`;
    await redisCommand("SET", key, otpDigest(phone, code), "EX", "300");

    try {
      await sendOrangeSms(
        phone,
        `Votre code de vérification KS SMS Send est : ${code}. Il expire dans 5 minutes. Ne le partagez avec personne.`,
      );
    } catch (error) {
      await redisCommand("DEL", key).catch(() => undefined);
      if (error instanceof Error && error.message === "ORANGE_CONFIGURATION_MISSING") {
        return reply({ error: "Configuration Orange incomplète : vérifie les identifiants et l’adresse d’expéditeur autorisée." }, 503);
      }
      if (error instanceof Error && error.message === "ORANGE_NOT_AUTHORIZED") {
        return reply({ error: "L’application Orange n’est pas autorisée à envoyer des SMS." }, 502);
      }
      if (error instanceof Error && error.message === "ORANGE_SENDER_ADDRESS_INVALID") {
        return reply({ error: "L’adresse d’expéditeur Orange est invalide. Utilise exactement celle fournie par Orange." }, 503);
      }
      if (error instanceof Error && error.message === "ORANGE_SENDER_NAME_NOT_APPROVED") {
        return reply({ error: "Le nom d’expéditeur n’est pas approuvé par Orange." }, 502);
      }
      return reply({ error: "Orange n’a pas accepté l’envoi. Vérifie le contrat, le solde et l’expéditeur autorisé." }, 502);
    }

    return reply({ status: "sent", expiresIn: 300, message: "Si le numéro est éligible, le code a été envoyé par SMS." }, 202);
  } catch {
    return reply({ error: "Le service de vérification est temporairement indisponible. Vérifie la configuration Redis et réessaie." }, 503);
  }
}
