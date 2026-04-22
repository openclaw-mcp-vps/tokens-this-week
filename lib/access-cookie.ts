const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const ACCESS_COOKIE_NAME = "ttw_access";
export const ACCESS_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;

type AccessPayload = {
  teamId: string;
  email: string;
  exp: number;
};

function getCookieSecret() {
  return (
    process.env.AUTH_COOKIE_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "tokens-this-week-dev-secret"
  );
}

function toBase64Url(input: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  let binary = "";
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }

  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacSha256(data: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return toBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}

export async function createAccessCookieValue(teamId: string, email: string) {
  const payload: AccessPayload = {
    teamId,
    email,
    exp: Date.now() + ACCESS_COOKIE_TTL_SECONDS * 1000,
  };

  const serialized = JSON.stringify(payload);
  const encodedPayload = toBase64Url(encoder.encode(serialized));
  const signature = await hmacSha256(encodedPayload, getCookieSecret());

  return `${encodedPayload}.${signature}`;
}

export async function verifyAccessCookieValue(cookieValue: string | undefined | null) {
  if (!cookieValue) return null;

  const [encodedPayload, signature] = cookieValue.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = await hmacSha256(encodedPayload, getCookieSecret());
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(decoder.decode(fromBase64Url(encodedPayload))) as AccessPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;
    if (!payload.teamId || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}
