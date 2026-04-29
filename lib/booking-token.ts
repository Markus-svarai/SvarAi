import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.BOOKING_SECRET ?? "svarai-booking-default-secret";

export function generateToken(bookingId: string): string {
  return createHmac("sha256", SECRET).update(bookingId).digest("hex").slice(0, 40);
}

export function verifyToken(bookingId: string, token: string): boolean {
  try {
    const expected = generateToken(bookingId);
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}
