import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createVerificationToken, normalizePhone, otpDigest, sha256 } from "../../../../lib/otp";
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
  let body: { phone?: unknown; code?: unknown };
  try {
    body = (await request.json()) as { phone?: unknown; code?: unknown };
  } catch {
    return reply({ error: "Requête invalide." }, 400);
  }

  const phone = normalizePhone(body.phone);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!phone || !/^\d{6}$/.test(code)) {
    return reply({ error: "Numéro ou code invalide." }, 400);
  }
  if (
    !process.env.OTP_SECRET ||
    Buffer.byteLength(process.env.OTP_SECRET, "utf8") < 32 ||
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return reply({ error: "Configuration serveur incomplète." }, 503);
  }

  try {
    const phoneKey = sha256(phone);
    const attempts = await incrementRateLimit(`rl:otp:verify:${phoneKey}`, 300);
    if (attempts > 5) {
      return reply({ error: "Trop de tentatives. Demande un nouveau code plus tard." }, 429);
    }

    const key = `otp:code:${phoneKey}`;
    const savedDigest = await redisCommand<string | null>("GET", key);
    if (!savedDigest) {
      return reply({ error: "Code expiré ou absent. Demande un nouveau code." }, 400);
    }

    const submittedDigest = otpDigest(phone, code);
    const saved = Buffer.from(savedDigest, "hex");
    const submitted = Buffer.from(submittedDigest, "hex");
    if (saved.length !== submitted.length || !timingSafeEqual(saved, submitted)) {
      return reply({ error: "Code incorrect ou expiré." }, 400);
    }

    await redisCommand("DEL", key);
    await redisCommand("DEL", `rl:otp:verify:${phoneKey}`).catch(() => undefined);

    const verificationToken = createVerificationToken(phone);
    const response = reply(
      {
        verified: true,
        verificationToken,
        tokenExpiresIn: 600,
        message: "Numéro vérifié. Tu peux revenir au formulaire d’envoi pendant les 10 prochaines minutes.",
      },
      200,
    );
    response.cookies.set("ks_otp_verified", verificationToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch {
    return reply({ error: "Le service de vérification est temporairement indisponible." }, 503);
  }
}
