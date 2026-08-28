import { describe, expect, it } from "vitest";

import {
  inputLimitBytes,
  isHeicFile,
  validateImageFile,
} from "./image-processing";

describe("validateImageFile", () => {
  it("accepts iPhone HEIC files even without a MIME type", () => {
    expect(
      validateImageFile({ name: "IMG_2048.HEIC", size: 2_000_000, type: "" }),
    ).toBeNull();
  });

  it("rejects unsupported formats", () => {
    expect(
      validateImageFile({
        name: "photo.bmp",
        size: 900_000,
        type: "image/bmp",
      }),
    ).toBe("Подойдут JPG, PNG, WebP или HEIC.");
  });

  it("rejects oversized files", () => {
    expect(
      validateImageFile({
        name: "photo.jpg",
        size: inputLimitBytes + 1,
        type: "image/jpeg",
      }),
    ).toBe("Фото весит больше 18 МБ. Выберите файл поменьше.");
  });
});

describe("isHeicFile", () => {
  it("detects HEIF by MIME type and extension", () => {
    expect(isHeicFile({ name: "photo.bin", type: "image/heif" })).toBe(true);
    expect(isHeicFile({ name: "photo.heic", type: "" })).toBe(true);
    expect(isHeicFile({ name: "photo.jpg", type: "image/jpeg" })).toBe(false);
  });
});
