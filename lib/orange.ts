type OrangeResult = {
  outboundSMSMessageRequest?: { resourceURL?: string };
};

export async function sendOrangeSms(
  phone: string,
  message: string,
  requestedSenderName?: string,
): Promise<OrangeResult> {
  const clientId = process.env.ORANGE_CLIENT_ID;
  const clientSecret = process.env.ORANGE_CLIENT_SECRET;
  const senderAddress = process.env.ORANGE_SENDER_ADDRESS;
  const approvedSenderName = process.env.ORANGE_SENDER_NAME?.trim();

  if (!clientId || !clientSecret || !senderAddress) {
    throw new Error("ORANGE_CONFIGURATION_MISSING");
  }
  if (!/^tel:\+[0-9]{6,15}$/.test(senderAddress)) {
    throw new Error("ORANGE_SENDER_ADDRESS_INVALID");
  }
  if (requestedSenderName && (!approvedSenderName || requestedSenderName !== approvedSenderName)) {
    throw new Error("ORANGE_SENDER_NAME_NOT_APPROVED");
  }
  if (
    approvedSenderName &&
    (!/^[A-Za-z0-9 ]{1,11}$/.test(approvedSenderName) || approvedSenderName.length > 11)
  ) {
    throw new Error("ORANGE_SENDER_NAME_INVALID");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const auth = await fetch("https://api.orange.com/oauth/v3/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (!auth.ok) throw new Error("ORANGE_AUTH_FAILED");
  const token = (await auth.json()) as { access_token?: string };
  if (!token.access_token) throw new Error("ORANGE_TOKEN_MISSING");

  const response = await fetch(
    `https://api.orange.com/smsmessaging/v1/outbound/${encodeURIComponent(senderAddress)}/requests`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        outboundSMSMessageRequest: {
          address: `tel:${phone}`,
          senderAddress,
          ...(approvedSenderName ? { senderName: approvedSenderName } : {}),
          outboundSMSTextMessage: { message },
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    },
  );

  if (!response.ok) {
    if (response.status === 429) throw new Error("ORANGE_RATE_LIMITED");
    if (response.status === 403) throw new Error("ORANGE_NOT_AUTHORIZED");
    if (response.status === 400) throw new Error("ORANGE_REQUEST_REJECTED");
    throw new Error("ORANGE_SEND_FAILED");
  }

  return (await response.json().catch(() => ({}))) as OrangeResult;
}
