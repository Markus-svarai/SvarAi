/**
 * SMS-utsending via Twilio REST API – ingen npm-pakke.
 * Krever TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN og TWILIO_FROM i .env
 */

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const FROM = process.env.TWILIO_FROM ?? "SvarAI"; // Alphanumerisk sender-ID eller +47-nummer

export function isTwilioConfigured(): boolean {
  return Boolean(ACCOUNT_SID && AUTH_TOKEN && FROM);
}

// Normaliserer norske mobilnummer til E.164-format (+47XXXXXXXX)
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("47") && digits.length === 10) return `+${digits}`;
  if (digits.length === 8) return `+47${digits}`;
  if (digits.startsWith("+")) return phone;
  return `+47${digits}`;
}

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!isTwilioConfigured()) {
    console.log("[sms] Twilio ikke konfigurert – logg SMS:", { to, body });
    return false;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const normalized = normalizePhone(to);

  const params = new URLSearchParams({
    To: normalized,
    From: FROM,
    Body: body,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[sms] Twilio feil:", res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[sms] Nettverksfeil:", err);
    return false;
  }
}
