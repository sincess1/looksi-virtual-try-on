import { describe, expect, it } from "vitest";

import { readJpegDimensions } from "./jpeg";

function jpeg(width: number, height: number) {
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x07,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    0xff,
    0xd9,
  ]);
}

describe("readJpegDimensions", () => {
  it("reads valid image dimensions", () => {
    expect(readJpegDimensions(jpeg(800, 1200))).toEqual({
      width: 800,
      height: 1200,
    });
  });

  it("rejects incomplete and undersized images", () => {
    expect(readJpegDimensions(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe(
      null,
    );
    expect(readJpegDimensions(jpeg(200, 400))).toBe(null);
  });
});
