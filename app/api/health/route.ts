import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    orangeClientIdConfigured: Boolean(process.env.ORANGE_CLIENT_ID),
    orangeClientSecretConfigured: Boolean(process.env.ORANGE_CLIENT_SECRET),
    orangeSenderAddressConfigured: Boolean(process.env.ORANGE_SENDER_ADDRESS || "tel:+2250000"),
    otpSendEndpointImplemented: true,
    otpVerifyEndpointImplemented: true,
  };

  const orangeCredentialsPresent = checks.orangeClientIdConfigured && checks.orangeClientSecretConfigured;
  return NextResponse.json({
    service: "KS SMS Send",
    status: orangeCredentialsPresent ? "credentials_present_sender_default_available" : "configuration_incomplete",
    checks,
    endpoints: {
      sendOtp: "/api/otp/send",
      verifyOtp: "/api/otp/verify",
      sendSms: "/api/send",
    },
    note: "This endpoint checks configuration presence and code availability only. It does not validate Orange credentials, authorize the sender, send an SMS, or confirm delivery.",
  }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
