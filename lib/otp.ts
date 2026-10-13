import { createHash, createHmac } from "node:crypto";

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
