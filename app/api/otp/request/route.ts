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

  try {
    // Validate required configuration before consuming rate-limit quota.
    if (
      !process.env.ORANGE_CLIENT_ID ||
      !process.env.ORANGE_CLIENT_SECRET ||
      !process.env.ORANGE_SENDER_ADDRESS ||
      !process.env.OTP_SECRET ||
      Buffer.byteLength(process.env.OTP_SECRET, "utf8") < 32
    ) {
      return reply({ error: "Configuration serveur incomplète. Contacte l’administrateur." }, 503);
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
        return reply({ error: "Configuration Orange incomplète." }, 503);
      }
      if (error instanceof Error && error.message === "ORANGE_NOT_AUTHORIZED") {
        return reply({ error: "L’application Orange n’est pas autorisée à envoyer des SMS." }, 502);
      }
      return reply({ error: "Orange n’a pas accepté l’envoi. Vérifie le contrat, le solde et l’expéditeur autorisé." }, 502);
    }

    return reply({ status: "sent", expiresIn: 300, message: "Si le numéro est éligible, le code a été envoyé par SMS." }, 202);
  } catch {
    return reply({ error: "Le service de vérification est temporairement indisponible." }, 503);
  }
}
