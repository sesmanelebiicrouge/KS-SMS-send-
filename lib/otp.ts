import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const phone = value.replace(/[\s()-]/g, "");
  return /^\+[1-9][0-9]{7,14}$/.test(phone) ? phone : null;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function getOtpSecret(): string {
  const secret = process.env.OTP_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("OTP_SECRET_NOT_CONFIGURED");
  }
  return secret;
}

export function otpDigest(phone: string, code: string): string {
  return createHmac("sha256", getOtpSecret()).update(`${phone}:${code}`).digest("hex");
}

export function createVerificationToken(phone: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      phone,
      purpose: "phone-verification",
      exp: Math.floor(Date.now() / 1000) + 600,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", getOtpSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 100);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded ? forwarded.slice(0, 100) : "unknown";
}

export function verifyVerificationToken(token: unknown): { phone: string; expiresAt: number } | null {
  if (typeof token !== "string" || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  let expected: string;
  try {
    expected = createHmac("sha256", getOtpSecret()).update(payload).digest("base64url");
  } catch {
    return null;
  }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !requireTimingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      phone?: unknown;
      purpose?: unknown;
      exp?: unknown;
    };
    const phone = normalizePhone(data.phone);
    if (!phone || data.purpose !== "phone-verification" || typeof data.exp !== "number") return null;
    if (!Number.isInteger(data.exp) || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return { phone, expiresAt: data.exp };
  } catch {
    return null;
  }
}

function requireTimingSafeEqual(a: Buffer, b: Buffer): boolean {
  // Import lazily through the same Node crypto module to avoid non-constant-time string comparison.
  return timingSafeEqual(a, b);
}
