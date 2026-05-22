import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifica la firma de Twilio (X-Twilio-Signature).
 * Algoritmo: HMAC-SHA1 sobre (URL + concatenación de params ordenados por clave), base64.
 * Ver: https://www.twilio.com/docs/usage/security#validating-requests
 */
export function verifyTwilioSignature(opts: {
  authToken: string;
  url: string;
  params: Record<string, string>;
  signature: string | null;
}): boolean {
  if (!opts.signature) return false;
  const data =
    opts.url +
    Object.keys(opts.params)
      .sort()
      .map((k) => k + opts.params[k])
      .join("");
  const expected = createHmac("sha1", opts.authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(opts.signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
