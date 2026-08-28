const sizeMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
  0xcf,
]);

export function readJpegDimensions(data: Uint8Array) {
  if (data.length < 11 || data[0] !== 0xff || data[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 3 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (data[offset] === 0xff) offset += 1;
    const marker = data[offset];
    offset += 1;

    if (marker === 0xda || marker === 0xd9) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= data.length) return null;

    const length = (data[offset] << 8) | data[offset + 1];
    if (length < 2 || offset + length > data.length) return null;

    if (sizeMarkers.has(marker)) {
      if (length < 7) return null;
      const height = (data[offset + 3] << 8) | data[offset + 4];
      const width = (data[offset + 5] << 8) | data[offset + 6];
      if (width < 320 || height < 320 || width > 12_000 || height > 12_000) {
        return null;
      }
      return { width, height };
    }

    offset += length;
  }

  return null;
}
