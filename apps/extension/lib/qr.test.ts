import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';
import { QUIET, qrPath } from './qr';

const TEXT = 'https://cs.example/viewing/0b6f7d2e-1111-4c4c-9a9a-123456789abc?code=VC-7K3Q';

describe('qrPath', () => {
  it('draws exactly the dark modules of the QR matrix, row = y and column = x, inside a quiet zone', () => {
    const { modules } = QRCode.create(TEXT, { errorCorrectionLevel: 'M' });
    const want = new Set<string>();
    for (let row = 0; row < modules.size; row++)
      for (let col = 0; col < modules.size; col++) if (modules.get(row, col)) want.add(`${col + QUIET},${row + QUIET}`);

    const { size, d } = qrPath(TEXT);
    const drawn = new Set([...d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map((m) => `${m[1]},${m[2]}`));

    expect(size).toBe(modules.size + 2 * QUIET);
    expect(drawn).toEqual(want);
  });

  it('puts the three finder patterns top-left, top-right and bottom-left (not mirrored)', () => {
    const { size, d } = qrPath(TEXT);
    const drawn = new Set([...d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map((m) => `${m[1]},${m[2]}`));
    const far = size - QUIET - 1;
    expect(drawn.has(`${QUIET},${QUIET}`)).toBe(true);
    expect(drawn.has(`${far},${QUIET}`)).toBe(true);
    expect(drawn.has(`${QUIET},${far}`)).toBe(true);
    // The bottom-right corner never holds a finder pattern; its outer ring is light at (far-6..far, far) row edge.
    const bottomRightFinder = [0, 1, 2, 3, 4, 5, 6].every((i) => drawn.has(`${far - i},${far}`));
    expect(bottomRightFinder).toBe(false);
  });
});
