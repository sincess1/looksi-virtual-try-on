import { NextResponse } from "next/server";

import { getFalClient, tryOnModel } from "@/lib/fal-client";
import { readJpegDimensions } from "@/lib/jpeg";
import { rateLimit, requestIdentity } from "@/lib/rate-limit";
import { createRequestToken } from "@/lib/request-token";

export const runtime = "nodejs";
export const maxDuration = 60;

const uploadLimit = 1_700_000;

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      request.headers.get("host") ||
      new URL(request.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function errorResponse(error: string, status: number, retryAfter?: number) {
  const response = NextResponse.json({ error }, { status });
  response.headers.set("Cache-Control", "no-store");
  if (retryAfter) response.headers.set("Retry-After", String(retryAfter));
  return response;
}

async function validatedImage(
  value: FormDataEntryValue | null,
): Promise<File | null> {
  if (
    !(value instanceof File) ||
    value.type !== "image/jpeg" ||
    value.size === 0 ||
    value.size > uploadLimit
  ) {
    return null;
  }
  const data = new Uint8Array(await value.arrayBuffer());
  return readJpegDimensions(data) ? value : null;
}

export async function POST(request: Request) {
  if (!allowedOrigin(request)) {
    return errorResponse("Запрос отклонён.", 403);
  }

  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    return errorResponse("Некорректный формат запроса.", 400);
  }

  const retryAfter = rateLimit(requestIdentity(request));
  if (retryAfter) {
    return errorResponse(
      "Слишком много примерок. Попробуйте немного позже.",
      429,
      retryAfter,
    );
  }

  try {
    const formData = await request.formData();
    const [person, product] = await Promise.all([
      validatedImage(formData.get("person")),
      validatedImage(formData.get("product")),
    ]);

    if (!person || !product) {
      return errorResponse(
        "Фото не прошло проверку. Загрузите его заново.",
        400,
      );
    }

    const fal = getFalClient();
    const lifecycle = { expiresIn: "1h" as const };
    const [personImageUrl, productImageUrl] = await Promise.all([
      fal.storage.upload(person, { lifecycle }),
      fal.storage.upload(product, { lifecycle }),
    ]);

    const queued = await fal.queue.submit(tryOnModel, {
      input: {
        person_image_url: personImageUrl,
        product_image_url: productImageUrl,
        num_images: 1,
      },
      storageSettings: lifecycle,
      startTimeout: 60,
      headers: { "X-Fal-Store-IO": "0" },
    });

    const response = NextResponse.json({
      requestId: queued.request_id,
      token: createRequestToken(queued.request_id),
      queuePosition: queued.queue_position,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error(
      "Virtual try-on request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return errorResponse(
      "Не удалось запустить примерку. Попробуйте ещё раз.",
      502,
    );
  }
}
