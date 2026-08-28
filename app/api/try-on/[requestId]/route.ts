import { NextResponse } from "next/server";
import { z } from "zod";

import { getFalClient, tryOnModel } from "@/lib/fal-client";
import { verifyRequestToken } from "@/lib/request-token";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const requestIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{8,160}$/);
const resultSchema = z.object({
  images: z.array(z.object({ url: z.string().url() })).min(1),
});

function response(body: object, status = 200) {
  const result = NextResponse.json(body, { status });
  result.headers.set("Cache-Control", "no-store");
  return result;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  const token = request.headers.get("x-request-token") ?? "";

  if (!requestIdSchema.safeParse(requestId).success) {
    return response({ error: "Запрос не найден." }, 404);
  }

  try {
    if (!verifyRequestToken(requestId, token)) {
      return response({ error: "Запрос не найден." }, 404);
    }
    const fal = getFalClient();
    const status = await fal.queue.status(tryOnModel, {
      requestId,
      logs: false,
    });

    if (status.status === "IN_QUEUE") {
      return response({
        status: "queued",
        queuePosition: status.queue_position,
      });
    }

    if (status.status === "IN_PROGRESS") {
      return response({ status: "processing" });
    }

    const result = resultSchema.safeParse(
      (await fal.queue.result(tryOnModel, { requestId })).data,
    );
    if (!result.success) {
      return response(
        { error: "Сервис вернул пустой результат. Попробуйте ещё раз." },
        502,
      );
    }

    return response({
      status: "completed",
      imageUrl: result.data.images[0].url,
    });
  } catch (error) {
    console.error(
      "Virtual try-on status failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return response(
      { error: "Не удалось получить результат. Попробуйте ещё раз." },
      502,
    );
  }
}
