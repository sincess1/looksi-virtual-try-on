import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function digest(requestId: string) {
  const secret = process.env.FAL_KEY;
  if (!secret) throw new Error("FAL_KEY is not configured");
  return createHmac("sha256", secret)
    .update("looksi:try-on:")
    .update(requestId)
    .digest();
}

export function createRequestToken(requestId: string) {
  return digest(requestId).toString("base64url");
}

export function verifyRequestToken(requestId: string, token: string) {
  const expected = digest(requestId);
  const received = Buffer.from(token, "base64url");
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
