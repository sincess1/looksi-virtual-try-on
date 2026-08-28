import { z } from "zod";

const errorSchema = z.object({ error: z.string() });
const startSchema = z.object({
  requestId: z.string(),
  token: z.string(),
  queuePosition: z.number().optional(),
});
const statusSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("queued"),
    queuePosition: z.number().optional(),
  }),
  z.object({ status: z.literal("processing") }),
  z.object({ status: z.literal("completed"), imageUrl: z.string().url() }),
]);

export type TryOnStatus = z.infer<typeof statusSchema>;

async function readJson(response: Response) {
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const parsedError = errorSchema.safeParse(data);
    throw new Error(
      parsedError.success
        ? parsedError.data.error
        : "Сервис временно недоступен.",
    );
  }
  return data;
}

export async function startTryOn(
  person: File,
  product: File,
  signal: AbortSignal,
) {
  const formData = new FormData();
  formData.set("person", person);
  formData.set("product", product);

  const response = await fetch("/api/try-on", {
    method: "POST",
    body: formData,
    signal,
  });
  return startSchema.parse(await readJson(response));
}

function wait(duration: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(resolve, duration);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function pollTryOn(
  requestId: string,
  token: string,
  signal: AbortSignal,
  onStatus: (status: TryOnStatus) => void,
) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await fetch(
      `/api/try-on/${encodeURIComponent(requestId)}`,
      {
        cache: "no-store",
        headers: { "X-Request-Token": token },
        signal,
      },
    );
    const status = statusSchema.parse(await readJson(response));
    onStatus(status);
    if (status.status === "completed") return status.imageUrl;
    await wait(2200, signal);
  }

  throw new Error(
    "Примерка занимает слишком много времени. Попробуйте ещё раз.",
  );
}

export function preloadImage(url: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    const abort = () => {
      image.src = "";
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
    image.onload = () => {
      signal.removeEventListener("abort", abort);
      resolve();
    };
    image.onerror = () => {
      signal.removeEventListener("abort", abort);
      reject(
        new Error(
          "Результат готов, но изображение не загрузилось. Повторите попытку.",
        ),
      );
    };
    image.src = url;
  });
}
