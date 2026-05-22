import "server-only";

function creds() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio no configurado (SID/AUTH_TOKEN)");
  return { sid, token, auth: Buffer.from(`${sid}:${token}`).toString("base64") };
}

/** Envía un WhatsApp por el número del estudio (sandbox o productivo). */
export async function sendWhatsApp(to: string, body: string): Promise<void> {
  const { sid, auth } = creds();
  const from = process.env.TWILIO_WHATSAPP_FROM!;
  const params = new URLSearchParams({
    From: from,
    To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    Body: body,
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) throw new Error(`Twilio send ${res.status}: ${await res.text()}`);
}

/** Descarga media de Twilio (requiere Basic Auth). */
export async function downloadTwilioMedia(url: string): Promise<{ bytes: Buffer; contentType: string }> {
  const { auth } = creds();
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`Twilio media ${res.status}`);
  return {
    bytes: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
  };
}

/** Borra media del lado de Twilio tras copiarla (privacidad + costo). Best-effort. */
export async function deleteTwilioMedia(messageSid: string, mediaSid: string): Promise<void> {
  try {
    const { sid, auth } = creds();
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages/${messageSid}/Media/${mediaSid}.json`,
      { method: "DELETE", headers: { Authorization: `Basic ${auth}` } },
    );
  } catch {
    /* best-effort */
  }
}
