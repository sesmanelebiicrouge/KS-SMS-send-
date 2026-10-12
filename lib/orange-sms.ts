const TOKEN_URL = "https://api.orange.com/oauth/v3/token";
const SMS_BASE_URL = "https://api.orange.com/smsmessaging/v1";
const CI_SENDER_ADDRESS = "tel:+2250000";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function authorizationHeader() {
  const configured = process.env.ORANGE_AUTHORIZATION_HEADER?.trim();
  if (configured) return configured.startsWith("Basic ") ? configured : `Basic ${configured}`;

  const clientId = process.env.ORANGE_CLIENT_ID;
  const clientSecret = process.env.ORANGE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Identifiants Orange absents. Configurez ORANGE_AUTHORIZATION_HEADER ou ORANGE_CLIENT_ID et ORANGE_CLIENT_SECRET dans Vercel.");
  }
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function getOrangeAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: authorizationHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Orange a refusé l'authentification. Vérifiez l'en-tête Authorization et les identifiants dans Vercel.");
    }
    throw new Error(`Orange OAuth indisponible (HTTP ${response.status}). Réessayez plus tard.`);
  }

  const data = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
  if (typeof data.access_token !== "string" || !data.access_token) {
    throw new Error("Orange n'a pas renvoyé de jeton d'accès valide.");
  }
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : Number(data.expires_in ?? 3600);
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000;
  return cachedToken;
}

export async function sendOrangeSms(input: {
  recipient: string;
  message: string;
  senderName: string;
}): Promise<{ httpStatus: number }> {
  const token = await getOrangeAccessToken();
  const url = `${SMS_BASE_URL}/outbound/${encodeURIComponent(CI_SENDER_ADDRESS)}/requests`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      outboundSMSMessageRequest: {
        address: `tel:${input.recipient}`,
        senderAddress: CI_SENDER_ADDRESS,
        senderName: input.senderName,
        outboundSMSTextMessage: { message: input.message },
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedToken = null;
      tokenExpiresAt = 0;
      throw new Error("Le jeton Orange a expiré ou a été refusé. Réessayez une fois.");
    }
    if (response.status === 400) {
      throw new Error("Orange a refusé la requête. Vérifiez le format du numéro et que l'ID expéditeur est autorisé.");
    }
    if (response.status === 402 || response.status === 403) {
      throw new Error("Orange a refusé l'envoi. Vérifiez le forfait SMS, le contrat et les droits de l'application.");
    }
    throw new Error(`Échec de l'API SMS Orange (HTTP ${response.status}). Aucun statut de livraison n'est confirmé.`);
  }

  return { httpStatus: response.status };
}
