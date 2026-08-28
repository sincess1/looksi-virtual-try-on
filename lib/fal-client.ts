import "server-only";

import { createFalClient } from "@fal-ai/client";

export const tryOnModel = "google/virtual-try-on";

export function getFalClient() {
  const credentials = process.env.FAL_KEY;
  if (!credentials) throw new Error("FAL_KEY is not configured");
  return createFalClient({ credentials });
}
