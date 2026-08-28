const acceptedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const acceptedExtensions = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
]);

export const inputLimitBytes = 18 * 1024 * 1024;
export const outputLimitBytes = 1_650_000;

export function isHeicFile(file: Pick<File, "name" | "type">) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    extension === "heic" ||
    extension === "heif"
  );
}

export function validateImageFile(file: Pick<File, "name" | "size" | "type">) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!acceptedTypes.has(file.type) && !acceptedExtensions.has(extension)) {
    return "Подойдут JPG, PNG, WebP или HEIC.";
  }
  if (file.size > inputLimitBytes) {
    return "Фото весит больше 18 МБ. Выберите файл поменьше.";
  }
  if (file.size === 0) {
    return "Файл пустой. Выберите другое фото.";
  }
  return null;
}

type Drawable = {
  width: number;
  height: number;
  draw: (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => void;
  close: () => void;
};

async function decodeImage(blob: Blob): Promise<Drawable> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: "from-image",
      });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (context, width, height) =>
          context.drawImage(bitmap, 0, 0, width, height),
        close: () => bitmap.close(),
      };
    } catch {}
  }

  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = "async";
  image.src = url;

  try {
    await image.decode();
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (context, width, height) =>
        context.drawImage(image, 0, 0, width, height),
      close: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Не удалось прочитать фото. Попробуйте другой файл.");
  }
}

async function convertHeic(file: File) {
  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    return Array.isArray(converted) ? converted[0] : converted;
  } catch {
    throw new Error(
      "Не удалось обработать HEIC. Выберите другое фото или сохраните его как JPG.",
    );
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Не удалось подготовить фото."));
      },
      "image/jpeg",
      quality,
    );
  });
}

export async function prepareImage(file: File) {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const source = isHeicFile(file) ? await convertHeic(file) : file;
  const drawable = await decodeImage(source);

  if (Math.min(drawable.width, drawable.height) < 320) {
    drawable.close();
    throw new Error(
      "Фото слишком маленькое. Нужна сторона хотя бы 320 пикселей.",
    );
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    drawable.close();
    throw new Error("Браузер не смог подготовить фото.");
  }

  let scale = Math.min(1, 2048 / Math.max(drawable.width, drawable.height));
  let quality = 0.88;

  try {
    for (let pass = 0; pass < 8; pass += 1) {
      const width = Math.max(1, Math.round(drawable.width * scale));
      const height = Math.max(1, Math.round(drawable.height * scale));
      canvas.width = width;
      canvas.height = height;
      context.fillStyle = "#fffaf1";
      context.fillRect(0, 0, width, height);
      drawable.draw(context, width, height);

      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= outputLimitBytes || pass === 7) {
        if (blob.size > outputLimitBytes) {
          throw new Error(
            "Фото не удалось достаточно сжать. Выберите файл поменьше.",
          );
        }
        const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
        return new File([blob], `${baseName}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }

      if (quality > 0.64) quality -= 0.08;
      else {
        scale *= 0.84;
        quality = 0.78;
      }
    }
  } finally {
    drawable.close();
  }

  throw new Error("Не удалось подготовить фото.");
}
